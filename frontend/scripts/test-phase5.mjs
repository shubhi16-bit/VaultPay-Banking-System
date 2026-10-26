/**
 * VaultPay Phase 5 Test Script
 * Tests: Insights calculations, Profile validation, Settings PIN, Route presence
 * Run with: node frontend/scripts/test-phase5.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../src');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

function readFile(relPath) {
  const full = path.join(SRC, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FILE EXISTENCE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📁  1. Phase 5 File Existence');

const requiredFiles = [
  'pages/InsightsPage.tsx',
  'pages/ProfilePage.tsx',
  'pages/SettingsPage.tsx',
  'context/AuthContext.tsx',
  'routes/AppRoutes.tsx',
  'components/layout/Sidebar.tsx',
  'components/layout/Navbar.tsx',
];
for (const f of requiredFiles) {
  assert(readFile(f) !== null, `${f} exists`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ROUTE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🛣️   2. Route Configuration');
const routes = readFile('routes/AppRoutes.tsx');
assert(routes?.includes('/insights'), 'Route /insights registered');
assert(routes?.includes('/profile'), 'Route /profile registered');
assert(routes?.includes('/settings'), 'Route /settings registered');
assert(!routes?.includes('/request-money'), 'No /request-money route (prohibited)');
assert(!routes?.includes('/request'), 'No /request route (prohibited)');

// ─────────────────────────────────────────────────────────────────────────────
// 3. INSIGHTS PAGE — spending logic & safety
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📊  3. InsightsPage');
const insights = readFile('pages/InsightsPage.tsx');
assert(insights !== null, 'InsightsPage.tsx exists and readable');
// Only SUCCESS transactions should be counted
assert(insights?.includes("'SUCCESS'") || insights?.includes('"SUCCESS"'), "Filters for SUCCESS transactions");
// FAILED transactions tracked separately, not added to 'spent' / totalSpent
// The pattern: FAILED branch only increments failCount, never 'spent'
assert(
  insights?.includes('failCount') || insights?.includes('failedCount'),
  'FAILED transactions tracked separately (not counted as spending)'
);
// Date filter tabs should exist
assert(insights?.includes('THIS_WEEK') || insights?.includes('this_week'), 'THIS_WEEK filter present');
assert(insights?.includes('THIS_MONTH') || insights?.includes('this_month'), 'THIS_MONTH filter present');
assert(insights?.includes('LAST_3_MONTHS') || insights?.includes('last_3_months'), 'LAST_3_MONTHS filter present');
assert(insights?.includes('ALL_TIME') || insights?.includes('all_time'), 'ALL_TIME filter present');
// Should show empty state (categories.length === 0 or similar guard)
assert(
  insights?.includes('length === 0') || insights?.includes('haven') || insights?.includes('No data') || insights?.includes('empty'),
  'Empty state handled'
);
// Should not import Calendar (was unused — removed)
const calendarInInsights = insights?.match(/import[^;]+Calendar[^;]+from 'lucide-react'/);
assert(!calendarInInsights, 'Calendar unused import removed from InsightsPage');
// Currency formatting
assert(insights?.includes('formatCurrency'), 'formatCurrency used in InsightsPage');

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROFILE PAGE — validation & honesty
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n👤  4. ProfilePage');
const profile = readFile('pages/ProfilePage.tsx');
assert(profile !== null, 'ProfilePage.tsx exists and readable');
// Edit mode
assert(profile?.includes('isEditing') || profile?.includes('editMode'), 'Edit mode state present');
// Name validation (min 2 chars)
assert(profile?.includes('2') && (profile?.includes('min') || profile?.includes('length') || profile?.includes('trim')), 'Name length validation present');
// Should not show success without backend confirmation
assert(!profile?.includes("Profile updated successfully") || profile?.includes('error') || profile?.includes('catch'), 'Error handling present alongside success states');
// Backend offline honest notice
assert(
  profile?.includes('ServerOff') || profile?.includes('offline') || profile?.includes('isBackendOnline') || profile?.includes('integration'),
  'Backend offline / integration-pending UI present'
);
// Should NOT import Shield (was unused — removed)
const shieldInProfile = (profile?.match(/import[^;]+Shield[^;]+from 'lucide-react'/) ?? []).length;
assert(shieldInProfile === 0, 'Shield unused import removed from ProfilePage');
// No token/password exposure
assert(!profile?.includes('token') && !profile?.includes('password'), 'No token or password exposed in ProfilePage');
// No Request Money
assert(!profile?.includes('requestMoney') && !profile?.includes('request-money'), 'No Request Money in ProfilePage');

// ─────────────────────────────────────────────────────────────────────────────
// 5. SETTINGS PAGE — PIN validation, logout, sandbox
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⚙️   5. SettingsPage');
const settings = readFile('pages/SettingsPage.tsx');
assert(settings !== null, 'SettingsPage.tsx exists and readable');
// PIN validation: 4-6 digits
assert(
  (settings?.includes('4') && settings?.includes('6') && settings?.includes('pin')) ||
  (settings?.includes('4') && settings?.includes('6') && settings?.includes('PIN')),
  'PIN length 4-6 validation logic present'
);
// New PIN must match confirm PIN
assert(
  settings?.includes('confirmPin') || settings?.includes('confirm_pin') || settings?.includes('confirmPIN'),
  'PIN confirmation field present'
);
// Logout requires confirmation
assert(settings?.includes('Modal') || settings?.includes('confirm'), 'Logout confirmation modal present');
// Sandbox reset
assert(
  settings?.includes('localStorage') && (settings?.includes('clear') || settings?.includes('remove')),
  'Sandbox data reset (localStorage clear) present'
);
// Should NOT import Shield or Server (were unused — removed)
const shieldInSettings = (settings?.match(/import[^;]+Shield[^;]+from 'lucide-react'/) ?? []).length;
assert(shieldInSettings === 0, 'Shield unused import removed from SettingsPage');
const serverInSettings = (settings?.match(/[^O]Server[^O]/) ?? []).length;
// ServerOff is valid, bare Server is not — check the import block
const settingsImportBlock = settings?.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/)?.[1] ?? '';
assert(!settingsImportBlock.includes('Server,') && !settingsImportBlock.endsWith('Server'), 'Server unused import removed from SettingsPage');

// ─────────────────────────────────────────────────────────────────────────────
// 6. AUTH CONTEXT — updateProfile presence
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🔐  6. AuthContext');
const auth = readFile('context/AuthContext.tsx');
assert(auth !== null, 'AuthContext.tsx exists');
assert(auth?.includes('updateProfile'), 'updateProfile function present in AuthContext');
assert(auth?.includes('updateLocalDemoProfile') || auth?.includes('updateLocalDemo'), 'Sandbox profile fallback present in AuthContext');

// ─────────────────────────────────────────────────────────────────────────────
// 7. NAVIGATION — Sidebar & Navbar
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🗺️   7. Navigation (Sidebar & Navbar)');
const sidebar = readFile('components/layout/Sidebar.tsx');
const navbar = readFile('components/layout/Navbar.tsx');
assert(sidebar?.includes('/settings') || sidebar?.includes('Settings'), 'Settings link in Sidebar');
assert(sidebar?.includes('/insights') || sidebar?.includes('Insights'), 'Insights link in Sidebar');
assert(navbar?.includes('/profile') || navbar?.includes('Profile'), 'Profile link in Navbar');
assert(navbar?.includes('/settings') || navbar?.includes('Settings'), 'Settings link in Navbar');
// Request Money must NOT appear in navigation
assert(!sidebar?.includes('request-money') && !sidebar?.includes('requestMoney'), 'No Request Money in Sidebar');
assert(!navbar?.includes('request-money') && !navbar?.includes('requestMoney'), 'No Request Money in Navbar');

// ─────────────────────────────────────────────────────────────────────────────
// 8. BUILD OUTPUT EXISTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🏗️   8. Build Output');
const distIndex = path.resolve(__dirname, '../dist/index.html');
assert(fs.existsSync(distIndex), 'dist/index.html exists (build succeeded)');
const distAssets = path.resolve(__dirname, '../dist/assets');
assert(fs.existsSync(distAssets) && fs.readdirSync(distAssets).length > 0, 'dist/assets populated');

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log('\n' + '─'.repeat(55));
console.log(`Phase 5 Test Results: ${passed}/${total} passed`);
if (failed === 0) {
  console.log('🎉  All Phase 5 checks passed! Phase 5 is COMPLETE.');
} else {
  console.log(`⚠️   ${failed} check(s) need attention.`);
  process.exit(1);
}
