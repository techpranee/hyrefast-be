/**
 * razorpay.js
 * @description :: Razorpay configuration and initialization
 */

const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Razorpay configuration constants
const razorpayConfig = {
  currency: 'INR',
  receipt_prefix: 'HYREFAST_',
  webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET,
  timeout: 300000, // 5 minutes in milliseconds
  retry_count: 3,
  min_amount: 100, // Minimum amount in paise (1 INR)
  max_amount: 10000000, // Maximum amount in paise (100,000 INR)

  // Payment methods allowed
  allowed_methods: ['card', 'netbanking', 'wallet', 'upi', 'emi'],

  // Razorpay webhook events we handle
  webhook_events: [
    'payment.captured',
    'payment.failed',
    'payment.authorized',
    'order.paid',
    'refund.created',
    'refund.processed'
  ],

  // Order notes template
  order_notes: {
    workspace_id: '',
    plan_id: '',
    user_id: '',
    credits_amount: 0,
    application_source: 'hyrefast_web'
  }
};

// Utility functions
const razorpayUtils = {
  /**
   * Generate unique receipt ID
   */
  generateReceiptId: () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${razorpayConfig.receipt_prefix}${timestamp}_${random}`;
  },

  /**
   * Convert amount to paise (Razorpay uses paise)
   */
  convertToPaise: (amountInRupees) => {
    return Math.round(amountInRupees * 100);
  },

  /**
   * Convert amount from paise to rupees
   */
  convertToRupees: (amountInPaise) => {
    return Math.round(amountInPaise / 100);
  },

  /**
   * Validate amount limits
   */
  validateAmount: (amountInPaise) => {
    return amountInPaise >= razorpayConfig.min_amount &&
      amountInPaise <= razorpayConfig.max_amount;
  },

  /**
   * Create order notes for Razorpay
   */
  createOrderNotes: (workspace_id, plan_id, user_id, credits_amount) => {
    return {
      ...razorpayConfig.order_notes,
      workspace_id: workspace_id.toString(),
      plan_id: plan_id.toString(),
      user_id: user_id.toString(),
      credits_amount: credits_amount.toString(),
      created_at: new Date().toISOString()
    };
  }
};

module.exports = {
  razorpay,
  razorpayConfig,
  razorpayUtils
};
