/**
 * Giveaway Page Object
 * Giveaway creation and management interactions
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { GiveawayData } from '../fixtures/data-factory';

export class GiveawayPage extends BasePage {
  // Form elements
  get titleInput(): Locator {
    return this.page.getByLabel(/título|title|nombre|name/i);
  }

  get keywordInput(): Locator {
    return this.page.getByLabel(/palabra clave|keyword/i);
  }

  get durationInput(): Locator {
    return this.page.getByLabel(/duración|duration/i);
  }

  get modeSelect(): Locator {
    return this.page.getByLabel(/modo|mode|tipo|type/i);
  }

  get requireFollowCheckbox(): Locator {
    return this.page.getByLabel(/seguidor|follower|follow/i);
  }

  get createButton(): Locator {
    return this.page.getByRole('button', { name: /crear|iniciar|start|create/i });
  }

  // Giveaway controls
  get drawButton(): Locator {
    return this.page.getByRole('button', { name: /sortear|draw|seleccionar/i });
  }

  get rerollButton(): Locator {
    return this.page.getByRole('button', { name: /re-roll|reroll|otro ganador/i });
  }

  get closeButton(): Locator {
    return this.page.getByRole('button', { name: /cerrar|close|finalizar/i });
  }

  // Giveaway display
  get activeGiveaway(): Locator {
    return this.page.locator('[data-testid="active-giveaway"]');
  }

  get participantCount(): Locator {
    return this.page.locator('[data-testid="participant-count"]');
  }

  get winnerDisplay(): Locator {
    return this.page.locator('[data-testid="giveaway-winner"]');
  }

  get participantList(): Locator {
    return this.page.locator('[data-testid="participant-list"]');
  }

  /**
   * Navigate to giveaways page
   */
  async goto(): Promise<void> {
    await super.goto('/');
    await this.page.getByRole('button', { name: /sorteos|giveaways/i }).click();
    await this.waitForPageLoad();
  }

  /**
   * Create a new giveaway
   */
  async createGiveaway(data: GiveawayData): Promise<void> {
    await this.titleInput.fill(data.title);

    if (data.keyword) {
      await this.keywordInput.fill(data.keyword);
    }

    if (data.duration) {
      await this.durationInput.fill(data.duration.toString());
    }

    if (data.mode) {
      await this.modeSelect.selectOption(data.mode);
    }

    if (data.requireFollow) {
      await this.requireFollowCheckbox.check();
    }

    await this.createButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Draw a winner
   */
  async drawWinner(): Promise<void> {
    await this.drawButton.click();
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
    await this.closeButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Check if giveaway is active
   */
  async isGiveawayActive(): Promise<boolean> {
    return this.activeGiveaway.isVisible();
  }

  /**
   * Get participant count
   */
  async getParticipantCount(): Promise<number> {
    const text = await this.participantCount.textContent();
    return parseInt(text?.replace(/[^0-9]/g, '') || '0', 10);
  }

  /**
   * Get winner name
   */
  async getWinner(): Promise<string | null> {
    if (await this.winnerDisplay.isVisible()) {
      return (await this.winnerDisplay.textContent()) || null;
    }
    return null;
  }

  /**
   * Verify giveaway was created
   */
  async verifyGiveawayCreated(title: string): Promise<void> {
    await expect(this.activeGiveaway).toBeVisible();
    await expect(this.activeGiveaway).toContainText(title);
  }

  /**
   * Verify winner was selected
   */
  async verifyWinnerSelected(): Promise<void> {
    await expect(this.winnerDisplay).toBeVisible();
    const winner = await this.getWinner();
    expect(winner).toBeTruthy();
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
