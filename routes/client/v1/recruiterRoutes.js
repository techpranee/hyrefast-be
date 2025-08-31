/**
 * recruiterRoutes.js
 * @description :: CRUD API routes for recruiter
 */

const express = require('express');
const router = express.Router();
const recruiterController = require("../../../controller/client/v1/recruiterController")
const { PLATFORM } =  require("../../../constants/authConstant"); 
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/recruiter/create").post(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.addRecruiter);
router.route("/client/api/v1/recruiter/list").post(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.findAllRecruiter);
router.route("/client/api/v1/recruiter/count").post(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.getRecruiterCount);
router.route("/client/api/v1/recruiter/:id").get(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.getRecruiter);
router.route("/client/api/v1/recruiter/update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.updateRecruiter);    
router.route("/client/api/v1/recruiter/partial-update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.partialUpdateRecruiter);
router.route("/client/api/v1/recruiter/softDelete/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.softDeleteRecruiter);
router.route("/client/api/v1/recruiter/softDeleteMany").put(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.softDeleteManyRecruiter);
router.route("/client/api/v1/recruiter/addBulk").post(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.bulkInsertRecruiter);
router.route("/client/api/v1/recruiter/updateBulk").put(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.bulkUpdateRecruiter);
router.route("/client/api/v1/recruiter/delete/:id").delete(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.deleteRecruiter);
router.route("/client/api/v1/recruiter/deleteMany").post(auth(PLATFORM.CLIENT),checkRolePermission,recruiterController.deleteManyRecruiter);

module.exports = router;
