/**
 * applicationRoutes.js
 * @description :: CRUD API routes for application
 */

const express = require("express");
const router = express.Router();
const applicationController = require("../../../controller/client/v1/applicationController");
const { PLATFORM } = require("../../../constants/authConstant");
const auth = require("../../../middleware/auth");
const checkRolePermission = require("../../../middleware/checkRolePermission");

// Existing routes
router
  .route("/client/api/v1/application/create")
  .post(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.addApplication
  );
router
  .route("/client/api/v1/application/list")
  .post(auth(PLATFORM.CLIENT), applicationController.findAllApplication);
router
  .route("/client/api/v1/application/count")
  .post(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.getApplicationCount
  );
router
  .route("/client/api/v1/application/:id")
  .get(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.getApplication
  );
router
  .route("/client/api/v1/application/update/:id")
  .put(
  
    applicationController.updateApplication
  );
router
  .route("/client/api/v1/application/partial-update/:id")
  .put(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.partialUpdateApplication
  );
router
  .route("/client/api/v1/application/softDelete/:id")
  .put(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.softDeleteApplication
  );
router
  .route("/client/api/v1/application/softDeleteMany")
  .put(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.softDeleteManyApplication
  );
router
  .route("/client/api/v1/application/addBulk")
  .post(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.bulkInsertApplication
  );
router
  .route("/client/api/v1/application/updateBulk")
  .put(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.bulkUpdateApplication
  );
router
  .route("/client/api/v1/application/delete/:id")
  .delete(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.deleteApplication
  );
router
  .route("/client/api/v1/application/deleteMany")
  .post(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.deleteManyApplication
  );

// Private interview link routes
router
  .route("/client/api/v1/application/create-with-private-link")
  .post(applicationController.createApplicationWithPrivateLink);

router
  .route("/client/api/v1/application/private-interview/:token")
  .get(applicationController.validatePrivateInterviewToken);

router
  .route("/client/api/v1/application/private-interview/:token/access")
  .post(applicationController.accessPrivateInterviewLink);

router
  .route("/client/api/v1/application/private-interview/:token/resume")
  .get(applicationController.resumePrivateInterview);

router
  .route("/client/api/v1/application/bulk-create-with-private-links")
  .post(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.bulkCreateApplicationsWithPrivateLinks
  );

router
  .route("/client/api/v1/application/resend-private-link")
  .post(auth(PLATFORM.CLIENT), applicationController.resendPrivateInterviewLink);

// NEW ROUTES: Interview Analysis
/**
 * @description : Complete interview analysis - analyze all responses and generate overall insights
 * @param {Object} req : request body should contain applicationId OR (candidateId and jobId) OR token
 * @param {Object} res : response with complete AI analysis
 * @return {Object} : overall interview analysis with comprehensive insights
 */
router
  .route("/client/api/v1/interview/complete-analysis")
  .post(
   
    applicationController.InterviewCompleted
  );

/**
 * @description : Get stored interview analysis by applicationId
 * @param {String} applicationId : application ID in URL params
 * @param {Object} res : response with stored analysis
 * @return {Object} : existing interview analysis data
 */
router
  .route("/client/api/v1/interview/analysis/:applicationId")
  .get(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    applicationController.getInterviewAnalysis
  );

/**
 * @description : Get stored interview analysis by private token (for candidates)
 * @param {String} token : private interview token in URL params
 * @param {Object} res : response with stored analysis
 * @return {Object} : existing interview analysis data
 */
router
  .route("/client/api/v1/interview/analysis/token/:token")
  .get(applicationController.getInterviewAnalysis);

/**
 * @description : Get interview analysis status (check if analysis is completed)
 * @param {String} applicationId : application ID in URL params
 * @param {Object} res : response with analysis status
 * @return {Object} : analysis completion status
 */
router
  .route("/client/api/v1/interview/analysis-status/:applicationId")
  .get(
    auth(PLATFORM.CLIENT),
    checkRolePermission,
    (req, res) => {
      const { applicationId } = req.params;
      Application.findById(applicationId)
        .then(app => {
          if (!app) {
            return res.notFound({ message: "Application not found" });
          }
          return res.success({
            message: "Analysis status retrieved",
            data: {
              applicationId: app._id,
              hasAnalysis: !!(app.overall_score && Object.keys(app.overall_score).length > 0),
              status: app.status,
              currentQuestion: app.currentQuestion,
              totalQuestions: app.totalQuestions,
              lastUpdated: app.updatedAt
            }
          });
        })
        .catch(error => res.internalServerError({ message: error.message }));
    }
  );

module.exports = router;
