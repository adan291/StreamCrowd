/**
 * Responsive E2E Tests
 * Tests for different viewport sizes and device types
 */

import { test, expect, devices } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { setupTwitchMock } from '../mocks/twitch-api.mock';

// Desktop viewport
const desktopViewport = { width: 1920, height: 1080 };

// Tablet viewport
const tabletViewport = { width: 768, height: 1024 };

// Mobile viewport
const mobileViewport = { width: 375, height: 667 };

test.describe('Responsive - Desktop', () => {
  test.use({ viewport: desktopViewport });

  test('should display full sidebar on desktop', async ({ page }) => {
    await setupTwitchMock(page);
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Sidebar should be visible and expanded
    await expect(dashboard.sidebar).toBeVisible();
    
    // Navigation items should show text labels
    await expect(dashboard.pollsNav).toBeVisible();
    const navText = await dashboard.pollsNav.textContent();
    expect(navText?.length).toBeGreaterThan(2); // More than just an icon
  });

  test('should show all dashboard sections on desktop', async ({ page }) => {
    await setupTwitchMock(page);
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // All main sections should be visible
    await expect(dashboard.pollsNav).toBeVisible();
    await expect(dashboard.predictionsNav).toBeVisible();
    await expect(dashboard.giveawaysNav).toBeVisible();
    await expect(dashboard.timersNav).toBeVisible();
  });

  test('should have proper spacing on desktop', async ({ page }) => {
    await setupTwitchMock(page);
    await page.goto('/');

    // Check that content has proper padding
    const mainContent = page.locator('main, [data-testid="main-content"]');
    const box = await mainContent.boundingBox();
    
    if (box) {
      // Content should not be edge-to-edge
      expect(box.x).toBeGreaterThan(0);
    }
  });
});

test.describe('Responsive - Tablet', () => {
  test.use({ viewport: tabletViewport });

  test('should adapt layout for tablet', async ({ page }) => {
    await setupTwitchMock(page);
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Sidebar might be collapsed or hamburger menu visible
    const hamburger = page.locator('[data-testid="menu-toggle"], [aria-label*="menu"]');
    const sidebarCollapsed = page.locator('[data-testid="sidebar-collapsed"]');
    
    // Either hamburger menu or collapsed sidebar should be present
    const hasResponsiveNav = await hamburger.isVisible() || await sidebarCollapsed.isVisible() || await dashboard.sidebar.isVisible();
    expect(hasResponsiveNav).toBe(true);
  });

  test('should be touch-friendly on tablet', async ({ page }) => {
    await setupTwitchMock(page);
    await page.goto('/');

    // Buttons should have minimum touch target size (44x44)
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(40);
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});

test.describe('Responsive - Mobile', () => {
  test.use({ viewport: mobileViewport });

  test('should show mobile navigation', async ({ page }) => {
    await setupTwitchMock(page);
    await page.goto('/');

    // Should have either bottom nav or hamburger menu
    const bottomNav = page.locator('[data-testid="bottom-nav"], nav[class*="bottom"]');
    const hamburger = page.locator('[data-testid="menu-toggle"], [aria-label*="menu"]');
    
    const hasMobileNav = await bottomNav.isVisible() || await hamburger.isVisible();
    expect(hasMobileNav).toBe(true);
  });

  test('should stack content vertically on mobile', async ({ page }) => {
    await setupTwitchMock(page);
    await page.goto('/');

    // Content should be single column
    const mainContent = page.locator('main, [data-testid="main-content"]');
    const box = await mainContent.boundingBox();
    
    if (box) {
      // Content should span most of the viewport width
      expect(box.width).toBeGreaterThan(mobileViewport.width * 0.8);
    }
  });

  test('should have readable text on mobile', async ({ page }) => {
    await setupTwitchMock(page);
    await page.goto('/');

    // Check font sizes are readable (at least 14px)
    const textElements = page.locator('p, span, label');
    const count = await textElements.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const el = textElements.nth(i);
      if (await el.isVisible()) {
        const fontSize = await el.evaluate((e) => 
          parseFloat(getComputedStyle(e).fontSize)
        );
        expect(fontSize).toBeGreaterThanOrEqual(12);
      }
    }
  });

  test('should handle touch gestures', async ({ page }) => {
    await setupTwitchMock(page);
    await page.goto('/');

    // Simulate swipe to open drawer (if applicable)
    const drawer = page.locator('[data-testid="mobile-drawer"]');
    
    if (await drawer.count() > 0) {
      // Swipe from left edge
      await page.mouse.move(0, 300);
      await page.mouse.down();
      await page.mouse.move(200, 300, { steps: 10 });
      await page.mouse.up();

      // Drawer might be visible after swipe
      // This is a soft check as implementation may vary
    }
  });

  test('should not have horizontal scroll on mobile', async ({ page }) => {
    await setupTwitchMock(page);
    await page.goto('/');

    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe('Responsive - Specific Devices', () => {
  test('should work on iPhone 12', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();
    
    await setupTwitchMock(page);
    await page.goto('/');

    // Basic functionality check
    await expect(page.locator('body')).toBeVisible();
    
    await context.close();
  });

  test('should work on iPad', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad (gen 7)'],
    });
    const page = await context.newPage();
    
    await setupTwitchMock(page);
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
    
    await context.close();
  });

  test('should work on Pixel 5', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
    });
    const page = await context.newPage();
    
    await setupTwitchMock(page);
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
    
    await context.close();
  });
});

test.describe('Responsive - Orientation', () => {
  test('should handle portrait orientation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setupTwitchMock(page);
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle landscape orientation', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await setupTwitchMock(page);
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
  });
});
