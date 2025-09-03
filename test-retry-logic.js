const mongoose = require('mongoose');
require('dotenv').config();

// Import models
require('./model/analysisTasks');
require('./model/application');
require('./model/response');
require('./model/workspace');
require('./model/user');

const AnalysisTasks = mongoose.model('analysisTasks');
const AnalysisWorkerManager = require('./services/analysisWorkerManager');

(async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to database');
    
    // Check for failed tasks
    const failedTasks = await AnalysisTasks.find({ status: 'failed' }).limit(3);
    console.log('📊 Failed tasks found:', failedTasks.length);
    
    if (failedTasks.length > 0) {
      const task = failedTasks[0];
      console.log('🔍 First failed task:');
      console.log('   TaskId:', task.taskId);
      console.log('   ApplicationId:', task.applicationId, '(type:', typeof task.applicationId, ')');
      console.log('   WorkspaceId:', task.workspaceId, '(type:', typeof task.workspaceId, ')');
      console.log('   Error:', task.error?.message);
      console.log('   Retry count:', task.retryCount || 0);
      
      // Test retry logic
      console.log('\n🔄 Testing retry logic...');
      const manager = AnalysisWorkerManager.getInstance();
      
      try {
        const result = await manager.retryTask(task.taskId);
        console.log('✅ Retry successful:', result);
      } catch (error) {
        console.error('❌ Retry failed:', error.message);
      }
      
      // Check task after retry
      const updatedTask = await AnalysisTasks.findOne({ taskId: task.taskId });
      console.log('\n📋 Task after retry attempt:');
      console.log('   Status:', updatedTask.status);
      console.log('   ApplicationId:', updatedTask.applicationId, '(type:', typeof updatedTask.applicationId, ')');
      console.log('   WorkspaceId:', updatedTask.workspaceId, '(type:', typeof updatedTask.workspaceId, ')');
      console.log('   Retry count:', updatedTask.retryCount || 0);
    } else {
      console.log('🎉 No failed tasks to retry');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
