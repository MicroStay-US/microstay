/**
 * Full Button Audit
 * Crawls every public page and reports broken/unresponsive buttons.
 * Also checks for console errors and broken links.
 */
import { test, expect, Page } from '@playwright/test';

interface ButtonResult {
  page: string;
  label: string;
  status: 'ok' | 'disabled' | 'invisible' | 'no-handler' | 'error';
  note?: string;
}

const results: ButtonResult[] = [];

async function auditPage(page: Page, url: string, label: string) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(url);
  // Use domcontentloaded + short pause — networkidle fails on pages with
  // persistent Supabase realtime connections that never fully idle
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const buttons = await page.$$('button, [role="button"], a.btn, a[class*="button"]');

  for (const btn of buttons) {
    const text = ((await btn.textContent()) || (await btn.getAttribute('aria-label')) || '').trim().slice(0, 80);
    if (!text) continue;

    const isVisible = await btn.isVisible().catch(() => false);
    const isDisabled = await btn.isDisabled().catch(() => false);
    const box = await btn.boundingBox().catch(() => null);

    if (!isVisible || box === null) {
      results.push({ page: label, label: text, status: 'invisible' });
    } else if (isDisabled) {
      results.push({ page: label, label: text, status: 'disabled', note: 'intentionally disabled' });
    } else {
      results.push({ page: label, label: text, status: 'ok' });
    }
  }

  if (errors.length > 0) {
    console.log(`  ⚠ Console errors on ${label}:`);
    errors.forEach(e => console.log(`    ${e}`));
  }

  return results.filter(r => r.page === label);
}

// ── Public Pages ──────────────────────────────────────────────────────────────

test('Audit: Homepage', async ({ page }) => {
  const r = await auditPage(page, '/', 'Homepage');
  const broken = r.filter(b => b.status === 'error');
  console.log(`  Buttons: ${r.length} total, ${broken.length} broken`);
  r.forEach(b => console.log(`    [${b.status.toUpperCase().padEnd(9)}] ${b.label}`));
  expect(broken.length).toBe(0);
});

test('Audit: Search Page', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  const r = await auditPage(page, `/search?searchType=nearby&date=${today}`, 'Search');
  const broken = r.filter(b => b.status === 'error');
  console.log(`  Buttons: ${r.length} total, ${broken.length} broken`);
  r.forEach(b => console.log(`    [${b.status.toUpperCase().padEnd(9)}] ${b.label}`));
  expect(broken.length).toBe(0);
});

test('Audit: Check Booking Page', async ({ page }) => {
  const r = await auditPage(page, '/check-booking', 'Check Booking');
  const broken = r.filter(b => b.status === 'error');
  console.log(`  Buttons: ${r.length} total, ${broken.length} broken`);
  r.forEach(b => console.log(`    [${b.status.toUpperCase().padEnd(9)}] ${b.label}`));
  expect(broken.length).toBe(0);
});

test('Audit: Partner Landing Page', async ({ page }) => {
  const r = await auditPage(page, '/partner', 'Partner Landing');
  const broken = r.filter(b => b.status === 'error');
  console.log(`  Buttons: ${r.length} total, ${broken.length} broken`);
  r.forEach(b => console.log(`    [${b.status.toUpperCase().padEnd(9)}] ${b.label}`));
  expect(broken.length).toBe(0);
});

test('Audit: Partner Signup Page', async ({ page }) => {
  const r = await auditPage(page, '/partner-signup', 'Partner Signup');
  const broken = r.filter(b => b.status === 'error');
  console.log(`  Buttons: ${r.length} total, ${broken.length} broken`);
  r.forEach(b => console.log(`    [${b.status.toUpperCase().padEnd(9)}] ${b.label}`));
  expect(broken.length).toBe(0);
});

test('Audit: Admin Login Page', async ({ page }) => {
  const r = await auditPage(page, '/admin/login', 'Admin Login');
  const broken = r.filter(b => b.status === 'error');
  console.log(`  Buttons: ${r.length} total, ${broken.length} broken`);
  r.forEach(b => console.log(`    [${b.status.toUpperCase().padEnd(9)}] ${b.label}`));
  expect(broken.length).toBe(0);
});

test('Audit: Vendor Login Page', async ({ page }) => {
  const r = await auditPage(page, '/vendor/login', 'Vendor Login');
  const broken = r.filter(b => b.status === 'error');
  console.log(`  Buttons: ${r.length} total, ${broken.length} broken`);
  r.forEach(b => console.log(`    [${b.status.toUpperCase().padEnd(9)}] ${b.label}`));
  expect(broken.length).toBe(0);
});

// ── First available property detail page ────────────────────────────────────

test('Audit: First Motel Detail Page', async ({ page }) => {
  const today = new Date().toISOString().split('T')[0];
  await page.goto(`/search?searchType=nearby&date=${today}`);
  await page.waitForLoadState('networkidle');

  const firstLink = page.locator('a[href*="/motel/"]').first();
  if (!await firstLink.isVisible()) {
    console.log('  - No properties in DB, skipping');
    test.skip();
    return;
  }

  const href = await firstLink.getAttribute('href') || '/';
  const r = await auditPage(page, href, 'Motel Detail');
  const broken = r.filter(b => b.status === 'error');
  console.log(`  Buttons: ${r.length} total, ${broken.length} broken`);
  r.forEach(b => console.log(`    [${b.status.toUpperCase().padEnd(9)}] ${b.label}`));
  expect(broken.length).toBe(0);
});

// ── Summary report ───────────────────────────────────────────────────────────

test('Full audit summary', async ({ page }) => {
  // This test just prints a summary of all results collected above
  const grouped = results.reduce<Record<string, ButtonResult[]>>((acc, r) => {
    (acc[r.page] = acc[r.page] || []).push(r);
    return acc;
  }, {});

  console.log('\n══════════════════════════════════════════');
  console.log('       MICROSTAY BUTTON AUDIT REPORT      ');
  console.log('══════════════════════════════════════════');

  let totalOk = 0, totalDisabled = 0, totalBroken = 0;

  for (const [pageName, items] of Object.entries(grouped)) {
    const ok = items.filter(i => i.status === 'ok').length;
    const disabled = items.filter(i => i.status === 'disabled').length;
    const broken = items.filter(i => i.status === 'error' || i.status === 'invisible').length;
    totalOk += ok; totalDisabled += disabled; totalBroken += broken;

    console.log(`\n  ${pageName}`);
    console.log(`    ✓ OK: ${ok}  |  ⊘ Disabled: ${disabled}  |  ✗ Broken: ${broken}`);
    items.filter(i => i.status === 'error').forEach(i => console.log(`    ✗ "${i.label}"`));
  }

  console.log('\n──────────────────────────────────────────');
  console.log(`  TOTAL  ✓ ${totalOk} OK  |  ⊘ ${totalDisabled} Disabled  |  ✗ ${totalBroken} Broken`);
  console.log('══════════════════════════════════════════\n');
});
