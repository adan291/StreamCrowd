/**
 * Recovery Notification Component
 * 
 * Displays notifications when state recovery occurs after an error.
 * Provides user feedback about recovery success or failure.
 * 
 * @requirements 7.5 - User notification on recovery failure
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';

export interface RecoveryNotificationProps {
  /** Whether to show the notification */
  show: boolean;
  /** Type of notification */
  type: 'success' | 'error' | 'warning';
  /** Message to display */
  message: string;
  /** Feature that was recovered */
  feature?: string;
  /** Callback when notification is dismissed */
  onDismiss?: () => void;
  /** Callback when retry is clicked (for error type) */
  onRetry?: () => void;
  /** Auto-dismiss after milliseconds (0 = no auto-dismiss) */
  autoDismissMs?: number;
}

/**
 * RecoveryNotification - Displays recovery status to users
 * 
 * @example
 * <RecoveryNotification
 *   show={wasRecovered}
 *   type="success"
 *   message="Your data was recovered after an error."
 *   feature="giveaway"
 *   onDismiss={() => setWasRecovered(false)}
 *   autoDismissMs={5000}
 * />
 */
export const RecoveryNotification: React.FC<RecoveryNotificationProps> = ({
  show,
  type,
  message,
  feature,
  onDismiss,
  onRetry,
  autoDismissMs = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsExiting(false);

      // Auto-dismiss if configured
      if (autoDismissMs > 0 && type === 'success') {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoDismissMs);

        return () => clearTimeout(timer);
      }
    }
  }, [show, autoDismissMs, type]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onDismiss?.();
    }, 300); // Match animation duration
  };

  if (!isVisible) {
    return null;
  }

  const styles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: 'text-green-600 dark:text-green-400',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: 'text-red-600 dark:text-red-400',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: 'text-yellow-600 dark:text-yellow-400',
    },
  };

  const currentStyle = styles[type];

  const Icon = type === 'success' ? CheckCircle : AlertTriangle;

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 max-w-md
        ${currentStyle.bg} ${currentStyle.border} border rounded-lg shadow-lg
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${currentStyle.icon}`} />
          
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-sm ${currentStyle.text}`}>
              {type === 'success' ? 'State Recovered' : 'Recovery Failed'}
              {feature && <span className="font-normal"> ({feature})</span>}
            </h4>
            <p className={`mt-1 text-sm ${currentStyle.text} opacity-90`}>
              {message}
            </p>
            
            {type === 'error' && onRetry && (
              <button
                onClick={onRetry}
                className={`
                  mt-2 flex items-center gap-1 text-sm font-medium
                  ${currentStyle.text} hover:underline
                `}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className={`
              flex-shrink-0 p-1 rounded-full
              hover:bg-black/10 dark:hover:bg-white/10
              transition-colors
            `}
            aria-label="Dismiss notification"
          >
            <X className={`w-4 h-4 ${currentStyle.text}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to manage recovery notification state
 */
export function useRecoveryNotificationState() {
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
    feature?: string;
  }>({
    show: false,
    type: 'success',
    message: '',
  });

  const showSuccess = (message: string, feature?: string) => {
    setNotification({
      show: true,
      type: 'success',
      message,
      feature,
    });
  };

  const showError = (message: string, feature?: string) => {
    setNotification({
      show: true,
      type: 'error',
      message,
      feature,
    });
  };

  const showWarning = (message: string, feature?: string) => {
    setNotification({
      show: true,
      type: 'warning',
      message,
      feature,
    });
  };

  const dismiss = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  return {
    notification,
    showSuccess,
    showError,
    showWarning,
    dismiss,
  };
}

export default RecoveryNotification;
