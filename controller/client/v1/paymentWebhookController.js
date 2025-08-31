/**
 * paymentWebhookController.js
 * @description :: Payment webhook handlers for Razorpay
 */

const PaymentService = require('../../../services/paymentService');
const CreditService = require('../../../services/creditService');
const { validateWebhookSignature } = require('../../../config/razorpay');

/**
 * @description : handle Razorpay payment webhook
 * @param {Object} req : request including webhook payload
 * @param {Object} res : response
 * @return {Object} : webhook processing result
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.get('X-Razorpay-Signature');
    const body = JSON.stringify(req.body);

    // Validate webhook signature
    const isValidSignature = validateWebhookSignature(body, signature);
    if (!isValidSignature) {
      console.log('❌ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;
    console.log(`🔔 Webhook received: ${event}`);

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
      
      case 'order.paid':
        await handleOrderPaid(payload.order.entity, payload.payment.entity);
        break;
      
      default:
        console.log(`ℹ️ Unhandled webhook event: ${event}`);
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * @description : handle successful payment capture
 * @param {Object} payment : Razorpay payment entity
 */
const handlePaymentCaptured = async (payment) => {
  try {
    console.log(`✅ Payment captured: ${payment.id}`);
    
    // Process the successful payment
    const result = await PaymentService.processSuccessfulPayment(
      payment.order_id,
      payment.id,
      payment
    );

    if (result.success) {
      console.log(`✅ Payment processed successfully: ${payment.id}`);
      
      // Add credits to workspace
      if (result.purchase) {
        const creditResult = await CreditService.addCreditsAfterPurchase(
          result.purchase.workspace,
          result.purchase._id,
          result.purchase.credits_amount
        );
        
        if (creditResult.success) {
          console.log(`✅ Credits added: ${result.purchase.credits_amount} credits to workspace ${result.purchase.workspace}`);
        } else {
          console.error(`❌ Failed to add credits:`, creditResult.message);
        }
      }
    } else {
      console.error(`❌ Failed to process payment:`, result.message);
    }
  } catch (error) {
    console.error('❌ Error processing captured payment:', error);
  }
};

/**
 * @description : handle failed payment
 * @param {Object} payment : Razorpay payment entity
 */
const handlePaymentFailed = async (payment) => {
  try {
    console.log(`❌ Payment failed: ${payment.id}`);
    
    // Process the failed payment
    const result = await PaymentService.processFailedPayment(
      payment.order_id,
      payment.id,
      payment.error_description || 'Payment failed'
    );

    if (result.success) {
      console.log(`✅ Failed payment processed: ${payment.id}`);
    } else {
      console.error(`❌ Failed to process failed payment:`, result.message);
    }
  } catch (error) {
    console.error('❌ Error processing failed payment:', error);
  }
};

/**
 * @description : handle order paid event
 * @param {Object} order : Razorpay order entity
 * @param {Object} payment : Razorpay payment entity
 */
const handleOrderPaid = async (order, payment) => {
  try {
    console.log(`💰 Order paid: ${order.id}`);
    
    // This is usually triggered after payment.captured
    // We can use this for additional order-level processing
    const result = await PaymentService.markOrderAsPaid(order.id, payment.id);
    
    if (result.success) {
      console.log(`✅ Order marked as paid: ${order.id}`);
    } else {
      console.error(`❌ Failed to mark order as paid:`, result.message);
    }
  } catch (error) {
    console.error('❌ Error processing order paid:', error);
  }
};

/**
 * @description : handle manual payment verification (for testing)
 * @param {Object} req : request including payment ID
 * @param {Object} res : response
 * @return {Object} : verification result
 */
const verifyPaymentManually = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!paymentId) {
      return res.badRequest({ message: 'Payment ID is required' });
    }

    // Only admin can manually verify payments
    if (req.user.userType !== 1) {
      return res.forbidden({ message: 'Admin access required' });
    }

    const result = await PaymentService.verifyPaymentStatus(paymentId);
    
    if (result.success) {
      return res.success({
        data: result.payment,
        message: 'Payment verification completed'
      });
    } else {
      return res.badRequest({ message: result.message });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : get webhook logs (admin only)
 * @param {Object} req : request with pagination
 * @param {Object} res : response containing webhook logs
 * @return {Object} : webhook logs
 */
const getWebhookLogs = async (req, res) => {
  try {
    // Admin-only endpoint
    if (req.user.userType !== 1) {
      return res.forbidden({ message: 'Admin access required' });
    }

    const Payment = require('../../../model/payment');
    const utils = require('../../../utils/common');
    const options = utils.paginationOptions(req.body);

    // Get recent payments with webhook data
    const payments = await Payment.find({
      'razorpay.webhook_received': { $exists: true }
    })
    .sort({ updatedAt: -1 })
    .limit(options.limit || 50)
    .populate('workspace', 'name')
    .populate('purchase', 'credits_amount');

    const webhookStats = {
      totalWebhooks: payments.length,
      successfulWebhooks: payments.filter(p => p.status === 'completed').length,
      failedWebhooks: payments.filter(p => p.status === 'failed').length,
      pendingWebhooks: payments.filter(p => p.status === 'pending').length
    };

    return res.success({
      data: {
        payments: payments,
        stats: webhookStats
      }
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

module.exports = {
  handleRazorpayWebhook,
  verifyPaymentManually,
  getWebhookLogs
};
