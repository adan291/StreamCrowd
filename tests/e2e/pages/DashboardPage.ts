/**
 * Dashboard Page Object
 * Main dashboard/home page interactions
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Main Navigation (sidebar)
  get dynamicsNav(): Locator {
    return this.page.locator('[data-tour="nav-dynamics"]');
  }

  get gamesNav(): Locator {
    return this.page.locator('[data-tour="nav-games"]');
  }

  get platformsNav(): Locator {
    return this.page.locator('[data-tour="nav-platforms"]');
  }

  get obsNav(): Locator {
    return this.page.locator('[data-tour="nav-obs"]');
  }

  get dataNav(): Locator {
    return this.page.getByRole('button', { name: /data|datos|analytics/i });
  }

  get galleryNav(): Locator {
    return this.page.getByRole('button', { name: /gallery|galería/i });
  }

  // Legacy aliases for backward compatibility
  get pollsNav(): Locator {
    return this.dynamicsNav; // Polls are inside dynamics
  }

  get predictionsNav(): Locator {
    return this.platformsNav; // Predictions are inside platforms > twitch
  }

  get giveawaysNav(): Locator {
    return this.dynamicsNav; // Giveaways are inside dynamics
  }

  get timersNav(): Locator {
    return this.dynamicsNav; // Timers/countdown are inside dynamics
  }

  get macrosNav(): Locator {
    return this.platformsNav; // Macros might be in platforms
  }

  get settingsNav(): Locator {
    return this.page.getByRole('button', { name: /ajustes|settings|tools|herramientas/i });
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
   * Navigate to dashboard (only if not already there)
   * If already connected and on dashboard, this is a no-op
   */
  async goto(): Promise<void> {
    // Check if we're already on the dashboard (connected state)
    const isConnected = await this.isConnected();
    if (isConnected) {
      // Already on dashboard, no need to navigate
      return;
    }
    
    // Not connected, navigate to root
    await super.goto('/');
  }

  /**
   * Navigate to dynamics section (contains polls, giveaways, countdown, etc.)
   */
  async goToDynamics(): Promise<void> {
    await this.dynamicsNav.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to polls section (via dynamics > poll activity card)
   */
  async goToPolls(): Promise<void> {
    await this.goToDynamics();
    // Click on the poll activity card
    const pollCard = this.page.locator('[aria-label*="Encuesta"], [aria-label*="Poll"]').first();
    if (await pollCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pollCard.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Navigate to predictions section (via platforms > twitch)
   */
  async goToPredictions(): Promise<void> {
    await this.platformsNav.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to giveaways section (via dynamics > giveaway activity card)
   */
  async goToGiveaways(): Promise<void> {
    await this.goToDynamics();
    // Click on the giveaway activity card
    const giveawayCard = this.page.locator('[aria-label*="Sorteos"], [aria-label*="Giveaway"]').first();
    if (await giveawayCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await giveawayCard.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Navigate to timers section (via dynamics > countdown activity card)
   */
  async goToTimers(): Promise<void> {
    await this.goToDynamics();
    // Click on the countdown activity card
    const countdownCard = this.page.locator('[aria-label*="Countdown"], [aria-label*="Timer"]').first();
    if (await countdownCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await countdownCard.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Navigate to games section
   */
  async goToGames(): Promise<void> {
    await this.gamesNav.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to macros section (via platforms > twitch > macros)
   */
  async goToMacros(): Promise<void> {
    await this.platformsNav.click();
    await this.waitForPageLoad();
    
    // Click on Twitch platform card if visible
    const twitchCard = this.page.locator('[data-tour="platform-twitch"], text=/Twitch/i').first();
    if (await twitchCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await twitchCard.click();
      await this.waitForPageLoad();
    }
    
    // Click on Macros tool if visible
    const macrosTool = this.page.locator('[data-tour="tool-macros"], button:has-text("Macros")').first();
    if (await macrosTool.isVisible({ timeout: 3000 }).catch(() => false)) {
      await macrosTool.click();
      await this.waitForPageLoad();
    }
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
    // Check if we're on the dashboard (not login screen)
    const sidebar = this.page.locator('[data-tour="nav-dynamics"]');
    return await sidebar.isVisible({ timeout: 2000 }).catch(() => false);
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
    await expect(this.dynamicsNav).toBeVisible({ timeout: 10000 });
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
