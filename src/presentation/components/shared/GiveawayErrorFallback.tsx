/**
 * Giveaway Error Fallback Component
 * 
 * Displays a giveaway-specific error message with recovery options.
 * Provides options to retry, preserve participant list, or reset giveaway.
 * 
 * Requirements: 2.5, 7.2, 5.1, 5.4
 */

import React, { useState } from 'react';
import { useI18n, interpolate } from '../../../../i18n/context';
import { AlertTriangle, RefreshCw, Copy, ChevronDown, Users } from 'lucide-react';

interface Props {
  error: Error | null;
  onReset: () => void;
  onPreserveParticipants?: () => void;
  participantCount?: number;
}

/**
 * GiveawayErrorFallback - Giveaway-specific error UI with recovery options
 * 
 * Features:
 * - Giveaway-specific error message
 * - Retry button to recover from error
 * - Preserve participants option to keep participant list
 * - Details toggle to show technical information
 * - Copy error functionality for debugging
 * - Display current participant count
 * - i18n support for multiple languages
 * 
 * @example
 * <ErrorBoundary
 *   feature="giveaway"
 *   fallback={
 *     <GiveawayErrorFallback
 *       error={error}
 *       onReset={handleReset}
 *       onPreserveParticipants={handlePreserve}
 *       participantCount={100}
 *     />
 *   }
 * >
 *   <GiveawayComponent />
 * </ErrorBoundary>
 */
export const GiveawayErrorFallback: React.FC<Props> = ({
  error,
  onReset,
  onPreserveParticipants,
  participantCount = 0,
}) => {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Copy error message and stack to clipboard
   */
  const copyError = (): void => {
    if (error) {
      const errorText = `Giveaway Error: ${error.message}\n\n${error.stack || t.errors?.noStackTrace || 'No stack trace available'}`;
      navigator.clipboard.writeText(errorText).catch(() => {
        // Silently fail if clipboard is not available
      });
    }
  };

  /**
   * Get participant count text with proper pluralization
   */
  const getParticipantText = (): string => {
    if (participantCount === 1) {
      return t.errors?.features?.giveawayParticipantsSingular || '1 participant registered';
    }
    const template = t.errors?.features?.giveawayParticipantsCount || '{{count}} participants registered';
    return interpolate(template, { count: participantCount });
  };

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      {/* Error Header */}
      <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <h3 className="font-semibold">
          {t.errors?.features?.giveaway || 'Giveaway Error'}
        </h3>
      </div>

      {/* Error Description */}
      <p className="mt-2 text-red-700 dark:text-red-300 text-sm">
        {t.errors?.features?.giveawayDescription || t.errors?.componentErrorDescription || 'Something went wrong. Please try again or contact support if the problem persists.'}
      </p>

      {/* Participant Count Info */}
      {participantCount > 0 && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{getParticipantText()}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {/* Retry Button */}
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          aria-label={t.errors?.retry || 'Retry'}
        >
          <RefreshCw className="w-4 h-4" />
          {t.errors?.retry || 'Retry'}
        </button>

        {/* Preserve Participants Button */}
        {onPreserveParticipants && participantCount > 0 && (
          <button
            onClick={onPreserveParticipants}
            className="flex items-center gap-1 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            aria-label={t.errors?.features?.giveawayPreserveParticipants || 'Keep participants'}
            title={t.errors?.features?.giveawayPreserveParticipants || 'Keep the current participant list and try again'}
          >
            <Users className="w-4 h-4" />
            {t.errors?.features?.giveawayPreserveParticipants || 'Keep Participants'}
          </button>
        )}

        {/* Details Toggle Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          aria-label={t.errors?.details || 'Details'}
          aria-expanded={showDetails}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          />
          {t.errors?.details || 'Details'}
        </button>
      </div>

      {/* Error Details Section */}
      {showDetails && error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded text-xs font-mono overflow-auto max-h-40 border border-red-200 dark:border-red-800">
          {/* Error Message and Copy Button */}
          <div className="flex justify-between items-start mb-2 gap-2">
            <span className="font-semibold text-red-800 dark:text-red-200 break-words">
              {error.message}
            </span>
            <button
              onClick={copyError}
              className="p-1 hover:bg-red-200 dark:hover:bg-red-900/60 rounded flex-shrink-0"
              title={t.errors?.copy || 'Copy'}
              aria-label={t.errors?.copy || 'Copy'}
            >
              <Copy className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>

          {/* Stack Trace */}
          <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400 break-words">
            {error.stack || t.errors?.noStackTrace || 'No stack trace available'}
          </pre>
        </div>
      )}
    </div>
  );
};

GiveawayErrorFallback.displayName = 'GiveawayErrorFallback';
