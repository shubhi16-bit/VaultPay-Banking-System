/**
 * Utility formatters for VaultPay
 */

/**
 * Formats a numeric amount as INR currency (₹) or standard currency.
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a Date object or ISO string to readable format.
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Masks a bank account number for security (e.g. •••• 4589)
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '••••';
  const clean = accountNumber.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

/**
 * Validates VaultPay ID format: username@vault or name@vp
 */
export function isValidVaultPayId(id: string): boolean {
  if (!id) return false;
  // VaultPay IDs follow: [a-zA-Z0-9._-]+@(vault|vaultpay|vp)
  const regex = /^[a-zA-Z0-9._-]+@(vault|vaultpay|vp)$/i;
  return regex.test(id.trim());
}

/**
 * Formats user initials for avatar
 */
export function getInitials(name: string): string {
  if (!name) return 'VP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
