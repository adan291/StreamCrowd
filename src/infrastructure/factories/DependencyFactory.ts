/**
 * DependencyFactory - Centralized dependency injection container
 * 
 * This factory manages the creation and lifecycle of all application dependencies,
 * implementing the Singleton pattern to ensure consistent dependency injection
 * throughout the application. It follows hexagonal architecture principles by
 * providing interfaces rather than concrete implementations to the application layer.
 */

import type { IOverlaySync } from '../../domain/ports/IOverlaySync';
import { FirebaseSyncAdapter } from '../adapters/FirebaseSyncAdapter';
import { EnhancedFirebaseAdapter } from '../adapters/EnhancedFirebaseAdapter';
import { MockSyncAdapter } from '../adapters/MockSyncAdapter';
import { OverlaySyncService } from '../../application/services/OverlaySyncService';
import { OverlayStateManager } from '../../application/services/OverlayStateManager';
import { PerformanceMonitor } from '../../application/services/PerformanceMonitor';
import { ErrorRecoverySystem } from '../../application/services/ErrorRecoverySystem';
import { AuditLogService } from '../../application/services/AuditLogService';
import { NetworkPrioritizationService } from '../../application/services/NetworkPrioritizationService';
import { ErrorClassificationService } from '../../application/services/ErrorClassificationService';
import { HealthCheckService } from '../../application/services/HealthCheckService';
import { ResourceManager } from '../utils/ResourceManager';

/**
 * Configuration for the dependency factory
 */
export interface DependencyFactoryConfig {
  /** Backend provider to use ('firebase' | 'enhanced-firebase' | 'mock' | 'local') */
  syncProvider: 'firebase' | 'enhanced-firebase' | 'mock' | 'local';
  
  /** Enable debug logging */
  debug: boolean;
  
  /** Enable network prioritization */
  networkPrioritizationEnabled: boolean;
  
  /** Enable performance monitoring */
  performanceMonitoringEnabled: boolean;
  
  /** Enable automatic error recovery */
  autoRecoveryEnabled: boolean;
  
  /** Enable audit logging */
  auditLoggingEnabled: boolean;
  
  /** Environment configuration */
  environment: 'development' | 'production' | 'test';
  
  /** Custom adapter configurations */
  adapterConfigs?: {
    firebase?: {
      basePath?: string;
      retryAttempts?: number;
      timeoutMs?: number;
    };
    enhancedFirebase?: {
      basePath?: string;
      retryAttempts?: number;
      timeoutMs?: number;
      enableRealtime?: boolean;
      enableCompression?: boolean;
    };
    mock?: {
      simulateLatency?: boolean;
      latencyMs?: number;
      simulateErrors?: boolean;
      errorRate?: number;
    };
  };
  
  /** Service configurations */
  serviceConfigs?: {
    overlaySyncService?: {
      serviceId?: string;
      monitoringEnabled?: boolean;
      autoRecoveryEnabled?: boolean;
      maxSubscriptions?: number;
      networkPrioritizationEnabled?: boolean;
    };
    performanceMonitor?: {
      sampleRate?: number;
      retentionPeriod?: number;
      alertThresholds?: {
        latency?: number;
        errorRate?: number;
      };
    };
    errorRecovery?: {
      maxRetries?: number;
      baseDelayMs?: number;
      maxDelayMs?: number;
      enableCircuitBreaker?: boolean;
    };
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DependencyFactoryConfig = {
  syncProvider: (import.meta.env.VITE_SYNC_BACKEND as 'firebase' | 'enhanced-firebase' | 'mock' | 'local') || 'enhanced-firebase',
  debug: import.meta.env.DEV || false,
  networkPrioritizationEnabled: true,
  performanceMonitoringEnabled: true,
  autoRecoveryEnabled: true,
  auditLoggingEnabled: true,
  environment: (import.meta.env.MODE as 'development' | 'production' | 'test') || 'development',
  adapterConfigs: {
    firebase: {
      basePath: 'overlays',
      retryAttempts: 3,
      timeoutMs: 10000,
    },
    enhancedFirebase: {
      basePath: 'overlays',
      retryAttempts: 3,
      timeoutMs: 10000,
      enableRealtime: true,
      enableCompression: true,
    },
    mock: {
      simulateLatency: true,
      latencyMs: 100,
      simulateErrors: false,
      errorRate: 0.1,
    },
  },
  serviceConfigs: {
    overlaySyncService: {
      serviceId: 'overlay-sync-service',
      monitoringEnabled: true,
      autoRecoveryEnabled: true,
      maxSubscriptions: 50,
      networkPrioritizationEnabled: true,
    },
    performanceMonitor: {
      sampleRate: 1.0,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        latency: 1000, // 1 second
        errorRate: 0.05, // 5%
      },
    },
    errorRecovery: {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      enableCircuitBreaker: true,
    },
  },
};

/**
 * Centralized dependency injection factory
 * 
 * Implements the Singleton pattern to ensure consistent dependency injection
 * throughout the application. Provides clean separation between infrastructure
 * and application layers.
 */
export class DependencyFactory {
  private static instance: DependencyFactory | null = null;
  
  private config: DependencyFactoryConfig;
  private overlaySyncAdapter: IOverlaySync | null = null;
  private overlayStateManager: OverlayStateManager | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;
  private errorRecoverySystem: ErrorRecoverySystem | null = null;
  private resourceManager: ResourceManager | null = null;
  private overlaySyncService: OverlaySyncService | null = null;
  private auditLogService: AuditLogService | null = null;
  private networkPrioritizationService: NetworkPrioritizationService | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor(config: Partial<DependencyFactoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.debug) {
      console.log('[DependencyFactory] Initialized with config:', this.config);
    }
  }

  /**
   * Get the singleton instance of the dependency factory
   */
  static getInstance(config?: Partial<DependencyFactoryConfig>): DependencyFactory {
    if (!DependencyFactory.instance) {
      DependencyFactory.instance = new DependencyFactory(config);
    }
    return DependencyFactory.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    if (DependencyFactory.instance) {
      DependencyFactory.instance.dispose();
      DependencyFactory.instance = null;
    }
  }

  /**
   * Initialize all dependencies asynchronously
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      if (this.config.debug) {
        console.log('[DependencyFactory] Starting initialization...');
      }

      // Create resource manager first (needed by other services)
      this.resourceManager = new ResourceManager({
        maxResources: 500,
        warningThreshold: 50,
      });

      // Create overlay sync adapter based on configuration
      this.overlaySyncAdapter = await this.createOverlaySyncAdapter();
      
      // Create core application services
      this.overlayStateManager = new OverlayStateManager();
      
      // Create performance monitor with configuration
      const perfConfig = this.config.serviceConfigs?.performanceMonitor || {};
      this.performanceMonitor = new PerformanceMonitor(perfConfig);
      
      // Create error recovery system with configuration
      const errorConfig = this.config.serviceConfigs?.errorRecovery || {};
      this.errorRecoverySystem = new ErrorRecoverySystem(
        this.overlaySyncAdapter,
        errorConfig
      );
      
      // Create audit log service if enabled
      if (this.config.auditLoggingEnabled) {
        this.auditLogService = new AuditLogService();
      }
      
      // Create network prioritization service if enabled
      if (this.config.networkPrioritizationEnabled) {
        this.networkPrioritizationService = new NetworkPrioritizationService(this.overlaySyncAdapter);
      }
      
      // Create overlay sync service with all dependencies
      const serviceConfig = this.config.serviceConfigs?.overlaySyncService || {};
      this.overlaySyncService = new OverlaySyncService(
        this.overlaySyncAdapter,
        this.overlayStateManager,
        this.performanceMonitor,
        this.errorRecoverySystem,
        this.resourceManager,
        this.auditLogService,
        this.networkPrioritizationService,
        {
          serviceId: serviceConfig.serviceId || 'overlay-sync-service',
          monitoringEnabled: serviceConfig.monitoringEnabled ?? true,
          autoRecoveryEnabled: serviceConfig.autoRecoveryEnabled ?? true,
          maxSubscriptions: serviceConfig.maxSubscriptions || 50,
          networkPrioritizationEnabled: serviceConfig.networkPrioritizationEnabled ?? this.config.networkPrioritizationEnabled,
        }
      );
      
      this.initialized = true;
      
      if (this.config.debug) {
        console.log('[DependencyFactory] Initialization completed successfully');
      }
    } catch (error) {
      console.error('[DependencyFactory] Initialization failed:', error);
      
      // Fallback to mock adapter in case of initialization failure
      if (this.config.syncProvider !== 'mock') {
        console.warn('[DependencyFactory] Falling back to mock adapter');
        await this.initializeFallbackServices();
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize fallback services when primary initialization fails
   */
  private async initializeFallbackServices(): Promise<void> {
    try {
      // Create resource manager
      this.resourceManager = new ResourceManager({
        maxResources: 500,
        warningThreshold: 50,
      });

      // Create mock adapter
      this.overlaySyncAdapter = await this.createMockAdapter();
      
      // Create basic services
      this.overlayStateManager = new OverlayStateManager();
      this.performanceMonitor = new PerformanceMonitor();
      this.errorRecoverySystem = new ErrorRecoverySystem(this.overlaySyncAdapter);
      
      if (this.config.auditLoggingEnabled) {
        this.auditLogService = new AuditLogService();
      }
      
      if (this.config.networkPrioritizationEnabled) {
        this.networkPrioritizationService = new NetworkPrioritizationService(this.overlaySyncAdapter);
      }
      
      // Create overlay sync service with fallback configuration
      this.overlaySyncService = new OverlaySyncService(
        this.overlaySyncAdapter,
        this.overlayStateManager,
        this.performanceMonitor,
        this.errorRecoverySystem,
        this.resourceManager,
        this.auditLogService,
        this.networkPrioritizationService,
        {
          serviceId: 'overlay-sync-service-fallback',
          monitoringEnabled: false, // Disable monitoring in fallback mode
          autoRecoveryEnabled: true,
          maxSubscriptions: 10, // Reduced capacity
          networkPrioritizationEnabled: false,
        }
      );
      
      this.initialized = true;
      
      if (this.config.debug) {
        console.log('[DependencyFactory] Fallback initialization completed');
      }
    } catch (fallbackError) {
      console.error('[DependencyFactory] Fallback initialization failed:', fallbackError);
      throw fallbackError;
    }
  }

  /**
   * Create overlay sync adapter based on configuration
   */
  private async createOverlaySyncAdapter(): Promise<IOverlaySync> {
    switch (this.config.syncProvider) {
      case 'firebase':
        return this.createFirebaseAdapter();
      
      case 'enhanced-firebase':
        return this.createEnhancedFirebaseAdapter();
      
      case 'mock':
        return this.createMockAdapter();
      
      case 'local':
        return this.createLocalAdapter();
      
      default:
        throw new Error(`Unsupported sync provider: ${this.config.syncProvider}`);
    }
  }

  /**
   * Create Firebase sync adapter (legacy)
   */
  private createFirebaseAdapter(): IOverlaySync {
    const config = this.config.adapterConfigs?.firebase || {};
    
    if (this.config.debug) {
      console.log('[DependencyFactory] Creating Firebase adapter with config:', config);
    }
    
    return new FirebaseSyncAdapter({
      basePath: config.basePath,
    });
  }

  /**
   * Create Enhanced Firebase sync adapter (recommended)
   */
  private createEnhancedFirebaseAdapter(): IOverlaySync {
    const config = this.config.adapterConfigs?.enhancedFirebase || {};
    
    if (this.config.debug) {
      console.log('[DependencyFactory] Creating Enhanced Firebase adapter with config:', config);
    }
    
    return new EnhancedFirebaseAdapter({
      basePath: config.basePath || 'overlays',
      retryAttempts: config.retryAttempts || 3,
      timeoutMs: config.timeoutMs || 10000,
      enableRealtime: config.enableRealtime ?? true,
      enableCompression: config.enableCompression ?? true,
    });
  }

  /**
   * Create mock sync adapter for testing/development
   */
  private async createMockAdapter(): Promise<IOverlaySync> {
    // Dynamic import to avoid bundling mock adapter in production
    const { MockSyncAdapter } = await import('../adapters/MockSyncAdapter');
    const config = this.config.adapterConfigs?.mock || {};
    
    if (this.config.debug) {
      console.log('[DependencyFactory] Creating Mock adapter with config:', config);
    }
    
    return new MockSyncAdapter({
      simulateLatency: config.simulateLatency ?? true,
      latencyMs: config.latencyMs || 100,
      simulateErrors: config.simulateErrors ?? false,
      errorRate: config.errorRate || 0.1,
    });
  }

  /**
   * Create local storage sync adapter
   */
  private async createLocalAdapter(): Promise<IOverlaySync> {
    // Dynamic import to avoid bundling local adapter in production
    const { LocalStorageAdapter } = await import('../adapters/LocalStorageAdapter');
    
    if (this.config.debug) {
      console.log('[DependencyFactory] Creating Local Storage adapter');
    }
    
    return new LocalStorageAdapter();
  }

  /**
   * Get the overlay state manager instance
   * 
   * @returns Promise resolving to OverlayStateManager instance
   */
  async getOverlayStateManager(): Promise<OverlayStateManager> {
    await this.initialize();
    
    if (!this.overlayStateManager) {
      throw new Error('OverlayStateManager not initialized');
    }
    
    return this.overlayStateManager;
  }

  /**
   * Get the performance monitor instance
   * 
   * @returns Promise resolving to PerformanceMonitor instance
   */
  async getPerformanceMonitor(): Promise<PerformanceMonitor> {
    await this.initialize();
    
    if (!this.performanceMonitor) {
      throw new Error('PerformanceMonitor not initialized');
    }
    
    return this.performanceMonitor;
  }

  /**
   * Get the error recovery system instance
   * 
   * @returns Promise resolving to ErrorRecoverySystem instance
   */
  async getErrorRecoverySystem(): Promise<ErrorRecoverySystem> {
    await this.initialize();
    
    if (!this.errorRecoverySystem) {
      throw new Error('ErrorRecoverySystem not initialized');
    }
    
    return this.errorRecoverySystem;
  }

  /**
   * Get the resource manager instance
   * 
   * @returns Promise resolving to ResourceManager instance
   */
  async getResourceManager(): Promise<ResourceManager> {
    await this.initialize();
    
    if (!this.resourceManager) {
      throw new Error('ResourceManager not initialized');
    }
    
    return this.resourceManager;
  }

  /**
   * Get the audit log service instance
   * 
   * @returns Promise resolving to AuditLogService instance or null if disabled
   */
  async getAuditLogService(): Promise<AuditLogService | null> {
    await this.initialize();
    return this.auditLogService;
  }

  /**
   * Get the network prioritization service instance
   * 
   * @returns Promise resolving to NetworkPrioritizationService instance or null if disabled
   */
  async getNetworkPrioritizationService(): Promise<NetworkPrioritizationService | null> {
    await this.initialize();
    return this.networkPrioritizationService;
  }
  /**
   * Get the overlay sync service instance
   * 
   * @returns Promise resolving to OverlaySyncService instance
   */
  async getOverlaySyncService(): Promise<OverlaySyncService> {
    await this.initialize();
    
    if (!this.overlaySyncService) {
      throw new Error('OverlaySyncService not initialized');
    }
    
    return this.overlaySyncService;
  }

  /**
   * Get the overlay sync service instance synchronously
   * 
   * Note: This method assumes the factory has been initialized.
   * Use getOverlaySyncService() for guaranteed initialization.
   * 
   * @returns OverlaySyncService instance
   * @throws Error if not initialized
   */
  getOverlaySyncServiceSync(): OverlaySyncService {
    if (!this.initialized || !this.overlaySyncService) {
      throw new Error('DependencyFactory not initialized. Call getOverlaySyncService() first.');
    }
    
    return this.overlaySyncService;
  }

  /**
   * Get the overlay sync adapter instance
   * 
   * @returns Promise resolving to IOverlaySync instance
   */
  async getOverlaySyncAdapter(): Promise<IOverlaySync> {
    await this.initialize();
    
    if (!this.overlaySyncAdapter) {
      throw new Error('OverlaySyncAdapter not initialized');
    }
    
    return this.overlaySyncAdapter;
  }

  /**
   * Update factory configuration
   * 
   * @param newConfig Partial configuration to merge
   */
  updateConfig(newConfig: Partial<DependencyFactoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.debug) {
      console.log('[DependencyFactory] Configuration updated:', this.config);
    }
    
    // Reset initialization to apply new config
    this.resetServices();
  }

  /**
   * Reset all services and initialization state
   */
  private resetServices(): void {
    this.initialized = false;
    this.initializationPromise = null;
    
    // Dispose existing services
    if (this.overlaySyncAdapter) {
      this.overlaySyncAdapter.dispose();
      this.overlaySyncAdapter = null;
    }
    
    if (this.auditLogService) {
      this.auditLogService.dispose();
      this.auditLogService = null;
    }
    
    if (this.networkPrioritizationService) {
      this.networkPrioritizationService.dispose();
      this.networkPrioritizationService = null;
    }
    
    if (this.resourceManager) {
      this.resourceManager.dispose();
      this.resourceManager = null;
    }
    
    // Reset service references
    this.overlaySyncService = null;
    this.overlayStateManager = null;
    this.performanceMonitor = null;
    this.errorRecoverySystem = null;
  }

  /**
   * Get current configuration
   */
  getConfig(): DependencyFactoryConfig {
    return { ...this.config };
  }

  /**
   * Check if factory is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get initialization status
   */
  getInitializationStatus(): {
    initialized: boolean;
    initializing: boolean;
    syncProvider: string;
    environment: string;
    services: {
      overlaySyncAdapter: boolean;
      overlaySyncService: boolean;
      overlayStateManager: boolean;
      performanceMonitor: boolean;
      errorRecoverySystem: boolean;
      resourceManager: boolean;
      auditLogService: boolean;
      networkPrioritizationService: boolean;
    };
  } {
    return {
      initialized: this.initialized,
      initializing: this.initializationPromise !== null && !this.initialized,
      syncProvider: this.config.syncProvider,
      environment: this.config.environment,
      services: {
        overlaySyncAdapter: this.overlaySyncAdapter !== null,
        overlaySyncService: this.overlaySyncService !== null,
        overlayStateManager: this.overlayStateManager !== null,
        performanceMonitor: this.performanceMonitor !== null,
        errorRecoverySystem: this.errorRecoverySystem !== null,
        resourceManager: this.resourceManager !== null,
        auditLogService: this.auditLogService !== null,
        networkPrioritizationService: this.networkPrioritizationService !== null,
      },
    };
  }

  /**
   * Dispose of all resources and reset the factory
   */
  dispose(): void {
    if (this.config.debug) {
      console.log('[DependencyFactory] Disposing resources...');
    }
    
    // Dispose of all services in reverse order of creation
    if (this.networkPrioritizationService) {
      this.networkPrioritizationService.dispose();
      this.networkPrioritizationService = null;
    }
    
    if (this.auditLogService) {
      this.auditLogService.dispose();
      this.auditLogService = null;
    }
    
    if (this.errorRecoverySystem) {
      this.errorRecoverySystem.dispose();
      this.errorRecoverySystem = null;
    }
    
    if (this.performanceMonitor) {
      this.performanceMonitor.dispose();
      this.performanceMonitor = null;
    }
    
    if (this.overlayStateManager) {
      this.overlayStateManager.dispose();
      this.overlayStateManager = null;
    }
    
    if (this.overlaySyncAdapter) {
      this.overlaySyncAdapter.dispose();
      this.overlaySyncAdapter = null;
    }
    
    if (this.resourceManager) {
      this.resourceManager.dispose();
      this.resourceManager = null;
    }
    
    // Reset service references
    this.overlaySyncService = null;
    
    // Reset initialization state
    this.initialized = false;
    this.initializationPromise = null;
    
    if (this.config.debug) {
      console.log('[DependencyFactory] Resources disposed');
    }
  }

  /**
   * Perform health check on all dependencies
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: {
      overlaySyncAdapter: boolean;
      overlaySyncService: boolean;
      overlayStateManager: boolean;
      performanceMonitor: boolean;
      errorRecoverySystem: boolean;
      resourceManager: boolean;
      auditLogService: boolean;
      networkPrioritizationService: boolean;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const services = {
      overlaySyncAdapter: false,
      overlaySyncService: false,
      overlayStateManager: false,
      performanceMonitor: false,
      errorRecoverySystem: false,
      resourceManager: false,
      auditLogService: false,
      networkPrioritizationService: false,
    };

    try {
      await this.initialize();
      
      // Check overlay sync adapter
      if (this.overlaySyncAdapter) {
        try {
          const healthResult = await this.overlaySyncAdapter.healthCheck();
          services.overlaySyncAdapter = healthResult.healthy;
          if (!healthResult.healthy && healthResult.error) {
            errors.push(`OverlaySyncAdapter: ${healthResult.error.message}`);
          }
        } catch (error) {
          errors.push(`OverlaySyncAdapter health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        errors.push('OverlaySyncAdapter not initialized');
      }
      
      // Check overlay sync service
      services.overlaySyncService = this.overlaySyncService !== null;
      if (!services.overlaySyncService) {
        errors.push('OverlaySyncService not initialized');
      }
      
      // Check other services
      services.overlayStateManager = this.overlayStateManager !== null;
      services.performanceMonitor = this.performanceMonitor !== null;
      services.errorRecoverySystem = this.errorRecoverySystem !== null;
      services.resourceManager = this.resourceManager !== null;
      services.auditLogService = this.auditLogService !== null;
      services.networkPrioritizationService = this.networkPrioritizationService !== null;
      
      // Add errors for missing required services
      if (!services.overlayStateManager) errors.push('OverlayStateManager not initialized');
      if (!services.performanceMonitor) errors.push('PerformanceMonitor not initialized');
      if (!services.errorRecoverySystem) errors.push('ErrorRecoverySystem not initialized');
      if (!services.resourceManager) errors.push('ResourceManager not initialized');
      
    } catch (error) {
      errors.push(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      healthy: errors.length === 0,
      services,
      errors,
    };
  }

  /**
   * Create a configured overlay sync service for specific use cases
   * 
   * @param overrides Configuration overrides for the service
   * @returns Promise resolving to configured OverlaySyncService
   */
  async createOverlaySyncService(
    overrides?: Partial<DependencyFactoryConfig['serviceConfigs']['overlaySyncService']>
  ): Promise<OverlaySyncService> {
    await this.initialize();
    
    if (!this.overlaySyncAdapter || !this.overlayStateManager || !this.performanceMonitor || 
        !this.errorRecoverySystem || !this.resourceManager) {
      throw new Error('Required dependencies not initialized');
    }
    
    const serviceConfig = {
      ...this.config.serviceConfigs?.overlaySyncService,
      ...overrides,
    };
    
    return new OverlaySyncService(
      this.overlaySyncAdapter,
      this.overlayStateManager,
      this.performanceMonitor,
      this.errorRecoverySystem,
      this.resourceManager,
      this.auditLogService,
      this.networkPrioritizationService,
      {
        serviceId: serviceConfig?.serviceId || `overlay-sync-service-${Date.now()}`,
        monitoringEnabled: serviceConfig?.monitoringEnabled ?? true,
        autoRecoveryEnabled: serviceConfig?.autoRecoveryEnabled ?? true,
        maxSubscriptions: serviceConfig?.maxSubscriptions || 50,
        networkPrioritizationEnabled: serviceConfig?.networkPrioritizationEnabled ?? this.config.networkPrioritizationEnabled,
      }
    );
  }

  /**
   * Create a factory instance for testing with mock dependencies
   * 
   * @param testConfig Test-specific configuration
   * @returns DependencyFactory instance configured for testing
   */
  static createTestFactory(testConfig?: Partial<DependencyFactoryConfig>): DependencyFactory {
    const config: Partial<DependencyFactoryConfig> = {
      syncProvider: 'mock',
      debug: false,
      environment: 'test',
      networkPrioritizationEnabled: false,
      performanceMonitoringEnabled: false,
      autoRecoveryEnabled: true,
      auditLoggingEnabled: false,
      ...testConfig,
    };
    
    return new DependencyFactory(config);
  }

  /**
   * Create a factory instance for development with enhanced debugging
   * 
   * @param devConfig Development-specific configuration
   * @returns DependencyFactory instance configured for development
   */
  static createDevelopmentFactory(devConfig?: Partial<DependencyFactoryConfig>): DependencyFactory {
    const config: Partial<DependencyFactoryConfig> = {
      syncProvider: 'enhanced-firebase',
      debug: true,
      environment: 'development',
      networkPrioritizationEnabled: true,
      performanceMonitoringEnabled: true,
      autoRecoveryEnabled: true,
      auditLoggingEnabled: true,
      ...devConfig,
    };
    
    return new DependencyFactory(config);
  }

  /**
   * Create a factory instance for production with optimized settings
   * 
   * @param prodConfig Production-specific configuration
   * @returns DependencyFactory instance configured for production
   */
  static createProductionFactory(prodConfig?: Partial<DependencyFactoryConfig>): DependencyFactory {
    const config: Partial<DependencyFactoryConfig> = {
      syncProvider: 'enhanced-firebase',
      debug: false,
      environment: 'production',
      networkPrioritizationEnabled: true,
      performanceMonitoringEnabled: true,
      autoRecoveryEnabled: true,
      auditLoggingEnabled: true,
      serviceConfigs: {
        performanceMonitor: {
          sampleRate: 0.1, // Reduced sampling in production
          retentionPeriod: 12 * 60 * 60 * 1000, // 12 hours
        },
      },
      ...prodConfig,
    };
    
    return new DependencyFactory(config);
  }

  // Synchronous factory methods for testing (assumes initialization)
  
  /**
   * Create overlay state manager synchronously (for testing)
   */
  createOverlayStateManager(): OverlayStateManager {
    if (!this.overlayStateManager) {
      this.overlayStateManager = new OverlayStateManager();
    }
    return this.overlayStateManager;
  }

  /**
   * Create performance monitor synchronously (for testing)
   */
  createPerformanceMonitor(): PerformanceMonitor {
    if (!this.performanceMonitor) {
      const perfConfig = this.config.serviceConfigs?.performanceMonitor || {};
      this.performanceMonitor = new PerformanceMonitor(perfConfig);
    }
    return this.performanceMonitor;
  }

  /**
   * Create error recovery system synchronously (for testing)
   */
  createErrorRecoverySystem(): ErrorRecoverySystem {
    if (!this.errorRecoverySystem) {
      // Create a mock adapter if none exists
      if (!this.overlaySyncAdapter) {
        this.overlaySyncAdapter = new MockSyncAdapter();
      }
      
      const errorConfig = this.config.serviceConfigs?.errorRecovery || {};
      this.errorRecoverySystem = new ErrorRecoverySystem(
        this.overlaySyncAdapter,
        errorConfig
      );
    }
    return this.errorRecoverySystem;
  }

  /**
   * Create resource manager synchronously (for testing)
   */
  createResourceManager(): ResourceManager {
    if (!this.resourceManager) {
      this.resourceManager = new ResourceManager({
        maxResources: 500,
        warningThreshold: 50,
      });
    }
    return this.resourceManager;
  }

  /**
   * Create audit log service synchronously (for testing)
   */
  createAuditLogService(): AuditLogService {
    if (!this.auditLogService) {
      this.auditLogService = new AuditLogService();
    }
    return this.auditLogService;
  }

  /**
   * Create error classification service synchronously (for testing)
   */
  createErrorClassificationService(): any {
    // Dynamic import for error classification service
    return new ErrorClassificationService();
  }

  /**
   * Create network prioritization service synchronously (for testing)
   */
  createNetworkPrioritizationService(): NetworkPrioritizationService {
    if (!this.networkPrioritizationService) {
      // Create a mock adapter if none exists
      if (!this.overlaySyncAdapter) {
        const { MockSyncAdapter } = require('../adapters/MockSyncAdapter');
        this.overlaySyncAdapter = new MockSyncAdapter();
      }
      
      this.networkPrioritizationService = new NetworkPrioritizationService(this.overlaySyncAdapter);
    }
    return this.networkPrioritizationService;
  }

  /**
   * Create health check service synchronously (for testing)
   */
  createHealthCheckService(): any {
    // Dynamic import for health check service
    return new HealthCheckService();
    
    // Ensure required dependencies exist
    if (!this.performanceMonitor) {
      this.createPerformanceMonitor();
    }
    if (!this.errorRecoverySystem) {
      this.createErrorRecoverySystem();
    }
    if (!this.overlaySyncAdapter) {
      this.overlaySyncAdapter = new MockSyncAdapter();
    }
    
    return new HealthCheckService(
      this.overlaySyncAdapter,
      this.performanceMonitor,
      this.errorRecoverySystem
    );
  }
}