const express = require('express');
const router = express.Router();
const candidateVerificationController = require('../../../controller/client/v1/candidateVerificationController');

// Send verification email to candidate
router.post('/send-candidate-verification', candidateVerificationController.sendCandidateVerificationEmail);

// Verify candidate's email with OTP
router.post('/verify-candidate-email', candidateVerificationController.verifyCandidateEmail);

// Resend verification code to candidate
router.post('/resend-candidate-verification', candidateVerificationController.resendCandidateVerificationCode);

// Get candidate verification status
router.get('/candidate-verification-status', candidateVerificationController.getCandidateVerificationStatus);

// Admin: Get verification statistics
router.get('/verification-stats', candidateVerificationController.getVerificationStats);


// Send private interview link with verification
router.post('/send-private-interview-link', candidateVerificationController.sendPrivateInterviewLink);

// Validate private interview token
router.post('/validate-private-token', candidateVerificationController.validatePrivateToken);

// Use/mark private token as accessed
router.post('/use-private-token', candidateVerificationController.usePrivateToken);

// Send private link to candidate (recruiter initiated)
router.post('/send-private-link-to-candidate', candidateVerificationController.sendPrivateLinkToCandidate);

// Get service statistics
router.get('/stats', candidateVerificationController.getStats);

module.exports = router;
