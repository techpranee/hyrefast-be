/**
 * responseController.js
 * @description : exports action methods for response.
 */

const Response = require('../../../model/response');
const responseSchemaKey = require('../../../utils/validation/responseValidation');
const validation = require('../../../utils/validateRequest');
const dbService = require('../../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const utils = require('../../../utils/common');
   
/**
 * @description : create document of Response in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created Response. {status, message, data}
 */ 
const addResponse = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      responseSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    dataToCreate.addedBy = req.user.id;
    dataToCreate = new Response(dataToCreate);
    let createdResponse = await dbService.create(Response,dataToCreate);
    return res.success({ data : createdResponse });
  } catch (error) {
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : create multiple documents of Response in mongodb collection.
 * @param {Object} req : request including body for creating documents.
 * @param {Object} res : response of created documents.
 * @return {Object} : created Responses. {status, message, data}
 */
const bulkInsertResponse = async (req,res)=>{
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
    let createdResponses = await dbService.create(Response,dataToCreate);
    createdResponses = { count: createdResponses ? createdResponses.length : 0 };
    return res.success({ data:{ count:createdResponses.count || 0 } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : find all documents of Response from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found Response(s). {status, message, data}
 */
const findAllResponse = async (req,res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      responseSchemaKey.findFilterKeys,
      Response.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly){
      let totalRecords = await dbService.count(Response, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundResponses = await dbService.paginate( Response,query,options);
    if (!foundResponses || !foundResponses.data || !foundResponses.data.length){
      return res.recordNotFound(); 
    }
    return res.success({ data :foundResponses });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
        
/**
 * @description : find document of Response from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found Response. {status, message, data}
 */
const getResponse = async (req,res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message : 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundResponse = await dbService.findOne(Response,query, options);
    if (!foundResponse){
      return res.recordNotFound();
    }
    return res.success({ data :foundResponse });
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : returns total number of documents of Response.
 * @param {Object} req : request including where object to apply filters in req body 
 * @param {Object} res : response that returns total number of documents.
 * @return {Object} : number of documents. {status, message, data}
 */
const getResponseCount = async (req,res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      responseSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedResponse = await dbService.count(Response,where);
    return res.success({ data : { count: countedResponse } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : update document of Response with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated Response.
 * @return {Object} : updated Response. {status, message, data}
 */
const updateResponse = async (req,res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      responseSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedResponse = await dbService.updateOne(Response,query,dataToUpdate);
    if (!updatedResponse){
      return res.recordNotFound();
    }
    return res.success({ data :updatedResponse });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

/**
 * @description : update multiple records of Response with data by filter.
 * @param {Object} req : request including filter and data in request body.
 * @param {Object} res : response of updated Responses.
 * @return {Object} : updated Responses. {status, message, data}
 */
const bulkUpdateResponse = async (req,res)=>{
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
    let updatedResponse = await dbService.updateMany(Response,filter,dataToUpdate);
    if (!updatedResponse){
      return res.recordNotFound();
    }
    return res.success({ data :{ count : updatedResponse } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : partially update document of Response with data by id;
 * @param {obj} req : request including id in request params and data in request body.
 * @param {obj} res : response of updated Response.
 * @return {obj} : updated Response. {status, message, data}
 */
const partialUpdateResponse = async (req,res) => {
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
      responseSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedResponse = await dbService.updateOne(Response, query, dataToUpdate);
    if (!updatedResponse) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedResponse });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
/**
 * @description : deactivate document of Response from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains updated document of Response.
 * @return {Object} : deactivated Response. {status, message, data}
 */
const softDeleteResponse = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    let query = { _id:req.params.id };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedResponse = await dbService.updateOne(Response, query, updateBody);
    if (!updatedResponse){
      return res.recordNotFound();
    }
    return res.success({ data:updatedResponse });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

/**
 * @description : delete document of Response from table.
 * @param {Object} req : request including id as req param.
 * @param {Object} res : response contains deleted document.
 * @return {Object} : deleted Response. {status, message, data}
 */
const deleteResponse = async (req,res) => {
  try { 
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    const deletedResponse = await dbService.deleteOne(Response, query);
    if (!deletedResponse){
      return res.recordNotFound();
    }
    return res.success({ data :deletedResponse });
        
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : delete documents of Response in table by using ids.
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains no of documents deleted.
 * @return {Object} : no of documents deleted. {status, message, data}
 */
const deleteManyResponse = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const deletedResponse = await dbService.deleteMany(Response,query);
    if (!deletedResponse){
      return res.recordNotFound();
    }
    return res.success({ data :{ count :deletedResponse } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
/**
 * @description : deactivate multiple documents of Response from table by ids;
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains updated documents of Response.
 * @return {Object} : number of deactivated documents of Response. {status, message, data}
 */
const softDeleteManyResponse = async (req,res) => {
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
    let updatedResponse = await dbService.updateMany(Response,query, updateBody);
    if (!updatedResponse) {
      return res.recordNotFound();
    }
    return res.success({ data:{ count :updatedResponse } });
        
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

module.exports = {
  addResponse,
  bulkInsertResponse,
  findAllResponse,
  getResponse,
  getResponseCount,
  updateResponse,
  bulkUpdateResponse,
  partialUpdateResponse,
  softDeleteResponse,
  deleteResponse,
  deleteManyResponse,
  softDeleteManyResponse    
};