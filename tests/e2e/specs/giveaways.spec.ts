/**
 * Giveaways E2E Tests
 * Tests for giveaway creation, participation, and winner selection
 */

import { test, expect } from '../fixtures/auth.fixture';
import { GiveawayPage } from '../pages/GiveawayPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DataFactory } from '../fixtures/data-factory';
import { setupTwitchMock } from '../mocks/twitch-api.mock';

test.describe('Giveaways', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
  });

  test('should navigate to giveaways section', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.goToGiveaways();
    
    await expect(authenticatedPage).toHaveURL(/giveaways|sorteos/i);
  });

  test('should create a keyword giveaway', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    const giveawayData = DataFactory.giveaway({
      title: 'Sorteo de Suscripción',
      keyword: '!sorteo',
      mode: 'keyword',
    });

    await giveawayPage.goto();
    await giveawayPage.createGiveaway(giveawayData);

    await giveawayPage.verifyGiveawayCreated(giveawayData.title);
    await giveawayPage.expectToast(/creado|created/i);
  });

  test('should create a viewers giveaway', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    const giveawayData = DataFactory.giveaway({
      title: 'Sorteo para Viewers',
      mode: 'viewers',
    });

    await giveawayPage.goto();
    await giveawayPage.createGiveaway(giveawayData);

    await giveawayPage.verifyGiveawayCreated(giveawayData.title);
  });

  test('should create a subscribers-only giveaway', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    const giveawayData = DataFactory.giveaway({
      title: 'Sorteo Solo Subs',
      mode: 'subs',
    });

    await giveawayPage.goto();
    await giveawayPage.createGiveaway(giveawayData);

    await giveawayPage.verifyGiveawayCreated(giveawayData.title);
  });

  test('should draw a winner', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    const giveawayData = DataFactory.giveaway();

    await giveawayPage.goto();
    await giveawayPage.createGiveaway(giveawayData);

    // Simulate some participants
    await giveawayPage.simulateParticipant('user1', giveawayData.keyword);
    await giveawayPage.simulateParticipant('user2', giveawayData.keyword);
    await giveawayPage.simulateParticipant('user3', giveawayData.keyword);

    // Wait for participants to register
    await authenticatedPage.waitForTimeout(500);

    // Draw winner
    await giveawayPage.drawWinner();

    await giveawayPage.verifyWinnerSelected();
    await giveawayPage.expectToast(/ganador|winner/i);
  });

  test('should re-roll for new winner', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    const giveawayData = DataFactory.giveaway();

    await giveawayPage.goto();
    await giveawayPage.createGiveaway(giveawayData);

    // Add participants
    await giveawayPage.simulateParticipant('participant1', giveawayData.keyword);
    await giveawayPage.simulateParticipant('participant2', giveawayData.keyword);
    await authenticatedPage.waitForTimeout(500);

    // Draw first winner
    await giveawayPage.drawWinner();
    const firstWinner = await giveawayPage.getWinner();

    // Re-roll
    await giveawayPage.reroll();
    const secondWinner = await giveawayPage.getWinner();

    // Winner should exist (may or may not be different with only 2 participants)
    expect(secondWinner).toBeTruthy();
  });

  test('should show participant count', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    const giveawayData = DataFactory.giveaway();

    await giveawayPage.goto();
    await giveawayPage.createGiveaway(giveawayData);

    // Initial count should be 0
    let count = await giveawayPage.getParticipantCount();
    expect(count).toBe(0);

    // Add participants
    await giveawayPage.simulateParticipant('user1', giveawayData.keyword);
    await giveawayPage.simulateParticipant('user2', giveawayData.keyword);
    await authenticatedPage.waitForTimeout(500);

    // Count should increase
    count = await giveawayPage.getParticipantCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should close giveaway', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    const giveawayData = DataFactory.giveaway();

    await giveawayPage.goto();
    await giveawayPage.createGiveaway(giveawayData);
    await giveawayPage.closeGiveaway();

    expect(await giveawayPage.isGiveawayActive()).toBe(false);
  });
});

test.describe('Giveaways - Validation', () => {
  test('should require giveaway title', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    await giveawayPage.goto();

    await giveawayPage.createButton.click();

    await expect(authenticatedPage.locator('[data-testid="error"], .text-red-500')).toBeVisible();
  });

  test('should require keyword for keyword mode', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    await giveawayPage.goto();

    await giveawayPage.titleInput.fill('Test Giveaway');
    await giveawayPage.modeSelect.selectOption('keyword');
    // Don't fill keyword
    await giveawayPage.createButton.click();

    await expect(authenticatedPage.locator('text=/palabra clave|keyword/i')).toBeVisible();
  });
});

test.describe('Giveaways - Edge Cases', () => {
  test('should handle draw with no participants', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    
    const giveawayData = DataFactory.giveaway();

    await giveawayPage.goto();
    await giveawayPage.createGiveaway(giveawayData);

    // Try to draw with no participants
    await giveawayPage.drawButton.click();

    // Should show error or warning
    await giveawayPage.expectToast(/sin participantes|no participants|vacío|empty/i);
  });

  test('should prevent duplicate entries', async ({ authenticatedPage }) => {
    const giveawayPage = new GiveawayPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    
    const giveawayData = DataFactory.giveaway();

    await giveawayPage.goto();
    await giveawayPage.createGiveaway(giveawayData);

    // Same user tries to enter twice
    await giveawayPage.simulateParticipant('sameuser', giveawayData.keyword);
    await giveawayPage.simulateParticipant('sameuser', giveawayData.keyword);
    await authenticatedPage.waitForTimeout(500);

    // Should only count as 1 participant
    const count = await giveawayPage.getParticipantCount();
    expect(count).toBe(1);
  });
});
