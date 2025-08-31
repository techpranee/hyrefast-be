/**
 * interviewController.js
 * @description :: exports action methods for interview management.
 */

// const InterviewTemplate = require('../../../model/interviewTemplate');
const Application = require('../../../model/application'); // Interview Session
const Response = require('../../../model/response'); // Interview Response  
const Job = require('../../../model/job');
const User = require('../../../model/user');
const utils = require('../../../utils/common');
const deleteDependentService = require('../../../utils/deleteDependent');
const dbService = require('../../../utils/dbService');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * @description : create document of InterviewTemplate in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created InterviewTemplate. {status, message, data}
 */
const addInterviewTemplate = async (req, res) => {
    try {
        let dataToCreate = { ...req.body || {} };
        dataToCreate = utils.pickFromObject(dataToCreate, ['title', 'description', 'jobRole', 'questions', 'isPublic']);
        dataToCreate.addedBy = req.user.id;

        let createdInterviewTemplate = await dbService.create(InterviewTemplate, dataToCreate);
        return res.success({ data: createdInterviewTemplate });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : find all documents of InterviewTemplate from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found InterviewTemplate(s). {status, message, data}
 */
const findAllInterviewTemplate = async (req, res) => {
    try {
        let options = utils.paginationOptions(req.body);
        let query = req.body.query || {};
        query.isDeleted = false;

        // Role-based access control
        if (req.user.role !== 'admin') {
            query.$or = [
                { addedBy: req.user.id },
                { isPublic: true }
            ];
        }

        let foundInterviewTemplates = await dbService.paginate(InterviewTemplate, query, options);
        return res.success({ data: foundInterviewTemplates });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : create document of Application (InterviewSession) in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created Application. {status, message, data}
 */
const addInterviewSession = async (req, res) => {
    try {
        let dataToCreate = { ...req.body || {} };
        dataToCreate = utils.pickFromObject(dataToCreate, [
            'user', 'job', 'templateId', 'title', 'scheduledAt', 'voiceEnabled', 'aiModel'
        ]);

        // Validate job exists
        const job = await Job.findOne({ _id: dataToCreate.job, isDeleted: false });
        if (!job) {
            return res.badRequest({ message: 'Job not found' });
        }

        // Validate template exists
        const template = await InterviewTemplate.findOne({ _id: dataToCreate.templateId, isDeleted: false });
        if (!template) {
            return res.badRequest({ message: 'Interview template not found' });
        }

        dataToCreate.totalQuestions = template.questions.length;
        dataToCreate.addedBy = req.user.id;

        let createdInterviewSession = await dbService.create(Application, dataToCreate);

        // Populate references
        await createdInterviewSession.populate('user', 'name email');
        await createdInterviewSession.populate('job', 'title');
        await createdInterviewSession.populate('templateId', 'title');

        return res.success({ data: createdInterviewSession });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : find all documents of Application (InterviewSession) from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found Application(s). {status, message, data}
 */
const findAllInterviewSession = async (req, res) => {
    try {
        let options = utils.paginationOptions(req.body);
        let query = req.body.query || {};
        query.isDeleted = false;

        // Role-based filtering
        if (req.user.userType === 2) { // recruiter
            query.addedBy = req.user.id;
        } else if (req.user.userType === 3) { // candidate
            query.user = req.user.id;
        }

        let foundInterviewSessions = await dbService.paginate(Application, query, options, {
            populate: [
                { path: 'user', select: 'name email' },
                { path: 'addedBy', select: 'name email' },
                { path: 'job', select: 'title status' },
                { path: 'templateId', select: 'title description' }
            ]
        });

        return res.success({ data: foundInterviewSessions });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : submit interview response
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created Response. {status, message, data}
 */
const submitInterviewResponse = async (req, res) => {
    try {
        let dataToCreate = { ...req.body || {} };
        dataToCreate = utils.pickFromObject(dataToCreate, [
            'sessionId', 'questionNumber', 'questionText', 'responseText',
            'responseAudioUrl', 'responseVideoUrl', 'responseDuration',
            'transcriptionText'
        ]);

        // Validate session exists and user has access
        const session = await Application.findOne({
            _id: dataToCreate.sessionId,
            isDeleted: false
        });

        if (!session) {
            return res.badRequest({ message: 'Interview session not found' });
        }

        // Check if user can submit responses for this session
        if (req.user.userType === 3 && session.user?.toString() !== req.user.id) { // candidate
            return res.forbidden({ message: 'Not authorized to submit responses for this session' });
        }

        // Check if response already exists
        const existingResponse = await Response.findOne({
            sessionId: dataToCreate.sessionId,
            questionNumber: dataToCreate.questionNumber,
            isDeleted: false
        });

        let response;
        if (existingResponse) {
            // Update existing response
            Object.assign(existingResponse, dataToCreate);
            existingResponse.updatedBy = req.user.id;
            response = await existingResponse.save();
        } else {
            // Create new response
            dataToCreate.addedBy = req.user.id;
            response = await dbService.create(Response, dataToCreate);
        }

        // Update session progress
        await Application.findByIdAndUpdate(session._id, {
            currentQuestion: Math.max(session.currentQuestion, dataToCreate.questionNumber),
            status: session.status === 'pending' ? 'in_progress' : session.status,
            startedAt: session.status === 'pending' ? new Date() : session.startedAt
        });

        // TODO: Queue background jobs for transcription and AI analysis

        return res.success({ data: response });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : get document of Application (InterviewSession) from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found Application. {status, message, data}
 */
const getInterviewSession = async (req, res) => {
    try {
        let query = { _id: req.params.id, isDeleted: false };

        // Role-based access control
        if (req.user.userType === 2) { // recruiter
            query.addedBy = req.user.id;
        } else if (req.user.userType === 3) { // candidate
            query.user = req.user.id;
        }

        let foundInterviewSession = await dbService.findOne(Application, query, {
            populate: [
                { path: 'user', select: 'name email phone' },
                { path: 'addedBy', select: 'name email' },
                { path: 'job' },
                { path: 'templateId' }
            ]
        });

        if (!foundInterviewSession) {
            return res.recordNotFound();
        }

        // Get responses for this session
        const responses = await Response.find({
            sessionId: foundInterviewSession._id,
            isDeleted: false
        }).sort({ questionNumber: 1 });

        foundInterviewSession = foundInterviewSession.toJSON();
        foundInterviewSession.responses = responses;

        return res.success({ data: foundInterviewSession });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : update document of Application (InterviewSession) with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated Application.
 * @return {Object} : updated Application. {status, message, data}
 */
const updateInterviewSession = async (req, res) => {
    try {
        let dataToUpdate = { ...req.body };
        let query = { _id: req.params.id, isDeleted: false };

        // Role-based access control
        if (req.user.userType === 2) { // recruiter
            query.addedBy = req.user.id;
        } else if (req.user.userType === 3) { // candidate
            query.user = req.user.id;
        }

        dataToUpdate.updatedBy = req.user.id;
        let updatedInterviewSession = await dbService.updateOne(Application, query, dataToUpdate);

        if (!updatedInterviewSession) {
            return res.recordNotFound();
        }

        return res.success({ data: updatedInterviewSession });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : complete interview session
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response of updated Application.
 * @return {Object} : updated Application. {status, message, data}
 */
const completeInterviewSession = async (req, res) => {
    try {
        let query = { _id: req.params.id, isDeleted: false };

        // Role-based access control
        if (req.user.userType === 2) { // recruiter
            query.addedBy = req.user.id;
        } else if (req.user.userType === 3) { // candidate
            query.user = req.user.id;
        }

        const session = await Application.findOne(query).populate('workspace');
        if (!session) {
            return res.recordNotFound();
        }

        if (session.status === 'completed') {
            return res.badRequest({ message: 'Session is already completed' });
        }

        // Check if credit was already deducted for this application
        if (session.credit_deducted) {
            return res.badRequest({ message: 'Credit has already been deducted for this interview' });
        }

        // Import credit service
        const CreditService = require('../../../services/creditService');

        // Get workspace
        const workspaceId = session.workspace || session.job?.workspace;
        if (!workspaceId) {
            return res.badRequest({ message: 'Workspace not found for this interview' });
        }

        // Check and deduct credit
        const creditResult = await CreditService.deductCreditForInterview(workspaceId, session._id);
        if (!creditResult.success) {
            return res.badRequest({ message: creditResult.message });
        }

        let updatedInterviewSession = await dbService.updateOne(Application, query, {
            status: 'completed',
            completedAt: new Date(),
            updatedBy: req.user.id,
            credit_deducted: true,
            credit_deducted_at: new Date(),
            credit_deduction_reference: creditResult.transaction._id,
            processing_started_at: new Date()
        });

        // TODO: Queue comprehensive analysis job

        return res.success({
            data: updatedInterviewSession,
            message: 'Interview session completed successfully and credit deducted',
            creditInfo: {
                creditsDeducted: 1,
                remainingCredits: creditResult.workspace.available_credits,
                transactionId: creditResult.transaction._id
            }
        });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : create candidate verification (update user with verification)
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created verification data. {status, message, data}
 */
const createCandidateVerification = async (req, res) => {
    try {
        let dataToCreate = { ...req.body || {} };
        dataToCreate = utils.pickFromObject(dataToCreate, [
            'name', 'email', 'mobileNo', 'profileData'
        ]);

        // Check if user already exists
        let user = await User.findOne({ email: dataToCreate.email, isDeleted: false });

        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const verificationToken = crypto.randomBytes(32).toString('hex');

        if (user) {
            // Update existing user with verification data
            user.verificationToken = verificationToken;
            user.isVerified = false;
            user.profileData = dataToCreate.profileData;
            user.loginOTP = {
                code: otpCode,
                expireTime: otpExpiresAt
            };
            await user.save();
        } else {
            // Create new user with verification data
            user = new User({
                name: dataToCreate.name,
                email: dataToCreate.email,
                mobileNo: dataToCreate.mobileNo,
                profileData: dataToCreate.profileData,
                verificationToken: verificationToken,
                isVerified: false,
                userType: 3, // candidate
                loginOTP: {
                    code: otpCode,
                    expireTime: otpExpiresAt
                },
                password: 'temp_password' // Will be set later
            });
            await user.save();
        }

        // TODO: Send OTP via email/SMS
        console.log(`OTP for ${dataToCreate.email}: ${otpCode}`);

        return res.success({
            data: {
                id: user._id,
                email: user.email,
                message: 'Verification code sent to your email'
            }
        });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : verify OTP for candidate verification
 * @param {Object} req : request including verification ID and OTP code.
 * @param {Object} res : response of verification result
 * @return {Object} : verification result. {status, message, data}
 */
const verifyOTP = async (req, res) => {
    try {
        const { userId, otpCode } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.badRequest({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.badRequest({ message: 'Already verified' });
        }

        if (!user.loginOTP || user.loginOTP.expireTime < new Date()) {
            return res.badRequest({ message: 'OTP expired' });
        }

        if (user.loginRetryLimit >= 3) {
            return res.badRequest({ message: 'Too many attempts. Please request a new OTP' });
        }

        if (user.loginOTP.code !== otpCode) {
            user.loginRetryLimit += 1;
            await user.save();
            return res.badRequest({ message: 'Invalid OTP' });
        }

        // Verify successfully
        user.isVerified = true;
        user.verifiedAt = new Date();
        user.loginOTP = undefined;
        user.loginRetryLimit = 0;
        await user.save();

        return res.success({
            data: {
                id: user._id,
                email: user.email,
                isVerified: user.isVerified,
                verifiedAt: user.verifiedAt
            },
            message: 'Verification successful'
        });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

/**
 * @description : get session responses
 * @param {Object} req : request including session ID in params.
 * @param {Object} res : response contains responses for the session.
 * @return {Object} : found responses. {status, message, data}
 */
const getSessionResponses = async (req, res) => {
    try {
        const sessionId = req.params.sessionId;

        // Validate session access
        let sessionQuery = { _id: sessionId, isDeleted: false };
        if (req.user.userType === 2) { // recruiter
            sessionQuery.addedBy = req.user.id;
        } else if (req.user.userType === 3) { // candidate
            sessionQuery.user = req.user.id;
        }

        const session = await Application.findOne(sessionQuery);
        if (!session) {
            return res.recordNotFound({ message: 'Session not found' });
        }

        const responses = await Response.find({
            sessionId: sessionId,
            isDeleted: false
        }).sort({ questionNumber: 1 });

        return res.success({ data: responses });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

// Additional methods for soft delete, get single documents, etc.
const getInterviewTemplate = async (req, res) => {
    try {
        let query = { _id: req.params.id, isDeleted: false };
        let foundInterviewTemplate = await dbService.findOne(InterviewTemplate, query);
        if (!foundInterviewTemplate) {
            return res.recordNotFound();
        }
        return res.success({ data: foundInterviewTemplate });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const updateInterviewTemplate = async (req, res) => {
    try {
        let dataToUpdate = { ...req.body };
        let query = { _id: req.params.id, isDeleted: false };

        // Only allow owner or admin to update
        if (req.user.role !== 'admin') {
            query.addedBy = req.user.id;
        }

        dataToUpdate.updatedBy = req.user.id;
        let updatedInterviewTemplate = await dbService.updateOne(InterviewTemplate, query, dataToUpdate);
        if (!updatedInterviewTemplate) {
            return res.recordNotFound();
        }
        return res.success({ data: updatedInterviewTemplate });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const partialUpdateInterviewTemplate = async (req, res) => {
    try {
        let dataToUpdate = { ...req.body };
        delete dataToUpdate.addedBy;
        dataToUpdate.updatedBy = req.user.id;
        let query = { _id: req.params.id, isDeleted: false };

        if (req.user.role !== 'admin') {
            query.addedBy = req.user.id;
        }

        let updatedInterviewTemplate = await dbService.updateOne(InterviewTemplate, query, dataToUpdate);
        if (!updatedInterviewTemplate) {
            return res.recordNotFound();
        }
        return res.success({ data: updatedInterviewTemplate });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const softDeleteInterviewTemplate = async (req, res) => {
    try {
        let query = { _id: req.params.id };

        if (req.user.role !== 'admin') {
            query.addedBy = req.user.id;
        }

        const result = await dbService.updateOne(InterviewTemplate, query, {
            isDeleted: true,
            updatedBy: req.user.id
        });
        if (!result) {
            return res.recordNotFound();
        }
        return res.success({ data: result });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const deleteInterviewTemplate = async (req, res) => {
    try {
        let query = { _id: req.params.id };

        if (req.user.role !== 'admin') {
            query.addedBy = req.user.id;
        }

        const result = await dbService.deleteOne(InterviewTemplate, query);
        if (!result) {
            return res.recordNotFound();
        }
        return res.success({ data: result });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const softDeleteInterviewSession = async (req, res) => {
    try {
        let query = { _id: req.params.id };

        if (req.user.userType === 2) { // recruiter
            query.addedBy = req.user.id;
        }

        const result = await dbService.updateOne(Application, query, {
            isDeleted: true,
            updatedBy: req.user.id
        });
        if (!result) {
            return res.recordNotFound();
        }
        return res.success({ data: result });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const getInterviewResponse = async (req, res) => {
    try {
        let foundInterviewResponse = await dbService.findOne(Response, { _id: req.params.id, isDeleted: false });
        if (!foundInterviewResponse) {
            return res.recordNotFound();
        }
        return res.success({ data: foundInterviewResponse });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const getCandidateVerification = async (req, res) => {
    try {
        let foundUser = await dbService.findOne(User, { _id: req.params.id, isDeleted: false });
        if (!foundUser) {
            return res.recordNotFound();
        }

        const verificationData = {
            id: foundUser._id,
            email: foundUser.email,
            name: foundUser.name,
            isVerified: foundUser.isVerified,
            verifiedAt: foundUser.verifiedAt,
            profileData: foundUser.profileData
        };

        return res.success({ data: verificationData });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const findAllCandidateVerification = async (req, res) => {
    try {
        let options = utils.paginationOptions(req.body);
        let query = req.body.query || {};
        query.isDeleted = false;
        query.userType = 3; // candidates only

        let foundUsers = await dbService.paginate(User, query, options);
        return res.success({ data: foundUsers });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const getSessionAnalytics = async (req, res) => {
    try {
        const sessionId = req.params.sessionId;

        // Validate session access
        let sessionQuery = { _id: sessionId, isDeleted: false };
        if (req.user.userType === 2) { // recruiter
            sessionQuery.addedBy = req.user.id;
        }

        const session = await Application.findOne(sessionQuery);
        if (!session) {
            return res.recordNotFound({ message: 'Session not found' });
        }

        const responses = await Response.find({
            sessionId: sessionId,
            isDeleted: false
        });

        const analytics = {
            session: {
                id: session._id,
                status: session.status,
                candidateAnalysisStatus: session.candidateAnalysisStatus,
                transcriptionCoverage: session.transcriptionCoveragePercentage || 0
            },
            responses: {
                total: responses.length,
                withTranscription: responses.filter(r => r.transcriptionText).length,
                withAnalysis: responses.filter(r => r.aiAnalysis?.score).length
            },
            progress: {
                questionsCompleted: session.currentQuestion || 0,
                totalQuestions: session.totalQuestions || 0,
                completionPercentage: session.totalQuestions ?
                    Math.round((session.currentQuestion / session.totalQuestions) * 100) : 0
            }
        };

        return res.success({ data: analytics });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

const getJobAnalytics = async (req, res) => {
    try {
        const jobId = req.params.jobId;

        // Validate job access
        let jobQuery = { _id: jobId, isDeleted: false };
        if (req.user.userType === 2) { // recruiter
            jobQuery.addedBy = req.user.id;
        }

        const job = await Job.findOne(jobQuery);
        if (!job) {
            return res.recordNotFound({ message: 'Job not found' });
        }

        const sessions = await Application.find({
            job: jobId,
            isDeleted: false
        });

        const analytics = {
            job: {
                id: job._id,
                title: job.title,
                status: job.status
            },
            sessions: {
                total: sessions.length,
                completed: sessions.filter(s => s.status === 'completed').length,
                inProgress: sessions.filter(s => s.status === 'in_progress').length,
                pending: sessions.filter(s => s.status === 'pending').length
            },
            analysis: {
                analyzed: sessions.filter(s => s.candidateAnalysisStatus === 'completed').length,
                averageScore: sessions
                    .filter(s => s.candidateAnalysisData?.overallScore)
                    .reduce((sum, s) => sum + s.candidateAnalysisData.overallScore, 0) /
                    sessions.filter(s => s.candidateAnalysisData?.overallScore).length || 0
            }
        };

        return res.success({ data: analytics });
    } catch (error) {
        return res.internalServerError({ message: error.message });
    }
};

module.exports = {
    addInterviewTemplate,
    findAllInterviewTemplate,
    getInterviewTemplate,
    updateInterviewTemplate,
    partialUpdateInterviewTemplate,
    softDeleteInterviewTemplate,
    deleteInterviewTemplate,

    addInterviewSession,
    findAllInterviewSession,
    getInterviewSession,
    updateInterviewSession,
    completeInterviewSession,
    softDeleteInterviewSession,

    submitInterviewResponse,
    getSessionResponses,
    getInterviewResponse,

    createCandidateVerification,
    verifyOTP,
    getCandidateVerification,
    findAllCandidateVerification,

    getSessionAnalytics,
    getJobAnalytics
};
