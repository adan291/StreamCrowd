/**
 * Error Fallback Component
 * 
 * Displays a user-friendly error message when an error occurs.
 * Provides options to retry, view details, and copy error information.
 * 
 * Requirements: 1.3, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React, { useState } from 'react';
import { useI18n, interpolate } from '../../../../i18n/context';
import { AlertTriangle, RefreshCw, Copy, ChevronDown } from 'lucide-react';

interface Props {
  feature?: string;
  error: Error | null;
  onReset: () => void;
}

/**
 * ErrorFallback - Displays error UI with retry and details options
 * 
 * Features:
 * - User-friendly error message
 * - Retry button to recover from error
 * - Details toggle to show technical information
 * - Copy error functionality for debugging
 * - i18n support for multiple languages
 * 
 * @example
 * <ErrorFallback
 *   feature="polls"
 *   error={error}
 *   onReset={handleReset}
 * />
 */
export const ErrorFallback: React.FC<Props> = ({ feature, error, onReset }) => {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Copy error message and stack to clipboard
   */
  const copyError = (): void => {
    if (error) {
      const errorText = `${error.message}\n\n${error.stack || t.errors?.noStackTrace || 'No stack trace available'}`;
      navigator.clipboard.writeText(errorText).catch(() => {
        // Silently fail if clipboard is not available
      });
    }
  };

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      {/* Error Header */}
      <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <h3 className="font-semibold">
          {interpolate(t.errors.componentError, {
            feature: feature || t.errors.unknown,
          })}
        </h3>
      </div>

      {/* Error Description */}
      <p className="mt-2 text-red-700 dark:text-red-300 text-sm">
        {t.errors.componentErrorDescription}
      </p>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {/* Retry Button */}
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          aria-label={t.errors.retry}
        >
          <RefreshCw className="w-4 h-4" />
          {t.errors.retry}
        </button>

        {/* Details Toggle Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          aria-label={t.errors.details}
          aria-expanded={showDetails}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          />
          {t.errors.details}
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
              title={t.errors.copy}
              aria-label={t.errors.copy}
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

ErrorFallback.displayName = 'ErrorFallback';
