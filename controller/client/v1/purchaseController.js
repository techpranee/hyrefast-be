/**
 * purchaseController.js
 * @description : exports action methods for purchase.
 */

const Purchase = require("../../../model/purchase")
const purchaseSchemaKey = require("../../../utils/validation/purchaseValidation");
const validation = require("../../../utils/validateRequest");
const dbService = require("../../../utils/dbService");
const ObjectId = require("mongodb").ObjectId
const utils = require("../../../utils/common");


   
/**
* @description : create document of Purchase in mongodb collection.
* @param {Object} req : request including body for creating document.
* @param {Object} res : response of created document
* @return {Object} : created Purchase. {status, message, data}
*/ 
const addPurchase = async(req, res) => {
    try {
        let dataToCreate = {...req.body || {}};
        let validateRequest = validation.validateParamsWithJoi(
            dataToCreate,
            purchaseSchemaKey.schemaKeys);
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        dataToCreate.addedBy = req.user.id
        dataToCreate = new Purchase(dataToCreate);
        let createdPurchase = await dbService.create(Purchase,dataToCreate);
        return res.success({data : createdPurchase});
    } catch (error) {
        return res.internalServerError({message:error.message}); 
    }
}
    
/**
* @description : create multiple documents of Purchase in mongodb collection.
* @param {Object} req : request including body for creating documents.
* @param {Object} res : response of created documents.
* @return {Object} : created Purchases. {status, message, data}
*/
const bulkInsertPurchase = async(req,res)=>{
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
        let createdPurchases =await dbService.create(Purchase,dataToCreate);
     createdPurchases = { count: createdPurchases ? createdPurchases.length : 0 };
        return res.success({ data:{ count:createdPurchases.count || 0 } });
    }catch(error){
        return res.internalServerError({message:error.message});
    }
}
    
/**
* @description : find all documents of Purchase from collection based on query and options.
* @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
* @param {Object} res : response contains data found from collection.
* @return {Object} : found Purchase(s). {status, message, data}
*/
const findAllPurchase = async(req,res) => {
    try {
        let options = {};
        let query={};
        let validateRequest = validation.validateFilterWithJoi(
            req.body,
            purchaseSchemaKey.findFilterKeys,
            Purchase.schema.obj
        );
        if (!validateRequest.isValid) {
            return res.validationError({ message: `${validateRequest.message}` });
        }
        if (typeof req.body.query === 'object' && req.body.query !== null) {
            query = { ...req.body.query };
        }
        if(req.body.isCountOnly){
            let totalRecords = await dbService.count(Purchase, query);
            return res.success({ data: { totalRecords } });
        }
        if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
            options = {...req.body.options};
        }
        let foundPurchases = await dbService.paginate( Purchase,query,options);
        if (!foundPurchases || !foundPurchases.data || !foundPurchases.data.length){
            return res.recordNotFound(); 
        }
        return res.success({data :foundPurchases});
    } catch(error){
        return res.internalServerError({message:error.message});
    }
}
        
    /**
    * @description : find document of Purchase from table by id;
    * @param {Object} req : request including id in request params.
    * @param {Object} res : response contains document retrieved from table.
    * @return {Object} : found Purchase. {status, message, data}
    */
const getPurchase = async(req,res) => {
    try {
        let query={};
        if (!ObjectId.isValid(req.params.id)) {
            return res.validationError({message : "invalid objectId."});
        }
        query._id = req.params.id;
        let options = {}
        let foundPurchase = await dbService.findOne(Purchase,query, options);
        if(!foundPurchase){
            return res.recordNotFound();
        }
        return res.success({data :foundPurchase});
    }
    catch(error){
        return res.internalServerError({message:error.message})
    }
}
    
/**
* @description : returns total number of documents of Purchase.
* @param {Object} req : request including where object to apply filters in req body 
* @param {Object} res : response that returns total number of documents.
* @return {Object} : number of documents. {status, message, data}
*/
const getPurchaseCount = async(req,res) => {
    try {
        let where ={};
        let validateRequest = validation.validateFilterWithJoi(
            req.body,
            purchaseSchemaKey.findFilterKeys,
        );
        if (!validateRequest.isValid) {
            return res.validationError({ message: `${validateRequest.message}` });
        }
        if (typeof req.body.where === 'object' && req.body.where !== null) {
            where = {...req.body.where};
        }
        let countedPurchase = await dbService.count(Purchase,where);
        return res.success({ data : { count: countedPurchase } });
    } catch(error){
        return res.internalServerError({message:error.message});
    }
};

    
/**
* @description : update document of Purchase with data by id.
* @param {Object} req : request including id in request params and data in request body.
* @param {Object} res : response of updated Purchase.
* @return {Object} : updated Purchase. {status, message, data}
*/
const updatePurchase = async(req,res) => {
    try {
        let dataToUpdate = {
            ...req.body,
            updatedBy:req.user.id,
        }
        let validateRequest = validation.validateParamsWithJoi(
            dataToUpdate,
            purchaseSchemaKey.updateSchemaKeys
        );
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        const query = {_id:req.params.id}
        let updatedPurchase = await dbService.updateOne(Purchase,query,dataToUpdate);
        if(!updatedPurchase){
            return res.recordNotFound();
        }
        return res.success({data :updatedPurchase});
    } catch(error){
        return res.internalServerError({message:error.message});
    }
}

/**
* @description : update multiple records of Purchase with data by filter.
* @param {Object} req : request including filter and data in request body.
* @param {Object} res : response of updated Purchases.
* @return {Object} : updated Purchases. {status, message, data}
*/
const bulkUpdatePurchase=async(req,res)=>{
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
        let updatedPurchase = await dbService.updateMany(Purchase,filter,dataToUpdate);
        if(!updatedPurchase){
            return res.recordNotFound();
        }
        return res.success({data :{ count : updatedPurchase } });
    } catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
    
    /**
    * @description : partially update document of Purchase with data by id;
    * @param {obj} req : request including id in request params and data in request body.
    * @param {obj} res : response of updated Purchase.
    * @return {obj} : updated Purchase. {status, message, data}
    */
const partialUpdatePurchase = async(req,res) => {
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
            purchaseSchemaKey.updateSchemaKeys
        );
        if (!validateRequest.isValid) {
            return res.validationError({message : `Invalid values in parameters, ${validateRequest.message}`});
        }
        const query = {_id:req.params.id}
        let updatedPurchase = await dbService.updateOne(Purchase, query, dataToUpdate);
        if (!updatedPurchase) {
            return res.recordNotFound();
        }
        return res.success({data:updatedPurchase});
    } catch(error){
        return res.internalServerError({message:error.message})
    }
}
/**
* @description : deactivate document of Purchase from table by id;
* @param {Object} req : request including id in request params.
* @param {Object} res : response contains updated document of Purchase.
* @return {Object} : deactivated Purchase. {status, message, data}
*/
const softDeletePurchase = async(req,res) => {
    try{
        if(!req.params.id){
            return res.badRequest({message : "Insufficient request parameters! id is required."});
        }
        let query = {_id:req.params.id}
        const updateBody = {
            isDeleted: true,
            updatedBy: req.user.id,
        }
        let updatedPurchase = await dbService.updateOne(Purchase, query, updateBody);
        if(!updatedPurchase){
            return res.recordNotFound();
        }
        return res.success({data:updatedPurchase});
    }catch(error){
        return res.internalServerError({message:error.message}); 
    }
}

/**
* @description : delete document of Purchase from table.
* @param {Object} req : request including id as req param.
* @param {Object} res : response contains deleted document.
* @return {Object} : deleted Purchase. {status, message, data}
*/
const deletePurchase =async(req,res) => {
    try { 
        if(!req.params.id){
            return res.badRequest({message : "Insufficient request parameters! id is required."});
        }
        const query = {_id:req.params.id};
        const deletedPurchase = await dbService.deleteOne(Purchase, query);
        if(!deletedPurchase){
            return res.recordNotFound();
        }
        return res.success({data :deletedPurchase});
        
    }
    catch(error){
        return res.internalServerError({message:error.message});
    }
}
    
/**
* @description : delete documents of Purchase in table by using ids.
* @param {Object} req : request including array of ids in request body.
* @param {Object} res : response contains no of documents deleted.
* @return {Object} : no of documents deleted. {status, message, data}
*/
const deleteManyPurchase =async(req, res) => {
    try{
        let ids = req.body.ids;
        if (!ids || !Array.isArray(ids) || ids.length < 1) {
            return res.badRequest();
        }
        const query = {_id:{$in:ids}};
        const deletedPurchase = await dbService.deleteMany(Purchase,query);
        if(!deletedPurchase){
            return res.recordNotFound();
        }
        return res.success({data :{count :deletedPurchase} });
    } catch(error){
        return res.internalServerError({message:error.message}); 
    }
}
/**
* @description : deactivate multiple documents of Purchase from table by ids;
* @param {Object} req : request including array of ids in request body.
* @param {Object} res : response contains updated documents of Purchase.
* @return {Object} : number of deactivated documents of Purchase. {status, message, data}
*/
const softDeleteManyPurchase = async(req,res) => {
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
        let updatedPurchase = await dbService.updateMany(Purchase,query, updateBody);
        if (!updatedPurchase) {
            return res.recordNotFound();
        }
        return res.success({data:{count :updatedPurchase} });
        
    }catch(error){
        return res.internalServerError({message:error.message}); 
    }
}

module.exports = {
    addPurchase,bulkInsertPurchase,findAllPurchase,getPurchase,getPurchaseCount,updatePurchase,bulkUpdatePurchase,partialUpdatePurchase,softDeletePurchase,deletePurchase,deleteManyPurchase,softDeleteManyPurchase    
}