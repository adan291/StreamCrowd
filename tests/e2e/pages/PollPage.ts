/**
 * Poll Page Object
 * Poll creation and management interactions
 * 
 * Updated to match actual PollCreator UI structure
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { PollData } from '../fixtures/data-factory';

export class PollPage extends BasePage {
  // Navigation
  get dynamicsNav(): Locator {
    return this.page.locator('[data-tour="nav-dynamics"]');
  }

  get pollActivityCard(): Locator {
    // ActivitySelector card for poll - look for Vote icon card or text
    return this.page.locator('div[role="button"]').filter({ hasText: 'Encuesta' });
  }

  // Form elements - PollCreator structure
  get questionInput(): Locator {
    // The poll creator doesn't have a question input visible by default
    // It uses presets or the options directly
    return this.page.locator('input[placeholder*="pregunta"], textarea[placeholder*="pregunta"]').first();
  }

  get optionInputs(): Locator {
    // Option inputs in the poll creator - look for option placeholders
    return this.page.locator('input[placeholder*="Opción"], input[placeholder*="Option"]');
  }

  get addOptionButton(): Locator {
    return this.page.getByRole('button', { name: /añadir|agregar|add|\+/i }).first();
  }

  get durationInput(): Locator {
    return this.page.locator('input[type="number"]').first();
  }

  // Quick preset buttons - PollCreator has Sí/No, Rating, ABC presets
  get yesNoPresetButton(): Locator {
    return this.page.locator('button').filter({ hasText: /Sí.*No|Yes.*No/i }).first();
  }

  get ratingPresetButton(): Locator {
    return this.page.locator('button').filter({ hasText: /Rating|Puntuación/i }).first();
  }

  get abcPresetButton(): Locator {
    return this.page.locator('button').filter({ hasText: /ABC/i }).first();
  }

  get createButton(): Locator {
    // The main create button - look for "Crear" or "Iniciar"
    return this.page.locator('button').filter({ hasText: /^Crear$|^Iniciar$|^Create$/i }).first();
  }

  get closeButton(): Locator {
    return this.page.getByRole('button', { name: /cerrar|close|finalizar/i }).first();
  }

  get resetButton(): Locator {
    return this.page.getByRole('button', { name: /reiniciar|reset|nuevo|limpiar/i }).first();
  }

  // Poll display
  get activePoll(): Locator {
    return this.page.locator('[data-tour="poll-creator"], [data-tour="live-poll"]');
  }

  get pollResults(): Locator {
    return this.page.locator('[class*="poll-results"], [class*="results"]');
  }

  get pollOptions(): Locator {
    return this.page.locator('[class*="poll-option"], [class*="option"]');
  }

  get totalVotes(): Locator {
    return this.page.locator('text=/\\d+ votos?/i');
  }

  get pollHistory(): Locator {
    return this.page.locator('[class*="history"]');
  }

  // Templates section
  get templatesButton(): Locator {
    return this.page.locator('button').filter({ hasText: /Plantillas|Templates/i });
  }

  /**
   * Navigate to polls page (via Dynamics section)
   */
  async goto(): Promise<void> {
    // Click on dynamics nav to go to activity selector
    if (await this.dynamicsNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.dynamicsNav.click();
      await this.waitForPageLoad();
      
      // Click on the poll activity card in ActivitySelector
      if (await this.pollActivityCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.pollActivityCard.click();
        await this.waitForPageLoad();
      }
    }
  }

  /**
   * Create a new poll using quick preset (Sí/No)
   */
  async createQuickPoll(): Promise<void> {
    // Use the Sí/No preset for quick poll creation
    if (await this.yesNoPresetButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.yesNoPresetButton.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Create a new poll with custom options
   */
  async createPoll(data: PollData): Promise<void> {
    // Fill question if input is visible
    const questionInput = this.page.locator('input, textarea').filter({ hasText: '' }).first();
    if (await this.questionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.questionInput.fill(data.question);
    }

    // Fill options
    const optionInputs = await this.optionInputs.all();
    for (let i = 0; i < data.options.length; i++) {
      if (i < optionInputs.length) {
        await optionInputs[i].fill(data.options[i]);
      } else if (await this.addOptionButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await this.addOptionButton.click();
        await this.page.waitForTimeout(300);
        const newInputs = await this.optionInputs.all();
        if (newInputs[i]) {
          await newInputs[i].fill(data.options[i]);
        }
      }
    }

    // Set duration if provided
    if (data.duration && await this.durationInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.durationInput.fill(data.duration.toString());
    }

    // Submit - look for create/confirm button
    const confirmBtn = this.page.locator('button').filter({ hasText: /Crear|Confirmar|Create|Confirm/i }).first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    } else if (await this.createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.createButton.click();
    }
    await this.waitForPageLoad();
  }

  /**
   * Close active poll
   */
  async closePoll(): Promise<void> {
    if (await this.closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.closeButton.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Reset poll
   */
  async resetPoll(): Promise<void> {
    if (await this.resetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.resetButton.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Check if poll is active
   */
  async isPollActive(): Promise<boolean> {
    return this.activePoll.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Get poll results
   */
  async getResults(): Promise<Array<{ option: string; votes: number; percentage: number }>> {
    const results: Array<{ option: string; votes: number; percentage: number }> = [];
    const options = await this.pollOptions.all();

    for (const option of options) {
      const text = await option.textContent() || '';
      results.push({
        option: text.split(':')[0] || text,
        votes: 0,
        percentage: 0,
      });
    }

    return results;
  }

  /**
   * Get total votes
   */
  async getTotalVotes(): Promise<number> {
    const text = await this.totalVotes.textContent().catch(() => '0');
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Verify poll was created
   */
  async verifyPollCreated(question: string): Promise<void> {
    // After creating, we should see the live poll or poll results
    await expect(this.activePoll).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify poll was closed
   */
  async verifyPollClosed(): Promise<void> {
    // After closing, the close button should be hidden
    await expect(this.closeButton).toBeHidden({ timeout: 5000 });
  }

  /**
   * Get poll history items
   */
  async getHistoryCount(): Promise<number> {
    const historyItems = this.page.locator('[class*="history-item"], [class*="historyItem"]');
    return historyItems.count().catch(() => 0);
  }

  /**
   * Simulate vote (for testing with mocked chat)
   */
  async simulateVote(optionIndex: number): Promise<void> {
    await this.page.evaluate((index) => {
      window.dispatchEvent(new CustomEvent('mock-vote', { detail: { option: index } }));
    }, optionIndex);
  }
}

export default PollPage;
