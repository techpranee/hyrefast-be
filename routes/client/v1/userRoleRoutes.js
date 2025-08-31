/**
 * userRoleRoutes.js
 * @description :: CRUD API routes for userRole
 */

const express = require('express');
const router = express.Router();
const userRoleController = require('../../../controller/client/v1/userRoleController');
const { PLATFORM } =  require('../../../constants/authConstant'); 
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route('/client/api/v1/userrole/create').post(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.addUserRole);
router.route('/client/api/v1/userrole/addBulk').post(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.bulkInsertUserRole);
router.route('/client/api/v1/userrole/list').post(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.findAllUserRole);
router.route('/client/api/v1/userrole/count').post(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.getUserRoleCount);
router.route('/client/api/v1/userrole/updateBulk').put(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.bulkUpdateUserRole);
router.route('/client/api/v1/userrole/softDeleteMany').put(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.softDeleteManyUserRole);
router.route('/client/api/v1/userrole/deleteMany').post(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.deleteManyUserRole);
router.route('/client/api/v1/userrole/softDelete/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.softDeleteUserRole);
router.route('/client/api/v1/userrole/partial-update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.partialUpdateUserRole);
router.route('/client/api/v1/userrole/update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.updateUserRole);    
router.route('/client/api/v1/userrole/:id').get(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.getUserRole);
router.route('/client/api/v1/userrole/delete/:id').delete(auth(PLATFORM.CLIENT),checkRolePermission,userRoleController.deleteUserRole);

module.exports = router;
