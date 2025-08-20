/**
 * jobController.js
 * @description : exports action methods for job.
 */

const Job = require('../../../model/job');
const jobSchemaKey = require('../../../utils/validation/jobValidation');
const validation = require('../../../utils/validateRequest');
const dbService = require('../../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const deleteDependentService = require('../../../utils/deleteDependent');
const utils = require('../../../utils/common');
   
/**
 * @description : create document of Job in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created Job. {status, message, data}
 */ 
const addJob = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      jobSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    dataToCreate.addedBy = req.user.id;
    dataToCreate = new Job(dataToCreate);
    let createdJob = await dbService.create(Job,dataToCreate);
    return res.success({ data : createdJob });
  } catch (error) {
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : create multiple documents of Job in mongodb collection.
 * @param {Object} req : request including body for creating documents.
 * @param {Object} res : response of created documents.
 * @return {Object} : created Jobs. {status, message, data}
 */
const bulkInsertJob = async (req,res)=>{
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
    let createdJobs = await dbService.create(Job,dataToCreate);
    createdJobs = { count: createdJobs ? createdJobs.length : 0 };
    return res.success({ data:{ count:createdJobs.count || 0 } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : find all documents of Job from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found Job(s). {status, message, data}
 */
const findAllJob = async (req,res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      jobSchemaKey.findFilterKeys,
      Job.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly){
      let totalRecords = await dbService.count(Job, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundJobs = await dbService.paginate( Job,query,options);
    if (!foundJobs || !foundJobs.data || !foundJobs.data.length){
      return res.recordNotFound(); 
    }
    return res.success({ data :foundJobs });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
        
/**
 * @description : find document of Job from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found Job. {status, message, data}
 */
const getJob = async (req,res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message : 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundJob = await dbService.findOne(Job,query, options);
    if (!foundJob){
      return res.recordNotFound();
    }
    return res.success({ data :foundJob });
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : returns total number of documents of Job.
 * @param {Object} req : request including where object to apply filters in req body 
 * @param {Object} res : response that returns total number of documents.
 * @return {Object} : number of documents. {status, message, data}
 */
const getJobCount = async (req,res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      jobSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedJob = await dbService.count(Job,where);
    return res.success({ data : { count: countedJob } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : update document of Job with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated Job.
 * @return {Object} : updated Job. {status, message, data}
 */
const updateJob = async (req,res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      jobSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedJob = await dbService.updateOne(Job,query,dataToUpdate);
    if (!updatedJob){
      return res.recordNotFound();
    }
    return res.success({ data :updatedJob });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

/**
 * @description : update multiple records of Job with data by filter.
 * @param {Object} req : request including filter and data in request body.
 * @param {Object} res : response of updated Jobs.
 * @return {Object} : updated Jobs. {status, message, data}
 */
const bulkUpdateJob = async (req,res)=>{
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
    let updatedJob = await dbService.updateMany(Job,filter,dataToUpdate);
    if (!updatedJob){
      return res.recordNotFound();
    }
    return res.success({ data :{ count : updatedJob } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : partially update document of Job with data by id;
 * @param {obj} req : request including id in request params and data in request body.
 * @param {obj} res : response of updated Job.
 * @return {obj} : updated Job. {status, message, data}
 */
const partialUpdateJob = async (req,res) => {
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
      jobSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedJob = await dbService.updateOne(Job, query, dataToUpdate);
    if (!updatedJob) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedJob });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : deactivate document of Job from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains updated document of Job.
 * @return {Object} : deactivated Job. {status, message, data}
 */
const softDeleteJob = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedJob = await deleteDependentService.softDeleteJob(query, updateBody);
    if (!updatedJob){
      return res.recordNotFound();
    }
    return res.success({ data:updatedJob });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : delete document of Job from table.
 * @param {Object} req : request including id as req param.
 * @param {Object} res : response contains deleted document.
 * @return {Object} : deleted Job. {status, message, data}
 */
const deleteJob = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    let deletedJob;
    if (req.body.isWarning) { 
      deletedJob = await deleteDependentService.countJob(query);
    } else {
      deletedJob = await deleteDependentService.deleteJob(query);
    }
    if (!deletedJob){
      return res.recordNotFound();
    }
    return res.success({ data :deletedJob });
  }
  catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : delete documents of Job in table by using ids.
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains no of documents deleted.
 * @return {Object} : no of documents deleted. {status, message, data}
 */
const deleteManyJob = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    let deletedJob;
    if (req.body.isWarning) {
      deletedJob = await deleteDependentService.countJob(query);
    }
    else {
      deletedJob = await deleteDependentService.deleteJob(query);
    }
    if (!deletedJob){
      return res.recordNotFound();
    }
    return res.success({ data :deletedJob });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : deactivate multiple documents of Job from table by ids;
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains updated documents of Job.
 * @return {Object} : number of deactivated documents of Job. {status, message, data}
 */
const softDeleteManyJob = async (req,res) => {
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
    let updatedJob = await deleteDependentService.softDeleteJob(query, updateBody);
    if (!updatedJob) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedJob });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

module.exports = {
  addJob,
  bulkInsertJob,
  findAllJob,
  getJob,
  getJobCount,
  updateJob,
  bulkUpdateJob,
  partialUpdateJob,
  softDeleteJob,
  deleteJob,
  deleteManyJob,
  softDeleteManyJob    
};