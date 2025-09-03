/**
 * jobRoutes.js
 * @description :: CRUD API routes for job
 */

const express = require('express');
const router = express.Router();
const jobController = require("../../../controller/client/v1/jobController")
const { PLATFORM } =  require("../../../constants/authConstant"); 
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/job/create").post(auth(PLATFORM.CLIENT),checkRolePermission,jobController.addJob);
router.route("/client/api/v1/job/list").post(auth(PLATFORM.CLIENT),checkRolePermission,jobController.findAllJob);
router.route("/client/api/v1/job/count").post(auth(PLATFORM.CLIENT),checkRolePermission,jobController.getJobCount);
router.route("/client/api/v1/job/:id").get(auth(PLATFORM.CLIENT),checkRolePermission,jobController.getJob);
router.route("/client/api/v1/job/update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,jobController.updateJob);    
router.route("/client/api/v1/job/partial-update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,jobController.partialUpdateJob);
router.route("/client/api/v1/job/softDelete/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,jobController.softDeleteJob);
router.route("/client/api/v1/job/softDeleteMany").put(auth(PLATFORM.CLIENT),checkRolePermission,jobController.softDeleteManyJob);
router.route("/client/api/v1/job/addBulk").post(auth(PLATFORM.CLIENT),checkRolePermission,jobController.bulkInsertJob);
router.route("/client/api/v1/job/updateBulk").put(auth(PLATFORM.CLIENT),checkRolePermission,jobController.bulkUpdateJob);
router.route("/client/api/v1/job/delete/:id").delete(auth(PLATFORM.CLIENT),checkRolePermission,jobController.deleteJob);
router.route("/client/api/v1/job/deleteMany").post(auth(PLATFORM.CLIENT),checkRolePermission,jobController.deleteManyJob);
router.route('/client/api/v1/job/create-with-questions').post(
  auth(PLATFORM.CLIENT), 
  checkRolePermission, 
  jobController.createJobWithQuestions
);

module.exports = router;
