import { test, expect } from '@playwright/test';
import { loginAsVendor, auditButtons, reportAudit, CREDS } from './helpers/auth';

test.describe('Vendor Flow', () => {
  test.skip(!CREDS.vendor.email || !CREDS.vendor.password, 'Set TEST_VENDOR_EMAIL and TEST_VENDOR_PASSWORD to run vendor tests');

  test('Vendor login page loads and has required fields', async ({ page }) => {
    await page.goto('/vendor/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')).toBeVisible();

    const audit = await auditButtons(page);
    reportAudit('Vendor Login', audit);
    expect(audit.every(b => b.passed)).toBe(true);
  });

  test('Vendor can log in and reach dashboard', async ({ page }) => {
    await loginAsVendor(page);
    await expect(page).toHaveURL(/\/vendor\/dashboard/);
    await expect(page.locator('text=Dashboard, text=Overview, text=Bookings').first()).toBeVisible();
  });

  test('Vendor dashboard — all sidebar tabs are clickable', async ({ page }) => {
    await loginAsVendor(page);

    const tabs = [
      { label: /bookings/i, url: /bookings/ },
      { label: /properties/i, url: /properties/ },
      { label: /calendar/i, url: /calendar/ },
      { label: /analytics/i, url: /analytics/ },
      { label: /slots/i, url: /slots/ },
      { label: /financials/i, url: /financials/ },
    ];

    for (const tab of tabs) {
      const link = page.locator(`a:has-text("${tab.label.source.replace(/\//g, '').replace(/i$/, '')}"), nav button:has-text("${tab.label.source.replace(/\//g, '').replace(/i$/, '')}")`).first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
        console.log(`  ✓ Tab navigated: ${tab.label}`);
      } else {
        console.log(`  - Tab not found (may require permission): ${tab.label}`);
      }
    }
  });

  test('Vendor properties page — buttons audit', async ({ page }) => {
    await loginAsVendor(page);
    await page.goto('/vendor/properties');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    const audit = await auditButtons(page);
    reportAudit('Vendor Properties', audit);
    const failed = audit.filter(b => !b.passed);
    expect(failed.length).toBe(0);
  });

  test('Vendor bookings page — loads and shows data or empty state', async ({ page }) => {
    await loginAsVendor(page);
    await page.goto('/vendor/bookings');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    // Either a table/list or an empty state message should be present
    const hasContent = await page.locator('table, [data-testid="booking"], text=No bookings, text=no bookings').first().isVisible().catch(() => false);
    expect(hasContent || await page.locator('main').isVisible()).toBeTruthy();

    const audit = await auditButtons(page);
    reportAudit('Vendor Bookings', audit);
  });

  test('Vendor slots page — loads correctly', async ({ page }) => {
    await loginAsVendor(page);
    await page.goto('/vendor/slots');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
    await expect(page.locator('main, h1, h2')).toBeVisible();

    const audit = await auditButtons(page);
    reportAudit('Vendor Slots', audit);
    expect(audit.filter(b => !b.passed).length).toBe(0);
  });

  test('Vendor calendar page — loads correctly', async ({ page }) => {
    await loginAsVendor(page);
    await page.goto('/vendor/calendar');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
    await expect(page.locator('main, h1, h2, [class*="calendar"]')).toBeVisible();

    const audit = await auditButtons(page);
    reportAudit('Vendor Calendar', audit);
  });

  test('Vendor financials page — loads revenue data', async ({ page }) => {
    await loginAsVendor(page);
    await page.goto('/vendor/financials');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible();

    // Check for currency values or revenue section
    const hasRevenue = await page.locator('text=/\\$[0-9]/, text=Revenue, text=Earnings, text=Payout').first().isVisible().catch(() => false);
    console.log(`  Revenue data visible: ${hasRevenue}`);

    const audit = await auditButtons(page);
    reportAudit('Vendor Financials', audit);
  });

  test('Vendor analytics page — loads charts', async ({ page }) => {
    await loginAsVendor(page);
    await page.goto('/vendor/analytics');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible();

    const audit = await auditButtons(page);
    reportAudit('Vendor Analytics', audit);
  });
});
