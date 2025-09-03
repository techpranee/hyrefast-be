/**
 * analysisWorkerManager.js
 * @description :: Manages worker threads for interview analysis tasks
 */

const { Worker } = require('worker_threads');
const path = require('path');
const AnalysisTasks = require('../model/analysisTasks');
const EventEmitter = require('events');

class AnalysisWorkerManager extends EventEmitter {
    constructor() {
        super();
        this.workers = new Map();
        this.taskQueue = [];
        this.maxWorkers = parseInt(process.env.MAX_ANALYSIS_WORKERS) || 2;
        this.maxQueueSize = parseInt(process.env.MAX_ANALYSIS_QUEUE) || 100;
        this.workerTimeout = parseInt(process.env.ANALYSIS_TIMEOUT) || 300000; // 5 minutes
        this.retryAttempts = 3;
        this.retryDelay = 5000; // 5 seconds
        this.isProcessing = false;

        console.log(`🔧 Analysis Worker Manager initialized with ${this.maxWorkers} max workers`);
    }

    /**
     * Queue a new analysis task
     */
    async queueAnalysisTask(taskData) {
        try {
            const { applicationId, workspaceId, priority = 'normal' } = taskData;

            // Check if task already exists for this application
            const existingTask = await AnalysisTasks.findOne({
                applicationId,
                status: { $in: ['pending', 'processing'] }
            });

            if (existingTask) {
                console.log(`⚠️ Task already exists for application ${applicationId}: ${existingTask.taskId}`);
                return {
                    success: false,
                    message: 'Analysis task already in progress for this application',
                    taskId: existingTask.taskId
                };
            }

            // Check queue size
            if (this.taskQueue.length >= this.maxQueueSize) {
                console.log('❌ Analysis queue is full');
                return {
                    success: false,
                    message: 'Analysis queue is full, please try again later'
                };
            }

            // Create new analysis task
            const crypto = require('crypto');
            const taskId = `task_${applicationId}_${crypto.randomBytes(8).toString('hex')}`;

            const analysisTask = new AnalysisTasks({
                taskId,
                applicationId,
                workspaceId,
                priority,
                status: 'pending'
            });

            await analysisTask.save();

            // Add to queue
            this.taskQueue.push({
                taskId: analysisTask.taskId,
                applicationId,
                workspaceId,
                priority,
                createdAt: new Date()
            });

            // Sort queue by priority (high -> normal -> low)
            this.taskQueue.sort((a, b) => {
                const priorityOrder = { high: 3, normal: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });

            console.log(`✅ Analysis task queued: ${analysisTask.taskId} (Queue size: ${this.taskQueue.length})`);

            // Start processing if not already running
            this.processQueue();

            return {
                success: true,
                taskId: analysisTask.taskId,
                message: 'Analysis task queued successfully',
                position: this.taskQueue.findIndex(task => task.taskId === analysisTask.taskId) + 1
            };

        } catch (error) {
            console.error('❌ Failed to queue analysis task:', error);
            return {
                success: false,
                message: 'Failed to queue analysis task',
                error: error.message
            };
        }
    }

    /**
     * Process the task queue
     */
    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            while (this.taskQueue.length > 0 && this.workers.size < this.maxWorkers) {
                const taskData = this.taskQueue.shift();
                await this.startWorker(taskData);
            }
        } catch (error) {
            console.error('❌ Error processing queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Start a worker for a specific task
     */
    async startWorker(taskData) {
        const { taskId } = taskData;

        try {
            console.log(`🚀 Starting worker for task: ${taskId}`);

            // Create worker
            const workerPath = path.join(__dirname, '../workers/analysisWorker.js');
            const worker = new Worker(workerPath);

            // Set up worker timeout
            const timeout = setTimeout(() => {
                console.log(`⏰ Worker timeout for task: ${taskId}`);
                this.terminateWorker(taskId, 'timeout');
            }, this.workerTimeout);

            // Store worker info
            this.workers.set(taskId, {
                worker,
                timeout,
                taskData,
                startedAt: new Date()
            });

            // Handle worker messages
            worker.on('message', (message) => {
                this.handleWorkerMessage(taskId, message);
            });

            // Handle worker errors
            worker.on('error', (error) => {
                console.error(`❌ Worker error for task ${taskId}:`, error);
                this.handleWorkerError(taskId, error);
            });

            // Handle worker exit
            worker.on('exit', (code) => {
                console.log(`🏁 Worker exited for task ${taskId} with code: ${code}`);
                this.cleanupWorker(taskId);
            });

            // Start the worker
            worker.postMessage({
                type: 'start',
                taskData
            });

            console.log(`✅ Worker started for task: ${taskId}`);

        } catch (error) {
            console.error(`❌ Failed to start worker for task ${taskId}:`, error);
            await this.handleTaskFailure(taskId, error);
        }
    }

    /**
     * Handle messages from worker
     */
    async handleWorkerMessage(taskId, message) {
        try {
            switch (message.type) {
                case 'progress':
                    console.log(`📊 Task ${taskId} progress: ${message.step} - ${message.message}`);
                    this.emit('progress', { taskId, ...message });
                    break;

                case 'completed':
                    console.log(`🎉 Task ${taskId} completed successfully`);
                    await this.handleTaskCompletion(taskId, message);
                    break;

                case 'error':
                    console.error(`❌ Task ${taskId} error:`, message.error);
                    await this.handleTaskFailure(taskId, message.error);
                    break;

                default:
                    console.log(`📝 Task ${taskId} message:`, message);
            }
        } catch (error) {
            console.error(`❌ Error handling worker message for task ${taskId}:`, error);
        }
    }

    /**
     * Handle worker errors
     */
    async handleWorkerError(taskId, error) {
        try {
            const workerInfo = this.workers.get(taskId);
            if (!workerInfo) return;

            // Update task with error
            await AnalysisTasks.findOneAndUpdate(
                { taskId },
                {
                    status: 'failed',
                    error: {
                        message: error.message,
                        code: error.code || 'WORKER_ERROR',
                        stack: error.stack,
                        step: 'worker_error'
                    }
                }
            );

            // Cleanup worker
            this.terminateWorker(taskId, 'error');

            // Emit error event
            this.emit('error', { taskId, error });

        } catch (updateError) {
            console.error(`❌ Failed to handle worker error for task ${taskId}:`, updateError);
        }
    }

    /**
     * Handle task completion
     */
    async handleTaskCompletion(taskId, result) {
        try {
            console.log(`✅ Handling completion for task: ${taskId}`);

            // Cleanup worker
            this.terminateWorker(taskId, 'completed');

            // Emit completion event
            this.emit('completed', { taskId, result });

            // Process next task in queue
            setTimeout(() => this.processQueue(), 1000);

        } catch (error) {
            console.error(`❌ Failed to handle task completion for ${taskId}:`, error);
        }
    }

    /**
     * Handle task failure
     */
    async handleTaskFailure(taskId, error) {
        try {
            const task = await AnalysisTasks.findOne({ taskId });
            if (!task) return;

            // Determine if we should retry
            const shouldRetry = task.retryCount < this.retryAttempts &&
                !['timeout', 'cancelled'].includes(error.code);

            if (shouldRetry) {
                console.log(`🔄 Retrying task ${taskId} (attempt ${task.retryCount + 1}/${this.retryAttempts})`);

                // Extract IDs from taskId as fallback if task data is corrupted
                const taskParts = taskId.split('_');
                let applicationId, workspaceId;

                // Try to get valid values - check if task data is corrupted
                const isApplicationIdValid = task.applicationId &&
                    typeof task.applicationId === 'object' &&
                    task.applicationId.toString() !== '[object Object]' &&
                    task.applicationId.toString().length === 24;

                const isWorkspaceIdValid = task.workspaceId &&
                    typeof task.workspaceId === 'object' &&
                    task.workspaceId.toString() !== '[object Object]' &&
                    task.workspaceId.toString().length === 24;

                if (isApplicationIdValid) {
                    applicationId = task.applicationId.toString();
                } else if (taskParts.length >= 2 && taskParts[1].length === 24) {
                    // Extract from taskId: task_{applicationId}_{randomId}
                    applicationId = taskParts[1];
                    console.log(`⚠️ Using applicationId from taskId: ${applicationId}`);
                } else {
                    throw new Error(`Cannot determine valid applicationId for task ${taskId}`);
                }

                if (isWorkspaceIdValid) {
                    workspaceId = task.workspaceId.toString();
                } else {
                    // Try to get workspaceId from application document
                    const mongoose = require('mongoose');
                    const Application = mongoose.model('application');
                    const application = await Application.findById(applicationId).select('workspace');
                    if (application && application.workspace) {
                        workspaceId = application.workspace.toString();
                        console.log(`⚠️ Using workspaceId from application: ${workspaceId}`);
                    } else {
                        throw new Error(`Cannot determine valid workspaceId for task ${taskId}`);
                    }
                }

                // Update retry count
                await AnalysisTasks.findOneAndUpdate(
                    { taskId },
                    {
                        $inc: { retryCount: 1 },
                        status: 'pending'
                    }
                );

                // Add back to queue with delay
                setTimeout(() => {
                    this.taskQueue.unshift({
                        taskId: task.taskId,
                        applicationId: applicationId,
                        workspaceId: workspaceId,
                        priority: task.priority,
                        createdAt: task.createdAt || new Date()
                    });
                    this.processQueue();
                }, this.retryDelay);

            } else {
                console.log(`❌ Task ${taskId} failed permanently`);

                // Update task as failed
                await AnalysisTasks.findOneAndUpdate(
                    { taskId },
                    {
                        status: 'failed',
                        error: {
                            message: error.message || 'Task failed',
                            code: error.code || 'ANALYSIS_FAILED',
                            stack: error.stack,
                            step: 'final_failure'
                        }
                    }
                );
            }

            // Cleanup worker
            this.terminateWorker(taskId, 'failed');

            // Emit failure event
            this.emit('failed', { taskId, error, retry: shouldRetry });

        } catch (updateError) {
            console.error(`❌ Failed to handle task failure for ${taskId}:`, updateError);
        }
    }

    /**
     * Terminate a specific worker
     */
    terminateWorker(taskId, reason = 'unknown') {
        const workerInfo = this.workers.get(taskId);
        if (!workerInfo) return;

        try {
            // Clear timeout
            if (workerInfo.timeout) {
                clearTimeout(workerInfo.timeout);
            }

            // Terminate worker
            workerInfo.worker.terminate();

            console.log(`🛑 Worker terminated for task ${taskId} (reason: ${reason})`);

        } catch (error) {
            console.error(`❌ Error terminating worker for task ${taskId}:`, error);
        } finally {
            // Remove from workers map
            this.workers.delete(taskId);

            // Process next task in queue
            setTimeout(() => this.processQueue(), 1000);
        }
    }

    /**
     * Cleanup worker resources
     */
    cleanupWorker(taskId) {
        this.workers.delete(taskId);
        console.log(`🧹 Cleaned up worker for task: ${taskId}`);
    }

    /**
     * Cancel a specific task
     */
    async cancelTask(taskId) {
        try {
            // Remove from queue if pending
            const queueIndex = this.taskQueue.findIndex(task => task.taskId === taskId);
            if (queueIndex !== -1) {
                this.taskQueue.splice(queueIndex, 1);
                console.log(`❌ Removed task ${taskId} from queue`);
            }

            // Terminate worker if running
            if (this.workers.has(taskId)) {
                this.terminateWorker(taskId, 'cancelled');
            }

            // Update task status
            await AnalysisTasks.findOneAndUpdate(
                { taskId },
                { status: 'cancelled' }
            );

            return { success: true, message: 'Task cancelled successfully' };

        } catch (error) {
            console.error(`❌ Failed to cancel task ${taskId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get queue statistics
     */
    getQueueStats() {
        return {
            queueSize: this.taskQueue.length,
            activeWorkers: this.workers.size,
            maxWorkers: this.maxWorkers,
            maxQueueSize: this.maxQueueSize,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Shutdown all workers gracefully
     */
    async shutdown() {
        console.log('🛑 Shutting down Analysis Worker Manager...');

        // Cancel all pending tasks
        this.taskQueue = [];

        // Terminate all active workers
        const terminationPromises = Array.from(this.workers.keys()).map(taskId => {
            return new Promise((resolve) => {
                this.terminateWorker(taskId, 'shutdown');
                resolve();
            });
        });

        await Promise.all(terminationPromises);

        console.log('✅ Analysis Worker Manager shutdown complete');
    }
}

// Create singleton instance
const analysisWorkerManager = new AnalysisWorkerManager();

module.exports = analysisWorkerManager;
