// Your existing AWS SES service
const { sendMail } = require("./email");

class CandidateVerificationService {
  constructor() {
    this.candidateOtpStore = new Map();
    // Cleanup expired OTPs every minute
    this.cleanupInterval = setInterval(() => this.cleanupExpiredOtps(), 60000);
  }

  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate HTML template programmatically instead of using EJS files
  getCandidateVerificationEmailTemplate({ candidateName, verificationCode, jobTitle, companyName, expiryMinutes = 10 }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Verification Code</title>
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #2563eb; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px 30px; }
          .code-box { background-color: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
          .verification-code { background-color: #2563eb; color: #ffffff; font-size: 36px; font-weight: bold; padding: 20px 30px; border-radius: 8px; letter-spacing: 8px; margin: 0 auto; display: inline-block; }
          .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 25px 0; border-radius: 4px; }
          .footer { background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Interview Verification</h1>
            ${companyName ? `<p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">${companyName}</p>` : ''}
          </div>
          
          <div class="content">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px; line-height: 1.6;">
              Hi <strong>${candidateName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #555; margin-bottom: 25px; line-height: 1.6;">
              Thank you for your interest in the <strong style="color: #2563eb;">${jobTitle}</strong> position. 
              To continue with your interview process, please verify your email address.
            </p>
            
            <div class="code-box">
              <p style="font-size: 16px; color: #64748b; margin-bottom: 15px;">
                Your verification code is:
              </p>
              <div class="verification-code">
                ${verificationCode}
              </div>
              <p style="font-size: 14px; color: #64748b; margin-top: 15px;">
                ⏰ This code expires in <strong>${expiryMinutes} minutes</strong>
              </p>
            </div>
            
            <div class="warning-box">
              <p style="font-size: 14px; color: #92400e; margin: 0; line-height: 1.5;">
                <strong>Important:</strong> Please enter this code on the verification page to proceed with your interview. 
                Do not share this code with anyone.
              </p>
            </div>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-top: 30px;">
              We're excited to learn more about you and discuss this opportunity!
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              Best regards,<br>
              <strong>The Interview Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
              If you didn't request this verification code, please ignore this email.<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendCandidateVerificationEmail({
    email,
    candidateName,
    jobTitle,
    companyName = '',
    applicationId,
    interviewLinkId
  }) {
    try {
      const verificationCode = this.generateVerificationCode();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      const verificationKey = `${applicationId}_${email}`;

      console.log("Verification Code Testing :", verificationCode);

      // Store OTP with candidate context
      this.candidateOtpStore.set(verificationKey, {
        code: verificationCode,
        expiresAt,
        email,
        candidateName,
        applicationId,
        interviewLinkId,
        attempts: 0,
        maxAttempts: 5,
        createdAt: Date.now()
      });

      // Generate HTML content programmatically
      const htmlContent = this.getCandidateVerificationEmailTemplate({
        candidateName,
        verificationCode,
        jobTitle,
        companyName,
        expiryMinutes: 10
      });

      // Use your existing sendMail function with AWS SES
      const emailResult = await sendMail({
        to: email,
        subject: `Interview Verification Code - ${jobTitle}`,
        from: 'hyrefast@techpranee.com',
        html: htmlContent // Pass HTML directly instead of using template
      });

      console.log(`Candidate verification email sent to ${email} for application ${applicationId}. Message ID: ${emailResult.messageId}`);

      return {
        success: true,
        message: 'Verification code sent successfully',
        expiresAt: new Date(expiresAt),
        applicationId,
        messageId: emailResult.messageId
      };

    } catch (error) {
      console.error('Error sending candidate verification email:', error);
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  // Verify candidate's OTP
  async verifyCandidateEmail({ email, verificationCode, applicationId }) {
    try {
      const verificationKey = `${applicationId}_${email}`;
      const storedData = this.candidateOtpStore.get(verificationKey);

      if (!storedData) {
        return {
          success: false,
          message: 'Verification code not found. Please request a new one.',
          code: 'NOT_FOUND'
        };
      }

      // Check if expired
      if (Date.now() > storedData.expiresAt) {
        this.candidateOtpStore.delete(verificationKey);
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.',
          code: 'EXPIRED'
        };
      }

      // Check max attempts
      if (storedData.attempts >= storedData.maxAttempts) {
        this.candidateOtpStore.delete(verificationKey);
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new code.',
          code: 'MAX_ATTEMPTS_EXCEEDED'
        };
      }

      // Verify the code
      if (storedData.code === verificationCode.toString()) {
        // Successful verification - remove from store
        this.candidateOtpStore.delete(verificationKey);
        
        return {
          success: true,
          message: 'Email verified successfully',
          candidateData: {
            email: storedData.email,
            candidateName: storedData.candidateName,
            applicationId: storedData.applicationId,
            interviewLinkId: storedData.interviewLinkId
          }
        };
      } else {
        // Increment failed attempts
        storedData.attempts += 1;
        this.candidateOtpStore.set(verificationKey, storedData);
        
        const remainingAttempts = storedData.maxAttempts - storedData.attempts;
        
        return {
          success: false,
          message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
          code: 'INVALID_CODE',
          remainingAttempts
        };
      }

    } catch (error) {
      console.error('Error verifying candidate email:', error);
      throw new Error('Failed to verify candidate email');
    }
  }

  // Resend verification code to candidate
  async resendCandidateVerificationCode({
    email,
    candidateName,
    jobTitle,
    companyName,
    applicationId,
    interviewLinkId
  }) {
    try {
      const verificationKey = `${applicationId}_${email}`;
      const existingData = this.candidateOtpStore.get(verificationKey);

      // Rate limiting: allow resend only after 1 minute
      if (existingData && (Date.now() - existingData.createdAt) < 60000) {
        return {
          success: false,
          message: 'Please wait 60 seconds before requesting a new verification code.',
          code: 'RATE_LIMITED'
        };
      }

      // Clear existing verification and send new one
      this.candidateOtpStore.delete(verificationKey);
      
      return await this.sendCandidateVerificationEmail({
        email,
        candidateName,
        jobTitle,
        companyName,
        applicationId,
        interviewLinkId
      });

    } catch (error) {
      console.error('Error resending candidate verification code:', error);
      throw new Error('Failed to resend verification code to candidate');
    }
  }

  // Get candidate verification status
  getCandidateVerificationStatus(email, applicationId) {
    const verificationKey = `${applicationId}_${email}`;
    const storedData = this.candidateOtpStore.get(verificationKey);

    if (!storedData) {
      return { status: 'not_found' };
    }

    if (Date.now() > storedData.expiresAt) {
      this.candidateOtpStore.delete(verificationKey);
      return { status: 'expired' };
    }

    return {
      status: 'pending',
      expiresAt: new Date(storedData.expiresAt),
      attempts: storedData.attempts,
      maxAttempts: storedData.maxAttempts
    };
  }

  // Clean up expired verification codes - This method was missing!
  cleanupExpiredOtps() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, data] of this.candidateOtpStore.entries()) {
      if (data.expiresAt < now) {
        this.candidateOtpStore.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired candidate verification codes`);
    }
  }

  // Get verification statistics
  getVerificationStats() {
    const total = this.candidateOtpStore.size;
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const [key, data] of this.candidateOtpStore.entries()) {
      if (data.expiresAt > now) {
        active++;
      } else {
        expired++;
      }
    }

    return { total, active, expired };
  }

  // Stop cleanup interval (for graceful shutdown)
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Candidate verification service cleanup interval stopped');
    }
  }

  // Test email configuration
  async testEmailConfiguration() {
    try {
      const testResult = await sendMail({
        to: process.env.SMTP_USER || 'test@example.com', // Send to yourself for testing
        subject: 'Candidate Verification Service Test',
        html: `
          <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h2>🎯 Test Email</h2>
            <p>If you receive this email, your candidate verification service is working correctly!</p>
            <p>Test sent at: ${new Date().toLocaleString()}</p>
          </div>
        `,
        from: 'hyrefast@techpranee.com'
      });
      
      console.log('✅ Test email sent successfully:', testResult.messageId);
      return { success: true, messageId: testResult.messageId };
    } catch (error) {
      console.error('❌ Test email failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all pending verifications (for debugging)
  getPendingVerifications() {
    const pending = [];
    const now = Date.now();

    for (const [key, data] of this.candidateOtpStore.entries()) {
      if (data.expiresAt > now) {
        pending.push({
          key,
          email: data.email,
          candidateName: data.candidateName,
          applicationId: data.applicationId,
          attempts: data.attempts,
          expiresAt: new Date(data.expiresAt),
          timeRemaining: Math.round((data.expiresAt - now) / 1000) + 's'
        });
      }
    }

    return pending;
  }

  // Force cleanup all verifications (for testing/admin purposes)
  clearAllVerifications() {
    const count = this.candidateOtpStore.size;
    this.candidateOtpStore.clear();
    console.log(`Cleared ${count} verification codes`);
    return { cleared: count };
  }
}

module.exports = new CandidateVerificationService();
