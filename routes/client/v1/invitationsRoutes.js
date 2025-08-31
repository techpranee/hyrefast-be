/**
 * invitationsRoutes.js
 * @description :: CRUD API routes for invitations
 */

const express = require('express');
const router = express.Router();
const invitationsController = require("../../../controller/client/v1/invitationsController")
const { PLATFORM } =  require("../../../constants/authConstant"); 
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/invitations/create").post(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.addInvitations);
router.route("/client/api/v1/invitations/list").post(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.findAllInvitations);
router.route("/client/api/v1/invitations/count").post(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.getInvitationsCount);
router.route("/client/api/v1/invitations/:id").get(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.getInvitations);
router.route("/client/api/v1/invitations/update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.updateInvitations);    
router.route("/client/api/v1/invitations/partial-update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.partialUpdateInvitations);
router.route("/client/api/v1/invitations/softDelete/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.softDeleteInvitations);
router.route("/client/api/v1/invitations/softDeleteMany").put(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.softDeleteManyInvitations);
router.route("/client/api/v1/invitations/addBulk").post(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.bulkInsertInvitations);
router.route("/client/api/v1/invitations/updateBulk").put(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.bulkUpdateInvitations);
router.route("/client/api/v1/invitations/delete/:id").delete(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.deleteInvitations);
router.route("/client/api/v1/invitations/deleteMany").post(auth(PLATFORM.CLIENT),checkRolePermission,invitationsController.deleteManyInvitations);

module.exports = router;
