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
 * @description : Bulk create users with concurrency control and batching
 * @param {Object} req : request including array of user data in body
 * @param {Object} res : response with bulk creation results
 * @return {Object} : bulk creation results {status, message, data}
 */
const addBulkUsers = async (req, res) => {
  try {
    const { users } = req.body;
    
    // Validation
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.validationError({ 
        message: 'Invalid input: users array is required and must not be empty' 
      });
    }

    // Configuration for batching and concurrency control
    const BATCH_SIZE = 5; // Process 5 users at a time
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches
    const MAX_BULK_SIZE = 1000; // Maximum users allowed in single bulk request

    // Check bulk size limit
    if (users.length > MAX_BULK_SIZE) {
      return res.validationError({ 
        message: `Bulk size exceeds maximum limit of ${MAX_BULK_SIZE} users` 
      });
    }

    // Results tracking
    const results = {
      total: users.length,
      created: 0,
      existing: 0,
      errors: [],
      processed: 0
    };

    // Helper function to add delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Cache to avoid duplicate email checks within the same request
    const emailCache = new Map();

    // Function to process a single user
    const processUser = async (userData, index) => {
      try {
        // Basic validation for each user
        const validateRequest = validation.validateParamsWithJoi(
          userData,
          userSchemaKey.schemaKeys
        );
        
        if (!validateRequest.isValid) {
          results.errors.push({
            index: index + 1,
            email: userData.email || 'unknown',
            error: `Validation failed: ${validateRequest.message}`
          });
          return null;
        }

        const email = userData.email;
        
        // Check cache first to avoid duplicate API calls
        if (emailCache.has(email)) {
          const cachedUser = emailCache.get(email);
          if (cachedUser) {
            results.existing++;
            return cachedUser;
          } else {
            // Email was checked and user doesn't exist, create new
            const newUser = new User(userData);
            const createdUser = await dbService.create(User, newUser);
            emailCache.set(email, createdUser);
            results.created++;
            return createdUser;
          }
        }

        // Check for existing user (first time for this email)
        const existingUser = await dbService.findOne(User, { 
          email: email,
          isDeleted: false 
        });
        
        if (existingUser) {
          emailCache.set(email, existingUser);
          results.existing++;
          return existingUser;
        }

        // Create new user
        const newUser = new User(userData);
        const createdUser = await dbService.create(User, newUser);
        emailCache.set(email, createdUser);
        results.created++;
        return createdUser;

      } catch (error) {
        console.error(`Error processing user at index ${index + 1}:`, error);
        results.errors.push({
          index: index + 1,
          email: userData.email || 'unknown',
          error: error.message
        });
        return null;
      }
    };

    // Batch processing function
    const processBatch = async (batch, batchIndex) => {
      console.log(`Processing batch ${batchIndex + 1}/${Math.ceil(users.length / BATCH_SIZE)}`);
      
      // Process batch concurrently
      const promises = batch.map((userData, index) => 
        processUser(userData, (batchIndex * BATCH_SIZE) + index)
      );
      
      const batchResults = await Promise.all(promises);
      results.processed += batch.length;
      
      return batchResults.filter(result => result !== null);
    };

    // Process users in batches
    console.log(`Starting bulk user creation for ${users.length} users`);
    const allCreatedUsers = [];

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE);
      
      try {
        const batchResults = await processBatch(batch, batchIndex);
        allCreatedUsers.push(...batchResults);
        
        // Add delay between batches to prevent API overload
        if (i + BATCH_SIZE < users.length) {
          console.log(`Batch ${batchIndex + 1} completed. Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await delay(DELAY_BETWEEN_BATCHES);
        }
      } catch (batchError) {
        console.error(`Error in batch ${batchIndex + 1}:`, batchError);
        results.errors.push({
          batch: batchIndex + 1,
          error: batchError.message
        });
      }
    }

    // Prepare final response
    const responseData = {
      summary: {
        total: results.total,
        created: results.created,
        existing: results.existing,
        failed: results.errors.length,
        processed: results.processed
      },
      errors: results.errors.length > 0 ? results.errors.slice(0, 10) : [], // Limit errors in response
      hasMoreErrors: results.errors.length > 10
    };

    // Log final results
    console.log(`Bulk user creation completed:`, responseData.summary);

    // Determine response status
    if (results.errors.length === 0) {
      return res.success({ 
        message: `Successfully processed ${results.total} users. Created: ${results.created}, Existing: ${results.existing}`,
        data: responseData
      });
    } else if (results.created + results.existing > 0) {
      return res.success({ 
        message: `Partially successful. Processed ${results.created + results.existing}/${results.total} users. ${results.errors.length} errors occurred.`,
        data: responseData
      });
    } else {
      return res.validationError({ 
        message: `Bulk creation failed. ${results.errors.length} errors occurred.`,
        data: responseData
      });
    }

  } catch (error) {
    console.error('Bulk user creation error:', error);
    return res.internalServerError({ 
      message: 'Failed to process bulk user creation',
      error: error.message 
    });
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
  toggle2FA,
  addBulkUsers   
};