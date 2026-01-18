# Audit Logging System Guide

The audit logging system provides comprehensive tracking of overlay state changes in StreamCrowd, enabling developers and administrators to monitor, debug, and analyze overlay synchronization operations.

## Overview

The audit logging system consists of:

- **Domain Entities**: Type-safe audit log structures
- **Application Service**: Core audit logging functionality
- **React Hooks**: Easy integration with React components
- **Integration**: Automatic logging in OverlaySyncService

## Key Features

- **Comprehensive Tracking**: Logs all overlay state changes with timestamps and user context
- **Filtering & Querying**: Advanced filtering by operation, source, overlay type, user, and more
- **Performance Monitoring**: Tracks operation duration and success rates
- **Data Sanitization**: Configurable sensitive data protection
- **Export & Import**: JSON export for external analysis
- **Statistics**: Aggregated metrics and insights
- **Integration**: Seamless integration with existing logging infrastructure

## Basic Usage

### Using the React Hook

```tsx
import { useAuditLog } from '../src/application/hooks/useAuditLog';

function MyComponent() {
  const { logStateChange, getAuditLogs, auditLogCount } = useAuditLog({
    defaultUserContext: { 
      userId: 'user123', 
      username: 'streamer' 
    }
  });
  
  const handlePollUpdate = async (newPollState: PollOverlayState) => {
    await logStateChange('update', 'user', newPollState, {
      reason: 'Poll option updated by user'
    });
  };
  
  const auditLogs = getAuditLogs({ 
    overlayType: 'poll', 
    limit: 10 
  });
  
  return (
    <div>
      <p>Total audit logs: {auditLogCount}</p>
      <button onClick={handlePollUpdate}>Update Poll</button>
    </div>
  );
}
```

### Using the Service Directly

```tsx
import { auditLogService } from '../src/application/services/AuditLogService';

// Log a state change
await auditLogService.logStateChange(
  'create',
  'user',
  overlayState,
  {
    userContext: {
      userId: 'user123',
      username: 'streamer',
      role: 'admin'
    },
    reason: 'Created new poll via dashboard'
  }
);

// Get filtered logs
const logs = auditLogService.getAuditLogs({
  overlayType: 'poll',
  operation: 'update',
  startTime: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
  limit: 50
});

// Get statistics
const stats = auditLogService.getAuditStats();
console.log(`Success rate: ${stats.successRate * 100}%`);
```

## Audit Log Structure

Each audit log entry contains:

```typescript
interface AuditLogEntry {
  id: string;                    // Unique identifier
  timestamp: number;             // When the event occurred
  operation: AuditOperation;     // Type of operation (create, update, delete, etc.)
  source: AuditSource;          // Source of operation (user, system, api, etc.)
  overlayType: OverlayType;     // Type of overlay (poll, giveaway, game, prediction)
  overlayId: string;            // ID of the affected overlay
  channelId: string;            // Channel where change occurred
  userContext?: AuditUserContext; // User information
  systemContext?: AuditSystemContext; // System information
  changeDetails?: AuditChangeDetails; // What changed
  success: boolean;             // Whether operation succeeded
  error?: string;               // Error message if failed
  duration?: number;            // Operation duration in ms
}
```

## Operations and Sources

### Audit Operations
- `create` - New overlay state created
- `update` - Existing overlay state modified
- `delete` - Overlay state removed
- `activate` - Overlay activated
- `deactivate` - Overlay deactivated
- `clear` - Overlay cleared/reset
- `sync` - State synchronized across devices
- `migrate` - Schema migration performed

### Audit Sources
- `user` - Direct user action
- `system` - Automatic system operation
- `api` - External API call
- `webhook` - Webhook triggered
- `migration` - Data migration process
- `recovery` - Error recovery operation

## Filtering and Querying

The audit system supports comprehensive filtering:

```typescript
const filters: AuditLogFilters = {
  channelId: 'channel123',
  overlayType: 'poll',
  operation: 'update',
  source: 'user',
  userId: 'user123',
  success: true,
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last week
  endTime: Date.now(),
  limit: 100,
  offset: 0
};

const filteredLogs = auditLogService.getAuditLogs(filters);
```

## Statistics and Analytics

Get comprehensive statistics about audit logs:

```typescript
const stats = auditLogService.getAuditStats();

console.log('Total entries:', stats.totalEntries);
console.log('Success rate:', stats.successRate);
console.log('Average duration:', stats.averageDuration);
console.log('Top users:', stats.topUsers);
console.log('Operations breakdown:', stats.byOperation);
```

## Configuration

Configure the audit logging system:

```typescript
auditLogService.updateConfig({
  maxEntries: 50000,              // Maximum entries to keep in memory
  enableExternalLogging: true,    // Log to external services (Sentry)
  logSensitiveData: false,        // Whether to log sensitive data
  retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
  enablePerformanceTracking: true // Track operation performance
});
```

## Data Export and Management

### Export Logs
```typescript
// Export all logs
const allLogs = auditLogService.exportAuditLogs();

// Export filtered logs
const recentLogs = auditLogService.exportAuditLogs({
  startTime: Date.now() - 24 * 60 * 60 * 1000
});

// Save to file
const blob = new Blob([recentLogs], { type: 'application/json' });
// ... handle file download
```

### Clear Logs
```typescript
// Clear all logs
const clearedCount = auditLogService.clearAuditLogs();

// Clear specific logs
const clearedCount = auditLogService.clearAuditLogs({
  overlayType: 'poll',
  success: false
});
```

## Integration with OverlaySyncService

The audit logging is automatically integrated with the OverlaySyncService:

```typescript
// Automatic logging when using OverlaySyncService
const syncService = await dependencyFactory.getOverlaySyncService();

// Set user context for audit logging
syncService.setUserContext({
  userId: 'user123',
  username: 'streamer',
  role: 'admin'
});

// All operations are automatically logged
await syncService.updateOverlayStateWithContext(
  pollState,
  { userId: 'user123', username: 'streamer' },
  'Updated poll options from dashboard'
);
```

## Security and Privacy

### Data Sanitization
When `logSensitiveData` is false (recommended for production):
- Channel IDs are truncated
- User IPs and user agents are excluded
- Only essential state metadata is logged

### Access Control
- Audit logs should only be accessible to authorized users
- Consider implementing role-based access for different audit operations
- Export functionality should be restricted to administrators

## Best Practices

1. **Set User Context**: Always provide user context when possible
2. **Meaningful Reasons**: Include descriptive reasons for operations
3. **Filter Appropriately**: Use filters to avoid overwhelming users with data
4. **Regular Cleanup**: Implement retention policies for production systems
5. **Monitor Performance**: Track audit logging performance impact
6. **Secure Access**: Restrict audit log access to authorized personnel

## Troubleshooting

### Common Issues

**Audit logs not appearing:**
- Check if audit logging is enabled in configuration
- Verify user context is set correctly
- Check for errors in browser console

**Performance issues:**
- Reduce `maxEntries` limit
- Disable `enablePerformanceTracking` if not needed
- Use more specific filters

**Missing user context:**
- Ensure `setUserContext()` is called before operations
- Use `updateOverlayStateWithContext()` for specific operations

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
auditLogService.updateConfig({
  enableExternalLogging: true // Enables console logging in development
});
```

## Example Component

See `components/AuditLogViewer.tsx` for a complete example of how to build a user interface for viewing and managing audit logs.

## API Reference

### AuditLogService Methods

- `logStateChange(operation, source, state, options)` - Log a state change
- `logBulkOperation(operation, source, states, options)` - Log bulk operations
- `getAuditLogs(filters?)` - Retrieve filtered logs
- `getAuditStats(filters?)` - Get statistics
- `exportAuditLogs(filters?)` - Export logs as JSON
- `clearAuditLogs(filters?)` - Clear logs
- `updateConfig(config)` - Update configuration
- `dispose()` - Clean up resources

### useAuditLog Hook

- `logStateChange` - Log state changes
- `logBulkOperation` - Log bulk operations
- `getAuditLogs` - Get filtered logs
- `getAuditStats` - Get statistics
- `exportAuditLogs` - Export logs
- `clearAuditLogs` - Clear logs
- `auditLogCount` - Current log count
- `isEnabled` - Whether logging is enabled

For more detailed API documentation, see the TypeScript interfaces in the source code.