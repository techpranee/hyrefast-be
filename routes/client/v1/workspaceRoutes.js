/**
 * workspaceRoutes.js
 * @description :: CRUD API routes for workspace
 */

const express = require('express');
const router = express.Router();
const workspaceController = require("../../../controller/client/v1/workspaceController")
const { PLATFORM } =  require("../../../constants/authConstant"); 
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/workspace/create").post(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.addWorkspace);
router.route("/client/api/v1/workspace/list").post(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.findAllWorkspace);
router.route("/client/api/v1/workspace/count").post(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.getWorkspaceCount);
router.route("/client/api/v1/workspace/:id").get(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.getWorkspace);
router.route("/client/api/v1/workspace/update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.updateWorkspace);    
router.route("/client/api/v1/workspace/partial-update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.partialUpdateWorkspace);
router.route("/client/api/v1/workspace/softDelete/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.softDeleteWorkspace);
router.route("/client/api/v1/workspace/softDeleteMany").put(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.softDeleteManyWorkspace);
router.route("/client/api/v1/workspace/addBulk").post(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.bulkInsertWorkspace);
router.route("/client/api/v1/workspace/updateBulk").put(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.bulkUpdateWorkspace);
router.route("/client/api/v1/workspace/delete/:id").delete(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.deleteWorkspace);
router.route("/client/api/v1/workspace/deleteMany").post(auth(PLATFORM.CLIENT),checkRolePermission,workspaceController.deleteManyWorkspace);

module.exports = router;
