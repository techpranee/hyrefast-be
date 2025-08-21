/**
 * emailRoutes.js
 * @description :: routes for email operations using SES
 */

const express = require('express');
const router = express.Router();
const emailController = require('../../../controller/client/v1/emailController');
const { PLATFORM } = require('../../../constants/authConstant');
const auth = require('../../../middleware/auth');

/**
 * @description : send OTP via email
 * @param {Object} req : request for OTP sending
 * @param {Object} res : response for OTP sending
 * @return {Object} : OTP sending result
 */
router.post('/send-otp', 
  emailController.sendOTP
);

/**
 * @description : send interview invitation to candidate
 * @param {Object} req : request for interview invitation
 * @param {Object} res : response for invitation sending
 * @return {Object} : invitation sending result
 */
router.post('/send-interview-invitation', 
  auth(PLATFORM.CLIENT),
  emailController.sendInterviewInvitation
);

/**
 * @description : send interview completion notification to recruiter
 * @param {Object} req : request for completion notification
 * @param {Object} res : response for notification sending
 * @return {Object} : notification sending result
 */
router.post('/send-completion-notification', 
  auth(PLATFORM.CLIENT),
  emailController.sendCompletionNotification
);

/**
 * @description : send password reset email
 * @param {Object} req : request for password reset
 * @param {Object} res : response for reset email sending
 * @return {Object} : reset email sending result
 */
router.post('/send-password-reset', 
  emailController.sendPasswordReset
);

/**
 * @description : send custom email
 * @param {Object} req : request for custom email
 * @param {Object} res : response for email sending
 * @return {Object} : email sending result
 */
router.post('/send-custom', 
  auth(PLATFORM.CLIENT),
  emailController.sendCustomEmail
);

/**
 * @description : test SES configuration
 * @param {Object} req : request for SES test
 * @param {Object} res : response for SES test
 * @return {Object} : SES test result
 */
router.get('/test-ses-config', 
  auth(PLATFORM.CLIENT),
  emailController.testSESConfig
);

module.exports = router;
