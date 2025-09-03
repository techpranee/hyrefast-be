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
 * @description : find all documents of User from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found User(s). {status, message, data}
 */
const findAllUser = async (req, res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      userSchemaKey.findFilterKeys,
      User.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    
    // Always exclude deleted users
    query.isDeleted = false;
    
    if (req.body.isCountOnly){
      let totalRecords = await dbService.count(User, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundUsers = await dbService.paginate(User, query, options);
    if (!foundUsers || !foundUsers.data || !foundUsers.data.length){
      return res.recordNotFound(); 
    }
    return res.success({ data: foundUsers });
  } catch (error){
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : create document of User in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created User. {status, message, data}
 */ 
const addUser = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      userSchemaKey.schemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    
    // Check for existing user with same email
    const existingUser = await dbService.findOne(User, { 
      email: dataToCreate.email,
      isDeleted: false 
    });
    
    if (existingUser) {
      return res.validationError({ message: 'User with this email already exists' });
    }
    
    dataToCreate = new User(dataToCreate);
    let createdUser = await dbService.create(User, dataToCreate);
    return res.success({ data: createdUser });
  } catch (error) {
    if (error.name === 'ValidationError'){
      return res.validationError({ message : `Invalid Data, Validation Failed at ${ error.message}` });
    }
    if (error.code && error.code === 11000){
      return res.validationError({ message : 'Data duplication found.' });
    }
    return res.internalServerError({ message: error.message }); 
  }
};

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
 * @description : find document of User from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found User. {status, message, data}
 */
const getUser = async (req,res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message : 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundUser = await dbService.findOne(User, query, options);
    if (!foundUser){
      return res.recordNotFound();
    }
    return res.success({ data :foundUser });
  }
  catch (error){
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
 * @description : update document of User with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated User.
 * @return {Object} : updated User. {status, message, data}
 */
const updateUser = async (req,res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedUser = await dbService.updateOne(User,query,dataToUpdate);
    if (!updatedUser){
      return res.recordNotFound();
    }
    return res.success({ data :updatedUser });
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
  findAllUser,
  addUser,
  getLoggedInUserInfo,
  getUser,
  changePassword,
  updateProfile,
  updateUser,
  toggle2FA    
};