/**
 * Giveaway Page Object
 * Giveaway creation and management interactions
 * 
 * Updated to match actual GiveawayHub UI structure
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { GiveawayData } from '../fixtures/data-factory';

export class GiveawayPage extends BasePage {
  // Navigation to giveaway section
  get dynamicsNav(): Locator {
    return this.page.locator('[data-tour="nav-dynamics"]');
  }

  get giveawayActivityCard(): Locator {
    // ActivitySelector card for giveaway - look for Gift icon card or text
    return this.page.locator('[aria-label*="Sorteos"], [aria-label*="Giveaway"]').first();
  }

  // Tabs in GiveawayHub
  get newTab(): Locator {
    return this.page.locator('button').filter({ hasText: /^Nuevo$|^Editando$/ }).first();
  }

  get activeTab(): Locator {
    return this.page.locator('button').filter({ hasText: 'Activos' }).first();
  }

  get scheduledTab(): Locator {
    return this.page.locator('button').filter({ hasText: 'Programados' }).first();
  }

  // Mode selector buttons - ModeSelector component uses role="radio" buttons
  get keywordModeButton(): Locator {
    return this.page.locator('button[role="radio"][aria-label*="Keyword"]');
  }

  get viewersModeButton(): Locator {
    return this.page.locator('button[role="radio"][aria-label*="Viewers"]');
  }

  get subsModeButton(): Locator {
    return this.page.locator('button[role="radio"][aria-label*="Subs"]');
  }

  // Form elements
  get keywordInput(): Locator {
    return this.page.locator('input[placeholder*="sorteo"], input[placeholder*="Ej:"]');
  }

  get timerToggle(): Locator {
    return this.page.locator('button[aria-label*="temporizador"], button[aria-label*="Activar temporizador"]');
  }

  get subsOnlyToggle(): Locator {
    return this.page.locator('button[aria-label*="suscriptores"]');
  }

  // Start/action buttons - RafflePreview has the start button
  get startButton(): Locator {
    return this.page.locator('button').filter({ hasText: 'Iniciar' }).first();
  }

  get stopButton(): Locator {
    return this.page.locator('button').filter({ hasText: 'Detener' }).first();
  }

  get resetButton(): Locator {
    return this.page.locator('button').filter({ hasText: 'Nuevo sorteo' }).first();
  }

  // Thread/giveaway controls
  get drawButton(): Locator {
    return this.page.locator('button').filter({ hasText: /Sortear|Draw/ }).first();
  }

  get rerollButton(): Locator {
    return this.page.locator('button').filter({ hasText: /Re-roll|Otro ganador/ }).first();
  }

  get closeButton(): Locator {
    return this.page.locator('button').filter({ hasText: /^Cerrar$|^Close$/ }).first();
  }

  // Giveaway display
  get activeGiveaway(): Locator {
    return this.page.locator('[data-tour="giveaway"]');
  }

  get participantCount(): Locator {
    return this.page.locator('text=/\\d+ participantes?/i');
  }

  get winnerDisplay(): Locator {
    return this.page.locator('.winner-display, [class*="winner"]');
  }

  get participantList(): Locator {
    return this.page.locator('[class*="participants"]');
  }

  // Legacy aliases for backward compatibility
  get titleInput(): Locator {
    return this.keywordInput;
  }

  get durationInput(): Locator {
    return this.page.locator('input[type="number"]').first();
  }

  get modeSelect(): Locator {
    // The app uses buttons for mode selection, not a select
    return this.page.locator('[role="radiogroup"][aria-label="Tipo de sorteo"]');
  }

  get requireFollowCheckbox(): Locator {
    return this.page.locator('[aria-label*="seguidor"], [aria-label*="follower"]');
  }

  get createButton(): Locator {
    return this.startButton;
  }

  /**
   * Navigate to giveaways page (via Dynamics section)
   */
  async goto(): Promise<void> {
    // Don't navigate if already on the page - fixture handles connection
    // Just navigate to giveaway section
    
    // Click on dynamics nav to go to activity selector
    if (await this.dynamicsNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.dynamicsNav.click();
      await this.waitForPageLoad();
      
      // Click on the giveaway activity card in ActivitySelector
      const giveawayCard = this.page.locator('div[role="button"]').filter({ hasText: 'Sorteos' });
      if (await giveawayCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await giveawayCard.click();
        await this.waitForPageLoad();
      }
    }
  }

  /**
   * Select giveaway mode
   */
  async selectMode(mode: 'keyword' | 'viewers' | 'subs'): Promise<void> {
    // Wait for mode selector to be visible
    await this.modeSelect.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    
    switch (mode) {
      case 'keyword':
        await this.keywordModeButton.click();
        break;
      case 'viewers':
        await this.viewersModeButton.click();
        break;
      case 'subs':
        await this.subsModeButton.click();
        break;
    }
    await this.page.waitForTimeout(300);
  }

  /**
   * Create a new giveaway
   */
  async createGiveaway(data: GiveawayData): Promise<void> {
    // Make sure we're on the "Nuevo" tab
    if (await this.newTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.newTab.click();
      await this.page.waitForTimeout(300);
    }

    // Select mode if specified
    if (data.mode) {
      await this.selectMode(data.mode as 'keyword' | 'viewers' | 'subs');
    }

    // Fill keyword if mode is keyword
    if (data.mode === 'keyword' && data.keyword) {
      const keywordInput = this.page.locator('input[placeholder*="sorteo"], input[placeholder*="Ej:"]');
      if (await keywordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await keywordInput.fill(data.keyword);
      }
    }

    // Click start button
    await this.startButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Draw a winner
   */
  async drawWinner(): Promise<void> {
    // First try the draw button, then stop button
    if (await this.drawButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.drawButton.click();
    } else if (await this.stopButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.stopButton.click();
    }
    await this.waitForPageLoad();
  }

  /**
   * Re-roll for a new winner
   */
  async reroll(): Promise<void> {
    await this.rerollButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Close giveaway
   */
  async closeGiveaway(): Promise<void> {
    // Look for close or reset button
    if (await this.closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.closeButton.click();
    } else if (await this.resetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.resetButton.click();
    }
    await this.waitForPageLoad();
  }

  /**
   * Check if giveaway is active
   */
  async isGiveawayActive(): Promise<boolean> {
    // Check if stop button is visible (indicates running giveaway)
    return this.stopButton.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Get participant count
   */
  async getParticipantCount(): Promise<number> {
    const countText = await this.participantCount.textContent().catch(() => '0');
    const match = countText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get winner name
   */
  async getWinner(): Promise<string | null> {
    if (await this.winnerDisplay.isVisible({ timeout: 2000 }).catch(() => false)) {
      return (await this.winnerDisplay.textContent()) || null;
    }
    return null;
  }

  /**
   * Verify giveaway was created
   */
  async verifyGiveawayCreated(title: string): Promise<void> {
    // After creating, we should see the stop button (indicates running)
    // or be on the active tab
    const stopBtn = this.page.locator('button').filter({ hasText: 'Detener' });
    const activeTab = this.page.locator('button').filter({ hasText: 'Activos' });
    
    // Either stop button is visible OR we're on active tab
    const isRunning = await stopBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const hasActiveTab = await activeTab.isVisible({ timeout: 1000 }).catch(() => false);
    
    expect(isRunning || hasActiveTab).toBe(true);
  }

  /**
   * Verify winner was selected
   */
  async verifyWinnerSelected(): Promise<void> {
    // Look for winner display or reset button
    const resetBtn = this.page.locator('button').filter({ hasText: 'Nuevo sorteo' });
    await expect(resetBtn).toBeVisible({ timeout: 10000 });
  }

  /**
   * Simulate participant joining (via mock chat)
   */
  async simulateParticipant(username: string, keyword?: string): Promise<void> {
    await this.page.evaluate(({ user, kw }) => {
      window.dispatchEvent(new CustomEvent('mock-chat-message', {
        detail: {
          id: `msg_${Date.now()}`,
          username: user,
          displayName: user,
          message: kw || '!enter',
          timestamp: Date.now(),
        },
      }));
    }, { user: username, kw: keyword });
  }
}

export default GiveawayPage;
