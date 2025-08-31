/**
 * paymentRoutes.js
 * @description :: CRUD API routes for payment
 */

const express = require('express');
const router = express.Router();
const paymentController = require("../../../controller/client/v1/paymentController")
const { PLATFORM } =  require("../../../constants/authConstant"); 
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/payment/create").post(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.addPayment);
router.route("/client/api/v1/payment/list").post(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.findAllPayment);
router.route("/client/api/v1/payment/count").post(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.getPaymentCount);
router.route("/client/api/v1/payment/:id").get(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.getPayment);
router.route("/client/api/v1/payment/update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.updatePayment);    
router.route("/client/api/v1/payment/partial-update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.partialUpdatePayment);
router.route("/client/api/v1/payment/softDelete/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.softDeletePayment);
router.route("/client/api/v1/payment/softDeleteMany").put(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.softDeleteManyPayment);
router.route("/client/api/v1/payment/addBulk").post(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.bulkInsertPayment);
router.route("/client/api/v1/payment/updateBulk").put(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.bulkUpdatePayment);
router.route("/client/api/v1/payment/delete/:id").delete(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.deletePayment);
router.route("/client/api/v1/payment/deleteMany").post(auth(PLATFORM.CLIENT),checkRolePermission,paymentController.deleteManyPayment);

module.exports = router;
