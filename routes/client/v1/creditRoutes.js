/**
 * creditRoutes.js
 * @description :: CRUD API routes for credit
 */

const express = require('express');
const router = express.Router();
const creditController = require("../../../controller/client/v1/creditController")
const { PLATFORM } = require("../../../constants/authConstant");
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/credit/create").post(auth(PLATFORM.CLIENT), checkRolePermission, creditController.addCredit);
router.route("/client/api/v1/credit/list").post(auth(PLATFORM.CLIENT), checkRolePermission, creditController.findAllCredit);
router.route("/client/api/v1/credit/count").post(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getCreditCount);
router.route("/client/api/v1/credit/:id").get(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getCredit);
router.route("/client/api/v1/credit/update/:id").put(auth(PLATFORM.CLIENT), checkRolePermission, creditController.updateCredit);
router.route("/client/api/v1/credit/partial-update/:id").put(auth(PLATFORM.CLIENT), checkRolePermission, creditController.partialUpdateCredit);
router.route("/client/api/v1/credit/softDelete/:id").put(auth(PLATFORM.CLIENT), checkRolePermission, creditController.softDeleteCredit);
router.route("/client/api/v1/credit/softDeleteMany").put(auth(PLATFORM.CLIENT), checkRolePermission, creditController.softDeleteManyCredit);
router.route("/client/api/v1/credit/addBulk").post(auth(PLATFORM.CLIENT), checkRolePermission, creditController.bulkInsertCredit);
router.route("/client/api/v1/credit/updateBulk").put(auth(PLATFORM.CLIENT), checkRolePermission, creditController.bulkUpdateCredit);
router.route("/client/api/v1/credit/delete/:id").delete(auth(PLATFORM.CLIENT), checkRolePermission, creditController.deleteCredit);
router.route("/client/api/v1/credit/deleteMany").post(auth(PLATFORM.CLIENT), checkRolePermission, creditController.deleteManyCredit);

// Credit Management Routes
router.route("/client/api/v1/credit/balance/:workspaceId").get(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getCreditBalance);
router.route("/client/api/v1/credit/balance").get(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getCreditBalance);
router.route("/client/api/v1/credit/history/:workspaceId").post(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getCreditHistory);
router.route("/client/api/v1/credit/history").post(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getCreditHistory);
router.route("/client/api/v1/credit/stats/:workspaceId").get(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getCreditStats);
router.route("/client/api/v1/credit/stats").get(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getCreditStats);
router.route("/client/api/v1/credit/alert-threshold/:workspaceId").put(auth(PLATFORM.CLIENT), checkRolePermission, creditController.updateCreditAlertThreshold);
router.route("/client/api/v1/credit/alert-threshold").put(auth(PLATFORM.CLIENT), checkRolePermission, creditController.updateCreditAlertThreshold);
router.route("/client/api/v1/credit/low-credit-workspaces").get(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getLowCreditWorkspaces);


// Add this line to your creditRoutes.js after the existing routes
router.route("/client/api/v1/credit/usage-analytics/:workspaceId").get(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getJobUsageAnalytics);
router.route("/client/api/v1/credit/usage-analytics").get(auth(PLATFORM.CLIENT), checkRolePermission, creditController.getJobUsageAnalytics);


module.exports = router;
