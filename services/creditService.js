/**
 * creditService.js
 * @description :: Service for managing credit operations
 */

const mongoose = require('mongoose');
const Credit = require('../model/credit');
const Workspace = require('../model/workspace');
const Purchase = require('../model/purchase');
const Plan = require('../model/plan');
const { ObjectId } = require('mongodb');

class CreditService {

  /**
 * Create initial 100 credits for a newly created workspace
 * @param {String} workspace_id - Workspace ID
 * @param {String} addedBy - User ID who created the workspace
 * @returns {Object} Result of initial credit creation
 */
async createInitialCreditsForWorkspace(workspace_id, addedBy = null) {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      console.log('🎯 Creating initial 100 credits for new workspace:', {
        workspace: workspace_id,
        addedBy: addedBy
      });

      // Get the workspace
      const workspace = await Workspace.findById(workspace_id).session(session);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const initial_credits = 100;
      const current_balance = workspace.available_credits || 0;
      const new_balance = current_balance + initial_credits;

      // Create initial credit record
      const credit_record = new Credit({
        workspace: workspace_id,
        addition: initial_credits,
        is_added: true,
        transaction_type: 'bonus',
        description: 'Welcome bonus - Initial 100 credits for new workspace',
        balance_before: current_balance,
        balance_after: new_balance,
        balance: [{
          credits: initial_credits,
          expiry: null, // No expiry for initial credits
          is_promo: true,
          no_expiry: true,
          credit_source: 'initial_allocation',
          added_at: new Date()
        }],
        addedBy: addedBy,
        processed_at: new Date()
      });

      await credit_record.save({ session });

      // Update workspace with initial credits
      await Workspace.findByIdAndUpdate(
        workspace_id,
        {
          available_credits: new_balance,
          total_credits_purchased: 0, // These are bonus credits, not purchased
          total_credits_used: 0,
          last_credit_update: new Date()
        },
        { session }
      );

      console.log('✅ Initial credits created successfully:', {
        workspace: workspace_id,
        credits_added: initial_credits,
        new_balance: new_balance
      });

      return {
        success: true,
        credits_added: initial_credits,
        new_balance: new_balance,
        credit_record_id: credit_record._id,
        transaction_type: 'initial_allocation'
      };
    });
  } catch (error) {
    console.error('❌ Error creating initial credits:', error);
    throw new Error(`Failed to create initial credits: ${error.message}`);
  } finally {
    await session.endSession();
  }
}

  /**
   * Add credits after successful purchase
   * @param {Object} purchaseData - Purchase transaction data
   * @param {Object} planData - Plan details
   * @returns {Object} Result of credit addition
   */
  async addCreditsAfterPurchase(purchaseData, planData) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        console.log('🔄 Starting credit addition after purchase:', {
          workspace: purchaseData.workspace,
          credits: planData.credits,
          plan: planData.name
        });

        // Get current workspace
        const workspace = await Workspace.findById(purchaseData.workspace).session(session);
        if (!workspace) {
          throw new Error('Workspace not found');
        }

        const current_balance = workspace.available_credits || 0;
        const new_balance = current_balance + planData.credits;

        // Calculate expiry date
        const expiry_date = new Date();
        expiry_date.setDate(expiry_date.getDate() + (planData.max_validity_days || 365));

        // Create credit addition record
        const credit_record = new Credit({
          workspace: purchaseData.workspace,
          addition: planData.credits,
          is_added: true,
          transaction_type: 'purchase',
          purchase_reference: purchaseData._id,
          description: `Credits purchased - Plan: ${planData.name}`,
          balance_before: current_balance,
          balance_after: new_balance,
          balance: [{
            credits: planData.credits,
            expiry: expiry_date,
            is_promo: false,
            no_expiry: planData.max_validity_days === null,
            credit_source: 'purchase',
            added_at: new Date()
          }],
          processed_at: new Date()
        });

        await credit_record.save({ session });

        // Update workspace credits
        await Workspace.findByIdAndUpdate(
          purchaseData.workspace,
          {
            available_credits: new_balance,
            total_credits_purchased: (workspace.total_credits_purchased || 0) + planData.credits,
            last_credit_update: new Date()
          },
          { session }
        );

        // Update purchase record with balance info
        await Purchase.findByIdAndUpdate(
          purchaseData._id,
          {
            balance_before: current_balance,
            balance_after: new_balance,
            processed_at: new Date()
          },
          { session }
        );

        console.log('✅ Credits added successfully:', {
          workspace: purchaseData.workspace,
          credits_added: planData.credits,
          new_balance,
          expiry_date
        });

        return {
          success: true,
          credits_added: planData.credits,
          new_balance,
          expiry_date,
          credit_record_id: credit_record._id
        };
      });
    } catch (error) {
      console.error('❌ Error adding credits after purchase:', error);
      throw new Error(`Failed to add credits: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Deduct credit for interview processing
   * @param {String} workspace_id - Workspace ID
   * @param {String} application_id - Application ID
   * @returns {Object} Result of credit deduction
   */
/**
 * Deduct credit for interview processing
 * @param {String} workspace_id - Workspace ID
 * @param {String} application_id - Application ID
 * @returns {Object} Result of credit deduction
 */
async deductCreditForInterview(workspace_id, application_id) {
  const session = await mongoose.startSession();

  try {
    let result;
    
    await session.withTransaction(async () => {
      console.log('🔄 Starting credit deduction for interview:', {
        workspace: workspace_id,
        application: application_id
      });

      // Check if credit already deducted for this application
      const existingDeduction = await Credit.findOne({
        workspace: workspace_id,
        application: application_id,
        is_added: false,
        transaction_type: 'usage'
      }).session(session);
      
      if (existingDeduction) {
        throw new Error('Credits already deducted for this application');
      }

      // Get current workspace
      const workspace = await Workspace.findById(workspace_id).session(session);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const current_balance = workspace.available_credits || 0;

      if (current_balance < 1) {
        throw new Error(`Insufficient credits. Available: ${current_balance}, Required: 1`);
      }

      const new_balance = current_balance - 1;

      // Create credit deduction record
      const credit_record = new Credit({
        workspace: workspace_id,
        deduction: 1,
        is_added: false,
        application: application_id,
        transaction_type: 'usage',
        balance_before: current_balance,
        balance_after: new_balance,
        balance: [{
          credits: new_balance,
          expiry: null,
          is_promo: false,
          no_expiry: true,
          credit_source: 'usage',
          added_at: new Date()
        }],
        processed_at: new Date()
      });

      await credit_record.save({ session });

      // Update workspace balance
      await Workspace.findByIdAndUpdate(
        workspace_id,
        {
          available_credits: new_balance,
          total_credits_used: (workspace.total_credits_used || 0) + 1,
          last_credit_update: new Date()
        },
        { session }
      );

      console.log('✅ Credit deducted successfully:', {
        workspace: workspace_id,
        application: application_id,
        credits_deducted: 1,
        remaining_balance: new_balance
      });

      // Store the result instead of returning it directly
      result = {
        success: true,
        credits_deducted: 1,
        remaining_balance: new_balance,
        credit_record_id: credit_record._id
      };
    });

    return result; // Return the stored result after transaction completes

  } catch (error) {
    console.error('❌ Error deducting credit for interview:', error);
    throw new Error(`Failed to deduct credit: ${error.message}`);
  } finally {
    await session.endSession();
  }
}


  /**
   * Get workspace credit balance with detailed breakdown
   * @param {String} workspace_id - Workspace ID
   * @returns {Object} Credit balance breakdown
   */
  async getWorkspaceCreditBalance(workspace_id) {
    try {
      console.log('🔍 Getting credit balance for workspace:', workspace_id);

      // Get workspace info
      const workspace = await Workspace.findById(workspace_id);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Get all active credit additions for this workspace
      const credit_additions = await Credit.find({
        workspace: workspace_id,
        is_added: true,
        isDeleted: false
      }).sort({ createdAt: 1 });

      // Calculate available credits by category
      let credit_breakdown = {
        purchased: 0,
        promotional: 0,
        bonus: 0,
        expiring_soon: 0, // Credits expiring in next 30 days
        expired: 0
      };

      const thirty_days_from_now = new Date();
      thirty_days_from_now.setDate(thirty_days_from_now.getDate() + 30);
      const now = new Date();

      credit_additions.forEach(record => {
        record.balance.forEach(balance_item => {
          if (balance_item.credits > 0) {
            // Check if expired
            if (balance_item.expiry && balance_item.expiry <= now && !balance_item.no_expiry) {
              credit_breakdown.expired += balance_item.credits;
              return;
            }

            // Categorize active credits
            if (balance_item.is_promo) {
              credit_breakdown.promotional += balance_item.credits;
            } else if (balance_item.credit_source === 'bonus') {
              credit_breakdown.bonus += balance_item.credits;
            } else {
              credit_breakdown.purchased += balance_item.credits;
            }

            // Check if expiring soon
            if (balance_item.expiry &&
              balance_item.expiry <= thirty_days_from_now &&
              balance_item.expiry > now &&
              !balance_item.no_expiry) {
              credit_breakdown.expiring_soon += balance_item.credits;
            }
          }
        });
      });

      const total_active = credit_breakdown.purchased + credit_breakdown.promotional + credit_breakdown.bonus;

      console.log('📊 Credit balance calculated:', {
        workspace: workspace_id,
        total_active,
        credit_breakdown
      });

      return {
        workspace_id,
        total_available: workspace.available_credits || 0,
        total_purchased: workspace.total_credits_purchased || 0,
        total_used: workspace.total_credits_used || 0,
        credit_breakdown,
        last_update: workspace.last_credit_update,
        alert_threshold: workspace.credit_alert_threshold || 10,
        needs_alert: (workspace.available_credits || 0) <= (workspace.credit_alert_threshold || 10)
      };

    } catch (error) {
      console.error('❌ Error getting credit balance:', error);
      throw new Error(`Failed to get credit balance: ${error.message}`);
    }
  }

/**
 * Get credit transaction history for workspace
 * @param {String} workspace_id - Workspace ID
 * @param {Object} options - Query options (limit, skip, type)
 * @returns {Object} Credit transaction history
 */
async getCreditTransactionHistory(workspace_id, options = {}) {
  try {
    const {
      limit = 50,
      skip = 0,
      transaction_type = null,
      start_date = null,
      end_date = null
    } = options;

    const query = {
      workspace: new ObjectId(workspace_id),
      isDeleted: false
    };

    if (transaction_type) {
      query.transaction_type = transaction_type;
    }

    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) query.createdAt.$gte = new Date(start_date);
      if (end_date) query.createdAt.$lte = new Date(end_date);
    }

    const transactions = await Credit.find(query)
      .populate('application', 'candidate job status')
     
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total_count = await Credit.countDocuments(query);

    return {
      transactions,
      pagination: {
        total: total_count,
        limit,
        skip,
        has_more: skip + transactions.length < total_count
      }
    };

  } catch (error) {
    console.error('❌ Error getting credit transaction history:', error);
    throw new Error(`Failed to get transaction history: ${error.message}`);
  }
}

  /**
   * Process credit refund
   * @param {String} purchase_id - Purchase ID to refund
   * @param {Number} refund_amount - Amount to refund (in credits)
   * @param {String} reason - Refund reason
   * @returns {Object} Refund result
   */
  async processRefund(purchase_id, refund_amount, reason = 'Customer request') {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        // Get purchase details
        const purchase = await Purchase.findById(purchase_id).session(session);
        if (!purchase) {
          throw new Error('Purchase not found');
        }

        // Get workspace
        const workspace = await Workspace.findById(purchase.workspace).session(session);
        if (!workspace) {
          throw new Error('Workspace not found');
        }

        const current_balance = workspace.available_credits || 0;
        const new_balance = current_balance + refund_amount;

        // Create refund credit record
        const credit_record = new Credit({
          workspace: purchase.workspace,
          addition: refund_amount,
          is_added: true,
          transaction_type: 'refund',
          purchase_reference: purchase_id,
          description: `Credit refund - Reason: ${reason}`,
          balance_before: current_balance,
          balance_after: new_balance,
          balance: [{
            credits: refund_amount,
            expiry: null,
            is_promo: false,
            no_expiry: true,
            credit_source: 'refund',
            added_at: new Date()
          }],
          processed_at: new Date()
        });

        await credit_record.save({ session });

        // Update workspace balance
        await Workspace.findByIdAndUpdate(
          purchase.workspace,
          {
            available_credits: new_balance,
            last_credit_update: new Date()
          },
          { session }
        );

        return {
          success: true,
          refund_amount,
          new_balance,
          credit_record_id: credit_record._id
        };
      });
    } catch (error) {
      console.error('❌ Error processing credit refund:', error);
      throw new Error(`Failed to process refund: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }
}

module.exports = new CreditService();
