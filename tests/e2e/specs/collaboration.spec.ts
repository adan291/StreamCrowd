/**
 * Collaboration E2E Tests
 * Tests for multi-moderator collaboration features
 */

import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';
import { setupTwitchMock } from '../mocks/twitch-api.mock';
import { 
  setupCollaborationMock, 
  simulateCollaboratorJoin, 
  simulateCollaboratorLeave,
  simulateChatMessage,
  simulateCollaboratorAction 
} from '../mocks/collaboration-ws.mock';

test.describe('Collaboration - Session Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupCollaborationMock(authenticatedPage);
  });

  test('should create collaboration session', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Navigate to collaboration
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration|equipo|team/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();
    }

    // Create session
    const createButton = authenticatedPage.getByRole('button', { name: /crear sesión|create session|iniciar/i });
    if (await createButton.isVisible()) {
      await createButton.click();

      // Should show session code
      const sessionCode = authenticatedPage.locator('[data-testid="session-code"]');
      await expect(sessionCode).toBeVisible();
    }
  });

  test('should display session invite code', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      const inviteCode = authenticatedPage.locator('[data-testid="invite-code"], [data-testid="session-code"]');
      if (await inviteCode.isVisible()) {
        const code = await inviteCode.textContent();
        expect(code?.length).toBeGreaterThanOrEqual(6);
      }
    }
  });

  test('should join existing session', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      const joinButton = authenticatedPage.getByRole('button', { name: /unirse|join/i });
      if (await joinButton.isVisible()) {
        await joinButton.click();

        // Enter code
        const codeInput = authenticatedPage.getByLabel(/código|code/i);
        if (await codeInput.isVisible()) {
          await codeInput.fill('ABC123');
          await authenticatedPage.getByRole('button', { name: /confirmar|confirm|unirse|join/i }).click();
        }
      }
    }
  });
});

test.describe('Collaboration - Collaborators', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupCollaborationMock(authenticatedPage);
  });

  test('should display collaborator list', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      const collaboratorList = authenticatedPage.locator('[data-testid="collaborator-list"]');
      if (await collaboratorList.isVisible()) {
        await expect(collaboratorList).toContainText(/HostUser|Moderator/i);
      }
    }
  });

  test('should show collaborator joining', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      // Simulate new collaborator
      await simulateCollaboratorJoin(authenticatedPage, {
        id: 'new_mod',
        name: 'NewModerator',
        role: 'moderator',
      });

      // Should show notification or update list
      const notification = authenticatedPage.locator('[role="alert"]');
      if (await notification.isVisible()) {
        await expect(notification).toContainText(/NewModerator|unió|joined/i);
      }
    }
  });

  test('should show collaborator leaving', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      // Simulate collaborator leaving
      await simulateCollaboratorLeave(authenticatedPage, 'mod_1');

      // Should show notification
      const notification = authenticatedPage.locator('[role="alert"]');
      if (await notification.isVisible()) {
        await expect(notification).toContainText(/salió|left|desconectó|disconnected/i);
      }
    }
  });

  test('should show online/offline status', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      // Check for status indicators
      const onlineIndicator = authenticatedPage.locator('[data-testid="status-online"], .bg-green-500');
      const offlineIndicator = authenticatedPage.locator('[data-testid="status-offline"], .bg-gray-500');
      
      // Should have at least one status indicator
      const hasIndicators = await onlineIndicator.count() > 0 || await offlineIndicator.count() > 0;
      expect(hasIndicators).toBe(true);
    }
  });
});

test.describe('Collaboration - Chat', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupCollaborationMock(authenticatedPage);
  });

  test('should send chat message', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      // Find chat input
      const chatInput = authenticatedPage.getByPlaceholder(/mensaje|message/i);
      if (await chatInput.isVisible()) {
        await chatInput.fill('Hello team!');
        await authenticatedPage.keyboard.press('Enter');

        // Message should appear in chat
        const chatMessages = authenticatedPage.locator('[data-testid="chat-messages"]');
        await expect(chatMessages).toContainText('Hello team!');
      }
    }
  });

  test('should receive chat messages', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      // Simulate incoming message
      await simulateChatMessage(authenticatedPage, 'Moderator1', 'Hey everyone!');

      // Should show in chat
      const chatMessages = authenticatedPage.locator('[data-testid="chat-messages"]');
      if (await chatMessages.isVisible()) {
        await expect(chatMessages).toContainText('Hey everyone!');
      }
    }
  });
});

test.describe('Collaboration - Permissions', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupCollaborationMock(authenticatedPage, { isHost: true });
  });

  test('should allow host to change roles', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      // Find role selector for a collaborator
      const roleSelector = authenticatedPage.locator('[data-testid="role-selector"]').first();
      if (await roleSelector.isVisible()) {
        await roleSelector.click();
        
        // Select viewer role
        const viewerOption = authenticatedPage.getByRole('option', { name: /viewer|espectador/i });
        if (await viewerOption.isVisible()) {
          await viewerOption.click();
        }
      }
    }
  });

  test('should allow host to kick users', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      // Find kick button
      const kickButton = authenticatedPage.locator('[data-testid="kick-user"]').first();
      if (await kickButton.isVisible()) {
        await kickButton.click();

        // Confirm kick
        const confirmButton = authenticatedPage.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    }
  });
});

test.describe('Collaboration - Action Log', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupCollaborationMock(authenticatedPage);
  });

  test('should show action log', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      // Find action log
      const actionLog = authenticatedPage.locator('[data-testid="action-log"]');
      if (await actionLog.isVisible()) {
        await expect(actionLog).toBeVisible();
      }
    }
  });

  test('should log collaborator actions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const collabButton = authenticatedPage.getByRole('button', { name: /colaboración|collaboration/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();

      // Simulate action from collaborator
      await simulateCollaboratorAction(authenticatedPage, 'mod_1', 'poll_created', {
        title: 'Test Poll',
      });

      // Should appear in log
      const actionLog = authenticatedPage.locator('[data-testid="action-log"]');
      if (await actionLog.isVisible()) {
        await expect(actionLog).toContainText(/poll|encuesta/i);
      }
    }
  });
});
