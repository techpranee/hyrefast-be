/**
 * dashboardRoutes.js
 * @description :: Dashboard API routes with analytics
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../../../controller/client/v1/dashboardController');
const { PLATFORM } = require('../../../constants/authConstant');
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');

// Dashboard Routes
router.route('/client/api/v1/dashboard/workspace/:workspaceId').get(auth(PLATFORM.CLIENT), checkRolePermission, dashboardController.getWorkspaceDashboard);
router.route('/client/api/v1/dashboard/workspace').get(auth(PLATFORM.CLIENT), checkRolePermission, dashboardController.getWorkspaceDashboard);

// Analytics Routes
router.route('/client/api/v1/dashboard/credit-analytics/:workspaceId').get(auth(PLATFORM.CLIENT), checkRolePermission, dashboardController.getCreditAnalytics);
router.route('/client/api/v1/dashboard/credit-analytics').get(auth(PLATFORM.CLIENT), checkRolePermission, dashboardController.getCreditAnalytics);
router.route('/client/api/v1/dashboard/interview-analytics/:workspaceId').get(auth(PLATFORM.CLIENT), checkRolePermission, dashboardController.getInterviewAnalytics);
router.route('/client/api/v1/dashboard/interview-analytics').get(auth(PLATFORM.CLIENT), checkRolePermission, dashboardController.getInterviewAnalytics);

module.exports = router;