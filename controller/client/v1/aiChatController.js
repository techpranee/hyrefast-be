const AiChatService = require('../../../services/aiChatService');
const { validationResult } = require('express-validator');

const aiChatService = new AiChatService();

/**
 * Process AI analysis for interview responses
 */
const analyzeInterviewResponse = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const {
            response,
            question,
            jobTitle,
            skillsRequired,
            sessionId,
            questionId,
            analysisType = 'comprehensive'
        } = req.body;

        if (!response || !question) {
            return res.badRequest({ message: 'Response and question are required' });
        }

        const analysisContext = {
            jobTitle,
            skillsRequired,
            sessionId,
            questionId,
            analysisType
        };

        const result = await aiChatService.analyzeResponse(
            response,
            question,
            analysisContext
        );

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Interview response analyzed successfully',
            data: result
        });
    } catch (error) {
        console.error('AI analysis error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Generate follow-up questions
 */
const generateFollowUpQuestions = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const {
            originalQuestion,
            candidateResponse,
            jobTitle,
            skillLevel,
            count = 3
        } = req.body;

        if (!originalQuestion || !candidateResponse) {
            return res.badRequest({
                message: 'Original question and candidate response are required'
            });
        }

        const result = await aiChatService.generateFollowUpQuestions(
            originalQuestion,
            candidateResponse,
            {
                jobTitle,
                skillLevel,
                count
            }
        );

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Follow-up questions generated successfully',
            data: result
        });
    } catch (error) {
        console.error('Follow-up generation error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Generate interview questions for a job
 */
const generateInterviewQuestions = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const {
            jobTitle,
            jobDescription,
            skillsRequired,
            experienceLevel,
            questionCount = 10,
            questionTypes = ['technical', 'behavioral']
        } = req.body;

        if (!jobTitle) {
            return res.badRequest({ message: 'Job title is required' });
        }

        const result = await aiChatService.generateInterviewQuestions({
            jobTitle,
            jobDescription,
            skillsRequired,
            experienceLevel,
            questionCount,
            questionTypes
        });

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Interview questions generated successfully',
            data: result
        });
    } catch (error) {
        console.error('Question generation error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Score candidate responses
 */
const scoreResponses = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const {
            responses,
            jobCriteria,
            sessionId
        } = req.body;

        if (!responses || !Array.isArray(responses) || responses.length === 0) {
            return res.badRequest({ message: 'Responses array is required' });
        }

        const result = await aiChatService.scoreResponses(
            responses,
            jobCriteria || {},
            { sessionId }
        );

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Responses scored successfully',
            data: result
        });
    } catch (error) {
        console.error('Scoring error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Generate comprehensive interview summary
 */
const generateInterviewSummary = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const {
            sessionId,
            responses,
            jobDetails,
            includeRecommendations = true
        } = req.body;

        if (!sessionId && (!responses || !Array.isArray(responses))) {
            return res.badRequest({
                message: 'Either sessionId or responses array is required'
            });
        }

        const result = await aiChatService.generateInterviewSummary({
            sessionId,
            responses,
            jobDetails,
            includeRecommendations
        });

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Interview summary generated successfully',
            data: result
        });
    } catch (error) {
        console.error('Summary generation error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Chat with AI about interview or candidate
 */
const chatWithAI = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const {
            message,
            context,
            sessionId,
            conversationHistory = []
        } = req.body;

        if (!message) {
            return res.badRequest({ message: 'Message is required' });
        }

        const result = await aiChatService.chatWithContext(
            message,
            context || {},
            {
                sessionId,
                conversationHistory
            }
        );

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'AI chat response generated',
            data: result
        });
    } catch (error) {
        console.error('AI chat error:', error);
        return res.internalServerError({ message: error.message });
    }
};

module.exports = {
    analyzeInterviewResponse,
    generateFollowUpQuestions,
    generateInterviewQuestions,
    scoreResponses,
    generateInterviewSummary,
    chatWithAI
};
