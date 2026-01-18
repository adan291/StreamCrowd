# Overlay Sync Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for the StreamCrowd overlay synchronization system. It covers common issues, diagnostic procedures, and resolution strategies.

## Quick Diagnostic Checklist

When experiencing overlay sync issues, run through this quick checklist:

1. **Check Connection Status**
   ```typescript
   const { connectionStatus } = useOverlaySync();
   console.log('Connection Status:', connectionStatus);
   ```

2. **Verify Performance Metrics**
   ```typescript
   const { performanceMetrics } = useOverlaySync();
   console.log('Performance:', performanceMetrics);
   ```

3. **Check System Health**
   ```typescript
   const factory = DependencyFactory.getInstance();
   const healthCheck = await factory.createHealthCheckService();
   const health = healthCheck.getHealthStatus();
   console.log('System Health:', health);
   ```

4. **Review Recent Errors**
   ```typescript
   const errorRecovery = await factory.getErrorRecoverySystem();
   const errors = errorRecovery.getRecentErrors();
   console.log('Recent Errors:', errors);
   ```

## Common Issues and Solutions

### 1. Connection Problems

#### Symptoms
- `connectionStatus` shows 'disconnected' or 'error'
- Overlay updates not syncing across devices
- Frequent reconnection attempts

#### Diagnostic Steps

```typescript
// Check connection details
const factory = DependencyFactory.getInstance();
const adapter = await factory.getOverlaySyncAdapter();

// Test connection
const healthResult = await adapter.healthCheck();
console.log('Adapter Health:', healthResult);

// Check Firebase status
if (healthResult.error) {
  console.error('Connection Error:', healthResult.error);
}
```

#### Common Causes and Solutions

**Network Connectivity Issues**
```typescript
// Solution: Implement connection retry
const errorRecovery = await factory.getErrorRecoverySystem();
await errorRecovery.attemptReconnection();
```

**Firebase Authentication Problems**
```typescript
// Check Firebase auth status
import { getAuth } from 'firebase/auth';

const auth = getAuth();
if (!auth.currentUser) {
  console.error('User not authenticated');
  // Redirect to login or refresh auth token
}
```

**Firebase Security Rules**
```javascript
// Check Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /overlays/{channelId}/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == channelId;
    }
  }
}
```

**Rate Limiting**
```typescript
// Check for rate limiting
const performanceMonitor = await factory.getPerformanceMonitor();
const metrics = performanceMonitor.getMetrics();

if (metrics.errorRate > 0.1) {
  console.warn('High error rate detected:', metrics.errorRate);
  // Implement backoff strategy
}
```

### 2. Performance Issues

#### Symptoms
- High latency (>100ms sync times)
- Slow overlay updates
- Performance alerts triggered

#### Diagnostic Steps

```typescript
// Generate performance report
const performanceMonitor = await factory.getPerformanceMonitor();
const report = performanceMonitor.generateDiagnosticReport();

console.log('Performance Report:', {
  averageLatency: report.averageLatency,
  p95Latency: report.p95Latency,
  errorRate: report.errorRate,
  issues: report.detectedIssues
});
```

#### Performance Optimization

**Enable Network Prioritization**
```typescript
const factory = DependencyFactory.getInstance({
  networkPrioritizationEnabled: true,
  serviceConfigs: {
    overlaySyncService: {
      networkPrioritizationEnabled: true
    }
  }
});
```

**Optimize Update Frequency**
```typescript
// Implement debouncing for rapid updates
const debouncedUpdate = useMemo(
  () => debounce(updateOverlayState, 100), // 100ms debounce
  [updateOverlayState]
);
```

**Reduce Payload Size**
```typescript
// Only sync changed fields
const optimizedState = {
  ...currentState,
  data: {
    ...currentState.data,
    // Only include changed fields
    votes: newVotes
  }
};
```

### 3. Memory Leaks

#### Symptoms
- Increasing memory usage over time
- Browser slowdown
- Resource manager warnings

#### Diagnostic Steps

```typescript
// Check resource usage
const resourceManager = await factory.getResourceManager();
const usage = resourceManager.getMemoryUsage();

console.log('Memory Usage:', {
  subscriptions: usage.subscriptions,
  timers: usage.timers,
  totalResources: usage.totalResources
});

// Check for leaks
if (usage.subscriptions > 50) {
  console.warn('High subscription count detected');
}
```

#### Memory Leak Prevention

**Proper Cleanup in React Components**
```typescript
function OverlayComponent() {
  const { subscribeToOverlayChanges } = useOverlaySync();

  useEffect(() => {
    const unsubscribe = subscribeToOverlayChanges('poll', handlePollUpdate);
    
    // CRITICAL: Always return cleanup function
    return () => {
      unsubscribe();
    };
  }, [subscribeToOverlayChanges]);

  return <div>...</div>;
}
```

**Manual Resource Cleanup**
```typescript
// For class components or manual management
class OverlayManager {
  private unsubscribeFunctions: (() => void)[] = [];

  subscribe(type: OverlayType, callback: Function) {
    const unsubscribe = this.overlaySync.subscribeToOverlayChanges(type, callback);
    this.unsubscribeFunctions.push(unsubscribe);
  }

  dispose() {
    // Clean up all subscriptions
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
  }
}
```

### 4. State Validation Errors

#### Symptoms
- Validation error messages
- State updates rejected
- Type errors in console

#### Diagnostic Steps

```typescript
// Test state validation
const stateManager = await factory.getOverlayStateManager();
const validationResult = stateManager.validateState(yourState);

if (!validationResult.isValid) {
  console.error('Validation Errors:', validationResult.errors);
}
```

#### Common Validation Issues

**Missing Required Fields**
```typescript
// Incorrect: Missing required fields
const invalidState = {
  type: 'poll',
  data: { question: 'Test?' }
};

// Correct: All required fields
const validState: PollOverlayState = {
  id: generateId(),
  type: 'poll',
  isActive: true,
  updatedAt: Date.now(),
  version: 1,
  channelId: getCurrentChannelId(),
  data: {
    question: 'Test?',
    options: [
      { id: 1, label: 'Yes', votes: 0, color: '#4CAF50' },
      { id: 2, label: 'No', votes: 0, color: '#F44336' }
    ],
    totalVotes: 0,
    showResults: false
  }
};
```

**Type Mismatches**
```typescript
// Use migration helper for legacy states
import { migrateOverlayState } from '@/src/infrastructure/utils/OverlaySyncMigration';

const migratedState = migrateOverlayState(legacyState, {
  targetVersion: 2,
  channelId: getCurrentChannelId()
});
```

### 5. Firebase-Specific Issues

#### Symptoms
- Firebase console errors
- Quota exceeded messages
- Permission denied errors

#### Firebase Quota Issues

```typescript
// Monitor Firebase usage
const performanceMonitor = await factory.getPerformanceMonitor();
const metrics = performanceMonitor.getMetrics();

// Check for quota-related errors
const quotaErrors = metrics.errors.filter(error => 
  error.code === 'resource-exhausted'
);

if (quotaErrors.length > 0) {
  console.warn('Firebase quota issues detected');
  // Implement rate limiting or upgrade plan
}
```

#### Firebase Security Rules Debugging

```javascript
// Debug security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /overlays/{channelId}/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == channelId
        && debug(request.auth.uid); // Add debug logging
    }
  }
}
```

#### Firebase Connection Optimization

```typescript
// Optimize Firebase settings
const factory = DependencyFactory.getInstance({
  adapterConfigs: {
    enhancedFirebase: {
      retryAttempts: 5,
      timeoutMs: 15000,
      enableCompression: true,
      enableRealtime: true
    }
  }
});
```

### 6. Multi-Device Synchronization Issues

#### Symptoms
- State not syncing between devices
- Inconsistent overlay states
- Delayed updates on some devices

#### Diagnostic Steps

```typescript
// Test multi-device sync
const testSync = async () => {
  const testState = createTestOverlayState();
  
  // Update from device 1
  await updateOverlayState(testState);
  
  // Verify on device 2
  const receivedStates: OverlayState[] = [];
  const unsubscribe = subscribeToOverlayChanges('poll', (state) => {
    if (state) receivedStates.push(state);
  });
  
  // Check sync timing
  setTimeout(() => {
    console.log('Received states:', receivedStates.length);
    unsubscribe();
  }, 1000);
};
```

#### Multi-Device Solutions

**Ensure Consistent Channel IDs**
```typescript
// Use consistent channel ID across devices
const channelId = getCurrentChannelId();
console.log('Channel ID:', channelId);

// Verify all devices use same channel ID
const state: OverlayState = {
  // ...
  channelId: channelId // Must be consistent
};
```

**Check Real-time Listeners**
```typescript
// Verify real-time listeners are active
const adapter = await factory.getOverlaySyncAdapter();
const subscriptions = adapter.getActiveSubscriptions();
console.log('Active subscriptions:', subscriptions);
```

## Advanced Diagnostics

### Enable Debug Mode

```typescript
// Enable comprehensive debugging
const factory = DependencyFactory.getInstance({
  debug: true,
  environment: 'development'
});

// This enables:
// - Detailed console logging
// - Performance timing logs
// - Error stack traces
// - State change notifications
```

### Performance Profiling

```typescript
// Profile performance bottlenecks
const performanceMonitor = await factory.getPerformanceMonitor();

// Start profiling
performanceMonitor.startProfiling('overlay-update');

// Perform operation
await updateOverlayState(testState);

// End profiling
const profile = performanceMonitor.endProfiling('overlay-update');
console.log('Performance Profile:', profile);
```

### Network Analysis

```typescript
// Analyze network conditions
const networkPrioritization = await factory.getNetworkPrioritizationService();
const networkStatus = networkPrioritization.getNetworkStatus();

console.log('Network Analysis:', {
  connectionType: networkStatus.connectionType,
  effectiveType: networkStatus.effectiveType,
  downlink: networkStatus.downlink,
  rtt: networkStatus.rtt
});
```

### Error Analysis

```typescript
// Comprehensive error analysis
const errorClassification = await factory.createErrorClassificationService();
const errorRecovery = await factory.getErrorRecoverySystem();

// Get error patterns
const errorPatterns = errorClassification.analyzeErrorPatterns();
const recoveryMetrics = errorRecovery.getRecoveryMetrics();

console.log('Error Analysis:', {
  patterns: errorPatterns,
  recovery: recoveryMetrics
});
```

## Monitoring and Alerting

### Set Up Monitoring Dashboard

```typescript
// Create comprehensive monitoring
function OverlayMonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<HealthStatus | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const monitorSystem = async () => {
      const factory = DependencyFactory.getInstance();
      const healthCheck = await factory.createHealthCheckService();
      const performanceMonitor = await factory.getPerformanceMonitor();
      
      // Check system health
      const health = healthCheck.getHealthStatus();
      setSystemHealth(health);
      
      // Check for performance issues
      const issues = performanceMonitor.detectPerformanceIssues();
      const newAlerts = issues.map(issue => ({
        id: generateId(),
        type: issue.type,
        message: issue.message,
        severity: issue.severity,
        timestamp: Date.now()
      }));
      
      setAlerts(prev => [...prev, ...newAlerts]);
    };

    const interval = setInterval(monitorSystem, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="monitoring-dashboard">
      <SystemHealthCard health={systemHealth} />
      <AlertsList alerts={alerts} />
      <MetricsCharts />
    </div>
  );
}
```

### Configure Alerts

```typescript
// Set up performance alerts
const factory = DependencyFactory.getInstance({
  serviceConfigs: {
    performanceMonitor: {
      alertThresholds: {
        latency: 500,      // Alert if latency > 500ms
        errorRate: 0.05,   // Alert if error rate > 5%
        memoryUsage: 0.8   // Alert if memory usage > 80%
      }
    }
  }
});
```

## Recovery Procedures

### Automatic Recovery

The system includes automatic recovery mechanisms:

```typescript
// Configure automatic recovery
const factory = DependencyFactory.getInstance({
  autoRecoveryEnabled: true,
  serviceConfigs: {
    errorRecovery: {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      enableCircuitBreaker: true
    }
  }
});
```

### Manual Recovery

For severe issues, use manual recovery procedures:

```typescript
// Manual system recovery
const recoverSystem = async () => {
  const factory = DependencyFactory.getInstance();
  
  // 1. Reset all connections
  const adapter = await factory.getOverlaySyncAdapter();
  await adapter.reconnect();
  
  // 2. Clear resource leaks
  const resourceManager = await factory.getResourceManager();
  resourceManager.cleanup();
  
  // 3. Reset error recovery state
  const errorRecovery = await factory.getErrorRecoverySystem();
  errorRecovery.reset();
  
  // 4. Verify system health
  const healthCheck = await factory.createHealthCheckService();
  const health = healthCheck.getHealthStatus();
  
  console.log('Recovery completed. System health:', health);
};
```

### Emergency Fallback

In extreme cases, fall back to legacy system:

```typescript
// Emergency fallback configuration
const emergencyConfig = {
  syncProvider: 'firebase', // Use legacy adapter
  enableFallback: true,
  debug: true
};

// Apply emergency configuration
const factory = DependencyFactory.getInstance(emergencyConfig);
```

## Prevention Best Practices

### Code Quality

1. **Always Handle Errors**
   ```typescript
   try {
     await updateOverlayState(state);
   } catch (error) {
     handleOverlayError(error);
   }
   ```

2. **Proper Resource Cleanup**
   ```typescript
   useEffect(() => {
     const unsubscribe = subscribeToOverlayChanges('poll', callback);
     return unsubscribe; // Always cleanup
   }, []);
   ```

3. **Validate State Before Updates**
   ```typescript
   const stateManager = await factory.getOverlayStateManager();
   const validation = stateManager.validateState(state);
   
   if (!validation.isValid) {
     throw new Error(`Invalid state: ${validation.errors.join(', ')}`);
   }
   ```

### Performance Optimization

1. **Use Debouncing for Rapid Updates**
   ```typescript
   const debouncedUpdate = useMemo(
     () => debounce(updateOverlayState, 100),
     [updateOverlayState]
   );
   ```

2. **Implement State Comparison**
   ```typescript
   const shouldUpdate = !isEqual(currentState, newState);
   if (shouldUpdate) {
     await updateOverlayState(newState);
   }
   ```

3. **Monitor Resource Usage**
   ```typescript
   const resourceManager = await factory.getResourceManager();
   const usage = resourceManager.getMemoryUsage();
   
   if (usage.subscriptions > 50) {
     console.warn('High subscription count');
   }
   ```

### Monitoring Setup

1. **Enable Performance Monitoring**
   ```typescript
   const factory = DependencyFactory.getInstance({
     performanceMonitoringEnabled: true
   });
   ```

2. **Set Up Health Checks**
   ```typescript
   setInterval(async () => {
     const healthCheck = await factory.createHealthCheckService();
     const health = healthCheck.getHealthStatus();
     
     if (health.overall !== 'healthy') {
       console.warn('System health degraded:', health);
     }
   }, 60000);
   ```

3. **Configure Alerting**
   ```typescript
   const performanceMonitor = await factory.getPerformanceMonitor();
   performanceMonitor.onAlert((alert) => {
     console.error('Performance Alert:', alert);
     // Send to monitoring service
   });
   ```

## Getting Help

### Self-Service Resources

1. **Check Documentation**
   - [Architecture Guide](./overlay-sync-architecture.md)
   - [Migration Guide](./overlay-sync-migration-guide.md)
   - [API Reference](./api-reference.md)

2. **Use Built-in Diagnostics**
   ```typescript
   // Run comprehensive diagnostics
   const factory = DependencyFactory.getInstance();
   const healthCheck = await factory.healthCheck();
   console.log('System Diagnostics:', healthCheck);
   ```

3. **Enable Debug Mode**
   ```typescript
   const factory = DependencyFactory.getInstance({ debug: true });
   ```

### Escalation Process

1. **Gather Information**
   - System health status
   - Performance metrics
   - Error logs and stack traces
   - Reproduction steps

2. **Check Known Issues**
   - Review recent changes
   - Check Firebase status page
   - Verify network connectivity

3. **Contact Support**
   - Provide diagnostic information
   - Include configuration details
   - Share reproduction steps

### Emergency Contacts

- **Development Team**: For code-related issues
- **Infrastructure Team**: For Firebase/network issues
- **Product Team**: For feature-related questions

Remember: The overlay sync system is designed to be resilient and self-healing. Most issues resolve automatically through the built-in error recovery mechanisms. Use this guide to understand what's happening and when manual intervention might be needed.