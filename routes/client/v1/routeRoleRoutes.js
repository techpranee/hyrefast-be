/**
 * routeRoleRoutes.js
 * @description :: CRUD API routes for routeRole
 */

const express = require('express');
const router = express.Router();
const routeRoleController = require('../../../controller/client/v1/routeRoleController');
const { PLATFORM } =  require('../../../constants/authConstant'); 
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route('/client/api/v1/routerole/create').post(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.addRouteRole);
router.route('/client/api/v1/routerole/addBulk').post(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.bulkInsertRouteRole);
router.route('/client/api/v1/routerole/list').post(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.findAllRouteRole);
router.route('/client/api/v1/routerole/count').post(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.getRouteRoleCount);
router.route('/client/api/v1/routerole/updateBulk').put(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.bulkUpdateRouteRole);
router.route('/client/api/v1/routerole/softDeleteMany').put(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.softDeleteManyRouteRole);
router.route('/client/api/v1/routerole/deleteMany').post(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.deleteManyRouteRole);
router.route('/client/api/v1/routerole/softDelete/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.softDeleteRouteRole);
router.route('/client/api/v1/routerole/partial-update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.partialUpdateRouteRole);
router.route('/client/api/v1/routerole/update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.updateRouteRole);    
router.route('/client/api/v1/routerole/:id').get(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.getRouteRole);
router.route('/client/api/v1/routerole/delete/:id').delete(auth(PLATFORM.CLIENT),checkRolePermission,routeRoleController.deleteRouteRole);

module.exports = router;
