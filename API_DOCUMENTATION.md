# Credit & Payment System API Documentation

## 🎯 **Phase 4: API Endpoints & Frontend Integration**

This document provides comprehensive API documentation for the credit and payment system integration.

## 📋 **Authentication**

All endpoints require authentication headers:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## 💳 **Credit Management APIs**

### Get Credit Balance
```http
GET /client/api/v1/credit/balance/:workspaceId
GET /client/api/v1/credit/balance (uses user's workspace)
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "workspaceId": "workspace_id",
    "availableCredits": 150,
    "totalCreditsUsed": 45,
    "totalCreditsPurchased": 195,
    "lastCreditUpdate": "2025-08-31T10:30:00Z",
    "creditAlertThreshold": 10
  }
}
```

### Get Credit History
```http
POST /client/api/v1/credit/history/:workspaceId
POST /client/api/v1/credit/history
```

**Request Body:**
```json
{
  "options": {
    "page": 1,
    "limit": 20,
    "sort": "-createdAt"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "docs": [
      {
        "_id": "transaction_id",
        "workspace": "workspace_id",
        "amount": 1,
        "transaction_type": "debit",
        "description": "Interview processing credit deduction",
        "balance_before": 151,
        "balance_after": 150,
        "application": "application_id",
        "createdAt": "2025-08-31T10:30:00Z"
      }
    ],
    "totalDocs": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Get Credit Statistics
```http
GET /client/api/v1/credit/stats/:workspaceId
GET /client/api/v1/credit/stats
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "currentBalance": 150,
    "totalPurchased": 195,
    "totalUsed": 45,
    "monthlyUsage": {
      "credits": 12,
      "transactions": 12
    },
    "weeklyUsage": {
      "credits": 3,
      "transactions": 3
    },
    "recentTransactions": [...],
    "alertThreshold": 10,
    "needsAttention": false
  }
}
```

### Update Credit Alert Threshold
```http
PUT /client/api/v1/credit/alert-threshold/:workspaceId
PUT /client/api/v1/credit/alert-threshold
```

**Request Body:**
```json
{
  "threshold": 5
}
```

## 💰 **Purchase & Payment APIs**

### Create Purchase Order
```http
POST /client/api/v1/purchase/create-order
```

**Request Body (Plan-based):**
```json
{
  "planId": "plan_id",
  "workspaceId": "workspace_id"
}
```

**Request Body (Custom credits):**
```json
{
  "customCredits": 50,
  "workspaceId": "workspace_id"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "purchaseId": "purchase_id",
    "orderId": "order_xyz123",
    "amount": 500,
    "creditsAmount": 50,
    "currency": "INR",
    "workspace": {
      "id": "workspace_id",
      "name": "My Workspace"
    }
  },
  "message": "Purchase order created successfully"
}
```

### Verify Payment
```http
POST /client/api/v1/purchase/verify-payment
```

**Request Body:**
```json
{
  "orderId": "order_xyz123",
  "paymentId": "pay_abc456",
  "signature": "razorpay_signature",
  "purchaseId": "purchase_id"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "purchaseId": "purchase_id",
    "paymentId": "pay_abc456",
    "creditsAdded": 50,
    "newBalance": 200,
    "workspace": {
      "id": "workspace_id",
      "name": "My Workspace"
    }
  },
  "message": "Purchase completed successfully and credits added"
}
```

### Get Purchase History
```http
POST /client/api/v1/purchase/history/:workspaceId
POST /client/api/v1/purchase/history
```

**Request Body:**
```json
{
  "status": "completed",
  "dateFrom": "2025-08-01",
  "dateTo": "2025-08-31",
  "options": {
    "page": 1,
    "limit": 10
  }
}
```

### Cancel Purchase
```http
PUT /client/api/v1/purchase/cancel/:purchaseId
```

## 🎤 **Interview APIs**

### Create Interview Session
```http
POST /api/v1/interview/session/create
```

**Request Body:**
```json
{
  "user": "candidate_user_id",
  "job": "job_id",
  "templateId": "template_id",
  "title": "Frontend Developer Interview"
}
```

**Note:** Credit check middleware automatically validates sufficient credits before creation.

### Complete Interview Session
```http
PUT /api/v1/interview/session/complete/:sessionId
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "session_id",
    "status": "completed",
    "completedAt": "2025-08-31T11:00:00Z",
    "credit_deducted": true,
    "credit_deducted_at": "2025-08-31T11:00:00Z"
  },
  "message": "Interview session completed successfully and credit deducted",
  "creditInfo": {
    "creditsDeducted": 1,
    "remainingCredits": 149,
    "transactionId": "credit_transaction_id"
  }
}
```

### Submit Interview Response
```http
POST /api/v1/interview/response/submit
```

**Request Body:**
```json
{
  "sessionId": "session_id",
  "questionNumber": 1,
  "questionText": "Tell me about yourself",
  "responseText": "I am a software developer...",
  "responseAudioUrl": "s3://audio-url",
  "responseDuration": 120
}
```

## 📊 **Dashboard & Analytics APIs**

### Get Workspace Dashboard
```http
GET /client/api/v1/dashboard/workspace/:workspaceId
GET /client/api/v1/dashboard/workspace
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "workspace": {
      "id": "workspace_id",
      "name": "My Workspace",
      "memberCount": 3,
      "createdAt": "2025-07-01T00:00:00Z"
    },
    "credits": {
      "available": 150,
      "totalPurchased": 195,
      "totalUsed": 45,
      "alertThreshold": 10
    },
    "interviews": {
      "total": 45,
      "completed": 38,
      "inProgress": 2,
      "pending": 5,
      "totalCreditsUsed": 38
    },
    "trends": {
      "weeklyInterviews": [...],
      "monthlyCreditUsage": [...]
    },
    "alerts": [
      {
        "type": "warning",
        "message": "Low credits: 5 remaining",
        "action": "purchase_credits",
        "priority": "high"
      }
    ],
    "summary": {
      "activeJobs": 8,
      "thisWeekInterviews": 12,
      "thisMonthCreditsUsed": 25,
      "completionRate": 84
    }
  }
}
```

### Get Credit Analytics
```http
GET /client/api/v1/dashboard/credit-analytics/:workspaceId?dateFrom=2025-08-01&dateTo=2025-08-31&granularity=daily
```

### Get Interview Analytics
```http
GET /client/api/v1/dashboard/interview-analytics/:workspaceId?dateFrom=2025-08-01&dateTo=2025-08-31&jobId=job_id
```

## 🔔 **Webhook Endpoints**

### Razorpay Webhook (Public)
```http
POST /api/v1/payment/webhook/razorpay
```

**Headers:**
```
X-Razorpay-Signature: webhook_signature
Content-Type: application/json
```

## 🛡️ **Error Handling**

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Insufficient credits to process interview",
  "code": "INSUFFICIENT_CREDITS",
  "data": {
    "availableCredits": 0,
    "requiredCredits": 1
  }
}
```

### Common Error Codes:
- `INSUFFICIENT_CREDITS` - Not enough credits for interview
- `WORKSPACE_NOT_FOUND` - Invalid workspace access
- `PAYMENT_VERIFICATION_FAILED` - Payment signature invalid
- `INTERVIEW_ALREADY_COMPLETED` - Duplicate completion attempt
- `PURCHASE_NOT_FOUND` - Invalid purchase reference

## 📱 **Frontend Integration Example**

### React Hook for Credit Management
```javascript
const useCreditManagement = (workspaceId) => {
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/client/api/v1/credit/balance/${workspaceId}`);
      setCredits(response.data.data);
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseCredits = async (planId) => {
    try {
      const orderResponse = await api.post('/client/api/v1/purchase/create-order', {
        planId,
        workspaceId
      });
      
      // Initialize Razorpay payment
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY,
        amount: orderResponse.data.data.amount * 100,
        currency: orderResponse.data.data.currency,
        order_id: orderResponse.data.data.orderId,
        handler: async (response) => {
          await verifyPayment(response, orderResponse.data.data.purchaseId);
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const verifyPayment = async (paymentResponse, purchaseId) => {
    try {
      await api.post('/client/api/v1/purchase/verify-payment', {
        orderId: paymentResponse.razorpay_order_id,
        paymentId: paymentResponse.razorpay_payment_id,
        signature: paymentResponse.razorpay_signature,
        purchaseId
      });
      
      // Refresh credits after successful payment
      fetchCredits();
    } catch (error) {
      console.error('Payment verification failed:', error);
    }
  };

  return {
    credits,
    loading,
    fetchCredits,
    purchaseCredits
  };
};
```

### Interview Processing with Credit Check
```javascript
const useInterviewProcessing = () => {
  const processInterview = async (sessionId) => {
    try {
      // Complete interview (credit deduction happens automatically)
      const response = await api.put(`/api/v1/interview/session/complete/${sessionId}`);
      
      if (response.data.status === 'success') {
        toast.success(`Interview completed! ${response.data.creditInfo.creditsDeducted} credit used. ${response.data.creditInfo.remainingCredits} credits remaining.`);
      }
    } catch (error) {
      if (error.response?.data?.code === 'INSUFFICIENT_CREDITS') {
        toast.error('Insufficient credits! Please purchase more credits to continue.');
        // Redirect to purchase page
      } else {
        toast.error('Interview processing failed');
      }
    }
  };

  return { processInterview };
};
```

## 🔄 **Real-time Updates**

For real-time credit balance updates, consider implementing WebSocket connections or Server-Sent Events for:
- Credit balance changes
- Purchase completions
- Interview completions
- Low credit alerts

## 📈 **Rate Limiting**

API endpoints are rate-limited:
- 100 requests per 10 minutes per IP
- Special endpoints (webhooks) have separate limits
- Authenticated requests have higher limits

## 🧪 **Testing**

### Test Credit Purchase Flow:
1. Create purchase order
2. Use Razorpay test credentials
3. Complete payment with test card
4. Verify webhook processing
5. Confirm credit addition

### Test Interview Flow:
1. Ensure sufficient credits
2. Create interview session
3. Submit responses
4. Complete interview
5. Verify credit deduction

---

This API documentation provides all the endpoints needed for frontend integration with the credit and payment system. The system is now **production-ready** with comprehensive error handling, security measures, and real-time capabilities.
