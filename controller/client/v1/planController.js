/**
 * planController.js
 * @description : exports action methods for plan.
 */

const Plan = require("../../../model/plan")
const planSchemaKey = require("../../../utils/validation/planValidation");
const validation = require("../../../utils/validateRequest");
const dbService = require("../../../utils/dbService");
const ObjectId = require("mongodb").ObjectId
const deleteDependentService = require("../../../utils/deleteDependent");
const utils = require("../../../utils/common");


   
/**
* @description : create document of Plan in mongodb collection.
* @param {Object} req : request including body for creating document.
* @param {Object} res : response of created document
* @return {Object} : created Plan. {status, message, data}
*/ 
const addPlan = async(req, res) => {
    try {
        let dataToCreate = {...req.body || {}};
        let validateRequest = validation.validateParamsWithJoi(
            dataToCreate,
            planSchemaKey.schemaKeys);
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        dataToCreate.addedBy = req.user.id
        dataToCreate = new Plan(dataToCreate);
        let createdPlan = await dbService.create(Plan,dataToCreate);
        return res.success({data : createdPlan});
    } catch (error) {
        return res.internalServerError({message:error.message}); 
    }
}
    
/**
* @description : create multiple documents of Plan in mongodb collection.
* @param {Object} req : request including body for creating documents.
* @param {Object} res : response of created documents.
* @return {Object} : created Plans. {status, message, data}
*/
const bulkInsertPlan = async(req,res)=>{
    try{
        if (req.body && (!Array.isArray(req.body.data) || req.body.data.length < 1)) {
            return res.badRequest();
        }
        let dataToCreate = [ ...req.body.data ];
        for(let i=0;i< dataToCreate.length;i++){
            dataToCreate[i] = {
                ...dataToCreate[i],
                addedBy: req.user.id
            }
        }
        let createdPlans =await dbService.create(Plan,dataToCreate);
     createdPlans = { count: createdPlans ? createdPlans.length : 0 };
        return res.success({ data:{ count:createdPlans.count || 0 } });
    }catch(error){
        return res.internalServerError({message:error.message});
    }
}
    
/**
* @description : find all documents of Plan from collection based on query and options.
* @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
* @param {Object} res : response contains data found from collection.
* @return {Object} : found Plan(s). {status, message, data}
*/
const findAllPlan = async(req,res) => {
    try {
        let options = {};
        let query={};
        let validateRequest = validation.validateFilterWithJoi(
            req.body,
            planSchemaKey.findFilterKeys,
            Plan.schema.obj
        );
        if (!validateRequest.isValid) {
            return res.validationError({ message: `${validateRequest.message}` });
        }
        if (typeof req.body.query === 'object' && req.body.query !== null) {
            query = { ...req.body.query };
        }
        if(req.body.isCountOnly){
            let totalRecords = await dbService.count(Plan, query);
            return res.success({ data: { totalRecords } });
        }
        if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
            options = {...req.body.options};
        }
        let foundPlans = await dbService.paginate( Plan,query,options);
        if (!foundPlans || !foundPlans.data || !foundPlans.data.length){
            return res.recordNotFound(); 
        }
        return res.success({data :foundPlans});
    } catch(error){
        return res.internalServerError({message:error.message});
    }
}
        
    /**
    * @description : find document of Plan from table by id;
    * @param {Object} req : request including id in request params.
    * @param {Object} res : response contains document retrieved from table.
    * @return {Object} : found Plan. {status, message, data}
    */
const getPlan = async(req,res) => {
    try {
        let query={};
        if (!ObjectId.isValid(req.params.id)) {
            return res.validationError({message : "invalid objectId."});
        }
        query._id = req.params.id;
        let options = {}
        let foundPlan = await dbService.findOne(Plan,query, options);
        if(!foundPlan){
            return res.recordNotFound();
        }
        return res.success({data :foundPlan});
    }
    catch(error){
        return res.internalServerError({message:error.message})
    }
}
    
/**
* @description : returns total number of documents of Plan.
* @param {Object} req : request including where object to apply filters in req body 
* @param {Object} res : response that returns total number of documents.
* @return {Object} : number of documents. {status, message, data}
*/
const getPlanCount = async(req,res) => {
    try {
        let where ={};
        let validateRequest = validation.validateFilterWithJoi(
            req.body,
            planSchemaKey.findFilterKeys,
        );
        if (!validateRequest.isValid) {
            return res.validationError({ message: `${validateRequest.message}` });
        }
        if (typeof req.body.where === 'object' && req.body.where !== null) {
            where = {...req.body.where};
        }
        let countedPlan = await dbService.count(Plan,where);
        return res.success({ data : { count: countedPlan } });
    } catch(error){
        return res.internalServerError({message:error.message});
    }
};

    
/**
* @description : update document of Plan with data by id.
* @param {Object} req : request including id in request params and data in request body.
* @param {Object} res : response of updated Plan.
* @return {Object} : updated Plan. {status, message, data}
*/
const updatePlan = async(req,res) => {
    try {
        let dataToUpdate = {
            ...req.body,
            updatedBy:req.user.id,
        }
        let validateRequest = validation.validateParamsWithJoi(
            dataToUpdate,
            planSchemaKey.updateSchemaKeys
        );
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        const query = {_id:req.params.id}
        let updatedPlan = await dbService.updateOne(Plan,query,dataToUpdate);
        if(!updatedPlan){
            return res.recordNotFound();
        }
        return res.success({data :updatedPlan});
    } catch(error){
        return res.internalServerError({message:error.message});
    }
}

/**
* @description : update multiple records of Plan with data by filter.
* @param {Object} req : request including filter and data in request body.
* @param {Object} res : response of updated Plans.
* @return {Object} : updated Plans. {status, message, data}
*/
const bulkUpdatePlan=async(req,res)=>{
    try {
        let filter= req.body && req.body.filter ? {...req.body.filter} : {};
        let dataToUpdate={};
        delete dataToUpdate["addedBy"]
        if (req.body && typeof req.body.data === 'object' && req.body.data !== null) {
            dataToUpdate = { 
                ...req.body.data,
                updatedBy : req.user.id
            }
        }
        let updatedPlan = await dbService.updateMany(Plan,filter,dataToUpdate);
        if(!updatedPlan){
            return res.recordNotFound();
        }
        return res.success({data :{ count : updatedPlan } });
    } catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
    /**
    * @description : partially update document of Plan with data by id;
    * @param {obj} req : request including id in request params and data in request body.
    * @param {obj} res : response of updated Plan.
    * @return {obj} : updated Plan. {status, message, data}
    */
const partialUpdatePlan = async(req,res) => {
    try {
        if(!req.params.id){
            res.badRequest({message : "Insufficient request parameters! id is required."});
        }
        delete req.body["addedBy"]
        let dataToUpdate = {
            ...req.body,
            updatedBy:req.user.id,
        }
        let validateRequest = validation.validateParamsWithJoi(
            dataToUpdate,
            planSchemaKey.updateSchemaKeys
        );
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        const query = {_id:req.params.id}
        let updatedPlan = await dbService.updateOne(Plan, query, dataToUpdate);
        if (!updatedPlan) {
            return res.recordNotFound();
        }
        return res.success({data:updatedPlan});
    } catch(error){
        return res.internalServerError({message:error.message})
    }
}
    
/**
* @description : deactivate document of Plan from table by id;
* @param {Object} req : request including id in request params.
* @param {Object} res : response contains updated document of Plan.
* @return {Object} : deactivated Plan. {status, message, data}
*/
const softDeletePlan = async(req,res) => {
    try{
        if(!req.params.id){
            return res.badRequest({message : "Insufficient request parameters! id is required."});
        }
        const query = {_id:req.params.id}
        const updateBody = {
            isDeleted: true,
            updatedBy: req.user.id,
        }
        let updatedPlan = await deleteDependentService.softDeletePlan(query, updateBody);
        if(!updatedPlan){
            return res.recordNotFound();
        }
        return res.success({data:updatedPlan});
    }catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
/**
* @description : delete document of Plan from table.
* @param {Object} req : request including id as req param.
* @param {Object} res : response contains deleted document.
* @return {Object} : deleted Plan. {status, message, data}
*/
const deletePlan =async(req,res) => {
    try{
        if(!req.params.id){
            return res.badRequest({message : "Insufficient request parameters! id is required."});
        }
        const query = {_id:req.params.id};
        let deletedPlan;
        if (req.body.isWarning) { 
            deletedPlan = await deleteDependentService.countPlan(query);
        } else {
            deletedPlan = await deleteDependentService.deletePlan(query);
        }
        if(!deletedPlan){
            return res.recordNotFound();
        }
        return res.success({data :deletedPlan});
    }
    catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
    /**
    * @description : delete documents of Plan in table by using ids.
    * @param {Object} req : request including array of ids in request body.
    * @param {Object} res : response contains no of documents deleted.
    * @return {Object} : no of documents deleted. {status, message, data}
    */
const deleteManyPlan =async(req, res) => {
    try{
        let ids = req.body.ids;
        if (!ids || !Array.isArray(ids) || ids.length < 1) {
            return res.badRequest();
        }
        const query = {_id:{$in:ids}};
        let deletedPlan;
        if (req.body.isWarning) {
            deletedPlan = await deleteDependentService.countPlan(query);
        }
        else{
            deletedPlan = await deleteDependentService.deletePlan(query);
        }
        if(!deletedPlan){
            return res.recordNotFound();
        }
        return res.success({data :deletedPlan});
    } catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
/**
* @description : deactivate multiple documents of Plan from table by ids;
* @param {Object} req : request including array of ids in request body.
* @param {Object} res : response contains updated documents of Plan.
* @return {Object} : number of deactivated documents of Plan. {status, message, data}
*/
const softDeleteManyPlan = async(req,res) => {
    try{
        let ids = req.body.ids;
        if (!ids || !Array.isArray(ids) || ids.length < 1) {
            return res.badRequest();
        }
        const query = {_id:{$in:ids}}
        const updateBody = {
            isDeleted: true,
            updatedBy: req.user.id,
        }
        let updatedPlan = await deleteDependentService.softDeletePlan(query, updateBody);
        if (!updatedPlan) {
            return res.recordNotFound();
        }
        return res.success({data:updatedPlan });
    }catch(error){
        return res.internalServerError({message:error.message}); 
    }
}

module.exports = {
    addPlan,bulkInsertPlan,findAllPlan,getPlan,getPlanCount,updatePlan,bulkUpdatePlan,partialUpdatePlan,softDeletePlan,deletePlan,deleteManyPlan,softDeleteManyPlan    
}