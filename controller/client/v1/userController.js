/**
 * userController.js
 * @description : exports action methods for user.
 */

const User = require('../../../model/user');
const userSchemaKey = require('../../../utils/validation/userValidation');
const validation = require('../../../utils/validateRequest');
const dbService = require('../../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const auth = require('../../../services/auth');
const authConstant = require('../../../constants/authConstant');
const role = require('../../../model/role');
const userRole = require('../../../model/userRole');
const deleteDependentService = require('../../../utils/deleteDependent');
const utils = require('../../../utils/common');

/**
 * @description : get information of logged-in User.
 * @param {Object} req : authentication token is required
 * @param {Object} res : Logged-in user information
 * @return {Object} : Logged-in user information {status, message, data}
 */
const getLoggedInUserInfo = async (req, res) => {
  try {
    const query = {
      _id: req.user.id,
      isDeleted: false 
    };
    query.isActive = true;
    let foundUser = await dbService.findOne(User, query);
    if (!foundUser) {
      return res.recordNotFound();
    }
    return res.success({ data: foundUser });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : change password
 * @param {Object} req : request including user credentials.
 * @param {Object} res : response contains updated user document.
 * @return {Object} : updated user document {status, message, data}
 */
const changePassword = async (req, res) => {
  try {
    let params = req.body;
    if (!req.user.id || !params.newPassword || !params.oldPassword) {
      return res.validationError({ message : 'Please Provide userId, new Password and Old password' });
    }
    let result = await auth.changePassword({
      ...params,
      userId:req.user.id
    });
    if (result.flag){
      return res.failure({ message :result.data });
    }
    return res.success({ message : result.data });
  } catch (error) {
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : update user profile.
 * @param {Object} req : request including user profile details to update in request body.
 * @param {Object} res : updated user document.
 * @return {Object} : updated user document. {status, message, data}
 */
const updateProfile = async (req, res) => {
  try {
    let data = req.body;
    let validateRequest = validation.validateParamsWithJoi(
      data,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    delete data.password;
    delete data.createdAt;
    delete data.updatedAt;
    if (data.id) delete data.id;
    let result = await dbService.updateOne(User,{ _id:req.user.id },data,{ new:true });
    if (!result){
      return res.recordNotFound();
    }            
    return res.success({ data :result });
  } catch (error){
    if (error.name === 'ValidationError'){
      return res.validationError({ message : `Invalid Data, Validation Failed at ${ error.message}` });
    }
    if (error.code && error.code === 11000){
      return res.validationError({ message : 'Data duplication found.' });
    }
    return res.internalServerError({ message:error.message });
  }
};

/**
 * @description : toggle 2FA setting for user
 * @param {Object} req : request including user credentials.
 * @param {Object} res : response contains updated user document.
 * @return {Object} : updated user document {status, message, data}
 */
const toggle2FA = async (req, res) => {
  try {
    if (!req.user.id) {
      return res.badRequest({ message: 'User ID is required.' });
    }
    
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.badRequest({ message: 'enabled field must be a boolean value.' });
    }

    const query = {
      _id: req.user.id,
      isDeleted: false,
      isActive: true
    };

    const dataToUpdate = { twoFactorEnabled: enabled };

    let updatedUser = await dbService.updateOne(User, query, dataToUpdate, { new: true });
    if (!updatedUser) {
      return res.recordNotFound();
    }

    return res.success({ 
      message: `2FA ${enabled ? 'enabled' : 'disabled'} successfully.`,
      data: { twoFactorEnabled: updatedUser.twoFactorEnabled }
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

module.exports = {
  getLoggedInUserInfo,
  changePassword,
  updateProfile,
  toggle2FA    
};