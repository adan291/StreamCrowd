/**
 * Login Page Object
 * Page object for authentication functionality
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get loginButton(): Locator {
    return this.page.getByRole('button', { name: /conectar|login|twitch|iniciar sesión/i });
  }

  get logoutButton(): Locator {
    return this.page.getByRole('button', { name: /cerrar sesión|logout|desconectar/i });
  }

  get userInfo(): Locator {
    return this.page.locator('[data-testid="user-info"], [data-testid="channel-name"]');
  }

  get settingsButton(): Locator {
    return this.page.getByRole('button', { name: /ajustes|settings|perfil|profile/i });
  }

  get userAvatar(): Locator {
    return this.page.locator('[data-testid="user-avatar"], img[alt*="avatar"]');
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return (await this.userInfo.isVisible()) || 
           (await this.logoutButton.isVisible()) ||
           (await this.page.locator('main, [data-testid="dashboard"]').isVisible());
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Perform logout
   */
  async logout(): Promise<void> {
    // Try to find logout button directly
    if (await this.logoutButton.isVisible()) {
      await this.logoutButton.click();
    } else if (await this.settingsButton.isVisible()) {
      // Open settings menu first
      await this.settingsButton.click();
      await this.logoutButton.click();
    }

    // Confirm if needed
    const confirmButton = this.page.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Set mock authentication in localStorage
   */
  async setMockAuth(user: {
    id: string;
    login: string;
    display_name: string;
    profile_image_url?: string;
  }): Promise<void> {
    await this.page.addInitScript((userData) => {
      localStorage.setItem('twitch_auth', JSON.stringify({
        token: 'mock_token',
        user: userData,
        expiresAt: Date.now() + 3600000,
      }));
      localStorage.setItem('twitch_user', JSON.stringify(userData));
    }, user);
  }

  /**
   * Clear authentication
   */
  async clearAuth(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('twitch_auth');
      localStorage.removeItem('twitch_user');
      sessionStorage.clear();
    });
  }

  /**
   * Get current user from localStorage
   */
  async getCurrentUser(): Promise<any> {
    return this.page.evaluate(() => {
      const auth = localStorage.getItem('twitch_auth');
      return auth ? JSON.parse(auth).user : null;
    });
  }

  /**
   * Check if auth token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    return this.page.evaluate(() => {
      const auth = localStorage.getItem('twitch_auth');
      if (!auth) return true;
      const { expiresAt } = JSON.parse(auth);
      return Date.now() > expiresAt;
    });
  }

  /**
   * Wait for login to complete
   */
  async waitForLogin(timeout: number = 10000): Promise<void> {
    await expect(this.userInfo).toBeVisible({ timeout });
  }

  /**
   * Wait for logout to complete
   */
  async waitForLogout(timeout: number = 5000): Promise<void> {
    await expect(this.loginButton).toBeVisible({ timeout });
  }

  /**
   * Get displayed username
   */
  async getDisplayedUsername(): Promise<string | null> {
    if (await this.userInfo.isVisible()) {
      return this.userInfo.textContent();
    }
    return null;
  }
}

export default LoginPage;
