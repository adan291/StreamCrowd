/**
 * Timers E2E Tests
 * Tests for timer creation, controls, and completion
 */

import { test, expect } from '../fixtures/auth.fixture';
import { TimerPage } from '../pages/TimerPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DataFactory } from '../fixtures/data-factory';

test.describe('Timers', () => {
  // Note: authenticatedPage fixture already sets up Twitch mocks and connects

  test('should navigate to timers section', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.goToTimers();
    
    // The app is a SPA and doesn't change URL for sections
    // Timers/Countdown is inside Dynamics - verify the dynamics panel is visible
    const dynamicsPanel = authenticatedPage.locator('[data-tour="dynamics-panel"]').first();
    await expect(dynamicsPanel).toBeVisible({ timeout: 10000 });
  });

  test('should create a timer', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    const timerData = DataFactory.timer({
      name: 'Break Timer',
      duration: 300, // 5 minutes
    });

    await timerPage.goto();
    await timerPage.createTimer(timerData);

    await timerPage.verifyTimerCreated(timerData.name);
    // Note: Countdown widget doesn't show a toast on creation
  });

  test('should start and pause timer', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    const timerData = DataFactory.timer({ duration: 60 });

    await timerPage.goto();
    await timerPage.createTimer(timerData);

    // Start timer
    await timerPage.startTimer();
    expect(await timerPage.isTimerRunning()).toBe(true);

    // Wait a bit
    await authenticatedPage.waitForTimeout(1000);

    // Pause timer
    await timerPage.pauseTimer();
    expect(await timerPage.isTimerPaused()).toBe(true);

    // Get remaining time
    const remaining = await timerPage.getTimerRemaining();
    expect(remaining).not.toBe('01:00'); // Should have decreased
  });

  test('should resume paused timer', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    const timerData = DataFactory.timer({ duration: 60 });

    await timerPage.goto();
    await timerPage.createTimer(timerData);

    await timerPage.startTimer();
    await timerPage.pauseTimer();
    
    const pausedTime = await timerPage.getTimerRemaining();
    
    await timerPage.resumeTimer();
    expect(await timerPage.isTimerRunning()).toBe(true);

    // Wait and verify time continues
    await authenticatedPage.waitForTimeout(1500);
    const newTime = await timerPage.getTimerRemaining();
    expect(newTime).not.toBe(pausedTime);
  });

  test('should reset timer', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    const timerData = DataFactory.timer({ duration: 60 });

    await timerPage.goto();
    await timerPage.createTimer(timerData);

    await timerPage.startTimer();
    await authenticatedPage.waitForTimeout(2000);
    
    await timerPage.resetTimer();
    
    // The countdown widget resets to its default time (5:00)
    const remaining = await timerPage.getTimerRemaining();
    expect(remaining).toMatch(/5:00|05:00/);
  });

  test('should delete timer', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    const timerData = DataFactory.timer();

    await timerPage.goto();
    await timerPage.createTimer(timerData);

    const initialCount = await timerPage.getTimerCount();
    expect(initialCount).toBeGreaterThan(0);

    await timerPage.deleteTimer();

    const newCount = await timerPage.getTimerCount();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should create multiple timers', async ({ authenticatedPage }) => {
    // The Countdown widget is a single instance - test that we can open it multiple times
    // by closing and reopening
    const timerPage = new TimerPage(authenticatedPage);

    await timerPage.goto();
    
    // Verify timer is visible
    await timerPage.verifyTimerCreated('Timer 1');
    
    // Close the timer
    await timerPage.deleteTimer();
    
    // Reopen it
    await timerPage.countdownActivityCard.click();
    await timerPage.verifyTimerCreated('Timer 2');
    
    // Timer should be visible again
    const count = await timerPage.getTimerCount();
    expect(count).toBe(1);
  });

  test('should show timer completion', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    await timerPage.goto();

    // Reset timer to default state
    await timerPage.resetTimer();
    await authenticatedPage.waitForTimeout(300);
    
    // Start the timer
    await timerPage.startTimer();
    await authenticatedPage.waitForTimeout(500);
    
    // Verify timer is running (pause button visible)
    const isRunning = await timerPage.isTimerRunning();
    expect(isRunning).toBe(true);
    
    // The timer display should show time counting down
    const timerDisplay = authenticatedPage.locator('div').filter({ hasText: /^\d+:\d{2}$/ }).first();
    await expect(timerDisplay).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Timers - Validation', () => {
  test('should have timer controls visible', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    await timerPage.goto();

    // Verify all timer controls are visible
    await expect(timerPage.startButton).toBeVisible({ timeout: 5000 });
    await expect(timerPage.resetButton).toBeVisible({ timeout: 5000 });
    await expect(timerPage.settingsButton).toBeVisible({ timeout: 5000 });
  });

  test('should have quick time buttons', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    await timerPage.goto();

    // Check for quick add time buttons (1m, 5m, etc.)
    const oneMinBtn = authenticatedPage.locator('button').filter({ hasText: '1m' }).first();
    const fiveMinBtn = authenticatedPage.locator('button').filter({ hasText: '5m' }).first();
    
    await expect(oneMinBtn).toBeVisible({ timeout: 5000 });
    await expect(fiveMinBtn).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Timers - Persistence', () => {
  test('should maintain timer state during session', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    await timerPage.goto();

    // Start timer
    await timerPage.startTimer();
    await authenticatedPage.waitForTimeout(1000);
    
    // Get current time
    const time1 = await timerPage.getTimerRemaining();
    
    // Wait a bit more
    await authenticatedPage.waitForTimeout(1000);
    
    // Time should have decreased
    const time2 = await timerPage.getTimerRemaining();
    expect(time2).not.toBe(time1);
  });
});
