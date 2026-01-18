/**
 * Enhanced IOverlaySync - Port for overlay synchronization with comprehensive features
 * 
 * This interface defines the contract for synchronizing overlay state between
 * the main application and overlay windows/devices for interactive streaming features.
 * 
 * Enhanced features include:
 * - Type-safe overlay state management
 * - Performance monitoring and diagnostics
 * - Connection management with retry logic
 * - Comprehensive error handling and recovery
 * - Resource cleanup and subscription management
 * 
 * Possible implementations:
 * - Enhanced Firebase Firestore adapter
 * - WebSocket server with real-time sync
 * - OBS WebSocket integration
 * - BroadcastChannel for same-browser sync
 */

import { SyncError } from '../errors/OverlaySyncErrors';

// Re-export OverlayType from entities for consistency
export type { OverlayType } from '../entities/OverlayState';
export type { OverlayState } from '../entities/OverlayState';

/**
 * Connection status enumeration
 */
export type ConnectionStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'error' 
  | 'initializing';

/**
 * Callback function for overlay state changes
 */
export type SyncCallback<T> = (state: T | null) => void;

/**
 * Result of a synchronization operation
 */
export interface SyncResult {
  /** Whether the operation was successful */
  success: boolean;
  
  /** Error information if the operation failed */
  error?: SyncError;
  
  /** Operation latency in milliseconds */
  latency?: number;
  
  /** Timestamp when the operation completed */
  timestamp: number;
  
  /** Additional metadata about the operation */
  metadata?: Record<string, unknown>;
}

/**
 * Subscription handle for overlay state changes
 */
export interface SyncSubscription {
  /** Unsubscribe from state changes */
  unsubscribe(): void;
  
  /** Check if the subscription is still active */
  isActive(): boolean;
  
  /** Get the overlay type this subscription is for */
  getType(): OverlayType;
  
  /** Get subscription metadata */
  getMetadata(): {
    subscribedAt: number;
    callbackCount: number;
    lastCallbackAt?: number;
    connectionLatency?: number;
    averagePropagationLatency?: number;
    maxPropagationLatency?: number;
    recentLatencies?: number[];
  };
}

/**
 * Performance metrics for sync operations
 */
export interface SyncMetrics {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  
  /** Average latency for sync operations in milliseconds */
  averageLatency: number;
  
  /** Error rate as a percentage (0-100) */
  errorRate: number;
  
  /** Timestamp of the last successful sync operation */
  lastSyncTime: number;
  
  /** Total number of sync operations attempted */
  totalSyncs: number;
  
  /** Number of failed sync operations */
  failedSyncs: number;
  
  /** Detailed latency statistics */
  latencyStats: {
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    samples: number;
  };
  
  /** Error breakdown by type */
  errorBreakdown: Record<string, number>;
  
  /** Active subscriptions count */
  activeSubscriptions: number;
  
  /** Memory usage statistics */
  memoryUsage?: {
    subscriptions: number;
    pendingOperations: number;
    cacheSize: number;
  };
  
  /** Real-time synchronization performance metrics */
  realtimePerformance?: {
    /** Average propagation latency in milliseconds */
    averagePropagationLatency: number;
    /** Maximum propagation latency in milliseconds */
    maxPropagationLatency: number;
    /** Percentage of updates delivered within 100ms */
    sub100msRate: number;
    /** Performance breakdown by overlay type */
    byOverlayType: Record<OverlayType, {
      avgLatency: number;
      maxLatency: number;
      sampleCount: number;
      sub100msRate: number;
    }>;
  };
  
  /** Device and multi-device synchronization info */
  deviceInfo?: {
    /** Unique device identifier */
    deviceId: string;
    /** Sequence counters by overlay type */
    sequenceCounters: Record<string, number>;
  };
}

/**
 * Diagnostic information for troubleshooting
 */
export interface DiagnosticInfo {
  /** Sync adapter identifier */
  syncId: string;
  
  /** Connection status details */
  connectionDetails: {
    status: ConnectionStatus;
    lastConnectedAt?: number;
    lastDisconnectedAt?: number;
    reconnectAttempts: number;
    nextReconnectAt?: number;
  };
  
  /** Performance summary */
  performance: SyncMetrics;
  
  /** Recent errors (last 10) */
  recentErrors: Array<{
    error: SyncError;
    operation: string;
    timestamp: number;
  }>;
  
  /** Configuration information */
  config: {
    retryEnabled: boolean;
    maxRetries: number;
    timeoutMs: number;
    debounceMs: number;
  };
  
  /** Runtime information */
  runtime: {
    uptime: number;
    version: string;
    environment: string;
  };
}
/**
 * Enhanced interface for overlay synchronization
 * 
 * Provides comprehensive overlay state management with performance monitoring,
 * connection management, and robust error handling capabilities.
 */
export interface IOverlaySync {
  /** Unique identifier for this sync provider */
  readonly syncId: string;
  
  // Core synchronization methods
  
  /** 
   * Publish overlay state to all connected clients
   * @param state The overlay state to publish
   * @returns Promise resolving to sync result with latency and error info
   */
  publish<T extends OverlayState>(state: T): Promise<SyncResult>;
  
  /** 
   * Subscribe to overlay state changes for a specific type
   * @param type The overlay type to subscribe to
   * @param callback Function called when state changes
   * @returns Subscription handle for managing the subscription
   */
  subscribe<T extends OverlayState>(
    type: OverlayType, 
    callback: SyncCallback<T>
  ): SyncSubscription;
  
  /** 
   * Clear overlay state for a specific type
   * @param type The overlay type to clear
   * @returns Promise resolving to sync result
   */
  clear(type: OverlayType): Promise<SyncResult>;
  
  /** 
   * Clear all overlay states
   * @returns Promise resolving to sync result
   */
  clearAll(): Promise<SyncResult>;
  
  // Connection management
  
  /** 
   * Check if the sync provider is currently connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean;
  
  /** 
   * Get detailed connection status information
   * @returns Current connection status
   */
  getConnectionStatus(): ConnectionStatus;
  
  /** 
   * Manually trigger reconnection attempt
   * @returns Promise that resolves when reconnection completes
   */
  reconnect(): Promise<void>;
  
  // Performance monitoring
  
  /** 
   * Get comprehensive performance metrics
   * @returns Current performance metrics and statistics
   */
  getMetrics(): SyncMetrics;
  
  /** 
   * Get diagnostic information for troubleshooting
   * @returns Detailed diagnostic information
   */
  getDiagnostics(): DiagnosticInfo;
  
  /** 
   * Reset performance metrics and statistics
   */
  resetMetrics(): void;
  
  // Resource management
  
  /** 
   * Clean up all resources and close connections
   * Should be called when the sync provider is no longer needed
   */
  dispose(): void;
  
  // Health monitoring
  
  /** 
   * Perform a health check to verify sync functionality
   * @returns Promise resolving to health check result
   */
  healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: SyncError;
    timestamp: number;
  }>;
}

/**
 * Enhanced interface for bidirectional sync (OBS WebSocket, etc.)
 * 
 * Extends the base IOverlaySync interface with command-based communication
 * for interactive overlays that can send commands back to the application.
 */
export interface IBidirectionalSync extends IOverlaySync {
  /** 
   * Register callback for commands received from overlay
   * @param callback Function to handle incoming commands
   * @returns Unsubscribe function
   */
  onCommand(callback: (command: string, data: unknown) => void): () => void;
  
  /** 
   * Send command to overlay
   * @param command Command name to send
   * @param data Command payload data
   * @returns Promise resolving to command result
   */
  sendCommand(command: string, data: unknown): Promise<SyncResult>;
  
  /** 
   * Get list of supported commands for this sync provider
   * @returns Array of supported command names
   */
  getSupportedCommands(): string[];
  
  /** 
   * Check if a specific command is supported
   * @param command Command name to check
   * @returns True if command is supported
   */
  supportsCommand(command: string): boolean;
}

/**
 * Configuration options for sync providers
 */
export interface SyncProviderConfig {
  /** Provider identifier */
  providerId: string;
  
  /** Connection timeout in milliseconds */
  timeoutMs?: number;
  
  /** Enable automatic retry on failures */
  retryEnabled?: boolean;
  
  /** Maximum number of retry attempts */
  maxRetries?: number;
  
  /** Debounce interval for rapid updates in milliseconds */
  debounceMs?: number;
  
  /** Enable performance monitoring */
  monitoringEnabled?: boolean;
  
  /** Custom error handling strategy */
  errorHandling?: {
    logErrors?: boolean;
    notifyUser?: boolean;
    fallbackToLocal?: boolean;
  };
  
  /** Provider-specific configuration */
  providerConfig?: Record<string, unknown>;
}

/**
 * Factory interface for creating sync providers
 */
export interface ISyncProviderFactory {
  /** 
   * Create a sync provider instance
   * @param config Configuration for the provider
   * @returns Promise resolving to sync provider instance
   */
  createProvider(config: SyncProviderConfig): Promise<IOverlaySync>;
  
  /** 
   * Get available provider types
   * @returns Array of supported provider type identifiers
   */
  getSupportedProviders(): string[];
  
  /** 
   * Check if a provider type is supported
   * @param providerId Provider identifier to check
   * @returns True if provider is supported
   */
  supportsProvider(providerId: string): boolean;
}

/**
 * Event types for sync provider lifecycle
 */
export type SyncProviderEvent = 
  | 'connected'
  | 'disconnected' 
  | 'reconnecting'
  | 'error'
  | 'state_changed'
  | 'subscription_added'
  | 'subscription_removed'
  | 'metrics_updated';

/**
 * Event listener interface for sync provider events
 */
export interface ISyncProviderEventListener {
  /** 
   * Register event listener
   * @param event Event type to listen for
   * @param callback Function to call when event occurs
   * @returns Unsubscribe function
   */
  on(event: SyncProviderEvent, callback: (data?: unknown) => void): () => void;
  
  /** 
   * Register one-time event listener
   * @param event Event type to listen for
   * @param callback Function to call when event occurs
   * @returns Unsubscribe function
   */
  once(event: SyncProviderEvent, callback: (data?: unknown) => void): () => void;
  
  /** 
   * Remove all listeners for an event type
   * @param event Event type to clear listeners for
   */
  removeAllListeners(event?: SyncProviderEvent): void;
}

/**
 * Enhanced sync provider interface with event support
 */
export interface IEnhancedOverlaySync extends IOverlaySync, ISyncProviderEventListener {
  /** 
   * Get provider configuration
   * @returns Current provider configuration
   */
  getConfig(): SyncProviderConfig;
  
  /** 
   * Update provider configuration
   * @param config New configuration options
   * @returns Promise that resolves when configuration is updated
   */
  updateConfig(config: Partial<SyncProviderConfig>): Promise<void>;
  
  /** 
   * Get provider capabilities
   * @returns Object describing provider capabilities
   */
  getCapabilities(): {
    supportsBidirectional: boolean;
    supportsRealtime: boolean;
    supportsOffline: boolean;
    maxSubscriptions: number;
    supportedOverlayTypes: OverlayType[];
  };
}
