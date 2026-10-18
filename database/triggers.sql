-- ============================================================================
-- VaultPay Digital Banking & Transaction Management System
-- Triggers Definition
-- ============================================================================

USE vaultpay_db;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- 1. Trigger: trg_prevent_negative_balance
-- Enforces non-negative balance constraint at MySQL storage engine layer
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_prevent_negative_balance$$
CREATE TRIGGER trg_prevent_negative_balance
BEFORE UPDATE ON bank_accounts
FOR EACH ROW
BEGIN
    IF NEW.balance < 0.00 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction rejected: Insufficient funds. Account balance cannot be negative.';
    END IF;
END$$

-- ----------------------------------------------------------------------------
-- 2. Trigger: trg_audit_user_registration
-- Automatically creates an immutable audit trail when a user account is created
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_user_registration$$
CREATE TRIGGER trg_audit_user_registration
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
    VALUES (
        NEW.id,
        'USER_REGISTERED',
        'users',
        CAST(NEW.id AS CHAR),
        NULL,
        'DB_TRIGGER',
        JSON_OBJECT('email', NEW.email, 'role', NEW.role, 'full_name', NEW.full_name)
    );
END$$

-- ----------------------------------------------------------------------------
-- 3. Trigger: trg_audit_account_status_change
-- Records audit log when an account status is updated (e.g., active -> frozen)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_account_status_change$$
CREATE TRIGGER trg_audit_account_status_change
AFTER UPDATE ON bank_accounts
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
        VALUES (
            NEW.user_id,
            CONCAT('ACCOUNT_STATUS_', UPPER(NEW.status)),
            'bank_accounts',
            CAST(NEW.id AS CHAR),
            NULL,
            'DB_TRIGGER',
            JSON_OBJECT(
                'account_number', NEW.account_number,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
END$$

DELIMITER ;
