# VaultPay API Contract

**Base URL**: `http://localhost:5000/api`  
**Authentication**: Bearer JWT token in header `Authorization: Bearer <TOKEN>`  
**Standard Response Envelope**:
```json
{
  "success": true,
  "message": "Human readable status message",
  "data": { ... }
}
```
**Standard Error Envelope**:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    { "field": "email", "message": "Please provide a valid email address" }
  ]
}
```

---

## 1. System Health & Info

### 1.1 Check Health
- **Method**: `GET`
- **Endpoint**: `/api/health`
- **Auth**: None (Public)
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "VaultPay Core API is operating normally",
  "data": {
    "status": "healthy",
    "service": "VaultPay Banking API",
    "uptime": 128.42,
    "timestamp": "2026-10-18T08:00:00.000Z",
    "database": {
      "type": "MySQL 8",
      "connected": true
    }
  }
}
```

---

## 2. Authentication

### 2.1 Register User
- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "fullName": "Rahul Sharma",
  "email": "rahul.sharma@example.com",
  "password": "Password@123",
  "phoneNumber": "+919876543210"
}
```
- **Validation Rules**:
  - `fullName`: Required, 2–100 chars
  - `email`: Required, valid email format
  - `password`: Required, 8–64 chars, must include at least 1 uppercase letter, 1 lowercase letter, 1 digit
  - `phoneNumber`: Optional, international format (e.g. `+919876543210`)
- **Sample Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "User registration successful",
  "data": {
    "user": {
      "id": 2,
      "fullName": "Rahul Sharma",
      "email": "rahul.sharma@example.com",
      "phoneNumber": "+919876543210",
      "role": "customer",
      "hasLinkedAccount": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Sample Error Response (409 Conflict)**:
```json
{
  "success": false,
  "message": "An account with this email address already exists."
}
```

### 2.2 Login User
- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "email": "rahul.sharma@example.com",
  "password": "Password@123"
}
```
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 2,
      "fullName": "Rahul Sharma",
      "email": "rahul.sharma@example.com",
      "phoneNumber": "+919876543210",
      "role": "customer",
      "hasLinkedAccount": true,
      "vaultpayId": "rahul@vaultpay"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
> **Frontend Note**: If `user.hasLinkedAccount === false`, navigate the user directly to the **Bank Linking Onboarding Screen** before allowing access to dashboard.

### 2.3 Get Current User Profile
- **Method**: `GET`
- **Endpoint**: `/api/auth/me`
- **Auth**: `Bearer <TOKEN>`
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": 2,
    "fullName": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "phoneNumber": "+919876543210",
    "role": "customer",
    "isActive": true,
    "createdAt": "2026-10-18T10:00:00.000Z",
    "hasLinkedAccount": true,
    "account": {
      "id": 1,
      "accountNumber": "100100234567",
      "balance": 25000.00,
      "currency": "INR",
      "status": "active",
      "bankName": "Apex National Bank",
      "bankCode": "APEX",
      "bankLogo": "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&q=80",
      "vaultpayId": "rahul@vaultpay",
      "qrPayload": "vaultpay://pay?pa=rahul@vaultpay&pn=Rahul%20Sharma&cu=INR"
    }
  }
}
```

### 2.4 Update Profile
- **Method**: `PUT`
- **Endpoint**: `/api/auth/profile`
- **Auth**: `Bearer <TOKEN>`
- **Request Body**:
```json
{
  "fullName": "Rahul K. Sharma",
  "phoneNumber": "+919876543299"
}
```

---

## 3. Banks (Onboarding Selection)

### 3.1 List All Active Fictional Banks
- **Method**: `GET`
- **Endpoint**: `/api/banks`
- **Auth**: None (Public)
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Banks retrieved successfully",
  "data": [
    {
      "id": 1,
      "bankName": "Apex National Bank",
      "bankCode": "APEX",
      "ifscPrefix": "APEX0001",
      "logoUrl": "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&q=80"
    },
    {
      "id": 3,
      "bankName": "Horizon Federal Bank",
      "bankCode": "HORIZON",
      "ifscPrefix": "HZNB0001",
      "logoUrl": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=128&q=80"
    },
    {
      "id": 4,
      "bankName": "Nexus Digital Bank",
      "bankCode": "NEXUS",
      "ifscPrefix": "NXSB0001",
      "logoUrl": "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=128&q=80"
    },
    {
      "id": 5,
      "bankName": "Vault Reserve Bank",
      "bankCode": "VAULT",
      "ifscPrefix": "VLTB0001",
      "logoUrl": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=128&q=80"
    },
    {
      "id": 2,
      "bankName": "Zenith Commerce Bank",
      "bankCode": "ZENITH",
      "ifscPrefix": "ZNTB0001",
      "logoUrl": "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=128&q=80"
    }
  ]
}
```

### 3.2 Get Bank by ID
- **Method**: `GET`
- **Endpoint**: `/api/banks/:id`
- **Auth**: None (Public)

---

## 4. Bank Account Linking & Balance

### 4.1 Link Bank Account (First-Time Onboarding)
- **Method**: `POST`
- **Endpoint**: `/api/accounts/link`
- **Auth**: `Bearer <TOKEN>`
- **Request Body**:
```json
{
  "bankId": 1,
  "accountType": "savings",
  "initialBalance": 0
}
```
- **Validation Rules**:
  - `bankId`: Required integer
  - `accountType`: Optional, "savings" or "current" (default: "savings")
  - `initialBalance`: Optional, numeric >= 0 (default: 0)
- **Sample Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Bank account linked successfully",
  "data": {
    "accountId": 10,
    "accountNumber": "100293847581",
    "ifscCode": "APEX000101",
    "accountType": "savings",
    "balance": 0.00,
    "currency": "INR",
    "isPrimary": true,
    "status": "active",
    "bank": {
      "id": 1,
      "bankName": "Apex National Bank",
      "bankCode": "APEX"
    },
    "paymentProfile": {
      "vaultpayId": "rahul@vaultpay",
      "qrPayload": "vaultpay://pay?pa=rahul@vaultpay&pn=Rahul%20Sharma&cu=INR"
    }
  }
}
```
- **Sample Error Response (409 Conflict)**:
```json
{
  "success": false,
  "message": "You have already linked an account with this bank."
}
```

### 4.2 Get Primary Account Details
- **Method**: `GET`
- **Endpoint**: `/api/accounts/primary`
- **Auth**: `Bearer <TOKEN>`
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Primary account retrieved successfully",
  "data": {
    "accountId": 10,
    "accountNumber": "100293847581",
    "ifscCode": "APEX000101",
    "accountType": "savings",
    "balance": 25000.00,
    "currency": "INR",
    "status": "active",
    "isPrimary": true,
    "linkedAt": "2026-10-18T10:15:30.000Z",
    "bank": {
      "id": 1,
      "bankName": "Apex National Bank",
      "bankCode": "APEX",
      "logoUrl": "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&q=80"
    },
    "paymentProfile": {
      "vaultpayId": "rahul@vaultpay",
      "qrPayload": "vaultpay://pay?pa=rahul@vaultpay&pn=Rahul%20Sharma&cu=INR"
    }
  }
}
```

### 4.3 Get Authoritative Account Balance
- **Method**: `GET`
- **Endpoint**: `/api/accounts/balance`
- **Auth**: `Bearer <TOKEN>`
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Account balance retrieved successfully",
  "data": {
    "accountId": 10,
    "accountNumber": "100293847581",
    "balance": 25000.00,
    "currency": "INR",
    "status": "active",
    "vaultpayId": "rahul@vaultpay"
  }
}
```

---

## 5. Simulated Money (Demo Deposits)

### 5.1 Add Demo Money
- **Method**: `POST`
- **Endpoint**: `/api/accounts/deposit`
- **Auth**: `Bearer <TOKEN>`
- **Request Body**:
```json
{
  "amount": 5000.00,
  "note": "Simulated salary deposit"
}
```
- **Validation Rules**:
  - `amount`: Required positive number between ₹1.00 and ₹50,000.00 per deposit.
  - `note`: Optional string, max 100 characters (default: `"Simulated demo deposit"`).
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Simulated demo deposit successful",
  "data": {
    "transactionId": 14,
    "referenceId": "TXN_DEP_1729350600000_a1b2c3d4",
    "type": "deposit",
    "amount": 5000.00,
    "currency": "INR",
    "previousBalance": 25000.00,
    "newBalance": 30000.00,
    "status": "completed",
    "isSimulated": true,
    "note": "Simulated salary deposit",
    "account": {
      "accountId": 1,
      "accountNumber": "100100234567",
      "bankName": "Apex National Bank",
      "vaultpayId": "rahul@vaultpay"
    },
    "timestamp": "2026-10-19T12:30:00.000Z"
  }
}
```
- **Sample Error Response (422 Unprocessable Entity - Exceeded Limit)**:
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    { "field": "amount", "message": "Maximum simulated deposit per transaction is ₹50,000.00" }
  ]
}
```

---

## 6. Recipient Search & Recent Payees

### 6.1 Search Recipient by VaultPay ID, Name, Phone
- **Method**: `GET`
- **Endpoint**: `/api/users/search?q={query}`
- **Auth**: `Bearer <TOKEN>`
- **Query Parameters**:
  - `q`: Search string (e.g. `priya`, `priya@vaultpay`, or `9876543211`). Required, min 1 char.
- **Privacy Guarantee**: Returns only safe public directory data. Never returns passwords, balances, or full account numbers. Excludes the authenticated sender from results.
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Recipients retrieved successfully",
  "data": [
    {
      "userId": 3,
      "fullName": "Priya Verma",
      "vaultpayId": "priya@vaultpay",
      "bankName": "Zenith Commerce Bank",
      "bankCode": "ZENITH",
      "bankLogo": "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=128&q=80"
    }
  ]
}
```

### 6.2 Get Recent Payees (Homepage Quick Contacts)
- **Method**: `GET`
- **Endpoint**: `/api/users/recent-payees?limit=8`
- **Auth**: `Bearer <TOKEN>`
- **Query Parameters**:
  - `limit`: Optional integer between 1 and 20 (default: 8).
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Recent payees retrieved successfully",
  "data": [
    {
      "beneficiaryId": 1,
      "userId": 3,
      "fullName": "Priya Verma",
      "vaultpayId": "priya@vaultpay",
      "bankName": "Zenith Commerce Bank",
      "bankCode": "ZENITH",
      "bankLogo": "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=128&q=80",
      "lastTransactedAt": "2026-10-19T12:00:00.000Z"
    }
  ]
}
```

---

## 7. Send Money (Transfers)

### 7.1 Execute Peer-to-Peer Transfer
- **Method**: `POST`
- **Endpoint**: `/api/transfers`
- **Auth**: `Bearer <TOKEN>`
- **Headers**:
  - `Idempotency-Key`: *(Recommended)* Unique UUID string to guarantee safe retries.
- **Request Body**:
```json
{
  "recipientVaultpayId": "priya@vaultpay",
  "amount": 1500.00,
  "note": "Lunch bill split",
  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```
- **Validation Rules**:
  - `recipientVaultpayId`: Required string ending with `@vaultpay`.
  - `amount`: Required positive number between ₹1.00 and ₹100,000.00.
  - `note`: Optional string, max 150 characters.
  - `idempotencyKey`: Optional string, max 128 characters.
- **Backend Mechanics**:
  - Sender identity is derived exclusively from JWT (never accepted from body).
  - MySQL begins transaction and applies ordered pessimistic row locks (`SELECT ... FOR UPDATE`).
  - Balances update atomically alongside balanced double-entry ledger records.
  - Beneficiary list updates automatically.
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Money transferred successfully",
  "data": {
    "transactionId": 15,
    "referenceId": "TXN_20261019123045_7f8a9b0c",
    "amount": 1500.00,
    "currency": "INR",
    "senderBalanceAfter": 23500.00,
    "status": "completed",
    "note": "Lunch bill split",
    "recipient": {
      "fullName": "Priya Verma",
      "vaultpayId": "priya@vaultpay",
      "bankName": "Zenith Commerce Bank"
    },
    "timestamp": "2026-10-19T12:30:45.000Z"
  }
}
```
- **Sample Error Responses**:
  - **400 Bad Request — Insufficient Funds**:
    ```json
    {
      "success": false,
      "message": "Insufficient balance for transfer."
    }
    ```
  - **400 Bad Request — Self-Transfer**:
    ```json
    {
      "success": false,
      "message": "Self-transfers to your own account are not permitted."
    }
    ```
  - **400 Bad Request — Frozen Account**:
    ```json
    {
      "success": false,
      "message": "Sender bank account is frozen or inactive. Transfers are restricted."
    }
    ```

---

## 8. Transaction History & Digital Receipts

### 8.1 List User Transactions (Paginated & Filterable)
- **Method**: `GET`
- **Endpoint**: `/api/transactions`
- **Auth**: `Bearer <TOKEN>`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 50)
  - `type`: `'all'` | `'transfer'` | `'deposit'` | `'withdrawal'` (default: `'all'`)
  - `flow`: `'all'` | `'sent'` | `'received'` (default: `'all'`)
  - `status`: `'all'` | `'completed'` | `'pending'` | `'failed'` (default: `'all'`)
  - `startDate`: Optional date `YYYY-MM-DD`
  - `endDate`: Optional date `YYYY-MM-DD`
  - `search`: Search text (matches reference ID, note, or counterparty)
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "items": [
      {
        "transactionId": 15,
        "referenceId": "TXN_20261019123045_7f8a9b0c",
        "type": "transfer",
        "flow": "debit",
        "amount": 1500.00,
        "fee": 0.00,
        "currency": "INR",
        "status": "completed",
        "note": "Lunch bill split",
        "counterparty": {
          "fullName": "Priya Verma",
          "vaultpayId": "priya@vaultpay",
          "bankName": "Zenith Commerce Bank"
        },
        "createdAt": "2026-10-19 12:30:45",
        "completedAt": "2026-10-19 12:30:45"
      },
      {
        "transactionId": 14,
        "referenceId": "TXN_DEP_1729350600000_a1b2c3d4",
        "type": "deposit",
        "flow": "credit",
        "amount": 5000.00,
        "fee": 0.00,
        "currency": "INR",
        "status": "completed",
        "note": "Simulated salary deposit",
        "counterparty": {
          "fullName": "VaultPay Simulated Treasury",
          "vaultpayId": "treasury@vaultpay",
          "bankName": "Simulated Central Reserve"
        },
        "createdAt": "2026-10-19 12:00:00",
        "completedAt": "2026-10-19 12:00:00"
      }
    ],
    "pagination": {
      "total": 24,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  }
}
```

### 8.2 Get Transaction Details & Receipt
- **Method**: `GET`
- **Endpoint**: `/api/transactions/:id` *(Accepts numeric transaction ID or reference string like `TXN_...`)*
- **Auth**: `Bearer <TOKEN>`
- **Security Check**: Returns 403 Forbidden if the authenticated user is neither the sender nor the recipient.
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Transaction details retrieved successfully",
  "data": {
    "transactionId": 15,
    "referenceId": "TXN_20261019123045_7f8a9b0c",
    "type": "transfer",
    "flow": "debit",
    "amount": 1500.00,
    "fee": 0.00,
    "currency": "INR",
    "status": "completed",
    "note": "Lunch bill split",
    "failureReason": null,
    "createdAt": "2026-10-19 12:30:45",
    "completedAt": "2026-10-19 12:30:45",
    "sender": {
      "fullName": "Rahul Sharma",
      "vaultpayId": "rahul@vaultpay",
      "bankName": "Apex National Bank",
      "maskedAccountNumber": "••••4567"
    },
    "recipient": {
      "fullName": "Priya Verma",
      "vaultpayId": "priya@vaultpay",
      "bankName": "Zenith Commerce Bank",
      "maskedAccountNumber": "••••6543"
    },
    "ledgerEntries": [
      {
        "entryId": 22,
        "entryType": "debit",
        "amount": 1500.00,
        "balanceAfter": 23500.00,
        "description": "Debit for transfer to priya@vaultpay (ref: TXN_20261019123045_7f8a9b0c)",
        "timestamp": "2026-10-19 12:30:45"
      }
    ]
  }
}
```

---

## 9. Sample Frontend Payment Workflow

Here is how the React frontend can implement the Google Pay-style transfer flow:

```typescript
// 1. User searches for a payee in the search bar
const searchResponse = await fetch('/api/users/search?q=priya', {
  headers: { Authorization: `Bearer ${token}` }
});
const { data: recipients } = await searchResponse.json();

// 2. User selects recipient and enters amount
const selectedRecipient = recipients[0]; // { vaultpayId: 'priya@vaultpay', ... }

// 3. Generate client-side idempotency key (UUID) to prevent double charge on lag
const idempotencyKey = crypto.randomUUID();

// 4. Send payment
const paymentResponse = await fetch('/api/transfers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Idempotency-Key': idempotencyKey,
  },
  body: JSON.stringify({
    recipientVaultpayId: selectedRecipient.vaultpayId,
    amount: 1500.00,
    note: 'Dinner split',
    idempotencyKey,
  }),
});

const result = await paymentResponse.json();
if (result.success) {
  // Update local balance state immediately with result.data.senderBalanceAfter
  // Display animated Success checkmark and Receipt modal
  console.log('Payment successful! Ref:', result.data.referenceId);
} else {
  // Display toast error: result.message
}
```

---

---

## 10. QR Code Payments & Payee Resolution

### 10.1 Get Authenticated User QR Code
- **Method**: `GET`
- **Endpoint**: `/api/me/qr` *(Alias: `/api/qr/my-code`)*
- **Auth**: `Bearer <TOKEN>`
- **Prerequisite**: User must have completed bank account linking during onboarding. Returns `400 Bad Request` if no bank account is linked.
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "QR code retrieved successfully",
  "data": {
    "userId": 2,
    "fullName": "Rahul Sharma",
    "vaultpayId": "rahul@vaultpay",
    "accountNumber": "••••4567",
    "bankName": "Apex National Bank",
    "bankCode": "APEX",
    "bankLogo": "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&q=80",
    "qrPayload": "vaultpay://pay?pa=rahul@vaultpay&pn=Rahul%20Sharma&cu=INR",
    "qrDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIEAYAAAD97246...",
    "qrSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 29 29\" shape-rendering=\"crispEdges\">...</svg>"
  }
}
```

### 10.2 Resolve QR Recipient / Payee Details
- **Method**: `GET`
- **Endpoint**: `/api/payees/:vaultpayId`
- **Auth**: `Bearer <TOKEN>`
- **Description**: Verifies that the recipient exists, validates account status (active vs frozen), checks self-payment restriction, and returns safe public payment details for the frontend transfer confirmation sheet.
- **Sample Success Response (200 OK — Active Eligible Recipient)**:
```json
{
  "success": true,
  "message": "Payee resolved successfully",
  "data": {
    "vaultpayId": "priya@vaultpay",
    "fullName": "Priya Verma",
    "bankName": "Zenith Commerce Bank",
    "bankCode": "ZENITH",
    "bankLogo": "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=128&q=80",
    "maskedAccountNumber": "••••6543",
    "isEligible": true,
    "isSelf": false,
    "reason": null
  }
}
```
- **Sample Success Response (200 OK — Self-Lookup Restriction)**:
```json
{
  "success": true,
  "message": "Payee resolved successfully",
  "data": {
    "vaultpayId": "rahul@vaultpay",
    "fullName": "Rahul Sharma",
    "bankName": "Apex National Bank",
    "bankCode": "APEX",
    "bankLogo": "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&q=80",
    "maskedAccountNumber": "••••4567",
    "isEligible": false,
    "isSelf": true,
    "reason": "Self-transfers to your own account are not permitted."
  }
}
```
- **Sample Success Response (200 OK — Frozen Account Restriction)**:
```json
{
  "success": true,
  "message": "Payee resolved successfully",
  "data": {
    "vaultpayId": "amit@vaultpay",
    "fullName": "Amit Patel",
    "bankName": "Horizon Federal Bank",
    "bankCode": "HORIZON",
    "bankLogo": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=128&q=80",
    "maskedAccountNumber": "••••6123",
    "isEligible": false,
    "isSelf": false,
    "reason": "Recipient account is frozen or inactive."
  }
}
```
- **Sample Error Response (404 Not Found)**:
```json
{
  "success": false,
  "message": "Recipient VaultPay ID not found or account is inactive."
}
```

### 10.3 Resolve Payee via Raw QR URI / Payload
- **Method**: `POST`
- **Endpoint**: `/api/qr/resolve`
- **Auth**: `Bearer <TOKEN>`
- **Request Body**:
```json
{
  "qrPayload": "vaultpay://pay?pa=priya@vaultpay&pn=Priya%20Verma&cu=INR"
}
```
- **Response**: Same envelope and validation guarantees as `GET /api/payees/:vaultpayId`.

---

## 11. Dashboard Analytics & Summary

### 11.1 Get Dashboard Summary
- **Method**: `GET`
- **Endpoint**: `/api/dashboard/summary`
- **Auth**: `Bearer <TOKEN>`
- **Description**: Returns authoritative balance of primary account, cumulative sent/received/deposit totals, net cash flow, transaction counts, and 5 most recent transactions.
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Dashboard summary retrieved successfully",
  "data": {
    "balance": 25000.00,
    "currency": "INR",
    "totalSent": 0.00,
    "totalReceived": 2000.00,
    "totalDeposited": 25000.00,
    "netCashFlow": 27000.00,
    "transactionCount": 2,
    "primaryAccount": {
      "accountId": 1,
      "accountNumber": "••••4567",
      "bankName": "Apex National Bank",
      "bankCode": "APEX",
      "bankLogo": "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&q=80",
      "vaultpayId": "rahul@vaultpay",
      "status": "active"
    },
    "recentTransactions": [
      {
        "transactionId": 3,
        "referenceId": "TXN_TRF_20261005_001",
        "type": "transfer",
        "flow": "credit",
        "amount": 2000.00,
        "fee": 0.00,
        "currency": "INR",
        "status": "completed",
        "note": "Dinner bill split",
        "counterparty": {
          "fullName": "Priya Verma",
          "vaultpayId": "priya@vaultpay",
          "bankName": "Zenith Commerce Bank"
        },
        "createdAt": "2026-10-18T10:00:00.000Z",
        "completedAt": "2026-10-18T10:00:00.000Z"
      }
    ]
  }
}
```

### 11.2 Get Time-Series Cash Flow Trends & Spending Breakdown
- **Method**: `GET`
- **Endpoint**: `/api/dashboard/analytics?period=6m&days=30`
- **Auth**: `Bearer <TOKEN>`
- **Query Parameters**:
  - `period`: Optional `'1m'` | `'3m'` | `'6m'` | `'1y'` (default: `'6m'`).
  - `days`: Optional integer `1–90` for daily granularity (default: `30`).
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Dashboard analytics retrieved successfully",
  "data": {
    "period": "6m",
    "periodDays": 180,
    "dailyDays": 30,
    "summary": {
      "totalInflow": 27000.00,
      "totalOutflow": 0.00,
      "netCashFlow": 27000.00
    },
    "monthlyTrends": [
      {
        "month": "2026-10",
        "inflow": 27000.00,
        "outflow": 0.00,
        "net": 27000.00,
        "transactionCount": 2
      }
    ],
    "dailyTrends": [
      {
        "date": "2026-10-18",
        "inflow": 2000.00,
        "outflow": 0.00,
        "net": 2000.00,
        "transactionCount": 1
      }
    ],
    "spendingCategories": [
      {
        "category": "Food & Dining",
        "amount": 2000.00,
        "count": 1,
        "percentage": 100.0
      }
    ]
  }
}
```

---

## 12. Payment Receipts & PDF Downloads

### 12.1 Get Full Payment Receipt (JSON Format)
- **Method**: `GET`
- **Endpoint**: `/api/transactions/:id/receipt`
- **Auth**: `Bearer <TOKEN>`
- **Access Control**: Returns `403 Forbidden` if authenticated user is neither the sender nor recipient.
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Transaction receipt retrieved successfully",
  "data": {
    "transactionId": 3,
    "referenceId": "TXN_TRF_20261005_001",
    "receiptNumber": "REC-TXN_TRF_20261005_001",
    "verificationHash": "A8F14E36B920042D3C0123456789ABCD",
    "issuedAt": "2026-10-21T05:20:00.000Z",
    "type": "transfer",
    "flow": "debit",
    "amount": 2000.00,
    "fee": 0.00,
    "currency": "INR",
    "status": "completed",
    "note": "Dinner bill split",
    "failureReason": null,
    "createdAt": "2026-10-18T10:00:00.000Z",
    "completedAt": "2026-10-18T10:00:00.000Z",
    "sender": {
      "fullName": "Priya Verma",
      "vaultpayId": "priya@vaultpay",
      "bankName": "Zenith Commerce Bank",
      "maskedAccountNumber": "••••6543"
    },
    "recipient": {
      "fullName": "Rahul Sharma",
      "vaultpayId": "rahul@vaultpay",
      "bankName": "Apex National Bank",
      "maskedAccountNumber": "••••4567"
    },
    "ledgerEntries": [
      {
        "entryId": 3,
        "entryType": "debit",
        "amount": 2000.00,
        "balanceAfter": 15000.00,
        "description": "Transfer debit to priya@vaultpay (ref: TXN_TRF_20261005_001)",
        "timestamp": "2026-10-18T10:00:00.000Z"
      }
    ]
  }
}
```

### 12.2 Download Official PDF Receipt
- **Method**: `GET`
- **Endpoint**: `/api/transactions/:id/receipt?format=pdf` *(Or send header `Accept: application/pdf`)*
- **Auth**: `Bearer <TOKEN>`
- **Response Headers**:
  - `Content-Type`: `application/pdf`
  - `Content-Disposition`: `attachment; filename="vaultpay-receipt-{referenceId}.pdf"`
- **Response Body**: Binary PDF stream rendered with VaultPay brand colors, status badge, transaction and party information, balanced ledger audit reference, and simulation disclaimer.

---

## 13. Admin Panel, Account Control & Compliance

All endpoints in this section strictly require `Bearer <TOKEN>` authentication where the user record in MySQL possesses `role: 'admin'`. Non-admin requests receive `403 Forbidden`.

### 13.1 List All Users & Account Summaries
- **Method**: `GET`
- **Endpoint**: `/api/admin/users`
- **Auth**: `Bearer <ADMIN_TOKEN>`
- **Query Parameters**:
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `10`, max: `100`)
  - `search`: Search query matching full name, email, phone number, VaultPay ID, or account number
  - `role`: `'all'` | `'customer'` | `'admin'` (default: `'all'`)
  - `status`: `'all'` | `'active'` | `'frozen'` | `'closed'` (default: `'all'`)
- **Privacy & Security**: Passwords, password hashes, and session tokens are strictly excluded from output.
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "items": [
      {
        "id": 2,
        "fullName": "Rahul Sharma",
        "email": "rahul.sharma@example.com",
        "phoneNumber": "+919876543210",
        "role": "customer",
        "isActive": true,
        "createdAt": "2026-10-18T10:00:00.000Z",
        "vaultpayId": "rahul@vaultpay",
        "totalBalance": 25000.00,
        "accounts": [
          {
            "id": 1,
            "accountNumber": "100100234567",
            "maskedAccountNumber": "••••4567",
            "accountType": "savings",
            "balance": 25000.00,
            "currency": "INR",
            "isPrimary": true,
            "status": "active",
            "bank": {
              "id": 1,
              "bankName": "Apex National Bank",
              "bankCode": "APEX",
              "logoUrl": "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&q=80"
            }
          }
        ]
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

### 13.2 Freeze or Unfreeze Bank Account
- **Method**: `PATCH`
- **Endpoint**: `/api/admin/accounts/:id/status`
- **Auth**: `Bearer <ADMIN_TOKEN>`
- **Request Body**:
```json
{
  "status": "frozen",
  "reason": "Suspicious high-velocity transaction alert raised by fraud monitor"
}
```
- **Validation Rules**:
  - `status`: Required, `'active'` or `'frozen'`.
  - `reason`: Required string, 5–255 characters.
- **Enforcement & Audit**:
  - Automatically records the administrator ID, timestamp, and reason via the database trigger `trg_audit_account_status_change` in `audit_logs`.
  - Frozen accounts are immediately barred from both sending and receiving money transfers and depositing funds.
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Bank account successfully marked as frozen",
  "data": {
    "accountId": 2,
    "userId": 3,
    "accountNumber": "200200876543",
    "ownerName": "Priya Verma",
    "ownerEmail": "priya.verma@example.com",
    "previousStatus": "active",
    "status": "frozen",
    "reason": "Suspicious high-velocity transaction alert raised by fraud monitor",
    "updatedBy": {
      "adminId": 1,
      "adminEmail": "admin@vaultpay.com"
    },
    "updatedAt": "2026-10-21T05:45:00.000Z"
  }
}
```

### 13.3 Retrieve Compliance Audit Logs
- **Method**: `GET`
- **Endpoint**: `/api/admin/audit-logs`
- **Auth**: `Bearer <ADMIN_TOKEN>`
- **Query Parameters**:
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `20`, max: `100`)
  - `action`: Filter by action string (e.g. `ACCOUNT_STATUS`, `TRANSFER_COMPLETED`)
  - `entityType`: Filter by entity (e.g. `bank_accounts`, `transactions`, `users`)
  - `userId`: Filter by actor user ID
  - `startDate`: `YYYY-MM-DD`
  - `endDate`: `YYYY-MM-DD`
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Audit logs retrieved successfully",
  "data": {
    "items": [
      {
        "id": 14,
        "action": "ACCOUNT_STATUS_FROZEN",
        "entityType": "bank_accounts",
        "entityId": "2",
        "ipAddress": "127.0.0.1",
        "userAgent": "PostmanRuntime/7.39.0",
        "metadata": {
          "account_number": "200200876543",
          "old_status": "active",
          "new_status": "frozen",
          "reason": "Suspicious high-velocity transaction alert raised by fraud monitor",
          "admin_id": 1
        },
        "createdAt": "2026-10-21T05:45:00.000Z",
        "actor": {
          "id": 1,
          "fullName": "System Administrator",
          "email": "admin@vaultpay.com",
          "role": "admin"
        }
      }
    ],
    "pagination": {
      "total": 14,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### 13.4 System Financial Metrics & General Ledger Reconciliation
- **Method**: `GET`
- **Endpoint**: `/api/admin/system/metrics`
- **Auth**: `Bearer <ADMIN_TOKEN>`
- **Description**: Computes system-wide user counts, account balances, transaction volumes, and conducts mathematical double-entry reconciliation across all ledger entries and account balances using the SQL view `vw_ledger_audit`.
- **Sample Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "System metrics and ledger reconciliation retrieved successfully",
  "data": {
    "timestamp": "2026-10-21T05:48:00.000Z",
    "users": {
      "total": 5,
      "customers": 4,
      "admins": 1,
      "active": 5
    },
    "accounts": {
      "total": 4,
      "active": 4,
      "frozen": 0,
      "closed": 0,
      "totalCirculatingBalance": 98500.00,
      "currency": "INR"
    },
    "transactions": {
      "total": 3,
      "completed": 3,
      "failed": 0,
      "pending": 0,
      "totalTransferVolume": 2000.00,
      "totalDepositVolume": 42000.00,
      "totalWithdrawalVolume": 0.00,
      "currency": "INR"
    },
    "ledgerReconciliation": {
      "isLedgerBalanced": true,
      "isDoubleEntryBalanced": true,
      "isSystemFullyReconciled": false,
      "auditedTransactionsCount": 3,
      "discrepancyCount": 0,
      "totalDiscrepancyAmount": 0.00,
      "cumulativeCredits": 46000.00,
      "cumulativeDebits": 2000.00,
      "totalCirculatingBalance": 98500.00,
      "netDepositInflow": 42000.00,
      "unbackedOpeningBalances": 56500.00,
      "calculationBasis": "Verified via MySQL vw_ledger_audit: zero-sum parity on transfers and balanced credit liability on deposits"
    }
  }
}
```



