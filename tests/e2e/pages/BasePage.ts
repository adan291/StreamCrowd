/**
 * Base Page Object
 * Common functionality for all page objects
 */

import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  // Common locators
  get loadingSpinner(): Locator {
    return this.page.locator('[data-testid="loading"], .animate-spin');
  }

  get toast(): Locator {
    return this.page.locator('[role="alert"], [data-testid="toast"]').first();
  }

  get modal(): Locator {
    return this.page.locator('[role="dialog"], [data-testid="modal"]');
  }

  get sidebar(): Locator {
    return this.page.locator('[data-testid="sidebar"], nav');
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Navigate to a URL
   */
  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Get toast message
   */
  async getToastMessage(): Promise<string> {
    await expect(this.toast).toBeVisible({ timeout: 5000 });
    return (await this.toast.textContent()) || '';
  }

  /**
   * Wait for toast and verify message
   */
  async expectToast(message: string | RegExp): Promise<void> {
    await expect(this.toast).toBeVisible({ timeout: 5000 });
    await expect(this.toast).toContainText(message);
  }

  /**
   * Close modal if open
   */
  async closeModal(): Promise<void> {
    if (await this.modal.isVisible()) {
      const closeButton = this.modal.getByRole('button', { name: /cerrar|close|×/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await this.page.keyboard.press('Escape');
      }
      await expect(this.modal).toBeHidden();
    }
  }

  /**
   * Click button by text
   */
  async clickButton(text: string | RegExp): Promise<void> {
    await this.page.getByRole('button', { name: text }).click();
  }

  /**
   * Fill input by label
   */
  async fillInput(label: string, value: string): Promise<void> {
    const input = this.page.getByLabel(label);
    await input.clear();
    await input.fill(value);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).selectOption(value);
  }

  /**
   * Take screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(locator: Locator, timeout: number = 5000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(locator: Locator, timeout: number = 5000): Promise<void> {
    await expect(locator).toBeHidden({ timeout });
  }

  /**
   * Get text content of element
   */
  async getText(locator: Locator): Promise<string> {
    return (await locator.textContent()) || '';
  }

  /**
   * Check accessibility of current page
   */
  async checkA11y(): Promise<void> {
    // Basic accessibility checks
    const images = this.page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Images should have alt text or be decorative
      if (role !== 'presentation' && role !== 'none') {
        expect(alt).toBeTruthy();
      }
    }

    // Check for proper heading hierarchy
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    // At least one heading should exist
    expect(headings.length).toBeGreaterThan(0);
  }
}

export default BasePage;
