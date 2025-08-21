/**
 * authController.js
 * @description :: exports authentication methods
 */

const User = require('../../../model/user');
const dbService = require('../../../utils/dbService');
const userTokens = require('../../../model/userTokens');
const PushNotification = require('../../../model/pushNotification');
const role = require('../../../model/role');
const userRole = require('../../../model/userRole');
const dayjs = require('dayjs');
const userSchemaKey = require('../../../utils/validation/userValidation');
const validation = require('../../../utils/validateRequest');
const authConstant = require('../../../constants/authConstant');
const authService = require('../../../services/auth');
const common = require('../../../utils/common');

/**
 * @description : user registration 
 * @param {Object} req : request for register
 * @param {Object} res : response for register
 * @return {Object} : response for register {status, message, data}
 */
const register = async (req, res) => {
  try {
    let validateRequest = validation.validateParamsWithJoi(
      req.body,
      userSchemaKey.schemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `Invalid values in parameters, ${validateRequest.message}` });
    }
    let isEmptyPassword = false;
    if (!req.body.password) {
      isEmptyPassword = true;
      req.body.password = Math.random().toString(36).slice(2);
    }
    const data = new User({
      ...req.body,
      userType: authConstant.USER_TYPES.Applicant
    });

    let checkUniqueFields = await common.checkUniqueFieldsInDatabase(User, ['email'], data, 'INSERT');
    if (checkUniqueFields.isDuplicate) {
      return res.validationError({ message: `${checkUniqueFields.value} already exists.Unique ${checkUniqueFields.field} are allowed.` });
    }

    const result = await dbService.create(User, data);
    if (result && result.id) {
      let defaultRole = await dbService.findOne(role, { name: authConstant.DEFAULT_USER_ROLE });
      if (defaultRole && defaultRole.id) {
        await dbService.create(userRole, {
          userId: result.id,
          roleId: defaultRole.id
        });
      }
    }
    if (isEmptyPassword && req.body.email) {
      await authService.sendPasswordByEmail({
        email: req.body.email,
        password: req.body.password
      });
    }
    if (isEmptyPassword && req.body.mobileNo) {
      await authService.sendPasswordBySMS({
        mobileNo: req.body.mobileNo,
        password: req.body.password
      });
    }
    return res.success({ data: result });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : send OTP to user for login
 * @param {Object} req : request for sendOtpForLogin
 * @param {Object} res : response for sendOtpForLogin
 * @return {Object} : response for sendOtpForLogin {status, message, data}
 */
const sendOtpForTwoFA = async (req, res) => {
  try {
    let params = req.body;
    if (!params.username || !params.password) {
      return res.badRequest({ message: 'Insufficient request parameters! username and password is required.' });
    }
    let result = await authService.sendLoginOTP(params.username, params.password);
    if (result.flag) {
      return res.failure({ message: result.data });
    }
    return res.success({ message: result.data });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : login with OTP
 * @param {Object} req : request for loginWithOTP
 * @param {Object} res : response for loginWithOTP
 * @return {Object} : response for loginWithOTP {status, message, data}
 */
const loginWithTwoFA = async (req, res) => {
  try {
    const params = req.body;

    if (params.email) {
      params.username = params.email.toString().toLowerCase();
    }
    console.log(params);
    if (!params.code || !params.username || !params.password) {
      return res.badRequest({ message: 'Insufficient request parameters! username,password and code is required.' });
    }
    let where = { 'email': params.username };
    where.isActive = true; where.isDeleted = false; let user = await dbService.findOne(User, where);
    if (!user || !user.loginOTP.expireTime) {
      return res.badRequest({ message: 'Invalid Code' });
    }
    if (dayjs(new Date()).isAfter(dayjs(user.loginOTP.expireTime))) {
      return res.badRequest({ message: 'Your reset password link is expired' });
    }
    if (user.loginOTP.code !== params.code) {
      return res.badRequest({ message: 'Invalid Code' });
    }
    let roleAccess = false;
    if (req.body.includeRoleAccess) {
      roleAccess = req.body.includeRoleAccess;
    }
    let result = await authService.loginWithOTP(params.username, params.password, authConstant.PLATFORM.CLIENT, roleAccess);
    if (result.flag) {
      return res.badRequest({ message: result.data });
    }
    return res.success({ data: result.data });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : send email or sms to user with OTP on forgot password
 * @param {Object} req : request for forgotPassword
 * @param {Object} res : response for forgotPassword
 * @return {Object} : response for forgotPassword {status, message, data}
 */
const forgotPassword = async (req, res) => {
  const params = req.body;
  try {
    if (!params.email) {
      return res.badRequest({ message: 'Insufficient request parameters! email is required.' });
    }
    let where = { email: params.email };
    where.isActive = true; where.isDeleted = false; params.email = params.email.toString().toLowerCase();
    let found = await dbService.findOne(User, where);
    if (!found) {
      return res.recordNotFound();
    }
    let {
      resultOfEmail, resultOfSMS
    } = await authService.sendResetPasswordNotification(found);
    if (resultOfEmail && resultOfSMS) {
      return res.success({ message: 'otp successfully send.' });
    } else if (resultOfEmail && !resultOfSMS) {
      return res.success({ message: 'otp successfully send to your email.' });
    } else if (!resultOfEmail && resultOfSMS) {
      return res.success({ message: 'otp successfully send to your mobile number.' });
    } else {
      return res.failure({ message: 'otp can not be sent due to some issue try again later' });
    }
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : validate OTP
 * @param {Object} req : request for validateResetPasswordOtp
 * @param {Object} res : response for validateResetPasswordOtp
 * @return {Object} : response for validateResetPasswordOtp  {status, message, data}
 */
const validateResetPasswordOtp = async (req, res) => {
  const params = req.body;
  try {
    if (!params.otp) {
      return res.badRequest({ message: 'Insufficient request parameters! otp is required.' });
    }
    const where = {
      'resetPasswordLink.code': params.otp,
      isActive: true,
      isDeleted: false,
    };
    let found = await dbService.findOne(User, where);
    if (!found || !found.resetPasswordLink.expireTime) {
      return res.failure({ message: 'Invalid OTP' });
    }
    if (dayjs(new Date()).isAfter(dayjs(found.resetPasswordLink.expireTime))) {
      return res.failure({ message: 'Your reset password link is expired or invalid' });
    }
    await dbService.updateOne(User, found.id, { resetPasswordLink: {} });
    return res.success({ message: 'OTP verified' });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : reset password with code and new password
 * @param {Object} req : request for resetPassword
 * @param {Object} res : response for resetPassword
 * @return {Object} : response for resetPassword {status, message, data}
 */
const resetPassword = async (req, res) => {
  const params = req.body;
  try {
    if (!params.code || !params.newPassword) {
      return res.badRequest({ message: 'Insufficient request parameters! code and newPassword is required.' });
    }
    const where = {
      'resetPasswordLink.code': params.code,
      isActive: true,
      isDeleted: false,
    };
    let found = await dbService.findOne(User, where);
    if (!found || !found.resetPasswordLink.expireTime) {
      return res.failure({ message: 'Invalid Code' });
    }
    if (dayjs(new Date()).isAfter(dayjs(found.resetPasswordLink.expireTime))) {
      return res.failure({ message: 'Your reset password link is expired or invalid' });
    }
    let response = await authService.resetPassword(found, params.newPassword);
    if (!response || response.flag) {
      return res.failure({ message: response.data });
    }
    return res.success({ message: response.data });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : logout user
 * @param {Object} req : request for logout
 * @param {Object} res : response for logout
 * @return {Object} : response for logout {status, message, data}
 */
const logout = async (req, res) => {
  try {
    let userToken = await dbService.findOne(userTokens, {
      token: (req.headers.authorization).replace('Bearer ', ''),
      userId: req.user.id
    });
    let updatedDocument = { isTokenExpired: true };
    await dbService.updateOne(userTokens, { _id: userToken.id }, updatedDocument);
    let found = await dbService.findOne(PushNotification, { userId: req.user.id });
    if (found) {
      await dbService.updateOne(PushNotification, { _id: found.id }, { isActive: false });
    }
    return res.success({ message: 'Logged Out Successfully' });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : adding PlayerIDs to send push notification
 * @param {Object} req : request for addPlayerId
 * @param {Object} res : response for addPlayerId
 * @return {Object} : response for addPlayerId {status, message, data}
 */
const addPlayerId = async (req, res) => {
  try {
    let params = req.body;
    if (!params.userId || !params.playerId) {
      return res.badRequest({ message: 'Insufficient request parameters! userId and playerId is required.' });
    }
    let found = await dbService.findOne(PushNotification, { userId: params.userId });
    if (found) {
      await dbService.updateOne(PushNotification, { _id: found.id }, { playerId: params.playerId });
    } else {
      await dbService.create(PushNotification, params);
    }
    return res.success({ message: 'PlayerId added' });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : removing PlayerIDs to send push notification
 * @param {Object} req : request for removePlayerId
 * @param {Object} res : response for removePlayerId
 * @return {Object} : response for removePlayerId {status, message, data}
 */
const removePlayerId = async (req, res) => {
  try {
    let params = req.body;
    if (!params.deviceId) {
      return res.badRequest({ message: 'Insufficient request parameters! deviceId is required.' });
    }
    await dbService.deleteOne(PushNotification, { deviceId: params.deviceId });
    return res.success({ message: 'PlayerId Removed' });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

module.exports = {
  register,
  sendOtpForTwoFA,
  loginWithTwoFA,
  forgotPassword,
  validateResetPasswordOtp,
  resetPassword,
  logout,
  addPlayerId,
  removePlayerId
};