// routes/jobDescriptionRoutes.js
const express = require('express');
const JobDescriptionController = require('../../../controller/client/v1/jobDescriptionController');

const router = express.Router();
const jobDescriptionController = new JobDescriptionController();

// POST /api/job-description/generate
router.post('/generate', async (req, res) => {
  await jobDescriptionController.generateJobDescription(req, res);
});

module.exports = router;