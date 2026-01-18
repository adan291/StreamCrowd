# Design Document - Error Handling

## Overview

This design document describes the implementation of comprehensive error handling for StreamCrowd. The design includes Error Boundaries, centralized logging, retry logic, and user-friendly error messages.

**Key Principles:**
- Graceful degradation (app continues working)
- User-friendly error messages
- Centralized logging for debugging
- Automatic retry for transient failures
- Error isolation between features

---

## Architecture

### Error Handling Architecture

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

---

## Components and Interfaces

### Error Boundary Component

```typescript
// src/presentation/components/shared/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logService } from '@/infrastructure/logging/LogService';

interface Props {
  children: ReactNode;
  feature?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error
    logService.error({
      feature: this.props.feature || 'unknown',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Call optional callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          feature={this.props.feature}
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
```

### Error Fallback Component

```typescript
// src/presentation/components/shared/ErrorFallback.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, Copy, ChevronDown } from 'lucide-react';

interface Props {
  feature?: string;
  error: Error | null;
  onReset: () => void;
}

export const ErrorFallback: React.FC<Props> = ({ feature, error, onReset }) => {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const copyError = () => {
    if (error) {
      navigator.clipboard.writeText(`${error.message}\n\n${error.stack}`);
    }
  };

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-semibold">
          {t('errors.componentError', { feature: feature || t('errors.unknown') })}
        </h3>
      </div>
      
      <p className="mt-2 text-red-700 dark:text-red-300 text-sm">
        {t('errors.componentErrorDescription')}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
        >
          <RefreshCw className="w-4 h-4" />
          {t('errors.retry')}
        </button>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-700 rounded hover:bg-red-100"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          {t('errors.details')}
        </button>
      </div>

      {showDetails && error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded text-xs font-mono overflow-auto max-h-40">
          <div className="flex justify-between items-start mb-2">
            <span className="font-semibold">{error.message}</span>
            <button onClick={copyError} className="p-1 hover:bg-red-200 rounded">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400">
            {error.stack}
          </pre>
        </div>
      )}
    </div>
  );
};
```

### Log Service

```typescript
// src/infrastructure/logging/LogService.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  feature?: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
}

class LogService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private log(level: LogLevel, data: Omit<LogEntry, 'level' | 'timestamp'>) {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Store in memory
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    if (import.meta.env.DEV) {
      this.consoleLog(entry);
    }

    // Production: send to external service
    if (import.meta.env.PROD && level === 'error') {
      this.sendToExternalService(entry);
    }
  }

  private consoleLog(entry: LogEntry) {
    const styles = {
      debug: 'color: gray',
      info: 'color: blue',
      warn: 'color: orange',
      error: 'color: red; font-weight: bold',
    };

    console.log(
      `%c[${entry.level.toUpperCase()}] ${entry.timestamp}`,
      styles[entry.level],
      entry.message,
      entry.context || ''
    );

    if (entry.stack) {
      console.log('%cStack:', 'color: gray', entry.stack);
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    // Optional: Send to Sentry or other service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(entry.message), {
        extra: entry.context,
        tags: { feature: entry.feature },
      });
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', { message, context });
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', { message, context });
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', { message, context });
  }

  error(data: Omit<LogEntry, 'level' | 'timestamp'>) {
    this.log('error', data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logService = new LogService();
```

### Retry Logic

```typescript
// src/application/utils/retryLogic.ts
interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        break;
      }

      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      onRetry?.(attempt, lastError);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// React Hook version
export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    setAttempt(0);

    try {
      const result = await withRetry(fn, {
        ...options,
        onRetry: (att, err) => {
          setAttempt(att);
          options.onRetry?.(att, err);
        },
      });
      setIsRetrying(false);
      return result;
    } catch (err) {
      setError(err as Error);
      setIsRetrying(false);
      throw err;
    }
  }, [fn, options]);

  return { execute, isRetrying, attempt, error };
}
```

### Error Types

```typescript
// src/domain/errors/AppErrors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', true);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', true);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, public statusCode?: number) {
    super(message, 'NETWORK_ERROR', true);
    this.name = 'NetworkError';
  }
}

export class UnexpectedError extends AppError {
  constructor(message: string = 'An unexpected error occurred') {
    super(message, 'UNEXPECTED_ERROR', false);
    this.name = 'UnexpectedError';
  }
}

// Type guard functions
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
```

---

## Correctness Properties

### Property 1: Error Isolation
**For any** component error within an Error Boundary, the error SHALL NOT propagate to sibling or parent components.
**Validates: Requirements 1.4, 2.1, 2.2, 2.3, 2.4**

### Property 2: Error Logging
**For any** error caught by an Error Boundary, the error SHALL be logged with timestamp, message, and stack trace.
**Validates: Requirements 1.2, 1.5, 3.1**

### Property 3: Retry Exponential Backoff
**For any** retry sequence, the delay SHALL increase exponentially up to the maximum delay.
**Validates: Requirements 4.1, 4.2, 4.6**

### Property 4: Error Recovery
**For any** recoverable error, the user SHALL have an option to retry the operation.
**Validates: Requirements 1.3, 5.3, 7.1, 7.2, 7.3**

### Property 5: Error Classification
**For any** error thrown, the error SHALL be classifiable by type using instanceof.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 6: User-Friendly Messages
**For any** error shown to the user, the message SHALL be translated and understandable.
**Validates: Requirements 5.1, 5.2, 5.4**

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/ErrorBoundary.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('should catch errors and show fallback', () => {
    render(
      <ErrorBoundary feature="test">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('should allow retry', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary feature="test" onReset={onReset}>
        <ThrowError />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText(/retry/i));
    expect(onReset).toHaveBeenCalled();
  });
});
```

### Property Tests

```typescript
// tests/properties/retry.property.ts
import { test } from 'vitest';
import fc from 'fast-check';
import { withRetry } from './retryLogic';

test('Property 3: Retry delays increase exponentially', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 5 }),
      fc.integer({ min: 100, max: 1000 }),
      (attempts, initialDelay) => {
        const delays: number[] = [];
        
        for (let i = 0; i < attempts; i++) {
          delays.push(initialDelay * Math.pow(2, i));
        }
        
        // Each delay should be double the previous
        for (let i = 1; i < delays.length; i++) {
          expect(delays[i]).toBe(delays[i - 1] * 2);
        }
      }
    )
  );
});
```

---

**Design Status:** ✅ Complete and Ready for Implementation
