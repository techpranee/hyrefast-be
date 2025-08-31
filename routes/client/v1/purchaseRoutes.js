/**
 * purchaseRoutes.js
 * @description :: CRUD API routes for purchase
 */

const express = require('express');
const router = express.Router();
const purchaseController = require("../../../controller/client/v1/purchaseController")
const { PLATFORM } =  require("../../../constants/authConstant"); 
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/purchase/create").post(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.addPurchase);
router.route("/client/api/v1/purchase/list").post(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.findAllPurchase);
router.route("/client/api/v1/purchase/count").post(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.getPurchaseCount);
router.route("/client/api/v1/purchase/:id").get(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.getPurchase);
router.route("/client/api/v1/purchase/update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.updatePurchase);    
router.route("/client/api/v1/purchase/partial-update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.partialUpdatePurchase);
router.route("/client/api/v1/purchase/softDelete/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.softDeletePurchase);
router.route("/client/api/v1/purchase/softDeleteMany").put(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.softDeleteManyPurchase);
router.route("/client/api/v1/purchase/addBulk").post(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.bulkInsertPurchase);
router.route("/client/api/v1/purchase/updateBulk").put(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.bulkUpdatePurchase);
router.route("/client/api/v1/purchase/delete/:id").delete(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.deletePurchase);
router.route("/client/api/v1/purchase/deleteMany").post(auth(PLATFORM.CLIENT),checkRolePermission,purchaseController.deleteManyPurchase);

module.exports = router;
