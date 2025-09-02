/**
 * applicationController.js
 * @description : exports action methods for application.
 */

const Application = require('../../../model/application');
const Response = require('../../../model/response');
const applicationSchemaKey = require('../../../utils/validation/applicationValidation');
const validation = require('../../../utils/validateRequest');
const dbService = require('../../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const utils = require('../../../utils/common');
const crypto = require('crypto');
const axios = require('axios')
// Use your existing AWS SES email service instead of nodemailer
const { sendMail } = require('../../../services/email');

/**
 * @description : create document of Application in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created Application. {status, message, data}
 */ 
const addApplication = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      applicationSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    dataToCreate.addedBy = req.user?.id;
    dataToCreate = new Application(dataToCreate);
    let createdApplication = await dbService.create(Application,dataToCreate);
    return res.success({ data : createdApplication });
  } catch (error) {
    return res.internalServerError({ message:error.message }); 
  }
};

/**
 * @description : create application with private interview link and send email
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document with email status
 * @return {Object} : created Application with email sent status. {status, message, data}
 */
const createApplicationWithPrivateLink = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    
    console.log('📝 Creating application with private link:', {
      candidate: dataToCreate.candidate,
      job: dataToCreate.job,
      candidateEmail: dataToCreate.candidateEmail,
      candidateName: dataToCreate.candidateName
    });

    // Validate required fields
    const requiredFields = ['candidate', 'job', 'candidateEmail', 'candidateName'];
    for (const field of requiredFields) {
      if (!dataToCreate[field]) {
        return res.validationError({ 
          message: `Missing required field: ${field}` 
        });
      }
    }

    // Check for duplicate application with same candidate and job
    const existingApp = await Application.findOne({
      candidate: dataToCreate.candidate,
      job: dataToCreate.job,
      isDeleted: false
    });

    if (existingApp) {
      // Check if private link already sent but not used
      if (existingApp.privateInterviewLink?.sent && !existingApp.privateInterviewLink?.used) {
        return res.success({
          message: "Private interview link already sent for this application",
          application: existingApp,
          linkAlreadySent: true
        });
      }
      
      if (existingApp.privateInterviewLink?.used) {
        return res.badRequest({
          message: "Application already exists and interview has been completed"
        });
      }
    }

    // Generate private token and expiration
    const privateToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Add private interview link data
    dataToCreate.privateInterviewLink = {
      token: privateToken,
      expiresAt: expiresAt,
      sent: false,
      accessed: false,
      used: false
    };

    // Create application
    const createdApplication = await Application.create(dataToCreate);

    try {
      // Send private interview link email using your AWS SES service
      const emailResult = await sendPrivateInterviewLinkEmail({
        applicationId: createdApplication._id,
        candidateId: dataToCreate.candidate,
        email: dataToCreate.candidateEmail,
        candidateName: dataToCreate.candidateName,
        jobTitle: dataToCreate.jobTitle || 'Position',
        companyName: dataToCreate.companyName || 'Company',
        jobId: dataToCreate.job,
        publicLinkId: dataToCreate.interview_link_id,
        privateToken: privateToken
      });

      if (emailResult.success) {
        // Update application status and mark email as sent
        createdApplication.status = 'interview_link_sent';
        createdApplication.privateInterviewLink.sent = true;
        createdApplication.privateInterviewLink.sentAt = new Date();
        await createdApplication.save();

        return res.success({
          message: "Application created and private interview link sent successfully",
          application: createdApplication,
          emailSent: true
        });
      } else {
        throw new Error(emailResult.message || 'Failed to send email');
      }

    } catch (emailError) {
      console.error('❌ Error sending private interview link:', emailError);
      
      // Application was created but email failed
      return res.success({
        message: "Application created but failed to send private interview link",
        application: createdApplication,
        emailSent: false,
        emailError: emailError.message
      });
    }

  } catch (error) {
    console.error('❌ Error creating application:', error);
    return res.internalServerError({ message: error.message }); 
  }
};

/**
 * @description : resend private interview link with new token
 * @param {Object} req : request including applicationId or candidateId and jobId
 * @param {Object} res : response with new token and email status
 * @return {Object} : updated Application with new private link sent. {status, message, data}
 */
const resendPrivateInterviewLink = async (req, res) => {
  try {
    const { applicationId, candidateId, jobId } = req.body;

    // Find application by applicationId or by candidate+job combination
    let query = {};
    if (applicationId) {
      query._id = applicationId;
    } else if (candidateId && jobId) {
      query = { candidate: candidateId, job: jobId, isDeleted: false };
    } else {
      return res.badRequest({
        message: "Either applicationId or (candidateId and jobId) is required"
      });
    }

    const application = await Application.findOne(query).populate([
      {
        path: 'candidate',
        select: 'name email phone_number full_name'
      },
      {
        path: 'job',
        select: 'title description location workspace',
        populate: [
          {
            path: 'workspace',
            model: 'workspace',
            select: 'name'
          }
        ]
      }
    ]);

    if (!application) {
      return res.notFound({
        message: "Application not found"
      });
    }

    // Check if interview is already completed
    if (application.privateInterviewLink?.used || application.status === 'interview_completed') {
      return res.badRequest({
        message: "Cannot resend link - interview has already been completed"
      });
    }

    // Generate new private token and expiration
    const newPrivateToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log('🔄 Resending private interview link:', {
      applicationId: application._id,
      candidateEmail: application.candidate.email,
      oldToken: application.privateInterviewLink?.token?.substring(0, 8) + '...',
      newToken: newPrivateToken.substring(0, 8) + '...'
    });

    try {
      // Send new private interview link email
      const emailResult = await sendPrivateInterviewLinkEmail({
        applicationId: application._id,
        candidateId: application.candidate._id,
        email: application.candidate.email,
        candidateName: application.candidate.full_name || application.candidate.name,
        jobTitle: application.job.title,
        companyName: application.job.workspace?.name || 'Company',
        jobId: application.job._id,
        privateToken: newPrivateToken,
        isResend: true // Flag to indicate this is a resend
      });

      if (emailResult.success) {
        // Update application with new token and reset access flags
        const updatedApplication = await Application.findByIdAndUpdate(
          application._id,
          {
            $set: {
              'privateInterviewLink.token': newPrivateToken,
              'privateInterviewLink.expiresAt': newExpiresAt,
              'privateInterviewLink.sent': true,
              'privateInterviewLink.sentAt': new Date(),
              'privateInterviewLink.accessed': false, // Reset access flag
              'privateInterviewLink.accessedAt': null,
              'privateInterviewLink.resendCount': (application.privateInterviewLink?.resendCount || 0) + 1,
              'privateInterviewLink.lastResendAt': new Date(),
              status: 'interview_link_sent'
            }
          },
          { new: true }
        );

        return res.success({
          message: "Private interview link resent successfully",
          data: {
            application: updatedApplication,
            newToken: newPrivateToken,
            expiresAt: newExpiresAt,
            resendCount: (application.privateInterviewLink?.resendCount || 0) + 1
          },
          emailSent: true
        });
      } else {
        throw new Error(emailResult.message || 'Failed to send email');
      }

    } catch (emailError) {
      console.error('❌ Error resending private interview link:', emailError);
      
      return res.success({
        message: "Failed to resend private interview link",
        error: emailError.message,
        emailSent: false
      });
    }

  } catch (error) {
    console.error('❌ Error in resend private interview link:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Helper function to send private interview link email (updated to handle resends)
 */
const sendPrivateInterviewLinkEmail = async ({
  applicationId,
  candidateId,
  email,
  candidateName,
  jobTitle,
  companyName,
  jobId,
  publicLinkId,
  privateToken,
  isResend = false
}) => {
  try {
    // Create private interview URL
    const privateInterviewUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/private-interview/${privateToken}`;

    // Generate HTML content with resend indicator
    const htmlContent = getPrivateInterviewLinkEmailTemplate({
      candidateName,
      jobTitle,
      companyName,
      privateInterviewUrl,
      expiryHours: 24,
      isResend
    });

    const subject = isResend 
      ? `🔄 Updated Interview Link - ${jobTitle}` 
      : `🎯 Your Private Interview Link - ${jobTitle}`;

    console.log(`📤 ${isResend ? 'Resending' : 'Sending'} private interview link email to:`, email);

    // Use your existing AWS SES sendMail function
    const emailResult = await sendMail({
      to: email,
      subject: subject,
      from: 'hyrefast@techpranee.com',
      html: htmlContent
    });

    console.log('✅ Private interview link email sent successfully:', {
      to: email,
      applicationId,
      privateToken,
      messageId: emailResult.messageId,
      isResend
    });

    return {
      success: true,
      message: `Private interview link ${isResend ? 'resent' : 'sent'} successfully`,
      privateToken,
      messageId: emailResult.messageId
    };

  } catch (error) {
    console.error('❌ Error sending private interview link email:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

/**
 * Updated HTML template to handle resend scenario
 */
const getPrivateInterviewLinkEmailTemplate = ({ candidateName, jobTitle, companyName, privateInterviewUrl, expiryHours = 24, isResend = false }) => {
  const headerText = isResend ? '🔄 Updated Interview Link' : '🎯 Your Private Interview Link';
  const introText = isResend 
    ? `We've generated a new private interview link for your application to <strong style="color: #2563eb;">${jobTitle}</strong>. Your previous link has been deactivated for security.`
    : `Thank you for your application to <strong style="color: #2563eb;">${jobTitle}</strong>. Your private interview session is now ready to begin.`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isResend ? 'Updated Interview Link' : 'Your Private Interview Link'}</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #2563eb; padding: 30px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 40px 30px; }
        .link-box { background-color: #f8fafc; border: 2px solid #2563eb; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
        .interview-button { background-color: #2563eb; color: #ffffff; font-size: 18px; font-weight: bold; padding: 20px 40px; text-decoration: none; border-radius: 8px; margin: 0 auto; display: inline-block; }
        .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 25px 0; border-radius: 4px; }
        .important-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 25px 0; border-radius: 4px; }
        .resend-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px 20px; margin: 25px 0; border-radius: 4px; }
        .footer { background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${headerText}</h1>
          ${companyName ? `<p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">${companyName}</p>` : ''}
        </div>
        
        <div class="content">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px; line-height: 1.6;">
            Hi <strong>${candidateName}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #555; margin-bottom: 25px; line-height: 1.6;">
            ${introText}
          </p>

          ${isResend ? `
          <div class="resend-box">
            <p style="font-size: 14px; color: #047857; margin: 0; line-height: 1.5;">
              <strong>🔄 NEW LINK GENERATED:</strong> This is a fresh interview link. Any previous links for this position are now inactive.
            </p>
          </div>
          ` : ''}
          
          <div class="link-box">
            <p style="font-size: 16px; color: #64748b; margin-bottom: 20px;">
              🔒 Your Secure Interview Access
            </p>
            <a href="${privateInterviewUrl}" class="interview-button">
              ${isResend ? 'Access Updated Interview' : 'Start My Interview'}
            </a>
            <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
              ⏰ This link expires in <strong>${expiryHours} hours</strong>
            </p>
          </div>
          
          <div class="important-box">
            <p style="font-size: 14px; color: #dc2626; margin: 0; line-height: 1.5;">
              <strong>⚠️ IMPORTANT SECURITY NOTICE:</strong>
            </p>
            <ul style="font-size: 14px; color: #dc2626; margin: 10px 0; padding-left: 20px;">
              <li>This link is for <strong>ONE-TIME USE ONLY</strong></li>
              <li>Valid for ${expiryHours} hours from now</li>
              <li>Complete your interview in one session</li>
              <li>Do not share this link with anyone</li>
              <li>Your session will be tracked for security</li>
              ${isResend ? '<li><strong>Previous links are now deactivated</strong></li>' : ''}
            </ul>
          </div>
          
          <div class="warning-box">
            <p style="font-size: 14px; color: #92400e; margin: 0; line-height: 1.5;">
              <strong>Need Help?</strong> If you have any issues accessing your interview, 
              please contact our support team immediately.
            </p>
          </div>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin-top: 30px;">
            We're excited to learn more about you and discuss this opportunity!
          </p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Best regards,<br>
            <strong>${companyName} Recruitment Team</strong>
          </p>
        </div>
        
        <div class="footer">
          <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
            This is a secure, private interview link created specifically for you.<br>
            If you didn't apply for this position, please ignore this email.<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};




/**
 * @description : mark private interview as accessed (call this when user starts)
 */
const accessPrivateInterviewLink = async (req, res) => {
  try {
    const { token } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const application = await Application.findOneAndUpdate(
      {
        'privateInterviewLink.token': token,
        'privateInterviewLink.sent': true,
        'privateInterviewLink.used': false,
        isDeleted: false
      },
      {
        'privateInterviewLink.accessed': true,
        'privateInterviewLink.accessedAt': new Date(),
        'privateInterviewLink.ipAddress': ipAddress,
        'privateInterviewLink.userAgent': userAgent,
        status: 'interview_in_progress'
      },
      { new: true }
    );

    if (!application) {
      return res.notFound({
        message: "Invalid or expired private interview token"
      });
    }

    return res.success({
      message: "Private interview accessed successfully",
      accessedAt: new Date()
    });

  } catch (error) {
    console.error('Error accessing private interview:', error);
    return res.internalServerError({
      message: "Failed to access private interview",
      error: error.message
    });
  }
};


/**
 * @description : validate private interview token without marking as accessed
 */
const validatePrivateInterviewToken = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('🔍 Validating private interview token:', token);

    const application = await Application.findOne({
      'privateInterviewLink.token': token,
      'privateInterviewLink.sent': true,
      isDeleted: false
    }).populate([
      {
        path: 'candidate',
        select: 'name email phone_number location experience skills full_name'
      },
      {
        path: 'job',
        select: 'title description location employment_type questions workspace', // Include both questions and workspace
        populate: [
          {
            path: 'workspace',
            model: 'workspace', // Explicitly specify model name
            select: 'name'
          },
          {
            path: 'questions',
            model: 'question', // Explicitly specify model name
            select: 'title question_type evaluation_instructions timeLimit tags order'
          }
        ]
      }
    ]);

    if (!application) {
      console.log('❌ Application not found for token:', token);
      return res.notFound({
        message: "Invalid or expired private interview token"
      });
    }

    // Check if token is expired
    if (application.privateInterviewLink.expiresAt < new Date()) {
      console.log('❌ Token expired for:', token);
      return res.badRequest({
        message: "Private interview link has expired"
      });
    }

    // Check if already completed
    if (application.privateInterviewLink.used) {
      console.log('✅ Interview already completed for:', token);
      return res.success({
        message: "Interview already completed",
        application: application,
        status: 'completed'
      });
    }

    console.log('✅ Token validation successful for:', token);
    console.log('📦 Returning application data:', {
      id: application._id,
      jobTitle: application.job?.title,
      workspaceName: application.job?.workspace?.name || application.job?.workspace, // Check both populated and unpopulated
      questionsCount: application.job?.questions?.length || 0,
      preRequisiteQuestionsCount: application.preRequisiteQuestions?.length || 0
    });

    // Add debug logging for the job object
    console.log('🔍 Job object structure:', {
      jobFields: Object.keys(application.job?.toObject() || {}),
      hasQuestions: !!application.job?.questions,
      questionsType: Array.isArray(application.job?.questions),
      questionsLength: application.job?.questions?.length,
      hasWorkspace: !!application.job?.workspace,
      workspaceType: typeof application.job?.workspace
    });

    // Return application data in the response
    return res.success({
      message: "Private interview token is valid",
      data: application, // Keep as 'application' for consistency with frontend
      status: 'valid'
    });

  } catch (error) {
    console.error('❌ Error validating private interview token:', error);
    return res.internalServerError({
      message: "Failed to validate private interview token",
      error: error.message
    });
  }
};







/**
 * @description : create multiple documents of Application in mongodb collection.
 */
const bulkInsertApplication = async (req,res)=>{
  try {
    if (req.body && (!Array.isArray(req.body.data) || req.body.data.length < 1)) {
      return res.badRequest();
    }
    let dataToCreate = [ ...req.body.data ];
    for (let i = 0;i < dataToCreate.length;i++){
      dataToCreate[i] = {
        ...dataToCreate[i],
        addedBy: req.user?.id
      };
    }
    let createdApplications = await dbService.create(Application,dataToCreate);
    createdApplications = { count: createdApplications ? createdApplications.length : 0 };
    return res.success({ data:{ count:createdApplications.count || 0 } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};


/**
 * @description : bulk create applications with private interview links and send emails
 * @param {Object} req : request including body for creating documents with private links
 * @param {Object} res : response of created documents with email status
 * @return {Object} : created Applications with email sent status. {status, message, data}
 */
const bulkCreateApplicationsWithPrivateLinks = async (req, res) => {
  try {
    if (req.body && (!Array.isArray(req.body.data) || req.body.data.length < 1)) {
      return res.badRequest({ message: 'Invalid data: expected non-empty array' });
    }

    let dataToCreate = [...req.body.data];
    const emailPromises = [];
    const emailErrors = [];
    let emailsSent = 0;

    // Step 1: Process each application and add private interview link data
    for (let i = 0; i < dataToCreate.length; i++) {
      const appData = dataToCreate[i];
      
      // Generate private token and expiration for each application
      const privateToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Add private interview link data
      appData.privateInterviewLink = {
        token: privateToken,
        expiresAt: expiresAt,
        sent: false,
        accessed: false,
        used: false
      };

      // Set status to indicate link will be sent
      appData.status = 'interview_link_not_sent'; // Will be updated after email is sent
      appData.addedBy = req.user?.id;

      // Prepare email sending (but don't await yet for performance)
      if (appData.candidateEmail && appData.candidateName) {
        const emailPromise = sendPrivateInterviewLinkEmail({
          applicationId: null, // Will be set after creation
          candidateId: appData.candidate,
          email: appData.candidateEmail,
          candidateName: appData.candidateName,
          jobTitle: appData.jobTitle || 'Position',
          companyName: appData.companyName || 'Company',
          jobId: appData.job,
          publicLinkId: appData.interview_link_id,
          privateToken: privateToken
        }).then(result => {
          if (result.success) {
            emailsSent++;
            return { success: true, email: appData.candidateEmail, token: privateToken };
          } else {
            emailErrors.push(`Failed to send email to ${appData.candidateEmail}: ${result.message}`);
            return { success: false, email: appData.candidateEmail, error: result.message };
          }
        }).catch(error => {
          emailErrors.push(`Email error for ${appData.candidateEmail}: ${error.message}`);
          return { success: false, email: appData.candidateEmail, error: error.message };
        });

        emailPromises.push(emailPromise);
      }

      // Clean up fields that shouldn't be in the database
      delete appData.candidateEmail;
      delete appData.candidateName;
      delete appData.jobTitle;
      delete appData.companyName;
    }

    // Step 2: Create applications in bulk
    console.log('Creating', dataToCreate.length, 'applications with private links...');
    let createdApplications = await dbService.create(Application, dataToCreate);
    const createdCount = createdApplications ? createdApplications.length : 0;

    // Step 3: Send emails concurrently for better performance
    console.log('Sending', emailPromises.length, 'private interview link emails...');
    
    try {
      const emailResults = await Promise.allSettled(emailPromises);
      
      // Update application statuses based on email results
      const updatePromises = [];
      
      emailResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          // Find the created application and update its status
          const token = result.value.token;
          const updatePromise = Application.findOneAndUpdate(
            { 'privateInterviewLink.token': token },
            { 
              status: 'interview_link_sent',
              'privateInterviewLink.sent': true,
              'privateInterviewLink.sentAt': new Date()
            }
          );
          updatePromises.push(updatePromise);
        }
      });

      // Update all applications that had emails sent successfully
      if (updatePromises.length > 0) {
        await Promise.allSettled(updatePromises);
        console.log(`Updated ${updatePromises.length} applications to 'interview_link_sent' status`);
      }

    } catch (emailError) {
      console.error('Error processing emails:', emailError);
      emailErrors.push(`Bulk email processing error: ${emailError.message}`);
    }

    return res.success({
      data: {
        created: createdCount,
        existing: 0,
        emailsSent: emailsSent,
        emailErrors: emailErrors,
        totalEmails: emailPromises.length
      },
      message: `Bulk created ${createdCount} applications. ${emailsSent} private interview links sent successfully.`
    });

  } catch (error) {
    console.error('Bulk create with private links error:', error);
    return res.internalServerError({ message: error.message });
  }
};


const findAllApplication = async (req,res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      applicationSchemaKey.findFilterKeys,
      Application.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly){
      let totalRecords = await dbService.count(Application, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundApplications = await dbService.paginate( Application,query,options);
    if (!foundApplications || !foundApplications.data || !foundApplications.data.length){
      return res.recordNotFound(); 
    }
    return res.success({ data :foundApplications });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

const getApplication = async (req,res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message : 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundApplication = await dbService.findOne(Application,query, options);
    if (!foundApplication){
      return res.recordNotFound();
    }
    return res.success({ data :foundApplication });
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};

const getApplicationCount = async (req,res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      applicationSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedApplication = await dbService.count(Application,where);
    return res.success({ data : { count: countedApplication } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

const updateApplication = async (req,res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user?.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      applicationSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedApplication = await dbService.updateOne(Application,query,dataToUpdate);
    if (!updatedApplication){
      return res.recordNotFound();
    }
    return res.success({ data :updatedApplication });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

const bulkUpdateApplication = async (req,res)=>{
  try {
    let filter = req.body && req.body.filter ? { ...req.body.filter } : {};
    let dataToUpdate = {};
    delete dataToUpdate['addedBy'];
    if (req.body && typeof req.body.data === 'object' && req.body.data !== null) {
      dataToUpdate = { 
        ...req.body.data,
        updatedBy : req.user?.id
      };
    }
    let updatedApplication = await dbService.updateMany(Application,filter,dataToUpdate);
    if (!updatedApplication){
      return res.recordNotFound();
    }
    return res.success({ data :{ count : updatedApplication } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

const partialUpdateApplication = async (req,res) => {
  try {
    if (!req.params.id){
      res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    delete req.body['addedBy'];
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user?.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      applicationSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedApplication = await dbService.updateOne(Application, query, dataToUpdate);
    if (!updatedApplication) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedApplication });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

const softDeleteApplication = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    let query = { _id:req.params.id };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user?.id,
    };
    let updatedApplication = await dbService.updateOne(Application, query, updateBody);
    if (!updatedApplication){
      return res.recordNotFound();
    }
    return res.success({ data:updatedApplication });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

const deleteApplication = async (req,res) => {
  try { 
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    const deletedApplication = await dbService.deleteOne(Application, query);
    if (!deletedApplication){
      return res.recordNotFound();
    }
    return res.success({ data :deletedApplication });
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};

const deleteManyApplication = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const deletedApplication = await dbService.deleteMany(Application,query);
    if (!deletedApplication){
      return res.recordNotFound();
    }
    return res.success({ data :{ count :deletedApplication } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

const softDeleteManyApplication = async (req,res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user?.id,
    };
    let updatedApplication = await dbService.updateMany(Application,query, updateBody);
    if (!updatedApplication) {
      return res.recordNotFound();
    }
    return res.success({ data:{ count :updatedApplication } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};


/**
 * @description : resume private interview - allows candidates to exit and re-enter
 */
const resumePrivateInterview = async (req, res) => {
  try {
    const { token } = req.params;

    const application = await Application.findOne({
      'privateInterviewLink.token': token,
      'privateInterviewLink.sent': true,
      isDeleted: false
    }).populate('candidate job');

    if (!application) {
      return res.notFound({
        message: "Invalid or expired private interview token"
      });
    }

    // Check if token is expired
    if (application.privateInterviewLink.expiresAt < new Date()) {
      return res.badRequest({
        message: "Private interview link has expired"
      });
    }

    // Allow resume even if accessed before (for exit/re-enter functionality)
    return res.success({
      message: "Private interview resumed successfully",
      application: application,
      canResume: true,
      progress: {
        currentQuestion: application.currentQuestion,
        totalQuestions: application.totalQuestions,
        preRequisiteCompleted: application.preRequisiteQuestions && 
          application.preRequisiteQuestions.every(q => q.answer)
      }
    });

  } catch (error) {
    console.error('Error resuming private interview:', error);
    return res.internalServerError({
      message: "Failed to resume private interview",
      error: error.message
    });
  }


};


/**
 * @description : Complete interview analysis - fetch all responses and generate overall analysis using AI
 * @param {Object} req : request including applicationId or candidateId and jobId or token
 * @param {Object} res : response with overall interview analysis
 * @return {Object} : overall interview analysis with AI insights. {status, message, data}
 */
const InterviewCompleted = async (req, res) => {
  try {
    const { applicationId, candidateId, jobId, token } = req.body;

    console.log('🎯 Starting complete interview analysis:', {
      applicationId,
      candidateId,
      jobId,
      token
    });

    // Find application by different identifiers
    let applicationQuery = {};
    if (token) {
      applicationQuery = { 'privateInterviewLink.token': token, isDeleted: false };
    } else if (applicationId) {
      applicationQuery = { _id: applicationId, isDeleted: false };
    } else if (candidateId && jobId) {
      applicationQuery = { candidate: candidateId, job: jobId, isDeleted: false };
    } else {
      return res.badRequest({
        message: "Either token, applicationId, or (candidateId and jobId) is required"
      });
    }

    // Fetch application with populated data
    const application = await Application.findOne(applicationQuery);

    if (!application) {
      return res.notFound({
        message: "Application not found"
      });
    }

    console.log('✅ Application found:', {
      applicationId: application._id,
      candidateName: application.candidate.name,
      jobTitle: application.job.title
    });

    console.log(application,"application")

    // Build query to find all responses for this interview
    let responseQuery = {};
  
      responseQuery = { 
        candidate: application.candidate._id, 
        job: application.job._id,
        isDeleted: false 
    
    }

    // Fetch all interview responses for this application
    const responses = await Response.find(responseQuery)
      .populate('question', 'title question_type evaluation_instructions timeLimit')
      .sort({ questionNumber: 1 });

    if (!responses || responses.length === 0) {
      return res.badRequest({
        message: "No interview responses found for analysis"
      });
    }

    console.log(`📊 Found ${responses.length} responses for analysis`);

    // Prepare individual response data for AI analysis
    const responseAnalysisData = responses.map(response => ({
      questionNumber: response.questionNumber,
      questionText: response.questionText || response.question?.title,
      questionType: response.question?.question_type || 'general',
      responseText: response.responseText,
      transcriptionText: response.transcriptionText,
      responseDuration: response.responseDuration,
      individualAnalysis: response.aiAnalysis ? {
        overallScore: response.aiAnalysis.overall_assessment?.score,
        rating: response.aiAnalysis.overall_assessment?.rating,
        reasoning: response.aiAnalysis.overall_assessment?.reasoning,
        strengths: response.aiAnalysis.strengths || [],
        improvements: response.aiAnalysis.areas_for_improvement || [],
        redFlags: response.aiAnalysis.red_flags || [],
        recommendation: response.aiAnalysis.recommendation,
        detailedAnalysis: response.aiAnalysis.detailed_analysis || {},
        keyInsights: response.aiAnalysis.key_insights
      } : null,
      evaluationCriteria: response.question?.evaluation_instructions
    }));

    // Candidate profile data
    const candidateProfile = {
      name: application.candidate.full_name || application.candidate.name,
      email: application.candidate.email,
      experience: application.candidate.experience,
      skills: application.candidate.skills,
      location: application.candidate.location
    };

    // Job profile data
    const jobProfile = {
      title: application.job.title,
      description: application.job.description,
      requirements: application.job.requirements,
      location: application.job.location,
      employmentType: application.job.employment_type,
      company: application.job.workspace?.name,
      industry: application.job.workspace?.industry
    };

    try {
      console.log('🤖 Generating overall interview analysis with AI...');

      // Generate comprehensive analysis using AI (similar to your existing AI logic)
      const overallAnalysis = await generateOverallAIAnalysis({
        candidateProfile,
        jobProfile,
        responses: responseAnalysisData,
        interviewMetadata: {
          applicationId: application._id,
          totalQuestions: responses.length,
          interviewDate: application.createdAt,
          interviewType: 'video_interview'
        }
      });

      console.log('✅ AI overall analysis completed successfully');

      // Calculate additional metrics
      const individualScores = responses
        .filter(r => r.aiAnalysis?.overall_assessment?.score)
        .map(r => r.aiAnalysis.overall_assessment.score);

      const additionalMetrics = {
        averageScore: individualScores.length > 0 
          ? Math.round(individualScores.reduce((a, b) => a + b, 0) / individualScores.length)
          : null,
        highestScore: individualScores.length > 0 ? Math.max(...individualScores) : null,
        lowestScore: individualScores.length > 0 ? Math.min(...individualScores) : null,
        totalRedFlags: responses.reduce((acc, r) => acc + (r.aiAnalysis?.red_flags?.length || 0), 0),
        responseCompleteness: Math.round((responses.length / (responses.length || 1)) * 100),
        averageResponseDuration: responses.length > 0
          ? Math.round(responses.reduce((acc, r) => acc + (r.responseDuration || 0), 0) / responses.length)
          : null,
        questionsWithRedFlags: responses.filter(r => r.aiAnalysis?.red_flags?.length > 0).length,
        strongRecommendations: responses.filter(r => 
          r.aiAnalysis?.recommendation?.decision?.toLowerCase().includes('hire') && 
          !r.aiAnalysis?.recommendation?.decision?.toLowerCase().includes('no')
        ).length
      };

      // Combine overall analysis with additional metrics
      const completeAnalysis = {
        ...overallAnalysis,
        ...additionalMetrics,
        analyzedAt: new Date(),
        version: '1.0',
        analysisType: 'complete_interview'
      };

      // Update application with overall analysis using existing overall_score field
      const updatedApplication = await Application.findByIdAndUpdate(
        application._id,
        {
          $set: {
            'overall_score': completeAnalysis, // Store in existing overall_score field
            status: 'interview_completed', // Use existing enum value
            currentQuestion: responses.length,
            totalQuestions: responses.length
          }
        },
        { new: true }
      );

      console.log('💾 Overall analysis saved to application successfully');

      // Prepare comprehensive response
      const analysisResult = {
        applicationId: application._id,
        candidate: {
          id: application.candidate._id,
          name: candidateProfile.name,
          email: candidateProfile.email
        },
        job: {
          id: application.job._id,
          title: jobProfile.title,
          company: jobProfile.company
        },
        interviewSummary: {
          totalQuestions: responses.length,
          completedQuestions: responses.length,
          totalDuration: responses.reduce((acc, r) => acc + (r.responseDuration || 0), 0),
          interviewDate: application.createdAt
        },
        overallAnalysis: completeAnalysis,
        individualResponseSummary: responses.map(r => ({
          questionNumber: r.questionNumber,
          questionText: r.questionText,
          score: r.aiAnalysis?.overall_assessment?.score,
          rating: r.aiAnalysis?.overall_assessment?.rating,
          hasRedFlags: (r.aiAnalysis?.red_flags?.length || 0) > 0,
          recommendation: r.aiAnalysis?.recommendation?.decision
        })),
        timeline: {
          applicationCreated: application.createdAt,
          interviewCompleted: responses[responses.length - 1]?.createdAt,
          analysisCompleted: new Date()
        }
      };

      return res.success({
        message: "Complete interview analysis generated successfully",
        data: analysisResult
      });

    } catch (aiError) {
      console.error('❌ AI overall analysis failed:', aiError);

      // Return basic analysis without AI if AI service fails
      const individualScores = responses
        .filter(r => r.aiAnalysis?.overall_assessment?.score)
        .map(r => r.aiAnalysis.overall_assessment.score);

      const basicAnalysis = {
        averageScore: individualScores.length > 0 
          ? Math.round(individualScores.reduce((a, b) => a + b, 0) / individualScores.length)
          : null,
        totalQuestions: responses.length,
        completionRate: 100,
        totalRedFlags: responses.reduce((acc, r) => acc + (r.aiAnalysis?.red_flags?.length || 0), 0),
        status: 'ai_overall_analysis_failed',
        error: 'AI overall analysis service unavailable - individual analyses available',
        individualAnalysisAvailable: true,
        analyzedAt: new Date(),
        version: '1.0-fallback'
      };

      // Store basic analysis in overall_score field
      await Application.findByIdAndUpdate(
        application._id,
        {
          $set: {
            'overall_score': basicAnalysis,
            status: 'interview_completed', // Use existing enum value
           
          }
        }
      );

      return res.success({
        message: "Basic overall analysis completed (AI overall analysis failed)",
        data: {
          applicationId: application._id,
          candidate: {
            id: application.candidate._id,
            name: application.candidate.name,
            email: application.candidate.email
          },
          job: {
            id: application.job._id,
            title: application.job.title
          },
          basicAnalysis,
          individualResponses: responses.map(r => ({
            questionNumber: r.questionNumber,
            questionText: r.questionText,
            individualAnalysis: r.aiAnalysis
          })),
          aiError: aiError.message
        }
      });
    }

  } catch (error) {
    console.error('❌ Error in complete interview analysis:', error);
    return res.internalServerError({ 
      message: "Failed to complete overall interview analysis",
      error: error.message 
    });
  }
};

/**
 * Generate overall AI analysis for complete interview using axios only
 */
async function generateOverallAIAnalysis({ candidateProfile, jobProfile, responses, interviewMetadata }) {
  try {
    const ollamaHost = process.env.AI_GENERATE_URL || process.env.OLLAMA_HOST || 'https://ollama2.havenify.ai';
    const ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest';
    
    // Ensure we have the correct API endpoint
    let ollamaApiUrl;
    if (!ollamaHost.includes('/api/generate')) {
      ollamaApiUrl = `${ollamaHost}/api/generate`;
    } else {
      ollamaApiUrl = ollamaHost;
    }

    console.log('🤖 Using API URL for overall analysis:', ollamaApiUrl);

    // Create comprehensive prompt for overall analysis
    const overallPrompt = createOverallAnalysisPrompt({
      candidateProfile,
      jobProfile,
      responses,
      interviewMetadata
    });

    console.log('🤖 Calling AI service for overall interview analysis...');

    // Use axios directly with retry logic
    const maxRetries = 3;
    let lastError;
    let aiResponseText = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Calling Ollama API for overall analysis`);
        
        const response = await axios.post(ollamaApiUrl, {
          model: ollamaModel,
          prompt: overallPrompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 3000,
            top_p: 0.9,
            repeat_penalty: 1.1,
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 120000
        });

        aiResponseText = response.data.response || '';
        
        if (!aiResponseText) {
          throw new Error('Empty response from Ollama');
        }

        console.log('✅ AI overall analysis API call successful');
        break; // Success, exit retry loop
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // Don't retry on certain errors
        if (error.response?.status === 404) {
          throw new Error(`Ollama service not found at ${ollamaApiUrl}. Please ensure Ollama is running and accessible.`);
        }
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // If all retries failed
    if (!aiResponseText && lastError) {
      console.error('All AI overall analysis attempts failed:', lastError);
      throw lastError;
    }
    
    // Try to extract and parse JSON from AI response
    let aiAnalysis;
    try {
      const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI response, using fallback analysis');
      aiAnalysis = generateFallbackOverallAnalysis(responses);
    }

    // Ensure proper structure
    const finalAnalysis = standardizeOverallAnalysisStructure(aiAnalysis);

    console.log('✅ AI overall analysis completed successfully');
    return finalAnalysis;

  } catch (error) {
    console.error('❌ AI overall analysis failed:', error);
    return generateFallbackOverallAnalysis(responses);
  }
}


/**
 * Create comprehensive prompt for overall interview analysis
 */
function createOverallAnalysisPrompt({ candidateProfile, jobProfile, responses, interviewMetadata }) {
  return `You are an expert interview evaluator conducting a COMPREHENSIVE OVERALL ANALYSIS of a complete interview. You must be decisive and honest in your assessment - avoid neutral recommendations like "Consider" unless the candidate is truly borderline.

CANDIDATE PROFILE:
${JSON.stringify(candidateProfile, null, 2)}

JOB PROFILE:
${JSON.stringify(jobProfile, null, 2)}

COMPLETE INTERVIEW RESPONSES WITH INDIVIDUAL ANALYSES:
${JSON.stringify(responses, null, 2)}

EVALUATION INSTRUCTIONS:
- Base your analysis ONLY on the provided data
- Be decisive in your recommendation - avoid "Consider" unless truly warranted
- If responses are weak, incomplete, or show red flags, recommend "Pass" or "Strong Pass"
- If responses are strong and demonstrate clear competency, recommend "Hire" or "Strong Hire"
- Only use "Consider" if the candidate shows mixed results with both strong positives and concerning negatives

Provide comprehensive analysis in this exact JSON format:
{
  "overall_score": <number 0-100 based on actual performance>,
  "percentile": <number 0-100 realistic ranking>,
  "overall_rating": "Exceptional|Strong|Satisfactory|Marginal|Unsatisfactory",
  "comprehensive_reasoning": "Clear analysis based strictly on the interview data provided - no speculation or optimistic assumptions",
  "strengths": ["Only list strengths clearly demonstrated in responses"],
  "areas_for_improvement": ["List specific gaps or weaknesses observed"],
  "key_insights": "Critical observations about candidate's actual demonstrated abilities",
  "recommendation": {
    "decision": "Strong Hire|Hire|Pass|Strong Pass",
    "confidence": "Very High|High|Moderate|Low|Very Low",
    "reasoning": "Be decisive - clearly state why you recommend hiring or passing based on the evidence. Avoid suggesting 'Consider' unless there are genuinely strong arguments on both sides."
  },
  "technical_competency": <number 0-100 based on demonstrated technical skills>,
  "communication_skills": <number 0-100 based on response clarity and articulation>,
  "cultural_fit": <number 0-100 based on values alignment shown in responses>,
  "problem_solving": <number 0-100 based on demonstrated analytical thinking>,
  "consistency_score": <number 0-100 based on quality consistency across responses>,
  "red_flags": ["List any concerning responses, gaps, or negative indicators"],
  "next_steps": ["Specific actionable recommendations based on your decision"]
}

CRITICAL GUIDELINES:
- If individual question scores are mostly below 70, recommend "Pass" or "Strong Pass"
- If responses show multiple red flags or concerning gaps, be honest about recommending against hiring
- If responses are consistently strong (75+ scores) with clear competency demonstration, recommend "Hire"
- Only recommend "Strong Hire" for exceptional candidates with 85+ consistent performance
- Be realistic about percentile ranking - not everyone is above average
- Focus on what the candidate actually demonstrated, not their potential

Provide a clear, decisive recommendation that reflects the actual interview performance.`;
}


/**
 * Standardize overall analysis structure
 */
function standardizeOverallAnalysisStructure(aiAnalysis) {
  return {
    overall_score: aiAnalysis.overall_score || 75,
    percentile: aiAnalysis.percentile || 50,
    overall_rating: aiAnalysis.overall_rating || 'Satisfactory',
    comprehensive_reasoning: aiAnalysis.comprehensive_reasoning || 'Comprehensive analysis completed',
    strengths: Array.isArray(aiAnalysis.strengths) ? aiAnalysis.strengths : ['Adequate performance demonstrated'],
    areas_for_improvement: Array.isArray(aiAnalysis.areas_for_improvement) ? aiAnalysis.areas_for_improvement : ['Continue professional development'],
    key_insights: aiAnalysis.key_insights || 'Analysis completed successfully',
    recommendation: {
      decision: aiAnalysis.recommendation?.decision || 'Consider',
      confidence: aiAnalysis.recommendation?.confidence || 'Moderate',
      reasoning: aiAnalysis.recommendation?.reasoning || 'Standard evaluation completed'
    },
    technical_competency: aiAnalysis.technical_competency || 75,
    communication_skills: aiAnalysis.communication_skills || 75,
    cultural_fit: aiAnalysis.cultural_fit || 75,
    problem_solving: aiAnalysis.problem_solving || 75,
    consistency_score: aiAnalysis.consistency_score || 75,
    red_flags: Array.isArray(aiAnalysis.red_flags) ? aiAnalysis.red_flags : [],
    next_steps: Array.isArray(aiAnalysis.next_steps) ? aiAnalysis.next_steps : ['Proceed with standard hiring process'],
    analyzed_at: new Date().toISOString(),
    analysis_version: '1.0-overall-comprehensive'
  };
}

/**
 * Generate fallback overall analysis
 */
function generateFallbackOverallAnalysis(responses) {
  const scores = responses
    .filter(r => r.individualAnalysis?.overallScore)
    .map(r => r.individualAnalysis.overallScore);

  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 70;

  return {
    overall_score: averageScore,
    percentile: Math.max(averageScore - 20, 30),
    overall_rating: averageScore >= 80 ? 'Strong' : averageScore >= 65 ? 'Satisfactory' : 'Marginal',
    comprehensive_reasoning: `Fallback analysis: Average individual score of ${averageScore} across ${responses.length} responses.`,
    strengths: ['Completed all interview questions', 'Provided responses to all queries'],
    areas_for_improvement: ['Requires detailed manual review', 'Comprehensive analysis needed'],
    key_insights: `Basic analysis only - ${responses.length} responses analyzed with average performance metrics`,
    recommendation: {
      decision: 'Consider',
      confidence: 'Low',
      reasoning: 'Limited analysis available - requires comprehensive human review'
    },
    technical_competency: averageScore,
    communication_skills: averageScore,
    cultural_fit: averageScore,
    problem_solving: averageScore,
    consistency_score: 75,
    red_flags: [],
    next_steps: ['Manual review of responses required'],
    analyzed_at: new Date().toISOString(),
    analysis_version: '1.0-fallback'
  };
}

/**
 * @description : Get overall interview analysis (retrieve existing analysis)
 */
const getInterviewAnalysis = async (req, res) => {
  try {
    const { applicationId, token } = req.params;

    let query = {};
    if (token) {
      query = { 'privateInterviewLink.token': token, isDeleted: false };
    } else if (applicationId) {
      query = { _id: applicationId, isDeleted: false };
    } else {
      return res.badRequest({
        message: "Either applicationId or token is required"
      });
    }

    const application = await Application.findOne(query);

    if (!application) {
      return res.notFound({
        message: "Application not found"
      });
    }

    if (!application.overall_score || Object.keys(application.overall_score).length === 0) {
      return res.badRequest({
        message: "Interview analysis not yet completed. Please run complete analysis first."
      });
    }

    return res.success({
      message: "Interview analysis retrieved successfully",
      data: {
        applicationId: application._id,
        candidate: application.candidate,
        job: application.job,
        overallAnalysis: application.overall_score,
        analysisVersion: application.overall_score.analysis_version,
        lastAnalyzed: application.overall_score.analyzed_at
      }
    });

  } catch (error) {
    console.error('❌ Error retrieving interview analysis:', error);
    return res.internalServerError({ 
      message: "Failed to retrieve interview analysis",
      error: error.message 
    });
  }
};





module.exports = {
  addApplication,
  createApplicationWithPrivateLink,
  accessPrivateInterviewLink,
  validatePrivateInterviewToken,
  bulkInsertApplication,
  findAllApplication,
  getApplication,
  getApplicationCount,
  updateApplication,
  bulkUpdateApplication,
  partialUpdateApplication,
  softDeleteApplication,
  deleteApplication,
  deleteManyApplication,
  softDeleteManyApplication,
  bulkCreateApplicationsWithPrivateLinks,
  resumePrivateInterview,
  resendPrivateInterviewLink,
  getInterviewAnalysis,
  InterviewCompleted
};