/**
 * index.js
 * @description :: index route file of client platform.
 */

const express = require('express');
const router = express.Router();
router.use('/client/auth', require('./auth'));
router.use('/client/interview', require('./interview')); // Add interview routes
router.use('/client/api/v1/transcription', require('./transcriptionRoutes'));
router.use('/client/ai-chat', require('./aiChatRoutes'));
router.use('/client/s3', require('./s3Routes'));
router.use('/client/email', require('./emailRoutes'));
router.use('/client/api/v1', require('./workspace'));
router.use(require('./responseRoutes'));
router.use(require('./applicationRoutes'));
router.use(require('./questionRoutes'));
router.use(require('./jobRoutes'));
router.use(require('./recruiterRoutes'));
router.use(require('./userRoutes'));
router.use(require('./roleRoutes'));
router.use(require('./projectRouteRoutes'));
router.use(require('./routeRoleRoutes'));
router.use(require('./userRoleRoutes'));
router.use(require('./uploadRoutes'));
router.use(require('./planRoutes'))
router.use(require('./purchaseRoutes'))
router.use('/client/api/job-scraping',require('./jobScrapingRoutes'));
router.use('/client/api/job-description',require('./jobDescriptionRoutes'))
router.use('/client/api/interview-questions',require('./interviewQuestionsRoutes'));
router.use('/client/api/candidate-verification', require('./candidateVerificationRoutes'));

module.exports = router;
