/**
 * creditCheck.js
 * @description :: Middleware to check credit availability before interview processing
 */

const creditService = require('../services/creditService');

/**
 * Middleware to check if workspace has sufficient credits
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkCreditsMiddleware = async (req, res, next) => {
  try {
    console.log('🔍 Checking credits for user:', req.user.id);

    // Get workspace ID from user
    const workspace_id = req.user.workspace;

    if (!workspace_id) {
      return res.badRequest({
        message: "User is not associated with any workspace",
        code: "NO_WORKSPACE_FOUND"
      });
    }

    // Get current credit balance
    const balance_info = await creditService.getWorkspaceCreditBalance(workspace_id);

    console.log('📊 Credit balance check result:', {
      workspace: workspace_id,
      available_credits: balance_info.total_available,
      needs_alert: balance_info.needs_alert
    });

    // Check if sufficient credits available
    if (balance_info.total_available < 1) {
      return res.badRequest({
        message: "Insufficient credits to process interview",
        code: "INSUFFICIENT_CREDITS",
        data: {
          available_credits: balance_info.total_available,
          required_credits: 1,
          credit_breakdown: balance_info.credit_breakdown,
          workspace_id: workspace_id
        }
      });
    }

    // Add credit info to request for later use
    req.credit_info = {
      workspace_id: workspace_id,
      available_credits: balance_info.total_available,
      credit_breakdown: balance_info.credit_breakdown,
      needs_alert: balance_info.needs_alert,
      alert_threshold: balance_info.alert_threshold
    };

    // Add low credit warning to response headers if needed
    if (balance_info.needs_alert) {
      res.set('X-Credit-Warning', 'low-credits');
      res.set('X-Available-Credits', balance_info.total_available.toString());

      console.log('⚠️ Low credit warning for workspace:', {
        workspace: workspace_id,
        available: balance_info.total_available,
        threshold: balance_info.alert_threshold
      });
    }

    next();

  } catch (error) {
    console.error('❌ Error in credit check middleware:', error);
    return res.internalServerError({
      message: "Error checking credit balance",
      code: "CREDIT_CHECK_ERROR",
      error: error.message
    });
  }
};

/**
 * Middleware to check credits but don't block - just add warning
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkCreditsWarningOnly = async (req, res, next) => {
  try {
    const workspace_id = req.user.workspace;

    if (workspace_id) {
      const balance_info = await creditService.getWorkspaceCreditBalance(workspace_id);

      // Add credit info to request
      req.credit_info = {
        workspace_id: workspace_id,
        available_credits: balance_info.total_available,
        needs_alert: balance_info.needs_alert
      };

      // Add warning headers if needed
      if (balance_info.needs_alert) {
        res.set('X-Credit-Warning', 'low-credits');
        res.set('X-Available-Credits', balance_info.total_available.toString());
      }
    }

    next();

  } catch (error) {
    console.error('⚠️ Warning: Error in credit warning middleware:', error);
    // Don't block the request, just continue
    next();
  }
};

/**
 * Middleware to deduct credit after successful interview processing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deductCreditAfterProcessing = async (req, res, next) => {
  try {
    // This middleware should be used after the main processing is complete
    // It expects application_id in req.body or req.params

    const application_id = req.body.application_id || req.params.application_id || req.application_id;
    const workspace_id = req.credit_info?.workspace_id || req.user.workspace;

    if (!application_id) {
      console.error('❌ No application ID found for credit deduction');
      return next(); // Continue without deducting
    }

    if (!workspace_id) {
      console.error('❌ No workspace ID found for credit deduction');
      return next(); // Continue without deducting
    }

    console.log('🔄 Deducting credit after processing:', {
      application_id,
      workspace_id
    });

    // Deduct credit
    const deduction_result = await creditService.deductCreditForInterview(
      workspace_id,
      application_id
    );

    if (deduction_result.success) {
      console.log('✅ Credit deducted successfully:', {
        application_id,
        remaining_balance: deduction_result.remaining_balance
      });

      // Add deduction info to response
      res.credit_deduction = {
        deducted: true,
        remaining_balance: deduction_result.remaining_balance,
        credit_record_id: deduction_result.credit_record_id
      };
    }

    next();

  } catch (error) {
    console.error('❌ Error deducting credit after processing:', error);
    // Don't fail the main request, but log the error
    res.credit_deduction = {
      deducted: false,
      error: error.message
    };
    next();
  }
};

/**
 * Utility function to get workspace credit balance
 * @param {String} workspace_id - Workspace ID
 * @returns {Object} Credit balance info
 */
const getWorkspaceCredits = async (workspace_id) => {
  try {
    return await creditService.getWorkspaceCreditBalance(workspace_id);
  } catch (error) {
    console.error('❌ Error getting workspace credits:', error);
    return {
      total_available: 0,
      needs_alert: true,
      error: error.message
    };
  }
};

module.exports = {
  checkCreditsMiddleware,
  checkCreditsWarningOnly,
  deductCreditAfterProcessing,
  getWorkspaceCredits
};
