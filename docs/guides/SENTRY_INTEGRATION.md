# Sentry Integration Guide

## Overview

This document describes the Sentry integration for StreamCrowd's error tracking and monitoring system. Sentry provides real-time error tracking, aggregation, and alerting for production environments.

**Requirements:** 3.4, 8.1, 8.2

## Features

- **Error Aggregation**: Automatically groups similar errors by error code
- **Feature Tracking**: Associates errors with specific features (polls, giveaway, games, etc.)
- **Breadcrumb Tracking**: Records user actions leading up to errors
- **User Context**: Tracks which users encounter errors
- **Production-Only**: Sentry is only initialized in production environments
- **Error Statistics**: Provides aggregated error data for monitoring

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Sentry Configuration
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id

# Optional: Debug Sentry in development
VITE_DEBUG_SENTRY=false
```

### Getting Your Sentry DSN

1. Create a Sentry account at https://sentry.io/
2. Create a new project for StreamCrowd
3. Select "React" as the platform
4. Copy your DSN from the project settings
5. Add it to your `.env` file

### Sentry Script Tag

Add the Sentry script tag to your `index.html` before your app script:

```html
<script
  src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

Replace `7.x.x` with the latest Sentry version.

## Usage

### Initialization

Initialize Sentry in your app's entry point (e.g., `main.tsx`):

```typescript
import { initializeSentry } from '@/infrastructure/logging/sentryConfig';

// Initialize Sentry
initializeSentry();
```

### Logging Errors

Errors are automatically captured and aggregated:

```typescript
import { logService } from '@/infrastructure/logging';

// Log an error
logService.error({
  message: 'API call failed',
  feature: 'polls',
  stack: error.stack,
  context: { endpoint: '/api/polls', statusCode: 500 }
});
```

### Tracking User Actions

Track user actions as breadcrumbs:

```typescript
import { trackUserAction } from '@/infrastructure/logging/sentryConfig';

// Track a user action
trackUserAction('User submitted poll', 'poll-action');
```

### Setting User Context

Associate errors with specific users:

```typescript
import { setSentryUser } from '@/infrastructure/logging/sentryConfig';

// After user authentication
setSentryUser('user123', 'user@example.com', 'username');

// On logout
clearSentryUser();
```

### Getting Error Statistics

Retrieve aggregated error data:

```typescript
import { getErrorStatistics, getFeatureErrorStatistics } from '@/infrastructure/logging/sentryConfig';

// Get all errors
const allErrors = getErrorStatistics();

// Get errors for a specific feature
const pollErrors = getFeatureErrorStatistics('polls');

// Each error includes:
// - errorCode: Unique error identifier
// - count: Number of occurrences
// - lastOccurrence: ISO timestamp of last occurrence
// - features: Array of affected features
// - messages: Array of error messages
```

## Error Aggregation

Errors are automatically aggregated by error code. The error code is generated from the error message using a hash function.

### Example Aggregation

```
Error 1: "Network error"
  - Count: 5
  - Features: ['polls', 'giveaway']
  - Last Occurrence: 2026-01-15T13:20:15.768Z

Error 2: "API call failed"
  - Count: 2
  - Features: ['games']
  - Last Occurrence: 2026-01-15T13:20:10.123Z
```

## Error Boundaries Integration

Error Boundaries automatically log errors to Sentry:

```typescript
import { ErrorBoundary } from '@/presentation/components/shared/ErrorBoundary';

<ErrorBoundary feature="polls">
  <PollComponent />
</ErrorBoundary>
```

When an error occurs in `PollComponent`, it's automatically:
1. Caught by the Error Boundary
2. Logged to LogService
3. Aggregated in Sentry
4. Displayed to the user with a fallback UI

## Production Deployment

### Before Deploying

1. Ensure `VITE_SENTRY_DSN` is set in your production environment
2. Verify Sentry script tag is included in `index.html`
3. Test error tracking in staging environment

### Monitoring

1. Go to your Sentry project dashboard
2. View real-time error alerts
3. Check error trends and patterns
4. Review affected users and features

## Development

### Testing Sentry Integration

To test Sentry in development:

```env
VITE_DEBUG_SENTRY=true
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

### Triggering Test Errors

```typescript
import { logService } from '@/infrastructure/logging';

// Trigger a test error
logService.error({
  message: 'Test error for Sentry',
  feature: 'test',
  context: { test: true }
});
```

## API Reference

### LogService Methods

```typescript
// Initialize Sentry
logService.initializeSentry(dsn: string, environment?: string): void

// Add breadcrumb
logService.addBreadcrumb(message: string, category?: string): void

// Set user context
logService.setUser(userId: string, email?: string, username?: string): void

// Clear user context
logService.clearUser(): void

// Get error statistics
logService.getErrorStats(): ErrorAggregation[]

// Get feature-specific errors
logService.getFeatureErrors(feature: string): ErrorAggregation[]

// Check if Sentry is ready
logService.isSentryReady(): boolean
```

### SentryIntegration Methods

```typescript
// Initialize Sentry
sentryIntegration.initialize(config: SentryConfig): void

// Capture exception
sentryIntegration.captureException(
  error: Error | string,
  context?: { feature?: string; userId?: string; tags?: Record<string, string>; extra?: Record<string, unknown> }
): void

// Capture message
sentryIntegration.captureMessage(
  message: string,
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug',
  context?: { feature?: string; tags?: Record<string, string>; extra?: Record<string, unknown> }
): void

// Add breadcrumb
sentryIntegration.addBreadcrumb(
  message: string,
  data?: { category?: string; level?: string; extra?: Record<string, unknown> }
): void

// Set user context
sentryIntegration.setUser(userId: string, email?: string, username?: string): void

// Clear user context
sentryIntegration.clearUser(): void

// Get error aggregation
sentryIntegration.getErrorAggregation(): ErrorAggregation[]

// Get feature-specific errors
sentryIntegration.getFeatureErrors(feature: string): ErrorAggregation[]

// Clear aggregation
sentryIntegration.clearAggregation(): void

// Check if initialized
sentryIntegration.isReady(): boolean

// Get configuration
sentryIntegration.getConfig(): SentryConfig | null
```

## Troubleshooting

### Sentry Not Capturing Errors

1. Check that `VITE_SENTRY_DSN` is set correctly
2. Verify Sentry script tag is in `index.html`
3. Check browser console for errors
4. Ensure you're in production mode (`import.meta.env.PROD`)

### Errors Not Aggregating

1. Verify `sentryIntegration.clearAggregation()` is not being called unexpectedly
2. Check that errors are being logged through `logService.error()`
3. Verify feature names are consistent

### High Error Volume

1. Review error patterns in Sentry dashboard
2. Identify common error codes
3. Prioritize fixes based on frequency and impact
4. Use error statistics to track improvements

## Best Practices

1. **Always include feature name**: Helps with error tracking and debugging
2. **Use consistent error messages**: Improves error aggregation
3. **Add context data**: Include relevant information for debugging
4. **Track user actions**: Use breadcrumbs to understand error context
5. **Monitor error trends**: Regularly review Sentry dashboard
6. **Test in staging**: Verify error tracking before production deployment

## Security Considerations

1. **PII Handling**: Don't include sensitive data in error messages
2. **User Privacy**: Be careful with user context data
3. **Error Details**: Avoid exposing internal implementation details
4. **Rate Limiting**: Sentry has rate limits; monitor usage

## References

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry React Integration](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Error Aggregation Patterns](https://docs.sentry.io/product/error-monitoring/)
