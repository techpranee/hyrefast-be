/**
 * recruiterController.js
 * @description : exports action methods for recruiter.
 */

const Recruiter = require('../../../model/recruiter');
const recruiterSchemaKey = require('../../../utils/validation/recruiterValidation');
const validation = require('../../../utils/validateRequest');
const dbService = require('../../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const utils = require('../../../utils/common');
   
/**
 * @description : create document of Recruiter in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created Recruiter. {status, message, data}
 */ 
const addRecruiter = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      recruiterSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    dataToCreate.addedBy = req.user.id;
    dataToCreate = new Recruiter(dataToCreate);
    let createdRecruiter = await dbService.create(Recruiter,dataToCreate);
    return res.success({ data : createdRecruiter });
  } catch (error) {
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : create multiple documents of Recruiter in mongodb collection.
 * @param {Object} req : request including body for creating documents.
 * @param {Object} res : response of created documents.
 * @return {Object} : created Recruiters. {status, message, data}
 */
const bulkInsertRecruiter = async (req,res)=>{
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
    let createdRecruiters = await dbService.create(Recruiter,dataToCreate);
    createdRecruiters = { count: createdRecruiters ? createdRecruiters.length : 0 };
    return res.success({ data:{ count:createdRecruiters.count || 0 } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : find all documents of Recruiter from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found Recruiter(s). {status, message, data}
 */
const findAllRecruiter = async (req,res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      recruiterSchemaKey.findFilterKeys,
      Recruiter.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly){
      let totalRecords = await dbService.count(Recruiter, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundRecruiters = await dbService.paginate( Recruiter,query,options);
    if (!foundRecruiters || !foundRecruiters.data || !foundRecruiters.data.length){
      return res.recordNotFound(); 
    }
    return res.success({ data :foundRecruiters });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
        
/**
 * @description : find document of Recruiter from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found Recruiter. {status, message, data}
 */
const getRecruiter = async (req,res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message : 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundRecruiter = await dbService.findOne(Recruiter,query, options);
    if (!foundRecruiter){
      return res.recordNotFound();
    }
    return res.success({ data :foundRecruiter });
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : returns total number of documents of Recruiter.
 * @param {Object} req : request including where object to apply filters in req body 
 * @param {Object} res : response that returns total number of documents.
 * @return {Object} : number of documents. {status, message, data}
 */
const getRecruiterCount = async (req,res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      recruiterSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedRecruiter = await dbService.count(Recruiter,where);
    return res.success({ data : { count: countedRecruiter } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : update document of Recruiter with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated Recruiter.
 * @return {Object} : updated Recruiter. {status, message, data}
 */
const updateRecruiter = async (req,res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      recruiterSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedRecruiter = await dbService.updateOne(Recruiter,query,dataToUpdate);
    if (!updatedRecruiter){
      return res.recordNotFound();
    }
    return res.success({ data :updatedRecruiter });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

/**
 * @description : update multiple records of Recruiter with data by filter.
 * @param {Object} req : request including filter and data in request body.
 * @param {Object} res : response of updated Recruiters.
 * @return {Object} : updated Recruiters. {status, message, data}
 */
const bulkUpdateRecruiter = async (req,res)=>{
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
    let updatedRecruiter = await dbService.updateMany(Recruiter,filter,dataToUpdate);
    if (!updatedRecruiter){
      return res.recordNotFound();
    }
    return res.success({ data :{ count : updatedRecruiter } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : partially update document of Recruiter with data by id;
 * @param {obj} req : request including id in request params and data in request body.
 * @param {obj} res : response of updated Recruiter.
 * @return {obj} : updated Recruiter. {status, message, data}
 */
const partialUpdateRecruiter = async (req,res) => {
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
      recruiterSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedRecruiter = await dbService.updateOne(Recruiter, query, dataToUpdate);
    if (!updatedRecruiter) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedRecruiter });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
/**
 * @description : deactivate document of Recruiter from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains updated document of Recruiter.
 * @return {Object} : deactivated Recruiter. {status, message, data}
 */
const softDeleteRecruiter = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    let query = { _id:req.params.id };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedRecruiter = await dbService.updateOne(Recruiter, query, updateBody);
    if (!updatedRecruiter){
      return res.recordNotFound();
    }
    return res.success({ data:updatedRecruiter });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

/**
 * @description : delete document of Recruiter from table.
 * @param {Object} req : request including id as req param.
 * @param {Object} res : response contains deleted document.
 * @return {Object} : deleted Recruiter. {status, message, data}
 */
const deleteRecruiter = async (req,res) => {
  try { 
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    const deletedRecruiter = await dbService.deleteOne(Recruiter, query);
    if (!deletedRecruiter){
      return res.recordNotFound();
    }
    return res.success({ data :deletedRecruiter });
        
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : delete documents of Recruiter in table by using ids.
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains no of documents deleted.
 * @return {Object} : no of documents deleted. {status, message, data}
 */
const deleteManyRecruiter = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const deletedRecruiter = await dbService.deleteMany(Recruiter,query);
    if (!deletedRecruiter){
      return res.recordNotFound();
    }
    return res.success({ data :{ count :deletedRecruiter } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
/**
 * @description : deactivate multiple documents of Recruiter from table by ids;
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains updated documents of Recruiter.
 * @return {Object} : number of deactivated documents of Recruiter. {status, message, data}
 */
const softDeleteManyRecruiter = async (req,res) => {
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
    let updatedRecruiter = await dbService.updateMany(Recruiter,query, updateBody);
    if (!updatedRecruiter) {
      return res.recordNotFound();
    }
    return res.success({ data:{ count :updatedRecruiter } });
        
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

module.exports = {
  addRecruiter,
  bulkInsertRecruiter,
  findAllRecruiter,
  getRecruiter,
  getRecruiterCount,
  updateRecruiter,
  bulkUpdateRecruiter,
  partialUpdateRecruiter,
  softDeleteRecruiter,
  deleteRecruiter,
  deleteManyRecruiter,
  softDeleteManyRecruiter    
};