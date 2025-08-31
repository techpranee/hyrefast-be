/**
 * workspaceController.js
 * @description : exports action methods for workspace.
 */

const Workspace = require("../../../model/workspace")
const workspaceSchemaKey = require("../../../utils/validation/workspaceValidation");
const validation = require("../../../utils/validateRequest");
const dbService = require("../../../utils/dbService");
const ObjectId = require("mongodb").ObjectId
const deleteDependentService = require("../../../utils/deleteDependent");
const utils = require("../../../utils/common");


   
/**
* @description : create document of Workspace in mongodb collection.
* @param {Object} req : request including body for creating document.
* @param {Object} res : response of created document
* @return {Object} : created Workspace. {status, message, data}
*/ 
const addWorkspace = async(req, res) => {
    try {
        let dataToCreate = {...req.body || {}};
        let validateRequest = validation.validateParamsWithJoi(
            dataToCreate,
            workspaceSchemaKey.schemaKeys);
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        dataToCreate.addedBy = req.user.id
        dataToCreate = new Workspace(dataToCreate);
        let createdWorkspace = await dbService.create(Workspace,dataToCreate);
        return res.success({data : createdWorkspace});
    } catch (error) {
        return res.internalServerError({message:error.message}); 
    }
}
    
/**
* @description : create multiple documents of Workspace in mongodb collection.
* @param {Object} req : request including body for creating documents.
* @param {Object} res : response of created documents.
* @return {Object} : created Workspaces. {status, message, data}
*/
const bulkInsertWorkspace = async(req,res)=>{
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
        let createdWorkspaces =await dbService.create(Workspace,dataToCreate);
     createdWorkspaces = { count: createdWorkspaces ? createdWorkspaces.length : 0 };
        return res.success({ data:{ count:createdWorkspaces.count || 0 } });
    }catch(error){
        return res.internalServerError({message:error.message});
    }
}
    
/**
* @description : find all documents of Workspace from collection based on query and options.
* @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
* @param {Object} res : response contains data found from collection.
* @return {Object} : found Workspace(s). {status, message, data}
*/
const findAllWorkspace = async(req,res) => {
    try {
        let options = {};
        let query={};
        let validateRequest = validation.validateFilterWithJoi(
            req.body,
            workspaceSchemaKey.findFilterKeys,
            Workspace.schema.obj
        );
        if (!validateRequest.isValid) {
            return res.validationError({ message: `${validateRequest.message}` });
        }
        if (typeof req.body.query === 'object' && req.body.query !== null) {
            query = { ...req.body.query };
        }
        if(req.body.isCountOnly){
            let totalRecords = await dbService.count(Workspace, query);
            return res.success({ data: { totalRecords } });
        }
        if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
            options = {...req.body.options};
        }
        let foundWorkspaces = await dbService.paginate( Workspace,query,options);
        if (!foundWorkspaces || !foundWorkspaces.data || !foundWorkspaces.data.length){
            return res.recordNotFound(); 
        }
        return res.success({data :foundWorkspaces});
    } catch(error){
        return res.internalServerError({message:error.message});
    }
}
        
    /**
    * @description : find document of Workspace from table by id;
    * @param {Object} req : request including id in request params.
    * @param {Object} res : response contains document retrieved from table.
    * @return {Object} : found Workspace. {status, message, data}
    */
const getWorkspace = async(req,res) => {
    try {
        let query={};
        if (!ObjectId.isValid(req.params.id)) {
            return res.validationError({message : "invalid objectId."});
        }
        query._id = req.params.id;
        let options = {}
        let foundWorkspace = await dbService.findOne(Workspace,query, options);
        if(!foundWorkspace){
            return res.recordNotFound();
        }
        return res.success({data :foundWorkspace});
    }
    catch(error){
        return res.internalServerError({message:error.message})
    }
}
    
/**
* @description : returns total number of documents of Workspace.
* @param {Object} req : request including where object to apply filters in req body 
* @param {Object} res : response that returns total number of documents.
* @return {Object} : number of documents. {status, message, data}
*/
const getWorkspaceCount = async(req,res) => {
    try {
        let where ={};
        let validateRequest = validation.validateFilterWithJoi(
            req.body,
            workspaceSchemaKey.findFilterKeys,
        );
        if (!validateRequest.isValid) {
            return res.validationError({ message: `${validateRequest.message}` });
        }
        if (typeof req.body.where === 'object' && req.body.where !== null) {
            where = {...req.body.where};
        }
        let countedWorkspace = await dbService.count(Workspace,where);
        return res.success({ data : { count: countedWorkspace } });
    } catch(error){
        return res.internalServerError({message:error.message});
    }
};

    
/**
* @description : update document of Workspace with data by id.
* @param {Object} req : request including id in request params and data in request body.
* @param {Object} res : response of updated Workspace.
* @return {Object} : updated Workspace. {status, message, data}
*/
const updateWorkspace = async(req,res) => {
    try {
        let dataToUpdate = {
            ...req.body,
            updatedBy:req.user.id,
        }
        let validateRequest = validation.validateParamsWithJoi(
            dataToUpdate,
            workspaceSchemaKey.updateSchemaKeys
        );
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        const query = {_id:req.params.id}
        let updatedWorkspace = await dbService.updateOne(Workspace,query,dataToUpdate);
        if(!updatedWorkspace){
            return res.recordNotFound();
        }
        return res.success({data :updatedWorkspace});
    } catch(error){
        return res.internalServerError({message:error.message});
    }
}

/**
* @description : update multiple records of Workspace with data by filter.
* @param {Object} req : request including filter and data in request body.
* @param {Object} res : response of updated Workspaces.
* @return {Object} : updated Workspaces. {status, message, data}
*/
const bulkUpdateWorkspace=async(req,res)=>{
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
        let updatedWorkspace = await dbService.updateMany(Workspace,filter,dataToUpdate);
        if(!updatedWorkspace){
            return res.recordNotFound();
        }
        return res.success({data :{ count : updatedWorkspace } });
    } catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
    /**
    * @description : partially update document of Workspace with data by id;
    * @param {obj} req : request including id in request params and data in request body.
    * @param {obj} res : response of updated Workspace.
    * @return {obj} : updated Workspace. {status, message, data}
    */
const partialUpdateWorkspace = async(req,res) => {
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
            workspaceSchemaKey.updateSchemaKeys
        );
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        const query = {_id:req.params.id}
        let updatedWorkspace = await dbService.updateOne(Workspace, query, dataToUpdate);
        if (!updatedWorkspace) {
            return res.recordNotFound();
        }
        return res.success({data:updatedWorkspace});
    } catch(error){
        return res.internalServerError({message:error.message})
    }
}
    
/**
* @description : deactivate document of Workspace from table by id;
* @param {Object} req : request including id in request params.
* @param {Object} res : response contains updated document of Workspace.
* @return {Object} : deactivated Workspace. {status, message, data}
*/
const softDeleteWorkspace = async(req,res) => {
    try{
        if(!req.params.id){
            return res.badRequest({message : "Insufficient request parameters! id is required."});
        }
        const query = {_id:req.params.id}
        const updateBody = {
            isDeleted: true,
            updatedBy: req.user.id,
        }
        let updatedWorkspace = await deleteDependentService.softDeleteWorkspace(query, updateBody);
        if(!updatedWorkspace){
            return res.recordNotFound();
        }
        return res.success({data:updatedWorkspace});
    }catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
/**
* @description : delete document of Workspace from table.
* @param {Object} req : request including id as req param.
* @param {Object} res : response contains deleted document.
* @return {Object} : deleted Workspace. {status, message, data}
*/
const deleteWorkspace =async(req,res) => {
    try{
        if(!req.params.id){
            return res.badRequest({message : "Insufficient request parameters! id is required."});
        }
        const query = {_id:req.params.id};
        let deletedWorkspace;
        if (req.body.isWarning) { 
            deletedWorkspace = await deleteDependentService.countWorkspace(query);
        } else {
            deletedWorkspace = await deleteDependentService.deleteWorkspace(query);
        }
        if(!deletedWorkspace){
            return res.recordNotFound();
        }
        return res.success({data :deletedWorkspace});
    }
    catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
    /**
    * @description : delete documents of Workspace in table by using ids.
    * @param {Object} req : request including array of ids in request body.
    * @param {Object} res : response contains no of documents deleted.
    * @return {Object} : no of documents deleted. {status, message, data}
    */
const deleteManyWorkspace =async(req, res) => {
    try{
        let ids = req.body.ids;
        if (!ids || !Array.isArray(ids) || ids.length < 1) {
            return res.badRequest();
        }
        const query = {_id:{$in:ids}};
        let deletedWorkspace;
        if (req.body.isWarning) {
            deletedWorkspace = await deleteDependentService.countWorkspace(query);
        }
        else{
            deletedWorkspace = await deleteDependentService.deleteWorkspace(query);
        }
        if(!deletedWorkspace){
            return res.recordNotFound();
        }
        return res.success({data :deletedWorkspace});
    } catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
/**
* @description : deactivate multiple documents of Workspace from table by ids;
* @param {Object} req : request including array of ids in request body.
* @param {Object} res : response contains updated documents of Workspace.
* @return {Object} : number of deactivated documents of Workspace. {status, message, data}
*/
const softDeleteManyWorkspace = async(req,res) => {
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
        let updatedWorkspace = await deleteDependentService.softDeleteWorkspace(query, updateBody);
        if (!updatedWorkspace) {
            return res.recordNotFound();
        }
        return res.success({data:updatedWorkspace });
    }catch(error){
        return res.internalServerError({message:error.message}); 
    }
}

module.exports = {
    addWorkspace,bulkInsertWorkspace,findAllWorkspace,getWorkspace,getWorkspaceCount,updateWorkspace,bulkUpdateWorkspace,partialUpdateWorkspace,softDeleteWorkspace,deleteWorkspace,deleteManyWorkspace,softDeleteManyWorkspace    
}