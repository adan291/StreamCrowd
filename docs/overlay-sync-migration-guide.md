# Overlay Sync Migration Guide

## Overview

This guide helps developers migrate from the legacy overlay synchronization system to the new hexagonal architecture implementation. The new system maintains backward compatibility while providing enhanced features and reliability.

## Migration Strategy

### Phase 1: Preparation (No Code Changes Required)

The new system is designed to work alongside the existing implementation without requiring immediate code changes.

#### What's Already Done

✅ **Backward Compatible API**: The `useOverlaySync` hook maintains the same interface  
✅ **Automatic Migration**: Legacy state formats are automatically converted  
✅ **Feature Flags**: Gradual rollout capability built-in  
✅ **Fallback Support**: Automatic fallback to legacy system if needed  

#### Verification Steps

1. **Check Current Usage**:
   ```bash
   # Search for overlay sync usage in your codebase
   grep -r "useOverlaySync" src/
   grep -r "overlayState" src/
   ```

2. **Review State Structures**:
   ```typescript
   // Identify current overlay state usage
   const currentStates = [
     'currentPoll',
     'currentGiveaway', 
     'currentGame',
     'currentPrediction'
   ];
   ```

3. **Test Current Functionality**:
   - Verify all overlay features work correctly
   - Test multi-device synchronization
   - Check error handling behavior

### Phase 2: Enhanced Features (Optional Adoption)

Take advantage of new features without changing existing code.

#### New Monitoring Capabilities

```typescript
// Add performance monitoring to existing components
import { useOverlaySync } from '@/hooks/useOverlaySync';

function MyOverlayComponent() {
  const { 
    updateOverlayState,
    connectionStatus,      // NEW: Connection monitoring
    performanceMetrics,    // NEW: Performance data
    healthStatus          // NEW: System health
  } = useOverlaySync();

  // Optional: Add monitoring UI
  if (connectionStatus === 'disconnected') {
    return <ConnectionError />;
  }

  // Optional: Performance alerts
  if (performanceMetrics.averageLatency > 1000) {
    console.warn('High latency detected:', performanceMetrics);
  }

  // Your existing component logic remains unchanged
  return <YourExistingOverlay />;
}
```

#### Enhanced Error Handling

```typescript
// Upgrade error handling (optional)
function EnhancedOverlayComponent() {
  const { updateOverlayState } = useOverlaySync();

  const handleStateUpdate = async (newState) => {
    try {
      await updateOverlayState(newState);
    } catch (error) {
      // NEW: Enhanced error information
      if (error.type === 'validation') {
        showValidationError(error.details);
      } else if (error.type === 'connection') {
        showConnectionError(error.retryAfter);
      } else {
        showGenericError(error.message);
      }
    }
  };

  return <YourComponent onUpdate={handleStateUpdate} />;
}
```

### Phase 3: Type Safety Adoption (Recommended)

Gradually adopt strong typing for better development experience.

#### Before (Legacy)

```typescript
// Legacy: Untyped state
const pollState = {
  id: 'poll-1',
  type: 'poll',
  isActive: true,
  data: {
    question: 'What is your favorite game?',
    options: [
      { id: 1, label: 'Minecraft', votes: 0 },
      { id: 2, label: 'Fortnite', votes: 0 }
    ]
  }
};

await updateOverlayState(pollState);
```

#### After (Typed)

```typescript
// New: Strongly typed state
import type { PollOverlayState } from '@/src/domain/entities/OverlayState';

const pollState: PollOverlayState = {
  id: 'poll-1',
  type: 'poll',
  isActive: true,
  updatedAt: Date.now(),
  version: 1,
  channelId: 'my-channel',
  data: {
    question: 'What is your favorite game?',
    options: [
      { id: 1, label: 'Minecraft', votes: 0, color: '#4CAF50' },
      { id: 2, label: 'Fortnite', votes: 0, color: '#2196F3' }
    ],
    totalVotes: 0,
    showResults: false
  }
};

await updateOverlayState(pollState);
```

#### Migration Helper

```typescript
// Helper function to migrate legacy states
import { migrateOverlayState } from '@/src/infrastructure/utils/OverlaySyncMigration';

function migrateLegacyState(legacyState: any): OverlayState {
  return migrateOverlayState(legacyState, {
    targetVersion: 2,
    channelId: getCurrentChannelId(),
    addMissingFields: true
  });
}

// Usage
const modernState = migrateLegacyState(legacyPollState);
await updateOverlayState(modernState);
```

### Phase 4: Advanced Features (Optional)

Leverage advanced capabilities for enhanced functionality.

#### Direct Service Access

```typescript
// Access services directly for advanced use cases
import { DependencyFactory } from '@/src/infrastructure/factories/DependencyFactory';

async function advancedOverlayManagement() {
  const factory = DependencyFactory.getInstance();
  
  // Get performance monitor
  const performanceMonitor = await factory.getPerformanceMonitor();
  const metrics = performanceMonitor.getMetrics();
  
  // Get audit log service
  const auditLog = await factory.getAuditLogService();
  const recentChanges = auditLog.getRecentEntries();
  
  // Get health check service
  const healthCheck = await factory.createHealthCheckService();
  const systemHealth = healthCheck.getHealthStatus();
  
  return { metrics, recentChanges, systemHealth };
}
```

#### Custom Configuration

```typescript
// Configure factory for specific needs
const factory = DependencyFactory.getInstance({
  syncProvider: 'enhanced-firebase',
  debug: process.env.NODE_ENV === 'development',
  networkPrioritizationEnabled: true,
  performanceMonitoringEnabled: true,
  
  serviceConfigs: {
    performanceMonitor: {
      sampleRate: 0.1, // 10% sampling in production
      alertThresholds: {
        latency: 500,    // 500ms alert threshold
        errorRate: 0.02  // 2% error rate threshold
      }
    }
  }
});
```

## Component Migration Examples

### Poll Component Migration

#### Before

```typescript
// Legacy poll component
function PollOverlay() {
  const { updateOverlayState, clearOverlay } = useOverlaySync();
  const [poll, setPoll] = useState(null);

  const createPoll = async (question, options) => {
    const pollState = {
      id: generateId(),
      type: 'poll',
      isActive: true,
      data: { question, options }
    };
    
    await updateOverlayState(pollState);
    setPoll(pollState);
  };

  return <PollUI onCreatePoll={createPoll} poll={poll} />;
}
```

#### After

```typescript
// Migrated poll component with enhanced features
import type { PollOverlayState } from '@/src/domain/entities/OverlayState';

function EnhancedPollOverlay() {
  const { 
    updateOverlayState, 
    clearOverlay,
    connectionStatus,
    performanceMetrics 
  } = useOverlaySync();
  
  const [poll, setPoll] = useState<PollOverlayState | null>(null);

  const createPoll = async (question: string, options: string[]) => {
    const pollState: PollOverlayState = {
      id: generateId(),
      type: 'poll',
      isActive: true,
      updatedAt: Date.now(),
      version: 1,
      channelId: getCurrentChannelId(),
      data: {
        question,
        options: options.map((label, index) => ({
          id: index + 1,
          label,
          votes: 0,
          color: getOptionColor(index)
        })),
        totalVotes: 0,
        showResults: false
      }
    };
    
    try {
      await updateOverlayState(pollState);
      setPoll(pollState);
    } catch (error) {
      handlePollError(error);
    }
  };

  // Enhanced error handling
  const handlePollError = (error: any) => {
    if (error.type === 'validation') {
      showToast('Invalid poll data: ' + error.message, 'error');
    } else if (error.type === 'connection') {
      showToast('Connection issue. Retrying...', 'warning');
    } else {
      showToast('Failed to create poll', 'error');
    }
  };

  // Connection status indicator
  if (connectionStatus === 'disconnected') {
    return <OfflineIndicator />;
  }

  return (
    <div>
      <ConnectionStatusBadge status={connectionStatus} />
      <PerformanceIndicator metrics={performanceMetrics} />
      <PollUI onCreatePoll={createPoll} poll={poll} />
    </div>
  );
}
```

### Giveaway Component Migration

#### Before

```typescript
// Legacy giveaway component
function GiveawayOverlay() {
  const { updateOverlayState } = useOverlaySync();
  
  const startGiveaway = async (participants) => {
    const giveawayState = {
      type: 'giveaway',
      isActive: true,
      data: { participants, winner: null }
    };
    
    await updateOverlayState(giveawayState);
  };

  return <GiveawayUI onStart={startGiveaway} />;
}
```

#### After

```typescript
// Enhanced giveaway component
import type { GiveawayOverlayState } from '@/src/domain/entities/OverlayState';

function EnhancedGiveawayOverlay() {
  const { updateOverlayState, subscribeToOverlayChanges } = useOverlaySync();
  const [giveaway, setGiveaway] = useState<GiveawayOverlayState | null>(null);

  // Subscribe to giveaway changes
  useEffect(() => {
    const unsubscribe = subscribeToOverlayChanges<GiveawayOverlayState>(
      'giveaway',
      (state) => setGiveaway(state)
    );
    
    return unsubscribe;
  }, [subscribeToOverlayChanges]);

  const startGiveaway = async (participants: string[], mode: 'viewers' | 'keyword' | 'subscribers') => {
    const giveawayState: GiveawayOverlayState = {
      id: generateId(),
      type: 'giveaway',
      isActive: true,
      updatedAt: Date.now(),
      version: 1,
      channelId: getCurrentChannelId(),
      data: {
        winner: null,
        isSpinning: false,
        participants,
        mode
      }
    };
    
    await updateOverlayState(giveawayState);
  };

  const selectWinner = async () => {
    if (!giveaway) return;
    
    // Start spinning animation
    await updateOverlayState({
      ...giveaway,
      data: { ...giveaway.data, isSpinning: true }
    });
    
    // Simulate selection delay
    setTimeout(async () => {
      const winner = selectRandomParticipant(giveaway.data.participants);
      
      await updateOverlayState({
        ...giveaway,
        data: { 
          ...giveaway.data, 
          winner, 
          isSpinning: false 
        }
      });
    }, 3000);
  };

  return (
    <GiveawayUI 
      giveaway={giveaway}
      onStart={startGiveaway} 
      onSelectWinner={selectWinner}
    />
  );
}
```

## Testing Migration

### Unit Test Updates

#### Before

```typescript
// Legacy test
describe('PollOverlay', () => {
  it('should create poll', async () => {
    const mockUpdate = jest.fn();
    render(<PollOverlay updateOverlayState={mockUpdate} />);
    
    // Test logic
  });
});
```

#### After

```typescript
// Enhanced test with type safety
import type { PollOverlayState } from '@/src/domain/entities/OverlayState';

describe('EnhancedPollOverlay', () => {
  it('should create typed poll state', async () => {
    const mockUpdate = jest.fn();
    render(<EnhancedPollOverlay />);
    
    // Create poll
    await userEvent.click(screen.getByText('Create Poll'));
    
    // Verify typed state
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'poll',
        version: 1,
        channelId: expect.any(String),
        data: expect.objectContaining({
          question: expect.any(String),
          options: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              label: expect.any(String),
              votes: 0,
              color: expect.any(String)
            })
          ])
        })
      })
    );
  });

  it('should handle connection errors', async () => {
    const mockUpdate = jest.fn().mockRejectedValue({
      type: 'connection',
      message: 'Network error'
    });
    
    render(<EnhancedPollOverlay />);
    
    await userEvent.click(screen.getByText('Create Poll'));
    
    expect(screen.getByText(/connection issue/i)).toBeInTheDocument();
  });
});
```

### Integration Test Updates

```typescript
// Enhanced integration test
describe('Overlay Sync Integration', () => {
  it('should sync state across multiple components', async () => {
    const factory = DependencyFactory.createTestFactory();
    const service = await factory.getOverlaySyncService();
    
    // Test multi-component synchronization
    const pollState: PollOverlayState = createTestPollState();
    await service.updateOverlayState(pollState);
    
    // Verify synchronization
    const receivedStates: PollOverlayState[] = [];
    service.subscribeToOverlayChanges('poll', (state) => {
      if (state) receivedStates.push(state);
    });
    
    expect(receivedStates).toHaveLength(1);
    expect(receivedStates[0]).toEqual(pollState);
  });
});
```

## Configuration Migration

### Environment Variables

Update your environment configuration:

```bash
# .env.local (add these new variables)

# Sync backend (new)
VITE_SYNC_BACKEND=enhanced-firebase

# Performance monitoring (new)
VITE_PERFORMANCE_MONITORING=true

# Network prioritization (new)
VITE_NETWORK_PRIORITIZATION=true

# Debug mode (enhanced)
VITE_DEBUG_OVERLAY_SYNC=true

# Audit logging (new)
VITE_AUDIT_LOGGING=true
```

### Build Configuration

Update your build configuration to include new dependencies:

```typescript
// vite.config.ts
export default defineConfig({
  // ... existing config
  
  define: {
    // Enable new features
    __OVERLAY_SYNC_V2__: true,
    __PERFORMANCE_MONITORING__: process.env.VITE_PERFORMANCE_MONITORING === 'true',
    __NETWORK_PRIORITIZATION__: process.env.VITE_NETWORK_PRIORITIZATION === 'true'
  },
  
  optimizeDeps: {
    include: [
      // Include new dependencies
      '@/src/infrastructure/factories/DependencyFactory',
      '@/src/application/services/OverlaySyncService'
    ]
  }
});
```

## Rollback Strategy

### Feature Flags

The system includes built-in feature flags for safe rollback:

```typescript
// Enable/disable new features
const config = {
  useEnhancedSync: true,        // Use new sync system
  enablePerformanceMonitoring: true,  // Performance tracking
  enableNetworkPrioritization: true,  // Network optimization
  enableAuditLogging: true,     // Audit trail
  fallbackToLegacy: false       // Automatic fallback
};
```

### Gradual Rollout

```typescript
// Percentage-based rollout
const rolloutPercentage = 25; // 25% of users

const shouldUseNewSystem = () => {
  const userId = getCurrentUserId();
  const hash = hashString(userId);
  return (hash % 100) < rolloutPercentage;
};

// Use in component
function OverlayComponent() {
  const useNewSystem = shouldUseNewSystem();
  
  if (useNewSystem) {
    return <EnhancedOverlayComponent />;
  } else {
    return <LegacyOverlayComponent />;
  }
}
```

### Emergency Rollback

```typescript
// Emergency disable via environment variable
if (process.env.VITE_DISABLE_ENHANCED_SYNC === 'true') {
  // Force use of legacy system
  const factory = DependencyFactory.getInstance({
    syncProvider: 'firebase', // Use legacy adapter
    enableFallback: true
  });
}
```

## Performance Monitoring

### Metrics to Track

Monitor these key metrics during migration:

```typescript
// Performance metrics
const metricsToTrack = {
  // Latency metrics
  averageLatency: 'Average sync latency (target: <100ms)',
  p95Latency: '95th percentile latency',
  p99Latency: '99th percentile latency',
  
  // Error metrics
  errorRate: 'Overall error rate (target: <5%)',
  connectionErrors: 'Connection failure rate',
  validationErrors: 'State validation error rate',
  
  // Throughput metrics
  operationsPerSecond: 'Sync operations per second',
  concurrentUsers: 'Concurrent overlay users',
  
  // Resource metrics
  memoryUsage: 'Memory usage trend',
  subscriptionCount: 'Active subscription count'
};
```

### Monitoring Dashboard

```typescript
// Create monitoring dashboard
function OverlayMonitoringDashboard() {
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const factory = DependencyFactory.getInstance();
      const performanceMonitor = await factory.getPerformanceMonitor();
      const healthCheck = await factory.createHealthCheckService();
      
      setMetrics(performanceMonitor.getMetrics());
      setHealthStatus(healthCheck.getHealthStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="monitoring-dashboard">
      <HealthStatusCard status={healthStatus} />
      <LatencyChart metrics={metrics} />
      <ErrorRateChart metrics={metrics} />
      <ThroughputChart metrics={metrics} />
    </div>
  );
}
```

## Troubleshooting Common Issues

### Issue 1: Type Errors After Migration

**Problem**: TypeScript errors when using new typed interfaces

**Solution**:
```typescript
// Use migration helper for gradual typing
import { migrateOverlayState } from '@/src/infrastructure/utils/OverlaySyncMigration';

// Temporary: Cast legacy state
const legacyState = getCurrentOverlayState();
const typedState = migrateOverlayState(legacyState) as PollOverlayState;

// Long-term: Update state creation
const newState: PollOverlayState = {
  // ... properly typed state
};
```

### Issue 2: Performance Degradation

**Problem**: Slower performance after migration

**Solution**:
```typescript
// Check performance metrics
const factory = DependencyFactory.getInstance();
const performanceMonitor = await factory.getPerformanceMonitor();
const issues = performanceMonitor.detectPerformanceIssues();

console.log('Performance issues:', issues);

// Optimize configuration
factory.updateConfig({
  serviceConfigs: {
    performanceMonitor: {
      sampleRate: 0.1 // Reduce sampling in production
    }
  }
});
```

### Issue 3: Connection Issues

**Problem**: Frequent disconnections or sync failures

**Solution**:
```typescript
// Enable debug logging
const factory = DependencyFactory.getInstance({
  debug: true,
  autoRecoveryEnabled: true
});

// Check error recovery metrics
const errorRecovery = await factory.getErrorRecoverySystem();
const recoveryMetrics = errorRecovery.getRecoveryMetrics();

console.log('Recovery metrics:', recoveryMetrics);
```

## Migration Checklist

### Pre-Migration

- [ ] Review current overlay sync usage
- [ ] Identify all components using `useOverlaySync`
- [ ] Document current state structures
- [ ] Set up monitoring and alerting
- [ ] Create rollback plan

### During Migration

- [ ] Enable feature flags gradually
- [ ] Monitor performance metrics
- [ ] Test error handling scenarios
- [ ] Verify multi-device synchronization
- [ ] Check resource usage and cleanup

### Post-Migration

- [ ] Update documentation
- [ ] Train team on new features
- [ ] Set up ongoing monitoring
- [ ] Plan for advanced feature adoption
- [ ] Remove legacy code (after validation period)

## Support and Resources

### Documentation

- [Architecture Documentation](./overlay-sync-architecture.md)
- [API Reference](./api-reference.md)
- [Performance Guide](./performance-guide.md)
- [Troubleshooting Guide](./troubleshooting.md)

### Code Examples

- [Migration Examples Repository](./examples/migration/)
- [Component Templates](./examples/components/)
- [Testing Patterns](./examples/testing/)

### Getting Help

1. **Check Documentation**: Review architecture and API docs
2. **Monitor Metrics**: Use built-in monitoring tools
3. **Enable Debug Mode**: Set `VITE_DEBUG_OVERLAY_SYNC=true`
4. **Review Logs**: Check audit logs and error messages
5. **Contact Team**: Reach out to the development team for support

The migration to the new overlay sync system provides significant benefits in terms of reliability, performance, and maintainability while maintaining full backward compatibility. Take advantage of the gradual migration approach to minimize risk and ensure a smooth transition.