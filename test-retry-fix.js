const mongoose = require('mongoose');
require('dotenv').config();

// Import models
require('./model/analysisTasks');
require('./model/application');
require('./model/workspace');

const AnalysisTasks = mongoose.model('analysisTasks');
const AnalysisWorkerManager = require('./services/analysisWorkerManager');

(async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('✅ Connected to database');

        // Find a failed task to retry
        const failedTask = await AnalysisTasks.findOne({
            status: 'failed',
            retryCount: { $lt: 3 }
        }).limit(1);

        if (failedTask) {
            console.log('🔍 Found failed task to test retry:');
            console.log('   TaskId:', failedTask.taskId);
            console.log('   ApplicationId:', failedTask.applicationId, '(type:', typeof failedTask.applicationId, ')');
            console.log('   WorkspaceId:', failedTask.workspaceId, '(type:', typeof failedTask.workspaceId, ')');
            console.log('   Error:', failedTask.error?.message);
            console.log('   Retry count:', failedTask.retryCount || 0);

            // Test the improved retry logic
            console.log('\n🔄 Testing improved retry logic...');
            const manager = AnalysisWorkerManager.getInstance();

            // Simulate a task failure to trigger retry
            await manager.handleTaskFailure(failedTask.taskId, {
                message: 'Testing retry logic',
                code: 'TEST_RETRY'
            });

            // Check task after retry attempt
            setTimeout(async () => {
                const updatedTask = await AnalysisTasks.findOne({ taskId: failedTask.taskId });
                console.log('\n📋 Task after retry attempt:');
                console.log('   Status:', updatedTask.status);
                console.log('   ApplicationId:', updatedTask.applicationId, '(type:', typeof updatedTask.applicationId, ')');
                console.log('   WorkspaceId:', updatedTask.workspaceId, '(type:', typeof updatedTask.workspaceId, ')');
                console.log('   Retry count:', updatedTask.retryCount || 0);

                await mongoose.disconnect();
                process.exit(0);
            }, 2000);

        } else {
            console.log('🎉 No failed tasks found to retry');
            await mongoose.disconnect();
            process.exit(0);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
