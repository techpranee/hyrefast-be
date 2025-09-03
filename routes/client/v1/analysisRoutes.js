/**
 * analysisRoutes.js
 * @description :: CRUD API routes for analysis task management
 */

const express = require('express');
const router = express.Router();
const analysisController = require('../../controller/client/v1/analysisController');
const auth = require('../../middleware/auth');

// Get analysis status by application ID
router.get('/status/application/:applicationId', auth, analysisController.getAnalysisStatus);

// Get analysis task status by task ID
router.get('/status/task/:taskId', auth, analysisController.getTaskStatus);

// Get worker queue statistics
router.get('/queue/stats', auth, analysisController.getQueueStats);

// Get all analysis tasks with pagination
router.post('/tasks', auth, analysisController.getAllTasks);

// Retry a failed analysis task
router.post('/retry/:taskId', auth, analysisController.retryTask);

// Cancel a pending/processing analysis task
router.delete('/cancel/:taskId', auth, analysisController.cancelTask);

// Get analysis results for completed application
router.get('/results/:applicationId', auth, analysisController.getAnalysisResults);

module.exports = router;
