/**
 * dashboardController.js
 * @description :: Dashboard API with credit and interview analytics
 */

const Workspace = require('../../../model/workspace');
const Application = require('../../../model/application');
const Credit = require('../../../model/credit');
const Purchase = require('../../../model/purchase');
const Job = require('../../../model/job');
const Response = require('../../../model/response');
const CreditService = require('../../../services/creditService');

/**
 * @description : get workspace dashboard data
 * @param {Object} req : request including workspace ID
 * @param {Object} res : response containing dashboard data
 * @return {Object} : dashboard data. {status, message, data}
 */
const getWorkspaceDashboard = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId || req.user.workspace;
    
    if (!workspaceId) {
      return res.badRequest({ message: 'Workspace ID is required' });
    }

    // Validate workspace access
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      $or: [
        { addedBy: req.user.id },
        { members: req.user.id }
      ],
      isDeleted: false
    });

    if (!workspace) {
      return res.recordNotFound({ message: 'Workspace not found or access denied' });
    }

    // Get date ranges for analytics
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Credit Overview
    const creditBalance = await CreditService.getCreditBalance(workspaceId);
    
    // Interview Statistics
    const interviewStats = await Application.aggregate([
      {
        $match: {
          workspace: workspace._id,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          creditsUsed: {
            $sum: { $cond: ['$credit_deducted', 1, 0] }
          }
        }
      }
    ]);

    // Weekly Interview Trends
    const weeklyInterviews = await Application.aggregate([
      {
        $match: {
          workspace: workspace._id,
          createdAt: { $gte: startOfWeek },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            $dayOfWeek: '$createdAt'
          },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Monthly Credit Usage
    const monthlyCreditUsage = await Credit.aggregate([
      {
        $match: {
          workspace: workspace._id,
          transaction_type: 'debit',
          createdAt: { $gte: startOfMonth },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            $dayOfMonth: '$createdAt'
          },
          creditsUsed: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Recent Activities
    const recentInterviews = await Application.find({
      workspace: workspaceId,
      isDeleted: false
    })
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate('user', 'name email')
    .populate('job', 'title')
    .select('status user job createdAt completedAt credit_deducted');

    const recentPurchases = await Purchase.find({
      workspace: workspaceId,
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .populate('plan', 'name')
    .select('amount credits_amount status createdAt completed_at plan');

    // Job Performance
    const jobPerformance = await Job.aggregate([
      {
        $match: {
          workspace: workspace._id,
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'job',
          as: 'applications'
        }
      },
      {
        $project: {
          title: 1,
          status: 1,
          totalApplications: { $size: '$applications' },
          completedApplications: {
            $size: {
              $filter: {
                input: '$applications',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          },
          creditsUsed: {
            $size: {
              $filter: {
                input: '$applications',
                cond: { $eq: ['$$this.credit_deducted', true] }
              }
            }
          }
        }
      },
      {
        $limit: 10
      }
    ]);

    // Credit Alerts
    const alerts = [];
    if (workspace.available_credits <= workspace.credit_alert_threshold) {
      alerts.push({
        type: 'warning',
        message: `Low credits: ${workspace.available_credits} remaining`,
        action: 'purchase_credits',
        priority: 'high'
      });
    }

    if (workspace.available_credits === 0) {
      alerts.push({
        type: 'error',
        message: 'No credits remaining - interviews are blocked',
        action: 'purchase_credits',
        priority: 'critical'
      });
    }

    // Format interview stats
    const formattedInterviewStats = {
      total: interviewStats.reduce((sum, stat) => sum + stat.count, 0),
      completed: interviewStats.find(s => s._id === 'completed')?.count || 0,
      inProgress: interviewStats.find(s => s._id === 'in_progress')?.count || 0,
      pending: interviewStats.find(s => s._id === 'pending')?.count || 0,
      failed: interviewStats.find(s => s._id === 'failed')?.count || 0,
      totalCreditsUsed: interviewStats.reduce((sum, stat) => sum + stat.creditsUsed, 0)
    };

    const dashboardData = {
      workspace: {
        id: workspace._id,
        name: workspace.name,
        memberCount: (workspace.members?.length || 0) + 1, // +1 for owner
        createdAt: workspace.createdAt
      },
      credits: {
        available: creditBalance.available_credits,
        totalPurchased: creditBalance.total_credits_purchased,
        totalUsed: creditBalance.total_credits_used,
        alertThreshold: creditBalance.credit_alert_threshold,
        lastUpdate: creditBalance.last_credit_update
      },
      interviews: formattedInterviewStats,
      trends: {
        weeklyInterviews: weeklyInterviews,
        monthlyCreditUsage: monthlyCreditUsage
      },
      recentActivity: {
        interviews: recentInterviews,
        purchases: recentPurchases
      },
      jobPerformance: jobPerformance,
      alerts: alerts,
      summary: {
        activeJobs: await Job.countDocuments({ workspace: workspaceId, status: 'active', isDeleted: false }),
        thisWeekInterviews: weeklyInterviews.reduce((sum, day) => sum + day.count, 0),
        thisMonthCreditsUsed: monthlyCreditUsage.reduce((sum, day) => sum + day.creditsUsed, 0),
        completionRate: formattedInterviewStats.total > 0 
          ? Math.round((formattedInterviewStats.completed / formattedInterviewStats.total) * 100) 
          : 0
      }
    };

    return res.success({ data: dashboardData });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : get credit analytics for workspace
 * @param {Object} req : request including workspace ID and date range
 * @param {Object} res : response containing credit analytics
 * @return {Object} : credit analytics. {status, message, data}
 */
const getCreditAnalytics = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId || req.user.workspace;
    const { dateFrom, dateTo, granularity = 'daily' } = req.query;
    
    if (!workspaceId) {
      return res.badRequest({ message: 'Workspace ID is required' });
    }

    // Validate workspace access
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      $or: [
        { addedBy: req.user.id },
        { members: req.user.id }
      ],
      isDeleted: false
    });

    if (!workspace) {
      return res.recordNotFound({ message: 'Workspace not found or access denied' });
    }

    // Set default date range if not provided
    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build aggregation pipeline based on granularity
    let groupBy = {};
    switch (granularity) {
      case 'hourly':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'weekly':
        groupBy = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'monthly':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default: // daily
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    const creditAnalytics = await Credit.aggregate([
      {
        $match: {
          workspace: workspace._id,
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: groupBy,
          totalCredits: { $sum: '$amount' },
          creditsPurchased: {
            $sum: { $cond: [{ $eq: ['$transaction_type', 'credit'] }, '$amount', 0] }
          },
          creditsUsed: {
            $sum: { $cond: [{ $eq: ['$transaction_type', 'debit'] }, '$amount', 0] }
          },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get transaction breakdown
    const transactionBreakdown = await Credit.aggregate([
      {
        $match: {
          workspace: workspace._id,
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$transaction_type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate efficiency metrics
    const totalCreditsUsed = creditAnalytics.reduce((sum, item) => sum + item.creditsUsed, 0);
    const totalInterviews = await Application.countDocuments({
      workspace: workspaceId,
      credit_deducted: true,
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    });

    const analytics = {
      dateRange: {
        from: startDate,
        to: endDate,
        granularity: granularity
      },
      timeSeries: creditAnalytics,
      breakdown: transactionBreakdown,
      metrics: {
        totalCreditsUsed: totalCreditsUsed,
        totalInterviews: totalInterviews,
        averageCreditsPerDay: creditAnalytics.length > 0 
          ? Math.round(totalCreditsUsed / creditAnalytics.length * 100) / 100 
          : 0,
        efficiency: totalInterviews > 0 ? Math.round((totalCreditsUsed / totalInterviews) * 100) / 100 : 0
      },
      workspace: {
        id: workspace._id,
        name: workspace.name,
        currentCredits: workspace.available_credits
      }
    };

    return res.success({ data: analytics });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : get interview analytics for workspace
 * @param {Object} req : request including workspace ID and filters
 * @param {Object} res : response containing interview analytics
 * @return {Object} : interview analytics. {status, message, data}
 */
const getInterviewAnalytics = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId || req.user.workspace;
    const { dateFrom, dateTo, jobId } = req.query;
    
    if (!workspaceId) {
      return res.badRequest({ message: 'Workspace ID is required' });
    }

    // Validate workspace access
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      $or: [
        { addedBy: req.user.id },
        { members: req.user.id }
      ],
      isDeleted: false
    });

    if (!workspace) {
      return res.recordNotFound({ message: 'Workspace not found or access denied' });
    }

    // Build match query
    let matchQuery = {
      workspace: workspace._id,
      isDeleted: false
    };

    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo);
    }

    if (jobId) {
      matchQuery.job = jobId;
    }

    // Interview completion funnel
    const completionFunnel = await Application.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          started: { $sum: { $cond: [{ $ne: ['$status', 'pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          creditsDeducted: { $sum: { $cond: ['$credit_deducted', 1, 0] } }
        }
      }
    ]);

    // Average completion time
    const completionTimes = await Application.aggregate([
      {
        $match: {
          ...matchQuery,
          status: 'completed',
          startedAt: { $exists: true },
          completedAt: { $exists: true }
        }
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ['$completedAt', '$startedAt'] },
              60000 // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgCompletionTime: { $avg: '$completionTime' },
          minCompletionTime: { $min: '$completionTime' },
          maxCompletionTime: { $max: '$completionTime' }
        }
      }
    ]);

    // Response quality metrics
    const responseMetrics = await Response.aggregate([
      {
        $lookup: {
          from: 'applications',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session'
        }
      },
      {
        $match: {
          'session.workspace': workspace._id,
          'session.isDeleted': false
        }
      },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          withTranscription: {
            $sum: { $cond: [{ $ne: ['$transcriptionText', null] }, 1, 0] }
          },
          withAudio: {
            $sum: { $cond: [{ $ne: ['$responseAudioUrl', null] }, 1, 0] }
          },
          withVideo: {
            $sum: { $cond: [{ $ne: ['$responseVideoUrl', null] }, 1, 0] }
          },
          avgDuration: { $avg: '$responseDuration' }
        }
      }
    ]);

    // Job-wise performance
    const jobPerformance = await Application.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'jobDetails'
        }
      },
      {
        $group: {
          _id: '$job',
          jobTitle: { $first: { $arrayElemAt: ['$jobDetails.title', 0] } },
          totalApplications: { $sum: 1 },
          completedApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          creditsUsed: {
            $sum: { $cond: ['$credit_deducted', 1, 0] }
          },
          avgScore: { $avg: '$overall_score.overall_score' }
        }
      },
      {
        $project: {
          jobTitle: 1,
          totalApplications: 1,
          completedApplications: 1,
          creditsUsed: 1,
          avgScore: { $round: ['$avgScore', 2] },
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedApplications', '$totalApplications'] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { totalApplications: -1 } }
    ]);

    const analytics = {
      summary: completionFunnel[0] || {
        total: 0,
        started: 0,
        inProgress: 0,
        completed: 0,
        creditsDeducted: 0
      },
      completion: completionTimes[0] || {
        avgCompletionTime: 0,
        minCompletionTime: 0,
        maxCompletionTime: 0
      },
      responseQuality: responseMetrics[0] || {
        totalResponses: 0,
        withTranscription: 0,
        withAudio: 0,
        withVideo: 0,
        avgDuration: 0
      },
      jobPerformance: jobPerformance,
      workspace: {
        id: workspace._id,
        name: workspace.name
      }
    };

    return res.success({ data: analytics });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

module.exports = {
  getWorkspaceDashboard,
  getCreditAnalytics,
  getInterviewAnalytics
};