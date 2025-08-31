/**
 * aiChatRoutes.js
 * @description :: routes for AI chat and analysis operations
 */

const express = require('express');
const router = express.Router();
const aiChatController = require('../../../controller/client/v1/aiChatController');
const { PLATFORM } = require('../../../constants/authConstant');
const auth = require('../../../middleware/auth');

/**
 * @description : analyze interview response using AI
 * @param {Object} req : request for AI analysis
 * @param {Object} res : response with analysis result
 * @return {Object} : analysis result
 */
router.post('/analyze-response',
    auth(PLATFORM.CLIENT),
    aiChatController.analyzeInterviewResponse
);

/**
 * @description : generate follow-up questions
 * @param {Object} req : request for follow-up questions
 * @param {Object} res : response with generated questions
 * @return {Object} : follow-up questions
 */
router.post('/generate-followup',
    auth(PLATFORM.CLIENT),
    aiChatController.generateFollowUpQuestions
);

/**
 * @description : generate interview questions for a job
 * @param {Object} req : request for question generation
 * @param {Object} res : response with generated questions
 * @return {Object} : interview questions
 */
router.post('/generate-questions',
    auth(PLATFORM.CLIENT),
    aiChatController.generateInterviewQuestions
);

/**
 * @description : score candidate responses
 * @param {Object} req : request for response scoring
 * @param {Object} res : response with scores
 * @return {Object} : scoring results
 */
router.post('/score-responses',
    auth(PLATFORM.CLIENT),
    aiChatController.scoreResponses
);

/**
 * @description : generate comprehensive interview summary
 * @param {Object} req : request for interview summary
 * @param {Object} res : response with summary
 * @return {Object} : interview summary
 */
router.post('/generate-summary',
    auth(PLATFORM.CLIENT),
    aiChatController.generateInterviewSummary
);

/**
 * @description : chat with AI about interview or candidate
 * @param {Object} req : request for AI chat
 * @param {Object} res : response with AI chat reply
 * @return {Object} : AI chat response
 */
router.post('/chat',
    auth(PLATFORM.CLIENT),
    aiChatController.chatWithAI
);

module.exports = router;
