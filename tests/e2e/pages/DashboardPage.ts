/**
 * Dashboard Page Object
 * Main dashboard/home page interactions
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Navigation
  get pollsNav(): Locator {
    return this.page.getByRole('button', { name: /encuestas|polls/i });
  }

  get predictionsNav(): Locator {
    return this.page.getByRole('button', { name: /predicciones|predictions/i });
  }

  get giveawaysNav(): Locator {
    return this.page.getByRole('button', { name: /sorteos|giveaways/i });
  }

  get timersNav(): Locator {
    return this.page.getByRole('button', { name: /timers|temporizadores/i });
  }

  get macrosNav(): Locator {
    return this.page.getByRole('button', { name: /macros/i });
  }

  get settingsNav(): Locator {
    return this.page.getByRole('button', { name: /ajustes|settings/i });
  }

  // Status indicators
  get connectionStatus(): Locator {
    return this.page.locator('[data-testid="connection-status"]');
  }

  get viewerCount(): Locator {
    return this.page.locator('[data-testid="viewer-count"]');
  }

  get channelName(): Locator {
    return this.page.locator('[data-testid="channel-name"]');
  }

  // Quick actions
  get quickPollButton(): Locator {
    return this.page.getByRole('button', { name: /poll rápido|quick poll/i });
  }

  get quickTimerButton(): Locator {
    return this.page.getByRole('button', { name: /timer rápido|quick timer/i });
  }

  /**
   * Navigate to dashboard
   */
  async goto(): Promise<void> {
    await super.goto('/');
  }

  /**
   * Navigate to polls section
   */
  async goToPolls(): Promise<void> {
    await this.pollsNav.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to predictions section
   */
  async goToPredictions(): Promise<void> {
    await this.predictionsNav.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to giveaways section
   */
  async goToGiveaways(): Promise<void> {
    await this.giveawaysNav.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to timers section
   */
  async goToTimers(): Promise<void> {
    await this.timersNav.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to macros section
   */
  async goToMacros(): Promise<void> {
    await this.macrosNav.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to settings
   */
  async goToSettings(): Promise<void> {
    await this.settingsNav.click();
    await this.waitForPageLoad();
  }

  /**
   * Check if connected to Twitch
   */
  async isConnected(): Promise<boolean> {
    const status = await this.connectionStatus.getAttribute('data-status');
    return status === 'connected';
  }

  /**
   * Get current viewer count
   */
  async getViewerCount(): Promise<number> {
    const text = await this.viewerCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Verify dashboard is loaded
   */
  async verifyLoaded(): Promise<void> {
    await expect(this.sidebar).toBeVisible();
    await expect(this.pollsNav).toBeVisible();
  }

  /**
   * Create quick poll from dashboard
   */
  async createQuickPoll(): Promise<void> {
    await this.quickPollButton.click();
    await expect(this.modal).toBeVisible();
  }

  /**
   * Create quick timer from dashboard
   */
  async createQuickTimer(): Promise<void> {
    await this.quickTimerButton.click();
    await expect(this.modal).toBeVisible();
  }
}

export default DashboardPage;
