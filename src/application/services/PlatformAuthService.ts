/**
 * PlatformAuthService - Unified authentication service for multiple platforms
 * 
 * This service manages OAuth authentication for Twitch, YouTube, and Kick platforms.
 * It handles:
 * - OAuth flow initiation (popup-based)
 * - Callback handling without page reload
 * - Token validation and refresh
 * - Credential storage via TokenStorage
 * 
 * @module src/application/services/PlatformAuthService
 * @requirements 3.1, 3.2, 3.3, 4.3, 4.4, 4.5, 4.6 - Authentication without page reload
 */

import type { Platform } from '../../../types/platform';
import { TokenStorage, type PlatformCredentials } from './TokenStorage';
import { GiveawayFirebaseService } from '../../infrastructure/firebase/GiveawayFirebaseService';

// ============================================
// Types
// ============================================

export type AuthCallback = (credentials: PlatformCredentials | null) => void;

export interface AuthResult {
  success: boolean;
  credentials?: PlatformCredentials;
  error?: string;
}

// ============================================
// OAuth Configuration
// ============================================

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';
const YOUTUBE_CLIENT_ID = import.meta.env.VITE_YOUTUBE_CLIENT_ID || '';
const KICK_CLIENT_ID = import.meta.env.VITE_KICK_CLIENT_ID || '';

/**
 * Required OAuth scopes per platform
 */
export const PLATFORM_SCOPES: Record<Platform, string[]> = {
  twitch: [
    'chat:read',
    'chat:edit',
    'channel:read:subscriptions',
    'channel:read:vips',
    'bits:read',
    'moderation:read',
    'moderator:read:chatters',
    'moderator:read:followers',
    'moderator:manage:chat_settings',
    'moderator:manage:announcements',
    'moderator:manage:shoutouts',
    'moderator:manage:chat_messages',
    'moderator:manage:banned_users',
    // Enhanced features scopes
    'channel:read:hype_train',
    'channel:read:goals',
    'channel:manage:broadcast',
    'moderator:read:shield_mode',
    'moderator:manage:shield_mode',
  ],
  youtube: [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.channel-memberships.creator',
  ],
  kick: [
    'chat:read',
    'chat:write',
    'channel:read',
    'user:read',
  ],
};

/**
 * Additional scopes for broadcaster-level access
 */
export const BROADCASTER_SCOPES: Record<Platform, string[]> = {
  twitch: [
    'channel:manage:predictions',
    'channel:manage:polls',
    'channel:manage:raids',
    'channel:manage:broadcast',
    'channel:manage:redemptions',
    'clips:edit',
  ],
  youtube: [
    'https://www.googleapis.com/auth/youtube',
  ],
  kick: [
    'channel:manage',
    'clips:create',
  ],
};

/**
 * OAuth endpoints per platform
 */
const OAUTH_ENDPOINTS: Record<Platform, { authorize: string; token: string; validate: string }> = {
  twitch: {
    authorize: 'https://id.twitch.tv/oauth2/authorize',
    token: 'https://id.twitch.tv/oauth2/token',
    validate: 'https://id.twitch.tv/oauth2/validate',
  },
  youtube: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    validate: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
  },
  kick: {
    authorize: 'https://kick.com/oauth/authorize',
    token: 'https://kick.com/oauth/token',
    validate: 'https://kick.com/api/v1/user',
  },
};

// ============================================
// PlatformAuthService Class
// ============================================

class PlatformAuthServiceImpl {
  private authCallbacks = new Map<Platform, Set<AuthCallback>>();
  private pendingAuth: { platform: Platform; popup: Window | null; state: string } | null = null;
  private initialized = false;

  constructor() {
    // Listen for OAuth callback messages from popup
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleOAuthMessage.bind(this));
    }
  }

  /**
   * Initialize the service and restore credentials from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await TokenStorage.initialize();
    this.initialized = true;

    // Migrate legacy Twitch auth if exists and not already in TokenStorage
    await this.migrateLegacyTwitchAuth();

    // Validate stored credentials on startup
    const platforms: Platform[] = ['twitch', 'youtube', 'kick'];
    for (const platform of platforms) {
      if (TokenStorage.has(platform)) {
        const valid = await this.validateCredentials(platform);
        if (!valid) {
          console.log(`[PlatformAuthService] Invalid credentials for ${platform}, clearing`);
          await TokenStorage.remove(platform);
        }
      }
    }

    console.log('[PlatformAuthService] Initialized');
  }

  /**
   * Migrate legacy Twitch auth from various localStorage keys
   * This ensures backward compatibility with the existing auth system
   */
  private async migrateLegacyTwitchAuth(): Promise<void> {
    // Skip if already have Twitch credentials in TokenStorage
    if (TokenStorage.has('twitch')) {
      console.log('[PlatformAuthService] Twitch already in TokenStorage, skipping migration');
      return;
    }

    try {
      // Try different legacy storage formats
      // Format 1: Separate keys (twitch_token, twitch_channel, etc.)
      const legacyToken = localStorage.getItem('twitch_token');
      const legacyChannel = localStorage.getItem('twitch_channel');
      const legacyUserId = localStorage.getItem('twitch_user_id');
      const legacyUserName = localStorage.getItem('twitch_user_name');
      const legacyExpires = localStorage.getItem('twitch_token_expires');

      if (legacyToken) {
        console.log('[PlatformAuthService] Found legacy twitch_token, attempting migration...');
        
        // Validate the token with Twitch API
        const userInfo = await this.fetchUserInfo('twitch', legacyToken);
        if (!userInfo) {
          console.log('[PlatformAuthService] Legacy twitch_token is invalid (API validation failed)');
          return;
        }

        // Build credentials from legacy storage
        const credentials: PlatformCredentials = {
          platform: 'twitch',
          accessToken: legacyToken,
          refreshToken: undefined,
          expiresAt: legacyExpires ? parseInt(legacyExpires) : undefined,
          username: userInfo.username || legacyUserName || legacyChannel || '',
          userId: userInfo.userId || legacyUserId || '',
          scopes: [],
        };

        // Store in TokenStorage
        await TokenStorage.store('twitch', credentials);
        console.log(`[PlatformAuthService] Migrated legacy Twitch auth for user: ${credentials.username}`);

        // Notify listeners about the migrated credentials
        this.notifyAuthChange('twitch', credentials);
        console.log('[PlatformAuthService] Notified listeners about migrated credentials');
        return;
      }

      // Format 2: twitch_auth object (used in tests)
      const legacyAuth = localStorage.getItem('twitch_auth');
      if (legacyAuth) {
        console.log('[PlatformAuthService] Found legacy twitch_auth object, attempting migration...');
        const parsed = JSON.parse(legacyAuth);
        const accessToken = parsed.token || parsed.access_token || parsed.accessToken;
        
        if (!accessToken) {
          console.log('[PlatformAuthService] Legacy twitch_auth found but no access token. Keys found:', Object.keys(parsed));
          return;
        }

        // Validate the token with Twitch API
        const userInfo = await this.fetchUserInfo('twitch', accessToken);
        if (!userInfo) {
          console.log('[PlatformAuthService] Legacy twitch_auth token is invalid (API validation failed)');
          return;
        }

        // Get user info from legacy auth or API
        const username = userInfo.username || parsed.user?.login || parsed.user?.name || parsed.username;
        const userId = userInfo.userId || parsed.user?.id || parsed.userId;

        // Build credentials from legacy auth
        const credentials: PlatformCredentials = {
          platform: 'twitch',
          accessToken,
          refreshToken: parsed.refresh_token || parsed.refreshToken,
          expiresAt: parsed.expiresAt || parsed.expires_at,
          username,
          userId: String(userId),
          scopes: parsed.scope ? (Array.isArray(parsed.scope) ? parsed.scope : parsed.scope.split(' ')) : [],
        };

        // Store in TokenStorage
        await TokenStorage.store('twitch', credentials);
        console.log(`[PlatformAuthService] Migrated legacy Twitch auth for user: ${username}`);

        // Notify listeners about the migrated credentials
        this.notifyAuthChange('twitch', credentials);
        console.log('[PlatformAuthService] Notified listeners about migrated credentials');
        return;
      }

      console.log('[PlatformAuthService] No legacy Twitch auth found in localStorage');
    } catch (err) {
      console.error('[PlatformAuthService] Error migrating legacy Twitch auth:', err);
    }
  }

  /**
   * Initiate OAuth flow for a platform
   * Opens a popup window for authentication
   */
  async initiateAuth(platform: Platform): Promise<void> {
    await this.initialize();

    // Generate state for CSRF protection
    const state = this.generateState();
    const redirectUri = this.getRedirectUri(platform);
    const authUrl = PlatformAuthServiceImpl.buildAuthUrl(platform, state, redirectUri);

    // Open popup
    const popup = window.open(
      authUrl,
      `${platform}_auth`,
      'width=600,height=700,scrollbars=yes'
    );

    if (!popup) {
      console.error('[PlatformAuthService] Popup blocked');
      this.notifyAuthChange(platform, null);
      return;
    }

    this.pendingAuth = { platform, popup, state };

    // Poll for popup close (fallback if message doesn't arrive)
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        if (this.pendingAuth?.platform === platform) {
          this.pendingAuth = null;
        }
      }
    }, 500);
  }

  /**
   * Handle OAuth callback from popup or redirect
   */
  async handleAuthCallback(platform: Platform, params: URLSearchParams): Promise<AuthResult> {
    await this.initialize();

    // Check for errors
    const error = params.get('error');
    if (error) {
      const errorDescription = params.get('error_description') || error;
      console.error(`[PlatformAuthService] OAuth error for ${platform}:`, errorDescription);
      return { success: false, error: errorDescription };
    }

    // Get access token (implicit flow)
    const accessToken = params.get('access_token');
    if (!accessToken) {
      return { success: false, error: 'No access token received' };
    }

    // Get additional token info
    const refreshToken = params.get('refresh_token') || undefined;
    const expiresIn = params.get('expires_in');
    const scope = params.get('scope') || '';

    try {
      // Fetch user info to get username and userId
      const userInfo = await this.fetchUserInfo(platform, accessToken);
      if (!userInfo) {
        return { success: false, error: 'Failed to fetch user info' };
      }

      const credentials: PlatformCredentials = {
        platform,
        accessToken,
        refreshToken,
        expiresAt: expiresIn ? Date.now() + parseInt(expiresIn) * 1000 : undefined,
        username: userInfo.username,
        userId: userInfo.userId,
        scopes: scope.split(' ').filter(Boolean),
      };

      // Store credentials
      await TokenStorage.store(platform, credentials);

      // Notify listeners
      this.notifyAuthChange(platform, credentials);

      console.log(`[PlatformAuthService] Auth successful for ${platform}:`, userInfo.username);
      return { success: true, credentials };
    } catch (err) {
      console.error(`[PlatformAuthService] Error processing auth for ${platform}:`, err);
      return { success: false, error: 'Failed to process authentication' };
    }
  }

  /**
   * Get stored credentials for a platform
   */
  getCredentials(platform: Platform): PlatformCredentials | null {
    // Synchronous check - returns cached/stored credentials
    // For async retrieval with decryption, use retrieveCredentials
    if (!TokenStorage.has(platform)) {
      return null;
    }
    // Return a placeholder - actual retrieval is async
    return null;
  }

  /**
   * Retrieve credentials asynchronously (with decryption)
   */
  async retrieveCredentials(platform: Platform): Promise<PlatformCredentials | null> {
    await this.initialize();
    return TokenStorage.retrieve(platform);
  }

  /**
   * Validate stored credentials with the platform's API
   */
  async validateCredentials(platform: Platform): Promise<boolean> {
    const credentials = await TokenStorage.retrieve(platform);
    if (!credentials) {
      return false;
    }

    // Check if token is expired
    if (credentials.expiresAt && Date.now() > credentials.expiresAt) {
      // Try to refresh
      const refreshed = await this.refreshToken(platform);
      return refreshed;
    }

    try {
      const endpoint = OAUTH_ENDPOINTS[platform].validate;
      let response: Response;

      if (platform === 'twitch') {
        response = await fetch(endpoint, {
          headers: { 'Authorization': `OAuth ${credentials.accessToken}` },
        });
      } else if (platform === 'youtube') {
        response = await fetch(`${endpoint}?access_token=${credentials.accessToken}`);
      } else {
        // Kick
        response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${credentials.accessToken}` },
        });
      }

      return response.ok;
    } catch (err) {
      console.error(`[PlatformAuthService] Error validating ${platform} credentials:`, err);
      return false;
    }
  }

  /**
   * Refresh expired token
   */
  async refreshToken(platform: Platform): Promise<boolean> {
    const credentials = await TokenStorage.retrieve(platform);
    if (!credentials?.refreshToken) {
      return false;
    }

    try {
      // Note: Token refresh typically requires a backend server
      // For client-side apps, we prompt re-authentication
      console.log(`[PlatformAuthService] Token refresh not implemented for ${platform}, re-auth required`);
      return false;
    } catch (err) {
      console.error(`[PlatformAuthService] Error refreshing ${platform} token:`, err);
      return false;
    }
  }

  /**
   * Logout from a platform (clear credentials)
   */
  async logout(platform: Platform): Promise<void> {
    await this.initialize();
    await TokenStorage.remove(platform);
    this.notifyAuthChange(platform, null);
    console.log(`[PlatformAuthService] Logged out from ${platform}`);
  }

  /**
   * Subscribe to auth state changes for a platform
   */
  onAuthChange(platform: Platform, callback: AuthCallback): () => void {
    if (!this.authCallbacks.has(platform)) {
      this.authCallbacks.set(platform, new Set());
    }
    this.authCallbacks.get(platform)!.add(callback);

    // Immediately call with current state
    TokenStorage.retrieve(platform).then(credentials => {
      callback(credentials);
    });

    return () => {
      this.authCallbacks.get(platform)?.delete(callback);
    };
  }

  /**
   * Check if authenticated for a platform
   */
  isAuthenticated(platform: Platform): boolean {
    return TokenStorage.has(platform);
  }

  /**
   * Get required scopes for a platform
   */
  static getRequiredScopes(platform: Platform): string[] {
    return [...PLATFORM_SCOPES[platform]];
  }

  /**
   * Get broadcaster scopes for a platform
   */
  static getBroadcasterScopes(platform: Platform): string[] {
    return [...PLATFORM_SCOPES[platform], ...BROADCASTER_SCOPES[platform]];
  }

  /**
   * Build OAuth URL for a platform
   */
  static buildAuthUrl(platform: Platform, state: string, redirectUri: string): string {
    const endpoint = OAUTH_ENDPOINTS[platform].authorize;
    const scopes = PLATFORM_SCOPES[platform];

    const params = new URLSearchParams();

    if (platform === 'twitch') {
      params.set('client_id', TWITCH_CLIENT_ID);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'token');
      params.set('scope', scopes.join(' '));
      params.set('state', state);
      params.set('force_verify', 'false');
    } else if (platform === 'youtube') {
      params.set('client_id', YOUTUBE_CLIENT_ID);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'token');
      params.set('scope', scopes.join(' '));
      params.set('state', state);
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    } else {
      // Kick
      params.set('client_id', KICK_CLIENT_ID);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'token');
      params.set('scope', scopes.join(' '));
      params.set('state', state);
    }

    return `${endpoint}?${params.toString()}`;
  }

  // ============================================
  // Private Methods
  // ============================================

  private handleOAuthMessage(event: MessageEvent): void {
    // Validate origin
    if (event.origin !== window.location.origin) {
      return;
    }

    const { type, platform, params } = event.data || {};
    if (type !== 'oauth_callback' || !platform || !params) {
      return;
    }

    // Verify state matches
    if (this.pendingAuth?.platform !== platform) {
      console.warn('[PlatformAuthService] Received callback for unexpected platform');
      return;
    }

    const urlParams = new URLSearchParams(params);
    const state = urlParams.get('state');
    if (state !== this.pendingAuth.state) {
      console.warn('[PlatformAuthService] State mismatch in OAuth callback');
      return;
    }

    // Close popup
    this.pendingAuth.popup?.close();
    this.pendingAuth = null;

    // Process callback
    this.handleAuthCallback(platform as Platform, urlParams);
  }

  private async fetchUserInfo(platform: Platform, accessToken: string): Promise<{ username: string; userId: string } | null> {
    try {
      if (platform === 'twitch') {
        const response = await fetch('https://api.twitch.tv/helix/users', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          },
        });
        if (!response.ok) return null;
        const data = await response.json();
        const user = data.data?.[0];
        return user ? { username: user.login, userId: user.id } : null;
      } else if (platform === 'youtube') {
        const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!response.ok) return null;
        const data = await response.json();
        const channel = data.items?.[0];
        return channel ? { username: channel.snippet.title, userId: channel.id } : null;
      } else {
        // Kick
        const response = await fetch('https://kick.com/api/v1/user', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data ? { username: data.username, userId: String(data.id) } : null;
      }
    } catch (err) {
      console.error(`[PlatformAuthService] Error fetching user info for ${platform}:`, err);
      return null;
    }
  }

  private getRedirectUri(platform: Platform): string {
    const base = window.location.origin;
    return `${base}/auth/${platform}/callback.html`;
  }

  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  private notifyAuthChange(platform: Platform, credentials: PlatformCredentials | null): void {
    // If Twitch login, configure Firebase service for giveaways
    if (platform === 'twitch' && credentials) {
      GiveawayFirebaseService.setStreamer(
        credentials.userId,
        credentials.username,
        undefined, // profileImage - could be fetched separately
        credentials.username.toLowerCase()
      );
      console.log('[PlatformAuthService] Firebase configured for streamer:', credentials.username);
    } else if (platform === 'twitch' && !credentials) {
      // Logout - cleanup Firebase
      GiveawayFirebaseService.cleanup();
    }

    const callbacks = this.authCallbacks.get(platform);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(credentials);
        } catch (err) {
          console.error('[PlatformAuthService] Error in auth callback:', err);
        }
      });
    }
  }
}

// ============================================
// Singleton Export
// ============================================

export const PlatformAuthService = new PlatformAuthServiceImpl();

// ============================================
// Static Method Exports
// ============================================

/**
 * Build OAuth URL for a platform (exported for external use)
 */
export function buildPlatformAuthUrl(platform: Platform, state: string, redirectUri: string): string {
  return PlatformAuthServiceImpl.buildAuthUrl(platform, state, redirectUri);
}

/**
 * Get required scopes for a platform (exported for external use)
 */
export function getPlatformRequiredScopes(platform: Platform): string[] {
  return PlatformAuthServiceImpl.getRequiredScopes(platform);
}

/**
 * Get broadcaster scopes for a platform (exported for external use)
 */
export function getPlatformBroadcasterScopes(platform: Platform): string[] {
  return PlatformAuthServiceImpl.getBroadcasterScopes(platform);
}
