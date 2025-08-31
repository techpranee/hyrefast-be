/**
 * paymentService.js
 * @description :: Service for handling Razorpay payment operations
 */

const crypto = require('crypto');
const { razorpay, razorpayConfig, razorpayUtils } = require('../config/razorpay');
const Payment = require('../model/payment');
const Purchase = require('../model/purchase');
const Plan = require('../model/plan');
const Workspace = require('../model/workspace');
const creditService = require('./creditService');

class PaymentService {
  /**
   * Create Razorpay order for credit purchase
   * @param {String} plan_id - Plan ID to purchase
   * @param {String} workspace_id - Workspace ID
   * @param {String} user_id - User ID making the purchase
   * @param {Object} customerInfo - Customer information
   * @returns {Object} Razorpay order details
   */
  async createOrder(plan_id, workspace_id, user_id, customerInfo = {}) {
    try {
      console.log('🔄 Creating Razorpay order:', {
        plan_id,
        workspace_id,
        user_id
      });

      // Get plan details
      const plan = await Plan.findById(plan_id);
      if (!plan || !plan.isActive) {
        throw new Error('Plan not found or inactive');
      }

      // Validate workspace
      const workspace = await Workspace.findById(workspace_id);
      if (!workspace || !workspace.isActive) {
        throw new Error('Workspace not found or inactive');
      }

      // Calculate order amount in paise
      const order_amount = razorpayUtils.convertToPaise(plan.amount);

      if (!razorpayUtils.validateAmount(order_amount)) {
        throw new Error(`Invalid amount: ${plan.amount}. Must be between ₹${razorpayConfig.min_amount / 100} and ₹${razorpayConfig.max_amount / 100}`);
      }

      // Create order notes
      const notes = razorpayUtils.createOrderNotes(workspace_id, plan_id, user_id, plan.credits);

      // Create Razorpay order
      const razorpay_order = await razorpay.orders.create({
        amount: order_amount,
        currency: razorpayConfig.currency,
        receipt: razorpayUtils.generateReceiptId(),
        notes: notes,
        payment_capture: 1 // Auto capture payment
      });

      console.log('✅ Razorpay order created:', {
        order_id: razorpay_order.id,
        amount: order_amount,
        currency: razorpay_order.currency
      });

      // Create payment record
      const payment_record = new Payment({
        user: user_id,
        workspace: workspace_id,
        data: JSON.stringify(razorpay_order),
        status: 'created',
        currency: razorpay_order.currency,
        platform: 'razorpay',
        ip: customerInfo.ip || '',
        razorpay: {
          razorpay_order_id: razorpay_order.id,
          gateway_response: razorpay_order,
          payment_notes: notes
        }
      });

      await payment_record.save();

      // Create purchase record
      const purchase_record = new Purchase({
        workspace: workspace_id,
        plan: plan_id,
        payment: payment_record._id,
        status: 'pending',
        amount: plan.amount,
        currency: plan.currency || 'INR',
        credits_amount: plan.credits,
        transaction_type: 'purchase',
        description: `Credit purchase - Plan: ${plan.name}`,
        invoice_number: Date.now(), // Temporary invoice number
        expiry_date: new Date(Date.now() + (plan.max_validity_days || 365) * 24 * 60 * 60 * 1000)
      });

      await purchase_record.save();

      // Update payment with purchase reference
      await Payment.findByIdAndUpdate(payment_record._id, {
        'razorpay.payment_notes.purchase_id': purchase_record._id.toString()
      });

      return {
        success: true,
        order: {
          id: razorpay_order.id,
          amount: order_amount,
          currency: razorpay_order.currency,
          receipt: razorpay_order.receipt
        },
        plan: {
          id: plan._id,
          name: plan.name,
          credits: plan.credits,
          amount: plan.amount
        },
        payment_id: payment_record._id,
        purchase_id: purchase_record._id,
        razorpay_key: process.env.RAZORPAY_KEY_ID
      };

    } catch (error) {
      console.error('❌ Error creating Razorpay order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Verify Razorpay payment signature
   * @param {String} razorpay_order_id - Razorpay order ID
   * @param {String} razorpay_payment_id - Razorpay payment ID  
   * @param {String} razorpay_signature - Razorpay signature
   * @returns {Boolean} Verification result
   */
  verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
    try {
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      const is_valid = generated_signature === razorpay_signature;

      console.log('🔍 Payment signature verification:', {
        razorpay_order_id,
        razorpay_payment_id,
        is_valid
      });

      return is_valid;
    } catch (error) {
      console.error('❌ Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Process successful payment
   * @param {Object} paymentData - Payment verification data
   * @returns {Object} Processing result
   */
  async processSuccessfulPayment(paymentData) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        customer_details = {}
      } = paymentData;

      console.log('🔄 Processing successful payment:', {
        razorpay_order_id,
        razorpay_payment_id
      });

      // Verify signature
      const is_signature_valid = this.verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!is_signature_valid) {
        throw new Error('Invalid payment signature');
      }

      // Get payment record
      const payment = await Payment.findOne({
        'razorpay.razorpay_order_id': razorpay_order_id
      });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Get purchase record
      const purchase_id = payment.razorpay.payment_notes.purchase_id;
      const purchase = await Purchase.findById(purchase_id).populate('plan');

      if (!purchase) {
        throw new Error('Purchase record not found');
      }

      // Get Razorpay payment details
      const razorpay_payment = await razorpay.payments.fetch(razorpay_payment_id);

      // Update payment record
      await Payment.findByIdAndUpdate(payment._id, {
        status: 'completed',
        'razorpay.razorpay_payment_id': razorpay_payment_id,
        'razorpay.razorpay_signature': razorpay_signature,
        'razorpay.payment_method': razorpay_payment.method,
        'razorpay.gateway_response': razorpay_payment,
        ip: customer_details.ip || payment.ip
      });

      // Update purchase record
      await Purchase.findByIdAndUpdate(purchase_id, {
        status: 'completed',
        processed_at: new Date()
      });

      // Add credits to workspace
      const credit_result = await creditService.addCreditsAfterPurchase(purchase, purchase.plan);

      console.log('✅ Payment processed successfully:', {
        payment_id: payment._id,
        purchase_id: purchase_id,
        credits_added: credit_result.credits_added,
        new_balance: credit_result.new_balance
      });

      return {
        success: true,
        payment: {
          id: payment._id,
          status: 'completed',
          amount: purchase.amount,
          currency: purchase.currency
        },
        purchase: {
          id: purchase_id,
          plan_name: purchase.plan.name,
          credits_purchased: purchase.credits_amount
        },
        credits: {
          added: credit_result.credits_added,
          new_balance: credit_result.new_balance,
          expiry_date: credit_result.expiry_date
        }
      };

    } catch (error) {
      console.error('❌ Error processing successful payment:', error);

      // Update payment status to failed if we have the order ID
      if (paymentData.razorpay_order_id) {
        await Payment.updateOne(
          { 'razorpay.razorpay_order_id': paymentData.razorpay_order_id },
          {
            status: 'failed',
            'razorpay.failure_reason': error.message
          }
        );
      }

      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

  /**
   * Handle payment failure
   * @param {Object} failureData - Payment failure data
   * @returns {Object} Failure handling result
   */
  async handlePaymentFailure(failureData) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        error_code,
        error_description,
        error_reason
      } = failureData;

      console.log('⚠️ Handling payment failure:', {
        razorpay_order_id,
        razorpay_payment_id,
        error_code
      });

      // Update payment record
      const payment = await Payment.findOneAndUpdate(
        { 'razorpay.razorpay_order_id': razorpay_order_id },
        {
          status: 'failed',
          'razorpay.razorpay_payment_id': razorpay_payment_id,
          'razorpay.failure_reason': `${error_code}: ${error_description}`,
          'razorpay.gateway_response': failureData
        },
        { new: true }
      );

      if (payment) {
        // Update purchase record
        const purchase_id = payment.razorpay.payment_notes.purchase_id;
        await Purchase.findByIdAndUpdate(purchase_id, {
          status: 'failed',
          admin_notes: `Payment failed: ${error_description}`
        });
      }

      return {
        success: true,
        message: 'Payment failure recorded',
        error_code,
        error_description
      };

    } catch (error) {
      console.error('❌ Error handling payment failure:', error);
      throw new Error(`Failed to handle payment failure: ${error.message}`);
    }
  }

  /**
   * Get payment details
   * @param {String} payment_id - Payment ID
   * @returns {Object} Payment details
   */
  async getPaymentDetails(payment_id) {
    try {
      const payment = await Payment.findById(payment_id)
        .populate('user', 'name email')
        .populate('workspace', 'name');

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Get associated purchase
      const purchase = await Purchase.findOne({ payment: payment_id })
        .populate('plan', 'name credits amount');

      return {
        payment,
        purchase
      };

    } catch (error) {
      console.error('❌ Error getting payment details:', error);
      throw new Error(`Failed to get payment details: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   * @param {String} webhook_body - Raw webhook body
   * @param {String} webhook_signature - Webhook signature header
   * @returns {Boolean} Verification result
   */
  verifyWebhookSignature(webhook_body, webhook_signature) {
    try {
      const generated_signature = crypto
        .createHmac('sha256', razorpayConfig.webhook_secret)
        .update(webhook_body)
        .digest('hex');

      return generated_signature === webhook_signature;
    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error);
      return false;
    }
  }
}

module.exports = new PaymentService();
