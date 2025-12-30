/**
 * Collaboration WebSocket Mock
 * Mocks collaboration/multi-moderator WebSocket connections
 */

import { Page } from '@playwright/test';

export interface CollaborationMockConfig {
  sessionId?: string;
  hostId?: string;
  collaborators?: Array<{
    id: string;
    name: string;
    role: 'host' | 'moderator' | 'viewer';
    isOnline: boolean;
  }>;
  isHost?: boolean;
}

const defaultConfig: CollaborationMockConfig = {
  sessionId: 'session_123',
  hostId: 'host_123',
  collaborators: [
    { id: 'host_123', name: 'HostUser', role: 'host', isOnline: true },
    { id: 'mod_1', name: 'Moderator1', role: 'moderator', isOnline: true },
    { id: 'mod_2', name: 'Moderator2', role: 'moderator', isOnline: false },
  ],
  isHost: true,
};

/**
 * Setup collaboration WebSocket mock
 */
export async function setupCollaborationMock(page: Page, config: CollaborationMockConfig = {}): Promise<void> {
  const mockConfig = { ...defaultConfig, ...config };

  await page.addInitScript((cfg) => {
    const state = {
      sessionId: cfg.sessionId,
      hostId: cfg.hostId,
      collaborators: cfg.collaborators || [],
      isHost: cfg.isHost ?? true,
      messages: [] as Array<{ from: string; message: string; timestamp: number }>,
      actions: [] as Array<{ userId: string; action: string; timestamp: number }>,
    };

    class MockCollaborationWebSocket {
      private handlers: Map<string, Set<Function>> = new Map();
      private connected = false;

      async connect(sessionId: string, token: string): Promise<void> {
        this.connected = true;
        state.sessionId = sessionId;
        
        setTimeout(() => {
          this.emit('connected', { sessionId: state.sessionId });
          this.emit('collaborators', { collaborators: state.collaborators });
        }, 10);
      }

      async disconnect(): Promise<void> {
        this.connected = false;
        this.emit('disconnected');
      }

      async createSession(): Promise<string> {
        const newSessionId = `session_${Date.now()}`;
        state.sessionId = newSessionId;
        return newSessionId;
      }

      async joinSession(sessionId: string, code: string): Promise<boolean> {
        if (code.length === 6) {
          state.sessionId = sessionId;
          this.emit('joined', { sessionId });
          return true;
        }
        return false;
      }

      async sendMessage(message: string): Promise<void> {
        const msg = {
          from: state.isHost ? state.hostId! : 'current_user',
          message,
          timestamp: Date.now(),
        };
        state.messages.push(msg);
        this.emit('message', msg);
      }

      async sendAction(action: string, data?: any): Promise<void> {
        const actionLog = {
          userId: state.isHost ? state.hostId! : 'current_user',
          action,
          data,
          timestamp: Date.now(),
        };
        state.actions.push(actionLog);
        this.emit('action', actionLog);
      }

      async updateRole(userId: string, role: 'moderator' | 'viewer'): Promise<void> {
        const collaborator = state.collaborators.find(c => c.id === userId);
        if (collaborator) {
          collaborator.role = role;
          this.emit('roleUpdated', { userId, role });
        }
      }

      async kickUser(userId: string): Promise<void> {
        state.collaborators = state.collaborators.filter(c => c.id !== userId);
        this.emit('userKicked', { userId });
        this.emit('collaborators', { collaborators: state.collaborators });
      }

      getCollaborators() {
        return state.collaborators;
      }

      getMessages() {
        return state.messages;
      }

      getActions() {
        return state.actions;
      }

      isConnected() {
        return this.connected;
      }

      on(eventName: string, handler: Function): void {
        if (!this.handlers.has(eventName)) {
          this.handlers.set(eventName, new Set());
        }
        this.handlers.get(eventName)!.add(handler);
      }

      off(eventName: string, handler: Function): void {
        this.handlers.get(eventName)?.delete(handler);
      }

      private emit(eventName: string, data?: any): void {
        this.handlers.get(eventName)?.forEach(handler => handler(data));
      }
    }

    (window as any).CollaborationWebSocket = MockCollaborationWebSocket;
    (window as any).mockCollaborationState = state;
  }, mockConfig);
}

/**
 * Simulate a collaborator joining
 */
export async function simulateCollaboratorJoin(page: Page, collaborator: {
  id: string;
  name: string;
  role: 'moderator' | 'viewer';
}): Promise<void> {
  await page.evaluate((collab) => {
    const state = (window as any).mockCollaborationState;
    if (state) {
      state.collaborators.push({ ...collab, isOnline: true });
      window.dispatchEvent(new CustomEvent('collaboration-user-joined', {
        detail: collab,
      }));
    }
  }, collaborator);
}

/**
 * Simulate a collaborator leaving
 */
export async function simulateCollaboratorLeave(page: Page, collaboratorId: string): Promise<void> {
  await page.evaluate((id) => {
    const state = (window as any).mockCollaborationState;
    if (state) {
      const collab = state.collaborators.find((c: any) => c.id === id);
      if (collab) {
        collab.isOnline = false;
      }
      window.dispatchEvent(new CustomEvent('collaboration-user-left', {
        detail: { userId: id },
      }));
    }
  }, collaboratorId);
}

/**
 * Simulate receiving a chat message
 */
export async function simulateChatMessage(page: Page, from: string, message: string): Promise<void> {
  await page.evaluate(({ f, m }) => {
    window.dispatchEvent(new CustomEvent('collaboration-message', {
      detail: {
        from: f,
        message: m,
        timestamp: Date.now(),
      },
    }));
  }, { f: from, m: message });
}

/**
 * Simulate an action from another collaborator
 */
export async function simulateCollaboratorAction(page: Page, userId: string, action: string, data?: any): Promise<void> {
  await page.evaluate(({ uid, act, d }) => {
    window.dispatchEvent(new CustomEvent('collaboration-action', {
      detail: {
        userId: uid,
        action: act,
        data: d,
        timestamp: Date.now(),
      },
    }));
  }, { uid: userId, act: action, d: data });
}

export default {
  setupCollaborationMock,
  simulateCollaboratorJoin,
  simulateCollaboratorLeave,
  simulateChatMessage,
  simulateCollaboratorAction,
};
