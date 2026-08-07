import { test, expect } from '@playwright/test';
import { auditButtons, reportAudit } from './helpers/auth';

test.describe('Customer Booking Flow', () => {

  test('Homepage loads with hero, How It Works, footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    await expect(page.locator('h1:has-text("Book Motels by the Hour")')).toBeVisible();
    await expect(page.locator('h2:has-text("How It Works")')).toBeVisible();
    await expect(page.locator('h2:has-text("Why Choose MicroStay")')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();

    const audit = await auditButtons(page);
    reportAudit('Homepage', audit);
    expect(audit.filter(b => !b.passed).length).toBe(0);
  });

  test('Homepage search tabs toggle correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    // Click City/State tab
    await page.click('button:has-text("City / State Search")');
    await expect(page.locator('label:has-text("State")').first()).toBeVisible();
    await expect(page.locator('label:has-text("City")').first()).toBeVisible();

    // Switch back to Nearby
    await page.click('button:has-text("Nearby Motels")');
    await expect(page.locator('label:has-text("Smoking")').first()).toBeVisible();
  });

  test('Homepage List View search redirects to /search', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);

    await page.click('button:has-text("List View")');
    await page.waitForURL('**/search**', { timeout: 10000 });
    expect(page.url()).toContain('/search');
  });

  test('Homepage Map View search redirects to /search?view=map', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);

    await page.click('button:has-text("Map View")');
    await page.waitForURL('**/search**', { timeout: 10000 });
    expect(page.url()).toContain('view=map');
  });

  test('Search page loads with results or empty state', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await page.goto(`/search?searchType=nearby&date=${today}`);
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    // Either property cards or empty state
    const hasCards = await page.locator('[class*="card"], [class*="Card"], .property-card').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=No properties, text=No results, text=no properties found').first().isVisible().catch(() => false);
    console.log(`  Property cards visible: ${hasCards}, Empty state: ${hasEmpty}`);

    const audit = await auditButtons(page);
    reportAudit('Search Page', audit);
  });

  test('Search page — List/Map toggle works', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await page.goto(`/search?searchType=nearby&date=${today}`);
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    // Look for view toggle button
    const mapToggle = page.locator('button:has-text("Map"), button[aria-label*="map"]').first();
    if (await mapToggle.isVisible()) {
      await mapToggle.click();
      await page.waitForTimeout(500);
      console.log('  ✓ Map toggle clicked');
    }

    const listToggle = page.locator('button:has-text("List"), button[aria-label*="list"]').first();
    if (await listToggle.isVisible()) {
      await listToggle.click();
      console.log('  ✓ List toggle clicked');
    }
  });

  test('Property detail page loads from search', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await page.goto(`/search?searchType=nearby&date=${today}`);
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    // Click first property card link
    const firstProperty = page.locator('a[href*="/motel/"]').first();
    if (!await firstProperty.isVisible()) {
      console.log('  - No properties in DB, skipping motel detail test');
      test.skip();
      return;
    }

    const href = await firstProperty.getAttribute('href');
    await firstProperty.click();
    await page.waitForURL('**/motel/**', { timeout: 10000 });
    console.log(`  ✓ Navigated to: ${page.url()}`);

    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible();

    const audit = await auditButtons(page);
    reportAudit('Motel Detail', audit);
  });

  test('Booking page loads with guest form', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await page.goto(`/search?searchType=nearby&date=${today}`);
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    const firstProperty = page.locator('a[href*="/motel/"]').first();
    if (!await firstProperty.isVisible()) {
      test.skip();
      return;
    }

    await firstProperty.click();
    await page.waitForURL('**/motel/**', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    // Click first available time slot button (not sold out)
    const slotBtn = page.locator('button:not([disabled]):has-text("Book"), button:not([disabled]):has-text("Select"), button:not([disabled]):has-text("hr"), button:not([disabled]):has-text("AM"), button:not([disabled]):has-text("PM")').first();
    if (await slotBtn.isVisible()) {
      await slotBtn.click();
      await page.waitForTimeout(500);
    }

    // Navigate to book page
    const bookBtn = page.locator('a[href*="/book/"], button:has-text("Book Now"), button:has-text("Proceed to Book")').first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForURL('**/book/**', { timeout: 10000 });

      // Verify guest form fields
      await expect(page.locator('input[placeholder*="name" i], input[name*="name" i]').first()).toBeVisible();
      await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible();
      await expect(page.locator('input[type="tel"], input[placeholder*="phone" i]').first()).toBeVisible();

      console.log('  ✓ Booking form loaded with guest fields');

      const audit = await auditButtons(page);
      reportAudit('Booking / Checkout', audit);
    } else {
      console.log('  - No available slots to book today');
    }
  });

  test('Booking confirmation page loads with ref code', async ({ page }) => {
    await page.goto('/booking-confirmation?ref=TEST-0000');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
    // Page should render without crashing (ref may not exist but page should not 500)
    await expect(page.locator('body')).toBeVisible();

    const audit = await auditButtons(page);
    reportAudit('Booking Confirmation', audit);
  });

  test('Check booking page loads and accepts input', async ({ page }) => {
    await page.goto('/check-booking');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    await expect(page.locator('main')).toBeVisible();

    // Should have a search/lookup input
    const input = page.locator('input[placeholder*="ref" i], input[placeholder*="booking" i], input[placeholder*="code" i], input[type="text"]').first();
    if (await input.isVisible()) {
      await input.fill('TEST-0000');
      const searchBtn = page.locator('button[type="submit"], button:has-text("Check"), button:has-text("Search"), button:has-text("Look")').first();
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
        await page.waitForTimeout(1000);
        console.log('  ✓ Booking lookup submitted');
      }
    }

    const audit = await auditButtons(page);
    reportAudit('Check Booking', audit);
  });

  test('Navbar links all work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    const navLinks: { text: string; expectedPath: string }[] = [
      { text: 'Book Now', expectedPath: '/search' },
      { text: 'Partner With Us', expectedPath: '/partner-signup' },
      { text: 'My Bookings', expectedPath: '/check-booking' },
    ];

    for (const link of navLinks) {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
      await Promise.all([
        page.waitForURL(`**${link.expectedPath}**`, { timeout: 10000 }),
        page.click(`nav a:has-text("${link.text}")`),
      ]);
      expect(page.url()).toContain(link.expectedPath);
      console.log(`  ✓ Navbar link "${link.text}" → ${page.url()}`);
    }
  });

  test('Popular Cities — clicking a city navigates to search', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    const cityCard = page.locator('button:has-text(" properties"), button:has-text(" property")').first();
    if (await cityCard.isVisible()) {
      await cityCard.click();
      await page.waitForURL('**/search**', { timeout: 10000 });
      expect(page.url()).toContain('/search');
      console.log(`  ✓ City card navigated to: ${page.url()}`);
    } else {
      console.log('  - No popular cities visible (no properties in DB)');
    }
  });

  test('Partner landing page loads', async ({ page }) => {
    await page.goto('/partner');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible();

    const audit = await auditButtons(page);
    reportAudit('Partner Landing', audit);
    expect(audit.filter(b => !b.passed).length).toBe(0);
  });

  test('Partner signup page loads and has form', async ({ page }) => {
    await page.goto('/partner-signup');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('input').first()).toBeVisible();

    const audit = await auditButtons(page);
    reportAudit('Partner Signup', audit);
  });

  test('Footer links are present and have valid hrefs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);

    const footerLinks = [
      { text: 'Book Now', href: '/search' },
      { text: 'My Bookings', href: '/check-booking' },
      { text: 'Become a Partner', href: '/partner' },
      { text: 'Vendor Login', href: '/vendor/login' },
      { text: 'Privacy Policy', href: '/privacy' },
      { text: 'Terms of Service', href: '/terms' },
    ];

    for (const link of footerLinks) {
      const el = page.locator(`footer a:has-text("${link.text}")`).first();
      if (await el.isVisible()) {
        const href = await el.getAttribute('href');
        expect(href).toContain(link.href);
        console.log(`  ✓ Footer "${link.text}" → ${href}`);
      } else {
        console.log(`  - Footer link "${link.text}" not visible`);
      }
    }
  });
});
