/**
 * index.js
 * @description :: index route file of client platform.
 */

const express = require('express');
const router = express.Router();
router.use('/client/auth', require('./auth'));
router.use('/client/interview', require('./interview')); // Add interview routes
router.use('/client/transcription', require('./transcriptionRoutes'));
router.use('/client/ai-chat', require('./aiChatRoutes'));
router.use('/client/s3', require('./s3Routes'));
router.use('/client/email', require('./emailRoutes'));
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

module.exports = router;
