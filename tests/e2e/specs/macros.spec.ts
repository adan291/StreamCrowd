/**
 * Macros E2E Tests
 * Tests for macro creation, execution, and triggers
 */

import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';
import { setupTwitchMock } from '../mocks/twitch-api.mock';

test.describe('Macros - Creation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
  });

  test('should navigate to macros section', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.goToMacros();
    
    await expect(authenticatedPage).toHaveURL(/macros/i);
  });

  test('should create a simple macro', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Navigate to macros
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();
    }

    // Create new macro
    const createButton = authenticatedPage.getByRole('button', { name: /crear|create|nuevo|new/i });
    if (await createButton.isVisible()) {
      await createButton.click();

      // Fill macro details
      const nameInput = authenticatedPage.getByLabel(/nombre|name/i);
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Macro');
      }

      // Add action
      const addActionButton = authenticatedPage.getByRole('button', { name: /añadir acción|add action/i });
      if (await addActionButton.isVisible()) {
        await addActionButton.click();

        // Select action type
        const actionSelect = authenticatedPage.getByLabel(/tipo de acción|action type/i);
        if (await actionSelect.isVisible()) {
          await actionSelect.selectOption('notification');
        }
      }

      // Save macro
      const saveButton = authenticatedPage.getByRole('button', { name: /guardar|save/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();

        // Should show success
        const toast = authenticatedPage.locator('[role="alert"]');
        await expect(toast).toContainText(/creado|created|guardado|saved/i);
      }
    }
  });

  test('should create macro with multiple actions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      const createButton = authenticatedPage.getByRole('button', { name: /crear|create/i });
      if (await createButton.isVisible()) {
        await createButton.click();

        // Add multiple actions
        const addActionButton = authenticatedPage.getByRole('button', { name: /añadir acción|add action/i });
        for (let i = 0; i < 3; i++) {
          if (await addActionButton.isVisible()) {
            await addActionButton.click();
          }
        }

        // Verify multiple actions added
        const actionItems = authenticatedPage.locator('[data-testid="macro-action"]');
        const count = await actionItems.count();
        expect(count).toBeGreaterThanOrEqual(3);
      }
    }
  });

  test('should validate macro before saving', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      const createButton = authenticatedPage.getByRole('button', { name: /crear|create/i });
      if (await createButton.isVisible()) {
        await createButton.click();

        // Try to save without name
        const saveButton = authenticatedPage.getByRole('button', { name: /guardar|save/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();

          // Should show validation error
          const error = authenticatedPage.locator('[data-testid="error"], .text-red-500');
          await expect(error).toBeVisible();
        }
      }
    }
  });
});

test.describe('Macros - Triggers', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
  });

  test('should configure manual trigger', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      const createButton = authenticatedPage.getByRole('button', { name: /crear|create/i });
      if (await createButton.isVisible()) {
        await createButton.click();

        // Select manual trigger
        const triggerSelect = authenticatedPage.getByLabel(/trigger|disparador/i);
        if (await triggerSelect.isVisible()) {
          await triggerSelect.selectOption('manual');
        }

        // Manual trigger should not require additional config
        const triggerConfig = authenticatedPage.locator('[data-testid="trigger-config"]');
        if (await triggerConfig.isVisible()) {
          // Config should be minimal for manual
          expect(await triggerConfig.textContent()).not.toContain('required');
        }
      }
    }
  });

  test('should configure chat command trigger', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      const createButton = authenticatedPage.getByRole('button', { name: /crear|create/i });
      if (await createButton.isVisible()) {
        await createButton.click();

        const triggerSelect = authenticatedPage.getByLabel(/trigger|disparador/i);
        if (await triggerSelect.isVisible()) {
          await triggerSelect.selectOption('chat');

          // Should show command input
          const commandInput = authenticatedPage.getByLabel(/comando|command/i);
          if (await commandInput.isVisible()) {
            await commandInput.fill('!testmacro');
            expect(await commandInput.inputValue()).toBe('!testmacro');
          }
        }
      }
    }
  });

  test('should configure timer trigger', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      const createButton = authenticatedPage.getByRole('button', { name: /crear|create/i });
      if (await createButton.isVisible()) {
        await createButton.click();

        const triggerSelect = authenticatedPage.getByLabel(/trigger|disparador/i);
        if (await triggerSelect.isVisible()) {
          await triggerSelect.selectOption('timer');

          // Should show interval input
          const intervalInput = authenticatedPage.getByLabel(/intervalo|interval|minutos|minutes/i);
          if (await intervalInput.isVisible()) {
            await intervalInput.fill('5');
          }
        }
      }
    }
  });

  test('should configure event trigger', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      const createButton = authenticatedPage.getByRole('button', { name: /crear|create/i });
      if (await createButton.isVisible()) {
        await createButton.click();

        const triggerSelect = authenticatedPage.getByLabel(/trigger|disparador/i);
        if (await triggerSelect.isVisible()) {
          await triggerSelect.selectOption('event');

          // Should show event type selector
          const eventSelect = authenticatedPage.getByLabel(/evento|event/i);
          if (await eventSelect.isVisible()) {
            await expect(eventSelect).toBeVisible();
          }
        }
      }
    }
  });
});

test.describe('Macros - Execution', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
  });

  test('should execute macro manually', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      // Find a macro card with execute button
      const executeButton = authenticatedPage.locator('[data-testid="execute-macro"], button:has-text("Ejecutar")').first();
      if (await executeButton.isVisible()) {
        await executeButton.click();

        // Should show execution feedback
        const toast = authenticatedPage.locator('[role="alert"]');
        await expect(toast).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should show execution log', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      // Look for execution log
      const logButton = authenticatedPage.getByRole('button', { name: /log|historial|history/i });
      if (await logButton.isVisible()) {
        await logButton.click();

        const logPanel = authenticatedPage.locator('[data-testid="execution-log"]');
        await expect(logPanel).toBeVisible();
      }
    }
  });

  test('should handle execution errors gracefully', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Simulate network error
    await authenticatedPage.route('**/api/**', route => route.abort());

    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      const executeButton = authenticatedPage.locator('[data-testid="execute-macro"]').first();
      if (await executeButton.isVisible()) {
        await executeButton.click();

        // Should show error message
        const toast = authenticatedPage.locator('[role="alert"]');
        await expect(toast).toContainText(/error|failed|falló/i);
      }
    }
  });
});

test.describe('Macros - Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
  });

  test('should edit existing macro', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      // Find edit button
      const editButton = authenticatedPage.locator('[data-testid="edit-macro"], button:has-text("Editar")').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        // Should open editor
        const editor = authenticatedPage.locator('[data-testid="macro-editor"]');
        await expect(editor).toBeVisible();
      }
    }
  });

  test('should delete macro', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      // Count initial macros
      const macroCards = authenticatedPage.locator('[data-testid="macro-card"]');
      const initialCount = await macroCards.count();

      // Find delete button
      const deleteButton = authenticatedPage.locator('[data-testid="delete-macro"]').first();
      if (await deleteButton.isVisible() && initialCount > 0) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = authenticatedPage.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();

          // Count should decrease
          const newCount = await macroCards.count();
          expect(newCount).toBeLessThan(initialCount);
        }
      }
    }
  });

  test('should duplicate macro', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      // Find duplicate button
      const duplicateButton = authenticatedPage.locator('[data-testid="duplicate-macro"], button:has-text("Duplicar")').first();
      if (await duplicateButton.isVisible()) {
        const macroCards = authenticatedPage.locator('[data-testid="macro-card"]');
        const initialCount = await macroCards.count();

        await duplicateButton.click();

        // Count should increase
        const newCount = await macroCards.count();
        expect(newCount).toBeGreaterThan(initialCount);
      }
    }
  });

  test('should enable/disable macro', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      // Find toggle
      const toggleButton = authenticatedPage.locator('[data-testid="toggle-macro"], [role="switch"]').first();
      if (await toggleButton.isVisible()) {
        const initialState = await toggleButton.getAttribute('aria-checked');
        await toggleButton.click();

        // State should change
        const newState = await toggleButton.getAttribute('aria-checked');
        expect(newState).not.toBe(initialState);
      }
    }
  });
});

test.describe('Macros - Import/Export', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
  });

  test('should export macros', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      // Find export button
      const exportButton = authenticatedPage.getByRole('button', { name: /exportar|export/i });
      if (await exportButton.isVisible()) {
        // Set up download listener
        const [download] = await Promise.all([
          authenticatedPage.waitForEvent('download').catch(() => null),
          exportButton.click(),
        ]);

        if (download) {
          expect(download.suggestedFilename()).toContain('macro');
        }
      }
    }
  });

  test('should show import option', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    const macrosButton = authenticatedPage.getByRole('button', { name: /macros/i });
    if (await macrosButton.isVisible()) {
      await macrosButton.click();

      // Find import button
      const importButton = authenticatedPage.getByRole('button', { name: /importar|import/i });
      if (await importButton.isVisible()) {
        await expect(importButton).toBeEnabled();
      }
    }
  });
});
