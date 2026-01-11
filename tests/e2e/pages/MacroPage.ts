/**
 * Macro Page Object
 * Page object for macro management functionality
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MacroPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get createButton(): Locator {
    return this.page.getByRole('button', { name: /crear|create|nuevo|new/i });
  }

  get macroList(): Locator {
    return this.page.locator('[data-testid="macro-list"]');
  }

  get macroCards(): Locator {
    return this.page.locator('[data-testid="macro-card"]');
  }

  get macroEditor(): Locator {
    return this.page.locator('[data-testid="macro-editor"]');
  }

  get nameInput(): Locator {
    return this.page.getByLabel(/nombre|name/i);
  }

  get descriptionInput(): Locator {
    return this.page.getByLabel(/descripción|description/i);
  }

  get triggerSelect(): Locator {
    return this.page.getByLabel(/trigger|disparador/i);
  }

  get addActionButton(): Locator {
    return this.page.getByRole('button', { name: /añadir acción|add action/i });
  }

  get saveButton(): Locator {
    return this.page.getByRole('button', { name: /guardar|save/i });
  }

  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: /cancelar|cancel/i });
  }

  get executionLog(): Locator {
    return this.page.locator('[data-testid="execution-log"]');
  }

  /**
   * Navigate to macros page (via Platforms section)
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    
    // Macros might be in Platforms > Twitch
    const platformsNav = this.page.locator('[data-tour="nav-platforms"]');
    if (await platformsNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await platformsNav.click();
      await this.waitForPageLoad();
      
      // Look for macros option
      const macrosButton = this.page.locator('button:has-text("Macros"), [data-testid="macros-nav"]');
      if (await macrosButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await macrosButton.first().click();
      }
    }
    await this.waitForPageLoad();
  }

  /**
   * Create a new macro
   */
  async createMacro(options: {
    name: string;
    description?: string;
    trigger?: 'manual' | 'chat' | 'timer' | 'event';
    actions?: Array<{ type: string; config?: Record<string, any> }>;
  }): Promise<void> {
    await this.createButton.click();
    await expect(this.macroEditor).toBeVisible();

    await this.nameInput.fill(options.name);

    if (options.description) {
      await this.descriptionInput.fill(options.description);
    }

    if (options.trigger) {
      await this.triggerSelect.selectOption(options.trigger);
    }

    if (options.actions) {
      for (const action of options.actions) {
        await this.addAction(action.type, action.config);
      }
    }

    await this.saveButton.click();
  }


  /**
   * Add an action to the macro
   */
  async addAction(type: string, config?: Record<string, any>): Promise<void> {
    await this.addActionButton.click();

    const actionTypeSelect = this.page.getByLabel(/tipo de acción|action type/i);
    if (await actionTypeSelect.isVisible()) {
      await actionTypeSelect.selectOption(type);
    }

    if (config) {
      for (const [key, value] of Object.entries(config)) {
        const input = this.page.getByLabel(new RegExp(key, 'i'));
        if (await input.isVisible()) {
          await input.fill(String(value));
        }
      }
    }
  }

  /**
   * Execute a macro by name
   */
  async executeMacro(name: string): Promise<void> {
    const macroCard = this.macroCards.filter({ hasText: name }).first();
    const executeButton = macroCard.locator('[data-testid="execute-macro"], button:has-text("Ejecutar")');
    await executeButton.click();
  }

  /**
   * Edit a macro by name
   */
  async editMacro(name: string): Promise<void> {
    const macroCard = this.macroCards.filter({ hasText: name }).first();
    const editButton = macroCard.locator('[data-testid="edit-macro"], button:has-text("Editar")');
    await editButton.click();
    await expect(this.macroEditor).toBeVisible();
  }

  /**
   * Delete a macro by name
   */
  async deleteMacro(name: string): Promise<void> {
    const macroCard = this.macroCards.filter({ hasText: name }).first();
    const deleteButton = macroCard.locator('[data-testid="delete-macro"]');
    await deleteButton.click();

    const confirmButton = this.page.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Duplicate a macro by name
   */
  async duplicateMacro(name: string): Promise<void> {
    const macroCard = this.macroCards.filter({ hasText: name }).first();
    const duplicateButton = macroCard.locator('[data-testid="duplicate-macro"], button:has-text("Duplicar")');
    await duplicateButton.click();
  }

  /**
   * Toggle macro enabled state
   */
  async toggleMacro(name: string): Promise<void> {
    const macroCard = this.macroCards.filter({ hasText: name }).first();
    const toggle = macroCard.locator('[data-testid="toggle-macro"], [role="switch"]');
    await toggle.click();
  }

  /**
   * Get macro count
   */
  async getMacroCount(): Promise<number> {
    return this.macroCards.count();
  }

  /**
   * Check if macro exists
   */
  async macroExists(name: string): Promise<boolean> {
    const macroCard = this.macroCards.filter({ hasText: name });
    return (await macroCard.count()) > 0;
  }

  /**
   * Open execution log
   */
  async openExecutionLog(): Promise<void> {
    const logButton = this.page.getByRole('button', { name: /log|historial|history/i });
    if (await logButton.isVisible()) {
      await logButton.click();
    }
    await expect(this.executionLog).toBeVisible();
  }

  /**
   * Export macros
   */
  async exportMacros(): Promise<void> {
    const exportButton = this.page.getByRole('button', { name: /exportar|export/i });
    await exportButton.click();
  }

  /**
   * Configure trigger
   */
  async configureTrigger(type: string, config: Record<string, any>): Promise<void> {
    await this.triggerSelect.selectOption(type);

    for (const [key, value] of Object.entries(config)) {
      const input = this.page.getByLabel(new RegExp(key, 'i'));
      if (await input.isVisible()) {
        await input.fill(String(value));
      }
    }
  }
}

export default MacroPage;
