/**
 * applicationController.js
 * @description : exports action methods for application.
 */

const Application = require('../../../model/application');
const applicationSchemaKey = require('../../../utils/validation/applicationValidation');
const validation = require('../../../utils/validateRequest');
const dbService = require('../../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const utils = require('../../../utils/common');
   
/**
 * @description : create document of Application in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created Application. {status, message, data}
 */ 
const addApplication = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      applicationSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    dataToCreate.addedBy = req.user.id;
    dataToCreate = new Application(dataToCreate);
    let createdApplication = await dbService.create(Application,dataToCreate);
    return res.success({ data : createdApplication });
  } catch (error) {
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : create multiple documents of Application in mongodb collection.
 * @param {Object} req : request including body for creating documents.
 * @param {Object} res : response of created documents.
 * @return {Object} : created Applications. {status, message, data}
 */
const bulkInsertApplication = async (req,res)=>{
  try {
    if (req.body && (!Array.isArray(req.body.data) || req.body.data.length < 1)) {
      return res.badRequest();
    }
    let dataToCreate = [ ...req.body.data ];
    for (let i = 0;i < dataToCreate.length;i++){
      dataToCreate[i] = {
        ...dataToCreate[i],
        addedBy: req.user.id
      };
    }
    let createdApplications = await dbService.create(Application,dataToCreate);
    createdApplications = { count: createdApplications ? createdApplications.length : 0 };
    return res.success({ data:{ count:createdApplications.count || 0 } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : find all documents of Application from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found Application(s). {status, message, data}
 */
const findAllApplication = async (req,res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      applicationSchemaKey.findFilterKeys,
      Application.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly){
      let totalRecords = await dbService.count(Application, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundApplications = await dbService.paginate( Application,query,options);
    if (!foundApplications || !foundApplications.data || !foundApplications.data.length){
      return res.recordNotFound(); 
    }
    return res.success({ data :foundApplications });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
        
/**
 * @description : find document of Application from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found Application. {status, message, data}
 */
const getApplication = async (req,res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message : 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundApplication = await dbService.findOne(Application,query, options);
    if (!foundApplication){
      return res.recordNotFound();
    }
    return res.success({ data :foundApplication });
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : returns total number of documents of Application.
 * @param {Object} req : request including where object to apply filters in req body 
 * @param {Object} res : response that returns total number of documents.
 * @return {Object} : number of documents. {status, message, data}
 */
const getApplicationCount = async (req,res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      applicationSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedApplication = await dbService.count(Application,where);
    return res.success({ data : { count: countedApplication } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : update document of Application with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated Application.
 * @return {Object} : updated Application. {status, message, data}
 */
const updateApplication = async (req,res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      applicationSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedApplication = await dbService.updateOne(Application,query,dataToUpdate);
    if (!updatedApplication){
      return res.recordNotFound();
    }
    return res.success({ data :updatedApplication });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

/**
 * @description : update multiple records of Application with data by filter.
 * @param {Object} req : request including filter and data in request body.
 * @param {Object} res : response of updated Applications.
 * @return {Object} : updated Applications. {status, message, data}
 */
const bulkUpdateApplication = async (req,res)=>{
  try {
    let filter = req.body && req.body.filter ? { ...req.body.filter } : {};
    let dataToUpdate = {};
    delete dataToUpdate['addedBy'];
    if (req.body && typeof req.body.data === 'object' && req.body.data !== null) {
      dataToUpdate = { 
        ...req.body.data,
        updatedBy : req.user.id
      };
    }
    let updatedApplication = await dbService.updateMany(Application,filter,dataToUpdate);
    if (!updatedApplication){
      return res.recordNotFound();
    }
    return res.success({ data :{ count : updatedApplication } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : partially update document of Application with data by id;
 * @param {obj} req : request including id in request params and data in request body.
 * @param {obj} res : response of updated Application.
 * @return {obj} : updated Application. {status, message, data}
 */
const partialUpdateApplication = async (req,res) => {
  try {
    if (!req.params.id){
      res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    delete req.body['addedBy'];
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      applicationSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedApplication = await dbService.updateOne(Application, query, dataToUpdate);
    if (!updatedApplication) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedApplication });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
/**
 * @description : deactivate document of Application from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains updated document of Application.
 * @return {Object} : deactivated Application. {status, message, data}
 */
const softDeleteApplication = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    let query = { _id:req.params.id };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedApplication = await dbService.updateOne(Application, query, updateBody);
    if (!updatedApplication){
      return res.recordNotFound();
    }
    return res.success({ data:updatedApplication });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

/**
 * @description : delete document of Application from table.
 * @param {Object} req : request including id as req param.
 * @param {Object} res : response contains deleted document.
 * @return {Object} : deleted Application. {status, message, data}
 */
const deleteApplication = async (req,res) => {
  try { 
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    const deletedApplication = await dbService.deleteOne(Application, query);
    if (!deletedApplication){
      return res.recordNotFound();
    }
    return res.success({ data :deletedApplication });
        
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : delete documents of Application in table by using ids.
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains no of documents deleted.
 * @return {Object} : no of documents deleted. {status, message, data}
 */
const deleteManyApplication = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const deletedApplication = await dbService.deleteMany(Application,query);
    if (!deletedApplication){
      return res.recordNotFound();
    }
    return res.success({ data :{ count :deletedApplication } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
/**
 * @description : deactivate multiple documents of Application from table by ids;
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains updated documents of Application.
 * @return {Object} : number of deactivated documents of Application. {status, message, data}
 */
const softDeleteManyApplication = async (req,res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedApplication = await dbService.updateMany(Application,query, updateBody);
    if (!updatedApplication) {
      return res.recordNotFound();
    }
    return res.success({ data:{ count :updatedApplication } });
        
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

module.exports = {
  addApplication,
  bulkInsertApplication,
  findAllApplication,
  getApplication,
  getApplicationCount,
  updateApplication,
  bulkUpdateApplication,
  partialUpdateApplication,
  softDeleteApplication,
  deleteApplication,
  deleteManyApplication,
  softDeleteManyApplication    
};