/**
 * cleanup-stuck-tasks.js
 * @description :: Script to clean up stuck analysis tasks and fix corrupted data
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
require('./model/analysisTasks');
require('./model/application');
require('./model/workspace');

const AnalysisTasks = mongoose.model('analysisTasks');
const Application = mongoose.model('application');

async function connectToDatabase() {
    try {
        const mongoURI = process.env.DB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/hyrefast';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to database');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}

async function cleanupStuckTasks() {
    try {
        await connectToDatabase();

        // First, fix any corrupted tasks
        console.log('🔧 Checking for corrupted tasks...');
        const fixedCount = await fixCorruptedTasks();
        if (fixedCount > 0) {
            console.log(`✅ Fixed ${fixedCount} corrupted tasks`);
        }

        // Find tasks that have been processing for more than 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const stuckTasks = await AnalysisTasks.find({
            status: 'processing',
            'timing.startedAt': { $lt: tenMinutesAgo },
            isActive: true,
            isDeleted: false
        });

        console.log(`🔍 Found ${stuckTasks.length} stuck tasks`);

        for (const task of stuckTasks) {
            console.log(`🧹 Cleaning up stuck task: ${task.taskId}`);
            console.log(`   Application: ${task.applicationId}`);
            console.log(`   Started: ${task.timing.startedAt}`);
            console.log(`   Current step: ${task.progress.currentStep}`);

            // Reset the task to pending state
            await AnalysisTasks.findByIdAndUpdate(task._id, {
                status: 'pending',
                workerId: null,
                'timing.startedAt': null,
                'progress.currentStep': 'fetching_responses',
                'progress.completedSteps': 0,
                'progress.percentage': 0,
                error: {
                    message: 'Task was stuck and reset',
                    code: 'CLEANUP_RESET',
                    step: 'cleanup'
                }
            });

            console.log(`✅ Reset task ${task.taskId} to pending`);
        }

        // Also find and clean up very old failed tasks
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const oldFailedTasks = await AnalysisTasks.find({
            status: 'failed',
            'timing.completedAt': { $lt: oneDayAgo },
            isActive: true,
            isDeleted: false
        });

        console.log(`🗑️ Found ${oldFailedTasks.length} old failed tasks to mark as deleted`);

        if (oldFailedTasks.length > 0) {
            await AnalysisTasks.updateMany(
                {
                    status: 'failed',
                    'timing.completedAt': { $lt: oneDayAgo },
                    isActive: true,
                    isDeleted: false
                },
                {
                    isDeleted: true,
                    isActive: false
                }
            );
            console.log(`✅ Marked ${oldFailedTasks.length} old failed tasks as deleted`);
        }

        // Show summary
        const summary = await AnalysisTasks.aggregate([
            { $match: { isActive: true, isDeleted: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        console.log('\n📊 Current task status summary:');
        summary.forEach(item => {
            console.log(`   ${item._id}: ${item.count}`);
        });

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Cleanup completed');
    }
}

async function fixCorruptedTasks() {
    try {
        console.log('\n🔧 Checking for tasks with corrupted data...');

        // Find tasks with corrupted applicationId or workspaceId (empty objects)
        const corruptedTasks = await AnalysisTasks.find({
            $or: [
                { applicationId: {} },
                { workspaceId: {} }
            ]
        });

        console.log(`🔍 Found ${corruptedTasks.length} tasks with corrupted data`);

        for (const task of corruptedTasks) {
            console.log(`\n🔧 Fixing task: ${task.taskId}`);
            console.log(`   Current applicationId:`, task.applicationId);
            console.log(`   Current workspaceId:`, task.workspaceId);

            // Extract applicationId from taskId: task_{applicationId}_{randomId}
            const taskParts = task.taskId.split('_');
            if (taskParts.length >= 2 && taskParts[1].length === 24) {
                const applicationId = taskParts[1];
                console.log(`   Extracted applicationId: ${applicationId}`);

                try {
                    // Verify application exists and get workspace
                    const application = await Application.findById(applicationId).select('workspace');
                    if (application) {
                        console.log(`   Found application with workspace: ${application.workspace}`);

                        // Update the task with correct values
                        await AnalysisTasks.findOneAndUpdate(
                            { taskId: task.taskId },
                            {
                                applicationId: new mongoose.Types.ObjectId(applicationId),
                                workspaceId: application.workspace,
                                status: 'failed', // Mark as failed so it can be retried
                                error: {
                                    message: 'Task data was corrupted and has been restored',
                                    code: 'DATA_CORRUPTION_FIXED',
                                    step: 'data_restoration'
                                }
                            }
                        );

                        console.log(`   ✅ Task ${task.taskId} data restored and marked for retry`);
                    } else {
                        console.log(`   ❌ Application ${applicationId} not found, marking task as permanently failed`);

                        await AnalysisTasks.findOneAndUpdate(
                            { taskId: task.taskId },
                            {
                                status: 'failed',
                                error: {
                                    message: 'Application not found - cannot restore task data',
                                    code: 'APPLICATION_NOT_FOUND',
                                    step: 'data_restoration'
                                }
                            }
                        );
                    }
                } catch (error) {
                    console.log(`   ❌ Error processing task ${task.taskId}:`, error.message);
                }
            } else {
                console.log(`   ❌ Cannot extract applicationId from taskId format`);

                // Mark as permanently failed
                await AnalysisTasks.findOneAndUpdate(
                    { taskId: task.taskId },
                    {
                        status: 'failed',
                        error: {
                            message: 'Cannot extract valid applicationId from taskId',
                            code: 'INVALID_TASK_FORMAT',
                            step: 'data_restoration'
                        }
                    }
                );
            }
        }

        return corruptedTasks.length;
    } catch (error) {
        console.error('❌ Error fixing corrupted tasks:', error);
        return 0;
    }
}

// Run cleanup if called directly
if (require.main === module) {
    cleanupStuckTasks().catch(console.error);
}

module.exports = { cleanupStuckTasks };
