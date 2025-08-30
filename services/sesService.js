const AWS = require('aws-sdk');
const ejs = require('ejs');
const path = require('path');

class SESService {
    constructor() {
        // Configure AWS SES
        this.ses = new AWS.SES({
            accessKeyId: process.env.AWS_SES_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SES_SECRET_KEY,
            region: process.env.AWS_SES_REGION || 'ap-south-1'
        });

        this.fromEmail = process.env.SES_FROM_EMAIL || 'Interview Portal <hyrefast@techpranee.com>';
    }

    /**
     * Send raw email using SES
     */
    async sendEmail(params) {
        try {
            const emailParams = {
                Source: params.from || this.fromEmail,
                Destination: {
                    ToAddresses: Array.isArray(params.to) ? params.to : [params.to],
                    CcAddresses: params.cc || [],
                    BccAddresses: params.bcc || []
                },
                Message: {
                    Subject: {
                        Data: params.subject,
                        Charset: 'UTF-8'
                    },
                    Body: {
                        Html: {
                            Data: params.html || '',
                            Charset: 'UTF-8'
                        },
                        Text: {
                            Data: params.text || '',
                            Charset: 'UTF-8'
                        }
                    }
                }
            };

            const result = await this.ses.sendEmail(emailParams).promise();

            return {
                success: true,
                messageId: result.MessageId,
                data: result
            };
        } catch (error) {
            console.error('SES Send Email Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send OTP verification email
     */
    async sendOTPEmail(email, otp, userName = '') {
        try {
            const subject = 'Interview Portal - Verification Code';
            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Verification Code</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .otp-code { background: #1f2937; color: white; font-size: 24px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0; letter-spacing: 3px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verification Code</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'User'},</h2>
              <p>Your verification code for Interview Portal is:</p>
              <div class="otp-code">${otp}</div>
              <p>This code will expire in <strong>10 minutes</strong>.</p>
              <div class="warning">
                <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
              </div>
              <p>If you didn't request this code, please ignore this email or contact our support team.</p>
            </div>
            <div class="footer">
              <p>Interview Portal | Secure Hiring Solutions</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

            const text = `
        Interview Portal - Verification Code
        
        Hello ${userName || 'User'},
        
        Your verification code is: ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Interview Portal
        Secure Hiring Solutions
      `;

            return await this.sendEmail({
                to: email,
                subject,
                html,
                text
            });
        } catch (error) {
            console.error('Send OTP Email Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send interview invitation email to candidate
     */
    async sendInterviewInvitation(candidateEmail, interviewData) {
        try {
            const {
                candidateName,
                jobTitle,
                companyName,
                interviewLink,
                interviewDate,
                interviewTime,
                recruiterName,
                recruiterEmail,
                instructions
            } = interviewData;

            const subject = `Interview Invitation - ${jobTitle} at ${companyName}`;
            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Interview Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .interview-details { background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; margin-bottom: 10px; }
            .detail-label { font-weight: bold; min-width: 120px; color: #374151; }
            .detail-value { color: #1f2937; }
            .interview-link { background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
            .interview-link:hover { background: #047857; }
            .instructions { background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .important { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Interview Invitation</h1>
            </div>
            <div class="content">
              <h2>Dear ${candidateName},</h2>
              <p>Congratulations! You have been selected for an interview for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
              
              <div class="interview-details">
                <h3>📅 Interview Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Position:</span>
                  <span class="detail-value">${jobTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Company:</span>
                  <span class="detail-value">${companyName}</span>
                </div>
                ${interviewDate ? `
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${interviewDate}</span>
                </div>
                ` : ''}
                ${interviewTime ? `
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${interviewTime}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">Interviewer:</span>
                  <span class="detail-value">${recruiterName} (${recruiterEmail})</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${interviewLink}" class="interview-link">🚀 Start Interview</a>
              </div>

              ${instructions ? `
              <div class="instructions">
                <h3>📋 Instructions</h3>
                <p>${instructions}</p>
              </div>
              ` : ''}

              <div class="important">
                <strong>Important:</strong>
                <ul>
                  <li>Ensure you have a stable internet connection</li>
                  <li>Test your camera and microphone beforehand</li>
                  <li>Join from a quiet, well-lit environment</li>
                  <li>Have your resume and relevant documents ready</li>
                </ul>
              </div>

              <p>If you have any questions or need to reschedule, please contact the interviewer directly.</p>
              <p>We look forward to speaking with you!</p>
              
              <p>Best regards,<br>
              <strong>${recruiterName}</strong><br>
              ${companyName}<br>
              ${recruiterEmail}</p>
            </div>
            <div class="footer">
              <p>Interview Portal | Streamlined Hiring Process</p>
              <p>This is an automated email. Please reply to the interviewer's email for any queries.</p>
            </div>
          </div>
        </body>
        </html>
      `;

            const text = `
        Interview Invitation - ${jobTitle} at ${companyName}
        
        Dear ${candidateName},
        
        Congratulations! You have been selected for an interview for the ${jobTitle} position at ${companyName}.
        
        Interview Details:
        - Position: ${jobTitle}
        - Company: ${companyName}
        ${interviewDate ? `- Date: ${interviewDate}` : ''}
        ${interviewTime ? `- Time: ${interviewTime}` : ''}
        - Interviewer: ${recruiterName} (${recruiterEmail})
        
        Interview Link: ${interviewLink}
        
        ${instructions ? `Instructions: ${instructions}` : ''}
        
        Important:
        - Ensure you have a stable internet connection
        - Test your camera and microphone beforehand
        - Join from a quiet, well-lit environment
        - Have your resume and relevant documents ready
        
        If you have any questions, please contact ${recruiterEmail}
        
        Best regards,
        ${recruiterName}
        ${companyName}
        
        Interview Portal
        Streamlined Hiring Process
      `;

            return await this.sendEmail({
                to: candidateEmail,
                subject,
                html,
                text
            });
        } catch (error) {
            console.error('Send Interview Invitation Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, resetCode, userName = '') {
        try {
            const subject = 'Interview Portal - Password Reset';
            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .reset-code { background: #1f2937; color: white; font-size: 20px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0; letter-spacing: 2px; word-break: break-all; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; color: #92400e; }
            .security-tips { background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0; color: #1e40af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'User'},</h2>
              <p>We received a request to reset your password for your Interview Portal account.</p>
              
              <p>Your password reset code is:</p>
              <div class="reset-code">${resetCode}</div>
              
              <p>This code will expire in <strong>30 minutes</strong>.</p>
              
              <div class="warning">
                <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account is safe and no changes have been made.
              </div>
              
              <div class="security-tips">
                <strong>Security Tips:</strong>
                <ul>
                  <li>Never share your reset code with anyone</li>
                  <li>Use a strong, unique password</li>
                  <li>Consider enabling two-factor authentication</li>
                  <li>Contact support if you suspect unauthorized access</li>
                </ul>
              </div>
              
              <p>If you have any questions or need assistance, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>Interview Portal | Secure Hiring Solutions</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

            const text = `
        Interview Portal - Password Reset Request
        
        Hello ${userName || 'User'},
        
        We received a request to reset your password for your Interview Portal account.
        
        Your password reset code is: ${resetCode}
        
        This code will expire in 30 minutes.
        
        Security Notice: If you didn't request this password reset, please ignore this email. Your account is safe and no changes have been made.
        
        Security Tips:
        - Never share your reset code with anyone
        - Use a strong, unique password
        - Consider enabling two-factor authentication
        - Contact support if you suspect unauthorized access
        
        If you have any questions or need assistance, please contact our support team.
        
        Interview Portal
        Secure Hiring Solutions
      `;

            return await this.sendEmail({
                to: email,
                subject,
                html,
                text
            });
        } catch (error) {
            console.error('Send Password Reset Email Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send interview completion notification
     */
    async sendInterviewCompletionNotification(recruiterEmail, interviewData) {
        try {
            const {
                candidateName,
                jobTitle,
                companyName,
                interviewDate,
                dashboardLink,
                sessionId
            } = interviewData;

            const subject = `Interview Completed - ${candidateName} for ${jobTitle}`;
            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Interview Completed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .interview-summary { background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .dashboard-link { background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
            .dashboard-link:hover { background: #6d28d9; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Interview Completed</h1>
            </div>
            <div class="content">
              <h2>Interview Summary</h2>
              <p>The interview session has been completed successfully.</p>
              
              <div class="interview-summary">
                <h3>📊 Session Details</h3>
                <p><strong>Candidate:</strong> ${candidateName}</p>
                <p><strong>Position:</strong> ${jobTitle}</p>
                <p><strong>Company:</strong> ${companyName}</p>
                <p><strong>Session ID:</strong> ${sessionId}</p>
                ${interviewDate ? `<p><strong>Date:</strong> ${interviewDate}</p>` : ''}
              </div>

              <div style="text-align: center;">
                <a href="${dashboardLink}" class="dashboard-link">📈 View Results</a>
              </div>

              <p>You can now review the candidate's responses, AI analysis, and interview metrics in your dashboard.</p>
            </div>
            <div class="footer">
              <p>Interview Portal | AI-Powered Hiring Insights</p>
            </div>
          </div>
        </body>
        </html>
      `;

            return await this.sendEmail({
                to: recruiterEmail,
                subject,
                html
            });
        } catch (error) {
            console.error('Send Interview Completion Notification Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, resetToken, userName = '') {
        try {
            const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/reset-password/${resetToken}`;
            const subject = 'Interview Portal - Password Reset Request';

            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .reset-link { background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
            .reset-link:hover { background: #b91c1c; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'User'},</h2>
              <p>We received a request to reset your password for your Interview Portal account.</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="reset-link">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>Security Notice:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #6b7280;">${resetLink}</p>
            </div>
            <div class="footer">
              <p>Interview Portal | Secure Hiring Solutions</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

            return await this.sendEmail({
                to: email,
                subject,
                html
            });
        } catch (error) {
            console.error('Send Password Reset Email Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate OTP code
     */
    generateOTP(length = 6) {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }
        return otp;
    }

    /**
     * Test SES configuration
     */
    async testConfiguration() {
        try {
            const result = await this.ses.getAccountSendingEnabled().promise();
            return {
                success: true,
                sendingEnabled: result.Enabled,
                data: result
            };
        } catch (error) {
            console.error('SES Configuration Test Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = SESService;
