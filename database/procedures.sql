-- ============================================================================
-- VaultPay Digital Banking & Transaction Management System
-- Stored Procedures Definition
-- ============================================================================

USE vaultpay_db;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- 1. Procedure: sp_link_bank_account
-- Atomically links a fictional bank account and provisions a VaultPay handle
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_link_bank_account$$
CREATE PROCEDURE sp_link_bank_account(
    IN p_user_id BIGINT,
    IN p_bank_id INT,
    IN p_account_type VARCHAR(20),
    IN p_initial_balance DECIMAL(18,2),
    OUT p_account_id BIGINT,
    OUT p_account_number VARCHAR(30),
    OUT p_vaultpay_id VARCHAR(100)
)
proc_label: BEGIN
    DECLARE v_bank_code VARCHAR(20);
    DECLARE v_ifsc_prefix VARCHAR(10);
    DECLARE v_user_name VARCHAR(100);
    DECLARE v_user_email VARCHAR(150);
    DECLARE v_user_handle VARCHAR(50);
    DECLARE v_qr_payload VARCHAR(255);
    DECLARE v_existing_count INT DEFAULT 0;
    DECLARE v_primary_count INT DEFAULT 0;
    DECLARE v_is_primary BOOLEAN DEFAULT TRUE;

    -- Error Handling: Roll back on any SQL exception
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Validate User
    SELECT full_name, email INTO v_user_name, v_user_email
    FROM users WHERE id = p_user_id AND is_active = TRUE;
    
    IF v_user_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User not found or inactive.';
    END IF;

    -- 2. Validate Bank
    SELECT bank_code, ifsc_prefix INTO v_bank_code, v_ifsc_prefix
    FROM banks WHERE id = p_bank_id AND is_active = TRUE;

    IF v_bank_code IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Selected bank does not exist or is inactive.';
    END IF;

    -- 3. Check for Duplicate Linkage with Same Bank
    SELECT COUNT(*) INTO v_existing_count
    FROM bank_accounts WHERE user_id = p_user_id AND bank_id = p_bank_id;

    IF v_existing_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'An account with this bank is already linked to your profile.';
    END IF;

    -- 4. Check if User Already has a primary account
    SELECT COUNT(*) INTO v_primary_count
    FROM bank_accounts WHERE user_id = p_user_id AND is_primary = TRUE;

    IF v_primary_count > 0 THEN
        SET v_is_primary = FALSE;
    END IF;

    -- 5. Generate Simulated Account Number and IFSC Code
    -- Format: <bank_id * 100000> + random 6 digits
    SET p_account_number = CONCAT(LPAD(p_bank_id, 3, '10'), LPAD(FLOOR(RAND() * 89999999 + 10000000), 8, '0'));
    
    -- Insert Bank Account
    INSERT INTO bank_accounts (
        user_id, bank_id, account_number, ifsc_code,
        account_type, balance, currency, is_primary, status
    ) VALUES (
        p_user_id, p_bank_id, p_account_number, CONCAT(v_ifsc_prefix, '01'),
        IFNULL(p_account_type, 'savings'), IFNULL(p_initial_balance, 0.00), 'INR', v_is_primary, 'active'
    );

    SET p_account_id = LAST_INSERT_ID();

    -- 6. Setup VaultPay Profile if not already created
    -- Extract handle from email: e.g. 'rahul' from 'rahul.sharma@example.com'
    SET v_user_handle = LOWER(SUBSTRING_INDEX(v_user_email, '@', 1));
    -- Remove non-alphanumeric chars except dots/underscores
    SET v_user_handle = REGEXP_REPLACE(v_user_handle, '[^a-z0-9_.]', '');
    SET p_vaultpay_id = CONCAT(v_user_handle, '@vaultpay');
    SET v_qr_payload = CONCAT('vaultpay://pay?pa=', p_vaultpay_id, '&pn=', REPLACE(v_user_name, ' ', '%20'), '&cu=INR');

    INSERT INTO payment_profiles (
        user_id, primary_account_id, vaultpay_id, qr_code_payload, status
    ) VALUES (
        p_user_id, p_account_id, p_vaultpay_id, v_qr_payload, 'active'
    )
    ON DUPLICATE KEY UPDATE
        primary_account_id = IF(v_is_primary, p_account_id, primary_account_id),
        status = 'active';

    -- 7. Audit Log
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
    VALUES (
        p_user_id,
        'BANK_ACCOUNT_LINKED',
        'bank_accounts',
        CAST(p_account_id AS CHAR),
        NULL,
        'STORED_PROCEDURE',
        JSON_OBJECT(
            'bank_id', p_bank_id,
            'account_number', p_account_number,
            'vaultpay_id', p_vaultpay_id,
            'initial_balance', p_initial_balance
        )
    );

    COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- 2. Procedure: sp_execute_transfer
-- Deterministic 2-phase locking transfer with double-entry ledger guarantee
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_execute_transfer$$
CREATE PROCEDURE sp_execute_transfer(
    IN p_sender_user_id BIGINT,
    IN p_recipient_vaultpay_id VARCHAR(100),
    IN p_amount DECIMAL(18,2),
    IN p_note VARCHAR(255),
    IN p_idempotency_key VARCHAR(128),
    OUT p_transaction_id BIGINT,
    OUT p_reference_id VARCHAR(64),
    OUT p_sender_balance_after DECIMAL(18,2)
)
proc_label: BEGIN
    DECLARE v_sender_account_id BIGINT;
    DECLARE v_sender_balance DECIMAL(18,2);
    DECLARE v_sender_status VARCHAR(20);
    
    DECLARE v_recipient_user_id BIGINT;
    DECLARE v_recipient_account_id BIGINT;
    DECLARE v_recipient_balance DECIMAL(18,2);
    DECLARE v_recipient_status VARCHAR(20);

    DECLARE v_lock_first_id BIGINT;
    DECLARE v_lock_second_id BIGINT;
    DECLARE v_dummy_bal DECIMAL(18,2);

    -- Error Handling: Roll back on any SQL exception
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validate Amount
    IF p_amount <= 0.00 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transfer amount must be greater than zero.';
    END IF;

    START TRANSACTION;

    -- 1. Check Idempotency Key
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, reference_id INTO p_transaction_id, p_reference_id
        FROM transactions WHERE idempotency_key = p_idempotency_key LIMIT 1;
        
        IF p_transaction_id IS NOT NULL THEN
            -- Already executed successfully, return existing result
            SELECT balance INTO p_sender_balance_after
            FROM bank_accounts ba
            JOIN transactions t ON t.sender_account_id = ba.id
            WHERE t.id = p_transaction_id;
            
            COMMIT;
            LEAVE proc_label;
        END IF;
    END IF;

    -- 2. Resolve Sender Account
    SELECT id, balance, status INTO v_sender_account_id, v_sender_balance, v_sender_status
    FROM bank_accounts
    WHERE user_id = p_sender_user_id AND is_primary = TRUE;

    IF v_sender_account_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Sender primary bank account not found.';
    END IF;

    IF v_sender_status <> 'active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Sender account is frozen or inactive. Transfers not permitted.';
    END IF;

    -- 3. Resolve Recipient by VaultPay ID
    SELECT pp.user_id, pp.primary_account_id, ba.balance, ba.status
    INTO v_recipient_user_id, v_recipient_account_id, v_recipient_balance, v_recipient_status
    FROM payment_profiles pp
    JOIN bank_accounts ba ON pp.primary_account_id = ba.id
    WHERE pp.vaultpay_id = p_recipient_vaultpay_id AND pp.status = 'active';

    IF v_recipient_user_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Recipient VaultPay ID not found or inactive.';
    END IF;

    IF v_recipient_user_id = p_sender_user_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Self-transfers to the same account are not permitted.';
    END IF;

    IF v_recipient_status <> 'active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Recipient account is frozen or inactive.';
    END IF;

    -- 4. DETERMINISTIC ORDER LOCKING (Prevents Deadlocks in Concurrent Transfers)
    IF v_sender_account_id < v_recipient_account_id THEN
        SET v_lock_first_id = v_sender_account_id;
        SET v_lock_second_id = v_recipient_account_id;
    ELSE
        SET v_lock_first_id = v_recipient_account_id;
        SET v_lock_second_id = v_sender_account_id;
    END IF;

    -- Acquire pessimistic row locks in strict ascending order
    SELECT balance INTO v_dummy_bal FROM bank_accounts WHERE id = v_lock_first_id FOR UPDATE;
    SELECT balance INTO v_dummy_bal FROM bank_accounts WHERE id = v_lock_second_id FOR UPDATE;

    -- Refresh authoritative balances after locking
    SELECT balance INTO v_sender_balance FROM bank_accounts WHERE id = v_sender_account_id;
    SELECT balance INTO v_recipient_balance FROM bank_accounts WHERE id = v_recipient_account_id;

    -- 5. Balance Validation
    IF v_sender_balance < p_amount THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient balance for transfer.';
    END IF;

    -- 6. Generate Unique Reference ID
    SET p_reference_id = CONCAT('TXN_', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '_', SUBSTRING(MD5(RAND()), 1, 8));

    -- 7. Execute Balance Updates
    UPDATE bank_accounts
    SET balance = balance - p_amount
    WHERE id = v_sender_account_id;

    UPDATE bank_accounts
    SET balance = balance + p_amount
    WHERE id = v_recipient_account_id;

    SET p_sender_balance_after = v_sender_balance - p_amount;

    -- 8. Record Master Transaction Record
    INSERT INTO transactions (
        reference_id, idempotency_key, sender_user_id, recipient_user_id,
        sender_account_id, recipient_account_id, type, amount, fee,
        status, note, created_at, completed_at
    ) VALUES (
        p_reference_id, p_idempotency_key, p_sender_user_id, v_recipient_user_id,
        v_sender_account_id, v_recipient_account_id, 'transfer', p_amount, 0.00,
        'completed', p_note, NOW(), NOW()
    );

    SET p_transaction_id = LAST_INSERT_ID();

    -- 9. Balanced Double-Entry Ledger Records
    -- Entry 1: Debit sender
    INSERT INTO ledger_entries (
        transaction_id, account_id, entry_type, amount, balance_after, description
    ) VALUES (
        p_transaction_id, v_sender_account_id, 'debit', p_amount, p_sender_balance_after,
        CONCAT('Debit for transfer to ', p_recipient_vaultpay_id, ' (ref: ', p_reference_id, ')')
    );

    -- Entry 2: Credit recipient
    INSERT INTO ledger_entries (
        transaction_id, account_id, entry_type, amount, balance_after, description
    ) VALUES (
        p_transaction_id, v_recipient_account_id, 'credit', p_amount, (v_recipient_balance + p_amount),
        CONCAT('Credit transfer from sender user #', p_sender_user_id, ' (ref: ', p_reference_id, ')')
    );

    -- 10. Update Recent Payees / Beneficiaries
    INSERT INTO beneficiaries (user_id, payee_user_id, payee_vaultpay_id, last_transacted_at)
    VALUES (p_sender_user_id, v_recipient_user_id, p_recipient_vaultpay_id, NOW())
    ON DUPLICATE KEY UPDATE last_transacted_at = NOW();

    -- 11. Record Audit Log
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
    VALUES (
        p_sender_user_id,
        'TRANSFER_COMPLETED',
        'transactions',
        p_reference_id,
        NULL,
        'STORED_PROCEDURE',
        JSON_OBJECT(
            'amount', p_amount,
            'recipient_vaultpay_id', p_recipient_vaultpay_id,
            'sender_balance_after', p_sender_balance_after
        )
    );

    COMMIT;
END$$

DELIMITER ;
