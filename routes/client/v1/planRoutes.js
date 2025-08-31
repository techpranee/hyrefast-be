/**
 * planRoutes.js
 * @description :: CRUD API routes for plan
 */

const express = require('express');
const router = express.Router();
const planController = require("../../../controller/client/v1/planController")
const { PLATFORM } =  require("../../../constants/authConstant"); 
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/plan/create").post(auth(PLATFORM.CLIENT),checkRolePermission,planController.addPlan);
router.route("/client/api/v1/plan/list").post(auth(PLATFORM.CLIENT),checkRolePermission,planController.findAllPlan);
router.route("/client/api/v1/plan/count").post(auth(PLATFORM.CLIENT),checkRolePermission,planController.getPlanCount);
router.route("/client/api/v1/plan/:id").get(auth(PLATFORM.CLIENT),checkRolePermission,planController.getPlan);
router.route("/client/api/v1/plan/update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,planController.updatePlan);    
router.route("/client/api/v1/plan/partial-update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,planController.partialUpdatePlan);
router.route("/client/api/v1/plan/softDelete/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,planController.softDeletePlan);
router.route("/client/api/v1/plan/softDeleteMany").put(auth(PLATFORM.CLIENT),checkRolePermission,planController.softDeleteManyPlan);
router.route("/client/api/v1/plan/addBulk").post(auth(PLATFORM.CLIENT),checkRolePermission,planController.bulkInsertPlan);
router.route("/client/api/v1/plan/updateBulk").put(auth(PLATFORM.CLIENT),checkRolePermission,planController.bulkUpdatePlan);
router.route("/client/api/v1/plan/delete/:id").delete(auth(PLATFORM.CLIENT),checkRolePermission,planController.deletePlan);
router.route("/client/api/v1/plan/deleteMany").post(auth(PLATFORM.CLIENT),checkRolePermission,planController.deleteManyPlan);

module.exports = router;
