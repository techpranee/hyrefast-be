/**
 * aiChatRoutes.js
 * @description :: routes for AI chat and analysis operations
 */

const express = require('express');
const router = express.Router();
const aiChatController = require('../../../controller/client/v1/aiChatController');
const auth = require('../../../middleware/auth');

/**
 * @description : analyze interview response using AI
 * @param {Object} req : request for AI analysis
 * @param {Object} res : response with analysis result
 * @return {Object} : analysis result
 */
router.post('/analyze-response', 
  auth.authenticateToken,
  aiChatController.analyzeInterviewResponse
);

/**
 * @description : generate follow-up questions
 * @param {Object} req : request for follow-up questions
 * @param {Object} res : response with generated questions
 * @return {Object} : follow-up questions
 */
router.post('/generate-followup', 
  auth.authenticateToken,
  aiChatController.generateFollowUpQuestions
);

/**
 * @description : generate interview questions for a job
 * @param {Object} req : request for question generation
 * @param {Object} res : response with generated questions
 * @return {Object} : interview questions
 */
router.post('/generate-questions', 
  auth.authenticateToken,
  aiChatController.generateInterviewQuestions
);

/**
 * @description : score candidate responses
 * @param {Object} req : request for response scoring
 * @param {Object} res : response with scores
 * @return {Object} : scoring results
 */
router.post('/score-responses', 
  auth.authenticateToken,
  aiChatController.scoreResponses
);

/**
 * @description : generate comprehensive interview summary
 * @param {Object} req : request for interview summary
 * @param {Object} res : response with summary
 * @return {Object} : interview summary
 */
router.post('/generate-summary', 
  auth.authenticateToken,
  aiChatController.generateInterviewSummary
);

/**
 * @description : chat with AI about interview or candidate
 * @param {Object} req : request for AI chat
 * @param {Object} res : response with AI chat reply
 * @return {Object} : AI chat response
 */
router.post('/chat', 
  auth.authenticateToken,
  aiChatController.chatWithAI
);

module.exports = router;
