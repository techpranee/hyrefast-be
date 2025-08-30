/**
 * responseRoutes.js
 * @description :: CRUD API routes for response
 */

const express = require('express');
const router = express.Router();
const responseController = require('../../../controller/client/v1/responseController');
const { PLATFORM } =  require('../../../constants/authConstant'); 
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route('/client/api/v1/response/create').post(auth(PLATFORM.CLIENT),checkRolePermission,responseController.addResponse);
router.route('/client/api/v1/response/list').post(auth(PLATFORM.CLIENT),checkRolePermission,responseController.findAllResponse);
router.route('/client/api/v1/response/count').post(auth(PLATFORM.CLIENT),checkRolePermission,responseController.getResponseCount);
router.route('/client/api/v1/response/:id').get(auth(PLATFORM.CLIENT),checkRolePermission,responseController.getResponse);
router.route('/client/api/v1/response/update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,responseController.updateResponse);    
router.route('/client/api/v1/response/partial-update/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,responseController.partialUpdateResponse);
router.route('/client/api/v1/response/softDelete/:id').put(auth(PLATFORM.CLIENT),checkRolePermission,responseController.softDeleteResponse);
router.route('/client/api/v1/response/softDeleteMany').put(auth(PLATFORM.CLIENT),checkRolePermission,responseController.softDeleteManyResponse);
router.route('/client/api/v1/response/addBulk').post(auth(PLATFORM.CLIENT),checkRolePermission,responseController.bulkInsertResponse);
router.route('/client/api/v1/response/updateBulk').put(auth(PLATFORM.CLIENT),checkRolePermission,responseController.bulkUpdateResponse);
router.route('/client/api/v1/response/delete/:id').delete(auth(PLATFORM.CLIENT),checkRolePermission,responseController.deleteResponse);
router.route('/client/api/v1/response/deleteMany').post(auth(PLATFORM.CLIENT),checkRolePermission,responseController.deleteManyResponse);

router.post('/client/api/v1/response/interview-response',
  auth(PLATFORM.CLIENT),
  responseController.createInterviewResponse
);

module.exports = router;
