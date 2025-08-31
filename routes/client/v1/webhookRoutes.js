/**
 * webhookRoutes.js
 * @description :: Payment webhook routes
 */

const express = require('express');
const router = express.Router();
const paymentWebhookController = require('../../../controller/client/v1/paymentWebhookController');
const { PLATFORM } = require('../../../constants/authConstant');
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');

// Public webhook endpoint (no authentication required)
router.route('/webhook/razorpay').post(paymentWebhookController.handleRazorpayWebhook);

// Admin-only webhook management routes
router.route('/webhook/verify-payment/:paymentId').post(auth(PLATFORM.CLIENT), checkRolePermission, paymentWebhookController.verifyPaymentManually);
router.route('/webhook/logs').post(auth(PLATFORM.CLIENT), checkRolePermission, paymentWebhookController.getWebhookLogs);

module.exports = router;
