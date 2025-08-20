const SESService = require('../../../services/sesService');
const authService = require('../../../services/auth');
const { validationResult } = require('express-validator');

const sesService = new SESService();

/**
 * Send OTP via email
 */
const sendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.badRequest({ message: 'Email is required' });
    }

    // Generate OTP and send via email
    const otp = sesService.generateOTP(6);
    const result = await sesService.sendOTPEmail(email, otp);

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'OTP sent successfully to your email',
      data: {
        email,
        messageId: result.messageId
      }
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Send interview invitation
 */
const sendInterviewInvitation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    const {
      candidateEmail,
      candidateName,
      jobTitle,
      companyName,
      interviewLink,
      interviewDate,
      interviewTime,
      recruiterName,
      recruiterEmail,
      instructions
    } = req.body;
    
    if (!candidateEmail || !candidateName || !jobTitle || !interviewLink) {
      return res.badRequest({ 
        message: 'Candidate email, name, job title, and interview link are required' 
      });
    }

    const result = await sesService.sendInterviewInvitation(candidateEmail, {
      candidateName,
      jobTitle,
      companyName,
      interviewLink,
      interviewDate,
      interviewTime,
      recruiterName: recruiterName || req.user?.firstName || 'Interviewer',
      recruiterEmail: recruiterEmail || req.user?.email || 'hr@company.com',
      instructions
    });

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'Interview invitation sent successfully',
      data: {
        candidateEmail,
        messageId: result.messageId
      }
    });
  } catch (error) {
    console.error('Send interview invitation error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Send interview completion notification
 */
const sendCompletionNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    const {
      recruiterEmail,
      candidateName,
      jobTitle,
      companyName,
      interviewDate,
      dashboardLink,
      sessionId
    } = req.body;
    
    if (!recruiterEmail || !candidateName || !jobTitle || !sessionId) {
      return res.badRequest({ 
        message: 'Recruiter email, candidate name, job title, and session ID are required' 
      });
    }

    const result = await sesService.sendInterviewCompletionNotification(recruiterEmail, {
      candidateName,
      jobTitle,
      companyName,
      interviewDate,
      dashboardLink,
      sessionId
    });

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'Completion notification sent successfully',
      data: {
        recruiterEmail,
        messageId: result.messageId
      }
    });
  } catch (error) {
    console.error('Send completion notification error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Send password reset email
 */
const sendPasswordReset = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.badRequest({ message: 'Email is required' });
    }

    // Generate reset token (in a real app, this would be stored in DB)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    
    const result = await sesService.sendPasswordResetEmail(email, resetToken);

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'Password reset email sent successfully',
      data: {
        email,
        messageId: result.messageId,
        resetToken // In production, don't return this
      }
    });
  } catch (error) {
    console.error('Send password reset error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Test SES configuration
 */
const testSESConfig = async (req, res) => {
  try {
    const result = await sesService.testConfiguration();

    if (!result.success) {
      return res.internalServerError({ 
        message: 'SES configuration test failed',
        error: result.error 
      });
    }

    return res.success({
      message: 'SES configuration is working correctly',
      data: result
    });
  } catch (error) {
    console.error('SES config test error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Send custom email
 */
const sendCustomEmail = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    const { to, subject, html, text, cc, bcc } = req.body;
    
    if (!to || !subject || (!html && !text)) {
      return res.badRequest({ 
        message: 'Recipient, subject, and content (html or text) are required' 
      });
    }

    const result = await sesService.sendEmail({
      to,
      subject,
      html,
      text,
      cc,
      bcc
    });

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'Email sent successfully',
      data: {
        messageId: result.messageId,
        recipients: Array.isArray(to) ? to : [to]
      }
    });
  } catch (error) {
    console.error('Send custom email error:', error);
    return res.internalServerError({ message: error.message });
  }
};

module.exports = {
  sendOTP,
  sendInterviewInvitation,
  sendCompletionNotification,
  sendPasswordReset,
  testSESConfig,
  sendCustomEmail
};
