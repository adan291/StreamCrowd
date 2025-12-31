/**
 * Timers E2E Tests
 * Tests for timer creation, controls, and completion
 */

import { test, expect } from '../fixtures/auth.fixture';
import { TimerPage } from '../pages/TimerPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DataFactory } from '../fixtures/data-factory';
import { setupTwitchMock } from '../mocks/twitch-api.mock';

test.describe('Timers', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
  });

  test('should navigate to timers section', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.goToTimers();
    
    await expect(authenticatedPage).toHaveURL(/timers|temporizadores/i);
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
    await timerPage.expectToast(/creado|created/i);
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
    
    const remaining = await timerPage.getTimerRemaining();
    expect(remaining).toMatch(/01:00|1:00|60/);
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
    const timerPage = new TimerPage(authenticatedPage);

    await timerPage.goto();

    // Create 3 timers
    for (let i = 1; i <= 3; i++) {
      await timerPage.createTimer(DataFactory.timer({ name: `Timer ${i}` }));
    }

    const count = await timerPage.getTimerCount();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should show timer completion notification', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    const timerData = DataFactory.timer({ 
      name: 'Quick Timer',
      duration: 3, // 3 seconds for quick test
    });

    await timerPage.goto();
    await timerPage.createTimer(timerData);
    await timerPage.startTimer();

    // Wait for timer to finish
    await timerPage.waitForTimerFinish(0, 10000);

    // Should show completion notification
    await timerPage.expectToast(/finalizado|finished|completado|completed/i);
  });
});

test.describe('Timers - Validation', () => {
  test('should require timer name', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    await timerPage.goto();

    // Try to create without name
    await timerPage.durationInput.fill('60');
    await timerPage.createButton.click();

    await expect(authenticatedPage.locator('[data-testid="error"], .text-red-500')).toBeVisible();
  });

  test('should require valid duration', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    await timerPage.goto();

    await timerPage.nameInput.fill('Test Timer');
    await timerPage.durationInput.fill('0');
    await timerPage.createButton.click();

    await expect(authenticatedPage.locator('text=/mayor|greater|mínimo|minimum/i')).toBeVisible();
  });
});

test.describe('Timers - Persistence', () => {
  test('should persist timers after page reload', async ({ authenticatedPage }) => {
    const timerPage = new TimerPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    
    const timerData = DataFactory.timer({ name: 'Persistent Timer' });

    await timerPage.goto();
    await timerPage.createTimer(timerData);

    // Reload page
    await authenticatedPage.reload();
    await timerPage.waitForPageLoad();

    // Timer should still exist
    await timerPage.verifyTimerCreated(timerData.name);
  });
});
