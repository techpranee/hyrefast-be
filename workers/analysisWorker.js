/**
 * analysisWorker.js
 * @description :: Worker thread for processing interview analysis tasks
 */

// Load environment variables
require('dotenv').config();

const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;

// Import required models and services
const Response = require('../model/response');
const Application = require('../model/application');
const AnalysisTasks = require('../model/analysisTasks');
const Question = require('../model/question');
const Job = require('../model/job');
const User = require('../model/user');

// Import analysis functions
const { generateAIAnalysis } = require('../services/analysisService');
const { generateOverallAIAnalysis } = require('../services/analysisService');

let isConnected = false;

// Database connection
async function connectToDatabase() {
  if (isConnected) return;
  
  try {
    const mongoURI = process.env.DB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/hyrefast';
    
    if (!mongoURI || mongoURI === 'undefined') {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    console.log('🔗 Worker connecting to database...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('🔗 Worker connected to database');
  } catch (error) {
    console.error('❌ Worker database connection failed:', error);
    throw error;
  }
}

// Main worker function
async function processAnalysisTask(taskData) {
  const { taskId, applicationId, workspaceId } = taskData;
  const workerId = `worker_${process.pid}_${Date.now()}`;
  
  console.log(`🔄 Worker ${workerId} starting analysis for task: ${taskId}`);
  console.log(`📋 Raw task data:`, JSON.stringify(taskData, null, 2));
  console.log(`📋 ApplicationId details:`, {
    value: applicationId,
    type: typeof applicationId,
    isObjectId: applicationId && applicationId.constructor && applicationId.constructor.name === 'ObjectId',
    stringValue: applicationId ? applicationId.toString() : 'null'
  });
  
  try {
    // Connect to database
    await connectToDatabase();
    
    // Validate and convert applicationId
    let appObjectId;
    let applicationIdString;
    
    console.log(`🔍 Processing applicationId:`, {
      original: applicationId,
      type: typeof applicationId,
      constructor: applicationId && applicationId.constructor && applicationId.constructor.name
    });
    
    try {
      if (typeof applicationId === 'string') {
        applicationIdString = applicationId;
      } else if (applicationId && applicationId._id) {
        // Handle case where applicationId is an ObjectId object
        applicationIdString = applicationId._id.toString();
      } else if (applicationId && typeof applicationId === 'object' && applicationId.toString) {
        // Handle case where applicationId is already an ObjectId
        applicationIdString = applicationId.toString();
      } else {
        throw new Error(`Invalid applicationId format: ${JSON.stringify(applicationId)}`);
      }
      
      // Validate the string is a valid ObjectId format (24 hex characters)
      if (!applicationIdString || !/^[0-9a-fA-F]{24}$/.test(applicationIdString)) {
        throw new Error(`Invalid ObjectId format: ${applicationIdString}`);
      }
      
      appObjectId = new ObjectId(applicationIdString);
      console.log(`✅ Successfully converted to ObjectId:`, appObjectId.toString());
      
    } catch (error) {
      console.error(`❌ Failed to convert applicationId:`, error);
      throw new Error(`Failed to convert applicationId to ObjectId: ${error.message}`);
    }
    
    // Update task status to processing
    await AnalysisTasks.findOneAndUpdate(
      { taskId },
      {
        status: 'processing',
        workerId,
        'timing.startedAt': new Date(),
        'progress.currentStep': 'fetching_responses'
      }
    );
    
    // Send progress update
    parentPort.postMessage({
      type: 'progress',
      taskId,
      step: 'fetching_responses',
      message: 'Fetching interview responses...'
    });
    
    // Fetch all responses for the application
    const responses = await Response.find({
      sessionId: appObjectId,
      isActive: true,
      isDeleted: false
    }).populate('question');
    
    if (!responses || responses.length === 0) {
      throw new Error('No responses found for this application');
    }
    
    // Fetch application details with populated data
    const application = await Application.findById(appObjectId)
      .populate('candidate', 'name email full_name experience skills location')
      .populate('job');
    
    if (!application) {
      throw new Error('Application not found');
    }
    
    // Update task with total responses count
    await AnalysisTasks.findOneAndUpdate(
      { taskId },
      {
        'jobData.totalResponses': responses.length,
        'progress.totalSteps': responses.length + 1, // +1 for overall analysis
        'progress.currentStep': 'analyzing_individual'
      }
    );
    
    console.log(`📊 Processing ${responses.length} responses for application ${applicationId}`);
    
    // Phase 1: Analyze individual responses
    const individualResults = [];
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      
      try {
        parentPort.postMessage({
          type: 'progress',
          taskId,
          step: 'analyzing_individual',
          message: `Analyzing response ${i + 1} of ${responses.length}...`,
          current: i + 1,
          total: responses.length
        });
        
        // Update response status
        await Response.findByIdAndUpdate(response._id, {
          analysisStatus: 'processing',
          analysisTaskId: taskId
        });
        
        // Prepare data for AI analysis
        const analysisData = {
          questionText: response.question?.text || response.questionText || '',
          responseText: response.transcriptionText || response.browserTranscription || '',
          jobDetails: {
            title: application.job?.title || '',
            description: application.job?.description || '',
            requirements: application.job?.requirements || []
          },
          questionDetails: {
            type: response.question?.type || 'general',
            category: response.question?.category || 'general',
            difficulty: response.question?.difficulty || 'medium'
          },
          candidateInfo: {
            name: application.candidate?.full_name || application.candidate?.name || '',
            experience: application.candidate?.experience || '',
            skills: application.candidate?.skills || []
          },
          evaluationInstructions: response.question?.evaluationInstructions || ''
        };
        
        // Generate AI analysis for individual response
        const aiAnalysis = await generateAIAnalysis(analysisData);
        
        // Update response with analysis results
        await Response.findByIdAndUpdate(response._id, {
          aiAnalysis: aiAnalysis,
          analysisStatus: 'completed',
          analysisProcessedAt: new Date(),
          score: aiAnalysis.overall_score?.toString() || aiAnalysis.score?.toString() || '0'
        });
        
        individualResults.push({
          responseId: response._id,
          score: aiAnalysis.overall_score || aiAnalysis.score || 0,
          analysisCompleted: true
        });
        
        // Update task progress
        await AnalysisTasks.findOneAndUpdate(
          { taskId },
          {
            'jobData.processedResponses': i + 1,
            'progress.completedSteps': i + 1,
            $push: { 'jobData.individualAnalyses': response._id }
          }
        );
        
        console.log(`✅ Completed analysis for response ${i + 1}/${responses.length}`);
        
      } catch (error) {
        console.error(`❌ Failed to analyze response ${response._id}:`, error);
        
        // Update response with failed status
        await Response.findByIdAndUpdate(response._id, {
          analysisStatus: 'failed',
          analysisProcessedAt: new Date()
        });
        
        // Continue with other responses
        individualResults.push({
          responseId: response._id,
          score: 0,
          analysisCompleted: false,
          error: error.message
        });
      }
    }
    
    // Phase 2: Generate overall analysis
    parentPort.postMessage({
      type: 'progress',
      taskId,
      step: 'analyzing_overall',
      message: 'Generating overall candidate analysis...'
    });
    
    await AnalysisTasks.findOneAndUpdate(
      { taskId },
      { 'progress.currentStep': 'analyzing_overall' }
    );
    
    try {
      // Prepare data for overall analysis
      const overallAnalysisData = {
        candidateProfile: {
          name: application.candidate?.full_name || application.candidate?.name || '',
          email: application.candidate?.email || '',
          experience: application.candidate?.experience || '',
          skills: application.candidate?.skills || [],
          location: application.candidate?.location || ''
        },
        jobProfile: {
          title: application.job?.title || '',
          description: application.job?.description || '',
          requirements: application.job?.requirements || [],
          location: application.job?.location || ''
        },
        responses: responses.map(r => ({
          questionText: r.question?.text || r.questionText || '',
          responseText: r.transcriptionText || r.browserTranscription || '',
          questionType: r.question?.type || 'general',
          aiAnalysis: r.aiAnalysis || {}
        })),
        interviewMetadata: {
          totalQuestions: responses.length,
          completedAt: new Date(),
          applicationId: applicationId
        }
      };
      
      // Generate overall AI analysis
      const overallAnalysis = await generateOverallAIAnalysis(overallAnalysisData);
      
      // Calculate average score
      const validScores = individualResults
        .filter(r => r.analysisCompleted && r.score > 0)
        .map(r => r.score);
      const averageScore = validScores.length > 0 
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
        : 0;
      
      // Update application with overall analysis
      await Application.findByIdAndUpdate(applicationId, {
        overall_score: overallAnalysis,
        status: 'assessment_completed'
      });
      
      // Phase 3: Save results
      parentPort.postMessage({
        type: 'progress',
        taskId,
        step: 'saving_results',
        message: 'Saving analysis results...'
      });
      
      await AnalysisTasks.findOneAndUpdate(
        { taskId },
        {
          'progress.currentStep': 'saving_results',
          'progress.completedSteps': responses.length + 1,
          'jobData.overallAnalysisCompleted': true,
          'results.individualScores': individualResults,
          'results.overallScore': overallAnalysis,
          'results.averageScore': averageScore,
          'results.analysisCompletedAt': new Date()
        }
      );
      
      console.log(`✅ Overall analysis completed for application ${applicationId}`);
      
    } catch (error) {
      console.error(`❌ Failed to generate overall analysis:`, error);
      throw new Error(`Overall analysis failed: ${error.message}`);
    }
    
    // Mark task as completed
    await AnalysisTasks.findOneAndUpdate(
      { taskId },
      {
        status: 'completed',
        'timing.completedAt': new Date()
      }
    );
    
    // Send completion message
    parentPort.postMessage({
      type: 'completed',
      taskId,
      message: 'Analysis completed successfully',
      results: {
        totalResponses: responses.length,
        completedAnalyses: individualResults.filter(r => r.analysisCompleted).length,
        averageScore: individualResults
          .filter(r => r.analysisCompleted && r.score > 0)
          .reduce((sum, r, _, arr) => sum + r.score / arr.length, 0)
      }
    });
    
    console.log(`🎉 Task ${taskId} completed successfully`);
    
  } catch (error) {
    console.error(`❌ Task ${taskId} failed:`, error);
    
    // Update task with error
    await AnalysisTasks.findOneAndUpdate(
      { taskId },
      {
        status: 'failed',
        error: {
          message: error.message,
          code: error.code || 'ANALYSIS_ERROR',
          stack: error.stack,
          step: 'worker_execution'
        },
        'timing.completedAt': new Date()
      }
    );
    
    // Send error message
    parentPort.postMessage({
      type: 'error',
      taskId,
      error: {
        message: error.message,
        code: error.code || 'ANALYSIS_ERROR'
      }
    });
    
    throw error;
  }
}

// Handle messages from parent thread
if (parentPort) {
  parentPort.on('message', async (data) => {
    try {
      if (data.type === 'start') {
        await processAnalysisTask(data.taskData);
      }
    } catch (error) {
      console.error('Worker error:', error);
      parentPort.postMessage({
        type: 'error',
        error: {
          message: error.message,
          stack: error.stack
        }
      });
    }
  });
}

// Handle worker termination
process.on('SIGTERM', () => {
  console.log('Worker received SIGTERM, cleaning up...');
  if (mongoose.connection.readyState === 1) {
    mongoose.connection.close();
  }
  process.exit(0);
});

module.exports = { processAnalysisTask };
