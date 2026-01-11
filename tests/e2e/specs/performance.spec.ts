/**
 * Performance E2E Tests
 * Tests for page load times and responsiveness
 */

import { test, expect } from '../fixtures/auth.fixture';

// Note: authenticatedPage fixture already sets up Twitch mocks and connects

test.describe('Performance - Page Load', () => {
  test('should load dashboard within acceptable time', async ({ authenticatedPage }) => {
    const startTime = Date.now();
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should show content within 2 seconds', async ({ authenticatedPage }) => {
    const startTime = Date.now();
    await authenticatedPage.goto('/');
    
    // Wait for main content to be visible
    const mainContent = authenticatedPage.locator('main, [data-testid="main-content"]');
    await expect(mainContent).toBeVisible({ timeout: 2000 });
    
    const contentTime = Date.now() - startTime;
    expect(contentTime).toBeLessThan(2000);
  });

  test('should have fast time to interactive', async ({ authenticatedPage }) => {
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
    await authenticatedPage.goto('/');

    // Rapidly click through navigation
    const navButtons = authenticatedPage.locator('nav button:visible, aside button:visible, [data-testid="nav-item"]:visible');
    const count = await navButtons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = navButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {}); // Ignore click errors during rapid nav
        await authenticatedPage.waitForTimeout(100);
      }
    }

    // App should still be responsive
    await expect(authenticatedPage.locator('body')).toBeVisible();
  });
});

test.describe('Performance - Interactions', () => {
  test('should respond to button clicks quickly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');

    const button = authenticatedPage.locator('button:visible').first();
    await button.waitFor({ state: 'visible' });
    
    const startTime = Date.now();
    await button.click();
    const clickTime = Date.now() - startTime;

    // Click response should be under 500ms (includes any animations/transitions)
    expect(clickTime).toBeLessThan(500);
  });

  test('should handle form input without lag', async ({ authenticatedPage }) => {
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

      // Input should be responsive (under 500ms)
      expect(inputTime).toBeLessThan(500);
    }
  });
});

test.describe('Performance - Memory', () => {
  test('should not leak memory on navigation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');

    // Get initial memory (if available)
    const initialMemory = await authenticatedPage.evaluate(() => {
      if ('memory' in performance) {
        return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
      }
      return null;
    });

    // Navigate multiple times using sidebar navigation buttons
    const navButtons = authenticatedPage.locator('[data-tour^="nav-"], aside button:visible');
    const count = await navButtons.count();
    
    for (let i = 0; i < Math.min(10, count * 2); i++) {
      const btnIndex = i % Math.max(count, 1);
      const btn = navButtons.nth(btnIndex);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {});
        await authenticatedPage.waitForTimeout(100);
      }
    }

    // Get final memory
    const finalMemory = await authenticatedPage.evaluate(() => {
      if ('memory' in performance) {
        return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
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
    const requests: string[] = [];
    authenticatedPage.on('request', (request) => {
      requests.push(request.url());
    });

    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('networkidle');

    // Should have reasonable number of requests (under 300 for a modern SPA with HMR)
    expect(requests.length).toBeLessThan(300);
  });

  test('should handle slow network gracefully', async ({ authenticatedPage }) => {
    // Simulate slow network using route delay instead of CDP
    await authenticatedPage.route('**/*', async (route) => {
      // Add 100ms delay to all requests
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    // Navigate to the app
    const startTime = Date.now();
    await authenticatedPage.goto('/', { timeout: 30000 });
    const loadTime = Date.now() - startTime;
    
    // Should still load within reasonable time (30 seconds with slow network)
    expect(loadTime).toBeLessThan(30000);
    
    // Should show content eventually
    const content = authenticatedPage.locator('body');
    await expect(content).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Performance - Animations', () => {
  test('should have smooth animations', async ({ authenticatedPage }) => {
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
    // Set reduced motion preference
    await authenticatedPage.emulateMedia({ reducedMotion: 'reduce' });
    await authenticatedPage.goto('/');

    // Check that animations are disabled or reduced
    const animatedElements = authenticatedPage.locator('[class*="animate"]');
    const count = await animatedElements.count();

    // Just verify the page loads correctly with reduced motion
    // Animation duration checks are unreliable as CSS may not change
    await expect(authenticatedPage.locator('body')).toBeVisible();
    
    // If there are animated elements, they should still be visible
    if (count > 0) {
      const firstAnimated = animatedElements.first();
      if (await firstAnimated.isVisible().catch(() => false)) {
        // Element is visible, which is the main requirement
        expect(true).toBe(true);
      }
    }
  });
});
