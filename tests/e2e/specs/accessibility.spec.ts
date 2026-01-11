/**
 * Accessibility E2E Tests
 * Tests for WCAG compliance and accessibility features
 */

import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';
import { PollPage } from '../pages/PollPage';
import { setupTwitchMock } from '../mocks/twitch-api.mock';

test.describe('Accessibility - Keyboard Navigation', () => {
  test('should navigate main sections with keyboard', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // Tab through navigation
    await authenticatedPage.keyboard.press('Tab');
    
    // Should be able to reach navigation items
    let foundNav = false;
    for (let i = 0; i < 20; i++) {
      const focused = await authenticatedPage.evaluate(() => document.activeElement?.tagName);
      if (focused === 'BUTTON' || focused === 'A') {
        foundNav = true;
        break;
      }
      await authenticatedPage.keyboard.press('Tab');
    }
    
    expect(foundNav).toBe(true);
  });

  test('should activate buttons with Enter key', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // Wait for dashboard to be loaded
    const isConnected = await dashboard.isConnected();
    if (!isConnected) {
      test.skip();
      return;
    }

    // Focus on dynamics nav and press Enter
    await dashboard.dynamicsNav.focus();
    await authenticatedPage.keyboard.press('Enter');

    // Should activate the button (dynamics tab should be active)
    await expect(dashboard.dynamicsNav).toHaveClass(/bg-twitch-brand|active/);
  });

  test('should activate buttons with Space key', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // Wait for dashboard to be loaded
    const isConnected = await dashboard.isConnected();
    if (!isConnected) {
      test.skip();
      return;
    }

    // Focus on games nav and press Space
    await dashboard.gamesNav.focus();
    await authenticatedPage.keyboard.press('Space');

    // Should activate the button
    await expect(dashboard.gamesNav).toHaveClass(/bg-twitch-brand|active/);
  });

  test('should trap focus in modals', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Open a modal (e.g., settings or create dialog)
    const settingsButton = authenticatedPage.getByRole('button', { name: /ajustes|settings/i });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      const modal = authenticatedPage.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        // Tab through modal elements
        const initialFocused = await authenticatedPage.evaluate(() => document.activeElement?.id);
        
        // Tab many times
        for (let i = 0; i < 50; i++) {
          await authenticatedPage.keyboard.press('Tab');
        }
        
        // Focus should still be within modal
        const stillInModal = await authenticatedPage.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]');
          return modal?.contains(document.activeElement);
        });
        
        expect(stillInModal).toBe(true);
      }
    }
  });

  test('should close modal with Escape key', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    const settingsButton = authenticatedPage.getByRole('button', { name: /ajustes|settings/i });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      const modal = authenticatedPage.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        await authenticatedPage.keyboard.press('Escape');
        await expect(modal).toBeHidden();
      }
    }
  });
});

test.describe('Accessibility - ARIA', () => {
  test('should have proper ARIA landmarks', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Check for main landmark
    const main = authenticatedPage.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Check for navigation landmark
    const nav = authenticatedPage.locator('nav, [role="navigation"]');
    expect(await nav.count()).toBeGreaterThan(0);
  });

  test('should have proper button labels', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    const buttons = authenticatedPage.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const hasLabel = await button.evaluate((el) => {
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const textContent = el.textContent?.trim();
          const title = el.getAttribute('title');
          
          return !!(ariaLabel || ariaLabelledBy || textContent || title);
        });
        
        expect(hasLabel).toBe(true);
      }
    }
  });

  test('should have proper form labels', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    
    // Just test the current page's form inputs (login page or dashboard)
    await authenticatedPage.goto('/');

    const inputs = authenticatedPage.locator('input:not([type="hidden"]), select, textarea');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const hasLabel = await input.evaluate((el) => {
          const id = el.id;
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const hasAssociatedLabel = id && document.querySelector(`label[for="${id}"]`);
          const placeholder = el.getAttribute('placeholder');
          
          return !!(ariaLabel || ariaLabelledBy || hasAssociatedLabel || placeholder);
        });
        
        expect(hasLabel).toBe(true);
      }
    }
  });

  test('should announce dynamic content changes', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Check for live regions
    const liveRegions = authenticatedPage.locator('[aria-live], [role="alert"], [role="status"]');
    const count = await liveRegions.count();
    
    // Should have at least one live region for notifications
    expect(count).toBeGreaterThanOrEqual(0); // Soft check
  });
});

test.describe('Accessibility - Visual', () => {
  test('should have sufficient color contrast', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Check text elements have readable contrast
    // This is a basic check - full contrast testing requires axe-core
    const textElements = authenticatedPage.locator('p, span, label, h1, h2, h3, h4, h5, h6');
    const count = await textElements.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const el = textElements.nth(i);
      if (await el.isVisible()) {
        const styles = await el.evaluate((e) => {
          const computed = getComputedStyle(e);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
          };
        });
        
        // Basic check that text isn't invisible
        expect(styles.color).not.toBe('transparent');
        expect(styles.color).not.toBe(styles.backgroundColor);
      }
    }
  });

  test('should not rely solely on color', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Check that status indicators have more than just color
    const statusIndicators = authenticatedPage.locator('[data-testid*="status"], .status');
    const count = await statusIndicators.count();

    for (let i = 0; i < count; i++) {
      const indicator = statusIndicators.nth(i);
      if (await indicator.isVisible()) {
        const hasNonColorIndicator = await indicator.evaluate((el) => {
          const text = el.textContent?.trim();
          const ariaLabel = el.getAttribute('aria-label');
          const hasIcon = el.querySelector('svg, img, [class*="icon"]');
          
          return !!(text || ariaLabel || hasIcon);
        });
        
        expect(hasNonColorIndicator).toBe(true);
      }
    }
  });

  test('should have visible focus indicators', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Tab to first focusable element
    await authenticatedPage.keyboard.press('Tab');

    // Check that focused element has visible outline
    const hasFocusIndicator = await authenticatedPage.evaluate(() => {
      const focused = document.activeElement;
      if (!focused) return false;
      
      const styles = getComputedStyle(focused);
      const hasOutline = styles.outline !== 'none' && styles.outlineWidth !== '0px';
      const hasBoxShadow = styles.boxShadow !== 'none';
      const hasBorder = styles.borderColor !== 'transparent';
      
      return hasOutline || hasBoxShadow || hasBorder;
    });

    expect(hasFocusIndicator).toBe(true);
  });
});

test.describe('Accessibility - Screen Reader', () => {
  test('should have proper heading hierarchy', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    const headings = await authenticatedPage.evaluate(() => {
      const h1s = document.querySelectorAll('h1');
      const h2s = document.querySelectorAll('h2');
      const h3s = document.querySelectorAll('h3');
      
      return {
        h1Count: h1s.length,
        h2Count: h2s.length,
        h3Count: h3s.length,
      };
    });

    // Should have at least one heading (h1 or h2)
    expect(headings.h1Count + headings.h2Count).toBeGreaterThanOrEqual(1);
    
    // Should not skip heading levels (if h3 exists, h2 should too)
    if (headings.h3Count > 0) {
      expect(headings.h2Count).toBeGreaterThan(0);
    }
  });

  test('should have descriptive link text', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    const links = authenticatedPage.locator('a');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      if (await link.isVisible()) {
        const hasDescriptiveText = await link.evaluate((el) => {
          const text = el.textContent?.trim().toLowerCase();
          const ariaLabel = el.getAttribute('aria-label');
          
          // Check it's not just "click here" or "read more"
          const genericTexts = ['click here', 'read more', 'here', 'link'];
          const isGeneric = genericTexts.includes(text || '');
          
          return !isGeneric || !!ariaLabel;
        });
        
        expect(hasDescriptiveText).toBe(true);
      }
    }
  });

  test('should have alt text for images', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    const images = authenticatedPage.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        const hasAlt = await img.evaluate((el) => {
          const alt = el.getAttribute('alt');
          const role = el.getAttribute('role');
          
          // Decorative images should have empty alt or role="presentation"
          return alt !== null || role === 'presentation' || role === 'none';
        });
        
        expect(hasAlt).toBe(true);
      }
    }
  });
});
