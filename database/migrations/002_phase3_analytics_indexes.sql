-- ============================================================================
-- Migration 002: Phase 3 Analytics & Performance Indexes
-- Safe, non-destructive migration for VaultPay
-- ============================================================================

USE vaultpay_db;

-- 1. Optimized compound indexes for analytics aggregations (SUM, COUNT, GROUP BY DATE)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'transactions' AND index_name = 'idx_tx_analytics_sender');
SET @sqlstmt := IF(@exist = 0, 'CREATE INDEX idx_tx_analytics_sender ON transactions (sender_user_id, status, created_at, amount)', 'SELECT "Index idx_tx_analytics_sender exists"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'transactions' AND index_name = 'idx_tx_analytics_recipient');
SET @sqlstmt := IF(@exist = 0, 'CREATE INDEX idx_tx_analytics_recipient ON transactions (recipient_user_id, status, created_at, amount)', 'SELECT "Index idx_tx_analytics_recipient exists"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
