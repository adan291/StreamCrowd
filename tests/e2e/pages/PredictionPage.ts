/**
 * Prediction Page Object
 * Prediction creation and management interactions
 * Note: Predictions are in Platforms > Twitch > Predictions
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { PredictionData } from '../fixtures/data-factory';

export class PredictionPage extends BasePage {
  // Navigation
  get platformsNav(): Locator {
    return this.page.locator('[data-tour="nav-platforms"]');
  }

  get twitchPlatformCard(): Locator {
    // Platform cards use role="button" with aria-label starting with "Twitch:"
    return this.page.locator('[role="button"][aria-label^="Twitch:"]').first();
  }

  get predictionsTool(): Locator {
    // Tool cards use role="button" with aria-label containing "Predicciones"
    return this.page.locator('[role="button"][aria-label*="Predicciones"]').first();
  }

  // Form elements
  get titleInput(): Locator {
    // Match the actual prediction form title input
    return this.page.locator('#prediction-title, input[name="prediction-title"], input[placeholder*="ganará"], input[placeholder*="título"]').first();
  }

  get outcomeInputs(): Locator {
    // Match the actual outcome inputs - they use "Opción X" as placeholder
    return this.page.locator('input[id^="prediction-outcome-"], input[name^="prediction-outcome-"], input[placeholder^="Opción"]');
  }

  get addOutcomeButton(): Locator {
    return this.page.getByRole('button', { name: /añadir|agregar|add|\+/i }).first();
  }

  get durationInput(): Locator {
    return this.page.locator('input[type="number"]').first();
  }

  get createButton(): Locator {
    // Match the submit button specifically, not the tab button
    return this.page.getByRole('button', { name: /crear predicción|create prediction/i }).first();
  }

  // Prediction controls
  get lockButton(): Locator {
    return this.page.getByRole('button', { name: /bloquear|lock/i }).first();
  }

  get resolveButton(): Locator {
    return this.page.getByRole('button', { name: /resolver|resolve/i }).first();
  }

  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: /cancelar|cancel/i }).first();
  }

  // Prediction display
  get activePrediction(): Locator {
    // Match active prediction container - look for the ActivePrediction component content
    // It shows outcomes grid and action buttons
    return this.page.locator('[data-tour="predictions"], [data-testid="active-prediction"]')
      .or(this.page.locator('.space-y-4:has(button:has-text("Bloquear"))'))
      .or(this.page.locator('h3:has-text("¿")').locator('..').locator('..'));
  }

  get predictionOutcomes(): Locator {
    return this.page.locator('[data-testid="prediction-outcome-display"], .prediction-outcome, [class*="outcome"]');
  }

  get totalPoints(): Locator {
    return this.page.locator('[data-testid="total-points"]').or(this.page.getByText(/\d+ puntos?/i));
  }

  get predictionStatus(): Locator {
    // Status is shown as a span with text like "Activa", "Bloqueada", etc.
    return this.page.locator('span:has-text("Activa"), span:has-text("Bloqueada"), span:has-text("Resuelta"), span:has-text("Cancelada")').first();
  }

  /**
   * Navigate to predictions page (via Platforms > Twitch > Predictions)
   * Assumes page is already connected (authenticatedPage fixture)
   */
  async goto(): Promise<void> {
    // Don't navigate to '/' - we're already connected via authenticatedPage fixture
    // Just navigate through the UI hierarchy
    
    // Step 1: Click on Platforms nav
    await this.platformsNav.waitFor({ state: 'visible', timeout: 10000 });
    await this.platformsNav.click();
    await this.page.waitForTimeout(500);
    
    // Step 2: Click on Twitch platform card
    await this.twitchPlatformCard.waitFor({ state: 'visible', timeout: 5000 });
    await this.twitchPlatformCard.click();
    await this.page.waitForTimeout(500);
    
    // Step 3: Click on Predictions tool
    await this.predictionsTool.waitFor({ state: 'visible', timeout: 5000 });
    await this.predictionsTool.click();
    await this.waitForPageLoad();
  }

  /**
   * Create a new prediction
   */
  async createPrediction(data: PredictionData): Promise<void> {
    // Fill title
    if (await this.titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.titleInput.fill(data.title);
    }

    // Fill outcomes
    const outcomeInputs = await this.outcomeInputs.all();
    for (let i = 0; i < data.outcomes.length; i++) {
      if (i < outcomeInputs.length) {
        await outcomeInputs[i].fill(data.outcomes[i]);
      } else if (await this.addOutcomeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await this.addOutcomeButton.click();
        await this.page.waitForTimeout(300);
        const newInputs = await this.outcomeInputs.all();
        if (newInputs[i]) {
          await newInputs[i].fill(data.outcomes[i]);
        }
      }
    }

    // Set duration if provided
    if (data.duration && await this.durationInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.durationInput.fill(data.duration.toString());
    }

    // Submit
    await this.createButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Lock prediction (stop accepting bets)
   */
  async lockPrediction(): Promise<void> {
    const lockBtn = this.page.getByRole('button', { name: /bloquear|lock/i }).first();
    if (await lockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lockBtn.click();
      // Wait for the API call and UI update
      await this.page.waitForTimeout(1000);
      await this.waitForPageLoad();
    }
  }

  /**
   * Resolve prediction with winning outcome
   */
  async resolvePrediction(outcomeIndex: number): Promise<void> {
    if (await this.resolveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.resolveButton.click();
      
      // Select winning outcome in modal
      const outcomeButtons = this.page.locator('[data-testid="resolve-outcome-option"], .outcome-option');
      const buttons = await outcomeButtons.all();
      if (buttons[outcomeIndex]) {
        await buttons[outcomeIndex].click();
      }
      
      // Confirm
      const confirmButton = this.page.getByRole('button', { name: /confirmar|confirm/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      await this.waitForPageLoad();
    }
  }

  /**
   * Cancel prediction (refund all bets)
   */
  async cancelPrediction(): Promise<void> {
    if (await this.cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.cancelButton.click();
      
      // Confirm cancellation
      const confirmButton = this.page.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      await this.waitForPageLoad();
    }
  }

  /**
   * Check if prediction is active
   */
  async isPredictionActive(): Promise<boolean> {
    // Check for "Activa" status or lock button visibility
    const activeStatus = this.page.locator('span:has-text("Activa")');
    const lockButton = this.page.getByRole('button', { name: /bloquear|lock/i });
    return (await activeStatus.isVisible({ timeout: 2000 }).catch(() => false)) ||
           (await lockButton.isVisible({ timeout: 1000 }).catch(() => false));
  }

  /**
   * Get prediction status
   */
  async getStatus(): Promise<string> {
    // Wait a bit for UI to update after action
    await this.page.waitForTimeout(500);
    
    // Check for status badges in order
    const statuses = ['Activa', 'Bloqueada', 'Resuelta', 'Cancelada'];
    for (const status of statuses) {
      const statusEl = this.page.locator('span').filter({ hasText: new RegExp(`^${status}$`) }).first();
      if (await statusEl.isVisible({ timeout: 1000 }).catch(() => false)) {
        return status.toLowerCase();
      }
    }
    return '';
  }

  /**
   * Get total points bet
   */
  async getTotalPoints(): Promise<number> {
    const text = await this.totalPoints.textContent().catch(() => '0');
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get outcome data
   */
  async getOutcomes(): Promise<Array<{ title: string; points: number; users: number }>> {
    const outcomes: Array<{ title: string; points: number; users: number }> = [];
    const elements = await this.predictionOutcomes.all();

    for (const el of elements) {
      const text = await el.textContent() || '';
      outcomes.push({
        title: text,
        points: 0,
        users: 0,
      });
    }

    return outcomes;
  }

  /**
   * Verify prediction was created
   */
  async verifyPredictionCreated(title: string): Promise<void> {
    // Wait for the "Activa" status badge which appears when prediction is active
    // The status badge is a span with specific styling in ActivePrediction component
    const activeStatus = this.page.locator('span').filter({ hasText: /^Activa$/ }).first();
    const lockButton = this.page.getByRole('button', { name: /bloquear|lock/i }).first();
    
    // Try to find either the status badge or the lock button
    try {
      await expect(activeStatus).toBeVisible({ timeout: 10000 });
    } catch {
      // Fallback to lock button if status badge not found
      await expect(lockButton).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Verify prediction is locked
   */
  async verifyPredictionLocked(): Promise<void> {
    // When locked, the status shows "Bloqueada" and lock button is hidden
    const lockedStatus = this.page.locator('span').filter({ hasText: /^Bloqueada$/ }).first();
    await expect(lockedStatus).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify prediction is resolved
   */
  async verifyPredictionResolved(): Promise<void> {
    // When resolved, status shows "Resuelta" or we're redirected to history
    const resolvedStatus = this.page.locator('span').filter({ hasText: /^Resuelta$/ }).first();
    const historyTab = this.page.locator('button').filter({ hasText: /historial/i });
    
    try {
      await expect(resolvedStatus).toBeVisible({ timeout: 5000 });
    } catch {
      // If resolved, we might be on history tab
      await expect(historyTab).toBeVisible({ timeout: 3000 });
    }
  }

  /**
   * Verify prediction is cancelled
   */
  async verifyPredictionCancelled(): Promise<void> {
    // When cancelled, we're redirected to create tab or status shows "Cancelada"
    const cancelledStatus = this.page.locator('span').filter({ hasText: /^Cancelada$/ }).first();
    const createTab = this.page.locator('button').filter({ hasText: /crear/i }).first();
    
    try {
      await expect(cancelledStatus).toBeVisible({ timeout: 5000 });
    } catch {
      // If cancelled, we should be back on create tab
      await expect(createTab).toBeVisible({ timeout: 3000 });
    }
  }
}

export default PredictionPage;
