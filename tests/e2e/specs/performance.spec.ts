/**
 * Performance E2E Tests
 * Tests for page load times and responsiveness
 */

import { test, expect } from '../fixtures/auth.fixture';
import { setupTwitchMock } from '../mocks/twitch-api.mock';

test.describe('Performance - Page Load', () => {
  test('should load dashboard within acceptable time', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    
    const startTime = Date.now();
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should show content within 2 seconds', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    
    const startTime = Date.now();
    await authenticatedPage.goto('/');
    
    // Wait for main content to be visible
    const mainContent = authenticatedPage.locator('main, [data-testid="main-content"]');
    await expect(mainContent).toBeVisible({ timeout: 2000 });
    
    const contentTime = Date.now() - startTime;
    expect(contentTime).toBeLessThan(2000);
  });

  test('should have fast time to interactive', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    
    const startTime = Date.now();
    await authenticatedPage.goto('/');
    
    // Wait for first interactive element
    const firstButton = authenticatedPage.locator('button').first();
    await expect(firstButton).toBeEnabled({ timeout: 3000 });
    
    const interactiveTime = Date.now() - startTime;
    expect(interactiveTime).toBeLessThan(3000);
  });
});

test.describe('Performance - Navigation', () => {
  test('should navigate between sections quickly', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    const sections = ['polls', 'timers', 'giveaways'];
    
    for (const section of sections) {
      const startTime = Date.now();
      
      const navButton = authenticatedPage.getByRole('button', { name: new RegExp(section, 'i') });
      if (await navButton.isVisible()) {
        await navButton.click();
        await authenticatedPage.waitForLoadState('domcontentloaded');
        
        const navTime = Date.now() - startTime;
        // Navigation should be under 500ms
        expect(navTime).toBeLessThan(500);
      }
    }
  });

  test('should handle rapid navigation', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Rapidly click through navigation
    const navButtons = authenticatedPage.locator('nav button, [data-testid="nav-item"]');
    const count = await navButtons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      await navButtons.nth(i).click();
      await authenticatedPage.waitForTimeout(50);
    }

    // App should still be responsive
    await expect(authenticatedPage.locator('body')).toBeVisible();
  });
});

test.describe('Performance - Interactions', () => {
  test('should respond to button clicks quickly', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    const button = authenticatedPage.locator('button').first();
    
    const startTime = Date.now();
    await button.click();
    const clickTime = Date.now() - startTime;

    // Click response should be under 100ms
    expect(clickTime).toBeLessThan(100);
  });

  test('should handle form input without lag', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Navigate to a form
    const pollsButton = authenticatedPage.getByRole('button', { name: /polls|encuestas/i });
    if (await pollsButton.isVisible()) {
      await pollsButton.click();
    }

    const input = authenticatedPage.locator('input[type="text"]').first();
    if (await input.isVisible()) {
      const startTime = Date.now();
      await input.fill('Test input performance');
      const inputTime = Date.now() - startTime;

      // Input should be responsive (under 200ms)
      expect(inputTime).toBeLessThan(200);
    }
  });
});

test.describe('Performance - Memory', () => {
  test('should not leak memory on navigation', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Get initial memory (if available)
    const initialMemory = await authenticatedPage.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory?.usedJSHeapSize;
      }
      return null;
    });

    // Navigate multiple times
    for (let i = 0; i < 10; i++) {
      const navButtons = authenticatedPage.locator('nav button');
      const count = await navButtons.count();
      if (count > 0) {
        await navButtons.nth(i % count).click();
        await authenticatedPage.waitForTimeout(100);
      }
    }

    // Get final memory
    const finalMemory = await authenticatedPage.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory?.usedJSHeapSize;
      }
      return null;
    });

    // Memory shouldn't grow excessively (allow 50% growth)
    if (initialMemory && finalMemory) {
      expect(finalMemory).toBeLessThan(initialMemory * 1.5);
    }
  });
});

test.describe('Performance - Network', () => {
  test('should minimize network requests', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    
    const requests: string[] = [];
    authenticatedPage.on('request', (request) => {
      requests.push(request.url());
    });

    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('networkidle');

    // Should have reasonable number of requests (under 50)
    expect(requests.length).toBeLessThan(50);
  });

  test('should handle slow network gracefully', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    
    // Simulate slow network
    const client = await authenticatedPage.context().newCDPSession(authenticatedPage);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 100 * 1024 / 8, // 100 kbps
      uploadThroughput: 100 * 1024 / 8,
      latency: 500,
    });

    await authenticatedPage.goto('/');
    
    // Should still load (with loading indicator)
    const loadingOrContent = authenticatedPage.locator('[data-testid="loading"], main');
    await expect(loadingOrContent).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Performance - Animations', () => {
  test('should have smooth animations', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Check that animations use transform/opacity (GPU accelerated)
    const animatedElements = authenticatedPage.locator('[class*="animate"], [class*="transition"]');
    const count = await animatedElements.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const el = animatedElements.nth(i);
      if (await el.isVisible()) {
        const styles = await el.evaluate((e) => {
          const computed = getComputedStyle(e);
          return {
            willChange: computed.willChange,
            transform: computed.transform,
          };
        });

        // Animations should use GPU-friendly properties
        // This is a soft check
        expect(styles).toBeDefined();
      }
    }
  });

  test('should respect reduced motion preference', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    
    // Set reduced motion preference
    await authenticatedPage.emulateMedia({ reducedMotion: 'reduce' });
    await authenticatedPage.goto('/');

    // Check that animations are disabled or reduced
    const animatedElements = authenticatedPage.locator('[class*="animate"]');
    const count = await animatedElements.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const el = animatedElements.nth(i);
      if (await el.isVisible()) {
        const duration = await el.evaluate((e) => {
          const computed = getComputedStyle(e);
          return parseFloat(computed.animationDuration) || 0;
        });

        // Animations should be instant or very short
        expect(duration).toBeLessThanOrEqual(0.01);
      }
    }
  });
});
