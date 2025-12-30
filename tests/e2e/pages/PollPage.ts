/**
 * Poll Page Object
 * Poll creation and management interactions
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { PollData } from '../fixtures/data-factory';

export class PollPage extends BasePage {
  // Form elements
  get questionInput(): Locator {
    return this.page.getByLabel(/pregunta|question/i);
  }

  get optionInputs(): Locator {
    return this.page.locator('[data-testid="poll-option"], input[name*="option"]');
  }

  get addOptionButton(): Locator {
    return this.page.getByRole('button', { name: /añadir|agregar|add/i });
  }

  get durationInput(): Locator {
    return this.page.getByLabel(/duración|duration/i);
  }

  get createButton(): Locator {
    return this.page.getByRole('button', { name: /crear|iniciar|start|create/i });
  }

  get closeButton(): Locator {
    return this.page.getByRole('button', { name: /cerrar|close|finalizar/i });
  }

  get resetButton(): Locator {
    return this.page.getByRole('button', { name: /reiniciar|reset/i });
  }

  // Poll display
  get activePoll(): Locator {
    return this.page.locator('[data-testid="active-poll"]');
  }

  get pollResults(): Locator {
    return this.page.locator('[data-testid="poll-results"]');
  }

  get pollOptions(): Locator {
    return this.page.locator('[data-testid="poll-option-result"]');
  }

  get totalVotes(): Locator {
    return this.page.locator('[data-testid="total-votes"]');
  }

  get pollHistory(): Locator {
    return this.page.locator('[data-testid="poll-history"]');
  }

  /**
   * Navigate to polls page
   */
  async goto(): Promise<void> {
    await super.goto('/');
    await this.page.getByRole('button', { name: /encuestas|polls/i }).click();
    await this.waitForPageLoad();
  }

  /**
   * Create a new poll
   */
  async createPoll(data: PollData): Promise<void> {
    // Fill question
    await this.questionInput.fill(data.question);

    // Fill options
    const optionCount = await this.optionInputs.count();
    for (let i = 0; i < data.options.length; i++) {
      if (i >= optionCount) {
        await this.addOptionButton.click();
      }
      await this.optionInputs.nth(i).fill(data.options[i]);
    }

    // Set duration if provided
    if (data.duration) {
      await this.durationInput.fill(data.duration.toString());
    }

    // Submit
    await this.createButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Close active poll
   */
  async closePoll(): Promise<void> {
    await this.closeButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Reset poll
   */
  async resetPoll(): Promise<void> {
    await this.resetButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Check if poll is active
   */
  async isPollActive(): Promise<boolean> {
    return this.activePoll.isVisible();
  }

  /**
   * Get poll results
   */
  async getResults(): Promise<Array<{ option: string; votes: number; percentage: number }>> {
    const results: Array<{ option: string; votes: number; percentage: number }> = [];
    const options = await this.pollOptions.all();

    for (const option of options) {
      const text = await option.textContent() || '';
      const optionName = await option.locator('[data-testid="option-name"]').textContent() || '';
      const votesText = await option.locator('[data-testid="option-votes"]').textContent() || '0';
      const percentText = await option.locator('[data-testid="option-percent"]').textContent() || '0%';

      results.push({
        option: optionName || text.split(':')[0],
        votes: parseInt(votesText, 10),
        percentage: parseFloat(percentText),
      });
    }

    return results;
  }

  /**
   * Get total votes
   */
  async getTotalVotes(): Promise<number> {
    const text = await this.totalVotes.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Verify poll was created
   */
  async verifyPollCreated(question: string): Promise<void> {
    await expect(this.activePoll).toBeVisible();
    await expect(this.activePoll).toContainText(question);
  }

  /**
   * Verify poll was closed
   */
  async verifyPollClosed(): Promise<void> {
    await expect(this.activePoll).toBeHidden();
    await expect(this.pollResults).toBeVisible();
  }

  /**
   * Get poll history items
   */
  async getHistoryCount(): Promise<number> {
    return this.pollHistory.locator('[data-testid="history-item"]').count();
  }

  /**
   * Simulate vote (for testing with mocked chat)
   */
  async simulateVote(optionIndex: number): Promise<void> {
    // This would trigger a mock chat message
    await this.page.evaluate((index) => {
      window.dispatchEvent(new CustomEvent('mock-vote', { detail: { option: index } }));
    }, optionIndex);
  }
}

export default PollPage;
