import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, X } from 'lucide-react';
import { useReducedMotion } from './Skeleton';

export type FeedbackType = 'success' | 'info';

export interface FeedbackIndicatorProps {
  show: boolean;
  type?: FeedbackType;
  message?: string;
  duration?: number;
  onDismiss?: () => void;
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-right';
}

const iconMap: Record<FeedbackType, React.ReactNode> = {
  success: <Check className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
};

const colorMap: Record<FeedbackType, string> = {
  success: 'bg-green-500/20 border-green-500/40 text-green-400',
  info: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
};

const positionMap: Record<string, string> = {
  'top': 'top-4 left-1/2 -translate-x-1/2',
  'bottom': 'bottom-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-right': 'bottom-4 right-4',
};

/**
 * FeedbackIndicator - Brief visual feedback for user actions
 * @requirements 6.2 - Show brief confirmation indicator when configuration is saved
 * @requirements 6.4 - Animations shall be subtle and not disruptive (max 300ms duration)
 * @requirements 6.5 - Respect prefers-reduced-motion preference
 */
export function FeedbackIndicator({
  show,
  type = 'success',
  message,
  duration = 2000,
  onDismiss,
  position = 'top',
}: FeedbackIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleDismiss = useCallback(() => {
    if (prefersReducedMotion) {
      setIsVisible(false);
      onDismiss?.();
    } else {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
        onDismiss?.();
      }, 150);
    }
  }, [onDismiss, prefersReducedMotion]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsExiting(false);

      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [show, duration, handleDismiss]);

  if (!isVisible) return null;

  // Animation classes based on reduced motion preference
  const animationClass = prefersReducedMotion
    ? ''
    : isExiting
      ? 'animate-feedback-exit'
      : 'animate-feedback-enter';

  const content = (
    <div
      className={`
        fixed z-50 flex items-center gap-2 px-4 py-2 rounded-lg border backdrop-blur-sm
        ${colorMap[type]}
        ${positionMap[position]}
        ${animationClass}
      `}
      role="status"
      aria-live="polite"
    >
      <span className="flex-shrink-0">{iconMap[type]}</span>
      {message && <span className="text-sm font-medium">{message}</span>}
      {duration === 0 && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

/**
 * Hook for managing feedback indicators
 * @requirements 6.2 - Show brief confirmation indicator
 */
export function useFeedback() {
  const [feedback, setFeedback] = useState<{
    show: boolean;
    type: FeedbackType;
    message: string;
  }>({
    show: false,
    type: 'success',
    message: '',
  });

  const showSuccess = useCallback((message: string) => {
    setFeedback({ show: true, type: 'success', message });
  }, []);

  const showInfo = useCallback((message: string) => {
    setFeedback({ show: true, type: 'info', message });
  }, []);

  const hideFeedback = useCallback(() => {
    setFeedback(prev => ({ ...prev, show: false }));
  }, []);

  return {
    feedback,
    showSuccess,
    showInfo,
    hideFeedback,
    FeedbackComponent: (
      <FeedbackIndicator
        show={feedback.show}
        type={feedback.type}
        message={feedback.message}
        onDismiss={hideFeedback}
      />
    ),
  };
}

/**
 * Inline feedback indicator for use within components
 * @requirements 6.1 - Show brief success animation when preset is applied
 */
export function InlineFeedback({
  show,
  type = 'success',
  message,
  className = '',
}: {
  show: boolean;
  type?: FeedbackType;
  message?: string;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!isVisible) return null;

  const animationClass = prefersReducedMotion ? '' : 'animate-feedback-inline';

  return (
    <span
      className={`
        inline-flex items-center gap-1 text-xs font-medium
        ${type === 'success' ? 'text-green-400' : 'text-blue-400'}
        ${animationClass}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {iconMap[type]}
      {message}
    </span>
  );
}

export default FeedbackIndicator;
