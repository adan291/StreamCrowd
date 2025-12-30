/**
 * Prediction Page Object
 * Prediction creation and management interactions
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { PredictionData } from '../fixtures/data-factory';

export class PredictionPage extends BasePage {
  // Form elements
  get titleInput(): Locator {
    return this.page.getByLabel(/título|title/i);
  }

  get outcomeInputs(): Locator {
    return this.page.locator('[data-testid="prediction-outcome"], input[name*="outcome"]');
  }

  get addOutcomeButton(): Locator {
    return this.page.getByRole('button', { name: /añadir|agregar|add/i });
  }

  get durationInput(): Locator {
    return this.page.getByLabel(/duración|duration/i);
  }

  get createButton(): Locator {
    return this.page.getByRole('button', { name: /crear|iniciar|start|create/i });
  }

  // Prediction controls
  get lockButton(): Locator {
    return this.page.getByRole('button', { name: /bloquear|lock/i });
  }

  get resolveButton(): Locator {
    return this.page.getByRole('button', { name: /resolver|resolve/i });
  }

  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: /cancelar|cancel/i });
  }

  // Prediction display
  get activePrediction(): Locator {
    return this.page.locator('[data-testid="active-prediction"]');
  }

  get predictionOutcomes(): Locator {
    return this.page.locator('[data-testid="prediction-outcome-display"]');
  }

  get totalPoints(): Locator {
    return this.page.locator('[data-testid="total-points"]');
  }

  get predictionStatus(): Locator {
    return this.page.locator('[data-testid="prediction-status"]');
  }

  /**
   * Navigate to predictions page
   */
  async goto(): Promise<void> {
    await super.goto('/');
    await this.page.getByRole('button', { name: /predicciones|predictions/i }).click();
    await this.waitForPageLoad();
  }

  /**
   * Create a new prediction
   */
  async createPrediction(data: PredictionData): Promise<void> {
    await this.titleInput.fill(data.title);

    const outcomeCount = await this.outcomeInputs.count();
    for (let i = 0; i < data.outcomes.length; i++) {
      if (i >= outcomeCount) {
        await this.addOutcomeButton.click();
      }
      await this.outcomeInputs.nth(i).fill(data.outcomes[i]);
    }

    if (data.duration) {
      await this.durationInput.fill(data.duration.toString());
    }

    await this.createButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Lock prediction (stop accepting bets)
   */
  async lockPrediction(): Promise<void> {
    await this.lockButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Resolve prediction with winning outcome
   */
  async resolvePrediction(outcomeIndex: number): Promise<void> {
    await this.resolveButton.click();
    
    // Select winning outcome in modal
    const outcomeButtons = this.page.locator('[data-testid="resolve-outcome-option"]');
    await outcomeButtons.nth(outcomeIndex).click();
    
    // Confirm
    await this.page.getByRole('button', { name: /confirmar|confirm/i }).click();
    await this.waitForPageLoad();
  }

  /**
   * Cancel prediction (refund all bets)
   */
  async cancelPrediction(): Promise<void> {
    await this.cancelButton.click();
    
    // Confirm cancellation
    const confirmButton = this.page.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await this.waitForPageLoad();
  }

  /**
   * Check if prediction is active
   */
  async isPredictionActive(): Promise<boolean> {
    return this.activePrediction.isVisible();
  }

  /**
   * Get prediction status
   */
  async getStatus(): Promise<string> {
    return (await this.predictionStatus.textContent()) || '';
  }

  /**
   * Get total points bet
   */
  async getTotalPoints(): Promise<number> {
    const text = await this.totalPoints.textContent();
    return parseInt(text?.replace(/[^0-9]/g, '') || '0', 10);
  }

  /**
   * Get outcome data
   */
  async getOutcomes(): Promise<Array<{ title: string; points: number; users: number }>> {
    const outcomes: Array<{ title: string; points: number; users: number }> = [];
    const elements = await this.predictionOutcomes.all();

    for (const el of elements) {
      const title = await el.locator('[data-testid="outcome-title"]').textContent() || '';
      const pointsText = await el.locator('[data-testid="outcome-points"]').textContent() || '0';
      const usersText = await el.locator('[data-testid="outcome-users"]').textContent() || '0';

      outcomes.push({
        title,
        points: parseInt(pointsText.replace(/[^0-9]/g, ''), 10),
        users: parseInt(usersText.replace(/[^0-9]/g, ''), 10),
      });
    }

    return outcomes;
  }

  /**
   * Verify prediction was created
   */
  async verifyPredictionCreated(title: string): Promise<void> {
    await expect(this.activePrediction).toBeVisible();
    await expect(this.activePrediction).toContainText(title);
  }

  /**
   * Verify prediction is locked
   */
  async verifyPredictionLocked(): Promise<void> {
    await expect(this.predictionStatus).toContainText(/bloqueada|locked/i);
    await expect(this.lockButton).toBeHidden();
    await expect(this.resolveButton).toBeVisible();
  }

  /**
   * Verify prediction is resolved
   */
  async verifyPredictionResolved(): Promise<void> {
    await expect(this.predictionStatus).toContainText(/resuelta|resolved/i);
  }

  /**
   * Verify prediction is cancelled
   */
  async verifyPredictionCancelled(): Promise<void> {
    await expect(this.predictionStatus).toContainText(/cancelada|cancelled/i);
  }
}

export default PredictionPage;
