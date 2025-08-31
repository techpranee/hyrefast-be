// controllers/jobDescriptionController.js
const JobDescriptionAIService = require('../../../services/jobDescriptionAiService');

class JobDescriptionController {
  constructor() {
    this.jobDescriptionAIService = new JobDescriptionAIService();
  }

  async generateJobDescription(req, res) {
    try {
      const { jobTitle, context } = req.body;

      if (!jobTitle) {
        return res.status(400).json({
          success: false,
          error: 'Job title is required'
        });
      }

      const result = await this.jobDescriptionAIService.generateJobDescription(jobTitle, context);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = JobDescriptionController;


