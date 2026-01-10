/**
 * PlatformManagerService - Unified platform management service
 * 
 * Coordinates all platform adapters (Twitch, YouTube, Kick) and services.
 * Manages independent connection state per platform, handles enable/disable toggles,
 * and provides a unified interface for platform operations.
 * 
 * Key responsibilities:
 * - Coordinate platform adapters (TwitchAdapter, YouTubeAdapter, KickAdapter)
 * - Manage independent connection state per platform
 * - Handle enable/disable toggles (preserving credentials)
 * - Coordinate with PlatformAuthService for authentication
 * - Coordinate with PlatformBroadcasterTokenService for broadcaster tokens
 * - Coordinate with PlatformModeratedChannelsService for moderated channels
 * 
 * @requirements 7.1 - THE system SHALL maintain independent Platform_State for each platform
 * @requirements 7.2 - WHEN one platform disconnects or has an error, THE other platforms SHALL continue operating normally
 * @requirements 7.3 - THE UI SHALL display the connection status for each platform independently
 * @requirements 7.4 - WHEN reconnecting, EACH Platform_Adapter SHALL use its own exponential backoff timer
 * @requirements 7.5 - THE system SHALL allow simultaneous connections to all three platforms
 * @module src/application/services/PlatformManagerService
 */

import type { Platform } from '../../../types/platform';
import type { IChatProvider, ConnectionStatus, ChatMessage, StreamEvent } from '../../domain/ports/IChatProvider';
import { PlatformAuthService } from './PlatformAuthService';
import { TokenStorage, type PlatformCredentials } from './TokenStorage';
import { TwitchAdapter } from '../../infrastructure/adapters/TwitchAdapter';
import { YouTubeAdapter } from '../../infrastructure/adapters/YouTubeAdapter';
import { KickAdapter } from '../../infrastructure/adapters/KickAdapter';
import type { ChannelContext } from './PlatformModeratedChannelsService';

// ============================================
// Types
// ============================================

/**
 * Platform state for a single platform
 * @requirements 7.1 - Independent state per platform
 */
export interface PlatformState {
  /** Platform identifier */
  platform: Platform;
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether the platform is enabled (toggle ON/OFF) */
  enabled: boolean;
  /** Stored credentials (null if not authenticated) */
  credentials: PlatformCredentials | null;
  /** Current channel connected to */
  channel: string | null;
  /** Last error message */
  error?: string;
  /** Timestamp of last successful connection */
  lastConnectedAt?: number;
  /** Number of reconnection attempts */
  reconnectAttempts?: number;
  /** Selected channel context (own or moderated) */
  selectedChannel?: ChannelContext;
  /** List of moderated channels */
  moderatedChannels?: ChannelContext[];
  /** Whether viewing a moderated channel (not own) */
  isViewingModeratedChannel?: boolean;
}

/**
 * Callback for state changes
 */
export type StateChangeCallback = (states: Map<Platform, PlatformState>) => void;

/**
 * Callback for messages from any platform
 */
export type MessageCallback = (message: ChatMessage, platform: Platform) => void;

/**
 * Callback for stream events from any platform
 */
export type StreamEventCallback = (event: StreamEvent, platform: Platform) => void;

// ============================================
// Constants
// ============================================

const ALL_PLATFORMS: Platform[] = ['twitch', 'youtube', 'kick'];

const DEFAULT_STATE: Omit<PlatformState, 'platform'> = {
  status: 'disconnected',
  enabled: true,
  credentials: null,
  channel: null,
  error: undefined,
  lastConnectedAt: undefined,
  reconnectAttempts: 0,
};

// ============================================
// PlatformManagerService Class
// ============================================

class PlatformManagerServiceImpl {
  /** Platform adapters */
  private adapters: Map<Platform, IChatProvider> = new Map();
  
  /** Platform states */
  private states: Map<Platform, PlatformState> = new Map();
  
  /** State change callbacks */
  private stateCallbacks = new Set<StateChangeCallback>();
  
  /** Message callbacks */
  private messageCallbacks = new Set<MessageCallback>();
  
  /** Stream event callbacks */
  private streamEventCallbacks = new Set<StreamEventCallback>();
  
  /** Adapter unsubscribe functions */
  private adapterUnsubscribes: Map<Platform, Array<() => void>> = new Map();
  
  /** Initialization flag */
  private initialized = false;
  
  /** Initialization promise */
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize states for all platforms
    for (const platform of ALL_PLATFORMS) {
      this.states.set(platform, {
        ...DEFAULT_STATE,
        platform,
      });
    }
    
    // Create adapters
    this.adapters.set('twitch', new TwitchAdapter());
    this.adapters.set('youtube', new YouTubeAdapter());
    this.adapters.set('kick', new KickAdapter());
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize the service from stored credentials
   * Restores authentication state and auto-connects enabled platforms
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Initialize auth service
      await PlatformAuthService.initialize();

      // Setup adapter event handlers
      for (const platform of ALL_PLATFORMS) {
        this.setupAdapterHandlers(platform);
      }

      // Restore credentials from storage
      await this.restoreCredentials();

      this.initialized = true;
      console.log('[PlatformManagerService] Initialized');
    } catch (err) {
      console.error('[PlatformManagerService] Initialization error:', err);
      this.initialized = true; // Mark as initialized even on error
    }
  }

  /**
   * Restore credentials from TokenStorage
   */
  private async restoreCredentials(): Promise<void> {
    for (const platform of ALL_PLATFORMS) {
      try {
        const credentials = await TokenStorage.retrieve(platform);
        if (credentials) {
          this.updateState(platform, { credentials });
          console.log(`[PlatformManagerService] Restored credentials for ${platform}`);
        }
      } catch (err) {
        console.error(`[PlatformManagerService] Error restoring ${platform} credentials:`, err);
      }
    }
  }

  /**
   * Setup event handlers for an adapter
   */
  private setupAdapterHandlers(platform: Platform): void {
    const adapter = this.adapters.get(platform);
    if (!adapter) return;

    const unsubscribes: Array<() => void> = [];

    // Status change handler
    const statusUnsub = adapter.onStatusChange((status, error) => {
      this.handleStatusChange(platform, status, error);
    });
    unsubscribes.push(statusUnsub);

    // Message handler
    const messageUnsub = adapter.onMessage((message) => {
      this.handleMessage(platform, message);
    });
    unsubscribes.push(messageUnsub);

    // Stream event handler
    const eventUnsub = adapter.onStreamEvent((event) => {
      this.handleStreamEvent(platform, event);
    });
    unsubscribes.push(eventUnsub);

    this.adapterUnsubscribes.set(platform, unsubscribes);
  }

  // ============================================
  // State Management
  // ============================================

  /**
   * Get adapter for a platform
   */
  getAdapter(platform: Platform): IChatProvider | null {
    return this.adapters.get(platform) || null;
  }

  /**
   * Get current state for a platform
   * @requirements 7.1 - Independent state per platform
   */
  getState(platform: Platform): PlatformState {
    return this.states.get(platform) || {
      ...DEFAULT_STATE,
      platform,
    };
  }

  /**
   * Get all platform states
   */
  getAllStates(): Map<Platform, PlatformState> {
    return new Map(this.states);
  }

  /**
   * Update state for a platform
   * @requirements 7.2 - Changes to one platform don't affect others
   */
  private updateState(platform: Platform, updates: Partial<PlatformState>): void {
    const currentState = this.states.get(platform);
    if (!currentState) return;

    const newState: PlatformState = {
      ...currentState,
      ...updates,
    };

    this.states.set(platform, newState);
    this.notifyStateChange();
  }

  /**
   * Notify all state change callbacks
   */
  private notifyStateChange(): void {
    const statesCopy = new Map(this.states);
    this.stateCallbacks.forEach(cb => {
      try {
        cb(statesCopy);
      } catch (err) {
        console.error('[PlatformManagerService] Error in state callback:', err);
      }
    });
  }

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Connect to a platform
   * @requirements 7.5 - Allow simultaneous connections
   */
  async connect(platform: Platform, channel: string): Promise<void> {
    await this.initialize();

    const state = this.getState(platform);
    const adapter = this.adapters.get(platform);

    if (!adapter) {
      throw new Error(`No adapter found for platform: ${platform}`);
    }

    if (!state.enabled) {
      console.log(`[PlatformManagerService] Platform ${platform} is disabled, not connecting`);
      return;
    }

    // Get credentials
    const credentials = state.credentials || await TokenStorage.retrieve(platform);
    if (!credentials) {
      this.updateState(platform, {
        status: 'error',
        error: 'No credentials available. Please authenticate first.',
      });
      return;
    }

    this.updateState(platform, {
      status: 'connecting',
      channel,
      error: undefined,
      reconnectAttempts: 0,
    });

    try {
      await adapter.connect({
        channel,
        token: credentials.accessToken,
      });

      this.updateState(platform, {
        status: 'connected',
        lastConnectedAt: Date.now(),
        credentials,
      });

      console.log(`[PlatformManagerService] Connected to ${platform}:${channel}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      this.updateState(platform, {
        status: 'error',
        error: errorMsg,
      });
      console.error(`[PlatformManagerService] Failed to connect to ${platform}:`, err);
    }
  }

  /**
   * Disconnect from a platform
   * @requirements 7.2 - Disconnecting one platform doesn't affect others
   */
  async disconnect(platform: Platform): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) return;

    try {
      await adapter.disconnect();
    } catch (err) {
      console.error(`[PlatformManagerService] Error disconnecting from ${platform}:`, err);
    }

    this.updateState(platform, {
      status: 'disconnected',
      channel: null,
      error: undefined,
      reconnectAttempts: 0,
    });

    console.log(`[PlatformManagerService] Disconnected from ${platform}`);
  }

  /**
   * Reconnect to a platform
   * @requirements 7.4 - Each platform uses its own exponential backoff
   */
  async reconnect(platform: Platform): Promise<void> {
    const state = this.getState(platform);
    
    if (!state.channel) {
      console.log(`[PlatformManagerService] No channel to reconnect to for ${platform}`);
      return;
    }

    await this.connect(platform, state.channel);
  }

  // ============================================
  // Enable/Disable Toggle
  // ============================================

  /**
   * Enable or disable a platform
   * @requirements 2.6 - Disable preserves credentials
   * @requirements 2.7 - Enable with stored credentials auto-reconnects
   */
  async setEnabled(platform: Platform, enabled: boolean): Promise<void> {
    await this.initialize();

    const state = this.getState(platform);

    if (state.enabled === enabled) {
      return; // No change needed
    }

    if (!enabled) {
      // Disabling: disconnect but preserve credentials
      await this.disconnect(platform);
      this.updateState(platform, {
        enabled: false,
        // Credentials are preserved!
      });
      console.log(`[PlatformManagerService] Disabled ${platform} (credentials preserved)`);
    } else {
      // Enabling: update state and auto-reconnect if we have credentials and a channel
      this.updateState(platform, { enabled: true });
      
      // Auto-reconnect if we have credentials and a previous channel
      if (state.credentials && state.channel) {
        await this.connect(platform, state.channel);
      }
      
      console.log(`[PlatformManagerService] Enabled ${platform}`);
    }
  }

  /**
   * Check if a platform is enabled
   */
  isEnabled(platform: Platform): boolean {
    return this.getState(platform).enabled;
  }

  // ============================================
  // Channel Context Management
  // ============================================

  /**
   * Select a channel context (own or moderated)
   */
  async selectChannel(platform: Platform, channelId: string): Promise<void> {
    const state = this.getState(platform);
    const channels = state.moderatedChannels || [];
    
    const selectedChannel = channels.find(ch => ch.channelId === channelId);
    if (!selectedChannel) {
      console.warn(`[PlatformManagerService] Channel ${channelId} not found in moderated channels`);
      return;
    }

    this.updateState(platform, {
      selectedChannel,
      isViewingModeratedChannel: !selectedChannel.isOwnChannel,
    });

    // Reconnect to the new channel if currently connected
    if (state.status === 'connected') {
      await this.connect(platform, selectedChannel.channelLogin);
    }
  }

  /**
   * Set moderated channels for a platform
   */
  setModeratedChannels(platform: Platform, channels: ChannelContext[]): void {
    this.updateState(platform, { moderatedChannels: channels });
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Handle status change from adapter
   * @requirements 7.2 - Status changes are independent per platform
   */
  private handleStatusChange(platform: Platform, status: ConnectionStatus, error?: string): void {
    const state = this.getState(platform);
    
    const updates: Partial<PlatformState> = { status };
    
    if (error) {
      updates.error = error;
    }
    
    if (status === 'connected') {
      updates.lastConnectedAt = Date.now();
      updates.error = undefined;
      updates.reconnectAttempts = 0;
    }
    
    if (status === 'error' && state.status !== 'error') {
      updates.reconnectAttempts = (state.reconnectAttempts || 0) + 1;
    }

    this.updateState(platform, updates);
  }

  /**
   * Handle message from adapter
   */
  private handleMessage(platform: Platform, message: ChatMessage): void {
    this.messageCallbacks.forEach(cb => {
      try {
        cb(message, platform);
      } catch (err) {
        console.error('[PlatformManagerService] Error in message callback:', err);
      }
    });
  }

  /**
   * Forward a message from external services (e.g., TwitchService)
   * This allows the legacy TwitchService to send messages to PlatformManagerService
   * for processing by chat control commands and other subscribers.
   */
  forwardMessage(platform: Platform, message: ChatMessage): void {
    this.handleMessage(platform, message);
  }

  /**
   * Handle stream event from adapter
   */
  private handleStreamEvent(platform: Platform, event: StreamEvent): void {
    this.streamEventCallbacks.forEach(cb => {
      try {
        cb(event, platform);
      } catch (err) {
        console.error('[PlatformManagerService] Error in stream event callback:', err);
      }
    });
  }

  // ============================================
  // Subscriptions
  // ============================================

  /**
   * Subscribe to state changes
   * @requirements 7.3 - UI can display status independently
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateCallbacks.add(callback);
    
    // Immediately call with current state
    callback(new Map(this.states));
    
    return () => {
      this.stateCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to messages from all platforms
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to stream events from all platforms
   */
  onStreamEvent(callback: StreamEventCallback): () => void {
    this.streamEventCallbacks.add(callback);
    return () => {
      this.streamEventCallbacks.delete(callback);
    };
  }

  // ============================================
  // Authentication Integration
  // ============================================

  /**
   * Update credentials for a platform
   */
  async setCredentials(platform: Platform, credentials: PlatformCredentials): Promise<void> {
    await TokenStorage.store(platform, credentials);
    this.updateState(platform, { credentials });
  }

  /**
   * Clear credentials for a platform
   */
  async clearCredentials(platform: Platform): Promise<void> {
    await this.disconnect(platform);
    await TokenStorage.remove(platform);
    this.updateState(platform, {
      credentials: null,
      status: 'disconnected',
    });
  }

  /**
   * Check if authenticated for a platform
   */
  isAuthenticated(platform: Platform): boolean {
    return this.getState(platform).credentials !== null;
  }

  // ============================================
  // External State Synchronization
  // ============================================

  /**
   * Sync connection state from external system (e.g., legacy TwitchService)
   * This allows the original connection system to notify PlatformManagerService
   * when connection state changes, keeping both systems in sync.
   */
  syncConnectionState(platform: Platform, status: ConnectionStatus, channel?: string | null): void {
    const state = this.getState(platform);
    
    const updates: Partial<PlatformState> = { status };
    
    if (channel !== undefined) {
      updates.channel = channel;
    }
    
    if (status === 'connected') {
      updates.lastConnectedAt = Date.now();
      updates.error = undefined;
      updates.reconnectAttempts = 0;
    }
    
    if (status === 'disconnected') {
      updates.error = undefined;
    }

    this.updateState(platform, updates);
    console.log(`[PlatformManagerService] Synced ${platform} state: ${status}${channel ? ` (${channel})` : ''}`);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Send a message to a platform
   */
  async sendMessage(platform: Platform, message: string): Promise<boolean> {
    const adapter = this.adapters.get(platform);
    if (!adapter) return false;

    const state = this.getState(platform);
    if (state.status !== 'connected') return false;

    return adapter.sendMessage(message);
  }

  /**
   * Get connected platforms
   */
  getConnectedPlatforms(): Platform[] {
    return ALL_PLATFORMS.filter(p => this.getState(p).status === 'connected');
  }

  /**
   * Get enabled platforms
   */
  getEnabledPlatforms(): Platform[] {
    return ALL_PLATFORMS.filter(p => this.getState(p).enabled);
  }

  /**
   * Get authenticated platforms
   */
  getAuthenticatedPlatforms(): Platform[] {
    return ALL_PLATFORMS.filter(p => this.getState(p).credentials !== null);
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    // Disconnect all platforms
    for (const platform of ALL_PLATFORMS) {
      await this.disconnect(platform);
      
      // Unsubscribe from adapter events
      const unsubscribes = this.adapterUnsubscribes.get(platform);
      if (unsubscribes) {
        unsubscribes.forEach(unsub => unsub());
      }
      
      // Dispose adapter
      const adapter = this.adapters.get(platform);
      if (adapter) {
        adapter.dispose();
      }
    }

    // Clear all callbacks
    this.stateCallbacks.clear();
    this.messageCallbacks.clear();
    this.streamEventCallbacks.clear();
    this.adapterUnsubscribes.clear();

    this.initialized = false;
    this.initPromise = null;

    console.log('[PlatformManagerService] Disposed');
  }
}

// ============================================
// Singleton Export
// ============================================

export const PlatformManagerService = new PlatformManagerServiceImpl();

// ============================================
// Factory for Testing
// ============================================

/**
 * Create a new instance of PlatformManagerService for testing
 */
export function createPlatformManagerService(): PlatformManagerServiceImpl {
  return new PlatformManagerServiceImpl();
}
