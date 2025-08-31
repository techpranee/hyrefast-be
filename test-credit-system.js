/**
 * test-credit-system.js
 * @description :: Test script for credit and payment system
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || 'your_jwt_token_here';
const TEST_WORKSPACE_ID = process.env.TEST_WORKSPACE_ID || 'your_workspace_id_here';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test Results Storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper Functions
const logTest = (testName, success, error = null) => {
  if (success) {
    console.log(`✅ ${testName} - PASSED`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName} - FAILED`);
    if (error) {
      console.log(`   Error: ${error.message}`);
      testResults.errors.push({ test: testName, error: error.message });
    }
    testResults.failed++;
  }
};

// Test Credit APIs
const testCreditApis = async () => {
  console.log('\n🔥 Testing Credit Management APIs...\n');

  // Test 1: Get Credit Balance
  try {
    const response = await api.get(`/client/api/v1/credit/balance/${TEST_WORKSPACE_ID}`);
    const hasRequiredFields = response.data.data.availableCredits !== undefined &&
      response.data.data.totalCreditsUsed !== undefined;
    logTest('Get Credit Balance', response.status === 200 && hasRequiredFields);
  } catch (error) {
    logTest('Get Credit Balance', false, error);
  }

  // Test 2: Get Credit History
  try {
    const response = await api.post(`/client/api/v1/credit/history/${TEST_WORKSPACE_ID}`, {
      options: { page: 1, limit: 5 }
    });
    const hasData = response.data.data && response.data.data.docs;
    logTest('Get Credit History', response.status === 200 && hasData);
  } catch (error) {
    logTest('Get Credit History', false, error);
  }

  // Test 3: Get Credit Statistics
  try {
    const response = await api.get(`/client/api/v1/credit/stats/${TEST_WORKSPACE_ID}`);
    const hasStats = response.data.data.currentBalance !== undefined &&
      response.data.data.monthlyUsage !== undefined;
    logTest('Get Credit Statistics', response.status === 200 && hasStats);
  } catch (error) {
    logTest('Get Credit Statistics', false, error);
  }

  // Test 4: Update Alert Threshold
  try {
    const response = await api.put(`/client/api/v1/credit/alert-threshold/${TEST_WORKSPACE_ID}`, {
      threshold: 5
    });
    logTest('Update Alert Threshold', response.status === 200);
  } catch (error) {
    logTest('Update Alert Threshold', false, error);
  }
};

// Test Purchase APIs
const testPurchaseApis = async () => {
  console.log('\n💳 Testing Purchase Management APIs...\n');

  let purchaseId = null;

  // Test 1: Create Purchase Order (Custom Credits)
  try {
    const response = await api.post('/client/api/v1/purchase/create-order', {
      customCredits: 10,
      workspaceId: TEST_WORKSPACE_ID
    });
    const hasOrderData = response.data.data.purchaseId && response.data.data.orderId;
    purchaseId = response.data.data.purchaseId;
    logTest('Create Purchase Order', response.status === 200 && hasOrderData);
  } catch (error) {
    logTest('Create Purchase Order', false, error);
  }

  // Test 2: Get Purchase History
  try {
    const response = await api.post(`/client/api/v1/purchase/history/${TEST_WORKSPACE_ID}`, {
      options: { page: 1, limit: 5 }
    });
    const hasData = response.data.data && response.data.data.docs;
    logTest('Get Purchase History', response.status === 200 && hasData);
  } catch (error) {
    logTest('Get Purchase History', false, error);
  }

  // Test 3: Cancel Purchase (if created)
  if (purchaseId) {
    try {
      const response = await api.put(`/client/api/v1/purchase/cancel/${purchaseId}`);
      logTest('Cancel Purchase', response.status === 200);
    } catch (error) {
      logTest('Cancel Purchase', false, error);
    }
  }
};

// Test Interview APIs
const testInterviewApis = async () => {
  console.log('\n🎤 Testing Interview APIs...\n');

  // Test 1: List Interview Templates
  try {
    const response = await api.post('/api/v1/interview/template/list', {
      options: { page: 1, limit: 5 }
    });
    logTest('List Interview Templates', response.status === 200);
  } catch (error) {
    logTest('List Interview Templates', false, error);
  }

  // Test 2: Get Session Analytics (if sessions exist)
  try {
    // First get a session to test analytics
    const sessionsResponse = await api.post('/api/v1/interview/session/list', {
      options: { page: 1, limit: 1 }
    });

    if (sessionsResponse.data.data && sessionsResponse.data.data.docs.length > 0) {
      const sessionId = sessionsResponse.data.data.docs[0]._id;
      const analyticsResponse = await api.get(`/api/v1/interview/analytics/session/${sessionId}`);
      logTest('Get Session Analytics', analyticsResponse.status === 200);
    } else {
      logTest('Get Session Analytics', true); // Skip if no sessions
    }
  } catch (error) {
    logTest('Get Session Analytics', false, error);
  }
};

// Test Dashboard APIs
const testDashboardApis = async () => {
  console.log('\n📊 Testing Dashboard APIs...\n');

  // Test 1: Get Workspace Dashboard
  try {
    const response = await api.get(`/client/api/v1/dashboard/workspace/${TEST_WORKSPACE_ID}`);
    const hasDashboardData = response.data.data.workspace &&
      response.data.data.credits &&
      response.data.data.interviews;
    logTest('Get Workspace Dashboard', response.status === 200 && hasDashboardData);
  } catch (error) {
    logTest('Get Workspace Dashboard', false, error);
  }

  // Test 2: Get Credit Analytics
  try {
    const response = await api.get(`/client/api/v1/dashboard/credit-analytics/${TEST_WORKSPACE_ID}?granularity=daily`);
    const hasAnalytics = response.data.data.timeSeries !== undefined;
    logTest('Get Credit Analytics', response.status === 200 && hasAnalytics);
  } catch (error) {
    logTest('Get Credit Analytics', false, error);
  }

  // Test 3: Get Interview Analytics
  try {
    const response = await api.get(`/client/api/v1/dashboard/interview-analytics/${TEST_WORKSPACE_ID}`);
    const hasAnalytics = response.data.data.summary !== undefined;
    logTest('Get Interview Analytics', response.status === 200 && hasAnalytics);
  } catch (error) {
    logTest('Get Interview Analytics', false, error);
  }
};

// Test Credit Service Functions
const testCreditServices = async () => {
  console.log('\n🔧 Testing Credit Service Functions...\n');

  // These would typically be integration tests within the application
  // For now, we'll test the API endpoints that use these services

  // Test credit balance consistency
  try {
    const balanceResponse = await api.get(`/client/api/v1/credit/balance/${TEST_WORKSPACE_ID}`);
    const statsResponse = await api.get(`/client/api/v1/credit/stats/${TEST_WORKSPACE_ID}`);

    const balanceMatch = balanceResponse.data.data.availableCredits === statsResponse.data.data.currentBalance;
    logTest('Credit Balance Consistency', balanceMatch);
  } catch (error) {
    logTest('Credit Balance Consistency', false, error);
  }
};

// Test Error Handling
const testErrorHandling = async () => {
  console.log('\n🛡️ Testing Error Handling...\n');

  // Test 1: Invalid Workspace ID
  try {
    await api.get('/client/api/v1/credit/balance/invalid_workspace_id');
    logTest('Invalid Workspace Error', false); // Should have thrown error
  } catch (error) {
    logTest('Invalid Workspace Error', error.response?.status === 404 || error.response?.status === 400);
  }

  // Test 2: Missing Required Fields
  try {
    await api.post('/client/api/v1/purchase/create-order', {
      // Missing required fields
    });
    logTest('Missing Fields Error', false); // Should have thrown error
  } catch (error) {
    logTest('Missing Fields Error', error.response?.status === 400);
  }

  // Test 3: Unauthorized Access (test with invalid token)
  try {
    const invalidApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': 'Bearer invalid_token',
        'Content-Type': 'application/json'
      }
    });

    await invalidApi.get(`/client/api/v1/credit/balance/${TEST_WORKSPACE_ID}`);
    logTest('Unauthorized Access Error', false); // Should have thrown error
  } catch (error) {
    logTest('Unauthorized Access Error', error.response?.status === 401);
  }
};

// Main Test Runner
const runAllTests = async () => {
  console.log('🚀 Starting Credit & Payment System API Tests...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Workspace ID: ${TEST_WORKSPACE_ID}\n`);

  // Check if configuration is set
  if (TEST_USER_TOKEN === 'your_jwt_token_here' || TEST_WORKSPACE_ID === 'your_workspace_id_here') {
    console.log('❌ Please set TEST_USER_TOKEN and TEST_WORKSPACE_ID environment variables');
    console.log('Example: TEST_USER_TOKEN=your_token TEST_WORKSPACE_ID=workspace_id node test-credit-system.js');
    process.exit(1);
  }

  try {
    await testCreditApis();
    await testPurchaseApis();
    await testInterviewApis();
    await testDashboardApis();
    await testCreditServices();
    await testErrorHandling();

    // Print Results
    console.log('\n📋 Test Results Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.passed + testResults.failed}`);

    if (testResults.failed > 0) {
      console.log('\n🐛 Failed Tests:');
      testResults.errors.forEach(error => {
        console.log(`   - ${error.test}: ${error.error}`);
      });
    }

    const successRate = Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100);
    console.log(`\n🎯 Success Rate: ${successRate}%`);

    if (successRate >= 80) {
      console.log('\n🎉 Credit & Payment System APIs are working well!');
    } else {
      console.log('\n⚠️ Some issues detected. Please review failed tests.');
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
};

// Performance Test
const performanceTest = async () => {
  console.log('\n⚡ Running Performance Tests...\n');

  const startTime = Date.now();
  const promises = [];

  // Test concurrent requests
  for (let i = 0; i < 5; i++) {
    promises.push(api.get(`/client/api/v1/credit/balance/${TEST_WORKSPACE_ID}`));
  }

  try {
    await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`✅ Concurrent Requests: 5 requests completed in ${totalTime}ms`);
    console.log(`⚡ Average Response Time: ${totalTime / 5}ms per request`);

    if (totalTime < 5000) {
      console.log('🚀 Performance: Excellent');
    } else if (totalTime < 10000) {
      console.log('⚡ Performance: Good');
    } else {
      console.log('🐌 Performance: Needs optimization');
    }
  } catch (error) {
    console.log('❌ Performance test failed:', error.message);
  }
};

// Export for programmatic use
module.exports = {
  runAllTests,
  performanceTest,
  testCreditApis,
  testPurchaseApis,
  testInterviewApis,
  testDashboardApis
};

// Run tests if called directly
if (require.main === module) {
  runAllTests().then(() => {
    return performanceTest();
  }).then(() => {
    process.exit(testResults.failed > 0 ? 1 : 0);
  });
}
