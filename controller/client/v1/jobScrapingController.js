const JobScrapingService = require("../../../services/jobScrapingService");

class JobScrapingController {
  constructor() {
    this.jobScrapingService = new JobScrapingService();
  }

  async scrapeJobPosting(req, res) {
    try {
      const { url } = req.body;

      // Validation
      if (!url) {
        return res.status(400).json({
          success: false,
          error: "URL is required",
        });
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: "Invalid URL format",
        });
      }

      // Check if URL is HTTP/HTTPS
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return res.status(400).json({
          success: false,
          error: "Only HTTP and HTTPS URLs are supported",
        });
      }

      // Call service
      const result = await this.jobScrapingService.scrapeJobPosting(url);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error("Controller error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      const healthStatus = {
        success: true,
        message: "Job scraping service is healthy",
        timestamp: new Date().toISOString(),
        services: {
          ollama: {
            endpoint:
              process.env.OLLAMA_ENDPOINT ||
              "https://ollama2.havenify.ai/api/generate",
            model: process.env.OLLAMA_MODEL || "llama2",
          },
          openai: {
            configured: !!process.env.OPENAI_API_KEY,
          },
        },
      };

      res.status(200).json(healthStatus);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Service unhealthy",
      });
    }
  }

  // Test endpoint to check if AI services are working
  async testAI(req, res) {
    try {
      const testPrompt =
        "Extract job info from: <h1>Software Engineer</h1><p>Remote position</p>";
      const result = await this.jobScrapingService.extractWithOllama(
        testPrompt
      );

      res.status(200).json({
        success: true,
        message: "AI service test successful",
        result,
      });
    } catch (ollamaError) {
      try {
        const result = await this.jobScrapingService.extractWithOpenAI(
          testPrompt
        );
        res.status(200).json({
          success: true,
          message: "OpenAI fallback test successful",
          result,
        });
      } catch (openaiError) {
        res.status(500).json({
          success: false,
          error: "Both AI services failed",
          details: {
            ollama: ollamaError.message,
            openai: openaiError.message,
          },
        });
      }
    }
  }
}

module.exports = JobScrapingController;
