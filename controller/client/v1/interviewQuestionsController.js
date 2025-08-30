const InterviewQuestionsAIService = require('../../../services/interviewQuestionsAiService');

class InterviewQuestionsController {
  constructor() {
    this.interviewQuestionsAIService = new InterviewQuestionsAIService();
  }

  async generateInterviewQuestions(req, res) {
    try {
      const { jobTitle, jobDescription, employmentType, requirements } = req.body;

      // Validation
      if (!jobTitle) {
        return res.status(400).json({
          success: false,
          error: 'Job title is required'
        });
      }

      if (typeof jobTitle !== 'string' || !jobTitle.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Job title must be a non-empty string'
        });
      }

      console.log('Generating interview questions for:', jobTitle);
      console.log('Context:', { jobDescription: !!jobDescription, employmentType, requirements: requirements?.length || 0 });

      const result = await this.interviewQuestionsAIService.generateInterviewQuestions(
        jobTitle,
        jobDescription,
        employmentType,
        requirements
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const healthStatus = await this.interviewQuestionsAIService.checkHealth();
      
      if (healthStatus.status === 'healthy') {
        res.status(200).json({
          success: true,
          message: 'Interview questions AI service is healthy',
          details: healthStatus
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Interview questions AI service is unhealthy',
          details: healthStatus
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        details: error.message
      });
    }
  }
}

module.exports = InterviewQuestionsController;
