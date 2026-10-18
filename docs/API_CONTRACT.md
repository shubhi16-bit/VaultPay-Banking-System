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

## 5. Upcoming Phase Endpoints (Preview)
- `POST /api/payments/deposit` (Phase 2)
- `GET /api/payments/search-recipient?q=...` (Phase 2)
- `POST /api/payments/transfer` (Phase 2)
- `GET /api/transactions` (Phase 2)
- `GET /api/transactions/:referenceId` (Phase 2)
- `GET /api/qr/my-code` (Phase 3)
- `POST /api/qr/resolve` (Phase 3)
- `GET /api/dashboard/summary` (Phase 3)
- `GET /api/admin/users` (Phase 4)
- `PATCH /api/admin/accounts/:id/status` (Phase 4)
- `GET /api/admin/audit-logs` (Phase 4)
