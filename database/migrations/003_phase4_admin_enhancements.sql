-- ============================================================================
-- Migration 003: Phase 4 Admin Enhancements & Concurrency Guards
-- Safe, non-destructive migration for VaultPay
-- ============================================================================

USE vaultpay_db;

-- 1. Enhanced Trigger: trg_audit_account_status_change
-- Captures admin session variables (@admin_user_id, @admin_reason, @admin_ip)
-- Eliminates duplicate audit records between trigger and application code
DELIMITER $$

DROP TRIGGER IF EXISTS trg_audit_account_status_change$$
CREATE TRIGGER trg_audit_account_status_change
AFTER UPDATE ON bank_accounts
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
        VALUES (
            COALESCE(@admin_user_id, NEW.user_id),
            CONCAT('ACCOUNT_STATUS_', UPPER(NEW.status)),
            'bank_accounts',
            CAST(NEW.id AS CHAR),
            @admin_ip,
            IF(@admin_user_id IS NOT NULL, 'ADMIN_ACTION', 'DB_TRIGGER'),
            JSON_OBJECT(
                'account_number', NEW.account_number,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'reason', COALESCE(@admin_reason, 'Status changed by system'),
                'admin_id', @admin_user_id
            )
        );
    END IF;
END$$

-- 2. Enhanced sp_execute_transfer with post-lock status re-verification
-- Eliminates concurrency race conditions when an account is frozen during in-flight transfer
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

    -- Sanitize input parameters
    SET p_recipient_vaultpay_id = LOWER(TRIM(p_recipient_vaultpay_id));
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) = '' THEN
        SET p_idempotency_key = NULL;
    END IF;

    -- Validate Amount
    IF p_amount <= 0.00 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transfer amount must be greater than zero.';
    END IF;

    START TRANSACTION;

    -- 1. Check Idempotency Key (Return existing completed transaction without re-execution)
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, reference_id INTO p_transaction_id, p_reference_id
        FROM transactions 
        WHERE idempotency_key = p_idempotency_key AND sender_user_id = p_sender_user_id
        LIMIT 1;
        
        IF p_transaction_id IS NOT NULL THEN
            SELECT balance_after INTO p_sender_balance_after
            FROM ledger_entries
            WHERE transaction_id = p_transaction_id AND entry_type = 'debit'
            LIMIT 1;

            IF p_sender_balance_after IS NULL THEN
                SELECT balance INTO p_sender_balance_after
                FROM bank_accounts
                WHERE user_id = p_sender_user_id AND is_primary = TRUE;
            END IF;
            
            COMMIT;
            LEAVE proc_label;
        END IF;
    END IF;

    -- 2. Resolve Sender Primary Account
    SELECT id, balance, status INTO v_sender_account_id, v_sender_balance, v_sender_status
    FROM bank_accounts
    WHERE user_id = p_sender_user_id AND is_primary = TRUE
    LIMIT 1;

    IF v_sender_account_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Sender does not have an active linked primary bank account.';
    END IF;

    IF v_sender_status <> 'active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Sender bank account is frozen or inactive. Transfers are restricted.';
    END IF;

    -- 3. Resolve Recipient by VaultPay ID
    SELECT pp.user_id, pp.primary_account_id, ba.balance, ba.status
    INTO v_recipient_user_id, v_recipient_account_id, v_recipient_balance, v_recipient_status
    FROM payment_profiles pp
    JOIN bank_accounts ba ON pp.primary_account_id = ba.id
    WHERE pp.vaultpay_id = p_recipient_vaultpay_id AND pp.status = 'active'
    LIMIT 1;

    IF v_recipient_user_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Recipient VaultPay ID not found or account is inactive.';
    END IF;

    IF v_recipient_user_id = p_sender_user_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Self-transfers to your own account are not permitted.';
    END IF;

    IF v_recipient_status <> 'active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Recipient account is frozen or inactive.';
    END IF;

    -- 4. DETERMINISTIC ORDER LOCKING (Strict ascending ID to eliminate circular deadlocks)
    IF v_sender_account_id < v_recipient_account_id THEN
        SET v_lock_first_id = v_sender_account_id;
        SET v_lock_second_id = v_recipient_account_id;
    ELSE
        SET v_lock_first_id = v_recipient_account_id;
        SET v_lock_second_id = v_sender_account_id;
    END IF;

    -- Acquire pessimistic row locks
    SELECT balance INTO v_dummy_bal FROM bank_accounts WHERE id = v_lock_first_id FOR UPDATE;
    SELECT balance INTO v_dummy_bal FROM bank_accounts WHERE id = v_lock_second_id FOR UPDATE;

    -- RE-VERIFY authoritative balances AND statuses post-lock under row lock protection
    SELECT balance, status INTO v_sender_balance, v_sender_status FROM bank_accounts WHERE id = v_sender_account_id;
    SELECT balance, status INTO v_recipient_balance, v_recipient_status FROM bank_accounts WHERE id = v_recipient_account_id;

    -- Guard against concurrent freezing while lock was pending
    IF v_sender_status <> 'active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Sender bank account is frozen or inactive. Transfers are restricted.';
    END IF;

    IF v_recipient_status <> 'active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Recipient account is frozen or inactive.';
    END IF;

    -- 5. Authoritative Balance Validation
    IF v_sender_balance < p_amount THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient balance for transfer.';
    END IF;

    -- 6. Generate Globally Unique Transaction Reference ID
    SET p_reference_id = CONCAT('TXN_', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '_', SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 8));

    -- 7. Execute Atomic Balance Updates
    UPDATE bank_accounts
    SET balance = balance - p_amount
    WHERE id = v_sender_account_id;

    UPDATE bank_accounts
    SET balance = balance + p_amount
    WHERE id = v_recipient_account_id;

    SET p_sender_balance_after = v_sender_balance - p_amount;

    -- 8. Record Master Transaction
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

    -- 9. Balanced Double-Entry Ledger Entries
    -- Debit Sender
    INSERT INTO ledger_entries (
        transaction_id, account_id, entry_type, amount, balance_after, description
    ) VALUES (
        p_transaction_id, v_sender_account_id, 'debit', p_amount, p_sender_balance_after,
        CONCAT('Debit for transfer to ', p_recipient_vaultpay_id, ' (ref: ', p_reference_id, ')')
    );

    -- Credit Recipient
    INSERT INTO ledger_entries (
        transaction_id, account_id, entry_type, amount, balance_after, description
    ) VALUES (
        p_transaction_id, v_recipient_account_id, 'credit', p_amount, (v_recipient_balance + p_amount),
        CONCAT('Credit transfer from sender user #', p_sender_user_id, ' (ref: ', p_reference_id, ')')
    );

    -- 10. Update Recent Payees / Beneficiaries
    INSERT INTO beneficiaries (user_id, payee_user_id, payee_vaultpay_id, last_transacted_at)
    VALUES (p_sender_user_id, v_recipient_user_id, p_recipient_vaultpay_id, NOW())
    ON DUPLICATE KEY UPDATE last_transacted_at = NOW(), payee_vaultpay_id = p_recipient_vaultpay_id;

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
