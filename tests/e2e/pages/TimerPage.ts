/**
 * Timer Page Object
 * Timer/Countdown creation and management interactions
 * Note: In this app, Countdown is a floating widget triggered from Dynamics
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TimerData } from '../fixtures/data-factory';

export class TimerPage extends BasePage {
  // Navigation
  get dynamicsNav(): Locator {
    return this.page.locator('[data-tour="nav-dynamics"]');
  }

  // Activity card in the selector - matches "Countdown: Temporizador con cuenta atrás para eventos"
  get countdownActivityCard(): Locator {
    return this.page.getByRole('button', { name: /countdown/i }).first();
  }

  // Countdown floating widget - it's a fixed positioned div with specific structure
  get countdownWidget(): Locator {
    // The widget contains "Countdown" text in header and has "Iniciar" button
    // Use a more reliable locator based on the actual structure
    return this.page.locator('div').filter({ has: this.page.getByText('Countdown', { exact: true }) }).filter({ has: this.page.getByRole('button', { name: /iniciar|pausar/i }) }).first();
  }

  // Form elements (in countdown config panel)
  get nameInput(): Locator {
    // Countdown doesn't have a name input, but we keep this for interface compatibility
    return this.page.locator('input[placeholder*="nombre"], input[placeholder*="name"]').first();
  }

  get durationInput(): Locator {
    // Minutes input in the config panel
    return this.page.locator('#countdown-minutes, input[id="countdown-minutes"]').first();
  }

  get minutesInput(): Locator {
    return this.page.locator('#countdown-minutes');
  }

  get secondsInput(): Locator {
    return this.page.locator('#countdown-seconds');
  }

  get hoursInput(): Locator {
    return this.page.locator('#countdown-hours');
  }

  get daysInput(): Locator {
    return this.page.locator('#countdown-days');
  }

  get createButton(): Locator {
    // The countdown uses "Iniciar" button to start
    return this.page.getByRole('button', { name: /iniciar|start/i }).first();
  }

  // Timer controls - these are in the floating widget
  // Use page-level locators since the widget locator is complex
  get startButton(): Locator {
    // Button with "Iniciar" text (when timer is stopped/paused)
    // The button has both an icon and text, so use text locator
    return this.page.locator('button').filter({ hasText: 'Iniciar' }).first();
  }

  get pauseButton(): Locator {
    // Button with "Pausar" text (when timer is running)
    return this.page.locator('button').filter({ hasText: 'Pausar' }).first();
  }

  get resumeButton(): Locator {
    // Same as start button when paused
    return this.startButton;
  }

  get resetButton(): Locator {
    // Button with accessible name "Reiniciar" - it only has an icon, no visible text
    return this.page.getByRole('button', { name: 'Reiniciar' });
  }

  get settingsButton(): Locator {
    // Button with accessible name "Configuración" - it only has an icon
    return this.page.getByRole('button', { name: 'Configuración' });
  }

  get deleteButton(): Locator {
    // Close button in the widget header - it's a button with X icon
    // In the snapshot, there are two buttons in the header area (minimize and close)
    // The close button is the second one
    return this.page.locator('div').filter({ hasText: /^Countdown$/ }).locator('..').locator('button').nth(1);
  }

  // Timer display - the main time shown in the widget
  get activeTimers(): Locator {
    return this.countdownWidget;
  }

  get timerDisplay(): Locator {
    // The timer display shows time like "5:00" - it's a div with the time text
    // Look for a div that contains time format (digits:digits)
    return this.page.locator('div').filter({ hasText: /^\d+:\d{2}$/ }).first();
  }

  get timerProgress(): Locator {
    return this.page.locator('[data-testid="timer-progress"], .timer-progress');
  }

  /**
   * Navigate to timers page (via Dynamics section - Countdown)
   * Note: authenticatedPage fixture already connects, so we just need to navigate to the countdown
   */
  async goto(): Promise<void> {
    // Don't call super.goto('/') as the authenticatedPage fixture already handles connection
    // Just wait for the dynamics nav to be visible (indicates connected state)
    await this.dynamicsNav.waitFor({ state: 'visible', timeout: 15000 });
    
    // Click on dynamics nav to go to the activity selector
    await this.dynamicsNav.click();
    await this.waitForPageLoad();
    
    // Click on countdown activity card - this opens a floating widget
    await this.countdownActivityCard.waitFor({ state: 'visible', timeout: 5000 });
    await this.countdownActivityCard.click();
    
    // Wait for the countdown widget to appear (look for the Iniciar button)
    await this.page.locator('button').filter({ hasText: 'Iniciar' }).first().waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Create a new timer (set duration using quick add buttons)
   */
  async createTimer(data: TimerData): Promise<void> {
    // Wait for the countdown widget to appear
    await this.page.locator('button').filter({ hasText: 'Iniciar' }).first().waitFor({ state: 'visible', timeout: 5000 });
    
    // The countdown widget starts with 5:00 by default
    // For simplicity, we'll just use the default time or add time using quick buttons
    // If duration is specified, we can add time using the quick add buttons
    
    // Reset first to ensure we start from default
    await this.resetButton.click();
    await this.page.waitForTimeout(300);
    
    // If duration is more than 5 minutes (300 seconds), add time
    if (data.duration > 300) {
      const extraMinutes = Math.floor((data.duration - 300) / 60);
      // Click the 1m add button for each extra minute (up to a reasonable limit)
      const addOneMinBtn = this.page.locator('button').filter({ hasText: '1m' }).first();
      for (let i = 0; i < Math.min(extraMinutes, 10); i++) {
        await addOneMinBtn.click();
        await this.page.waitForTimeout(100);
      }
    }
    
    // Timer is now configured
  }

  /**
   * Start timer
   */
  async startTimer(index: number = 0): Promise<void> {
    await this.countdownWidget.waitFor({ state: 'visible', timeout: 5000 });
    if (await this.startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.startButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Pause timer
   */
  async pauseTimer(index: number = 0): Promise<void> {
    await this.countdownWidget.waitFor({ state: 'visible', timeout: 5000 });
    if (await this.pauseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.pauseButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Resume timer
   */
  async resumeTimer(index: number = 0): Promise<void> {
    await this.countdownWidget.waitFor({ state: 'visible', timeout: 5000 });
    // When paused, the button shows "Iniciar" again
    if (await this.startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.startButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Reset timer
   */
  async resetTimer(index: number = 0): Promise<void> {
    await this.countdownWidget.waitFor({ state: 'visible', timeout: 5000 });
    if (await this.resetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.resetButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Delete timer (close the widget)
   */
  async deleteTimer(index: number = 0): Promise<void> {
    await this.countdownWidget.waitFor({ state: 'visible', timeout: 5000 });
    if (await this.deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.deleteButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Get timer count (0 or 1 since there's only one countdown widget)
   */
  async getTimerCount(): Promise<number> {
    const isVisible = await this.countdownWidget.isVisible({ timeout: 1000 }).catch(() => false);
    return isVisible ? 1 : 0;
  }

  /**
   * Get timer remaining time
   */
  async getTimerRemaining(index: number = 0): Promise<string> {
    await this.countdownWidget.waitFor({ state: 'visible', timeout: 5000 });
    const display = this.timerDisplay;
    if (await display.isVisible({ timeout: 2000 }).catch(() => false)) {
      return (await display.textContent()) || '00:00';
    }
    return '00:00';
  }

  /**
   * Check if timer is running
   */
  async isTimerRunning(index: number = 0): Promise<boolean> {
    // If pause button is visible, timer is running
    return this.pauseButton.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Check if timer is paused
   */
  async isTimerPaused(index: number = 0): Promise<boolean> {
    // If start/iniciar button is visible, timer is paused
    return this.startButton.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Wait for timer to finish
   */
  async waitForTimerFinish(index: number = 0, timeout: number = 120000): Promise<void> {
    // Wait for the timer to show 0:00
    await this.page.waitForSelector('div:has-text("0:00")', { timeout });
  }

  /**
   * Verify timer was created (widget is visible)
   */
  async verifyTimerCreated(name: string): Promise<void> {
    // Timer widget should be visible - check for the "Iniciar" or "Pausar" button
    // which indicates the countdown widget is open
    // Use exact: true to avoid matching "Reiniciar"
    const iniciarBtn = this.page.getByRole('button', { name: 'Iniciar', exact: true });
    const pausarBtn = this.page.getByRole('button', { name: 'Pausar', exact: true });
    await expect(iniciarBtn.or(pausarBtn)).toBeVisible({ timeout: 5000 });
  }
}


export default TimerPage;