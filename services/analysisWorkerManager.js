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
     * Transcribe audio URLs for responses before analysis
     */
    async transcribeResponseAudios(responses) {
        const axios = require('axios');
        const TranscriptionService = require('../services/transcriptionService');
        const Response = require('../model/response');
        
        const transcriptionService = new TranscriptionService();
        
        console.log(`🎵 Starting transcription for ${responses.length} responses`);
        
        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            
            try {
                // Skip if transcription already exists
                if (response.transcriptionText && response.transcriptionText.length > 0) {
                    console.log(`✅ Using existing transcription for response ${i + 1}`);
                    continue;
                }
                
                // Skip if no audio URL
                if (!response.responseAudioUrl) {
                    console.log(`⚠️ No audio URL for response ${i + 1}, skipping transcription`);
                    await Response.findByIdAndUpdate(response._id, {
                        transcriptionText: '[No audio available]',
                        transcriptionStatus: 'skipped'
                    });
                    continue;
                }
                
                console.log(`🎵 Transcribing audio for response ${i + 1}: ${response.responseAudioUrl}`);
                
                // Update status to processing
                await Response.findByIdAndUpdate(response._id, {
                    transcriptionStatus: 'processing'
                });
                
                // Download and transcribe audio
                const transcriptionResult = await transcriptionService.processAudioTranscription(
                    response.responseAudioUrl,
                    {
                        language: 'en',
                        mimeType: 'audio/wav'
                    }
                );
                
                let transcriptionText = '[Transcription failed]';
                let status = 'failed';
                
                if (transcriptionResult.success && transcriptionResult.raw.transcription) {
                    transcriptionText = transcriptionResult.raw.transcription;
                    status = 'completed';
                    console.log(`✅ Transcription completed for response ${i + 1}: ${transcriptionText.length} characters`);
                } else {
                    console.error(`❌ Transcription failed for response ${i + 1}:`, transcriptionResult.error);
                }
                
                // Update response with transcription
                await Response.findByIdAndUpdate(response._id, {
                    transcriptionText: transcriptionText,
                    transcriptionStatus: status,
                    transcriptionProcessedAt: new Date()
                });
                
            } catch (error) {
                console.error(`❌ Error transcribing response ${i + 1}:`, error);
                
                // Update with error status
                await Response.findByIdAndUpdate(response._id, {
                    transcriptionText: '[Transcription error]',
                    transcriptionStatus: 'failed',
                    transcriptionProcessedAt: new Date(),
                    transcriptionError: error.message
                });
            }
        }
        
        console.log(`🎵 Transcription phase completed for ${responses.length} responses`);
    }

    /**
     * Queue a new analysis task
     */
    async queueAnalysisTask(taskData) {
        try {
            const { applicationId, workspaceId, priority = 'normal' } = taskData;

            // Validate input parameters
            if (!applicationId || !workspaceId) {
                return {
                    success: false,
                    message: 'applicationId and workspaceId are required'
                };
            }

            // Ensure IDs are strings to prevent corruption
            const cleanApplicationId = typeof applicationId === 'object' ? 
                applicationId.toString() : applicationId;
            const cleanWorkspaceId = typeof workspaceId === 'object' ? 
                workspaceId.toString() : workspaceId;

            // Check if task already exists for this application
            const existingTask = await AnalysisTasks.findOne({
                applicationId: cleanApplicationId,
                status: { $in: ['pending', 'processing'] }
            });

            if (existingTask) {
                console.log(`⚠️ Task already exists for application ${cleanApplicationId}: ${existingTask.taskId}`);
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
            const taskId = `task_${cleanApplicationId}_${crypto.randomBytes(8).toString('hex')}`;

            const analysisTask = new AnalysisTasks({
                taskId,
                applicationId: cleanApplicationId, // Store as string
                workspaceId: cleanWorkspaceId,     // Store as string
                priority,
                status: 'pending'
            });

            await analysisTask.save();

            // Add to queue with clean data
            this.taskQueue.push({
                taskId: analysisTask.taskId,
                applicationId: cleanApplicationId,
                workspaceId: cleanWorkspaceId,
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

        // Check if worker already exists for this task
        if (this.workers.has(taskId)) {
            console.log(`⚠️ Worker already exists for task: ${taskId}`);
            return;
        }

        try {
            console.log(`🚀 Starting worker for task: ${taskId}`);

            // Before starting worker, fetch responses and transcribe audio
            const Response = require('../model/response');
            const ObjectId = require('mongodb').ObjectId;
            
            const applicationId = taskData.applicationId;
            const appObjectId = new ObjectId(applicationId);
            
            console.log(`🔄 Fetching responses for application: ${applicationId}`);
            const responses = await Response.find({
                sessionId: appObjectId,
                isActive: true,
                isDeleted: false
            });
            
            if (responses && responses.length > 0) {
                console.log(`📋 Found ${responses.length} responses, starting transcription...`);
                await this.transcribeResponseAudios(responses);
                console.log(`✅ Transcription completed for application: ${applicationId}`);
            } else {
                console.log(`⚠️ No responses found for application: ${applicationId}`);
            }

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
                taskData: {
                    ...taskData,
                    // Ensure data is clean strings
                    applicationId: taskData.applicationId.toString(),
                    workspaceId: taskData.workspaceId.toString()
                }
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

            // Update task with completion result
            await AnalysisTasks.findOneAndUpdate(
                { taskId },
                {
                    status: 'completed',
                    result: result.result || result,
                    completedAt: new Date()
                }
            );

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

            // Don't retry for specific error codes
            const nonRetryableCodes = ['timeout', 'cancelled', 'NO_RESPONSES', 'INVALID_APPLICATION'];
            const shouldRetry = task.retryCount < this.retryAttempts &&
                !nonRetryableCodes.includes(error.code);

            if (shouldRetry) {
                console.log(`🔄 Retrying task ${taskId} (attempt ${task.retryCount + 1}/${this.retryAttempts})`);

                // Extract applicationId and workspaceId safely
                let applicationId, workspaceId;

                // Check if task data is valid
                if (task.applicationId) {
                    if (typeof task.applicationId === 'object' && 
                        task.applicationId.toString &&
                        task.applicationId.toString().length === 24) {
                        applicationId = task.applicationId.toString();
                    } else if (typeof task.applicationId === 'string' && task.applicationId.length === 24) {
                        applicationId = task.applicationId;
                    }
                }

                // If applicationId is still not valid, extract from taskId
                if (!applicationId) {
                    const taskParts = taskId.split('_');
                    if (taskParts.length >= 2 && taskParts[1].length === 24) {
                        applicationId = taskParts[1];
                        console.log(`⚠️ Using applicationId from taskId: ${applicationId}`);
                    } else {
                        throw new Error(`Cannot determine valid applicationId for task ${taskId}`);
                    }
                }

                // Similar logic for workspaceId
                if (task.workspaceId) {
                    if (typeof task.workspaceId === 'object' && 
                        task.workspaceId.toString &&
                        task.workspaceId.toString().length === 24) {
                        workspaceId = task.workspaceId.toString();
                    } else if (typeof task.workspaceId === 'string' && task.workspaceId.length === 24) {
                        workspaceId = task.workspaceId;
                    }
                }

                // If workspaceId is still not valid, get from application
                if (!workspaceId) {
                    try {
                        const mongoose = require('mongoose');
                        const Application = mongoose.model('application');
                        const application = await Application.findById(applicationId).select('workspace');
                        if (application && application.workspace) {
                            workspaceId = application.workspace.toString();
                            console.log(`⚠️ Using workspaceId from application: ${workspaceId}`);
                        } else {
                            throw new Error(`Cannot determine valid workspaceId for task ${taskId}`);
                        }
                    } catch (dbError) {
                        console.error(`❌ Error fetching workspaceId for task ${taskId}:`, dbError);
                        throw new Error(`Cannot determine valid workspaceId for task ${taskId}`);
                    }
                }

                // Update retry count and reset task data with correct format
                await AnalysisTasks.findOneAndUpdate(
                    { taskId },
                    {
                        $inc: { retryCount: 1 },
                        status: 'pending',
                        applicationId: applicationId, // Store as string to prevent corruption
                        workspaceId: workspaceId,     // Store as string to prevent corruption
                        lastError: {
                            message: error.message,
                            code: error.code,
                            timestamp: new Date()
                        }
                    }
                );

                // Add back to queue with corrected data
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
                console.log(`❌ Task ${taskId} failed permanently (reason: ${error.code || 'unknown'})`);

                // Update task as failed or completed based on error type
                const updateData = {
                    error: {
                        message: error.message || 'Task failed',
                        code: error.code || 'ANALYSIS_FAILED',
                        stack: error.stack,
                        step: 'final_failure'
                    },
                    failedAt: new Date()
                };

                // If it's NO_RESPONSES, mark as completed instead of failed
                if (error.code === 'NO_RESPONSES') {
                    updateData.status = 'completed';
                    updateData.result = {
                        success: false,
                        reason: 'No interview responses found',
                        analysis: null
                    };
                    delete updateData.failedAt;
                    updateData.completedAt = new Date();
                } else {
                    updateData.status = 'failed';
                }

                await AnalysisTasks.findOneAndUpdate({ taskId }, updateData);

                // Emit permanent failure event
                this.emit('permanentFailure', { taskId, error });
            }

            // Cleanup worker
            this.terminateWorker(taskId, 'failed');

            // Emit failure event
            this.emit('failed', { taskId, error, retry: shouldRetry });

            // Process next task in queue if not retrying
            if (!shouldRetry) {
                setTimeout(() => this.processQueue(), 1000);
            }

        } catch (updateError) {
            console.error(`❌ Failed to handle task failure for ${taskId}:`, updateError);
            // Force cleanup even if update failed
            this.terminateWorker(taskId, 'update_failed');
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

            // Process next task in queue after a short delay
            if (reason !== 'completed') {
                setTimeout(() => this.processQueue(), 1000);
            }
        }
    }

    /**
     * Cleanup worker resources
     */
    cleanupWorker(taskId) {
        this.workers.delete(taskId);
        console.log(`🧹 Cleaned up worker for task: ${taskId}`);
        
        // Process queue after cleanup
        setTimeout(() => this.processQueue(), 500);
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
                { 
                    status: 'cancelled',
                    cancelledAt: new Date()
                }
            );

            return { success: true, message: 'Task cancelled successfully' };

        } catch (error) {
            console.error(`❌ Failed to cancel task ${taskId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get task status
     */
    async getTaskStatus(taskId) {
        try {
            const task = await AnalysisTasks.findOne({ taskId });
            if (!task) {
                return { success: false, message: 'Task not found' };
            }

            const isActive = this.workers.has(taskId);
            const queuePosition = this.taskQueue.findIndex(t => t.taskId === taskId) + 1;

            return {
                success: true,
                task: {
                    taskId: task.taskId,
                    status: task.status,
                    retryCount: task.retryCount,
                    isActive,
                    queuePosition: queuePosition || null,
                    createdAt: task.createdAt,
                    completedAt: task.completedAt,
                    failedAt: task.failedAt,
                    result: task.result,
                    error: task.error
                }
            };
        } catch (error) {
            console.error(`❌ Failed to get task status for ${taskId}:`, error);
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
            isProcessing: this.isProcessing,
            queuedTasks: this.taskQueue.map(task => ({
                taskId: task.taskId,
                applicationId: task.applicationId,
                priority: task.priority,
                createdAt: task.createdAt
            })),
            activeTasks: Array.from(this.workers.keys())
        };
    }

    /**
     * Shutdown all workers gracefully
     */
    async shutdown() {
        console.log('🛑 Shutting down Analysis Worker Manager...');

        // Stop processing new tasks
        this.isProcessing = true;

        // Cancel all pending tasks
        const pendingTasks = [...this.taskQueue];
        this.taskQueue = [];

        // Update pending tasks as cancelled
        for (const task of pendingTasks) {
            try {
                await AnalysisTasks.findOneAndUpdate(
                    { taskId: task.taskId },
                    { 
                        status: 'cancelled',
                        cancelledAt: new Date(),
                        error: {
                            message: 'System shutdown',
                            code: 'SHUTDOWN'
                        }
                    }
                );
            } catch (error) {
                console.error(`❌ Error cancelling task ${task.taskId} during shutdown:`, error);
            }
        }

        // Terminate all active workers
        const terminationPromises = Array.from(this.workers.keys()).map(taskId => {
            return new Promise((resolve) => {
                this.terminateWorker(taskId, 'shutdown');
                setTimeout(resolve, 100); // Small delay to ensure cleanup
            });
        });

        await Promise.all(terminationPromises);

        // Wait a bit more for all cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('✅ Analysis Worker Manager shutdown complete');
    }
}

// Create singleton instance
const analysisWorkerManager = new AnalysisWorkerManager();

module.exports = analysisWorkerManager;
