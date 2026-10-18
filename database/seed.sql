-- ============================================================================
-- VaultPay Digital Banking & Transaction Management System
-- Seed Data Script
-- ============================================================================

USE vaultpay_db;

-- ----------------------------------------------------------------------------
-- 1. Seed Fictional Banks
-- ----------------------------------------------------------------------------
INSERT INTO banks (id, bank_name, bank_code, ifsc_prefix, logo_url, is_active)
VALUES
(1, 'Apex National Bank', 'APEX', 'APEX0001', 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&q=80', TRUE),
(2, 'Zenith Commerce Bank', 'ZENITH', 'ZNTB0001', 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=128&q=80', TRUE),
(3, 'Horizon Federal Bank', 'HORIZON', 'HZNB0001', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=128&q=80', TRUE),
(4, 'Nexus Digital Bank', 'NEXUS', 'NXSB0001', 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=128&q=80', TRUE),
(5, 'Vault Reserve Bank', 'VAULT', 'VLTB0001', 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=128&q=80', TRUE)
ON DUPLICATE KEY UPDATE bank_name=VALUES(bank_name);

-- ----------------------------------------------------------------------------
-- 2. Seed Users
-- Passwords:
-- Admin: Admin@123
-- Customers: Password@123
-- ----------------------------------------------------------------------------
INSERT INTO users (id, full_name, email, password_hash, phone_number, role, is_active)
VALUES
(1, 'System Administrator', 'admin@vaultpay.com', '$2a$10$Ufqm5FTp5hL0Kk1e6Yto7.dvs0Km1zczKR1WN.4D3wDgyYUNOwB9S', '+919999900000', 'admin', TRUE),
(2, 'Rahul Sharma', 'rahul.sharma@example.com', '$2a$10$p5tsHobg.Fs2hNfGE8UpOuXuhHiOLW7HcEOo7jATv4ZHH9Dl9w7uq', '+919876543210', 'customer', TRUE),
(3, 'Priya Verma', 'priya.verma@example.com', '$2a$10$p5tsHobg.Fs2hNfGE8UpOuXuhHiOLW7HcEOo7jATv4ZHH9Dl9w7uq', '+919876543211', 'customer', TRUE),
(4, 'Amit Patel', 'amit.patel@example.com', '$2a$10$p5tsHobg.Fs2hNfGE8UpOuXuhHiOLW7HcEOo7jATv4ZHH9Dl9w7uq', '+919876543212', 'customer', TRUE),
(5, 'Sneha Gupta', 'sneha.gupta@example.com', '$2a$10$p5tsHobg.Fs2hNfGE8UpOuXuhHiOLW7HcEOo7jATv4ZHH9Dl9w7uq', '+919876543213', 'customer', TRUE)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- ----------------------------------------------------------------------------
-- 3. Seed Bank Accounts
-- ----------------------------------------------------------------------------
INSERT INTO bank_accounts (id, user_id, bank_id, account_number, ifsc_code, account_type, balance, currency, is_primary, status)
VALUES
(1, 2, 1, '100100234567', 'APEX000101', 'savings', 25000.00, 'INR', TRUE, 'active'),
(2, 3, 2, '200200876543', 'ZNTB000102', 'savings', 15000.00, 'INR', TRUE, 'active'),
(3, 4, 3, '300300456123', 'HZNB000103', 'savings', 8500.00, 'INR', TRUE, 'active'),
(4, 5, 4, '400400789012', 'NXSB000104', 'savings', 50000.00, 'INR', TRUE, 'active')
ON DUPLICATE KEY UPDATE balance=VALUES(balance);

-- ----------------------------------------------------------------------------
-- 4. Seed Payment Profiles
-- ----------------------------------------------------------------------------
INSERT INTO payment_profiles (id, user_id, primary_account_id, vaultpay_id, qr_code_payload, status)
VALUES
(1, 2, 1, 'rahul@vaultpay', 'vaultpay://pay?pa=rahul@vaultpay&pn=Rahul%20Sharma&cu=INR', 'active'),
(2, 3, 2, 'priya@vaultpay', 'vaultpay://pay?pa=priya@vaultpay&pn=Priya%20Verma&cu=INR', 'active'),
(3, 4, 3, 'amit@vaultpay', 'vaultpay://pay?pa=amit@vaultpay&pn=Amit%20Patel&cu=INR', 'active'),
(4, 5, 4, 'sneha@vaultpay', 'vaultpay://pay?pa=sneha@vaultpay&pn=Sneha%20Gupta&cu=INR', 'active')
ON DUPLICATE KEY UPDATE vaultpay_id=VALUES(vaultpay_id);

-- ----------------------------------------------------------------------------
-- 5. Seed Initial Transactions & Ledger Entries
-- Transaction 1: Initial demo deposit for Rahul (₹25,000.00)
-- ----------------------------------------------------------------------------
INSERT INTO transactions (id, reference_id, idempotency_key, sender_user_id, recipient_user_id, sender_account_id, recipient_account_id, type, amount, fee, status, note, created_at, completed_at)
VALUES
(1, 'TXN_DEP_20261001_001', 'idemp_dep_rahul_001', NULL, 2, NULL, 1, 'deposit', 25000.00, 0.00, 'completed', 'Welcome bonus deposit', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY),
(2, 'TXN_DEP_20261001_002', 'idemp_dep_priya_001', NULL, 3, NULL, 2, 'deposit', 17000.00, 0.00, 'completed', 'Initial simulated balance', NOW() - INTERVAL 8 DAY, NOW() - INTERVAL 8 DAY),
(3, 'TXN_TRF_20261005_001', 'idemp_trf_priya_rahul_001', 3, 2, 2, 1, 'transfer', 2000.00, 0.00, 'completed', 'Dinner bill split', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY)
ON DUPLICATE KEY UPDATE reference_id=VALUES(reference_id);

-- Balanced double-entry ledger records
INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, balance_after, description, created_at)
VALUES
(1, 1, 1, 'credit', 25000.00, 25000.00, 'Demo deposit credit to account 100100234567', NOW() - INTERVAL 10 DAY),
(2, 2, 2, 'credit', 17000.00, 17000.00, 'Demo deposit credit to account 200200876543', NOW() - INTERVAL 8 DAY),
(3, 3, 2, 'debit', 2000.00, 15000.00, 'Transfer debit to priya@vaultpay (ref: TXN_TRF_20261005_001)', NOW() - INTERVAL 3 DAY),
(4, 3, 1, 'credit', 2000.00, 27000.00, 'Transfer credit from priya@vaultpay (ref: TXN_TRF_20261005_001)', NOW() - INTERVAL 3 DAY)
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- ----------------------------------------------------------------------------
-- 6. Seed Beneficiaries
-- ----------------------------------------------------------------------------
INSERT INTO beneficiaries (id, user_id, payee_user_id, payee_vaultpay_id, last_transacted_at)
VALUES
(1, 3, 2, 'rahul@vaultpay', NOW() - INTERVAL 3 DAY),
(2, 2, 3, 'priya@vaultpay', NOW() - INTERVAL 3 DAY)
ON DUPLICATE KEY UPDATE payee_vaultpay_id=VALUES(payee_vaultpay_id);

-- ----------------------------------------------------------------------------
-- 7. Seed Audit Logs
-- ----------------------------------------------------------------------------
INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, user_agent, metadata, created_at)
VALUES
(1, 1, 'SYSTEM_INITIALIZED', 'system', 'root', '127.0.0.1', 'System/InitialSeed', '{"environment": "development"}', NOW() - INTERVAL 15 DAY),
(2, 2, 'USER_REGISTERED', 'users', '2', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"email": "rahul.sharma@example.com"}', NOW() - INTERVAL 10 DAY),
(3, 2, 'ACCOUNT_LINKED', 'bank_accounts', '1', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"bank": "Apex National Bank", "vaultpay_id": "rahul@vaultpay"}', NOW() - INTERVAL 10 DAY)
ON DUPLICATE KEY UPDATE action=VALUES(action);
