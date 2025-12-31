// Collaboration Service - Orquestador principal de colaboración
import {
  CollaborationSession,
  Collaborator,
  CollaboratorRole,
  SyncAction,
  ChatMessage,
  ActionLogEntry,
  WSMessage,
  ConnectionInfo,
  CollaborationState,
  CollaborationEvent,
  CollaborationEventHandler,
  SessionSettings,
  Permission
} from '../../../types/collaboration';

import { SessionService, getSessionService } from './SessionService';
import { RoleService, getRoleService } from './RoleService';
import { SyncService, getSyncService } from './SyncService';
import { ChatService, getChatService } from './ChatService';
import { ActionLogService, getActionLogService } from './ActionLogService';
import { 
  CollaborationWebSocketService, 
  getCollaborationWebSocketService 
} from './CollaborationWebSocketService';

export interface CollaborationServiceOptions {
  sessionService?: SessionService;
  roleService?: RoleService;
  syncService?: SyncService;
  chatService?: ChatService;
  actionLogService?: ActionLogService;
  wsService?: CollaborationWebSocketService;
}

export class CollaborationService {
  private sessionService: SessionService;
  private roleService: RoleService;
  private syncService: SyncService;
  private chatService: ChatService;
  private actionLogService: ActionLogService;
  private wsService: CollaborationWebSocketService;

  private currentSession: CollaborationSession | null = null;
  private currentUser: Collaborator | null = null;
  private eventHandlers: Map<CollaborationEvent, Set<CollaborationEventHandler>> = new Map();
  private wsUnsubscribe: (() => void) | null = null;
  private connectionUnsubscribe: (() => void) | null = null;

  constructor(options: CollaborationServiceOptions = {}) {
    this.sessionService = options.sessionService || getSessionService();
    this.roleService = options.roleService || getRoleService();
    this.syncService = options.syncService || getSyncService();
    this.chatService = options.chatService || getChatService();
    this.actionLogService = options.actionLogService || getActionLogService();
    this.wsService = options.wsService || getCollaborationWebSocketService();
  }

  // ============================================
  // Session Management
  // ============================================

  async startSession(
    userId: string,
    userName: string,
    settings?: Partial<SessionSettings>
  ): Promise<{ success: boolean; session?: CollaborationSession; error?: string }> {
    try {
      // Create session
      const session = this.sessionService.createSession(userId, userName, settings);
      
      // Set up current user as owner
      this.currentUser = {
        id: userId,
        name: userName,
        role: 'owner',
        status: 'online',
        joinedAt: Date.now(),
        lastActiveAt: Date.now()
      };

      // Initialize role service with session
      this.roleService.setSessionCollaborators(session.collaborators);

      // Connect WebSocket
      const connected = await this.wsService.connect(session.code, this.currentUser);
      
      if (!connected) {
        // Clean up on failure
        this.sessionService.closeSession(session.id);
        return { success: false, error: 'No se pudo conectar al servidor' };
      }

      this.currentSession = session;
      this.setupWebSocketHandlers();

      // Log action
      this.actionLogService.logSessionAction('join', userId, userName);

      // Emit event
      this.emit('session:created', { session });

      return { success: true, session };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async joinSession(
    code: string,
    userId: string,
    userName: string,
    avatar?: string
  ): Promise<{ success: boolean; session?: CollaborationSession; error?: string }> {
    try {
      // Validate session first
      const validation = this.sessionService.validateSession(code);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Join session
      const result = this.sessionService.joinSession(code, userId, userName, avatar);
      if (!result.success || !result.session) {
        return { success: false, error: result.error };
      }

      // Set up current user
      const collaborator = result.session.collaborators.find(c => c.id === userId);
      if (!collaborator) {
        return { success: false, error: 'Error al unirse a la sesión' };
      }

      this.currentUser = collaborator;
      this.currentSession = result.session;

      // Initialize role service
      this.roleService.setSessionCollaborators(result.session.collaborators);

      // Connect WebSocket
      const connected = await this.wsService.connect(code, this.currentUser);
      
      if (!connected) {
        this.sessionService.leaveSession(result.session.id, userId);
        this.currentSession = null;
        this.currentUser = null;
        return { success: false, error: 'No se pudo conectar al servidor' };
      }

      this.setupWebSocketHandlers();

      // Log action
      this.actionLogService.logSessionAction('join', userId, userName);

      // Emit event
      this.emit('session:joined', { session: result.session, user: this.currentUser });

      return { success: true, session: result.session };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  leaveSession(): void {
    if (!this.currentSession || !this.currentUser) return;

    const sessionId = this.currentSession.id;
    const userId = this.currentUser.id;
    const userName = this.currentUser.name;

    // Log action before leaving
    this.actionLogService.logSessionAction('leave', userId, userName);

    // Leave session
    this.sessionService.leaveSession(sessionId, userId);

    // Disconnect WebSocket
    this.wsService.disconnect();
    this.cleanupWebSocketHandlers();

    // Emit event
    this.emit('session:left', { userId, userName });

    // Clear state
    this.currentSession = null;
    this.currentUser = null;
  }

  endSession(): boolean {
    if (!this.currentSession || !this.currentUser) return false;

    // Only owner can end session
    if (this.currentUser.role !== 'owner') {
      return false;
    }

    const sessionId = this.currentSession.id;

    // Close session
    this.sessionService.closeSession(sessionId);

    // Disconnect WebSocket
    this.wsService.disconnect();
    this.cleanupWebSocketHandlers();

    // Emit event
    this.emit('session:closed', { sessionId });

    // Clear state
    this.currentSession = null;
    this.currentUser = null;

    return true;
  }

  // ============================================
  // Action Broadcasting
  // ============================================

  broadcastAction(action: SyncAction): boolean {
    if (!this.currentSession || !this.currentUser) return false;

    // Check permission
    const permission = this.getPermissionForAction(action.type);
    if (permission && !this.roleService.checkPermission(this.currentUser.id, permission)) {
      return false;
    }

    // Apply locally first
    this.syncService.applyAction(action);

    // Broadcast via WebSocket
    this.wsService.sendAction(action);

    // Log action
    this.logSyncAction(action);

    return true;
  }

  private handleRemoteAction(action: SyncAction): void {
    // Check for conflicts
    const resolution = this.syncService.resolveConflict(action, action);
    
    if (resolution.resolution === 'accepted') {
      // Apply action
      this.syncService.applyAction(action);
      
      // Emit event
      this.emit('action:received', { action });
    } else {
      // Emit conflict event
      this.emit('action:conflict', { action, resolution });
    }
  }

  // ============================================
  // State Synchronization
  // ============================================

  requestStateSync(): void {
    if (!this.wsService.isConnected()) return;

    this.wsService.send({
      type: 'state_sync',
      payload: { requestSync: true },
      timestamp: Date.now()
    });
  }

  syncState(state: unknown, version: number): void {
    this.syncService.setState(state, version);
  }

  getState(): unknown {
    return this.syncService.getState();
  }

  getStateVersion(): number {
    return this.syncService.getStateVersion();
  }

  // ============================================
  // Chat
  // ============================================

  sendChatMessage(content: string): ChatMessage | null {
    if (!this.currentUser) return null;

    const message = this.chatService.sendMessage(
      this.currentUser.id,
      this.currentUser.name,
      content,
      this.currentUser.avatar
    );

    if (message) {
      this.wsService.sendChat(message);
    }

    return message;
  }

  getChatMessages(limit?: number): ChatMessage[] {
    return this.chatService.getMessages(limit);
  }

  setTyping(isTyping: boolean): void {
    if (!this.currentUser) return;
    
    this.chatService.setTyping(this.currentUser.id, this.currentUser.name, isTyping);
    this.wsService.sendTyping(isTyping);
  }

  // ============================================
  // Collaborator Management
  // ============================================

  kickCollaborator(userId: string, reason?: string): boolean {
    if (!this.currentSession || !this.currentUser) return false;

    const success = this.sessionService.kickCollaborator(
      this.currentSession.id,
      userId,
      this.currentUser.id
    );

    if (success) {
      // Send kick message via WebSocket
      this.wsService.send({
        type: 'kick',
        payload: { userId, reason },
        timestamp: Date.now()
      });

      // Log action
      const target = this.currentSession.collaborators.find(c => c.id === userId);
      this.actionLogService.logSessionAction(
        'kick',
        this.currentUser.id,
        this.currentUser.name,
        target?.name
      );

      // Update local session
      this.currentSession = this.sessionService.getSession(this.currentSession.id);
    }

    return success;
  }

  changeRole(userId: string, newRole: CollaboratorRole): boolean {
    if (!this.currentSession || !this.currentUser) return false;

    // Check permission
    if (!this.roleService.checkPermission(this.currentUser.id, 'collaborators:manage')) {
      return false;
    }

    const success = this.roleService.assignRole(userId, newRole);

    if (success) {
      // Send role change via WebSocket
      this.wsService.send({
        type: 'role_change',
        payload: { userId, newRole },
        timestamp: Date.now()
      });

      // Log action
      const target = this.currentSession.collaborators.find(c => c.id === userId);
      this.actionLogService.logSessionAction(
        'role_change',
        this.currentUser.id,
        this.currentUser.name,
        target?.name,
        newRole
      );
    }

    return success;
  }

  setCustomPermissions(userId: string, permissions: Permission[]): boolean {
    if (!this.currentSession || !this.currentUser) return false;

    if (!this.roleService.checkPermission(this.currentUser.id, 'collaborators:manage')) {
      return false;
    }

    return this.roleService.setCustomPermissions(userId, permissions);
  }

  transferOwnership(newOwnerId: string): boolean {
    if (!this.currentSession || !this.currentUser) return false;

    if (this.currentUser.role !== 'owner') {
      return false;
    }

    return this.roleService.transferOwnership(this.currentUser.id, newOwnerId);
  }

  // ============================================
  // Presence
  // ============================================

  setPresence(status: Collaborator['status']): void {
    if (!this.currentSession || !this.currentUser) return;

    this.sessionService.updateCollaboratorStatus(
      this.currentSession.id,
      this.currentUser.id,
      status
    );

    this.currentUser.status = status;
    this.wsService.sendPresence(status);
  }

  setEditing(itemId: string | null, itemType?: string): void {
    if (!this.currentSession || !this.currentUser) return;

    this.sessionService.setCollaboratorEditing(
      this.currentSession.id,
      this.currentUser.id,
      itemId
    );

    this.wsService.sendEditing(itemId, itemType);
  }

  // ============================================
  // Getters
  // ============================================

  getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }

  getCurrentUser(): Collaborator | null {
    return this.currentUser;
  }

  getCollaborators(): Collaborator[] {
    return this.currentSession?.collaborators || [];
  }

  getOnlineCollaborators(): Collaborator[] {
    if (!this.currentSession) return [];
    return this.sessionService.getOnlineCollaborators(this.currentSession.id);
  }

  getConnectionInfo(): ConnectionInfo {
    return this.wsService.getConnectionInfo();
  }

  isConnected(): boolean {
    return this.wsService.isConnected();
  }

  hasPermission(permission: Permission): boolean {
    if (!this.currentUser) return false;
    return this.roleService.checkPermission(this.currentUser.id, permission);
  }

  getActionLog(limit?: number): ActionLogEntry[] {
    return this.actionLogService.getRecentActions(limit);
  }

  // ============================================
  // Event Handling
  // ============================================

  on(event: CollaborationEvent, handler: CollaborationEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  private emit(event: CollaborationEvent, data: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => handler(event, data));
  }

  // ============================================
  // WebSocket Handlers
  // ============================================

  private setupWebSocketHandlers(): void {
    this.wsUnsubscribe = this.wsService.onMessage((message) => {
      this.handleWebSocketMessage(message);
    });

    this.connectionUnsubscribe = this.wsService.onConnectionChange((info) => {
      this.emit('connection:changed', info);
    });
  }

  private cleanupWebSocketHandlers(): void {
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe();
      this.wsUnsubscribe = null;
    }
    if (this.connectionUnsubscribe) {
      this.connectionUnsubscribe();
      this.connectionUnsubscribe = null;
    }
  }

  private handleWebSocketMessage(message: WSMessage): void {
    switch (message.type) {
      case 'action':
        this.handleRemoteAction((message.payload as any).action);
        break;

      case 'chat':
        const chatPayload = message.payload as any;
        this.chatService.receiveMessage(chatPayload.message);
        this.emit('chat:message', chatPayload.message);
        break;

      case 'presence':
        const presencePayload = message.payload as any;
        if (this.currentSession) {
          this.sessionService.updateCollaboratorStatus(
            this.currentSession.id,
            presencePayload.userId,
            presencePayload.status
          );
        }
        break;

      case 'typing':
        const typingPayload = message.payload as any;
        this.chatService.setTyping(
          typingPayload.userId,
          typingPayload.userName || 'Unknown',
          typingPayload.isTyping
        );
        break;

      case 'kick':
        const kickPayload = message.payload as any;
        if (this.currentUser && kickPayload.userId === this.currentUser.id) {
          this.emit('collaborator:kicked', { reason: kickPayload.reason });
          this.leaveSession();
        }
        break;

      case 'role_change':
        const rolePayload = message.payload as any;
        this.roleService.assignRole(rolePayload.userId, rolePayload.newRole);
        if (this.currentUser && rolePayload.userId === this.currentUser.id) {
          this.currentUser.role = rolePayload.newRole;
        }
        this.emit('collaborator:role_changed', rolePayload);
        break;

      case 'state_sync':
        const syncPayload = message.payload as any;
        this.syncState(syncPayload.state, syncPayload.version);
        break;

      case 'leave':
        const leavePayload = message.payload as any;
        this.emit('collaborator:left', { userId: leavePayload.userId });
        break;

      case 'join':
        const joinPayload = message.payload as any;
        this.emit('collaborator:joined', { user: joinPayload.user });
        break;

      case 'error':
        const errorPayload = message.payload as any;
        this.emit('error', errorPayload);
        break;
    }
  }

  // ============================================
  // Helpers
  // ============================================

  private getPermissionForAction(actionType: string): Permission | null {
    if (actionType.startsWith('poll:')) return 'polls:write';
    if (actionType.startsWith('prediction:')) return 'predictions:write';
    if (actionType.startsWith('giveaway:')) return 'giveaways:write';
    if (actionType.startsWith('timer:')) return 'timers:write';
    if (actionType.startsWith('obs:')) return 'obs:write';
    if (actionType.startsWith('settings:')) return 'settings:write';
    return null;
  }

  private logSyncAction(action: SyncAction): void {
    const categoryMap: Record<string, any> = {
      'poll': 'poll',
      'prediction': 'prediction',
      'giveaway': 'giveaway',
      'timer': 'timer',
      'obs': 'obs',
      'settings': 'settings'
    };

    const prefix = action.type.split(':')[0];
    const category = categoryMap[prefix] || 'other';

    this.actionLogService.logAction(
      action.type,
      action.userId,
      action.userName,
      JSON.stringify(action.payload).slice(0, 100),
      category
    );
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    this.leaveSession();
    this.eventHandlers.clear();
  }
}

// Singleton
let instance: CollaborationService | null = null;

export function getCollaborationService(): CollaborationService {
  if (!instance) {
    instance = new CollaborationService();
  }
  return instance;
}

export function resetCollaborationService(): void {
  if (instance) {
    instance.dispose();
  }
  instance = null;
}
