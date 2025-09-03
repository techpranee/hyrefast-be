/**
 * analysisController.js
 * @description :: Controller for managing analysis tasks and monitoring
 */

const AnalysisTasks = require('../../../model/analysisTasks');
const Application = require('../../../model/application');
const Response = require('../../../model/response');
const AnalysisWorkerManager = require('../../../services/analysisWorkerManager');
const validation = require('../../../utils/validateRequest');
const dbService = require('../../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const utils = require('../../../utils/common');

/**
 * @description : Get analysis task status by application ID
 * @param {Object} req : request including applicationId in params
 * @param {Object} res : response with analysis task status
 * @return {Object} : analysis task status. {status, message, data}
 */
const getAnalysisStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    if (!applicationId) {
      return res.badRequest({
        message: 'Application ID is required'
      });
    }
    
    // Find the latest analysis task for this application
    const analysisTask = await AnalysisTasks.findOne({
      applicationId: new ObjectId(applicationId),
      isActive: true,
      isDeleted: false
    }).sort({ createdAt: -1 });
    
    if (!analysisTask) {
      return res.recordNotFound({
        message: 'No analysis task found for this application'
      });
    }
    
    // Get additional details
    const application = await Application.findById(applicationId)
      .populate('candidate', 'name email')
      .populate('job', 'title');
    
    const responseCount = await Response.countDocuments({
      sessionId: applicationId,
      isActive: true,
      isDeleted: false
    });
    
    return res.success({
      data: {
        task: analysisTask,
        application: {
          id: application._id,
          candidateName: application.candidate?.name,
          candidateEmail: application.candidate?.email,
          jobTitle: application.job?.title,
          status: application.status
        },
        responseCount,
        progress: {
          percentage: analysisTask.progress.percentage,
          currentStep: analysisTask.progress.currentStep,
          completedSteps: analysisTask.progress.completedSteps,
          totalSteps: analysisTask.progress.totalSteps
        }
      },
      message: 'Analysis status retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error getting analysis status:', error);
    return res.internalServerError({
      message: 'Failed to get analysis status',
      error: error.message
    });
  }
};

/**
 * @description : Get analysis task status by task ID
 * @param {Object} req : request including taskId in params
 * @param {Object} res : response with analysis task status
 * @return {Object} : analysis task status. {status, message, data}
 */
const getTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.badRequest({
        message: 'Task ID is required'
      });
    }
    
    const analysisTask = await AnalysisTasks.findOne({
      taskId,
      isActive: true,
      isDeleted: false
    }).populate('applicationId', 'status candidate job')
      .populate('applicationId.candidate', 'name email')
      .populate('applicationId.job', 'title');
    
    if (!analysisTask) {
      return res.recordNotFound({
        message: 'Analysis task not found'
      });
    }
    
    return res.success({
      data: analysisTask,
      message: 'Task status retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error getting task status:', error);
    return res.internalServerError({
      message: 'Failed to get task status',
      error: error.message
    });
  }
};

/**
 * @description : Get worker queue statistics
 * @param {Object} req : request
 * @param {Object} res : response with queue statistics
 * @return {Object} : queue statistics. {status, message, data}
 */
const getQueueStats = async (req, res) => {
  try {
    // Get stats from worker manager
    const queueStats = AnalysisWorkerManager.getQueueStats();
    
    // Get database stats
    const [totalTasks, pendingTasks, processingTasks, completedTasks, failedTasks] = await Promise.all([
      AnalysisTasks.countDocuments({ isActive: true, isDeleted: false }),
      AnalysisTasks.countDocuments({ status: 'pending', isActive: true, isDeleted: false }),
      AnalysisTasks.countDocuments({ status: 'processing', isActive: true, isDeleted: false }),
      AnalysisTasks.countDocuments({ status: 'completed', isActive: true, isDeleted: false }),
      AnalysisTasks.countDocuments({ status: 'failed', isActive: true, isDeleted: false })
    ]);
    
    // Get recent tasks
    const recentTasks = await AnalysisTasks.find({
      isActive: true,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('applicationId', 'candidate job')
      .populate('applicationId.candidate', 'name')
      .populate('applicationId.job', 'title');
    
    return res.success({
      data: {
        queue: queueStats,
        database: {
          totalTasks,
          pendingTasks,
          processingTasks,
          completedTasks,
          failedTasks
        },
        recentTasks
      },
      message: 'Queue statistics retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error getting queue stats:', error);
    return res.internalServerError({
      message: 'Failed to get queue statistics',
      error: error.message
    });
  }
};

/**
 * @description : Retry a failed analysis task
 * @param {Object} req : request including taskId in params
 * @param {Object} res : response with retry result
 * @return {Object} : retry result. {status, message, data}
 */
const retryTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.badRequest({
        message: 'Task ID is required'
      });
    }
    
    const analysisTask = await AnalysisTasks.findOne({
      taskId,
      isActive: true,
      isDeleted: false
    });
    
    if (!analysisTask) {
      return res.recordNotFound({
        message: 'Analysis task not found'
      });
    }
    
    if (analysisTask.status !== 'failed') {
      return res.badRequest({
        message: 'Only failed tasks can be retried'
      });
    }
    
    // Reset task for retry
    await AnalysisTasks.findOneAndUpdate(
      { taskId },
      {
        status: 'pending',
        error: null,
        'timing.startedAt': null,
        'timing.completedAt': null,
        'timing.duration': null,
        'progress.currentStep': 'fetching_responses',
        'progress.completedSteps': 0,
        'progress.percentage': 0,
        workerId: null
      }
    );
    
    // Queue the task again
    const queueResult = await AnalysisWorkerManager.queueAnalysisTask({
      applicationId: analysisTask.applicationId,
      workspaceId: analysisTask.workspaceId,
      priority: 'high' // Give retry tasks higher priority
    });
    
    if (queueResult.success) {
      return res.success({
        data: { taskId, retryTaskId: queueResult.taskId },
        message: 'Task queued for retry successfully'
      });
    } else {
      return res.internalServerError({
        message: 'Failed to queue task for retry',
        error: queueResult.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error retrying task:', error);
    return res.internalServerError({
      message: 'Failed to retry task',
      error: error.message
    });
  }
};

/**
 * @description : Cancel a pending or processing analysis task
 * @param {Object} req : request including taskId in params
 * @param {Object} res : response with cancellation result
 * @return {Object} : cancellation result. {status, message, data}
 */
const cancelTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.badRequest({
        message: 'Task ID is required'
      });
    }
    
    const analysisTask = await AnalysisTasks.findOne({
      taskId,
      isActive: true,
      isDeleted: false
    });
    
    if (!analysisTask) {
      return res.recordNotFound({
        message: 'Analysis task not found'
      });
    }
    
    if (!['pending', 'processing'].includes(analysisTask.status)) {
      return res.badRequest({
        message: 'Only pending or processing tasks can be cancelled'
      });
    }
    
    // Cancel the task
    const cancelResult = await AnalysisWorkerManager.cancelTask(taskId);
    
    if (cancelResult.success) {
      return res.success({
        data: { taskId },
        message: 'Task cancelled successfully'
      });
    } else {
      return res.internalServerError({
        message: 'Failed to cancel task',
        error: cancelResult.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error cancelling task:', error);
    return res.internalServerError({
      message: 'Failed to cancel task',
      error: error.message
    });
  }
};

/**
 * @description : Get all analysis tasks with pagination and filtering
 * @param {Object} req : request including query parameters
 * @param {Object} res : response with analysis tasks
 * @return {Object} : analysis tasks list. {status, message, data}
 */
const getAllTasks = async (req, res) => {
  try {
    let options = {};
    let query = { isActive: true, isDeleted: false };
    
    // Build query from request parameters
    if (req.body.query) {
      query = { ...query, ...req.body.query };
    }
    
    if (req.body.options) {
      options = { ...req.body.options };
    }
    
    // Default pagination
    if (!options.page) options.page = 1;
    if (!options.limit) options.limit = 20;
    
    // Add population
    options.populate = [
      {
        path: 'applicationId',
        select: 'candidate job status',
        populate: [
          { path: 'candidate', select: 'name email' },
          { path: 'job', select: 'title' }
        ]
      }
    ];
    
    // Sort by creation date (newest first)
    options.sort = { createdAt: -1 };
    
    const tasks = await dbService.paginate(AnalysisTasks, query, options);
    
    return res.success({
      data: tasks,
      message: 'Analysis tasks retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error getting all tasks:', error);
    return res.internalServerError({
      message: 'Failed to get analysis tasks',
      error: error.message
    });
  }
};

/**
 * @description : Get analysis results for a completed application
 * @param {Object} req : request including applicationId in params
 * @param {Object} res : response with analysis results
 * @return {Object} : analysis results. {status, message, data}
 */
const getAnalysisResults = async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    if (!applicationId) {
      return res.badRequest({
        message: 'Application ID is required'
      });
    }
    
    // Find completed analysis task
    const analysisTask = await AnalysisTasks.findOne({
      applicationId: new ObjectId(applicationId),
      status: 'completed',
      isActive: true,
      isDeleted: false
    }).sort({ createdAt: -1 });
    
    if (!analysisTask) {
      return res.recordNotFound({
        message: 'No completed analysis found for this application'
      });
    }
    
    // Get application with overall score
    const application = await Application.findById(applicationId)
      .populate('candidate', 'name email full_name experience skills')
      .populate('job', 'title description');
    
    // Get individual response analyses
    const responses = await Response.find({
      sessionId: applicationId,
      analysisStatus: 'completed',
      isActive: true,
      isDeleted: false
    }).populate('question', 'text type category');
    
    return res.success({
      data: {
        task: analysisTask,
        application: {
          id: application._id,
          candidate: application.candidate,
          job: application.job,
          status: application.status,
          overallScore: application.overall_score
        },
        individualAnalyses: responses.map(r => ({
          questionId: r.question?._id,
          questionText: r.question?.text || r.questionText,
          questionType: r.question?.type,
          responseText: r.transcriptionText || r.browserTranscription,
          analysis: r.aiAnalysis,
          score: r.score,
          processedAt: r.analysisProcessedAt
        })),
        summary: analysisTask.results
      },
      message: 'Analysis results retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error getting analysis results:', error);
    return res.internalServerError({
      message: 'Failed to get analysis results',
      error: error.message
    });
  }
};

module.exports = {
  getAnalysisStatus,
  getTaskStatus,
  getQueueStats,
  retryTask,
  cancelTask,
  getAllTasks,
  getAnalysisResults
};
