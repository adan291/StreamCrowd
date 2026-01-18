# Error Handling System

## Overview

StreamCrowd implements a comprehensive error handling system that provides:
- **Error Boundaries** for React component isolation
- **Centralized Logging** for debugging and monitoring
- **Retry Logic** with exponential backoff for transient failures
- **User-Friendly Error Messages** with i18n support
- **State Recovery** to preserve user data during errors

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ROOT ERROR BOUNDARY                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ Poll Error  │  │Giveaway Err │  │ Games Error │  │   │
│  │  │  Boundary   │  │  Boundary   │  │  Boundary   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    LOG SERVICE                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  error() │ warn() │ info() │ debug()                │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Console │ localStorage │ Sentry (optional)         │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    RETRY LOGIC                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  useRetry() │ withRetry() │ RetryManager            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Error Types

Located in `src/domain/errors/AppErrors.ts`:

```typescript
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NetworkError,
  UnexpectedError,
  isValidationError,
  isAuthenticationError,
  isNetworkError,
  isAppError
} from '@/domain/errors';

// Create specific error types
throw new ValidationError('Invalid email format', 'email');
throw new AuthenticationError('Session expired');
throw new NetworkError('API unavailable', 503);
throw new UnexpectedError('Something went wrong');

// Type guards for error handling
if (isNetworkError(error)) {
  // Handle network-specific recovery
}
```

### 2. Error Boundaries

Located in `src/presentation/components/shared/`:

```typescript
import { ErrorBoundary } from '@/presentation/components/shared/ErrorBoundary';

// Basic usage
<ErrorBoundary feature="polls">
  <PollComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary 
  feature="giveaway"
  fallback={<GiveawayErrorFallback />}
  onError={(error, errorInfo) => console.log(error)}
  onReset={() => refetchData()}
>
  <GiveawayComponent />
</ErrorBoundary>
```

Feature-specific fallbacks:
- `PollErrorFallback` - For poll-related errors
- `GiveawayErrorFallback` - For giveaway-related errors
- `GameErrorFallback` - For game-related errors
- `OverlayErrorFallback` - For overlay-related errors

### 3. LogService

Located in `src/infrastructure/logging/LogService.ts`:

```typescript
import { logService } from '@/infrastructure/logging';

// Log levels
logService.debug('Debug message', { context: 'data' });
logService.info('Info message', { userId: '123' });
logService.warn('Warning message', { action: 'retry' });
logService.error({
  message: 'Error occurred',
  feature: 'polls',
  stack: error.stack,
  context: { pollId: '456' }
});

// Export logs
const logs = logService.getLogs();
const errorLogs = logService.getLogs('error');
const jsonExport = logService.exportLogs();

// Clear logs
logService.clearLogs();
```

### 4. Retry Logic

Located in `src/application/utils/retryLogic.ts`:

```typescript
import { withRetry } from '@/application/utils/retryLogic';
import { useRetry } from '@/presentation/hooks/useRetry';

// Function-based retry
const result = await withRetry(
  () => fetchData(),
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => console.log(`Retry ${attempt}`)
  }
);

// Hook-based retry
const { execute, isRetrying, attempt, error } = useRetry(
  () => fetchData(),
  { maxAttempts: 3 }
);
```

### 5. State Recovery

Located in `src/application/state/stateRecovery.ts`:

```typescript
import { useStateRecovery } from '@/presentation/hooks/useStateRecovery';

const { 
  createSnapshot, 
  restoreSnapshot, 
  hasSnapshot 
} = useStateRecovery('giveaway');

// Before risky operation
createSnapshot();

try {
  await riskyOperation();
} catch (error) {
  // Restore previous state
  restoreSnapshot();
}
```

## Integration Points

### API Calls

All API calls use retry logic:

```typescript
// src/infrastructure/api/RetryableAPIClient.ts
const client = new RetryableAPIClient({
  maxRetries: 3,
  retryDelay: 1000
});
```

### Firebase

Firebase operations include retry:

```typescript
// src/infrastructure/adapters/FirebaseRetryWrapper.ts
const firebase = new FirebaseRetryWrapper(firebaseConfig);
```

### Twitch API

Twitch API calls include retry:

```typescript
// src/infrastructure/adapters/TwitchAPIRetryWrapper.ts
const twitchApi = new TwitchAPIRetryWrapper(credentials);
```

### OBS WebSocket

OBS connections include retry:

```typescript
// src/infrastructure/adapters/OBSRetryWrapper.ts
const obs = new OBSRetryWrapper(obsConfig);
```

## Error Messages (i18n)

Error messages support Spanish and English:

```typescript
// i18n/locales.ts
errors: {
  componentError: 'Error en {{feature}}',
  componentErrorDescription: 'Algo salió mal...',
  retry: 'Reintentar',
  details: 'Detalles',
  // ... more translations
}
```

## Error Monitoring Dashboard

Located in `src/presentation/components/shared/ErrorMonitoringDashboard.tsx`:

```typescript
import { ErrorMonitoringDashboard } from '@/presentation/components/shared';

// Display error statistics and logs
<ErrorMonitoringDashboard />
```

Features:
- Error frequency chart
- Error log viewer
- Export functionality
- Filter by feature/level

## Best Practices

1. **Always wrap features with Error Boundaries**
   ```typescript
   <ErrorBoundary feature="myFeature">
     <MyComponent />
   </ErrorBoundary>
   ```

2. **Use specific error types**
   ```typescript
   throw new ValidationError('Invalid input', 'fieldName');
   ```

3. **Include context in logs**
   ```typescript
   logService.error({
     message: 'Operation failed',
     feature: 'polls',
     context: { pollId, userId, action }
   });
   ```

4. **Use retry for network operations**
   ```typescript
   await withRetry(() => apiCall(), { maxAttempts: 3 });
   ```

5. **Create snapshots before risky operations**
   ```typescript
   createSnapshot();
   try { ... } catch { restoreSnapshot(); }
   ```

## Testing

Run error handling tests:

```bash
# All error handling tests
npm test -- tests/domain/AppErrors.test.ts
npm test -- tests/infrastructure/LogService.test.ts
npm test -- tests/application/retryLogic.test.ts
npm test -- tests/components/ErrorBoundary.test.tsx
npm test -- tests/components/ErrorFallback.test.tsx
```

## Related Documentation

- [Sentry Integration](./SENTRY_INTEGRATION.md) - External error tracking
- [Design System](./DESIGN_SYSTEM.md) - UI components and styling
