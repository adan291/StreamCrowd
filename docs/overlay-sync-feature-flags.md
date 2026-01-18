# Overlay Sync Feature Flags Guide

## Overview

The StreamCrowd overlay synchronization system includes comprehensive feature flag support for safe deployment and gradual rollout of new features. This guide covers configuration, usage, and rollout strategies.

## Feature Flag Configuration

### Environment Variables

Configure feature flags through environment variables:

```bash
# .env.local

# Core System Flags
VITE_OVERLAY_SYNC_V2_ENABLED=true
VITE_OVERLAY_SYNC_FALLBACK_ENABLED=true

# Feature-Specific Flags
VITE_PERFORMANCE_MONITORING_ENABLED=true
VITE_NETWORK_PRIORITIZATION_ENABLED=true
VITE_AUDIT_LOGGING_ENABLED=true
VITE_ERROR_RECOVERY_ENABLED=true
VITE_HEALTH_MONITORING_ENABLED=true

# Rollout Control
VITE_OVERLAY_SYNC_ROLLOUT_PERCENTAGE=25
VITE_OVERLAY_SYNC_USER_WHITELIST=user1,user2,user3

# Debug and Development
VITE_DEBUG_OVERLAY_SYNC=false
VITE_OVERLAY_SYNC_MOCK_MODE=false
```

### Runtime Configuration

Configure feature flags at runtime through the DependencyFactory:

```typescript
// Basic configuration
const factory = DependencyFactory.getInstance({
  // Core features
  syncProvider: 'enhanced-firebase',
  networkPrioritizationEnabled: true,
  performanceMonitoringEnabled: true,
  autoRecoveryEnabled: true,
  auditLoggingEnabled: true,
  
  // Environment
  environment: 'production',
  debug: false
});

// Advanced configuration with feature flags
const advancedConfig = {
  // Feature toggles
  features: {
    enhancedSync: true,
    performanceMonitoring: true,
    networkPrioritization: true,
    auditLogging: true,
    healthMonitoring: true,
    errorRecovery: true
  },
  
  // Rollout configuration
  rollout: {
    percentage: 25,
    userWhitelist: ['user1', 'user2'],
    channelWhitelist: ['channel1', 'channel2'],
    enableABTesting: true
  },
  
  // Fallback configuration
  fallback: {
    enableAutoFallback: true,
    fallbackThreshold: 0.1, // 10% error rate
    fallbackDuration: 300000 // 5 minutes
  }
};
```

## Feature Flag Implementation

### FeatureFlagService

```typescript
// src/application/services/FeatureFlagService.ts
export class FeatureFlagService {
  private flags: Map<string, boolean> = new Map();
  private rolloutConfig: RolloutConfig;
  private userContext: UserContext;

  constructor(config: FeatureFlagConfig) {
    this.rolloutConfig = config.rollout;
    this.loadFlags(config.flags);
  }

  /**
   * Check if a feature is enabled for the current user
   */
  isEnabled(featureName: string): boolean {
    // Check explicit flag first
    if (this.flags.has(featureName)) {
      return this.flags.get(featureName)!;
    }

    // Check rollout rules
    return this.checkRolloutRules(featureName);
  }

  /**
   * Enable/disable a feature flag
   */
  setFlag(featureName: string, enabled: boolean): void {
    this.flags.set(featureName, enabled);
    this.notifyFlagChange(featureName, enabled);
  }

  /**
   * Check rollout rules for gradual deployment
   */
  private checkRolloutRules(featureName: string): boolean {
    const userId = this.userContext.userId;
    const channelId = this.userContext.channelId;

    // Check whitelist first
    if (this.rolloutConfig.userWhitelist?.includes(userId)) {
      return true;
    }

    if (this.rolloutConfig.channelWhitelist?.includes(channelId)) {
      return true;
    }

    // Check percentage rollout
    if (this.rolloutConfig.percentage > 0) {
      const hash = this.hashString(userId + featureName);
      const userPercentile = hash % 100;
      return userPercentile < this.rolloutConfig.percentage;
    }

    return false;
  }

  /**
   * Hash string for consistent user bucketing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get all feature flags and their status
   */
  getAllFlags(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    
    // Add explicit flags
    this.flags.forEach((value, key) => {
      result[key] = value;
    });

    // Add rollout-based flags
    const rolloutFeatures = [
      'enhancedSync',
      'performanceMonitoring',
      'networkPrioritization',
      'auditLogging',
      'healthMonitoring'
    ];

    rolloutFeatures.forEach(feature => {
      if (!result.hasOwnProperty(feature)) {
        result[feature] = this.checkRolloutRules(feature);
      }
    });

    return result;
  }

  /**
   * Notify listeners of flag changes
   */
  private notifyFlagChange(featureName: string, enabled: boolean): void {
    // Emit event for reactive updates
    window.dispatchEvent(new CustomEvent('featureFlagChanged', {
      detail: { featureName, enabled }
    }));
  }
}
```

### Feature Flag Hook

```typescript
// src/application/hooks/useFeatureFlags.ts
export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [flagService, setFlagService] = useState<FeatureFlagService | null>(null);

  useEffect(() => {
    const initializeFlags = async () => {
      const factory = DependencyFactory.getInstance();
      const service = await factory.getFeatureFlagService();
      
      setFlagService(service);
      setFlags(service.getAllFlags());
    };

    initializeFlags();
  }, []);

  useEffect(() => {
    const handleFlagChange = (event: CustomEvent) => {
      const { featureName, enabled } = event.detail;
      setFlags(prev => ({ ...prev, [featureName]: enabled }));
    };

    window.addEventListener('featureFlagChanged', handleFlagChange as EventListener);
    return () => {
      window.removeEventListener('featureFlagChanged', handleFlagChange as EventListener);
    };
  }, []);

  const isEnabled = useCallback((featureName: string): boolean => {
    return flags[featureName] ?? false;
  }, [flags]);

  const toggleFlag = useCallback((featureName: string): void => {
    if (flagService) {
      const currentValue = flags[featureName] ?? false;
      flagService.setFlag(featureName, !currentValue);
    }
  }, [flagService, flags]);

  return {
    flags,
    isEnabled,
    toggleFlag,
    flagService
  };
}
```

## Feature-Specific Implementation

### Enhanced Sync Feature

```typescript
// Conditional overlay sync service creation
function createOverlaySyncService(): OverlaySyncService {
  const { isEnabled } = useFeatureFlags();
  
  if (isEnabled('enhancedSync')) {
    // Use new enhanced service
    return new OverlaySyncService(
      enhancedFirebaseAdapter,
      stateManager,
      performanceMonitor,
      errorRecovery,
      resourceManager
    );
  } else {
    // Use legacy service
    return new LegacyOverlaySyncService(
      legacyFirebaseAdapter
    );
  }
}
```

### Performance Monitoring Feature

```typescript
// Conditional performance monitoring
function useOverlaySync() {
  const { isEnabled } = useFeatureFlags();
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);

  useEffect(() => {
    if (isEnabled('performanceMonitoring')) {
      const factory = DependencyFactory.getInstance();
      const performanceMonitor = await factory.getPerformanceMonitor();
      
      const interval = setInterval(() => {
        setMetrics(performanceMonitor.getMetrics());
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isEnabled]);

  return {
    // ... other hook returns
    performanceMetrics: isEnabled('performanceMonitoring') ? metrics : null
  };
}
```

### Network Prioritization Feature

```typescript
// Conditional network prioritization
class OverlaySyncService {
  constructor(
    private adapter: IOverlaySync,
    private stateManager: OverlayStateManager,
    private performanceMonitor: PerformanceMonitor,
    private errorRecovery: ErrorRecoverySystem,
    private resourceManager: ResourceManager,
    private networkPrioritization?: NetworkPrioritizationService // Optional
  ) {}

  async updateOverlayState<T extends OverlayState>(state: T): Promise<void> {
    // Use network prioritization if enabled
    if (this.networkPrioritization) {
      await this.networkPrioritization.prioritizeUpdate(state);
    } else {
      // Direct update without prioritization
      await this.adapter.publish(state);
    }
  }
}
```

## Rollout Strategies

### Percentage-Based Rollout

```typescript
// Gradual rollout configuration
const rolloutConfig = {
  enhancedSync: {
    percentage: 10, // Start with 10% of users
    incrementBy: 10, // Increase by 10% each day
    maxPercentage: 100,
    rolloutSchedule: [
      { date: '2024-01-01', percentage: 10 },
      { date: '2024-01-02', percentage: 20 },
      { date: '2024-01-03', percentage: 30 },
      // ... continue until 100%
    ]
  }
};

// Automated rollout scheduler
class RolloutScheduler {
  async updateRolloutPercentage(feature: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const schedule = rolloutConfig[feature]?.rolloutSchedule;
    
    const todayConfig = schedule?.find(s => s.date === today);
    if (todayConfig) {
      const flagService = await factory.getFeatureFlagService();
      flagService.setRolloutPercentage(feature, todayConfig.percentage);
      
      console.log(`Updated ${feature} rollout to ${todayConfig.percentage}%`);
    }
  }
}
```

### User-Based Rollout

```typescript
// Target specific user groups
const userGroupRollout = {
  enhancedSync: {
    // Beta testers get early access
    betaTesters: true,
    
    // Premium users get priority
    premiumUsers: true,
    
    // Specific channels for testing
    testChannels: ['channel1', 'channel2'],
    
    // Geographic rollout
    regions: ['US', 'EU'],
    
    // Device-based rollout
    devices: ['desktop', 'mobile']
  }
};

// User group checker
function checkUserGroup(userId: string, feature: string): boolean {
  const user = getUserProfile(userId);
  const config = userGroupRollout[feature];
  
  if (config.betaTesters && user.isBetaTester) return true;
  if (config.premiumUsers && user.isPremium) return true;
  if (config.testChannels?.includes(user.channelId)) return true;
  if (config.regions?.includes(user.region)) return true;
  if (config.devices?.includes(user.deviceType)) return true;
  
  return false;
}
```

### A/B Testing Integration

```typescript
// A/B testing configuration
const abTestConfig = {
  overlaySync: {
    testName: 'enhanced-sync-vs-legacy',
    variants: {
      control: { enhancedSync: false },
      treatment: { enhancedSync: true }
    },
    trafficAllocation: {
      control: 50,
      treatment: 50
    },
    successMetrics: [
      'syncLatency',
      'errorRate',
      'userSatisfaction'
    ]
  }
};

// A/B test assignment
function assignABTestVariant(userId: string, testName: string): string {
  const hash = hashString(userId + testName);
  const allocation = abTestConfig[testName].trafficAllocation;
  
  let cumulative = 0;
  for (const [variant, percentage] of Object.entries(allocation)) {
    cumulative += percentage;
    if (hash % 100 < cumulative) {
      return variant;
    }
  }
  
  return 'control'; // Default fallback
}
```

## Monitoring and Analytics

### Feature Flag Analytics

```typescript
// Track feature flag usage
class FeatureFlagAnalytics {
  private analytics: AnalyticsService;

  trackFeatureUsage(featureName: string, enabled: boolean, userId: string): void {
    this.analytics.track('feature_flag_evaluated', {
      feature: featureName,
      enabled,
      userId,
      timestamp: Date.now()
    });
  }

  trackFeaturePerformance(featureName: string, metrics: PerformanceMetrics): void {
    this.analytics.track('feature_performance', {
      feature: featureName,
      latency: metrics.averageLatency,
      errorRate: metrics.errorRate,
      timestamp: Date.now()
    });
  }

  generateFeatureReport(featureName: string): FeatureReport {
    return {
      feature: featureName,
      totalEvaluations: this.getTotalEvaluations(featureName),
      enabledPercentage: this.getEnabledPercentage(featureName),
      performanceImpact: this.getPerformanceImpact(featureName),
      errorImpact: this.getErrorImpact(featureName)
    };
  }
}
```

### Rollout Monitoring Dashboard

```typescript
// Feature flag monitoring component
function FeatureFlagDashboard() {
  const { flags, flagService } = useFeatureFlags();
  const [analytics, setAnalytics] = useState<FeatureAnalytics[]>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      const analyticsService = await factory.getFeatureFlagAnalytics();
      const data = await analyticsService.getFeatureAnalytics();
      setAnalytics(data);
    };

    loadAnalytics();
  }, []);

  return (
    <div className="feature-flag-dashboard">
      <h2>Feature Flag Status</h2>
      
      {Object.entries(flags).map(([feature, enabled]) => (
        <FeatureFlagCard
          key={feature}
          name={feature}
          enabled={enabled}
          analytics={analytics.find(a => a.feature === feature)}
          onToggle={() => flagService?.toggleFlag(feature)}
        />
      ))}
      
      <RolloutProgressChart analytics={analytics} />
      <PerformanceImpactChart analytics={analytics} />
    </div>
  );
}
```

## Safety Mechanisms

### Automatic Rollback

```typescript
// Automatic rollback on high error rates
class AutoRollbackService {
  private errorThreshold = 0.1; // 10% error rate
  private monitoringInterval = 60000; // 1 minute

  async monitorFeatureHealth(featureName: string): Promise<void> {
    const performanceMonitor = await factory.getPerformanceMonitor();
    const metrics = performanceMonitor.getMetrics();

    if (metrics.errorRate > this.errorThreshold) {
      console.warn(`High error rate detected for ${featureName}: ${metrics.errorRate}`);
      await this.rollbackFeature(featureName);
    }
  }

  private async rollbackFeature(featureName: string): Promise<void> {
    const flagService = await factory.getFeatureFlagService();
    
    // Disable the feature
    flagService.setFlag(featureName, false);
    
    // Log rollback event
    console.error(`Auto-rollback triggered for feature: ${featureName}`);
    
    // Notify monitoring systems
    this.notifyRollback(featureName);
  }

  private notifyRollback(featureName: string): void {
    // Send alert to monitoring system
    // Could integrate with PagerDuty, Slack, etc.
  }
}
```

### Circuit Breaker Pattern

```typescript
// Circuit breaker for feature flags
class FeatureCircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 300000; // 5 minutes

  canExecuteFeature(featureName: string): boolean {
    const failures = this.failures.get(featureName) || 0;
    const lastFailure = this.lastFailureTime.get(featureName) || 0;
    
    // If we haven't hit the threshold, allow execution
    if (failures < this.failureThreshold) {
      return true;
    }
    
    // If enough time has passed, allow retry
    if (Date.now() - lastFailure > this.recoveryTimeout) {
      this.failures.set(featureName, 0);
      return true;
    }
    
    return false;
  }

  recordFailure(featureName: string): void {
    const currentFailures = this.failures.get(featureName) || 0;
    this.failures.set(featureName, currentFailures + 1);
    this.lastFailureTime.set(featureName, Date.now());
  }

  recordSuccess(featureName: string): void {
    this.failures.set(featureName, 0);
  }
}
```

## Development Tools

### Feature Flag Testing

```typescript
// Test utilities for feature flags
export class FeatureFlagTestUtils {
  static createTestFlags(overrides: Record<string, boolean> = {}): FeatureFlagService {
    const defaultFlags = {
      enhancedSync: true,
      performanceMonitoring: true,
      networkPrioritization: true,
      auditLogging: true,
      healthMonitoring: true
    };

    return new FeatureFlagService({
      flags: { ...defaultFlags, ...overrides },
      rollout: { percentage: 100 }
    });
  }

  static withFeatureFlag<T>(
    featureName: string, 
    enabled: boolean, 
    testFn: () => T
  ): T {
    const originalFlags = FeatureFlagService.getInstance();
    const testFlags = this.createTestFlags({ [featureName]: enabled });
    
    // Temporarily replace flag service
    FeatureFlagService.setInstance(testFlags);
    
    try {
      return testFn();
    } finally {
      // Restore original flags
      FeatureFlagService.setInstance(originalFlags);
    }
  }
}

// Usage in tests
describe('OverlaySync with Feature Flags', () => {
  it('should use enhanced sync when flag is enabled', () => {
    FeatureFlagTestUtils.withFeatureFlag('enhancedSync', true, () => {
      const service = createOverlaySyncService();
      expect(service).toBeInstanceOf(EnhancedOverlaySyncService);
    });
  });

  it('should use legacy sync when flag is disabled', () => {
    FeatureFlagTestUtils.withFeatureFlag('enhancedSync', false, () => {
      const service = createOverlaySyncService();
      expect(service).toBeInstanceOf(LegacyOverlaySyncService);
    });
  });
});
```

### Development Dashboard

```typescript
// Development feature flag controls
function DevelopmentFeatureFlagPanel() {
  const { flags, toggleFlag } = useFeatureFlags();
  const [rolloutPercentage, setRolloutPercentage] = useState(0);

  const handlePercentageChange = (feature: string, percentage: number) => {
    const flagService = FeatureFlagService.getInstance();
    flagService.setRolloutPercentage(feature, percentage);
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="dev-feature-flags">
      <h3>Development Feature Flags</h3>
      
      {Object.entries(flags).map(([feature, enabled]) => (
        <div key={feature} className="flag-control">
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => toggleFlag(feature)}
            />
            {feature}
          </label>
          
          <input
            type="range"
            min="0"
            max="100"
            value={rolloutPercentage}
            onChange={(e) => handlePercentageChange(feature, parseInt(e.target.value))}
          />
          <span>{rolloutPercentage}%</span>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

### Feature Flag Lifecycle

1. **Creation**
   - Start with feature disabled by default
   - Add comprehensive logging and monitoring
   - Include rollback mechanisms

2. **Rollout**
   - Begin with small percentage (1-5%)
   - Monitor key metrics closely
   - Increase gradually based on performance

3. **Monitoring**
   - Track feature usage and performance
   - Monitor error rates and user feedback
   - Set up automated alerts

4. **Cleanup**
   - Remove flags after successful rollout
   - Clean up conditional code
   - Update documentation

### Code Organization

```typescript
// Organize feature-flagged code clearly
class OverlaySyncService {
  async updateOverlayState<T extends OverlayState>(state: T): Promise<void> {
    if (this.featureFlags.isEnabled('enhancedSync')) {
      return this.updateOverlayStateEnhanced(state);
    } else {
      return this.updateOverlayStateLegacy(state);
    }
  }

  private async updateOverlayStateEnhanced<T extends OverlayState>(state: T): Promise<void> {
    // Enhanced implementation
  }

  private async updateOverlayStateLegacy<T extends OverlayState>(state: T): Promise<void> {
    // Legacy implementation
  }
}
```

### Testing Strategy

```typescript
// Test both feature flag states
describe('OverlaySyncService', () => {
  describe('with enhanced sync enabled', () => {
    beforeEach(() => {
      FeatureFlagTestUtils.enableFlag('enhancedSync');
    });

    it('should use enhanced sync logic', () => {
      // Test enhanced behavior
    });
  });

  describe('with enhanced sync disabled', () => {
    beforeEach(() => {
      FeatureFlagTestUtils.disableFlag('enhancedSync');
    });

    it('should use legacy sync logic', () => {
      // Test legacy behavior
    });
  });
});
```

## Conclusion

Feature flags provide a powerful mechanism for safe deployment and gradual rollout of the enhanced overlay synchronization system. By following the patterns and practices outlined in this guide, you can:

- Deploy new features safely with minimal risk
- Gradually roll out to users based on various criteria
- Monitor feature performance and automatically rollback if needed
- A/B test different implementations
- Maintain code quality while supporting multiple feature variants

Remember to clean up feature flags after successful rollouts to avoid technical debt and code complexity.