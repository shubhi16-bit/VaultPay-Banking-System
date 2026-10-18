-- ============================================================================
-- VaultPay Digital Banking & Transaction Management System
-- Schema Definition (MySQL 8.0+)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS vaultpay_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vaultpay_db;

-- ----------------------------------------------------------------------------
-- 1. Users Table
-- Stores user credentials, contact details, and role assignments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NULL,
    role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. Banks Table
-- Fictional commercial and central simulated banks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL UNIQUE,
    bank_code VARCHAR(20) NOT NULL UNIQUE,
    ifsc_prefix VARCHAR(10) NOT NULL UNIQUE,
    logo_url VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. Bank Accounts Table
-- User accounts linked to banks with authoritative financial balance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    bank_id INT NOT NULL,
    account_number VARCHAR(30) NOT NULL UNIQUE,
    ifsc_code VARCHAR(20) NOT NULL,
    account_type ENUM('savings', 'current') NOT NULL DEFAULT 'savings',
    balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    status ENUM('active', 'frozen', 'closed') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_accounts_bank FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE RESTRICT,
    CONSTRAINT chk_account_balance CHECK (balance >= 0.00),
    UNIQUE KEY uq_user_bank (user_id, bank_id),
    INDEX idx_accounts_user_id (user_id),
    INDEX idx_accounts_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. Payment Profiles Table (VaultPay IDs / VPA & QR Safe Payloads)
-- Maps user & primary bank account to simulated VaultPay handle
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    primary_account_id BIGINT NOT NULL,
    vaultpay_id VARCHAR(100) NOT NULL UNIQUE,
    qr_code_payload VARCHAR(255) NOT NULL UNIQUE,
    status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_profiles_primary_account FOREIGN KEY (primary_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    INDEX idx_profiles_vaultpay_id (vaultpay_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. Transactions Table
-- Master record of all financial movements (transfers, deposits, withdrawals)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reference_id VARCHAR(64) NOT NULL UNIQUE,
    idempotency_key VARCHAR(128) NULL UNIQUE,
    sender_user_id BIGINT NULL,
    recipient_user_id BIGINT NULL,
    sender_account_id BIGINT NULL,
    recipient_account_id BIGINT NULL,
    type ENUM('transfer', 'deposit', 'withdrawal') NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    fee DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'completed', 'failed', 'reversed') NOT NULL DEFAULT 'pending',
    note VARCHAR(255) NULL,
    failure_reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_tx_sender_user FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tx_recipient_user FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tx_sender_account FOREIGN KEY (sender_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
    CONSTRAINT fk_tx_recipient_account FOREIGN KEY (recipient_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
    CONSTRAINT chk_tx_amount CHECK (amount > 0.00),
    INDEX idx_tx_reference_id (reference_id),
    INDEX idx_tx_created_at (created_at),
    INDEX idx_tx_sender (sender_user_id),
    INDEX idx_tx_recipient (recipient_user_id),
    INDEX idx_tx_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. Ledger Entries Table (Double-Entry Bookkeeping)
-- Every financial event produces balanced debits and credits
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    entry_type ENUM('debit', 'credit') NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    balance_after DECIMAL(18,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ledger_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ledger_account FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT chk_ledger_amount CHECK (amount > 0.00),
    INDEX idx_ledger_account (account_id),
    INDEX idx_ledger_tx (transaction_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. Beneficiaries / Recent Payees Table
-- Quick access to frequently or recently transacted users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficiaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    payee_user_id BIGINT NOT NULL,
    payee_vaultpay_id VARCHAR(100) NOT NULL,
    last_transacted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_beneficiary_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_beneficiary_payee FOREIGN KEY (payee_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_payee (user_id, payee_user_id),
    INDEX idx_beneficiary_user (user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. Audit Logs Table
-- Complete regulatory & security log of user and admin actions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(64) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. Idempotency Records Table
-- Prevents duplicate payment execution on network retries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS idempotency_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    request_path VARCHAR(255) NOT NULL,
    response_status INT NOT NULL,
    response_body JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_idempotency_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_idempotency_key (key_hash),
    INDEX idx_idempotency_expires (expires_at)
) ENGINE=InnoDB;
