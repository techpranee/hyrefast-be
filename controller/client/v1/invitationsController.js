/**
 * invitationsController.js
 * @description : exports action methods for invitations.
 */

const Invitations = require("../../../model/invitations")
const invitationsSchemaKey = require("../../../utils/validation/invitationsValidation");
const validation = require("../../../utils/validateRequest");
const dbService = require("../../../utils/dbService");
const ObjectId = require("mongodb").ObjectId
const utils = require("../../../utils/common");


   
/**
* @description : create document of Invitations in mongodb collection.
* @param {Object} req : request including body for creating document.
* @param {Object} res : response of created document
* @return {Object} : created Invitations. {status, message, data}
*/ 
const addInvitations = async(req, res) => {
    try {
        let dataToCreate = {...req.body || {}};
        let validateRequest = validation.validateParamsWithJoi(
            dataToCreate,
            invitationsSchemaKey.schemaKeys);
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        dataToCreate.addedBy = req.user.id
        dataToCreate = new Invitations(dataToCreate);
        let createdInvitations = await dbService.create(Invitations,dataToCreate);
        return res.success({data : createdInvitations});
    } catch (error) {
        return res.internalServerError({message:error.message}); 
    }
}
    
/**
* @description : create multiple documents of Invitations in mongodb collection.
* @param {Object} req : request including body for creating documents.
* @param {Object} res : response of created documents.
* @return {Object} : created Invitationss. {status, message, data}
*/
const bulkInsertInvitations = async(req,res)=>{
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
        let createdInvitationss =await dbService.create(Invitations,dataToCreate);
     createdInvitationss = { count: createdInvitationss ? createdInvitationss.length : 0 };
        return res.success({ data:{ count:createdInvitationss.count || 0 } });
    }catch(error){
        return res.internalServerError({message:error.message});
    }
}
    
/**
* @description : find all documents of Invitations from collection based on query and options.
* @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
* @param {Object} res : response contains data found from collection.
* @return {Object} : found Invitations(s). {status, message, data}
*/
const findAllInvitations = async(req,res) => {
    try {
        let options = {};
        let query={};
        let validateRequest = validation.validateFilterWithJoi(
            req.body,
            invitationsSchemaKey.findFilterKeys,
            Invitations.schema.obj
        );
        if (!validateRequest.isValid) {
            return res.validationError({ message: `${validateRequest.message}` });
        }
        if (typeof req.body.query === 'object' && req.body.query !== null) {
            query = { ...req.body.query };
        }
        if(req.body.isCountOnly){
            let totalRecords = await dbService.count(Invitations, query);
            return res.success({ data: { totalRecords } });
        }
        if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
            options = {...req.body.options};
        }
        let foundInvitationss = await dbService.paginate( Invitations,query,options);
        if (!foundInvitationss || !foundInvitationss.data || !foundInvitationss.data.length){
            return res.recordNotFound(); 
        }
        return res.success({data :foundInvitationss});
    } catch(error){
        return res.internalServerError({message:error.message});
    }
}
        
    /**
    * @description : find document of Invitations from table by id;
    * @param {Object} req : request including id in request params.
    * @param {Object} res : response contains document retrieved from table.
    * @return {Object} : found Invitations. {status, message, data}
    */
const getInvitations = async(req,res) => {
    try {
        let query={};
        if (!ObjectId.isValid(req.params.id)) {
            return res.validationError({message : "invalid objectId."});
        }
        query._id = req.params.id;
        let options = {}
        let foundInvitations = await dbService.findOne(Invitations,query, options);
        if(!foundInvitations){
            return res.recordNotFound();
        }
        return res.success({data :foundInvitations});
    }
    catch(error){
        return res.internalServerError({message:error.message})
    }
}
    
/**
* @description : returns total number of documents of Invitations.
* @param {Object} req : request including where object to apply filters in req body 
* @param {Object} res : response that returns total number of documents.
* @return {Object} : number of documents. {status, message, data}
*/
const getInvitationsCount = async(req,res) => {
    try {
        let where ={};
        let validateRequest = validation.validateFilterWithJoi(
            req.body,
            invitationsSchemaKey.findFilterKeys,
        );
        if (!validateRequest.isValid) {
            return res.validationError({ message: `${validateRequest.message}` });
        }
        if (typeof req.body.where === 'object' && req.body.where !== null) {
            where = {...req.body.where};
        }
        let countedInvitations = await dbService.count(Invitations,where);
        return res.success({ data : { count: countedInvitations } });
    } catch(error){
        return res.internalServerError({message:error.message});
    }
};

    
/**
* @description : update document of Invitations with data by id.
* @param {Object} req : request including id in request params and data in request body.
* @param {Object} res : response of updated Invitations.
* @return {Object} : updated Invitations. {status, message, data}
*/
const updateInvitations = async(req,res) => {
    try {
        let dataToUpdate = {
            ...req.body,
            updatedBy:req.user.id,
        }
        let validateRequest = validation.validateParamsWithJoi(
            dataToUpdate,
            invitationsSchemaKey.updateSchemaKeys
        );
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        const query = {_id:req.params.id}
        let updatedInvitations = await dbService.updateOne(Invitations,query,dataToUpdate);
        if(!updatedInvitations){
            return res.recordNotFound();
        }
        return res.success({data :updatedInvitations});
    } catch(error){
        return res.internalServerError({message:error.message});
    }
}

/**
* @description : update multiple records of Invitations with data by filter.
* @param {Object} req : request including filter and data in request body.
* @param {Object} res : response of updated Invitationss.
* @return {Object} : updated Invitationss. {status, message, data}
*/
const bulkUpdateInvitations=async(req,res)=>{
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
        let updatedInvitations = await dbService.updateMany(Invitations,filter,dataToUpdate);
        if(!updatedInvitations){
            return res.recordNotFound();
        }
        return res.success({data :{ count : updatedInvitations } });
    } catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
    /**
    * @description : partially update document of Invitations with data by id;
    * @param {obj} req : request including id in request params and data in request body.
    * @param {obj} res : response of updated Invitations.
    * @return {obj} : updated Invitations. {status, message, data}
    */
const partialUpdateInvitations = async(req,res) => {
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
            invitationsSchemaKey.updateSchemaKeys
        );
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        const query = {_id:req.params.id}
        let updatedInvitations = await dbService.updateOne(Invitations, query, dataToUpdate);
        if (!updatedInvitations) {
            return res.recordNotFound();
        }
        return res.success({data:updatedInvitations});
    } catch(error){
        return res.internalServerError({message:error.message})
    }
}
/**
* @description : deactivate document of Invitations from table by id;
* @param {Object} req : request including id in request params.
* @param {Object} res : response contains updated document of Invitations.
* @return {Object} : deactivated Invitations. {status, message, data}
*/
const softDeleteInvitations = async(req,res) => {
    try{
        if(!req.params.id){
            return res.badRequest({message : "Insufficient request parameters! id is required."});
        }
        let query = {_id:req.params.id}
        const updateBody = {
            isDeleted: true,
            updatedBy: req.user.id,
        }
        let updatedInvitations = await dbService.updateOne(Invitations, query, updateBody);
        if(!updatedInvitations){
            return res.recordNotFound();
        }
        return res.success({data:updatedInvitations});
    }catch(error){
        return res.internalServerError({message:error.message}); 
    }
}

/**
* @description : delete document of Invitations from table.
* @param {Object} req : request including id as req param.
* @param {Object} res : response contains deleted document.
* @return {Object} : deleted Invitations. {status, message, data}
*/
const deleteInvitations =async(req,res) => {
    try { 
        if(!req.params.id){
            return res.badRequest({message : "Insufficient request parameters! id is required."});
        }
        const query = {_id:req.params.id};
        const deletedInvitations = await dbService.deleteOne(Invitations, query);
        if(!deletedInvitations){
            return res.recordNotFound();
        }
        return res.success({data :deletedInvitations});
        
    }
    catch(error){
        return res.internalServerError({message:error.message});
    }
}
    
/**
* @description : delete documents of Invitations in table by using ids.
* @param {Object} req : request including array of ids in request body.
* @param {Object} res : response contains no of documents deleted.
* @return {Object} : no of documents deleted. {status, message, data}
*/
const deleteManyInvitations =async(req, res) => {
    try{
        let ids = req.body.ids;
        if (!ids || !Array.isArray(ids) || ids.length < 1) {
            return res.badRequest();
        }
        const query = {_id:{$in:ids}};
        const deletedInvitations = await dbService.deleteMany(Invitations,query);
        if(!deletedInvitations){
            return res.recordNotFound();
        }
        return res.success({data :{count :deletedInvitations} });
    } catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
/**
* @description : deactivate multiple documents of Invitations from table by ids;
* @param {Object} req : request including array of ids in request body.
* @param {Object} res : response contains updated documents of Invitations.
* @return {Object} : number of deactivated documents of Invitations. {status, message, data}
*/
const softDeleteManyInvitations = async(req,res) => {
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
        let updatedInvitations = await dbService.updateMany(Invitations,query, updateBody);
        if (!updatedInvitations) {
            return res.recordNotFound();
        }
        return res.success({data:{count :updatedInvitations} });
        
    }catch(error){
        return res.internalServerError({message:error.message}); 
    }
}

module.exports = {
    addInvitations,bulkInsertInvitations,findAllInvitations,getInvitations,getInvitationsCount,updateInvitations,bulkUpdateInvitations,partialUpdateInvitations,softDeleteInvitations,deleteInvitations,deleteManyInvitations,softDeleteManyInvitations    
}