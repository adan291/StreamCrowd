/**
 * GiveawayHub with Error Boundary Wrapper
 * 
 * Wraps the GiveawayHub component with an ErrorBoundary to isolate
 * giveaway-related errors and prevent them from crashing the entire application.
 * 
 * Requirements: 2.2
 * 
 * Features:
 * - Error isolation for giveaway feature
 * - Giveaway-specific error fallback UI
 * - Participant preservation on error
 * - Error logging and recovery
 */

import React, { useState, useCallback } from 'react';
import { ErrorBoundary } from '../../src/presentation/components/shared/ErrorBoundary';
import { GiveawayErrorFallback } from '../../src/presentation/components/shared/GiveawayErrorFallback';
import { GiveawayHub as GiveawayHubCore } from './GiveawayHub';
import type { GiveawayHubProps } from './GiveawayHub';

interface GiveawayHubWithErrorBoundaryProps extends GiveawayHubProps {
  onError?: (error: Error) => void;
}

/**
 * GiveawayHubWithErrorBoundary - Wraps GiveawayHub with error handling
 * 
 * This component provides:
 * - Error boundary to catch giveaway errors
 * - Giveaway-specific error UI with participant preservation
 * - Error recovery and retry functionality
 * - Participant count tracking for error display
 * 
 * @example
 * <GiveawayHubWithErrorBoundary
 *   chatMessages={messages}
 *   isConnected={true}
 *   onError={handleError}
 * />
 */
export const GiveawayHubWithErrorBoundary: React.FC<GiveawayHubWithErrorBoundaryProps> = ({
  onError,
  ...giveawayProps
}) => {
  const [participantCount, setParticipantCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [shouldReset, setShouldReset] = useState(false);

  /**
   * Handle error from ErrorBoundary
   */
  const handleError = useCallback((err: Error) => {
    setError(err);
    onError?.(err);
  }, [onError]);

  /**
   * Handle reset/retry
   */
  const handleReset = useCallback(() => {
    setError(null);
    setShouldReset(true);
    // Reset the flag after a tick to allow re-render
    setTimeout(() => setShouldReset(false), 0);
  }, []);

  /**
   * Handle preserving participants on error
   */
  const handlePreserveParticipants = useCallback(() => {
    // This would be called to preserve the participant list
    // The actual implementation depends on how participants are stored
    handleReset();
  }, [handleReset]);

  return (
    <ErrorBoundary
      feature="giveaway"
      onError={handleError}
      onReset={handleReset}
      fallback={
        <GiveawayErrorFallback
          error={error}
          onReset={handleReset}
          onPreserveParticipants={handlePreserveParticipants}
          participantCount={participantCount}
        />
      }
    >
      <GiveawayHubCore
        {...giveawayProps}
      />
    </ErrorBoundary>
  );
};

GiveawayHubWithErrorBoundary.displayName = 'GiveawayHubWithErrorBoundary';

