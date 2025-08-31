/**
 * creditRoutes.js
 * @description :: CRUD API routes for credit
 */

const express = require('express');
const router = express.Router();
const creditController = require("../../../controller/client/v1/creditController")
const { PLATFORM } =  require("../../../constants/authConstant"); 
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/credit/create").post(auth(PLATFORM.CLIENT),checkRolePermission,creditController.addCredit);
router.route("/client/api/v1/credit/list").post(auth(PLATFORM.CLIENT),checkRolePermission,creditController.findAllCredit);
router.route("/client/api/v1/credit/count").post(auth(PLATFORM.CLIENT),checkRolePermission,creditController.getCreditCount);
router.route("/client/api/v1/credit/:id").get(auth(PLATFORM.CLIENT),checkRolePermission,creditController.getCredit);
router.route("/client/api/v1/credit/update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,creditController.updateCredit);    
router.route("/client/api/v1/credit/partial-update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,creditController.partialUpdateCredit);
router.route("/client/api/v1/credit/softDelete/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,creditController.softDeleteCredit);
router.route("/client/api/v1/credit/softDeleteMany").put(auth(PLATFORM.CLIENT),checkRolePermission,creditController.softDeleteManyCredit);
router.route("/client/api/v1/credit/addBulk").post(auth(PLATFORM.CLIENT),checkRolePermission,creditController.bulkInsertCredit);
router.route("/client/api/v1/credit/updateBulk").put(auth(PLATFORM.CLIENT),checkRolePermission,creditController.bulkUpdateCredit);
router.route("/client/api/v1/credit/delete/:id").delete(auth(PLATFORM.CLIENT),checkRolePermission,creditController.deleteCredit);
router.route("/client/api/v1/credit/deleteMany").post(auth(PLATFORM.CLIENT),checkRolePermission,creditController.deleteManyCredit);

module.exports = router;
