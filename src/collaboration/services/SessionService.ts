// Session Service - Gestiona sesiones colaborativas
import {
  CollaborationSession,
  Collaborator,
  CollaboratorRole,
  SessionSettings,
  SessionInfo,
  DEFAULT_SESSION_SETTINGS,
  ROLE_PERMISSIONS
} from '../../../types/collaboration';

const SESSION_CODE_LENGTH = 6;
const SESSION_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin I, O, 0, 1 para evitar confusión
const STORAGE_KEY = 'twitchvote_collab_sessions';

export class SessionService {
  private sessions: Map<string, CollaborationSession> = new Map();
  private codeToId: Map<string, string> = new Map();
  private listeners: Set<(sessions: CollaborationSession[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // ============================================
  // Session Code Generation
  // ============================================

  generateSessionCode(): string {
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = '';
      for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * SESSION_CODE_CHARS.length);
        code += SESSION_CODE_CHARS[randomIndex];
      }
      attempts++;
    } while (this.codeToId.has(code) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('No se pudo generar un código único');
    }

    return code;
  }

  // ============================================
  // Session Creation
  // ============================================

  createSession(
    ownerId: string,
    ownerName: string,
    settings: Partial<SessionSettings> = {}
  ): CollaborationSession {
    const code = this.generateSessionCode();
    const now = Date.now();
    const mergedSettings = { ...DEFAULT_SESSION_SETTINGS, ...settings };

    const owner: Collaborator = {
      id: ownerId,
      name: ownerName,
      role: 'owner',
      status: 'online',
      joinedAt: now,
      lastActiveAt: now
    };

    const session: CollaborationSession = {
      id: `session-${now}-${Math.random().toString(36).slice(2, 8)}`,
      code,
      ownerId,
      ownerName,
      createdAt: now,
      expiresAt: now + mergedSettings.autoExpireMinutes * 60 * 1000,
      settings: mergedSettings,
      collaborators: [owner],
      stateVersion: 0
    };

    this.sessions.set(session.id, session);
    this.codeToId.set(code, session.id);
    this.saveToStorage();
    this.notifyListeners();

    return session;
  }

  // ============================================
  // Session Joining
  // ============================================

  joinSession(
    code: string,
    userId: string,
    userName: string,
    avatar?: string
  ): { success: boolean; session?: CollaborationSession; error?: string } {
    const sessionId = this.codeToId.get(code.toUpperCase());
    if (!sessionId) {
      return { success: false, error: 'Código de sesión inválido' };
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      this.closeSession(session.id);
      return { success: false, error: 'La sesión ha expirado' };
    }

    // Check max collaborators
    if (session.collaborators.length >= session.settings.maxCollaborators) {
      return { success: false, error: 'La sesión está llena' };
    }

    // Check if user already in session
    const existingUser = session.collaborators.find(c => c.id === userId);
    if (existingUser) {
      // Update status to online
      existingUser.status = 'online';
      existingUser.lastActiveAt = Date.now();
      this.saveToStorage();
      return { success: true, session };
    }

    // Add new collaborator
    const now = Date.now();
    const newCollaborator: Collaborator = {
      id: userId,
      name: userName,
      avatar,
      role: 'moderator', // Default role for new joiners
      status: 'online',
      joinedAt: now,
      lastActiveAt: now
    };

    session.collaborators.push(newCollaborator);
    this.saveToStorage();
    this.notifyListeners();

    return { success: true, session };
  }

  // ============================================
  // Session Leaving
  // ============================================

  leaveSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const index = session.collaborators.findIndex(c => c.id === userId);
    if (index === -1) return false;

    const collaborator = session.collaborators[index];

    // If owner leaves, close the session
    if (collaborator.role === 'owner') {
      return this.closeSession(sessionId);
    }

    // Remove collaborator
    session.collaborators.splice(index, 1);
    this.saveToStorage();
    this.notifyListeners();

    return true;
  }

  // ============================================
  // Session Queries
  // ============================================

  getSession(sessionId: string): CollaborationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getSessionByCode(code: string): CollaborationSession | null {
    const sessionId = this.codeToId.get(code.toUpperCase());
    if (!sessionId) return null;
    return this.sessions.get(sessionId) || null;
  }

  validateSession(code: string): { valid: boolean; info?: SessionInfo; error?: string } {
    const session = this.getSessionByCode(code);
    
    if (!session) {
      return { valid: false, error: 'Código de sesión inválido' };
    }

    if (Date.now() > session.expiresAt) {
      return { valid: false, error: 'La sesión ha expirado' };
    }

    if (session.collaborators.length >= session.settings.maxCollaborators) {
      return { valid: false, error: 'La sesión está llena' };
    }

    return {
      valid: true,
      info: {
        code: session.code,
        ownerName: session.ownerName,
        collaboratorCount: session.collaborators.length,
        createdAt: session.createdAt
      }
    };
  }

  listSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values());
  }

  // ============================================
  // Session Management
  // ============================================

  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.codeToId.delete(session.code);
    this.sessions.delete(sessionId);
    this.saveToStorage();
    this.notifyListeners();

    return true;
  }

  updateSettings(sessionId: string, settings: Partial<SessionSettings>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.settings = { ...session.settings, ...settings };
    
    // Update expiration if autoExpireMinutes changed
    if (settings.autoExpireMinutes !== undefined) {
      session.expiresAt = session.createdAt + settings.autoExpireMinutes * 60 * 1000;
    }

    this.saveToStorage();
    this.notifyListeners();

    return true;
  }

  extendSession(sessionId: string, additionalMinutes: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.expiresAt += additionalMinutes * 60 * 1000;
    this.saveToStorage();

    return true;
  }

  // ============================================
  // Collaborator Management
  // ============================================

  kickCollaborator(sessionId: string, userId: string, kickerId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Check if kicker has permission
    const kicker = session.collaborators.find(c => c.id === kickerId);
    if (!kicker || (kicker.role !== 'owner' && kicker.role !== 'admin')) {
      return false;
    }

    // Can't kick owner
    const target = session.collaborators.find(c => c.id === userId);
    if (!target || target.role === 'owner') {
      return false;
    }

    // Admin can't kick other admins
    if (kicker.role === 'admin' && target.role === 'admin') {
      return false;
    }

    const index = session.collaborators.findIndex(c => c.id === userId);
    if (index !== -1) {
      session.collaborators.splice(index, 1);
      this.saveToStorage();
      this.notifyListeners();
      return true;
    }

    return false;
  }

  updateCollaboratorStatus(
    sessionId: string,
    userId: string,
    status: Collaborator['status']
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const collaborator = session.collaborators.find(c => c.id === userId);
    if (!collaborator) return false;

    collaborator.status = status;
    collaborator.lastActiveAt = Date.now();
    this.saveToStorage();

    return true;
  }

  setCollaboratorEditing(
    sessionId: string,
    userId: string,
    itemId: string | null
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const collaborator = session.collaborators.find(c => c.id === userId);
    if (!collaborator) return false;

    collaborator.currentlyEditing = itemId || undefined;
    collaborator.lastActiveAt = Date.now();
    this.saveToStorage();

    return true;
  }

  // ============================================
  // State Version
  // ============================================

  incrementStateVersion(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return -1;

    session.stateVersion++;
    this.saveToStorage();

    return session.stateVersion;
  }

  getStateVersion(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session?.stateVersion ?? -1;
  }

  // ============================================
  // Cleanup
  // ============================================

  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.codeToId.delete(session.code);
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveToStorage();
      this.notifyListeners();
    }

    return cleaned;
  }

  // ============================================
  // Listeners
  // ============================================

  subscribe(listener: (sessions: CollaborationSession[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const sessions = this.listSessions();
    this.listeners.forEach(listener => listener(sessions));
  }

  // ============================================
  // Persistence
  // ============================================

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const sessions = JSON.parse(data) as CollaborationSession[];
        const now = Date.now();
        
        for (const session of sessions) {
          // Skip expired sessions
          if (now > session.expiresAt) continue;
          
          // Mark all collaborators as offline on load
          session.collaborators.forEach(c => {
            c.status = 'offline';
          });
          
          this.sessions.set(session.id, session);
          this.codeToId.set(session.code, session.id);
        }
      }
    } catch (error) {
      console.error('Failed to load sessions from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const sessions = this.listSessions();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save sessions to storage:', error);
    }
  }

  // ============================================
  // Utilities
  // ============================================

  isCodeValid(code: string): boolean {
    if (code.length !== SESSION_CODE_LENGTH) return false;
    return code.split('').every(char => SESSION_CODE_CHARS.includes(char.toUpperCase()));
  }

  getCollaborator(sessionId: string, userId: string): Collaborator | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return session.collaborators.find(c => c.id === userId) || null;
  }

  getOnlineCollaborators(sessionId: string): Collaborator[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.collaborators.filter(c => c.status === 'online');
  }
}

// Singleton
let instance: SessionService | null = null;

export function getSessionService(): SessionService {
  if (!instance) {
    instance = new SessionService();
  }
  return instance;
}

export function resetSessionService(): void {
  instance = null;
}
