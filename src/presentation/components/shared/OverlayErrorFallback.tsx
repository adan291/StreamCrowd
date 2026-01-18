/**
 * Overlay Error Fallback Component
 * 
 * Displays an overlay-specific error message with recovery options.
 * Designed for OBS browser sources with minimal UI and clear error indication.
 * 
 * Requirements: 2.4, 7.1
 */

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Copy, ChevronDown, X } from 'lucide-react';

interface Props {
  error: Error | null;
  overlayType?: string;
  onReset: () => void;
  onClose?: () => void;
}

/**
 * OverlayErrorFallback - Overlay-specific error UI with recovery options
 * 
 * Features:
 * - Overlay-specific error message with overlay type
 * - Retry button to recover from error
 * - Close overlay option
 * - Details toggle to show technical information
 * - Copy error functionality for debugging
 * - Minimal UI suitable for OBS browser sources
 * 
 * @example
 * <ErrorBoundary
 *   feature="overlay"
 *   fallback={
 *     <OverlayErrorFallback
 *       error={error}
 *       overlayType="poll"
 *       onReset={handleReset}
 *       onClose={handleClose}
 *     />
 *   }
 * >
 *   <OverlayComponent />
 * </ErrorBoundary>
 */
export const OverlayErrorFallback: React.FC<Props> = ({
  error,
  overlayType,
  onReset,
  onClose,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Copy error message and stack to clipboard
   */
  const copyError = (): void => {
    if (error) {
      const errorText = `Overlay Error${overlayType ? ` (${overlayType})` : ''}: ${error.message}\n\n${error.stack || 'No stack trace available'}`;
      navigator.clipboard.writeText(errorText).catch(() => {
        // Silently fail if clipboard is not available
      });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-md w-full p-4 bg-red-50 dark:bg-red-900/90 border border-red-200 dark:border-red-800 rounded-lg shadow-lg">
        {/* Error Header */}
        <div className="flex items-center justify-between gap-2 text-red-800 dark:text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-semibold">
              {overlayType ? `Overlay Error: ${overlayType}` : 'Overlay Error'}
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-200 dark:hover:bg-red-900/60 rounded"
              aria-label="Close overlay"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error Description */}
        <p className="mt-2 text-red-700 dark:text-red-300 text-sm">
          The overlay encountered an error. Try refreshing or check the main application.
        </p>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {/* Retry Button */}
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            aria-label="Retry"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>

          {/* Reload Page Button */}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            aria-label="Reload overlay"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>

          {/* Details Toggle Button */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            aria-label="Details"
            aria-expanded={showDetails}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            />
            Details
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
                title="Copy error"
                aria-label="Copy error"
              >
                <Copy className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>

            {/* Stack Trace */}
            <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400 break-words">
              {error.stack || 'No stack trace available'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

OverlayErrorFallback.displayName = 'OverlayErrorFallback';
