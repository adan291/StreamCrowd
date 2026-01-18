/**
 * OverlaySessionService - Manages secure sessions for overlay access
 * 
 * This service provides session-based authentication for overlay URLs,
 * ensuring that tokens are never exposed in URLs. Sessions are:
 * - Created with cryptographically secure UUIDs
 * - Time-limited (24 hours by default)
 * - Validated before granting overlay access
 * - Revocable by the user
 * 
 * @requirements 4.1, 4.2, 4.3, 4.5
 */

export interface OverlaySession {
  id: string;
  userId: string;
  overlayType: OverlayType;
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

export type OverlayType = 'poll' | 'giveaway' | 'game' | 'chat' | 'prediction' | 'timer' | 'alert';

export interface SessionValidationResult {
  valid: boolean;
  session?: OverlaySession;
  error?: string;
}

export interface CreateSessionOptions {
  ttlMs?: number;
  metadata?: Record<string, unknown>;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'streamcrowd_overlay_sessions';

export class OverlaySessionService {
  private sessions: Map<string, OverlaySession> = new Map();
  private readonly defaultTTL: number;

  constructor(defaultTTLMs: number = DEFAULT_TTL_MS) {
    this.defaultTTL = defaultTTLMs;
    this.loadFromStorage();
  }

  /**
   * Creates a new session for overlay access
   * 
   * @param userId - The ID of the user creating the session
   * @param overlayType - The type of overlay this session is for
   * @param options - Optional configuration (TTL, metadata)
   * @returns The session ID (UUID)
   * 
   * @requirements 4.1, 4.2
   */
  createSession(
    userId: string,
    overlayType: OverlayType,
    options: CreateSessionOptions = {}
  ): string {
    const ttl = options.ttlMs ?? this.defaultTTL;
    const now = new Date();
    
    const session: OverlaySession = {
      id: this.generateUUID(),
      userId,
      overlayType,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl),
      metadata: options.metadata,
    };

    this.sessions.set(session.id, session);
    this.saveToStorage();
    
    return session.id;
  }

  /**
   * Validates a session ID and returns the session if valid
   * 
   * @param sessionId - The session ID to validate
   * @returns Validation result with session data if valid
   * 
   * @requirements 4.3, 4.4
   */
  validateSession(sessionId: string): SessionValidationResult {
    // Check if session ID is a valid UUID format
    if (!this.isValidUUID(sessionId)) {
      return { valid: false, error: 'Invalid session ID format' };
    }

    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, error: 'Session not found' };
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      this.sessions.delete(sessionId);
      this.saveToStorage();
      return { valid: false, error: 'Session has expired' };
    }

    return { valid: true, session };
  }

  /**
   * Gets a session by ID without validation (for internal use)
   * 
   * @param sessionId - The session ID
   * @returns The session or null if not found
   */
  getSession(sessionId: string): OverlaySession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Revokes a session immediately
   * 
   * @param sessionId - The session ID to revoke
   * @returns true if session was revoked, false if not found
   * 
   * @requirements 4.5
   */
  revokeSession(sessionId: string): boolean {
    const existed = this.sessions.delete(sessionId);
    if (existed) {
      this.saveToStorage();
    }
    return existed;
  }

  /**
   * Revokes all sessions for a specific user
   * 
   * @param userId - The user ID whose sessions should be revoked
   * @returns Number of sessions revoked
   */
  revokeAllUserSessions(userId: string): number {
    let count = 0;
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        count++;
      }
    }
    if (count > 0) {
      this.saveToStorage();
    }
    return count;
  }

  /**
   * Generates a secure overlay URL with session ID
   * NEVER includes tokens, API keys, or sensitive data
   * 
   * @param sessionId - The session ID
   * @param baseUrl - The base URL for the overlay
   * @param additionalParams - Optional additional URL parameters (non-sensitive only)
   * @returns The complete overlay URL
   * 
   * @requirements 4.1, 4.6
   */
  generateOverlayUrl(
    sessionId: string,
    baseUrl: string,
    additionalParams?: Record<string, string>
  ): string {
    const url = new URL(`${baseUrl}/overlay`);
    url.searchParams.set('sessionId', sessionId);
    
    if (additionalParams) {
      for (const [key, value] of Object.entries(additionalParams)) {
        // Ensure we never include sensitive data
        if (!this.isSensitiveParam(key)) {
          url.searchParams.set(key, value);
        }
      }
    }
    
    return url.toString();
  }

  /**
   * Lists all active sessions for a user
   * 
   * @param userId - The user ID
   * @returns Array of active sessions
   */
  listUserSessions(userId: string): OverlaySession[] {
    const now = new Date();
    const sessions: OverlaySession[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.expiresAt > now) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }

  /**
   * Extends a session's expiration time
   * 
   * @param sessionId - The session ID
   * @param additionalMs - Additional time in milliseconds
   * @returns true if session was extended, false if not found
   */
  extendSession(sessionId: string, additionalMs: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.expiresAt = new Date(session.expiresAt.getTime() + additionalMs);
    this.saveToStorage();
    return true;
  }

  /**
   * Cleans up all expired sessions
   * 
   * @returns Number of sessions cleaned up
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let count = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    if (count > 0) {
      this.saveToStorage();
    }

    return count;
  }

  /**
   * Gets the total number of active sessions
   */
  getActiveSessionCount(): number {
    const now = new Date();
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.expiresAt > now) {
        count++;
      }
    }
    return count;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Generates a cryptographically secure UUID v4
   */
  private generateUUID(): string {
    // Use native crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback for older environments
    return this.generateUUIDFallback();
  }

  /**
   * Fallback UUID generation using crypto.getRandomValues
   */
  private generateUUIDFallback(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    
    // Set version (4) and variant (RFC4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * Validates UUID format
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Checks if a parameter name is sensitive and should not be included in URLs
   */
  private isSensitiveParam(key: string): boolean {
    const sensitiveKeys = [
      'token',
      'access_token',
      'refresh_token',
      'api_key',
      'apikey',
      'secret',
      'password',
      'auth',
      'authorization',
      'bearer',
      'credential',
    ];
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }

  /**
   * Loads sessions from storage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as Array<{
          id: string;
          userId: string;
          overlayType: OverlayType;
          createdAt: string;
          expiresAt: string;
          metadata?: Record<string, unknown>;
        }>;
        
        const now = new Date();
        for (const item of parsed) {
          const session: OverlaySession = {
            ...item,
            createdAt: new Date(item.createdAt),
            expiresAt: new Date(item.expiresAt),
          };
          
          // Only load non-expired sessions
          if (session.expiresAt > now) {
            this.sessions.set(session.id, session);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load overlay sessions from storage:', error);
    }
  }

  /**
   * Saves sessions to storage
   */
  private saveToStorage(): void {
    try {
      const sessions = Array.from(this.sessions.values()).map(session => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save overlay sessions to storage:', error);
    }
  }
}

// Singleton instance
let instance: OverlaySessionService | null = null;

/**
 * Gets the singleton instance of OverlaySessionService
 */
export function getOverlaySessionService(): OverlaySessionService {
  if (!instance) {
    instance = new OverlaySessionService();
  }
  return instance;
}

/**
 * Resets the singleton instance (for testing)
 */
export function resetOverlaySessionService(): void {
  instance = null;
}
