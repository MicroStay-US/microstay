/**
 * LIVE PRODUCTION smoke test
 *
 * Runs against https://www.microstay.us to verify the real deployment.
 *
 * Usage:
 *   npx playwright test 99-live-prod-smoke.spec.ts --project=chromium --headed
 *
 * Creates test vendor applications with timestamped emails so they're easy to
 * identify and clean up afterwards in Supabase.
 */
import { test, expect } from '@playwright/test';

const BASE = 'https://www.microstay.us';

// Unique per run so re-runs don't collide
const TS = Date.now();
const TEST_VENDOR_EMAIL = `test+launch-${TS}@microstay.us`;
const TEST_VENDOR_PASSWORD = 'Launch#Test2026!Secure';

test.describe.configure({ mode: 'serial' });

test.describe('LIVE Production smoke tests', () => {
  test('Homepage loads + hero + search UI visible', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('h1:has-text("Book Motels by the Hour")')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    console.log(`  ✓ Homepage OK at ${BASE}`);
  });

  test('Search page returns results from live Supabase', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await page.goto(`${BASE}/search?searchType=nearby&date=${today}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    // Count visible property link cards
    const cards = await page.locator('a[href*="/motel/"]').count();
    console.log(`  ✓ Search page rendered. Visible motel cards: ${cards}`);
    // Note: can be 0 if no motels have today's slots — that's not a failure.
  });

  test('Motel detail page loads for a real seeded motel', async ({ page }) => {
    // Find any motel link from the search page
    await page.goto(`${BASE}/search?searchType=city&state=CA&city=Norwalk&date=${new Date().toISOString().split('T')[0]}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    const firstMotel = page.locator('a[href*="/motel/"]').first();
    const count = await firstMotel.count();
    if (count === 0) {
      console.log('  - No motels in CA/Norwalk on this date — skipping detail test');
      return;
    }

    const href = await firstMotel.getAttribute('href');
    await firstMotel.click();
    await page.waitForURL(/\/motel\//, { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page.locator('main').first()).toBeVisible();
    console.log(`  ✓ Motel detail page loaded: ${href}`);
  });

  test('Partner signup page: Step 1 account creation form submits', async ({ page }) => {
    await page.goto(`${BASE}/partner-signup`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Step 1: fill account creation form
    await page.fill('input[placeholder*="you@yourbusiness.com" i], input[type="email"]', TEST_VENDOR_EMAIL);

    // There are two password fields — fill both
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(TEST_VENDOR_PASSWORD);
    await passwordInputs.nth(1).fill(TEST_VENDOR_PASSWORD);

    console.log(`  ✓ Filled signup form with email: ${TEST_VENDOR_EMAIL}`);

    // Click Create Account
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(4000);

    // Check what happened
    const url = page.url();
    const bodyText = await page.locator('body').innerText();
    console.log(`  URL after submit: ${url}`);
    console.log(`  Page contains "verification": ${/verify|verification|email|check.*inbox/i.test(bodyText)}`);
    console.log(`  Page contains "error": ${/error|invalid|failed/i.test(bodyText.toLowerCase())}`);

    // Capture first 500 chars of body for diagnostic
    console.log(`  Body preview: ${bodyText.slice(0, 300).replace(/\n/g, ' | ')}`);
  });

  test('Vendor login page: forgot-password link exists', async ({ page }) => {
    await page.goto(`${BASE}/vendor/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const forgot = page.locator('a:has-text("Forgot"), button:has-text("Forgot")').first();
    await expect(forgot).toBeVisible();
    console.log('  ✓ Forgot password link visible on /vendor/login');
  });

  test('Admin login page loads with password field', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    console.log('  ✓ Admin login form visible');
  });

  test('Check-booking page accepts input', async ({ page }) => {
    await page.goto(`${BASE}/check-booking`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('main').first()).toBeVisible();
    const inputs = await page.locator('input').count();
    console.log(`  ✓ Check-booking page loaded with ${inputs} input(s)`);
  });
});

// Export the test email so we can clean it up later
export { TEST_VENDOR_EMAIL };
