/**
 * Collaboration Page Object
 * Page object for collaboration/session functionality
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CollaborationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get createSessionButton(): Locator {
    return this.page.getByRole('button', { name: /crear sesión|create session|nueva sesión/i });
  }

  get joinSessionButton(): Locator {
    return this.page.getByRole('button', { name: /unirse|join/i });
  }

  get sessionCodeInput(): Locator {
    return this.page.getByLabel(/código|code/i);
  }

  get sessionCodeDisplay(): Locator {
    return this.page.locator('[data-testid="session-code"]');
  }

  get collaboratorsList(): Locator {
    return this.page.locator('[data-testid="collaborators-list"]');
  }

  get chatPanel(): Locator {
    return this.page.locator('[data-testid="chat-panel"], [data-testid="moderator-chat"]');
  }

  get chatInput(): Locator {
    return this.page.getByPlaceholder(/mensaje|message|escribe/i);
  }

  get sendMessageButton(): Locator {
    return this.page.getByRole('button', { name: /enviar|send/i });
  }

  get connectionStatus(): Locator {
    return this.page.locator('[data-testid="connection-status"]');
  }

  get roleManager(): Locator {
    return this.page.locator('[data-testid="role-manager"]');
  }

  get actionLog(): Locator {
    return this.page.locator('[data-testid="action-log"]');
  }

  get leaveSessionButton(): Locator {
    return this.page.getByRole('button', { name: /salir|leave|abandonar/i });
  }

  /**
   * Navigate to collaboration panel
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    const collabButton = this.page.getByRole('button', { name: /colaboración|collaboration|equipo|team/i });
    if (await collabButton.isVisible()) {
      await collabButton.click();
    }
    await this.waitForPageLoad();
  }

  /**
   * Create a new collaboration session
   */
  async createSession(): Promise<string> {
    await this.createSessionButton.click();
    await expect(this.sessionCodeDisplay).toBeVisible({ timeout: 5000 });
    return (await this.sessionCodeDisplay.textContent()) || '';
  }

  /**
   * Join an existing session
   */
  async joinSession(code: string): Promise<void> {
    await this.joinSessionButton.click();
    await this.sessionCodeInput.fill(code);
    
    const confirmButton = this.page.getByRole('button', { name: /unirse|join|confirmar/i });
    await confirmButton.click();
  }


  /**
   * Leave current session
   */
  async leaveSession(): Promise<void> {
    await this.leaveSessionButton.click();
    
    const confirmButton = this.page.getByRole('button', { name: /confirmar|confirm|sí|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(message: string): Promise<void> {
    await this.chatInput.fill(message);
    await this.sendMessageButton.click();
  }

  /**
   * Get chat messages
   */
  async getChatMessages(): Promise<string[]> {
    const messages = this.chatPanel.locator('[data-testid="chat-message"]');
    const count = await messages.count();
    const texts: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await messages.nth(i).textContent();
      if (text) texts.push(text);
    }
    
    return texts;
  }

  /**
   * Get collaborators list
   */
  async getCollaborators(): Promise<string[]> {
    const collaborators = this.collaboratorsList.locator('[data-testid="collaborator"]');
    const count = await collaborators.count();
    const names: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const name = await collaborators.nth(i).textContent();
      if (name) names.push(name);
    }
    
    return names;
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(): Promise<string> {
    return (await this.connectionStatus.textContent()) || '';
  }

  /**
   * Check if connected
   */
  async isConnected(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return /conectado|connected|online/i.test(status);
  }

  /**
   * Assign role to collaborator
   */
  async assignRole(collaboratorName: string, role: string): Promise<void> {
    const collaborator = this.collaboratorsList.locator(`[data-testid="collaborator"]:has-text("${collaboratorName}")`);
    const roleSelect = collaborator.locator('select, [data-testid="role-select"]');
    
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption(role);
    }
  }

  /**
   * Open role manager
   */
  async openRoleManager(): Promise<void> {
    const roleButton = this.page.getByRole('button', { name: /roles|permisos|permissions/i });
    if (await roleButton.isVisible()) {
      await roleButton.click();
    }
    await expect(this.roleManager).toBeVisible();
  }

  /**
   * Open action log
   */
  async openActionLog(): Promise<void> {
    const logButton = this.page.getByRole('button', { name: /log|historial|acciones/i });
    if (await logButton.isVisible()) {
      await logButton.click();
    }
    await expect(this.actionLog).toBeVisible();
  }

  /**
   * Get action log entries
   */
  async getActionLogEntries(): Promise<string[]> {
    const entries = this.actionLog.locator('[data-testid="action-entry"]');
    const count = await entries.count();
    const texts: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await entries.nth(i).textContent();
      if (text) texts.push(text);
    }
    
    return texts;
  }

  /**
   * Copy session code to clipboard
   */
  async copySessionCode(): Promise<void> {
    const copyButton = this.page.getByRole('button', { name: /copiar|copy/i });
    if (await copyButton.isVisible()) {
      await copyButton.click();
    }
  }

  /**
   * Get session code
   */
  async getSessionCode(): Promise<string> {
    return (await this.sessionCodeDisplay.textContent()) || '';
  }

  /**
   * Check if in session
   */
  async isInSession(): Promise<boolean> {
    return (await this.sessionCodeDisplay.isVisible()) || 
           (await this.leaveSessionButton.isVisible());
  }

  /**
   * Wait for connection
   */
  async waitForConnection(timeout: number = 10000): Promise<void> {
    await expect(this.connectionStatus).toContainText(/conectado|connected/i, { timeout });
  }
}

export default CollaborationPage;
