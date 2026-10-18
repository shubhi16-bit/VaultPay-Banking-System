-- ============================================================================
-- VaultPay Digital Banking & Transaction Management System
-- SQL Views
-- ============================================================================

USE vaultpay_db;

-- ----------------------------------------------------------------------------
-- 1. View: vw_user_account_summary
-- Complete profile of a user's primary linked banking account
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_user_account_summary AS
SELECT 
    u.id AS user_id,
    u.full_name,
    u.email,
    u.phone_number,
    u.role,
    u.is_active AS is_user_active,
    ba.id AS account_id,
    ba.account_number,
    ba.account_type,
    ba.balance,
    ba.currency,
    ba.status AS account_status,
    ba.created_at AS account_created_at,
    b.id AS bank_id,
    b.bank_name,
    b.bank_code,
    b.ifsc_prefix,
    ba.ifsc_code,
    pp.vaultpay_id,
    pp.qr_code_payload,
    pp.status AS profile_status
FROM users u
LEFT JOIN bank_accounts ba ON u.id = ba.user_id AND ba.is_primary = TRUE
LEFT JOIN banks b ON ba.bank_id = b.id
LEFT JOIN payment_profiles pp ON u.id = pp.user_id;

-- ----------------------------------------------------------------------------
-- 2. View: vw_transaction_details
-- Detailed human-readable view of all transactions with sender & receiver info
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_transaction_details AS
SELECT 
    t.id AS transaction_id,
    t.reference_id,
    t.idempotency_key,
    t.type AS transaction_type,
    t.amount,
    t.fee,
    t.status,
    t.note,
    t.failure_reason,
    t.created_at,
    t.completed_at,
    -- Sender Details
    s_u.id AS sender_user_id,
    s_u.full_name AS sender_name,
    s_u.email AS sender_email,
    s_pp.vaultpay_id AS sender_vaultpay_id,
    s_ba.account_number AS sender_account_number,
    s_b.bank_name AS sender_bank_name,
    -- Recipient Details
    r_u.id AS recipient_user_id,
    r_u.full_name AS recipient_name,
    r_u.email AS recipient_email,
    r_pp.vaultpay_id AS recipient_vaultpay_id,
    r_ba.account_number AS recipient_account_number,
    r_b.bank_name AS recipient_bank_name
FROM transactions t
LEFT JOIN users s_u ON t.sender_user_id = s_u.id
LEFT JOIN payment_profiles s_pp ON s_u.id = s_pp.user_id
LEFT JOIN bank_accounts s_ba ON t.sender_account_id = s_ba.id
LEFT JOIN banks s_b ON s_ba.bank_id = s_b.id
LEFT JOIN users r_u ON t.recipient_user_id = r_u.id
LEFT JOIN payment_profiles r_pp ON r_u.id = r_pp.user_id
LEFT JOIN bank_accounts r_ba ON t.recipient_account_id = r_ba.id
LEFT JOIN banks r_b ON r_ba.bank_id = r_b.id;

-- ----------------------------------------------------------------------------
-- 3. View: vw_ledger_audit
-- Verifies double-entry ledger balance parity per transaction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_ledger_audit AS
SELECT 
    le.transaction_id,
    t.reference_id,
    t.type,
    t.amount AS transaction_amount,
    SUM(CASE WHEN le.entry_type = 'debit' THEN le.amount ELSE 0 END) AS total_debit,
    SUM(CASE WHEN le.entry_type = 'credit' THEN le.amount ELSE 0 END) AS total_credit,
    (SUM(CASE WHEN le.entry_type = 'credit' THEN le.amount ELSE 0 END) - 
     SUM(CASE WHEN le.entry_type = 'debit' THEN le.amount ELSE 0 END)) AS net_discrepancy,
    t.status AS transaction_status,
    t.created_at
FROM ledger_entries le
JOIN transactions t ON le.transaction_id = t.id
GROUP BY le.transaction_id, t.reference_id, t.type, t.amount, t.status, t.created_at;
