/**
 * roleRoutes.js
 * @description :: CRUD API routes for role
 */

const express = require('express');
const router = express.Router();
const roleController = require('../../../controller/client/v1/roleController');
const { PLATFORM } =  require('../../../constants/authConstant'); 
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route('/client/api/v1/role/create').post(auth(PLATFORM.CLIENT),checkRolePermission,roleController.addRole);
router.route('/client/api/v1/role/addBulk').post(auth(PLATFORM.CLIENT),checkRolePermission,roleController.bulkInsertRole);
router.route('/client/api/v1/role/list').post(auth(PLATFORM.CLIENT),checkRolePermission,roleController.findAllRole);
router.route('/client/api/v1/role/count').post(auth(PLATFORM.CLIENT),checkRolePermission,roleController.getRoleCount);
router.route('/client/api/v1/role/updateBulk').put(auth(PLATFORM.CLIENT),checkRolePermission,roleController.bulkUpdateRole);
router.route('/client/api/v1/role/softDeleteMany').put(auth(PLATFORM.CLIENT),checkRolePermission,roleController.softDeleteManyRole);
router.route('/client/api/v1/role/deleteMany').post(auth(PLATFORM.CLIENT),checkRolePermission,roleController.deleteManyRole);
router.route('/client/api/v1/role/softDelete/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,roleController.softDeleteRole);
router.route('/client/api/v1/role/partial-update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,roleController.partialUpdateRole);
router.route('/client/api/v1/role/update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,roleController.updateRole);    
router.route('/client/api/v1/role/:id').get(auth(PLATFORM.CLIENT),checkRolePermission,roleController.getRole);
router.route('/client/api/v1/role/delete/:id').delete(auth(PLATFORM.CLIENT),checkRolePermission,roleController.deleteRole);

module.exports = router;
