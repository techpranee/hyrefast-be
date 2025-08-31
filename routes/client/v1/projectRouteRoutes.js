/**
 * projectRouteRoutes.js
 * @description :: CRUD API routes for projectRoute
 */

const express = require('express');
const router = express.Router();
const projectRouteController = require('../../../controller/client/v1/projectRouteController');
const { PLATFORM } =  require('../../../constants/authConstant'); 
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route('/client/api/v1/projectroute/create').post(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.addProjectRoute);
router.route('/client/api/v1/projectroute/addBulk').post(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.bulkInsertProjectRoute);
router.route('/client/api/v1/projectroute/list').post(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.findAllProjectRoute);
router.route('/client/api/v1/projectroute/count').post(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.getProjectRouteCount);
router.route('/client/api/v1/projectroute/updateBulk').put(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.bulkUpdateProjectRoute);
router.route('/client/api/v1/projectroute/softDeleteMany').put(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.softDeleteManyProjectRoute);
router.route('/client/api/v1/projectroute/deleteMany').post(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.deleteManyProjectRoute);
router.route('/client/api/v1/projectroute/softDelete/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.softDeleteProjectRoute);
router.route('/client/api/v1/projectroute/partial-update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.partialUpdateProjectRoute);
router.route('/client/api/v1/projectroute/update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.updateProjectRoute);    
router.route('/client/api/v1/projectroute/:id').get(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.getProjectRoute);
router.route('/client/api/v1/projectroute/delete/:id').delete(auth(PLATFORM.CLIENT),checkRolePermission,projectRouteController.deleteProjectRoute);

module.exports = router;
