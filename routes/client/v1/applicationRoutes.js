/**
 * applicationRoutes.js
 * @description :: CRUD API routes for application
 */

const express = require('express');
const router = express.Router();
const applicationController = require('../../../controller/client/v1/applicationController');
const { PLATFORM } =  require('../../../constants/authConstant'); 
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route('/client/api/v1/application/create').post(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.addApplication);
router.route('/client/api/v1/application/list').post(auth(PLATFORM.CLIENT),applicationController.findAllApplication);
router.route('/client/api/v1/application/count').post(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.getApplicationCount);
router.route('/client/api/v1/application/:id').get(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.getApplication);
router.route('/client/api/v1/application/update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.updateApplication);    
router.route('/client/api/v1/application/partial-update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.partialUpdateApplication);
router.route('/client/api/v1/application/softDelete/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.softDeleteApplication);
router.route('/client/api/v1/application/softDeleteMany').put(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.softDeleteManyApplication);
router.route('/client/api/v1/application/addBulk').post(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.bulkInsertApplication);
router.route('/client/api/v1/application/updateBulk').put(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.bulkUpdateApplication);
router.route('/client/api/v1/application/delete/:id').delete(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.deleteApplication);
router.route('/client/api/v1/application/deleteMany').post(auth(PLATFORM.CLIENT),checkRolePermission,applicationController.deleteManyApplication);

module.exports = router;
