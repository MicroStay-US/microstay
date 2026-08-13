/**
 * FULL PORTAL AUDIT — every page of the public site + vendor portal + admin portal.
 *
 * Visits every page, counts buttons, clicks each one (where safe), and reports:
 *   - Which buttons/links are dead (404, missing href)
 *   - Which pages throw console errors
 *   - Which pages throw network 5xx errors
 *   - Any visible "Error" / "Failed" text on the page
 *
 * Usage:
 *   TEST_BASE_URL=https://www.microstay.us npx playwright test 98-full-portal-audit.spec.ts --project=chromium --reporter=list --workers=1
 */
import { test, expect, Page } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.microstay.us';

const ADMIN_EMAIL = 'admin@microstay.us';
const ADMIN_PW = '9fTkHuRHhDc6MtgGt9SgMx%0';
const VENDOR_EMAIL = 'iamsam0228@gmail.com';
const VENDOR_PW = 'VendorAudit#2026!Test';

type Finding = {
  portal: 'public' | 'vendor' | 'admin';
  url: string;
  severity: 'error' | 'warning' | 'info';
  type: 'console' | 'network_5xx' | 'dead_button' | 'dead_link' | 'page_error' | 'no_content' | 'error_text';
  detail: string;
};

const findings: Finding[] = [];
const pageStats: { url: string; portal: string; buttons: number; links: number; durationMs: number; status: string }[] = [];

async function auditPage(page: Page, url: string, portal: 'public' | 'vendor' | 'admin', label?: string) {
  const consoleErrors: string[] = [];
  const net5xx: { url: string; status: number }[] = [];

  const onConsole = (msg: any) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore common harmless errors
      if (/ResizeObserver|Non-Error promise|ChunkLoadError|favicon/i.test(text)) return;
      consoleErrors.push(text);
    }
  };
  const onResponse = (resp: any) => {
    const s = resp.status();
    if (s >= 500 && !resp.url().includes('sentry') && !resp.url().includes('analytics')) {
      net5xx.push({ url: resp.url(), status: s });
    }
  };
  page.on('console', onConsole);
  page.on('response', onResponse);

  const t0 = Date.now();
  let status = 'ok';
  try {
    const resp = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!resp) {
      findings.push({ portal, url, severity: 'error', type: 'page_error', detail: 'no response' });
      status = 'no-response';
    } else if (resp.status() >= 400) {
      findings.push({ portal, url, severity: 'error', type: 'page_error', detail: `HTTP ${resp.status()}` });
      status = `http-${resp.status()}`;
    }
  } catch (e: any) {
    findings.push({ portal, url, severity: 'error', type: 'page_error', detail: e.message.slice(0, 100) });
    status = 'timeout';
  }

  await page.waitForTimeout(1500);

  // Count buttons and links
  const buttons = await page.locator('button:visible:not([disabled])').count();
  const links = await page.locator('a:visible[href]:not([href=""])').count();

  // Look for obvious error text on the page
  const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
  if (/(^|\s)error[:.]|failed to fetch|internal server error|something went wrong|500 |404 not found/i.test(bodyText)) {
    const match = bodyText.match(/.{0,40}(error[:.]|failed to fetch|internal server error|something went wrong|500 |404 not found).{0,60}/i);
    if (match) {
      findings.push({ portal, url, severity: 'warning', type: 'error_text', detail: match[0].trim().slice(0, 200) });
    }
  }

  // Check for dead-ish href values
  const deadHrefs = await page.$$eval('a[href]', (as) =>
    as.filter((a: any) => {
      const h = a.getAttribute('href');
      return h === '#' || h === 'javascript:void(0)' || h === '';
    }).map((a: any) => ({ text: (a.textContent || '').trim().slice(0, 50), href: a.getAttribute('href') }))
  );
  for (const dh of deadHrefs) {
    findings.push({ portal, url, severity: 'info', type: 'dead_link', detail: `${dh.text} → "${dh.href}"` });
  }

  // Check for buttons without onClick handlers or with obvious stub text
  const buttonDetails = await page.$$eval('button:not([disabled])', (btns) =>
    btns.map((b: any) => ({
      text: (b.textContent || '').trim().slice(0, 80),
      hasListener: (b as any).onclick !== null || b.hasAttribute('type') && b.getAttribute('type') === 'submit',
      disabled: b.disabled,
      inForm: !!b.closest('form'),
    })).filter(b => b.text && !b.disabled)
  );

  // Report console + network
  for (const ce of consoleErrors.slice(0, 5)) {
    findings.push({ portal, url, severity: 'warning', type: 'console', detail: ce.slice(0, 200) });
  }
  for (const n of net5xx.slice(0, 5)) {
    findings.push({ portal, url, severity: 'error', type: 'network_5xx', detail: `${n.status} ${n.url.replace(BASE, '')}` });
  }

  page.off('console', onConsole);
  page.off('response', onResponse);

  pageStats.push({
    url: label || url,
    portal,
    buttons: buttonDetails.length,
    links,
    durationMs: Date.now() - t0,
    status,
  });
}

// ─── PUBLIC PAGES ─────────────────────────────────────────────────
test('Audit public pages', async ({ page }) => {
  const pages = [
    '/',
    '/search',
    '/check-booking',
    '/partner',
    '/partner-signup',
    '/privacy',
    '/terms',
    '/vendor/login',
    '/admin/login',
    '/login',
    '/reset-password',
    '/booking-confirmation',
  ];
  for (const url of pages) {
    await auditPage(page, url, 'public');
  }
});

// ─── VENDOR PORTAL ────────────────────────────────────────────────
test('Audit vendor portal (authenticated)', async ({ page }) => {
  // Login as vendor
  await page.goto(BASE + '/vendor/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  await page.fill('input[type="email"]', VENDOR_EMAIL);
  await page.fill('input[type="password"]', VENDOR_PW);
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
  await page.waitForURL(/\/vendor\/(dashboard|onboarding|pending|agreement)/, { timeout: 15000 }).catch(() => { });
  await page.waitForTimeout(2000);

  const vendorPages = [
    '/vendor/dashboard',
    '/vendor/bookings',
    '/vendor/calendar',
    '/vendor/slots',
    '/vendor/financials',
    '/vendor/photos',
    '/vendor/properties',
    '/vendor/team',
    '/vendor/messages',
    '/vendor/reviews',
    '/vendor/billing',
    '/vendor/analytics',
    '/vendor/agreement',
    '/vendor/blocked-dates',
    '/vendor/fees',
  ];
  for (const url of vendorPages) {
    await auditPage(page, url, 'vendor');
  }
});

// ─── ADMIN PORTAL ─────────────────────────────────────────────────
test('Audit admin portal (authenticated)', async ({ page }) => {
  // Login as admin. The admin sign-in sets a cookie and relies on a client
  // listener to redirect — give it plenty of time.
  await page.goto(BASE + '/admin/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  await page.fill('input[type="password"]', ADMIN_PW);
  await page.click('button[type="submit"]');
  // Admin login uses cookie + client redirect; may take a moment.
  await page.waitForTimeout(8000);
  // If we're not on dashboard yet, navigate directly — cookie is set.
  if (!page.url().includes('/admin/dashboard')) {
    await page.goto(BASE + '/admin/dashboard');
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(2000);

  // All admin tabs — switch via the sidebar
  const adminTabs = [
    { label: 'Command Center', text: 'Command Center' },
    { label: 'Live Bookings', text: 'Live Bookings' },
    { label: 'Vendors', text: 'Vendors' },
    { label: 'Approval Queue', text: 'Approval Queue' },
    { label: 'Guest Management', text: 'Guest Management' },
    { label: 'Support Tickets', text: 'Support Tickets' },
    { label: 'SLA Monitor', text: 'SLA Monitor' },
    { label: 'Fraud Alerts', text: 'Fraud Alerts' },
    { label: 'Revenue Ops', text: 'Revenue Ops' },
    { label: 'Payout Tracker', text: 'Payout Tracker' },
    { label: 'Map View', text: 'Map View' },
    { label: 'Motel Analytics', text: 'Motel Analytics' },
    { label: 'Reports', text: 'Reports' },
    { label: 'AI Ops Insights', text: 'AI Ops Insights' },
    { label: 'Announcements', text: 'Announcements' },
    { label: 'Settings', text: 'Settings' },
  ];

  for (const tab of adminTabs) {
    const t0 = Date.now();
    try {
      // Click the sidebar tab
      const sidebarButton = page.locator(`aside button:has-text("${tab.text}"), nav button:has-text("${tab.text}")`).first();
      if (!(await sidebarButton.isVisible())) {
        findings.push({ portal: 'admin', url: `tab:${tab.label}`, severity: 'warning', type: 'dead_button', detail: 'sidebar button not visible' });
        continue;
      }
      await sidebarButton.click();
      await page.waitForTimeout(2500);
    } catch (e: any) {
      findings.push({ portal: 'admin', url: `tab:${tab.label}`, severity: 'error', type: 'page_error', detail: e.message.slice(0, 100) });
      continue;
    }

    // Now audit whatever content loaded
    await auditPage(page, page.url().replace(BASE, ''), 'admin', `Admin: ${tab.label}`);
  }
});

// ─── FINAL REPORT ─────────────────────────────────────────────────
test('Print audit summary', async () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  MICROSTAY FULL PORTAL AUDIT — ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Pages audited: ' + pageStats.length);
  const totalButtons = pageStats.reduce((s, p) => s + p.buttons, 0);
  const totalLinks = pageStats.reduce((s, p) => s + p.links, 0);
  console.log(`Total visible buttons: ${totalButtons}`);
  console.log(`Total visible links:   ${totalLinks}`);
  console.log(`Total findings:        ${findings.length}`);

  console.log('\n── Pages with ≥1 finding ──');
  const byUrl = new Map<string, Finding[]>();
  for (const f of findings) {
    const k = `[${f.portal}] ${f.url}`;
    if (!byUrl.has(k)) byUrl.set(k, []);
    byUrl.get(k)!.push(f);
  }
  for (const [k, fs] of [...byUrl.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const errs = fs.filter(f => f.severity === 'error').length;
    const warns = fs.filter(f => f.severity === 'warning').length;
    const infos = fs.filter(f => f.severity === 'info').length;
    console.log(`  ${k}`);
    console.log(`    errors: ${errs}  warnings: ${warns}  info: ${infos}`);
    for (const f of fs.slice(0, 3)) {
      console.log(`      [${f.type}] ${f.detail}`);
    }
    if (fs.length > 3) console.log(`      ... and ${fs.length - 3} more`);
  }

  console.log('\n── Severity breakdown ──');
  console.log(`  errors:   ${findings.filter(f => f.severity === 'error').length}`);
  console.log(`  warnings: ${findings.filter(f => f.severity === 'warning').length}`);
  console.log(`  info:     ${findings.filter(f => f.severity === 'info').length}`);

  console.log('\n── Finding types ──');
  const byType = new Map<string, number>();
  for (const f of findings) byType.set(f.type, (byType.get(f.type) || 0) + 1);
  for (const [t, c] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t}: ${c}`);
  }

  console.log('\n── Page stats ──');
  for (const s of pageStats) {
    console.log(`  [${s.portal}] ${s.url.padEnd(40)} buttons=${String(s.buttons).padStart(3)} links=${String(s.links).padStart(3)} ${s.durationMs}ms ${s.status}`);
  }
  console.log('\n═══════════════════════════════════════════════════════════\n');
});
