/**
 * routes/workspace.js
 * @description :: workspace management routes
 */

const express = require('express');
const router = express.Router();
const workspaceController = require('../../../controller/client/v1/workspaceController');
const { PLATFORM } = require('../../../constants/authConstant');
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');

// Basic Workspace CRUD routes
router.route('/workspace/create').post(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.addWorkspace);
router.route('/workspace/list').post(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.findAllWorkspace);
router.route('/workspace/:id').get(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.getWorkspace);
router.route('/workspace/update/:id').put(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.updateWorkspace);
router.route('/workspace/partial-update/:id').put(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.partialUpdateWorkspace);
router.route('/workspace/softDelete/:id').put(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.softDeleteWorkspace);
router.route('/workspace/delete/:id').delete(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.deleteWorkspace);

// Bulk operations routes
router.route('/workspace/bulk/create').post(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.bulkInsertWorkspace);
router.route('/workspace/bulk/update').put(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.bulkUpdateWorkspace);
router.route('/workspace/bulk/softDelete').put(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.softDeleteManyWorkspace);
router.route('/workspace/bulk/delete').delete(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.deleteManyWorkspace);

// Utility routes
router.route('/workspace/count').post(auth(PLATFORM.CLIENT), checkRolePermission, workspaceController.getWorkspaceCount);

module.exports = router;
