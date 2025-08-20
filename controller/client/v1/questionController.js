/**
 * questionController.js
 * @description : exports action methods for question.
 */

const Question = require('../../../model/question');
const questionSchemaKey = require('../../../utils/validation/questionValidation');
const validation = require('../../../utils/validateRequest');
const dbService = require('../../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const utils = require('../../../utils/common');
   
/**
 * @description : create document of Question in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created Question. {status, message, data}
 */ 
const addQuestion = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      questionSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    dataToCreate.addedBy = req.user.id;
    dataToCreate = new Question(dataToCreate);
    let createdQuestion = await dbService.create(Question,dataToCreate);
    return res.success({ data : createdQuestion });
  } catch (error) {
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : create multiple documents of Question in mongodb collection.
 * @param {Object} req : request including body for creating documents.
 * @param {Object} res : response of created documents.
 * @return {Object} : created Questions. {status, message, data}
 */
const bulkInsertQuestion = async (req,res)=>{
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
    let createdQuestions = await dbService.create(Question,dataToCreate);
    createdQuestions = { count: createdQuestions ? createdQuestions.length : 0 };
    return res.success({ data:{ count:createdQuestions.count || 0 } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : find all documents of Question from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found Question(s). {status, message, data}
 */
const findAllQuestion = async (req,res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      questionSchemaKey.findFilterKeys,
      Question.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly){
      let totalRecords = await dbService.count(Question, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundQuestions = await dbService.paginate( Question,query,options);
    if (!foundQuestions || !foundQuestions.data || !foundQuestions.data.length){
      return res.recordNotFound(); 
    }
    return res.success({ data :foundQuestions });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
        
/**
 * @description : find document of Question from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found Question. {status, message, data}
 */
const getQuestion = async (req,res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message : 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundQuestion = await dbService.findOne(Question,query, options);
    if (!foundQuestion){
      return res.recordNotFound();
    }
    return res.success({ data :foundQuestion });
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : returns total number of documents of Question.
 * @param {Object} req : request including where object to apply filters in req body 
 * @param {Object} res : response that returns total number of documents.
 * @return {Object} : number of documents. {status, message, data}
 */
const getQuestionCount = async (req,res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      questionSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedQuestion = await dbService.count(Question,where);
    return res.success({ data : { count: countedQuestion } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : update document of Question with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated Question.
 * @return {Object} : updated Question. {status, message, data}
 */
const updateQuestion = async (req,res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      questionSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedQuestion = await dbService.updateOne(Question,query,dataToUpdate);
    if (!updatedQuestion){
      return res.recordNotFound();
    }
    return res.success({ data :updatedQuestion });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

/**
 * @description : update multiple records of Question with data by filter.
 * @param {Object} req : request including filter and data in request body.
 * @param {Object} res : response of updated Questions.
 * @return {Object} : updated Questions. {status, message, data}
 */
const bulkUpdateQuestion = async (req,res)=>{
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
    let updatedQuestion = await dbService.updateMany(Question,filter,dataToUpdate);
    if (!updatedQuestion){
      return res.recordNotFound();
    }
    return res.success({ data :{ count : updatedQuestion } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : partially update document of Question with data by id;
 * @param {obj} req : request including id in request params and data in request body.
 * @param {obj} res : response of updated Question.
 * @return {obj} : updated Question. {status, message, data}
 */
const partialUpdateQuestion = async (req,res) => {
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
      questionSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedQuestion = await dbService.updateOne(Question, query, dataToUpdate);
    if (!updatedQuestion) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedQuestion });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
/**
 * @description : deactivate document of Question from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains updated document of Question.
 * @return {Object} : deactivated Question. {status, message, data}
 */
const softDeleteQuestion = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    let query = { _id:req.params.id };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedQuestion = await dbService.updateOne(Question, query, updateBody);
    if (!updatedQuestion){
      return res.recordNotFound();
    }
    return res.success({ data:updatedQuestion });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

/**
 * @description : delete document of Question from table.
 * @param {Object} req : request including id as req param.
 * @param {Object} res : response contains deleted document.
 * @return {Object} : deleted Question. {status, message, data}
 */
const deleteQuestion = async (req,res) => {
  try { 
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    const deletedQuestion = await dbService.deleteOne(Question, query);
    if (!deletedQuestion){
      return res.recordNotFound();
    }
    return res.success({ data :deletedQuestion });
        
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : delete documents of Question in table by using ids.
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains no of documents deleted.
 * @return {Object} : no of documents deleted. {status, message, data}
 */
const deleteManyQuestion = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const deletedQuestion = await dbService.deleteMany(Question,query);
    if (!deletedQuestion){
      return res.recordNotFound();
    }
    return res.success({ data :{ count :deletedQuestion } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
/**
 * @description : deactivate multiple documents of Question from table by ids;
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains updated documents of Question.
 * @return {Object} : number of deactivated documents of Question. {status, message, data}
 */
const softDeleteManyQuestion = async (req,res) => {
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
    let updatedQuestion = await dbService.updateMany(Question,query, updateBody);
    if (!updatedQuestion) {
      return res.recordNotFound();
    }
    return res.success({ data:{ count :updatedQuestion } });
        
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

module.exports = {
  addQuestion,
  bulkInsertQuestion,
  findAllQuestion,
  getQuestion,
  getQuestionCount,
  updateQuestion,
  bulkUpdateQuestion,
  partialUpdateQuestion,
  softDeleteQuestion,
  deleteQuestion,
  deleteManyQuestion,
  softDeleteManyQuestion    
};