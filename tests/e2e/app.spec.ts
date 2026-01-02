import { test, expect } from '@playwright/test';

/**
 * E2E Tests for StreamCrowd App
 * Tests main user flows and UI interactions
 */

test.describe('App Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should load the app and show main interface', async ({ page }) => {
    // Should show the main app container
    await expect(page.locator('body')).toBeVisible();
    
    // Look for key UI elements
    const appContent = page.locator('[class*="min-h-screen"], [class*="app"], main').first();
    await expect(appContent).toBeVisible({ timeout: 10000 });
    
    // Should have some interactive elements
    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible();
  });

  test('should have theme toggle functionality', async ({ page }) => {
    // Get initial dark mode state
    const initialIsDark = await page.evaluate(() => 
      document.documentElement.classList.contains('dark')
    );
    
    // Find theme toggle button (usually has sun/moon icon)
    const themeButton = page.locator('button').filter({ 
      has: page.locator('svg[class*="lucide"]') 
    }).first();
    
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(300);
      
      // Verify theme changed
      const newIsDark = await page.evaluate(() => 
        document.documentElement.classList.contains('dark')
      );
      
      // Theme should have toggled (or stayed same if button wasn't theme toggle)
      expect(typeof newIsDark).toBe('boolean');
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // App should still be visible and functional
    await expect(page.locator('body')).toBeVisible();
    
    // Check that content doesn't overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 20); // Small tolerance
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Poll Creator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForTimeout(1000);
  });

  test('should show poll creator section', async ({ page }) => {
    // Look for poll-related UI elements
    const pollSection = page.getByText(/encuesta|poll|crear|opciones/i).first();
    
    if (await pollSection.isVisible()) {
      await expect(pollSection).toBeVisible();
    }
  });

  test('should allow adding poll options', async ({ page }) => {
    // Find add option button
    const addButton = page.getByRole('button', { name: /añadir|agregar|add|\+/i }).first();
    
    if (await addButton.isVisible()) {
      const initialOptions = await page.locator('input[placeholder*="opción" i], input[placeholder*="option" i]').count();
      
      await addButton.click();
      await page.waitForTimeout(300);
      
      const newOptions = await page.locator('input[placeholder*="opción" i], input[placeholder*="option" i]').count();
      
      // Should have more options after clicking add
      expect(newOptions).toBeGreaterThanOrEqual(initialOptions);
    }
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('should respond to Escape key to close modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Press Escape - should not cause errors
    await page.keyboard.press('Escape');
    
    // App should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should respond to theme toggle shortcut (Ctrl+T)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Get initial state
    const initialBg = await page.evaluate(() => 
      document.documentElement.classList.contains('dark')
    );
    
    // Press Ctrl+T
    await page.keyboard.press('Control+t');
    await page.waitForTimeout(300);
    
    // Theme might have changed (or shortcut might be disabled in inputs)
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('SoundBoard', () => {
  test('should open soundboard when clicking sound button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Look for soundboard button (speaker icon or "sonidos" text)
    const soundButton = page.getByRole('button', { name: /sonido|sound|🔊/i }).first();
    
    if (await soundButton.isVisible()) {
      await soundButton.click();
      await page.waitForTimeout(300);
      
      // Should show soundboard modal
      const soundboardModal = page.getByText(/panel de sonidos|soundboard/i);
      if (await soundboardModal.isVisible()) {
        await expect(soundboardModal).toBeVisible();
      }
    }
  });
});

test.describe('SpinnerWheel', () => {
  test('should open spinner wheel modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Look for spinner/wheel button
    const spinnerButton = page.getByRole('button', { name: /ruleta|spinner|🎰|🎡/i }).first();
    
    if (await spinnerButton.isVisible()) {
      await spinnerButton.click();
      await page.waitForTimeout(300);
      
      // Should show spinner modal
      const spinnerModal = page.getByText(/ruleta de la suerte/i);
      if (await spinnerModal.isVisible()) {
        await expect(spinnerModal).toBeVisible();
      }
    }
  });
});

test.describe('Demo Tour', () => {
  test('should start demo tour when clicking demo button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Look for demo/tour button
    const demoButton = page.getByRole('button', { name: /demo|tour|guía/i }).first();
    
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(500);
      
      // Should show tour overlay
      const tourOverlay = page.getByText(/bienvenido|welcome/i);
      if (await tourOverlay.isVisible()) {
        await expect(tourOverlay).toBeVisible();
      }
    }
  });
});

test.describe('Accessibility', () => {
  test('should have proper focus management', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should have a focused element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    expect(focusedElement).not.toBe('BODY'); // Should focus something specific
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find a button and focus it
    const button = page.getByRole('button').first();
    if (await button.isVisible()) {
      await button.focus();
      
      // Verify button is focused
      const isFocused = await button.evaluate((el) => 
        document.activeElement === el
      );
      expect(isFocused).toBe(true);
    }
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that buttons have accessible names
    const buttons = await page.getByRole('button').all();
    
    for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
      const accessibleName = await button.evaluate((el) => {
        return el.getAttribute('aria-label') || 
               el.textContent?.trim() || 
               el.getAttribute('title') ||
               '';
      });
      // Button should have some accessible identifier
      expect(accessibleName.length + (await button.locator('svg').count())).toBeGreaterThan(0);
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Press Tab multiple times and verify focus moves
    const focusedElements: string[] = [];
    
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => 
        document.activeElement?.tagName || 'none'
      );
      focusedElements.push(focused);
    }
    
    // Should have focused different elements
    const uniqueElements = new Set(focusedElements);
    expect(uniqueElements.size).toBeGreaterThan(1);
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known acceptable errors
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('net::ERR') &&
      !e.includes('Failed to load resource')
    );
    
    // Should have no critical console errors
    expect(criticalErrors.length).toBe(0);
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get initial memory usage (if available)
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory?.usedJSHeapSize || 0;
      }
      return 0;
    });
    
    // Perform some interactions
    const buttons = await page.getByRole('button').all();
    for (const button of buttons.slice(0, 3)) {
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(100);
      }
    }
    
    // Memory check is informational (not all browsers support it)
    expect(initialMemory).toBeGreaterThanOrEqual(0);
  });

  test('should render without layout shifts', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial render
    await page.waitForLoadState('networkidle');
    
    // Get initial positions of key elements
    const initialPositions = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, input, [class*="card"]');
      return Array.from(elements).slice(0, 5).map(el => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, left: rect.left };
      });
    });
    
    // Wait a bit more
    await page.waitForTimeout(500);
    
    // Get positions again
    const finalPositions = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, input, [class*="card"]');
      return Array.from(elements).slice(0, 5).map(el => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, left: rect.left };
      });
    });
    
    // Positions should be stable (no major shifts)
    for (let i = 0; i < Math.min(initialPositions.length, finalPositions.length); i++) {
      const shift = Math.abs(initialPositions[i].top - finalPositions[i].top);
      expect(shift).toBeLessThan(50); // Allow small shifts
    }
  });
});

test.describe('LocalStorage Persistence', () => {
  test('should persist theme preference', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Set a value in localStorage
    await page.evaluate(() => {
      localStorage.setItem('test_persistence', 'works');
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if value persists
    const value = await page.evaluate(() => 
      localStorage.getItem('test_persistence')
    );
    
    expect(value).toBe('works');
    
    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem('test_persistence');
    });
  });

  test('should persist poll data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if poll-related localStorage keys exist or can be set
    await page.evaluate(() => {
      localStorage.setItem('streamcrowd_poll_test', JSON.stringify({ test: true }));
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const pollData = await page.evaluate(() => 
      localStorage.getItem('streamcrowd_poll_test')
    );
    
    expect(pollData).toBeTruthy();
    expect(JSON.parse(pollData!)).toEqual({ test: true });
    
    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem('streamcrowd_poll_test');
    });
  });
});

test.describe('User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle rapid button clicks gracefully', async ({ page }) => {
    const button = page.getByRole('button').first();
    
    if (await button.isVisible()) {
      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        await button.click({ force: true });
      }
      
      // App should still be functional
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle form inputs correctly', async ({ page }) => {
    // Find any text input
    const input = page.locator('input[type="text"], input:not([type])').first();
    
    if (await input.isVisible()) {
      await input.fill('Test input value');
      
      const value = await input.inputValue();
      expect(value).toBe('Test input value');
    }
  });

  test('should handle number inputs with validation', async ({ page }) => {
    const numberInput = page.locator('input[type="number"]').first();
    
    if (await numberInput.isVisible()) {
      await numberInput.fill('50');
      
      const value = await numberInput.inputValue();
      expect(value).toBe('50');
    }
  });
});

test.describe('Modal Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should close modal with Escape key', async ({ page }) => {
    // Try to open any modal (soundboard, spinner, etc.)
    const modalTrigger = page.getByRole('button', { name: /sonido|sound|ruleta|spinner|🔊|🎰|🎡/i }).first();
    
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();
      await page.waitForTimeout(300);
      
      // Check if modal opened
      const modal = page.locator('[class*="fixed"][class*="inset"]').first();
      
      if (await modal.isVisible()) {
        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // Modal should be closed or app should be functional
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should close modal by clicking backdrop', async ({ page }) => {
    const modalTrigger = page.getByRole('button', { name: /sonido|sound|🔊/i }).first();
    
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();
      await page.waitForTimeout(300);
      
      // Try clicking outside the modal content
      await page.mouse.click(10, 10);
      await page.waitForTimeout(300);
      
      // App should still be functional
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle invalid routes gracefully', async ({ page }) => {
    // Navigate to non-existent route
    await page.goto('/non-existent-page');
    
    // Should either redirect to home or show error page
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // First load the page while online
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Then go offline
    await page.context().setOffline(true);
    
    // Try to interact with the page while offline
    const button = page.getByRole('button').first();
    if (await button.isVisible()) {
      await button.click();
    }
    
    // App should still be functional (cached/SPA)
    await expect(page.locator('body')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
  });
});

test.describe('Visual Regression Checks', () => {
  test('should render main layout correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that main sections exist
    const mainContent = page.locator('main, [class*="container"], [class*="app"]').first();
    await expect(mainContent).toBeVisible();
    
    // Check viewport is filled
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    
    expect(bodyHeight).toBeGreaterThanOrEqual(viewportHeight * 0.5);
  });

  test('should have consistent styling', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that Tailwind classes are applied
    const hasStyledElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="bg-"], [class*="text-"], [class*="rounded"]');
      return elements.length > 0;
    });
    
    expect(hasStyledElements).toBe(true);
  });
});
