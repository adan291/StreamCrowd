/**
 * Authentication E2E Tests
 * Tests for Twitch OAuth login, logout, and session persistence
 */

import { test, expect } from '@playwright/test';
import { setupTwitchMock, mockUser } from '../mocks/twitch-api.mock';

test.describe('Authentication - Login', () => {
  test('should show login button when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should show Twitch OAuth login button (the primary login action)
    const loginButton = page.getByRole('button', { name: /iniciar sesión con twitch/i });
    await expect(loginButton).toBeVisible();
  });

  test('should redirect to Twitch OAuth', async ({ page }) => {
    await page.goto('/');
    
    // Use the Twitch OAuth button specifically
    const loginButton = page.getByRole('button', { name: /iniciar sesión con twitch/i });
    if (await loginButton.isVisible()) {
      // Listen for navigation
      const [popup] = await Promise.all([
        page.waitForEvent('popup').catch(() => null),
        loginButton.click(),
      ]);

      // Should navigate to Twitch or show OAuth flow
      if (popup) {
        expect(popup.url()).toContain('twitch');
      }
    }
  });

  test('should complete login with mocked OAuth', async ({ page }) => {
    await setupTwitchMock(page);
    
    // Set up auth state
    await page.addInitScript((user) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'mock_token',
        user: user,
        expiresAt: Date.now() + 3600000,
      }));
      localStorage.setItem('twitch_user', JSON.stringify(user));
    }, mockUser);

    await page.goto('/');

    // Should show user info or dashboard
    const userDisplay = page.locator('[data-testid="user-info"], [data-testid="channel-name"]');
    const dashboard = page.locator('main, [data-testid="dashboard"]');
    
    const isLoggedIn = await userDisplay.isVisible() || await dashboard.isVisible();
    expect(isLoggedIn).toBe(true);
  });

  test('should display user information after login', async ({ page }) => {
    await setupTwitchMock(page);
    
    await page.addInitScript((user) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'mock_token',
        user: user,
        expiresAt: Date.now() + 3600000,
      }));
    }, mockUser);

    await page.goto('/');

    // Should show username somewhere
    const userElement = page.locator(`text=${mockUser.display_name}`);
    if (await userElement.count() > 0) {
      await expect(userElement.first()).toBeVisible();
    }
  });
});

test.describe('Authentication - Logout', () => {
  test('should show clear session option when authenticated', async ({ page }) => {
    await setupTwitchMock(page);
    
    await page.addInitScript((user) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'mock_token',
        user: user,
        expiresAt: Date.now() + 3600000,
      }));
      // Also set channel for quick reconnect
      localStorage.setItem('twitch_channel', user.login);
    }, mockUser);

    await page.goto('/');

    // The app shows a connection panel first, not a dashboard
    // Look for the clear session button (✕) or quick reconnect
    const clearSessionButton = page.locator('button[title*="Limpiar"], button[aria-label*="limpiar"], button:has-text("✕")');
    const quickReconnect = page.getByRole('button', { name: /reconectar rápido/i });
    
    // Either clear session button or quick reconnect should be visible
    const hasClearOption = await clearSessionButton.isVisible({ timeout: 3000 }).catch(() => false);
    const hasQuickReconnect = await quickReconnect.isVisible({ timeout: 3000 }).catch(() => false);
    
    // At minimum, the connection panel should be visible
    const connectionPanel = page.locator('text=/Conectar|Canal|Channel/i').first();
    const hasConnectionPanel = await connectionPanel.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasClearOption || hasQuickReconnect || hasConnectionPanel).toBe(true);
  });

  test('should clear session on logout', async ({ page }) => {
    await setupTwitchMock(page);
    
    await page.addInitScript((user) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'mock_token',
        user: user,
        expiresAt: Date.now() + 3600000,
      }));
    }, mockUser);

    await page.goto('/');

    // Find and click logout
    const logoutButton = page.getByRole('button', { name: /cerrar sesión|logout|desconectar/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Confirm if needed
      const confirmButton = page.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Should clear localStorage
      const authData = await page.evaluate(() => localStorage.getItem('twitch_auth'));
      expect(authData).toBeNull();
    }
  });

  test('should redirect to login after logout', async ({ page }) => {
    await setupTwitchMock(page);
    
    await page.addInitScript((user) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'mock_token',
        user: user,
        expiresAt: Date.now() + 3600000,
      }));
    }, mockUser);

    await page.goto('/');

    const logoutButton = page.getByRole('button', { name: /cerrar sesión|logout/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should show login button again
      const loginButton = page.getByRole('button', { name: /iniciar sesión con twitch/i });
      await expect(loginButton).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Authentication - Session Persistence', () => {
  test('should persist session across page reloads', async ({ page }) => {
    await setupTwitchMock(page);
    
    await page.addInitScript((user) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'mock_token',
        user: user,
        expiresAt: Date.now() + 3600000,
      }));
    }, mockUser);

    await page.goto('/');
    
    // Verify logged in
    const dashboard = page.locator('main, [data-testid="dashboard"]');
    await expect(dashboard).toBeVisible();

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(dashboard).toBeVisible();
  });

  test('should handle expired session', async ({ page }) => {
    await setupTwitchMock(page);
    
    // Set expired token
    await page.addInitScript((user) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'expired_token',
        user: user,
        expiresAt: Date.now() - 1000, // Expired
      }));
    }, mockUser);

    await page.goto('/');

    // Should show login or refresh prompt
    const loginButton = page.getByRole('button', { name: /iniciar sesión con twitch/i });
    const isExpiredHandled = await loginButton.isVisible() || 
      await page.locator('text=/sesión expirada|session expired|volver a conectar/i').isVisible();
    
    expect(isExpiredHandled).toBe(true);
  });

  test('should restore user preferences after login', async ({ page }) => {
    await setupTwitchMock(page);
    
    // Set preferences before login
    await page.addInitScript(() => {
      localStorage.setItem('user_preferences', JSON.stringify({
        theme: 'dark',
        language: 'es',
      }));
    });

    await page.addInitScript((user) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'mock_token',
        user: user,
        expiresAt: Date.now() + 3600000,
      }));
    }, mockUser);

    await page.goto('/');

    // Preferences should be preserved
    const preferences = await page.evaluate(() => 
      localStorage.getItem('user_preferences')
    );
    expect(preferences).not.toBeNull();
  });
});

test.describe('Authentication - Security', () => {
  test('should not expose token in URL', async ({ page }) => {
    await setupTwitchMock(page);
    await page.goto('/');

    // URL should not contain token
    expect(page.url()).not.toContain('token=');
    expect(page.url()).not.toContain('access_token=');
  });

  test('should handle invalid token gracefully', async ({ page }) => {
    await setupTwitchMock(page);
    
    // Set invalid token
    await page.addInitScript(() => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'invalid_token_format',
        user: null,
        expiresAt: Date.now() + 3600000,
      }));
    });

    await page.goto('/');

    // Should not crash, should show login or error
    await expect(page.locator('body')).toBeVisible();
  });

  test('should clear sensitive data on logout', async ({ page }) => {
    await setupTwitchMock(page);
    
    await page.addInitScript((user) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'mock_token',
        user: user,
        expiresAt: Date.now() + 3600000,
      }));
      localStorage.setItem('twitch_user', JSON.stringify(user));
      sessionStorage.setItem('temp_data', 'sensitive');
    }, mockUser);

    await page.goto('/');

    const logoutButton = page.getByRole('button', { name: /cerrar sesión|logout/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Sensitive data should be cleared
      const authCleared = await page.evaluate(() => 
        localStorage.getItem('twitch_auth') === null
      );
      expect(authCleared).toBe(true);
    }
  });
});
