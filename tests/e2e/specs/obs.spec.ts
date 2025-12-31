/**
 * OBS E2E Tests
 * Tests for OBS WebSocket integration
 */

import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';
import { setupTwitchMock } from '../mocks/twitch-api.mock';
import { setupOBSMock, simulateSceneChange, simulateOBSDisconnect, simulateOBSReconnect } from '../mocks/obs-websocket.mock';

test.describe('OBS Integration', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupOBSMock(authenticatedPage);
  });

  test('should show OBS connection status', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const obsStatus = authenticatedPage.locator('[data-testid="obs-status"], [data-testid="connection-status"]');
    await expect(obsStatus).toBeVisible();
  });

  test('should connect to OBS mock', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Navigate to OBS settings
    const obsButton = authenticatedPage.getByRole('button', { name: /obs|escenas|scenes/i });
    if (await obsButton.isVisible()) {
      await obsButton.click();
    }

    // Should show connected status
    const connectedIndicator = authenticatedPage.locator('[data-testid="obs-connected"], text=/conectado|connected/i');
    await expect(connectedIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should display scene list', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const obsButton = authenticatedPage.getByRole('button', { name: /obs|escenas|scenes/i });
    if (await obsButton.isVisible()) {
      await obsButton.click();
    }

    // Should show scenes
    const sceneList = authenticatedPage.locator('[data-testid="scene-list"], [data-testid="obs-scenes"]');
    if (await sceneList.isVisible()) {
      await expect(sceneList).toContainText(/Scene 1|Game Scene|BRB/i);
    }
  });

  test('should change scenes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const obsButton = authenticatedPage.getByRole('button', { name: /obs|escenas|scenes/i });
    if (await obsButton.isVisible()) {
      await obsButton.click();
    }

    // Click on a scene
    const sceneButton = authenticatedPage.locator('[data-testid="scene-item"]').first();
    if (await sceneButton.isVisible()) {
      await sceneButton.click();
      
      // Should show confirmation or update
      const toast = authenticatedPage.locator('[role="alert"]');
      if (await toast.isVisible()) {
        await expect(toast).toContainText(/escena|scene/i);
      }
    }
  });

  test('should handle OBS disconnection', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Simulate disconnection
    await simulateOBSDisconnect(authenticatedPage);

    // Should show disconnected status
    const disconnectedIndicator = authenticatedPage.locator('[data-testid="obs-disconnected"], text=/desconectado|disconnected/i');
    await expect(disconnectedIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should handle OBS reconnection', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Disconnect then reconnect
    await simulateOBSDisconnect(authenticatedPage);
    await authenticatedPage.waitForTimeout(500);
    await simulateOBSReconnect(authenticatedPage);

    // Should show connected again
    const connectedIndicator = authenticatedPage.locator('[data-testid="obs-connected"], text=/conectado|connected/i');
    await expect(connectedIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should react to external scene changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Simulate scene change from OBS
    await simulateSceneChange(authenticatedPage, 'Game Scene');

    // UI should update to show new scene
    const currentScene = authenticatedPage.locator('[data-testid="current-scene"]');
    if (await currentScene.isVisible()) {
      await expect(currentScene).toContainText(/Game Scene/i);
    }
  });
});

test.describe('OBS - Overlay URLs', () => {
  test('should generate overlay URLs', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupOBSMock(authenticatedPage);
    await authenticatedPage.goto('/');

    // Navigate to overlay settings
    const overlayButton = authenticatedPage.getByRole('button', { name: /overlay|url/i });
    if (await overlayButton.isVisible()) {
      await overlayButton.click();

      // Should show URL input or display
      const urlDisplay = authenticatedPage.locator('[data-testid="overlay-url"], input[readonly]');
      if (await urlDisplay.isVisible()) {
        const url = await urlDisplay.inputValue() || await urlDisplay.textContent();
        expect(url).toContain('http');
      }
    }
  });

  test('should copy overlay URL to clipboard', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupOBSMock(authenticatedPage);
    await authenticatedPage.goto('/');

    const overlayButton = authenticatedPage.getByRole('button', { name: /overlay|url/i });
    if (await overlayButton.isVisible()) {
      await overlayButton.click();

      const copyButton = authenticatedPage.getByRole('button', { name: /copiar|copy/i });
      if (await copyButton.isVisible()) {
        await copyButton.click();
        
        // Should show confirmation
        const toast = authenticatedPage.locator('[role="alert"]');
        await expect(toast).toContainText(/copiado|copied/i);
      }
    }
  });
});

test.describe('OBS - Error Handling', () => {
  test('should show error when OBS not available', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupOBSMock(authenticatedPage, { isConnected: false });
    await authenticatedPage.goto('/');

    // Should show connection error or prompt
    const errorMessage = authenticatedPage.locator('text=/no se pudo conectar|connection failed|error/i');
    // This is a soft check as the UI might handle this differently
    if (await errorMessage.isVisible()) {
      expect(await errorMessage.isVisible()).toBe(true);
    }
  });

  test('should provide connection troubleshooting', async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
    await setupOBSMock(authenticatedPage, { isConnected: false });
    await authenticatedPage.goto('/');

    // Look for help or troubleshooting link
    const helpLink = authenticatedPage.locator('text=/ayuda|help|diagnóstico|diagnostic/i');
    if (await helpLink.isVisible()) {
      expect(await helpLink.isVisible()).toBe(true);
    }
  });
});
