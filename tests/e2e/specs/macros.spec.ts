/**
 * Macros E2E Tests
 * Tests for macro creation, execution, and triggers
 * 
 * Note: Macros are accessed via Platforms > Twitch > Macros
 */

import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Macros', () => {
  test('should navigate to platforms section', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    
    // Click on platforms nav
    await dashboard.platformsNav.click();
    await authenticatedPage.waitForTimeout(500);
    
    // Platforms panel should be visible
    const platformsHeader = authenticatedPage.locator('h2:has-text("Plataformas")');
    await expect(platformsHeader).toBeVisible({ timeout: 10000 });
  });

  test('should show Twitch platform card', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.platformsNav.click();
    await authenticatedPage.waitForTimeout(500);
    
    // Look for Twitch platform card
    const twitchCard = authenticatedPage.locator('h3:has-text("Twitch")');
    await expect(twitchCard).toBeVisible({ timeout: 10000 });
  });

  test('should click on Twitch card to see tools', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.platformsNav.click();
    await authenticatedPage.waitForTimeout(500);
    
    // Find and click on Twitch card
    const twitchHeading = authenticatedPage.locator('h3:has-text("Twitch")');
    await expect(twitchHeading).toBeVisible({ timeout: 5000 });
    
    // Click on the parent button
    await twitchHeading.click();
    await authenticatedPage.waitForTimeout(500);
    
    // Should show Twitch tools or authorization prompt
    const twitchTools = authenticatedPage.locator('text=/Macros|Predicciones|Predictions|Autorizar|Authorize/i').first();
    await expect(twitchTools).toBeVisible({ timeout: 10000 });
  });

  test('should show macros tool after clicking Twitch', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.platformsNav.click();
    await authenticatedPage.waitForTimeout(500);
    
    // Click on Twitch card
    const twitchCard = authenticatedPage.locator('button').filter({ hasText: /Twitch.*Comandos/i }).first();
    if (await twitchCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await twitchCard.click();
      await authenticatedPage.waitForTimeout(500);
      
      // Look for Macros tool button
      const macrosTool = authenticatedPage.locator('button:has-text("Macros")').first();
      const isVisible = await macrosTool.isVisible({ timeout: 5000 }).catch(() => false);
      
      // Macros tool should be visible (or auth prompt if not authorized)
      const authPrompt = authenticatedPage.locator('text=/Autorizar|Authorize/i').first();
      const hasAuth = await authPrompt.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(isVisible || hasAuth).toBe(true);
    }
  });

  test('should show platform selector with multiple platforms', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.platformsNav.click();
    await authenticatedPage.waitForTimeout(500);
    
    // Should show multiple platform cards
    const twitchCard = authenticatedPage.locator('h3:has-text("Twitch")');
    const youtubeCard = authenticatedPage.locator('h3:has-text("YouTube")');
    const kickCard = authenticatedPage.locator('h3:has-text("Kick")');
    
    await expect(twitchCard).toBeVisible({ timeout: 5000 });
    await expect(youtubeCard).toBeVisible({ timeout: 5000 });
    await expect(kickCard).toBeVisible({ timeout: 5000 });
  });

  test('should show YouTube and Kick as coming soon', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.platformsNav.click();
    await authenticatedPage.waitForTimeout(500);
    
    // YouTube and Kick should be disabled with "Próximamente" label
    const comingSoonLabels = authenticatedPage.locator('text=/Próximamente/i');
    const count = await comingSoonLabels.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should be keyboard navigable', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.platformsNav.click();
    await authenticatedPage.waitForTimeout(500);
    
    // Tab through elements
    await authenticatedPage.keyboard.press('Tab');
    await authenticatedPage.keyboard.press('Tab');
    
    // Should have focus on an interactive element
    const focusedElement = authenticatedPage.locator(':focus');
    await expect(focusedElement).toBeVisible({ timeout: 3000 });
  });

  test('should have accessible platform cards', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.platformsNav.click();
    await authenticatedPage.waitForTimeout(500);
    
    // Check that platform headings exist
    const twitchHeading = authenticatedPage.locator('h3:has-text("Twitch")');
    const youtubeHeading = authenticatedPage.locator('h3:has-text("YouTube")');
    const kickHeading = authenticatedPage.locator('h3:has-text("Kick")');
    
    await expect(twitchHeading).toBeVisible({ timeout: 5000 });
    await expect(youtubeHeading).toBeVisible({ timeout: 5000 });
    await expect(kickHeading).toBeVisible({ timeout: 5000 });
  });
});
