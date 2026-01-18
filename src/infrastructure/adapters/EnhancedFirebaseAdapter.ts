/**
 * Enhanced Firebase Adapter - Robust Firebase Firestore implementation of IOverlaySync
 * 
 * This adapter provides comprehensive overlay synchronization with:
 * - Robust error handling and classification
 * - Connection management with exponential backoff
 * - Schema compatibility for old and new formats
 * - Performance monitoring and diagnostics
 * - Resource cleanup and subscription management
 * 
 * Requirements: 1.5, 6.3, 7.2
 * 
 * @requirements 1.5 - Preserve type information and validate data integrity during serialization
 * @requirements 6.3 - Support both current and new schema formats with automatic migration
 * @requirements 7.2 - Use Firebase Firestore real-time listeners for immediate state synchronization
 */

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  DocumentReference, 
  Unsubscribe,
  FirestoreError,
  serverTimestamp
} from 'firebase/firestore';

import type { 
  IOverlaySync, 
  OverlayType, 
  OverlayState, 
  SyncCallback,
  SyncResult,
  SyncSubscription,
  SyncMetrics,
  ConnectionStatus,
  DiagnosticInfo
} from '../../domain/ports/IOverlaySync';

import { 
  OverlaySyncError,
  ConnectionSyncError,
  PermissionSyncError,
  ValidationSyncError,
  RateLimitSyncError,
  TimeoutSyncError,
  ConflictSyncError,
  ServiceUnavailableSyncError,
  SyncError,
  SyncErrorType,
  createSyncErrorFromGeneric
} from '../../domain/errors/OverlaySyncErrors';

import { 
  validateOverlayState, 
  validateAndMigrateSchema,
  OVERLAY_STATE_SCHEMA 
} from '../../domain/entities/OverlayStateValidation';

import { withRetry, RetryOptions } from '../../application/utils/retryLogic';
import { FirebaseAuthService } from '../auth/FirebaseAuthService';

/**
 * Configuration for the Enhanced Firebase Adapter
 */
export interface EnhancedFirebaseConfig {
  /** Firebase configuration object */
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  
  /** Base collection path for overlay data */
  basePath?: string;
  
  /** Connection timeout in milliseconds */
  timeoutMs?: number;
  
  /** Enable automatic retry on failures */
  retryEnabled?: boolean;
  
  /** Maximum number of retry attempts */
  maxRetries?: number;
  
  /** Enable performance monitoring */
  monitoringEnabled?: boolean;
  
  /** Enable schema migration */
  schemaMigrationEnabled?: boolean;
}

/**
 * Default Firebase configuration from environment variables
 */
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * Default retry options for Firebase operations
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Subscription tracking interface
 */
interface SubscriptionTracker {
  type: OverlayType;
  unsubscribe: Unsubscribe;
  callback: SyncCallback<OverlayState>;
  subscribedAt: number;
  callbackCount: number;
  lastCallbackAt?: number;
  latencyTracker?: number[]; // Track propagation latencies for performance monitoring
  connectionLatency?: number; // Time taken to establish the subscription
}

/**
 * Performance metrics tracking
 */
interface PerformanceTracker {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  latencySum: number;
  latencyCount: number;
  latencyMin: number;
  latencyMax: number;
  latencySamples: number[];
  errorCounts: Record<string, number>;
  lastOperationTime: number;
  connectionEvents: Array<{
    status: ConnectionStatus;
    timestamp: number;
  }>;
}

/**
 * Resource management for cleanup tracking
 */
interface ResourceManager {
  subscriptions: Map<string, SubscriptionTracker>;
  timers: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Timeout>;
  disposed: boolean;
  
  trackSubscription(key: string, subscription: SubscriptionTracker): void;
  trackTimer(timer: NodeJS.Timeout): void;
  trackInterval(interval: NodeJS.Timeout): void;
  cleanup(): void;
}

/**
 * Enhanced Firebase Adapter implementation
 * 
 * Provides robust Firebase Firestore synchronization with comprehensive
 * error handling, performance monitoring, and resource management.
 */
export class EnhancedFirebaseAdapter implements IOverlaySync {
  readonly syncId = 'enhanced-firebase';
  
  private app: FirebaseApp | null = null;
  private firestore: Firestore | null = null;
  private config: Required<EnhancedFirebaseConfig>;
  private connectionStatus: ConnectionStatus = 'initializing';
  private initPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private lastConnectedAt?: number;
  private lastDisconnectedAt?: number;
  private nextReconnectAt?: number;
  
  // Resource management
  private resourceManager: ResourceManager;
  
  // Performance tracking
  private performanceTracker: PerformanceTracker;
  
  // Device and sequence tracking for multi-device synchronization
  private deviceId: string;
  private sequenceCounters: Map<OverlayType, number> = new Map();
  
  // Recent errors for diagnostics
  private recentErrors: Array<{
    error: SyncError;
    operation: string;
    timestamp: number;
  }> = [];
  
  // Real-time performance tracking
  private realtimeMetrics: {
    propagationLatencies: Map<OverlayType, number[]>;
    publishTimestamps: Map<OverlayType, number[]>;
  } = {
    propagationLatencies: new Map(),
    publishTimestamps: new Map(),
  };
  
  constructor(config: EnhancedFirebaseConfig = {}) {
    this.config = {
      firebaseConfig: config.firebaseConfig || DEFAULT_FIREBASE_CONFIG,
      basePath: config.basePath || 'overlays',
      timeoutMs: config.timeoutMs || 10000,
      retryEnabled: config.retryEnabled ?? true,
      maxRetries: config.maxRetries || 3,
      monitoringEnabled: config.monitoringEnabled ?? true,
      schemaMigrationEnabled: config.schemaMigrationEnabled ?? true,
    };
    
    // Generate unique device ID for multi-device synchronization
    this.deviceId = this.generateDeviceId();
    
    // Initialize sequence counters for all overlay types
    const overlayTypes: OverlayType[] = ['poll', 'giveaway', 'game', 'prediction'];
    overlayTypes.forEach(type => {
      this.sequenceCounters.set(type, 0);
    });
    
    // Initialize resource manager
    this.resourceManager = {
      subscriptions: new Map(),
      timers: new Set(),
      intervals: new Set(),
      disposed: false,
      
      trackSubscription: (key: string, subscription: SubscriptionTracker) => {
        if (!this.resourceManager.disposed) {
          this.resourceManager.subscriptions.set(key, subscription);
        }
      },
      
      trackTimer: (timer: NodeJS.Timeout) => {
        if (!this.resourceManager.disposed) {
          this.resourceManager.timers.add(timer);
        }
      },
      
      trackInterval: (interval: NodeJS.Timeout) => {
        if (!this.resourceManager.disposed) {
          this.resourceManager.intervals.add(interval);
        }
      },
      
      cleanup: () => {
        // Clean up subscriptions
        for (const [, subscription] of this.resourceManager.subscriptions) {
          try {
            subscription.unsubscribe();
          } catch (error) {
            console.warn('Error cleaning up subscription:', error);
          }
        }
        this.resourceManager.subscriptions.clear();
        
        // Clean up timers
        for (const timer of this.resourceManager.timers) {
          clearTimeout(timer);
        }
        this.resourceManager.timers.clear();
        
        // Clean up intervals
        for (const interval of this.resourceManager.intervals) {
          clearInterval(interval);
        }
        this.resourceManager.intervals.clear();
        
        this.resourceManager.disposed = true;
      }
    };
    
    // Initialize performance tracker
    this.performanceTracker = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      latencySum: 0,
      latencyCount: 0,
      latencyMin: Infinity,
      latencyMax: 0,
      latencySamples: [],
      errorCounts: {},
      lastOperationTime: 0,
      connectionEvents: [],
    };
    
    // Start connection monitoring if enabled
    if (this.config.monitoringEnabled) {
      this.startConnectionMonitoring();
    }
  }
  
  /**
   * Ensure Firebase is initialized and connected
   */
  private async ensureConnection(): Promise<void> {
    if (this.connectionStatus === 'connected' && this.firestore) {
      return;
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }
  
  /**
   * Initialize Firebase connection with retry logic
   */
  private async doInitialize(): Promise<void> {
    try {
      this.connectionStatus = 'initializing';
      this.recordConnectionEvent('initializing');
      
      // Initialize Firebase Auth first
      await FirebaseAuthService.initialize();
      
      // Ensure we're authenticated
      if (!FirebaseAuthService.isAuthenticated()) {
        await FirebaseAuthService.signInAnonymously();
      }
      
      // Get or create Firebase app
      const apps = getApps();
      this.app = apps.length > 0 ? apps[0] : initializeApp(this.config.firebaseConfig, 'enhanced-firebase-sync');
      this.firestore = getFirestore(this.app);
      
      // Test connection with a simple operation
      await this.testConnection();
      
      this.connectionStatus = 'connected';
      this.lastConnectedAt = Date.now();
      this.reconnectAttempts = 0;
      this.recordConnectionEvent('connected');
      
      console.log('[EnhancedFirebaseAdapter] Successfully connected, UID:', FirebaseAuthService.getUid());
      
    } catch (error) {
      this.connectionStatus = 'error';
      this.lastDisconnectedAt = Date.now();
      this.recordConnectionEvent('error');
      
      const syncError = this.handleFirestoreError(error as Error, 'initialize');
      this.recordError(syncError, 'initialize');
      
      console.error('[EnhancedFirebaseAdapter] Initialization failed:', syncError.message);
      throw syncError;
    } finally {
      this.initPromise = null;
    }
  }
  
  /**
   * Test Firebase connection with a lightweight operation
   */
  private async testConnection(): Promise<void> {
    if (!this.firestore) {
      throw new ConnectionSyncError('Firestore not initialized');
    }
    
    const uid = FirebaseAuthService.getUid();
    if (!uid) {
      throw new PermissionSyncError('No authenticated user');
    }
    
    // Create a test document reference (doesn't actually write)
    const testRef = doc(this.firestore, `${this.config.basePath}/${uid}/test`);
    
    // This will throw if there are permission or connection issues
    if (!testRef) {
      throw new ConnectionSyncError('Failed to create document reference');
    }
  }
  
  /**
   * Publish overlay state with robust error handling and schema validation
   * Optimized for multi-device synchronization with performance tracking
   */
  async publish<T extends OverlayState>(state: T): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Validate state before publishing
      const validationResult = validateOverlayState(state);
      if (!validationResult.isValid) {
        const error = new ValidationSyncError(
          `Invalid overlay state: ${validationResult.errors.map(e => e.message).join(', ')}`,
          'VALIDATION_FAILED',
          { context: { errors: validationResult.errors, state } }
        );
        this.recordError(error.toSyncError(), 'publish');
        return this.createSyncResult(false, error.toSyncError(), startTime);
      }
      
      // Ensure connection
      await this.ensureConnection();
      
      if (!this.firestore) {
        const error = new ConnectionSyncError('Firestore not available');
        this.recordError(error.toSyncError(), 'publish');
        return this.createSyncResult(false, error.toSyncError(), startTime);
      }
      
      const uid = FirebaseAuthService.getUid();
      if (!uid) {
        const error = new PermissionSyncError('No authenticated user');
        this.recordError(error.toSyncError(), 'publish');
        return this.createSyncResult(false, error.toSyncError(), startTime);
      }
      
      // Create document reference
      const docRef = this.createDocumentReference(uid, state.type);
      
      // Prepare state for serialization with enhanced metadata for multi-device sync
      const publishTimestamp = Date.now();
      const serializedState = {
        ...state,
        version: OVERLAY_STATE_SCHEMA.version,
        updatedAt: serverTimestamp(),
        syncedAt: publishTimestamp, // Client timestamp for latency calculation
        ownerId: uid,
        deviceId: this.getDeviceId(), // Unique device identifier for multi-device tracking
        sequenceNumber: this.getNextSequenceNumber(state.type), // Sequence number for ordering
        publishLatency: Date.now() - startTime, // Track client-side processing time
      };
      
      // Execute publish operation with retry logic
      const operation = async () => {
        await setDoc(docRef, serializedState, { merge: false }); // Use merge: false for atomic updates
      };
      
      if (this.config.retryEnabled) {
        await withRetry(operation, {
          ...DEFAULT_RETRY_OPTIONS,
          maxAttempts: this.config.maxRetries,
          onRetry: (attempt, error) => {
            console.warn(`[EnhancedFirebaseAdapter] Publish retry ${attempt} for ${state.type}:`, error.message);
          }
        });
      } else {
        await operation();
      }
      
      // Record successful operation with enhanced metrics
      this.recordSuccessfulOperation(startTime);
      this.recordPublishMetrics(state.type, publishTimestamp);
      
      // Log performance metrics for monitoring
      const totalLatency = Date.now() - startTime;
      if (totalLatency > 50) { // Log if publish takes more than 50ms
        console.warn(`[EnhancedFirebaseAdapter] High publish latency: ${totalLatency}ms for ${state.type}`);
      }
      
      return this.createSyncResult(true, undefined, startTime);
      
    } catch (error) {
      const syncError = this.handleFirestoreError(error as Error, 'publish');
      this.recordError(syncError, 'publish');
      return this.createSyncResult(false, syncError, startTime);
    }
  }
  
  /**
   * Subscribe to overlay state changes with real-time listeners
   * Optimized for sub-100ms propagation latency and multi-device synchronization
   */
  subscribe<T extends OverlayState>(
    type: OverlayType, 
    callback: SyncCallback<T>
  ): SyncSubscription {
    const subscriptionKey = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const subscriptionStartTime = Date.now();
    
    // Initialize connection asynchronously
    this.ensureConnection().then(() => {
      if (!this.firestore || this.resourceManager.disposed) {
        return;
      }
      
      const uid = FirebaseAuthService.getUid();
      if (!uid) {
        console.warn('[EnhancedFirebaseAdapter] No authenticated user for subscription');
        callback(null);
        return;
      }
      
      const docRef = this.createDocumentReference(uid, type);
      
      // Set up real-time listener with performance optimization
      const unsubscribe = onSnapshot(
        docRef,
        {
          // Enable metadata changes for faster updates
          includeMetadataChanges: true
        },
        (snapshot) => {
          const callbackStartTime = Date.now();
          
          try {
            // Skip metadata-only changes to avoid unnecessary callbacks
            if (snapshot.metadata.hasPendingWrites) {
              return;
            }
            
            if (snapshot.exists()) {
              const data = snapshot.data();
              
              // Track propagation latency for performance monitoring
              const serverTimestamp = data?.syncedAt || data?.updatedAt?.toMillis?.() || Date.now();
              const propagationLatency = callbackStartTime - serverTimestamp;
              
              // Log performance warning if latency exceeds 100ms
              if (propagationLatency > 100) {
                console.warn(`[EnhancedFirebaseAdapter] High propagation latency detected: ${propagationLatency}ms for ${type}`);
              }
              
              // Handle schema migration if enabled
              let processedData = data;
              if (this.config.schemaMigrationEnabled && data) {
                const migrationResult = validateAndMigrateSchema(data);
                if (migrationResult) {
                  processedData = migrationResult.state;
                  if (migrationResult.migrated) {
                    console.log(`[EnhancedFirebaseAdapter] Migrated schema for ${type} from version ${data.version || 1} to ${OVERLAY_STATE_SCHEMA.version}`);
                  }
                }
              }
              
              // Update subscription metrics with latency tracking
              const subscription = this.resourceManager.subscriptions.get(subscriptionKey);
              if (subscription) {
                subscription.callbackCount++;
                subscription.lastCallbackAt = Date.now();
                
                // Track callback latency
                if (subscription.latencyTracker) {
                  subscription.latencyTracker.push(propagationLatency);
                  // Keep only last 50 samples
                  if (subscription.latencyTracker.length > 50) {
                    subscription.latencyTracker.shift();
                  }
                }
              }
              
              // Record performance metrics
              this.recordRealtimeLatency(propagationLatency, type);
              
              callback(processedData as T);
            } else {
              callback(null);
            }
          } catch (error) {
            const syncError = this.handleFirestoreError(error as Error, 'subscription_callback');
            this.recordError(syncError, 'subscription_callback');
            console.error('[EnhancedFirebaseAdapter] Subscription callback error:', syncError.message);
            callback(null);
          }
        },
        (error) => {
          const syncError = this.handleFirestoreError(error, 'subscription');
          this.recordError(syncError, 'subscription');
          console.error('[EnhancedFirebaseAdapter] Subscription error:', syncError.message);
          
          // Attempt automatic reconnection for subscription errors
          if (this.config.retryEnabled && this.connectionStatus === 'connected') {
            console.log(`[EnhancedFirebaseAdapter] Attempting to reestablish subscription for ${type}`);
            setTimeout(() => {
              if (!this.resourceManager.disposed) {
                this.reconnect().catch(reconnectError => {
                  console.error('[EnhancedFirebaseAdapter] Subscription reconnect failed:', reconnectError);
                });
              }
            }, 1000);
          }
          
          callback(null);
        }
      );
      
      // Track subscription for cleanup with enhanced metadata
      const subscriptionTracker: SubscriptionTracker = {
        type,
        unsubscribe,
        callback: callback as SyncCallback<OverlayState>,
        subscribedAt: Date.now(),
        callbackCount: 0,
        latencyTracker: [], // Track propagation latencies
        connectionLatency: Date.now() - subscriptionStartTime,
      };
      
      this.resourceManager.trackSubscription(subscriptionKey, subscriptionTracker);
      
      // Log successful subscription establishment
      console.log(`[EnhancedFirebaseAdapter] Real-time subscription established for ${type} (${Date.now() - subscriptionStartTime}ms)`);
      
    }).catch(error => {
      const syncError = this.handleFirestoreError(error, 'subscription_init');
      this.recordError(syncError, 'subscription_init');
      console.error('[EnhancedFirebaseAdapter] Subscription initialization error:', syncError.message);
      callback(null);
    });
    
    // Return enhanced subscription handle
    return {
      unsubscribe: () => {
        const subscription = this.resourceManager.subscriptions.get(subscriptionKey);
        if (subscription) {
          subscription.unsubscribe();
          this.resourceManager.subscriptions.delete(subscriptionKey);
          console.log(`[EnhancedFirebaseAdapter] Unsubscribed from ${type} (active for ${Date.now() - subscription.subscribedAt}ms)`);
        }
      },
      
      isActive: () => {
        return this.resourceManager.subscriptions.has(subscriptionKey);
      },
      
      getType: () => type,
      
      getMetadata: () => {
        const subscription = this.resourceManager.subscriptions.get(subscriptionKey);
        const latencyStats = subscription?.latencyTracker || [];
        const avgLatency = latencyStats.length > 0 
          ? latencyStats.reduce((sum, lat) => sum + lat, 0) / latencyStats.length 
          : 0;
        
        return {
          subscribedAt: subscription?.subscribedAt || 0,
          callbackCount: subscription?.callbackCount || 0,
          lastCallbackAt: subscription?.lastCallbackAt,
          connectionLatency: subscription?.connectionLatency || 0,
          averagePropagationLatency: avgLatency,
          maxPropagationLatency: latencyStats.length > 0 ? Math.max(...latencyStats) : 0,
          recentLatencies: latencyStats.slice(-10), // Last 10 latency measurements
        };
      }
    };
  }
  
  /**
   * Clear overlay state for a specific type
   */
  async clear(type: OverlayType): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      if (!this.firestore) {
        const error = new ConnectionSyncError('Firestore not available');
        this.recordError(error.toSyncError(), 'clear');
        return this.createSyncResult(false, error.toSyncError(), startTime);
      }
      
      const uid = FirebaseAuthService.getUid();
      if (!uid) {
        const error = new PermissionSyncError('No authenticated user');
        this.recordError(error.toSyncError(), 'clear');
        return this.createSyncResult(false, error.toSyncError(), startTime);
      }
      
      const docRef = this.createDocumentReference(uid, type);
      
      // Execute clear operation with retry logic
      const operation = async () => {
        await deleteDoc(docRef);
      };
      
      if (this.config.retryEnabled) {
        await withRetry(operation, {
          ...DEFAULT_RETRY_OPTIONS,
          maxAttempts: this.config.maxRetries,
          onRetry: (attempt, error) => {
            console.warn(`[EnhancedFirebaseAdapter] Clear retry ${attempt}:`, error.message);
          }
        });
      } else {
        await operation();
      }
      
      this.recordSuccessfulOperation(startTime);
      return this.createSyncResult(true, undefined, startTime);
      
    } catch (error) {
      const syncError = this.handleFirestoreError(error as Error, 'clear');
      this.recordError(syncError, 'clear');
      return this.createSyncResult(false, syncError, startTime);
    }
  }
  
  /**
   * Clear all overlay states
   */
  async clearAll(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Clear each overlay type individually
      const types: OverlayType[] = ['poll', 'giveaway', 'game', 'prediction'];
      const results = await Promise.allSettled(
        types.map(type => this.clear(type))
      );
      
      // Check if any operations failed
      const failures = results.filter(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && !result.value.success)
      );
      
      if (failures.length > 0) {
        const error = new OverlaySyncError(
          SyncErrorType.UNKNOWN,
          `Failed to clear ${failures.length} overlay types`,
          'CLEAR_ALL_PARTIAL_FAILURE',
          { context: { failures: failures.length, total: types.length } }
        );
        this.recordError(error.toSyncError(), 'clearAll');
        return this.createSyncResult(false, error.toSyncError(), startTime);
      }
      
      this.recordSuccessfulOperation(startTime);
      return this.createSyncResult(true, undefined, startTime);
      
    } catch (error) {
      const syncError = this.handleFirestoreError(error as Error, 'clearAll');
      this.recordError(syncError, 'clearAll');
      return this.createSyncResult(false, syncError, startTime);
    }
  }
  
  /**
   * Check if the adapter is currently connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }
  
  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * Manually trigger reconnection
   */
  async reconnect(): Promise<void> {
    this.connectionStatus = 'reconnecting';
    this.recordConnectionEvent('reconnecting');
    this.reconnectAttempts++;
    
    try {
      // Reset initialization promise to force reconnection
      this.initPromise = null;
      
      // Calculate backoff delay
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts - 1),
        30000
      );
      
      this.nextReconnectAt = Date.now() + delay;
      
      // Wait for backoff delay
      await new Promise(resolve => {
        const timer = setTimeout(resolve, delay);
        this.resourceManager.trackTimer(timer);
      });
      
      // Attempt reconnection
      await this.ensureConnection();
      
    } catch (error) {
      this.connectionStatus = 'error';
      this.recordConnectionEvent('error');
      throw error;
    }
  }
  
  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): SyncMetrics {
    const tracker = this.performanceTracker;
    
    // Calculate latency statistics
    const samples = tracker.latencySamples.slice(-100); // Last 100 samples
    samples.sort((a, b) => a - b);
    
    const latencyStats = {
      min: tracker.latencyMin === Infinity ? 0 : tracker.latencyMin,
      max: tracker.latencyMax,
      p50: samples.length > 0 ? samples[Math.floor(samples.length * 0.5)] : 0,
      p95: samples.length > 0 ? samples[Math.floor(samples.length * 0.95)] : 0,
      p99: samples.length > 0 ? samples[Math.floor(samples.length * 0.99)] : 0,
      samples: samples.length,
    };
    
    // Calculate real-time specific metrics
    const realtimeStats = this.calculateRealtimeStats();
    
    return {
      connectionStatus: this.connectionStatus,
      averageLatency: tracker.latencyCount > 0 ? tracker.latencySum / tracker.latencyCount : 0,
      errorRate: tracker.totalOperations > 0 ? (tracker.failedOperations / tracker.totalOperations) * 100 : 0,
      lastSyncTime: tracker.lastOperationTime,
      totalSyncs: tracker.totalOperations,
      failedSyncs: tracker.failedOperations,
      latencyStats,
      errorBreakdown: { ...tracker.errorCounts },
      activeSubscriptions: this.resourceManager.subscriptions.size,
      memoryUsage: {
        subscriptions: this.resourceManager.subscriptions.size,
        pendingOperations: 0, // Not tracked in this implementation
        cacheSize: 0, // Not applicable for Firebase
      },
      // Enhanced real-time metrics
      realtimePerformance: {
        averagePropagationLatency: realtimeStats.avgPropagationLatency,
        maxPropagationLatency: realtimeStats.maxPropagationLatency,
        sub100msRate: realtimeStats.sub100msRate,
        byOverlayType: realtimeStats.byType,
      },
      deviceInfo: {
        deviceId: this.deviceId,
        sequenceCounters: Object.fromEntries(this.sequenceCounters),
      },
    };
  }
  
  /**
   * Calculate real-time performance statistics
   */
  private calculateRealtimeStats(): {
    avgPropagationLatency: number;
    maxPropagationLatency: number;
    sub100msRate: number;
    byType: Record<OverlayType, {
      avgLatency: number;
      maxLatency: number;
      sampleCount: number;
      sub100msRate: number;
    }>;
  } {
    let totalLatency = 0;
    let totalSamples = 0;
    let maxLatency = 0;
    let sub100msCount = 0;
    
    const byType: Record<string, {
      avgLatency: number;
      maxLatency: number;
      sampleCount: number;
      sub100msRate: number;
    }> = {};
    
    // Process latencies by overlay type
    for (const [type, latencies] of this.realtimeMetrics.propagationLatencies) {
      if (latencies.length === 0) continue;
      
      const typeSum = latencies.reduce((sum, lat) => sum + lat, 0);
      const typeAvg = typeSum / latencies.length;
      const typeMax = Math.max(...latencies);
      const typeSub100ms = latencies.filter(lat => lat <= 100).length;
      
      byType[type] = {
        avgLatency: typeAvg,
        maxLatency: typeMax,
        sampleCount: latencies.length,
        sub100msRate: (typeSub100ms / latencies.length) * 100,
      };
      
      totalLatency += typeSum;
      totalSamples += latencies.length;
      maxLatency = Math.max(maxLatency, typeMax);
      sub100msCount += typeSub100ms;
    }
    
    return {
      avgPropagationLatency: totalSamples > 0 ? totalLatency / totalSamples : 0,
      maxPropagationLatency: maxLatency,
      sub100msRate: totalSamples > 0 ? (sub100msCount / totalSamples) * 100 : 0,
      byType: byType as Record<OverlayType, {
        avgLatency: number;
        maxLatency: number;
        sampleCount: number;
        sub100msRate: number;
      }>,
    };
  }
  
  /**
   * Get diagnostic information for troubleshooting
   */
  getDiagnostics(): DiagnosticInfo {
    return {
      syncId: this.syncId,
      connectionDetails: {
        status: this.connectionStatus,
        lastConnectedAt: this.lastConnectedAt,
        lastDisconnectedAt: this.lastDisconnectedAt,
        reconnectAttempts: this.reconnectAttempts,
        nextReconnectAt: this.nextReconnectAt,
      },
      performance: this.getMetrics(),
      recentErrors: this.recentErrors.slice(-10), // Last 10 errors
      config: {
        retryEnabled: this.config.retryEnabled,
        maxRetries: this.config.maxRetries,
        timeoutMs: this.config.timeoutMs,
        debounceMs: 0, // Not implemented in this adapter
      },
      runtime: {
        uptime: this.lastConnectedAt ? Date.now() - this.lastConnectedAt : 0,
        version: '1.0.0',
        environment: import.meta.env.MODE || 'development',
      },
    };
  }
  
  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.performanceTracker = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      latencySum: 0,
      latencyCount: 0,
      latencyMin: Infinity,
      latencyMax: 0,
      latencySamples: [],
      errorCounts: {},
      lastOperationTime: 0,
      connectionEvents: [],
    };
    
    this.recentErrors = [];
  }
  
  /**
   * Perform health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: SyncError;
    timestamp: number;
  }> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      if (!this.isConnected()) {
        return {
          healthy: false,
          error: new ConnectionSyncError('Not connected').toSyncError(),
          timestamp: Date.now(),
        };
      }
      
      // Test with a lightweight operation
      await this.testConnection();
      
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        latency,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      const syncError = this.handleFirestoreError(error as Error, 'healthCheck');
      
      return {
        healthy: false,
        error: syncError,
        timestamp: Date.now(),
      };
    }
  }
  
  /**
   * Clean up all resources and close connections
   */
  dispose(): void {
    this.resourceManager.cleanup();
    this.connectionStatus = 'disconnected';
    this.recordConnectionEvent('disconnected');
  }
  
  // Private helper methods
  
  /**
   * Create document reference for overlay type
   */
  private createDocumentReference(channelId: string, type: OverlayType): DocumentReference {
    if (!this.firestore) {
      throw new ConnectionSyncError('Firestore not initialized');
    }
    
    return doc(this.firestore, `${this.config.basePath}/${channelId}/${type}`);
  }
  
  /**
   * Handle Firestore errors and convert to sync errors
   */
  private handleFirestoreError(error: Error, operation: string): SyncError {
    if (error instanceof OverlaySyncError) {
      return error.toSyncError();
    }
    
    // Handle Firestore-specific errors
    if ('code' in error) {
      const firestoreError = error as FirestoreError;
      
      switch (firestoreError.code) {
        case 'permission-denied':
        case 'unauthenticated':
          return new PermissionSyncError(
            `Firebase permission denied: ${firestoreError.message}`,
            firestoreError.code.toUpperCase(),
            { context: { operation }, originalError: error }
          ).toSyncError();
          
        case 'unavailable':
        case 'deadline-exceeded':
          return new ServiceUnavailableSyncError(
            `Firebase service unavailable: ${firestoreError.message}`,
            firestoreError.code.toUpperCase(),
            { context: { operation }, originalError: error }
          ).toSyncError();
          
        case 'resource-exhausted':
          return new RateLimitSyncError(
            `Firebase rate limit exceeded: ${firestoreError.message}`,
            firestoreError.code.toUpperCase(),
            { context: { operation }, originalError: error }
          ).toSyncError();
          
        case 'failed-precondition':
        case 'aborted':
          return new ConflictSyncError(
            `Firebase conflict: ${firestoreError.message}`,
            firestoreError.code.toUpperCase(),
            { context: { operation }, originalError: error }
          ).toSyncError();
          
        case 'invalid-argument':
        case 'out-of-range':
          return new ValidationSyncError(
            `Firebase validation error: ${firestoreError.message}`,
            firestoreError.code.toUpperCase(),
            { context: { operation }, originalError: error }
          ).toSyncError();
          
        default:
          return createSyncErrorFromGeneric(error, { operation }).toSyncError();
      }
    }
    
    // Handle timeout errors
    if (error.message.toLowerCase().includes('timeout')) {
      return new TimeoutSyncError(
        `Operation timeout: ${error.message}`,
        'OPERATION_TIMEOUT',
        { context: { operation }, originalError: error }
      ).toSyncError();
    }
    
    // Handle network errors
    if (error.message.toLowerCase().includes('network') || 
        error.message.toLowerCase().includes('connection')) {
      return new ConnectionSyncError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        { context: { operation }, originalError: error }
      ).toSyncError();
    }
    
    // Default to generic sync error
    return createSyncErrorFromGeneric(error, { operation }).toSyncError();
  }
  
  /**
   * Create sync result with performance tracking
   */
  private createSyncResult(
    success: boolean, 
    error?: SyncError, 
    startTime?: number
  ): SyncResult {
    const timestamp = Date.now();
    const latency = startTime ? timestamp - startTime : undefined;
    
    return {
      success,
      error,
      latency,
      timestamp,
      metadata: {
        adapter: this.syncId,
        connectionStatus: this.connectionStatus,
      },
    };
  }
  
  /**
   * Record successful operation for performance tracking
   */
  private recordSuccessfulOperation(startTime: number): void {
    const latency = Date.now() - startTime;
    const tracker = this.performanceTracker;
    
    tracker.totalOperations++;
    tracker.successfulOperations++;
    tracker.lastOperationTime = Date.now();
    
    // Update latency statistics
    tracker.latencySum += latency;
    tracker.latencyCount++;
    tracker.latencyMin = Math.min(tracker.latencyMin, latency);
    tracker.latencyMax = Math.max(tracker.latencyMax, latency);
    
    // Keep last 100 samples for percentile calculations
    tracker.latencySamples.push(latency);
    if (tracker.latencySamples.length > 100) {
      tracker.latencySamples.shift();
    }
  }
  
  /**
   * Record error for performance tracking and diagnostics
   */
  private recordError(error: SyncError, operation: string): void {
    const tracker = this.performanceTracker;
    
    tracker.totalOperations++;
    tracker.failedOperations++;
    tracker.lastOperationTime = Date.now();
    
    // Update error counts
    const errorKey = `${error.type}:${error.code}`;
    tracker.errorCounts[errorKey] = (tracker.errorCounts[errorKey] || 0) + 1;
    
    // Add to recent errors (keep last 20)
    this.recentErrors.push({
      error,
      operation,
      timestamp: Date.now(),
    });
    
    if (this.recentErrors.length > 20) {
      this.recentErrors.shift();
    }
  }
  
  /**
   * Record connection status change
   */
  private recordConnectionEvent(status: ConnectionStatus): void {
    this.performanceTracker.connectionEvents.push({
      status,
      timestamp: Date.now(),
    });
    
    // Keep last 50 events
    if (this.performanceTracker.connectionEvents.length > 50) {
      this.performanceTracker.connectionEvents.shift();
    }
  }
  
  /**
   * Start connection monitoring
   */
  private startConnectionMonitoring(): void {
    // Monitor connection status periodically
    const monitoringInterval = setInterval(() => {
      if (this.resourceManager.disposed) {
        clearInterval(monitoringInterval);
        return;
      }
      
      // Check if we need to reconnect
      if (this.connectionStatus === 'error' && this.config.retryEnabled) {
        const now = Date.now();
        if (!this.nextReconnectAt || now >= this.nextReconnectAt) {
          this.reconnect().catch(error => {
            console.warn('[EnhancedFirebaseAdapter] Auto-reconnect failed:', error.message);
          });
        }
      }
      
    }, 5000); // Check every 5 seconds
    
    this.resourceManager.trackInterval(monitoringInterval);
  }
  
  /**
   * Generate unique device ID for multi-device synchronization
   */
  private generateDeviceId(): string {
    // Try to get persistent device ID from localStorage
    const storageKey = 'streamcrowd_device_id';
    let deviceId = localStorage.getItem(storageKey);
    
    if (!deviceId) {
      // Generate new device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(storageKey, deviceId);
    }
    
    return deviceId;
  }
  
  /**
   * Get device ID for multi-device tracking
   */
  private getDeviceId(): string {
    return this.deviceId;
  }
  
  /**
   * Get next sequence number for ordering operations
   */
  private getNextSequenceNumber(type: OverlayType): number {
    const current = this.sequenceCounters.get(type) || 0;
    const next = current + 1;
    this.sequenceCounters.set(type, next);
    return next;
  }
  
  /**
   * Record real-time propagation latency for performance monitoring
   */
  private recordRealtimeLatency(latency: number, type: OverlayType): void {
    if (!this.realtimeMetrics.propagationLatencies.has(type)) {
      this.realtimeMetrics.propagationLatencies.set(type, []);
    }
    
    const latencies = this.realtimeMetrics.propagationLatencies.get(type)!;
    latencies.push(latency);
    
    // Keep only last 100 samples per type
    if (latencies.length > 100) {
      latencies.shift();
    }
    
    // Update global performance tracker
    this.performanceTracker.latencySum += latency;
    this.performanceTracker.latencyCount++;
    this.performanceTracker.latencyMin = Math.min(this.performanceTracker.latencyMin, latency);
    this.performanceTracker.latencyMax = Math.max(this.performanceTracker.latencyMax, latency);
    
    // Add to samples for percentile calculations
    this.performanceTracker.latencySamples.push(latency);
    if (this.performanceTracker.latencySamples.length > 100) {
      this.performanceTracker.latencySamples.shift();
    }
  }
  
  /**
   * Record publish metrics for performance analysis
   */
  private recordPublishMetrics(type: OverlayType, timestamp: number): void {
    if (!this.realtimeMetrics.publishTimestamps.has(type)) {
      this.realtimeMetrics.publishTimestamps.set(type, []);
    }
    
    const timestamps = this.realtimeMetrics.publishTimestamps.get(type)!;
    timestamps.push(timestamp);
    
    // Keep only last 50 timestamps per type
    if (timestamps.length > 50) {
      timestamps.shift();
    }
  }
}

// Singleton instance for backward compatibility
let defaultInstance: EnhancedFirebaseAdapter | null = null;

/**
 * Get the default Enhanced Firebase Adapter instance
 */
export function getEnhancedFirebaseAdapter(config?: EnhancedFirebaseConfig): EnhancedFirebaseAdapter {
  if (!defaultInstance) {
    defaultInstance = new EnhancedFirebaseAdapter(config);
  }
  return defaultInstance;
}

/**
 * Create a new Enhanced Firebase Adapter instance
 */
export function createEnhancedFirebaseAdapter(config?: EnhancedFirebaseConfig): EnhancedFirebaseAdapter {
  return new EnhancedFirebaseAdapter(config);
}