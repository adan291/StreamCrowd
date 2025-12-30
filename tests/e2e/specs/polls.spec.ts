/**
 * Polls E2E Tests
 * Tests for poll creation, voting, and results
 */

import { test, expect } from '../fixtures/auth.fixture';
import { PollPage } from '../pages/PollPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DataFactory } from '../fixtures/data-factory';
import { setupTwitchMock } from '../mocks/twitch-api.mock';

test.describe('Polls', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
  });

  test('should navigate to polls section', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.goToPolls();
    
    // Verify we're on polls page
    await expect(authenticatedPage).toHaveURL(/polls|encuestas/i);
  });

  test('should create a poll with multiple options', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);
    const pollData = DataFactory.poll({
      question: '¿Qué juego jugamos?',
      options: ['Minecraft', 'Fortnite', 'Valorant', 'Just Chatting'],
    });

    await pollPage.goto();
    await pollPage.createPoll(pollData);

    // Verify poll was created
    await pollPage.verifyPollCreated(pollData.question);
    await pollPage.expectToast(/creada|created/i);
  });

  test('should display poll results in real-time', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);
    const pollData = DataFactory.poll();

    await pollPage.goto();
    await pollPage.createPoll(pollData);

    // Verify results section is visible
    await expect(pollPage.pollResults).toBeVisible();
    
    // Initial votes should be 0
    const totalVotes = await pollPage.getTotalVotes();
    expect(totalVotes).toBe(0);
  });

  test('should close poll and show final results', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);
    const pollData = DataFactory.poll();

    await pollPage.goto();
    await pollPage.createPoll(pollData);
    
    // Close the poll
    await pollPage.closePoll();

    // Verify poll is closed
    await pollPage.verifyPollClosed();
    await pollPage.expectToast(/cerrada|closed|finalizada/i);
  });

  test('should reset poll', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);
    const pollData = DataFactory.poll();

    await pollPage.goto();
    await pollPage.createPoll(pollData);
    await pollPage.closePoll();
    
    // Reset poll
    await pollPage.resetPoll();

    // Verify poll is reset (form should be empty or ready for new poll)
    const isActive = await pollPage.isPollActive();
    expect(isActive).toBe(false);
  });

  test('should show poll in history after closing', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);
    const pollData = DataFactory.poll({ question: 'Historia Test Poll' });

    await pollPage.goto();
    
    // Get initial history count
    const initialCount = await pollPage.getHistoryCount();
    
    // Create and close poll
    await pollPage.createPoll(pollData);
    await pollPage.closePoll();

    // Verify history increased
    const newCount = await pollPage.getHistoryCount();
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('should validate poll form', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);

    await pollPage.goto();

    // Try to create poll without question
    await pollPage.createButton.click();

    // Should show validation error
    await expect(authenticatedPage.locator('[data-testid="error"], .text-red-500')).toBeVisible();
  });

  test('should handle minimum 2 options requirement', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);

    await pollPage.goto();
    await pollPage.questionInput.fill('Test Question');
    
    // Fill only one option
    await pollPage.optionInputs.first().fill('Only Option');
    
    // Try to create
    await pollPage.createButton.click();

    // Should show error about minimum options
    await expect(authenticatedPage.locator('text=/mínimo|minimum|al menos|at least/i')).toBeVisible();
  });
});

test.describe('Polls - Accessibility', () => {
  test('should be keyboard navigable', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    await pollPage.goto();

    // Tab through form elements
    await authenticatedPage.keyboard.press('Tab');
    await expect(pollPage.questionInput).toBeFocused();

    await authenticatedPage.keyboard.press('Tab');
    await expect(pollPage.optionInputs.first()).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    await pollPage.goto();

    // Check form has proper labels
    const questionLabel = await pollPage.questionInput.getAttribute('aria-label') 
      || await authenticatedPage.locator(`label[for="${await pollPage.questionInput.getAttribute('id')}"]`).textContent();
    
    expect(questionLabel).toBeTruthy();
  });
});

test.describe('Polls - Error Handling', () => {
  test('should handle network errors gracefully', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    await pollPage.goto();

    // Simulate network failure
    await authenticatedPage.route('**/api/**', route => route.abort());

    const pollData = DataFactory.poll();
    await pollPage.createPoll(pollData);

    // Should show error message
    await pollPage.expectToast(/error|failed|falló/i);
  });
});
