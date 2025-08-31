/**
 * creditController.js
 * @description : exports action methods for credit.
 */

const Credit = require("../../../model/credit")
const Workspace = require("../../../model/workspace")
const creditSchemaKey = require("../../../utils/validation/creditValidation");
const validation = require("../../../utils/validateRequest");
const dbService = require("../../../utils/dbService");
const ObjectId = require("mongodb").ObjectId
const utils = require("../../../utils/common");
const CreditService = require("../../../services/creditService");



/**
* @description : create document of Credit in mongodb collection.
* @param {Object} req : request including body for creating document.
* @param {Object} res : response of created document
* @return {Object} : created Credit. {status, message, data}
*/
const addCredit = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      creditSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.validationError({ message: `Invalid values in parameters, ${validateRequest.message}` });
    }
    dataToCreate.addedBy = req.user.id
    dataToCreate = new Credit(dataToCreate);
    let createdCredit = await dbService.create(Credit, dataToCreate);
    return res.success({ data: createdCredit });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
}

/**
* @description : create multiple documents of Credit in mongodb collection.
* @param {Object} req : request including body for creating documents.
* @param {Object} res : response of created documents.
* @return {Object} : created Credits. {status, message, data}
*/
const bulkInsertCredit = async (req, res) => {
  try {
    if (req.body && (!Array.isArray(req.body.data) || req.body.data.length < 1)) {
      return res.badRequest();
    }
    let dataToCreate = [...req.body.data];
    for (let i = 0; i < dataToCreate.length; i++) {
      dataToCreate[i] = {
        ...dataToCreate[i],
        addedBy: req.user.id
      }
    }
    let createdCredits = await dbService.create(Credit, dataToCreate);
    createdCredits = { count: createdCredits ? createdCredits.length : 0 };
    return res.success({ data: { count: createdCredits.count || 0 } });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
}

/**
* @description : find all documents of Credit from collection based on query and options.
* @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
* @param {Object} res : response contains data found from collection.
* @return {Object} : found Credit(s). {status, message, data}
*/
const findAllCredit = async (req, res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      creditSchemaKey.findFilterKeys,
      Credit.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly) {
      let totalRecords = await dbService.count(Credit, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundCredits = await dbService.paginate(Credit, query, options);
    if (!foundCredits || !foundCredits.data || !foundCredits.data.length) {
      return res.recordNotFound();
    }
    return res.success({ data: foundCredits });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
}

/**
* @description : find document of Credit from table by id;
* @param {Object} req : request including id in request params.
* @param {Object} res : response contains document retrieved from table.
* @return {Object} : found Credit. {status, message, data}
*/
const getCredit = async (req, res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message: "invalid objectId." });
    }
    query._id = req.params.id;
    let options = {}
    let foundCredit = await dbService.findOne(Credit, query, options);
    if (!foundCredit) {
      return res.recordNotFound();
    }
    return res.success({ data: foundCredit });
  }
  catch (error) {
    return res.internalServerError({ message: error.message })
  }
}

/**
* @description : returns total number of documents of Credit.
* @param {Object} req : request including where object to apply filters in req body 
* @param {Object} res : response that returns total number of documents.
* @return {Object} : number of documents. {status, message, data}
*/
const getCreditCount = async (req, res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      creditSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedCredit = await dbService.count(Credit, where);
    return res.success({ data: { count: countedCredit } });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};


/**
* @description : update document of Credit with data by id.
* @param {Object} req : request including id in request params and data in request body.
* @param {Object} res : response of updated Credit.
* @return {Object} : updated Credit. {status, message, data}
*/
const updateCredit = async (req, res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy: req.user.id,
    }
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      creditSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id: req.params.id }
    let updatedCredit = await dbService.updateOne(Credit, query, dataToUpdate);
    if (!updatedCredit) {
      return res.recordNotFound();
    }
    return res.success({ data: updatedCredit });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
}

/**
* @description : update multiple records of Credit with data by filter.
* @param {Object} req : request including filter and data in request body.
* @param {Object} res : response of updated Credits.
* @return {Object} : updated Credits. {status, message, data}
*/
const bulkUpdateCredit = async (req, res) => {
  try {
    let filter = req.body && req.body.filter ? { ...req.body.filter } : {};
    let dataToUpdate = {};
    delete dataToUpdate["addedBy"]
    if (req.body && typeof req.body.data === 'object' && req.body.data !== null) {
      dataToUpdate = {
        ...req.body.data,
        updatedBy: req.user.id
      }
    }
    let updatedCredit = await dbService.updateMany(Credit, filter, dataToUpdate);
    if (!updatedCredit) {
      return res.recordNotFound();
    }
    return res.success({ data: { count: updatedCredit } });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
}

/**
* @description : partially update document of Credit with data by id;
* @param {obj} req : request including id in request params and data in request body.
* @param {obj} res : response of updated Credit.
* @return {obj} : updated Credit. {status, message, data}
*/
const partialUpdateCredit = async (req, res) => {
  try {
    if (!req.params.id) {
      res.badRequest({ message: "Insufficient request parameters! id is required." });
    }
    delete req.body["addedBy"]
    let dataToUpdate = {
      ...req.body,
      updatedBy: req.user.id,
    }
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      creditSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id: req.params.id }
    let updatedCredit = await dbService.updateOne(Credit, query, dataToUpdate);
    if (!updatedCredit) {
      return res.recordNotFound();
    }
    return res.success({ data: updatedCredit });
  } catch (error) {
    return res.internalServerError({ message: error.message })
  }
}
/**
* @description : deactivate document of Credit from table by id;
* @param {Object} req : request including id in request params.
* @param {Object} res : response contains updated document of Credit.
* @return {Object} : deactivated Credit. {status, message, data}
*/
const softDeleteCredit = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.badRequest({ message: "Insufficient request parameters! id is required." });
    }
    let query = { _id: req.params.id }
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    }
    let updatedCredit = await dbService.updateOne(Credit, query, updateBody);
    if (!updatedCredit) {
      return res.recordNotFound();
    }
    return res.success({ data: updatedCredit });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
}

/**
* @description : delete document of Credit from table.
* @param {Object} req : request including id as req param.
* @param {Object} res : response contains deleted document.
* @return {Object} : deleted Credit. {status, message, data}
*/
const deleteCredit = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.badRequest({ message: "Insufficient request parameters! id is required." });
    }
    const query = { _id: req.params.id };
    const deletedCredit = await dbService.deleteOne(Credit, query);
    if (!deletedCredit) {
      return res.recordNotFound();
    }
    return res.success({ data: deletedCredit });

  }
  catch (error) {
    return res.internalServerError({ message: error.message });
  }
}

/**
* @description : delete documents of Credit in table by using ids.
* @param {Object} req : request including array of ids in request body.
* @param {Object} res : response contains no of documents deleted.
* @return {Object} : no of documents deleted. {status, message, data}
*/
const deleteManyCredit = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id: { $in: ids } };
    const deletedCredit = await dbService.deleteMany(Credit, query);
    if (!deletedCredit) {
      return res.recordNotFound();
    }
    return res.success({ data: { count: deletedCredit } });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
}
/**
* @description : deactivate multiple documents of Credit from table by ids;
* @param {Object} req : request including array of ids in request body.
* @param {Object} res : response contains updated documents of Credit.
* @return {Object} : number of deactivated documents of Credit. {status, message, data}
*/
const softDeleteManyCredit = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id: { $in: ids } }
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    }
    let updatedCredit = await dbService.updateMany(Credit, query, updateBody);
    if (!updatedCredit) {
      return res.recordNotFound();
    }
    return res.success({ data: { count: updatedCredit } });

  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
}

/**
 * @description : get credit balance for workspace
 * @param {Object} req : request including workspace ID
 * @param {Object} res : response containing credit balance
 * @return {Object} : credit balance data. {status, message, data}
 */
const getCreditBalance = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId || req.user.workspace;

    if (!workspaceId) {
      return res.badRequest({ message: 'Workspace ID is required' });
    }

    // Check if user has access to this workspace
    let workspaceQuery = { _id: workspaceId, isDeleted: false };
    if (req.user.userType === 2) { // recruiter
      workspaceQuery.$or = [
        { addedBy: req.user.id },
        { members: req.user.id }
      ];
    }

    const workspace = await Workspace.findOne(workspaceQuery);
    if (!workspace) {
      return res.recordNotFound({ message: 'Workspace not found' });
    }

    const balance = await CreditService.getCreditBalance(workspaceId);

    return res.success({
      data: {
        workspaceId: workspaceId,
        availableCredits: balance.available_credits,
        totalCreditsUsed: balance.total_credits_used,
        totalCreditsPurchased: balance.total_credits_purchased,
        lastCreditUpdate: balance.last_credit_update,
        creditAlertThreshold: balance.credit_alert_threshold
      }
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : get credit transaction history for workspace
 * @param {Object} req : request including workspace ID and pagination
 * @param {Object} res : response containing transaction history
 * @return {Object} : transaction history. {status, message, data}
 */
const getCreditHistory = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId || req.user.workspace;
    const options = utils.paginationOptions(req.body);

    if (!workspaceId) {
      return res.badRequest({ message: 'Workspace ID is required' });
    }

    // Check if user has access to this workspace
    let workspaceQuery = { _id: workspaceId, isDeleted: false };
    if (req.user.userType === 2) { // recruiter
      workspaceQuery.$or = [
        { addedBy: req.user.id },
        { members: req.user.id }
      ];
    }

    const workspace = await Workspace.findOne(workspaceQuery);
    if (!workspace) {
      return res.recordNotFound({ message: 'Workspace not found' });
    }

    const history = await CreditService.getCreditTransactionHistory(workspaceId, options);

    return res.success({ data: history });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : get credit statistics for workspace
 * @param {Object} req : request including workspace ID
 * @param {Object} res : response containing credit statistics
 * @return {Object} : credit statistics. {status, message, data}
 */
const getCreditStats = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId || req.user.workspace;

    if (!workspaceId) {
      return res.badRequest({ message: 'Workspace ID is required' });
    }

    // Check if user has access to this workspace
    let workspaceQuery = { _id: workspaceId, isDeleted: false };
    if (req.user.userType === 2) { // recruiter
      workspaceQuery.$or = [
        { addedBy: req.user.id },
        { members: req.user.id }
      ];
    }

    const workspace = await Workspace.findOne(workspaceQuery);
    if (!workspace) {
      return res.recordNotFound({ message: 'Workspace not found' });
    }

    // Get recent transactions
    const recentTransactions = await Credit.find({
      workspace: workspaceId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('application', 'status user')
      .populate('purchase', 'amount credits_amount')
      .populate('plan', 'name price');

    // Calculate statistics
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const monthlyUsage = await Credit.aggregate([
      {
        $match: {
          workspace: workspace._id,
          transaction_type: 'debit',
          createdAt: { $gte: startOfMonth },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$amount' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    const weeklyUsage = await Credit.aggregate([
      {
        $match: {
          workspace: workspace._id,
          transaction_type: 'debit',
          createdAt: { $gte: startOfWeek },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$amount' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      currentBalance: workspace.available_credits,
      totalPurchased: workspace.total_credits_purchased,
      totalUsed: workspace.total_credits_used,
      monthlyUsage: {
        credits: monthlyUsage[0]?.totalCredits || 0,
        transactions: monthlyUsage[0]?.totalTransactions || 0
      },
      weeklyUsage: {
        credits: weeklyUsage[0]?.totalCredits || 0,
        transactions: weeklyUsage[0]?.totalTransactions || 0
      },
      recentTransactions: recentTransactions,
      alertThreshold: workspace.credit_alert_threshold,
      needsAttention: workspace.available_credits <= workspace.credit_alert_threshold
    };

    return res.success({ data: stats });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : update credit alert threshold
 * @param {Object} req : request including workspace ID and new threshold
 * @param {Object} res : response of updated workspace
 * @return {Object} : updated workspace. {status, message, data}
 */
const updateCreditAlertThreshold = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId || req.user.workspace;
    const { threshold } = req.body;

    if (!workspaceId) {
      return res.badRequest({ message: 'Workspace ID is required' });
    }

    if (threshold === undefined || threshold < 0) {
      return res.badRequest({ message: 'Valid threshold value is required' });
    }

    // Check if user has admin access to this workspace
    let workspaceQuery = { _id: workspaceId, isDeleted: false };
    if (req.user.userType === 2) { // recruiter
      workspaceQuery.addedBy = req.user.id; // Only workspace owner can update threshold
    }

    const workspace = await Workspace.findOneAndUpdate(
      workspaceQuery,
      {
        credit_alert_threshold: threshold,
        updatedBy: req.user.id
      },
      { new: true }
    );

    if (!workspace) {
      return res.recordNotFound({ message: 'Workspace not found or access denied' });
    }

    return res.success({
      data: {
        workspaceId: workspace._id,
        creditAlertThreshold: workspace.credit_alert_threshold
      },
      message: 'Credit alert threshold updated successfully'
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : get low credit workspaces (admin only)
 * @param {Object} req : request with optional threshold parameter
 * @param {Object} res : response containing workspaces with low credits
 * @return {Object} : low credit workspaces. {status, message, data}
 */
const getLowCreditWorkspaces = async (req, res) => {
  try {
    // Admin-only endpoint
    if (req.user.userType !== 1) {
      return res.forbidden({ message: 'Admin access required' });
    }

    const customThreshold = req.query.threshold || 5; // Default threshold is 5 credits

    const lowCreditWorkspaces = await Workspace.find({
      $or: [
        { available_credits: { $lte: customThreshold } },
        { $expr: { $lte: ['$available_credits', '$credit_alert_threshold'] } }
      ],
      isDeleted: false
    })
      .populate('addedBy', 'name email')
      .sort({ available_credits: 1 });

    return res.success({
      data: lowCreditWorkspaces,
      message: `Found ${lowCreditWorkspaces.length} workspaces with low credits`
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

module.exports = {
  addCredit, bulkInsertCredit, findAllCredit, getCredit, getCreditCount, updateCredit, bulkUpdateCredit, partialUpdateCredit, softDeleteCredit, deleteCredit, deleteManyCredit, softDeleteManyCredit,
  getCreditBalance, getCreditHistory, getCreditStats, updateCreditAlertThreshold, getLowCreditWorkspaces
}