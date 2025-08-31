const express = require('express');
const JobScrapingController = require('../../../controller/client/v1/jobScrapingController');

const router = express.Router();
const jobScrapingController = new JobScrapingController();

// POST /api/job-scraping/scrape
router.post('/scrape', async (req, res) => {
  await jobScrapingController.scrapeJobPosting(req, res);
});

// GET /api/job-scraping/health
router.get('/health', async (req, res) => {
  await jobScrapingController.healthCheck(req, res);
});

// GET /api/job-scraping/test-ai
router.get('/test-ai', async (req, res) => {
  await jobScrapingController.testAI(req, res);
});

module.exports = router;
