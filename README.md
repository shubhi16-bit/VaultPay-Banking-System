# VaultPay — Digital Banking & Transaction Management System

A Google Pay–inspired simulated digital payment platform engineered for a B.Tech RDBMS laboratory project and software portfolio.

---

## 1. Project Overview

VaultPay is a full-featured digital banking and simulated transaction management platform built on a relational database architecture.

### Team Responsibilities:
- **Frontend** (`frontend/`): React, TypeScript, Vite, Tailwind CSS.
- **Backend & Database** (`backend/`, `database/`): Node.js, Express.js, MySQL 8, JWT, Zod, REST APIs, Double-Entry Ledger, Deterministic Concurrency Control.

---

## 2. Technology Stack

- **Runtime**: Node.js (v20+) with ES Modules (`"type": "module"`)
- **Web Framework**: Express.js 4.x
- **Database Engine**: MySQL 8.0+ (InnoDB)
- **Database Driver**: `mysql2/promise` (Parameterized SQL queries & connection pooling)
- **Security & Cryptography**: `bcryptjs` (Password hashing), `jsonwebtoken` (JWT), `helmet`, `cors`, `express-rate-limit`
- **Validation**: Zod (Type-safe schema validation)
- **Testing**: Vitest + Supertest

---

## 3. Repository Structure

```
VaultPay/
├── .gitignore               # Protects secrets, node_modules, and temporary files
├── README.md                # Project architecture & setup documentation
├── frontend/                # Frontend application (Owned by teammate)
├── backend/
│   ├── src/
│   │   ├── config/          # MySQL connection pool and environment loading
│   │   ├── controllers/     # HTTP request handling and response mapping
│   │   ├── routes/          # REST route declarations and middleware attachment
│   │   ├── services/        # Authoritative business, banking, and SQL logic
│   │   ├── middleware/      # Auth (JWT), RBAC, Zod validation, rate limiter, errors
│   │   ├── validators/      # Zod input schemas
│   │   ├── utils/           # Standardized API response and logging utilities
│   │   ├── scripts/         # initDb.js and seedDb.js database runners
│   │   ├── app.js           # Express app setup and middleware configuration
│   │   └── server.js        # Server listener and graceful shutdown
│   ├── tests/               # Automated unit & integration test suites
│   ├── .env.example         # Template for environment configuration
│   └── package.json         # Backend dependencies and execution scripts
├── database/
│   ├── schema.sql           # 3NF relational schema (9 tables, constraints, indexes)
│   ├── seed.sql             # Demo users, fictional banks, sample transactions
│   ├── views.sql            # Analytical & denormalized query views
│   ├── triggers.sql         # Non-negative balance check & immutable audit logs
│   └── procedures.sql       # Stored procedures for account linking and transfers
└── docs/
    ├── API_CONTRACT.md      # REST endpoints contract for frontend integration
    └── DATABASE_DESIGN.md   # Schema catalog, ER diagrams, and normalization rules
```

---

## 4. Local MySQL Setup Instructions

To run VaultPay locally, you need a running MySQL 8 instance or a local stack such as XAMPP / MariaDB.

### Option A: Standard MySQL 8 Community Server
1. Download and install **MySQL Community Server 8.0+** from [dev.mysql.com](https://dev.mysql.com/downloads/installer/).
2. During installation, set the root password (or leave blank for local development).
3. Start the MySQL Windows service (or run `net start mysql` in an Administrator terminal).

### Option B: Using XAMPP
1. Download and open **XAMPP Control Panel**.
2. Click **Start** next to the **MySQL** module.
3. Default port is `3306`, user is `root`, and password is empty.

### Create Database & Seed Data
Once MySQL is running:
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to match your MySQL `DB_USER` and `DB_PASSWORD` if required.*

3. Run the automated database initializer (creates tables, views, triggers, and procedures):
   ```bash
   npm run db:init
   ```

4. Populate the database with fictional banks, demo customers, and sample transactions:
   ```bash
   npm run db:seed
   ```

---

## 5. Running the Backend Server

```bash
# Start backend in development mode with automatic reload
npm run dev

# Or start in standard production mode
npm start
```

- Server URL: `http://localhost:5000`
- Health Check: `http://localhost:5000/api/health`

---

## 6. Running Tests

We use Vitest and Supertest for unit and integration testing.

```bash
cd backend
npm test
```

All 25 automated tests verify:
- Health check and DB connectivity diagnostics
- User registration (valid data, duplicate email handling, weak password rejection, malformed emails)
- User login (valid authentication, invalid password rejection, nonexistent user handling)
- Bearer JWT token verification and user profile retrieval
- Bank listing and individual bank queries
- Bank account linking during onboarding (unique account generation, VaultPay ID generation, duplicate linking prevention)
- Primary account retrieval and authoritative balance queries

---

## 7. Demo Accounts (After Running `npm run db:seed`)

| Role | Email | Password | Linked Bank | VaultPay ID | Initial Balance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@vaultpay.com` | `Admin@123` | System Administrator | - | - |
| **Customer** | `rahul.sharma@example.com` | `Password@123` | Apex National Bank | `rahul@vaultpay` | ₹25,000.00 |
| **Customer** | `priya.verma@example.com` | `Password@123` | Zenith Commerce Bank | `priya@vaultpay` | ₹15,000.00 |
| **Customer** | `amit.patel@example.com` | `Password@123` | Horizon Federal Bank | `amit@vaultpay` | ₹8,500.00 |
| **Customer** | `sneha.gupta@example.com` | `Password@123` | Nexus Digital Bank | `sneha@vaultpay` | ₹50,000.00 |

---

## 8. Development Roadmap

- [x] **Phase 1 — Foundation**: Express setup, 3NF MySQL schema, connection pool, health check, auth (JWT + bcrypt), bank listing, account onboarding, API contract, and tests.
- [ ] **Phase 2 — Core Payments**: Simulated deposits, recipient lookup, atomic transfer with pessimistic deterministic locking, double-entry ledger, idempotency keys, and transaction history.
- [ ] **Phase 3 — QR & Dashboard**: Safe QR payload generation, QR recipient resolution, dashboard analytics, and transaction receipts.
- [ ] **Phase 4 — Admin & Advanced SQL**: Admin dashboard, account freezing/unfreezing, audit trail explorer, concurrency tests, and final presentation documentation.
