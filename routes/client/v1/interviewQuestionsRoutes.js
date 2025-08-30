const express = require('express');
const InterviewQuestionsController = require('../../../controller/client/v1/interviewQuestionsController');

const router = express.Router();
const interviewQuestionsController = new InterviewQuestionsController();

// POST /api/interview-questions/generate
router.post('/generate', async (req, res) => {
  await interviewQuestionsController.generateInterviewQuestions(req, res);
});

// GET /api/interview-questions/health
router.get('/health', async (req, res) => {
  await interviewQuestionsController.healthCheck(req, res);
});

module.exports = router;
