/**
 * userRoutes.js
 * @description :: CRUD API routes for user
 */

const express = require('express');
const router = express.Router();
const userController = require('../../../controller/client/v1/userController');
const { PLATFORM } =  require('../../../constants/authConstant'); 
const auth = require('../../../middleware/auth');

router.route('/client/api/v1/user/me').get(auth(PLATFORM.CLIENT),userController.getLoggedInUserInfo);
router.route('/client/api/v1/user/list').post(auth(PLATFORM.CLIENT),userController.findAllUser);
router.route('/client/api/v1/user/change-password').put(auth(PLATFORM.CLIENT),userController.changePassword);
router.route('/client/api/v1/user/update/:id').put(auth(PLATFORM.CLIENT),userController.updateProfile);
router.route('/client/api/v1/user/toggle-2fa').put(auth(PLATFORM.CLIENT),userController.toggle2FA);

module.exports = router;