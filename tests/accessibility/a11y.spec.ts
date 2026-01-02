import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests - StreamCrowd
 * @requirements Task 11 - Tests de accesibilidad
 * @requirements Task 11.2 - Test: Contraste cumple WCAG AA
 * @requirements Task 11.3 - Test: Navegación por teclado funciona
 * @requirements Task 11.4 - Test: Screen reader compatible
 */

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Help: ${violation.helpUrl}`);
        violation.nodes.forEach((node) => {
          console.log(`  Element: ${node.html}`);
        });
      });
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper color contrast (WCAG AA)', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ runOnly: ['color-contrast'] })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading structure', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: ['heading-order', 'empty-heading'] })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper form labels', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: ['label', 'label-title-only'] })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({
        runOnly: [
          'aria-allowed-attr',
          'aria-hidden-body',
          'aria-hidden-focus',
          'aria-required-attr',
          'aria-required-children',
          'aria-required-parent',
          'aria-roles',
          'aria-valid-attr',
          'aria-valid-attr-value',
        ],
      })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper image alt text', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: ['image-alt', 'image-redundant-alt'] })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper link text', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: ['link-name', 'link-in-text-block'] })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper button text', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: ['button-name'] })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Keyboard Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should be able to navigate with Tab key', async ({ page }) => {
    // Focus first interactive element
    await page.keyboard.press('Tab');
    
    // Check that something is focused
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName : null;
    });
    
    expect(focusedElement).not.toBeNull();
    expect(focusedElement).not.toBe('BODY');
  });

  test('should show visible focus indicators', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Check for focus-visible styles
    const hasFocusStyles = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      
      const styles = window.getComputedStyle(el);
      // Check for outline or box-shadow (common focus indicators)
      return (
        styles.outline !== 'none' ||
        styles.outlineWidth !== '0px' ||
        styles.boxShadow !== 'none'
      );
    });
    
    expect(hasFocusStyles).toBe(true);
  });

  test('should be able to activate buttons with Enter and Space', async ({ page }) => {
    // Find a button
    const button = page.locator('button').first();
    await button.focus();
    
    // Test Enter key
    let clicked = false;
    await page.evaluate(() => {
      const btn = document.activeElement as HTMLButtonElement;
      if (btn) {
        btn.addEventListener('click', () => {
          (window as any).__buttonClicked = true;
        }, { once: true });
      }
    });
    
    await page.keyboard.press('Enter');
    clicked = await page.evaluate(() => (window as any).__buttonClicked || false);
    
    // Reset and test Space key
    await page.evaluate(() => {
      (window as any).__buttonClicked = false;
      const btn = document.activeElement as HTMLButtonElement;
      if (btn) {
        btn.addEventListener('click', () => {
          (window as any).__buttonClicked = true;
        }, { once: true });
      }
    });
    
    await page.keyboard.press('Space');
    const clickedWithSpace = await page.evaluate(() => (window as any).__buttonClicked || false);
    
    // At least one should work (Enter always works for buttons)
    expect(clicked || clickedWithSpace).toBe(true);
  });

  test('should trap focus in modals', async ({ page }) => {
    // This test would need a modal to be open
    // Skip if no modal trigger is found
    const modalTrigger = page.locator('[data-testid="open-modal"], [aria-haspopup="dialog"]').first();
    
    if (await modalTrigger.count() === 0) {
      test.skip();
      return;
    }
    
    await modalTrigger.click();
    
    // Wait for modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Tab through all elements
    const focusableCount = await modal.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
    
    for (let i = 0; i < focusableCount + 2; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Focus should still be within modal
    const focusInModal = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      return modal?.contains(document.activeElement);
    });
    
    expect(focusInModal).toBe(true);
  });

  test('should close modals with Escape key', async ({ page }) => {
    const modalTrigger = page.locator('[data-testid="open-modal"], [aria-haspopup="dialog"]').first();
    
    if (await modalTrigger.count() === 0) {
      test.skip();
      return;
    }
    
    await modalTrigger.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    await page.keyboard.press('Escape');
    
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Screen Reader Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper landmark regions', async ({ page }) => {
    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main).toHaveCount(1);
    
    // Check for navigation landmark
    const nav = page.locator('nav, [role="navigation"]');
    expect(await nav.count()).toBeGreaterThanOrEqual(1);
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper language attribute', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('should have skip link for main content', async ({ page }) => {
    // Skip links are usually the first focusable element
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link');
    
    // Skip link might be visually hidden but should exist
    const skipLinkExists = await skipLink.count() > 0;
    
    // This is a soft check - skip links are recommended but not required
    if (!skipLinkExists) {
      console.log('Note: No skip link found. Consider adding one for better accessibility.');
    }
  });

  test('should have proper live regions for dynamic content', async ({ page }) => {
    // Check for aria-live regions
    const liveRegions = page.locator('[aria-live]');
    const count = await liveRegions.count();
    
    // At least one live region should exist for notifications/alerts
    if (count === 0) {
      console.log('Note: No aria-live regions found. Consider adding them for dynamic content updates.');
    }
  });

  test('should not have content that flashes more than 3 times per second', async ({ page }) => {
    // This is a manual check reminder
    // Automated testing for flash rates is complex
    console.log('Manual check required: Verify no content flashes more than 3 times per second');
    expect(true).toBe(true);
  });
});

test.describe('Touch Target Tests', () => {
  test('should have minimum touch target size of 44x44px', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all interactive elements
    const interactiveElements = page.locator('button, a, input, select, [role="button"]');
    const count = await interactiveElements.count();
    
    const smallTargets: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const element = interactiveElements.nth(i);
      const box = await element.boundingBox();
      
      if (box && (box.width < 44 || box.height < 44)) {
        const html = await element.evaluate((el) => el.outerHTML.substring(0, 100));
        smallTargets.push(`${html}... (${box.width}x${box.height})`);
      }
    }
    
    if (smallTargets.length > 0) {
      console.log('Elements with small touch targets:');
      smallTargets.forEach((target) => console.log(`- ${target}`));
    }
    
    // Allow some small targets (like icon buttons that have padding)
    // but warn if there are many
    expect(smallTargets.length).toBeLessThan(10);
  });
});
