/**
 * ErrorBoundary Component Tests
 * 
 * Tests for error boundary functionality including error catching,
 * logging, and recovery mechanisms.
 * 
 * **Feature: error-handling**
 * **Property 1: Error Isolation**
 * **Property 2: Error Logging**
 * **Property 4: Error Recovery**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../../src/presentation/components/shared/ErrorBoundary';
import { logService } from '../../src/infrastructure/logging/LogService';
import { I18nProvider } from '../../i18n/context';

// ============================================
// MOCK COMPONENTS
// ============================================

/**
 * Component that throws an error
 */
const ThrowError: React.FC<{ message?: string }> = ({ message = 'Test error' }) => {
  throw new Error(message);
};

/**
 * Component that renders successfully
 */
const SuccessComponent: React.FC = () => {
  return <div>Success Component</div>;
};

/**
 * Component that conditionally throws
 */
const ConditionalError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Conditional error');
  }
  return <div>No error</div>;
};

// ============================================
// SETUP
// ============================================

/**
 * Render component with I18nProvider
 */
function renderWithI18n(component: React.ReactElement) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  );
}

beforeEach(() => {
  // Clear logs before each test
  logService.clearLogs();
  // Suppress console errors during tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// ============================================
// TESTS
// ============================================

describe('ErrorBoundary Component', () => {
  describe('Error Catching (Requirement 1.1)', () => {
    it('should catch errors and display fallback UI', () => {
      renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError />
        </ErrorBoundary>
      );

      // Should display error message
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should display feature name in error message', () => {
      renderWithI18n(
        <ErrorBoundary feature="polls">
          <ThrowError />
        </ErrorBoundary>
      );

      // Should show feature name
      expect(screen.getByText(/polls/i)).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      renderWithI18n(
        <ErrorBoundary feature="test">
          <SuccessComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Success Component')).toBeInTheDocument();
    });

    it('should use custom fallback if provided', () => {
      const customFallback = <div>Custom Error UI</div>;

      renderWithI18n(
        <ErrorBoundary feature="test" fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('Error Logging (Requirement 1.2)', () => {
    it('should log error with message and stack', () => {
      const errorMessage = 'Test error message';

      renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError message={errorMessage} />
        </ErrorBoundary>
      );

      const logs = logService.getLogs('error');
      expect(logs.length).toBeGreaterThan(0);

      const errorLog = logs[logs.length - 1];
      expect(errorLog.message).toBe(errorMessage);
      expect(errorLog.stack).toBeDefined();
    });

    it('should log feature name with error', () => {
      const featureName = 'giveaway';

      renderWithI18n(
        <ErrorBoundary feature={featureName}>
          <ThrowError />
        </ErrorBoundary>
      );

      const logs = logService.getLogs('error');
      const errorLog = logs[logs.length - 1];
      expect(errorLog.feature).toBe(featureName);
    });

    it('should log component stack trace', () => {
      renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError />
        </ErrorBoundary>
      );

      const logs = logService.getLogs('error');
      const errorLog = logs[logs.length - 1];
      expect(errorLog.componentStack).toBeDefined();
      expect(typeof errorLog.componentStack).toBe('string');
    });

    it('should include timestamp in error log', () => {
      renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError />
        </ErrorBoundary>
      );

      const logs = logService.getLogs('error');
      const errorLog = logs[logs.length - 1];
      expect(errorLog.timestamp).toBeDefined();
      // Verify it's a valid ISO timestamp
      expect(new Date(errorLog.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery (Requirement 1.3)', () => {
    it('should provide retry button', () => {
      renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onReset callback when retry is clicked', () => {
      const onReset = vi.fn();

      renderWithI18n(
        <ErrorBoundary feature="test" onReset={onReset}>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      fireEvent.click(retryButton);

      expect(onReset).toHaveBeenCalled();
    });

    it('should reset error state when retry is clicked', () => {
      const { rerender } = renderWithI18n(
        <ErrorBoundary feature="test">
          <ConditionalError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error
      expect(screen.getByText(/error/i)).toBeInTheDocument();

      // Click retry
      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      fireEvent.click(retryButton);

      // Rerender with no error
      rerender(
        <I18nProvider>
          <ErrorBoundary feature="test">
            <ConditionalError shouldThrow={false} />
          </ErrorBoundary>
        </I18nProvider>
      );

      // Should show success component
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Error Details (Requirement 1.5)', () => {
    it('should provide details toggle button', () => {
      renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError />
        </ErrorBoundary>
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      expect(detailsButton).toBeInTheDocument();
    });

    it('should show error details when details button is clicked', () => {
      const errorMessage = 'Specific error message';

      renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError message={errorMessage} />
        </ErrorBoundary>
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      // Should show error message in details
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should hide error details when details button is clicked again', () => {
      const errorMessage = 'Specific error message';

      renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError message={errorMessage} />
        </ErrorBoundary>
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });

      // Show details
      fireEvent.click(detailsButton);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      // Hide details
      fireEvent.click(detailsButton);
      // The error message should still be in the DOM but in a collapsed state
      // We can verify by checking the button's aria-expanded state
      expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should provide copy button for error details', () => {
      renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError />
        </ErrorBoundary>
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe('Callback Handling', () => {
    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();

      renderWithI18n(
        <ErrorBoundary feature="test" onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should not call onError when no error occurs', () => {
      const onError = vi.fn();

      renderWithI18n(
        <ErrorBoundary feature="test" onError={onError}>
          <SuccessComponent />
        </ErrorBoundary>
      );

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Feature Isolation (Requirement 2.1-2.4)', () => {
    it('should isolate errors to specific boundary', () => {
      const { container } = renderWithI18n(
        <div>
          <ErrorBoundary feature="feature1">
            <ThrowError />
          </ErrorBoundary>
          <ErrorBoundary feature="feature2">
            <SuccessComponent />
          </ErrorBoundary>
        </div>
      );

      // First boundary should show error
      expect(screen.getByText(/feature1/i)).toBeInTheDocument();

      // Second boundary should show success component
      expect(screen.getByText('Success Component')).toBeInTheDocument();
    });

    it('should log errors to separate features', () => {
      renderWithI18n(
        <div>
          <ErrorBoundary feature="polls">
            <ThrowError message="Poll error" />
          </ErrorBoundary>
          <ErrorBoundary feature="giveaway">
            <ThrowError message="Giveaway error" />
          </ErrorBoundary>
        </div>
      );

      const pollErrors = logService.getFeatureErrors('polls');
      const giveawayErrors = logService.getFeatureErrors('giveaway');

      expect(pollErrors.length).toBeGreaterThan(0);
      expect(giveawayErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing feature name', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should handle errors with no stack trace', () => {
      const errorWithoutStack = new Error('No stack');
      errorWithoutStack.stack = undefined;

      const { container } = renderWithI18n(
        <ErrorBoundary feature="test">
          {(() => {
            throw errorWithoutStack;
          })()}
        </ErrorBoundary>
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should handle multiple errors in sequence', () => {
      const { rerender } = renderWithI18n(
        <ErrorBoundary feature="test">
          <ThrowError message="Error 1" />
        </ErrorBoundary>
      );

      let logs = logService.getLogs('error');
      expect(logs.length).toBeGreaterThan(0);

      // Reset and throw different error
      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      fireEvent.click(retryButton);

      rerender(
        <I18nProvider>
          <ErrorBoundary feature="test">
            <ThrowError message="Error 2" />
          </ErrorBoundary>
        </I18nProvider>
      );

      logs = logService.getLogs('error');
      expect(logs.length).toBeGreaterThan(1);
    });
  });
});
