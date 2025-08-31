/**
 * routes/interview.js
 * @description :: interview management routes
 */

const express = require('express');
const router = express.Router();
const interviewController = require('../../../controller/client/v1/interviewController');
const { PLATFORM } = require('../../../constants/authConstant');
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');
const { checkCreditsMiddleware } = require('../../../middleware/creditCheck');

// Interview Template routes
router.route('/template/create').post(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.addInterviewTemplate);
router.route('/template/list').post(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.findAllInterviewTemplate);
router.route('/template/:id').get(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.getInterviewTemplate);
router.route('/template/update/:id').put(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.updateInterviewTemplate);
router.route('/template/partial-update/:id').put(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.partialUpdateInterviewTemplate);
router.route('/template/softDelete/:id').put(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.softDeleteInterviewTemplate);
router.route('/template/delete/:id').delete(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.deleteInterviewTemplate);

// Interview Session routes
router.route('/session/create').post(auth(PLATFORM.CLIENT), checkRolePermission, checkCreditsMiddleware, interviewController.addInterviewSession);
router.route('/session/list').post(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.findAllInterviewSession);
router.route('/session/:id').get(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.getInterviewSession);
router.route('/session/update/:id').put(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.updateInterviewSession);
router.route('/session/complete/:id').put(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.completeInterviewSession);
router.route('/session/softDelete/:id').put(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.softDeleteInterviewSession);

// Interview Response routes
router.route('/response/submit').post(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.submitInterviewResponse);
router.route('/response/list/:sessionId').get(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.getSessionResponses);
router.route('/response/:id').get(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.getInterviewResponse);

// Candidate Verification routes
router.route('/verification/create').post(interviewController.createCandidateVerification); // Public endpoint
router.route('/verification/verify-otp').post(interviewController.verifyOTP); // Public endpoint
router.route('/verification/:id').get(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.getCandidateVerification);
router.route('/verification/list').post(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.findAllCandidateVerification);

// Analytics routes
router.route('/analytics/session/:sessionId').get(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.getSessionAnalytics);
router.route('/analytics/job/:jobId').get(auth(PLATFORM.CLIENT), checkRolePermission, interviewController.getJobAnalytics);

module.exports = router;
