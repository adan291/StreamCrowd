/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Logs errors to the centralized logging service and provides recovery options.
 * 
 * Requirements: 1.1, 1.2, 1.5
 * 
 * @example
 * <ErrorBoundary feature="polls">
 *   <PollComponent />
 * </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logService } from '../../../infrastructure/logging/LogService';
import { ErrorFallback } from './ErrorFallback';

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

/**
 * ErrorBoundary - React component that catches errors in child components
 * 
 * Features:
 * - Catches JavaScript errors in child components
 * - Logs errors with stack traces and component stack
 * - Displays user-friendly fallback UI
 * - Provides retry/reset functionality
 * - Supports feature-specific error handling
 * 
 * @example
 * <ErrorBoundary feature="giveaway" onError={handleError}>
 *   <GiveawayComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state so the next render will show the fallback UI
   * Called after an error has been thrown by a descendant component
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log the error to the logging service
   * Called after an error has been thrown by a descendant component
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({ errorInfo });

    // Log error to centralized logging service
    logService.error({
      feature: this.props.feature || 'unknown',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: {
        feature: this.props.feature,
        timestamp: new Date().toISOString(),
      },
    });

    // Call optional callback
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Reset the error boundary state
   * Allows the user to retry after an error
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional callback
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use default ErrorFallback component
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
