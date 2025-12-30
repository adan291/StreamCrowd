/**
 * Timer Page Object
 * Timer creation and management interactions
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TimerData } from '../fixtures/data-factory';

export class TimerPage extends BasePage {
  // Form elements
  get nameInput(): Locator {
    return this.page.getByLabel(/nombre|name/i);
  }

  get durationInput(): Locator {
    return this.page.getByLabel(/duración|duration|tiempo/i);
  }

  get minutesInput(): Locator {
    return this.page.getByLabel(/minutos|minutes/i);
  }

  get secondsInput(): Locator {
    return this.page.getByLabel(/segundos|seconds/i);
  }

  get createButton(): Locator {
    return this.page.getByRole('button', { name: /crear|create|añadir|add/i });
  }

  // Timer controls
  get startButton(): Locator {
    return this.page.getByRole('button', { name: /iniciar|start|play/i });
  }

  get pauseButton(): Locator {
    return this.page.getByRole('button', { name: /pausar|pause/i });
  }

  get resumeButton(): Locator {
    return this.page.getByRole('button', { name: /reanudar|resume|continuar/i });
  }

  get resetButton(): Locator {
    return this.page.getByRole('button', { name: /reiniciar|reset/i });
  }

  get deleteButton(): Locator {
    return this.page.getByRole('button', { name: /eliminar|delete|borrar/i });
  }

  // Timer display
  get activeTimers(): Locator {
    return this.page.locator('[data-testid="timer-card"], [data-testid="active-timer"]');
  }

  get timerDisplay(): Locator {
    return this.page.locator('[data-testid="timer-display"]');
  }

  get timerProgress(): Locator {
    return this.page.locator('[data-testid="timer-progress"]');
  }

  /**
   * Navigate to timers page
   */
  async goto(): Promise<void> {
    await super.goto('/');
    await this.page.getByRole('button', { name: /timers|temporizadores/i }).click();
    await this.waitForPageLoad();
  }

  /**
   * Create a new timer
   */
  async createTimer(data: TimerData): Promise<void> {
    // Fill name
    await this.nameInput.fill(data.name);

    // Fill duration
    if (await this.minutesInput.isVisible()) {
      const minutes = Math.floor(data.duration / 60);
      const seconds = data.duration % 60;
      await this.minutesInput.fill(minutes.toString());
      await this.secondsInput.fill(seconds.toString());
    } else {
      await this.durationInput.fill(data.duration.toString());
    }

    // Submit
    await this.createButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Start timer
   */
  async startTimer(index: number = 0): Promise<void> {
    const timer = this.activeTimers.nth(index);
    await timer.locator(this.startButton).click();
  }

  /**
   * Pause timer
   */
  async pauseTimer(index: number = 0): Promise<void> {
    const timer = this.activeTimers.nth(index);
    await timer.locator(this.pauseButton).click();
  }

  /**
   * Resume timer
   */
  async resumeTimer(index: number = 0): Promise<void> {
    const timer = this.activeTimers.nth(index);
    await timer.locator(this.resumeButton).click();
  }

  /**
   * Reset timer
   */
  async resetTimer(index: number = 0): Promise<void> {
    const timer = this.activeTimers.nth(index);
    await timer.locator(this.resetButton).click();
  }

  /**
   * Delete timer
   */
  async deleteTimer(index: number = 0): Promise<void> {
    const timer = this.activeTimers.nth(index);
    await timer.locator(this.deleteButton).click();
    
    // Confirm deletion if dialog appears
    const confirmButton = this.page.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Get timer count
   */
  async getTimerCount(): Promise<number> {
    return this.activeTimers.count();
  }

  /**
   * Get timer remaining time
   */
  async getTimerRemaining(index: number = 0): Promise<string> {
    const timer = this.activeTimers.nth(index);
    const display = timer.locator('[data-testid="timer-display"], .timer-display');
    return (await display.textContent()) || '00:00';
  }

  /**
   * Check if timer is running
   */
  async isTimerRunning(index: number = 0): Promise<boolean> {
    const timer = this.activeTimers.nth(index);
    const pauseBtn = timer.locator(this.pauseButton);
    return pauseBtn.isVisible();
  }

  /**
   * Check if timer is paused
   */
  async isTimerPaused(index: number = 0): Promise<boolean> {
    const timer = this.activeTimers.nth(index);
    const resumeBtn = timer.locator(this.resumeButton);
    return resumeBtn.isVisible();
  }

  /**
   * Wait for timer to finish
   */
  async waitForTimerFinish(index: number = 0, timeout: number = 120000): Promise<void> {
    const timer = this.activeTimers.nth(index);
    const finishedIndicator = timer.locator('[data-testid="timer-finished"], .timer-finished');
    await expect(finishedIndicator).toBeVisible({ timeout });
  }

  /**
   * Verify timer was created
   */
  async verifyTimerCreated(name: string): Promise<void> {
    await expect(this.activeTimers.filter({ hasText: name })).toBeVisible();
  }
}

export default TimerPage;
