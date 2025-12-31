/**
 * AuthService - Centralized authentication state management
 * 
 * This service provides a single source of truth for authentication state
 * across the application. It handles:
 * - Twitch OAuth tokens (full API access)
 * - Anonymous chat connections (read-only)
 * - No connection state
 * 
 * @module src/application/services/AuthService
 */

export type AuthMode = 'oauth' | 'anonymous' | 'none';

export interface AuthState {
  /** Current authentication mode */
  mode: AuthMode;
  /** OAuth access token (only available in 'oauth' mode) */
  token: string | null;
  /** User ID / Broadcaster ID */
  userId: string | null;
  /** Channel name */
  channelName: string | null;
  /** Token scopes (permissions) */
  scopes: string[];
  /** Token expiration time in seconds */
  expiresIn: number | null;
  /** Whether the token is valid */
  isValid: boolean;
}

export interface AuthCapabilities {
  /** Can read chat messages */
  canReadChat: boolean;
  /** Can send chat messages */
  canSendChat: boolean;
  /** Can access Twitch Helix API */
  canAccessAPI: boolean;
  /** Can read chatters list */
  canReadChatters: boolean;
  /** Can read subscribers */
  canReadSubscribers: boolean;
  /** Can read/manage moderation (ban/timeout) */
  canModerate: boolean;
  /** Can read VIPs */
  canReadVIPs: boolean;
  /** Can manage VIPs (add/remove) */
  canManageVIPs: boolean;
  /** Can read bits leaderboard */
  canReadBits: boolean;
  /** Can delete chat messages */
  canDeleteMessages: boolean;
  /** Can manage chat settings (slow mode, etc.) */
  canManageChatSettings: boolean;
  /** Can send announcements */
  canSendAnnouncements: boolean;
  /** Can manage predictions (create, lock, resolve, cancel) */
  canManagePredictions: boolean;
  /** Can manage channel point redemptions */
  canManageRedemptions: boolean;
}

// Required scopes for each capability
const SCOPE_REQUIREMENTS: Record<keyof Omit<AuthCapabilities, 'canReadChat' | 'canAccessAPI'>, string[]> = {
  canSendChat: ['chat:edit'],
  canReadChatters: ['moderator:read:chatters'],
  canReadSubscribers: ['channel:read:subscriptions'],
  canModerate: ['moderator:manage:banned_users', 'moderation:read'],
  canReadVIPs: ['channel:read:vips'],
  canManageVIPs: ['channel:manage:vips'],
  canReadBits: ['bits:read'],
  canDeleteMessages: ['moderator:manage:chat_messages'],
  canManageChatSettings: ['moderator:manage:chat_settings'],
  canSendAnnouncements: ['moderator:manage:announcements'],
  canManagePredictions: ['channel:manage:predictions'],
  canManageRedemptions: ['channel:manage:redemptions'],
};

const DEFAULT_AUTH_STATE: AuthState = {
  mode: 'none',
  token: null,
  userId: null,
  channelName: null,
  scopes: [],
  expiresIn: null,
  isValid: false,
};

type AuthStateListener = (state: AuthState) => void;

/**
 * AuthService - Singleton service for managing authentication state
 */
class AuthServiceImpl {
  private state: AuthState = { ...DEFAULT_AUTH_STATE };
  private listeners: Set<AuthStateListener> = new Set();

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Get current authentication mode
   */
  getMode(): AuthMode {
    return this.state.mode;
  }

  /**
   * Check if user is authenticated with OAuth
   */
  isAuthenticated(): boolean {
    return this.state.mode === 'oauth' && this.state.isValid && !!this.state.token;
  }

  /**
   * Check if connected (either OAuth or anonymous)
   */
  isConnected(): boolean {
    return this.state.mode !== 'none';
  }

  /**
   * Get the OAuth token (null if not authenticated)
   */
  getToken(): string | null {
    return this.state.mode === 'oauth' ? this.state.token : null;
  }

  /**
   * Get user/broadcaster ID
   */
  getUserId(): string | null {
    return this.state.userId;
  }

  /**
   * Get channel name
   */
  getChannelName(): string | null {
    return this.state.channelName;
  }

  /**
   * Get current capabilities based on auth state and scopes
   */
  getCapabilities(): AuthCapabilities {
    const { mode, scopes, isValid } = this.state;

    // No connection = no capabilities
    if (mode === 'none') {
      return {
        canReadChat: false,
        canSendChat: false,
        canAccessAPI: false,
        canReadChatters: false,
        canReadSubscribers: false,
        canModerate: false,
        canReadVIPs: false,
        canManageVIPs: false,
        canReadBits: false,
        canDeleteMessages: false,
        canManageChatSettings: false,
        canSendAnnouncements: false,
        canManagePredictions: false,
        canManageRedemptions: false,
      };
    }

    // Anonymous = only read chat
    if (mode === 'anonymous') {
      return {
        canReadChat: true,
        canSendChat: false,
        canAccessAPI: false,
        canReadChatters: false,
        canReadSubscribers: false,
        canModerate: false,
        canReadVIPs: false,
        canManageVIPs: false,
        canReadBits: false,
        canDeleteMessages: false,
        canManageChatSettings: false,
        canSendAnnouncements: false,
        canManagePredictions: false,
        canManageRedemptions: false,
      };
    }

    // OAuth mode - check scopes
    const hasScope = (required: string[]) => 
      required.some(scope => scopes.includes(scope));

    return {
      canReadChat: true,
      canSendChat: isValid && hasScope(SCOPE_REQUIREMENTS.canSendChat),
      canAccessAPI: isValid,
      canReadChatters: isValid && hasScope(SCOPE_REQUIREMENTS.canReadChatters),
      canReadSubscribers: isValid && hasScope(SCOPE_REQUIREMENTS.canReadSubscribers),
      canModerate: isValid && hasScope(SCOPE_REQUIREMENTS.canModerate),
      canReadVIPs: isValid && hasScope(SCOPE_REQUIREMENTS.canReadVIPs),
      canManageVIPs: isValid && hasScope(SCOPE_REQUIREMENTS.canManageVIPs),
      canReadBits: isValid && hasScope(SCOPE_REQUIREMENTS.canReadBits),
      canDeleteMessages: isValid && hasScope(SCOPE_REQUIREMENTS.canDeleteMessages),
      canManageChatSettings: isValid && hasScope(SCOPE_REQUIREMENTS.canManageChatSettings),
      canSendAnnouncements: isValid && hasScope(SCOPE_REQUIREMENTS.canSendAnnouncements),
      canManagePredictions: isValid && hasScope(SCOPE_REQUIREMENTS.canManagePredictions),
      canManageRedemptions: isValid && hasScope(SCOPE_REQUIREMENTS.canManageRedemptions),
    };
  }

  /**
   * Check if a specific capability is available
   */
  hasCapability(capability: keyof AuthCapabilities): boolean {
    return this.getCapabilities()[capability];
  }

  /**
   * Set OAuth authentication
   */
  setOAuthAuth(params: {
    token: string;
    userId?: string;
    channelName?: string;
    scopes?: string[];
    expiresIn?: number;
  }): void {
    this.state = {
      mode: 'oauth',
      token: params.token,
      userId: params.userId || null,
      channelName: params.channelName || null,
      scopes: params.scopes || [],
      expiresIn: params.expiresIn || null,
      isValid: true,
    };
    this.notifyListeners();
  }

  /**
   * Set anonymous connection (chat only, no API)
   */
  setAnonymousAuth(channelName: string): void {
    this.state = {
      mode: 'anonymous',
      token: null,
      userId: null,
      channelName,
      scopes: [],
      expiresIn: null,
      isValid: true,
    };
    this.notifyListeners();
  }

  /**
   * Update user ID (after fetching from API)
   */
  setUserId(userId: string): void {
    this.state = { ...this.state, userId };
    this.notifyListeners();
  }

  /**
   * Update channel name
   */
  setChannelName(channelName: string): void {
    this.state = { ...this.state, channelName };
    this.notifyListeners();
  }

  /**
   * Update scopes (after token validation)
   */
  setScopes(scopes: string[]): void {
    this.state = { ...this.state, scopes };
    this.notifyListeners();
  }

  /**
   * Mark token as invalid
   */
  invalidateToken(): void {
    this.state = { ...this.state, isValid: false };
    this.notifyListeners();
  }

  /**
   * Clear authentication (logout/disconnect)
   */
  clear(): void {
    this.state = { ...DEFAULT_AUTH_STATE };
    this.notifyListeners();
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (e) {
        console.error('Error in auth state listener:', e);
      }
    });
  }
}

// Singleton instance
export const AuthService = new AuthServiceImpl();

// Helper function to get token safely (returns null if not authenticated)
export function getAuthToken(): string | null {
  return AuthService.getToken();
}

// Helper function to check if API calls are allowed
export function canAccessTwitchAPI(): boolean {
  return AuthService.hasCapability('canAccessAPI');
}

// Helper to wrap API calls with auth check
export async function withAuthCheck<T>(
  capability: keyof AuthCapabilities,
  apiCall: (token: string) => Promise<T>,
  fallback?: T
): Promise<T | null> {
  if (!AuthService.hasCapability(capability)) {
    console.warn(`API call blocked: missing capability '${capability}'`);
    return fallback ?? null;
  }
  
  const token = AuthService.getToken();
  if (!token) {
    console.warn('API call blocked: no token available');
    return fallback ?? null;
  }
  
  try {
    return await apiCall(token);
  } catch (error) {
    console.error('API call failed:', error);
    return fallback ?? null;
  }
}
