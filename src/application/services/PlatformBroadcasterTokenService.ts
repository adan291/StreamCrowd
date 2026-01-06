/**
 * PlatformBroadcasterTokenService - Multi-platform broadcaster token management
 * 
 * Extends the BroadcasterTokenService concept to support multiple platforms
 * (Twitch, YouTube, Kick). Allows moderators to execute actions that require
 * the broadcaster's token (predictions, polls, raids, etc.)
 * 
 * FLOW:
 * 1. The streamer authorizes the app → their token is saved in Firebase
 * 2. Moderators log in with their accounts
 * 3. When a mod selects a channel where they moderate, they can use the broadcaster's token
 *    (if the broadcaster has previously authorized)
 * 
 * SECURITY:
 * - Tokens are stored in Firebase Realtime Database
 * - Token usage is only allowed if the user is a verified moderator of the channel
 * - Tokens are encrypted before storage (basic encryption, use better encryption for production)
 * 
 * @requirements 2.6 - WHEN the toggle is set to OFF, THE Platform_Adapter SHALL disconnect but THE Token_Storage SHALL retain the credentials
 * @requirements 2.7 - WHEN the toggle is set to ON for a platform with stored credentials, THE Platform_Adapter SHALL automatically reconnect
 * @module src/application/services/PlatformBroadcasterTokenService
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off, Database } from 'firebase/database';
import type { Platform } from '../../../types/platform';

// Firebase config (same as BroadcasterTokenService)
const FIREBASE_CONFIG = {
  apiKey: "REDACTED_FIREBASE_API_KEY",
  authDomain: "twtich-vote-live.firebaseapp.com",
  databaseURL: "https://twtich-vote-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "twtich-vote-live",
  storageBucket: "twtich-vote-live.firebasestorage.app",
  messagingSenderId: "779005710594",
  appId: "1:779005710594:web:8df44b0c02a57fc262b21b",
};

// Firebase path with platform prefix
const FIREBASE_BASE_PATH = 'platform_broadcaster_tokens';

// ============================================
// Types
// ============================================

/**
 * Stored broadcaster token for any platform
 */
export interface StoredBroadcasterToken {
  /** Platform identifier */
  platform: Platform;
  /** Broadcaster's user ID */
  broadcasterId: string;
  /** Broadcaster's login name (lowercase) */
  broadcasterLogin: string;
  /** Broadcaster's display name */
  broadcasterName: string;
  /** Access token OAuth (encrypted in Firebase) */
  accessToken: string;
  /** Refresh token OAuth (encrypted in Firebase, optional) */
  refreshToken?: string;
  /** Authorized scopes */
  scopes: string[];
  /** Timestamp when stored */
  storedAt: number;
  /** Timestamp of expiration (if known) */
  expiresAt?: number;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  expiresIn?: number;
  scopes?: string[];
  error?: string;
}

/**
 * Broadcaster capabilities based on platform and scopes
 */
export interface BroadcasterCapabilities {
  canCreatePolls: boolean;
  canCreatePredictions: boolean;
  canStartRaids: boolean;
  canManageRewards: boolean;
  canModerateChat: boolean;
  canManageBroadcast: boolean;
}

/**
 * Platform-specific broadcaster scopes
 */
export const PLATFORM_BROADCASTER_SCOPES: Record<Platform, {
  predictions?: string;
  polls?: string;
  raids?: string;
  broadcast?: string;
  rewards?: string;
  moderator: string[];
  all: string[];
}> = {
  twitch: {
    predictions: 'channel:manage:predictions',
    polls: 'channel:manage:polls',
    raids: 'channel:manage:raids',
    broadcast: 'channel:manage:broadcast',
    rewards: 'channel:manage:redemptions',
    moderator: [
      'moderator:manage:chat_settings',
      'moderator:manage:announcements',
      'moderator:manage:shoutouts',
      'moderator:manage:chat_messages',
      'moderator:manage:banned_users',
    ],
    all: [
      'channel:manage:predictions',
      'channel:manage:polls',
      'channel:manage:raids',
      'channel:manage:broadcast',
      'channel:manage:redemptions',
      'moderator:manage:chat_settings',
      'moderator:manage:announcements',
      'moderator:manage:shoutouts',
      'moderator:manage:chat_messages',
      'moderator:manage:banned_users',
      'channel:read:subscriptions',
      'channel:read:vips',
      'bits:read',
      'moderation:read',
      'moderator:read:chatters',
      'moderator:read:followers',
      'chat:read',
      'chat:edit',
      'clips:edit',
    ],
  },
  youtube: {
    polls: undefined, // YouTube uses chat-based polls
    broadcast: 'https://www.googleapis.com/auth/youtube',
    moderator: [
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ],
    all: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.channel-memberships.creator',
      'https://www.googleapis.com/auth/youtube',
    ],
  },
  kick: {
    polls: undefined, // Kick uses chat-based polls
    moderator: [
      'chat:write',
      'channel:moderate',
    ],
    all: [
      'user:read',
      'channel:read',
      'chat:write',
      'chat:read',
      'channel:moderate',
    ],
  },
};

// ============================================
// Simple Encryption (for basic protection)
// In production, use proper encryption or a secure backend
// ============================================

const ENCRYPTION_KEY = 'streamcrowd_platform_2024_key';

function simpleEncrypt(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result);
}

function simpleDecrypt(encoded: string): string {
  try {
    const text = atob(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return result;
  } catch {
    return '';
  }
}

// ============================================
// Service Class
// ============================================

class PlatformBroadcasterTokenServiceImpl {
  private database: Database | null = null;
  private tokensCache: Map<string, StoredBroadcasterToken> = new Map();
  private listeners: Set<() => void> = new Set();
  private subscriptions: Map<string, () => void> = new Map();
  private initialized = false;

  constructor() {
    this.initFirebase();
  }

  private initFirebase(): void {
    try {
      const apps = getApps();
      const app = apps.length > 0 ? apps[0] : initializeApp(FIREBASE_CONFIG, 'platform-broadcaster-tokens');
      this.database = getDatabase(app);
      this.initialized = true;
      console.log('[PlatformBroadcasterTokenService] Firebase initialized');
    } catch (err) {
      console.error('[PlatformBroadcasterTokenService] Error initializing Firebase:', err);
    }
  }

  /**
   * Get the cache key for a platform and broadcaster
   */
  private getCacheKey(platform: Platform, broadcasterId: string): string {
    return `${platform}:${broadcasterId}`;
  }

  /**
   * Get the Firebase path for a platform and broadcaster
   */
  private getFirebasePath(platform: Platform, broadcasterId: string): string {
    return `${FIREBASE_BASE_PATH}/${platform}/${broadcasterId}`;
  }

  // ============================================
  // Token Management
  // ============================================

  /**
   * Store broadcaster token in Firebase
   * Called when a streamer authorizes the app
   */
  async storeBroadcasterToken(
    platform: Platform,
    data: {
      broadcasterId: string;
      broadcasterLogin: string;
      broadcasterName: string;
      accessToken: string;
      refreshToken?: string;
      scopes: string[];
      expiresIn?: number;
    }
  ): Promise<boolean> {
    if (!this.database) {
      console.error('[PlatformBroadcasterTokenService] Firebase not initialized');
      return false;
    }

    try {
      const token: StoredBroadcasterToken = {
        platform,
        broadcasterId: data.broadcasterId,
        broadcasterLogin: data.broadcasterLogin.toLowerCase(),
        broadcasterName: data.broadcasterName,
        accessToken: simpleEncrypt(data.accessToken),
        scopes: data.scopes,
        storedAt: Date.now(),
      };

      // Only add optional fields if they have values
      if (data.refreshToken) {
        token.refreshToken = simpleEncrypt(data.refreshToken);
      }

      if (data.expiresIn) {
        token.expiresAt = Date.now() + (data.expiresIn * 1000);
      }

      const tokenRef = ref(this.database, this.getFirebasePath(platform, data.broadcasterId));
      await set(tokenRef, token);

      // Update local cache with decrypted token
      const cacheKey = this.getCacheKey(platform, data.broadcasterId);
      this.tokensCache.set(cacheKey, {
        ...token,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      this.notifyListeners();
      console.log(`[PlatformBroadcasterTokenService] Token stored for ${platform}:${data.broadcasterLogin}`);
      return true;
    } catch (err) {
      console.error('[PlatformBroadcasterTokenService] Error storing token:', err);
      return false;
    }
  }

  /**
   * Get broadcaster token from Firebase
   */
  async getBroadcasterToken(
    platform: Platform,
    broadcasterId: string
  ): Promise<StoredBroadcasterToken | null> {
    const cacheKey = this.getCacheKey(platform, broadcasterId);

    // Check cache first
    if (this.tokensCache.has(cacheKey)) {
      return this.tokensCache.get(cacheKey) || null;
    }

    if (!this.database) {
      return null;
    }

    try {
      const tokenRef = ref(this.database, this.getFirebasePath(platform, broadcasterId));
      const snapshot = await get(tokenRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.val() as StoredBroadcasterToken;

      // Decrypt tokens
      const decryptedToken: StoredBroadcasterToken = {
        ...data,
        accessToken: simpleDecrypt(data.accessToken),
        refreshToken: data.refreshToken ? simpleDecrypt(data.refreshToken) : undefined,
      };

      // Cache it
      this.tokensCache.set(cacheKey, decryptedToken);

      return decryptedToken;
    } catch (err) {
      console.error('[PlatformBroadcasterTokenService] Error getting token:', err);
      return null;
    }
  }

  /**
   * Check if broadcaster has authorized (async)
   */
  async hasBroadcasterToken(platform: Platform, broadcasterId: string): Promise<boolean> {
    const token = await this.getBroadcasterToken(platform, broadcasterId);
    return token !== null;
  }

  /**
   * Check if broadcaster token is in cache (sync)
   */
  hasBroadcasterTokenCached(platform: Platform, broadcasterId: string): boolean {
    const cacheKey = this.getCacheKey(platform, broadcasterId);
    return this.tokensCache.has(cacheKey);
  }

  /**
   * Remove broadcaster token
   */
  async removeBroadcasterToken(platform: Platform, broadcasterId: string): Promise<void> {
    if (!this.database) return;

    try {
      const tokenRef = ref(this.database, this.getFirebasePath(platform, broadcasterId));
      await set(tokenRef, null);
      
      const cacheKey = this.getCacheKey(platform, broadcasterId);
      this.tokensCache.delete(cacheKey);
      
      this.notifyListeners();
    } catch (err) {
      console.error('[PlatformBroadcasterTokenService] Error removing token:', err);
    }
  }

  /**
   * Subscribe to token changes for a broadcaster
   */
  subscribeToToken(
    platform: Platform,
    broadcasterId: string,
    callback: (token: StoredBroadcasterToken | null) => void
  ): () => void {
    if (!this.database) {
      return () => {};
    }

    const tokenRef = ref(this.database, this.getFirebasePath(platform, broadcasterId));
    const cacheKey = this.getCacheKey(platform, broadcasterId);

    const unsubscribe = onValue(tokenRef, (snapshot) => {
      if (!snapshot.exists()) {
        this.tokensCache.delete(cacheKey);
        callback(null);
        return;
      }

      const data = snapshot.val() as StoredBroadcasterToken;
      const decryptedToken: StoredBroadcasterToken = {
        ...data,
        accessToken: simpleDecrypt(data.accessToken),
        refreshToken: data.refreshToken ? simpleDecrypt(data.refreshToken) : undefined,
      };

      this.tokensCache.set(cacheKey, decryptedToken);
      callback(decryptedToken);
    });

    // Store unsubscribe function
    this.subscriptions.set(cacheKey, () => {
      off(tokenRef);
    });

    return () => {
      off(tokenRef);
      this.subscriptions.delete(cacheKey);
    };
  }

  // ============================================
  // Scope Verification
  // ============================================

  /**
   * Check if token has required scopes
   */
  async hasRequiredScopes(
    platform: Platform,
    broadcasterId: string,
    requiredScopes: string[]
  ): Promise<boolean> {
    const token = await this.getBroadcasterToken(platform, broadcasterId);
    if (!token) return false;

    return requiredScopes.every(scope => token.scopes.includes(scope));
  }

  /**
   * Get capabilities based on stored scopes
   */
  async getCapabilities(
    platform: Platform,
    broadcasterId: string
  ): Promise<BroadcasterCapabilities> {
    const token = await this.getBroadcasterToken(platform, broadcasterId);
    const scopes = token?.scopes || [];
    const platformScopes = PLATFORM_BROADCASTER_SCOPES[platform];

    return {
      canCreatePolls: platformScopes.polls ? scopes.includes(platformScopes.polls) : false,
      canCreatePredictions: platformScopes.predictions ? scopes.includes(platformScopes.predictions) : false,
      canStartRaids: platformScopes.raids ? scopes.includes(platformScopes.raids) : false,
      canManageRewards: platformScopes.rewards ? scopes.includes(platformScopes.rewards) : false,
      canModerateChat: platformScopes.moderator.some(s => scopes.includes(s)),
      canManageBroadcast: platformScopes.broadcast ? scopes.includes(platformScopes.broadcast) : false,
    };
  }

  /**
   * Check if can create predictions (Twitch only)
   */
  async canCreatePredictions(platform: Platform, broadcasterId: string): Promise<boolean> {
    if (platform !== 'twitch') return false;
    const scope = PLATFORM_BROADCASTER_SCOPES.twitch.predictions;
    return scope ? this.hasRequiredScopes(platform, broadcasterId, [scope]) : false;
  }

  /**
   * Check if can create polls
   */
  async canCreatePolls(platform: Platform, broadcasterId: string): Promise<boolean> {
    const scope = PLATFORM_BROADCASTER_SCOPES[platform].polls;
    if (!scope) return false; // Platform uses chat-based polls
    return this.hasRequiredScopes(platform, broadcasterId, [scope]);
  }

  /**
   * Check if can start raids (Twitch only)
   */
  async canStartRaids(platform: Platform, broadcasterId: string): Promise<boolean> {
    if (platform !== 'twitch') return false;
    const scope = PLATFORM_BROADCASTER_SCOPES.twitch.raids;
    return scope ? this.hasRequiredScopes(platform, broadcasterId, [scope]) : false;
  }

  // ============================================
  // Token Validation
  // ============================================

  /**
   * Validate token with platform API
   */
  async validateToken(platform: Platform, broadcasterId: string): Promise<TokenVerificationResult> {
    const storedToken = await this.getBroadcasterToken(platform, broadcasterId);
    if (!storedToken) {
      return { valid: false, error: 'No token stored for this broadcaster' };
    }

    try {
      let response: Response;
      let validationUrl: string;
      let headers: HeadersInit;

      switch (platform) {
        case 'twitch':
          validationUrl = 'https://id.twitch.tv/oauth2/validate';
          headers = { 'Authorization': `OAuth ${storedToken.accessToken}` };
          break;
        case 'youtube':
          validationUrl = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${storedToken.accessToken}`;
          headers = {};
          break;
        case 'kick':
          validationUrl = 'https://kick.com/api/v2/user';
          headers = { 'Authorization': `Bearer ${storedToken.accessToken}` };
          break;
        default:
          return { valid: false, error: 'Unknown platform' };
      }

      response = await fetch(validationUrl, { headers });

      if (!response.ok) {
        await this.removeBroadcasterToken(platform, broadcasterId);
        return { valid: false, error: 'Token expired or revoked' };
      }

      const data = await response.json();

      // Update scopes if changed (Twitch)
      if (platform === 'twitch' && data.scopes && this.database) {
        const tokenRef = ref(this.database, `${this.getFirebasePath(platform, broadcasterId)}/scopes`);
        await set(tokenRef, data.scopes);

        const cacheKey = this.getCacheKey(platform, broadcasterId);
        const cached = this.tokensCache.get(cacheKey);
        if (cached) {
          cached.scopes = data.scopes;
        }
      }

      return {
        valid: true,
        expiresIn: data.expires_in || data.expiresIn,
        scopes: data.scopes || data.scope?.split(' '),
      };
    } catch (err) {
      console.error('[PlatformBroadcasterTokenService] Error validating token:', err);
      return { valid: false, error: 'Network error' };
    }
  }

  // ============================================
  // Action Execution
  // ============================================

  /**
   * Get token for executing a broadcaster action
   * Returns the access token if available and valid
   */
  async getTokenForAction(
    platform: Platform,
    broadcasterId: string,
    requiredScopes: string[]
  ): Promise<{ token: string } | { error: string }> {
    const storedToken = await this.getBroadcasterToken(platform, broadcasterId);

    if (!storedToken) {
      return {
        error: 'El streamer no ha autorizado la app. Pídele que conecte su cuenta en Stream Crowd.',
      };
    }

    // Verify scopes
    const missingScopes = requiredScopes.filter(
      scope => !storedToken.scopes.includes(scope)
    );

    if (missingScopes.length > 0) {
      return {
        error: `Faltan permisos: ${missingScopes.join(', ')}. El streamer debe reconectar su cuenta.`,
      };
    }

    // Check if token has expired
    if (storedToken.expiresAt && Date.now() > storedToken.expiresAt) {
      const validation = await this.validateToken(platform, broadcasterId);
      if (!validation.valid) {
        return { error: 'El token del streamer ha expirado. Debe reconectar su cuenta.' };
      }
    }

    return { token: storedToken.accessToken };
  }

  // ============================================
  // Listeners
  // ============================================

  /**
   * Subscribe to token changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error('[PlatformBroadcasterTokenService] Error in listener:', e);
      }
    });
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    for (const [, unsubscribe] of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions.clear();
    this.tokensCache.clear();
    this.listeners.clear();
  }

  /**
   * Clear all cached tokens (for testing)
   */
  clearCache(): void {
    this.tokensCache.clear();
  }
}

// ============================================
// Singleton Export
// ============================================

export const PlatformBroadcasterTokenService = new PlatformBroadcasterTokenServiceImpl();

// ============================================
// Helper Functions
// ============================================

/**
 * Check if user can execute broadcaster action on a channel
 */
export async function canExecutePlatformBroadcasterAction(
  platform: Platform,
  broadcasterId: string,
  currentUserId: string,
  requiredScopes: string[]
): Promise<{ canExecute: boolean; reason?: string; needsBroadcasterAuth?: boolean }> {
  // If user is the broadcaster, they can do it with their own token
  if (broadcasterId === currentUserId) {
    return { canExecute: true };
  }

  // If moderator, need broadcaster's token
  const hasToken = await PlatformBroadcasterTokenService.hasBroadcasterToken(platform, broadcasterId);
  if (!hasToken) {
    return {
      canExecute: false,
      reason: 'El streamer no ha autorizado la app para esta acción.',
      needsBroadcasterAuth: true,
    };
  }

  const hasScopes = await PlatformBroadcasterTokenService.hasRequiredScopes(platform, broadcasterId, requiredScopes);
  if (!hasScopes) {
    return {
      canExecute: false,
      reason: 'El streamer necesita reconectar su cuenta con más permisos.',
      needsBroadcasterAuth: true,
    };
  }

  return { canExecute: true };
}

/**
 * Get all broadcaster scopes for a platform
 */
export function getAllBroadcasterScopes(platform: Platform): string[] {
  return PLATFORM_BROADCASTER_SCOPES[platform].all;
}
