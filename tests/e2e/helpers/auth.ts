import { Page, expect } from '@playwright/test';

export const CREDS = {
  admin: {
    // Admin email is intentionally a single shared account.
    // Set ADMIN_EMAIL in Vercel env vars / GitHub Actions secrets.
    email: process.env.TEST_ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '',
    password: process.env.TEST_ADMIN_PASSWORD || '',
  },
  vendor: {
    email: process.env.TEST_VENDOR_EMAIL || '',
    password: process.env.TEST_VENDOR_PASSWORD || '',
  },
};

export async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input[placeholder*="admin"]', CREDS.admin.email);
  await page.fill('input[type="password"]', CREDS.admin.password);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
}

export async function loginAsVendor(page: Page) {
  await page.goto('/vendor/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', CREDS.vendor.email);
  await page.fill('input[type="password"]', CREDS.vendor.password);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForURL('**/vendor/dashboard', { timeout: 15000 });
}

/** Returns all visible, enabled buttons on the page with their labels */
export async function auditButtons(page: Page): Promise<{ label: string; passed: boolean; error?: string }[]> {
  const results: { label: string; passed: boolean; error?: string }[] = [];

  const buttons = await page.$$('button:visible:not([disabled])');
  for (const btn of buttons) {
    const label = (await btn.textContent() || await btn.getAttribute('aria-label') || 'unlabeled').trim().slice(0, 60);
    try {
      const box = await btn.boundingBox();
      results.push({ label, passed: box !== null });
    } catch (e: any) {
      results.push({ label, passed: false, error: e.message });
    }
  }
  return results;
}

/** Logs audit results to console in a readable table */
export function reportAudit(page: string, results: { label: string; passed: boolean; error?: string }[]) {
  const failed = results.filter(r => !r.passed);
  console.log(`\n── Button Audit: ${page} ──`);
  console.log(`  Total: ${results.length}  |  Passed: ${results.filter(r => r.passed).length}  |  Failed: ${failed.length}`);
  for (const f of failed) {
    console.log(`  ✗ "${f.label}" — ${f.error || 'not visible/clickable'}`);
  }
}
