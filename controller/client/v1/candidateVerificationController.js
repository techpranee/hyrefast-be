const candidateVerificationService = require('../../../services/candidateVerficationService');
const dbService = require('../../../utils/dbService');
const Application = require('../../../model/application');
// const Job = require('../models/job');

class CandidateVerificationController {

  // Send verification email to candidate
  async sendCandidateVerificationEmail(req, res) {
    try {
      const { applicationId, email, candidateName, jobTitle, companyName, interviewLinkId } = req.body;

      // Validate required fields
      if (!applicationId || !email || !candidateName || !jobTitle) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: applicationId, email, candidateName, jobTitle'
        });
      }

      // Verify application exists and is valid
      const application = await dbService.findOne(Application, { 
        _id: applicationId,
        'candidate_info.email': email 
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found or email mismatch'
        });
      }

      // Send verification email
      const result = await candidateVerificationService.sendCandidateVerificationEmail({
        email,
        candidateName,
        jobTitle,
        companyName,
        applicationId,
        interviewLinkId
      });

      res.json({
        success: true,
        message: 'Verification email sent to candidate successfully',
        data: {
          applicationId: result.applicationId,
          expiresAt: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Error sending candidate verification email:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send verification email to candidate'
      });
    }
  }

  // Verify candidate's email with OTP
  async verifyCandidateEmail(req, res) {
    try {
      const { applicationId, email, verificationCode } = req.body;

      // Validate required fields
      if (!applicationId || !email || !verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: applicationId, email, verificationCode'
        });
      }

      // Verify the candidate's email
      const result = await candidateVerificationService.verifyCandidateEmail({
        email,
        verificationCode,
        applicationId
      });

      if (result.success) {
        // Update application status to verified
        await dbService.updateOne(Application, 
          { _id: applicationId },
          { 
            email_verified: true,
            email_verified_at: new Date(),
            status: 'email_verified'
          }
        );

        res.json({
          success: true,
          message: 'Candidate email verified successfully',
          data: {
            verified: true,
            candidateData: result.candidateData
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          code: result.code,
          remainingAttempts: result.remainingAttempts
        });
      }

    } catch (error) {
      console.error('Error verifying candidate email:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify candidate email'
      });
    }
  }

  // Resend verification code to candidate
  async resendCandidateVerificationCode(req, res) {
    try {
      const { applicationId, email, candidateName, jobTitle, companyName, interviewLinkId } = req.body;

      // Validate required fields
      if (!applicationId || !email || !candidateName || !jobTitle) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Resend verification code
      const result = await candidateVerificationService.resendCandidateVerificationCode({
        email,
        candidateName,
        jobTitle,
        companyName,
        applicationId,
        interviewLinkId
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'New verification code sent to candidate successfully',
          data: {
            expiresAt: result.expiresAt
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          code: result.code
        });
      }

    } catch (error) {
      console.error('Error resending candidate verification code:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to resend verification code to candidate'
      });
    }
  }

  // Get candidate verification status
  async getCandidateVerificationStatus(req, res) {
    try {
      const { applicationId, email } = req.query;

      if (!applicationId || !email) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: applicationId, email'
        });
      }

      const status = candidateVerificationService.getCandidateVerificationStatus(email, applicationId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Error getting candidate verification status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification status'
      });
    }
  }

  // Admin endpoint: Get verification statistics
  async getVerificationStats(req, res) {
    try {
      const stats = candidateVerificationService.getVerificationStats();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting verification stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification statistics'
      });
    }
  }

   async sendPrivateInterviewLink(req, res) {
    try {
      const {
        applicationId,
        candidateId,
        email,
        candidateName,
        jobTitle,
        companyName,
        jobId,
        publicLinkId
      } = req.body;

      // Validate required fields
      if (!applicationId || !candidateId || !email || !candidateName || !jobId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Send the private interview link
      const result = await candidateVerificationService.sendPrivateInterviewLink({
        applicationId,
        candidateId,
        email,
        candidateName,
        jobTitle,
        companyName,
        jobId,
        publicLinkId
      });

      return res.json({
        success: true,
        message: 'Private interview link sent successfully',
        data: result.data
      });

    } catch (error) {
      console.error('Error sending private interview link:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send private interview link',
        error: error.message
      });
    }
  }

  // Validate private interview token
  async validatePrivateToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      const result = await candidateVerificationService.validatePrivateInterviewToken(token);
      
      if (result.success) {
        return res.json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
          code: result.code
        });
      }

    } catch (error) {
      console.error('Error validating private token:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate private token',
        error: error.message
      });
    }
  }

  // Use private interview token
  async usePrivateToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      const result = await candidateVerificationService.usePrivateInterviewToken(token);
      
      if (result.success) {
        return res.json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Error using private token:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to use private token',
        error: error.message
      });
    }
  }

  // Send private link to candidate (recruiter initiated)
  async sendPrivateLinkToCandidate(req, res) {
    try {
      const { applicationId, recruiterMessage } = req.body;

      if (!applicationId) {
        return res.status(400).json({
          success: false,
          message: 'Application ID is required'
        });
      }

      // Get application details
      const application = await Application.findById(applicationId)
        .populate('candidate')
        .populate('job');

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const result = await candidateVerificationService.sendPrivateLinkToCandidate({
        applicationId: application._id,
        candidateEmail: application.candidate.email,
        candidateName: application.candidate.full_name || application.candidate.name,
        jobTitle: application.job.title,
        companyName: application.job.workspace?.name || '',
        recruiterMessage: recruiterMessage || ''
      });

      return res.json({
        success: true,
        message: 'Private interview link sent to candidate',
        data: result.data
      });

    } catch (error) {
      console.error('Error sending private link to candidate:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send private interview link',
        error: error.message
      });
    }
  }

  // Get verification and token statistics
  async getStats(req, res) {
    try {
      const stats = candidateVerificationService.getVerificationStats();
      
      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message
      });
    }
  }

}

module.exports = new CandidateVerificationController();
