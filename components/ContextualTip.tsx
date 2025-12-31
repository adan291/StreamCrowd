/**
 * ContextualTip Component
 * 
 * Displays contextual tips based on user actions.
 * Tips can be positioned relative to target elements and dismissed permanently.
 * 
 * @requirements 2.8
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, Lightbulb, ChevronRight } from 'lucide-react';
import { ContextualTip as ContextualTipType } from '../types/onboarding';
import { MascotFace } from './mascot/MascotFace';

interface ContextualTipProps {
  /** The tip to display */
  tip: ContextualTipType;
  /** Callback when tip is dismissed */
  onDismiss: (tipId: string, permanent: boolean) => void;
  /** Optional action button text */
  actionText?: string;
  /** Optional action callback */
  onAction?: () => void;
  /** Auto-hide after delay (ms), 0 to disable */
  autoHideDelay?: number;
  /** Show mascot face */
  showMascot?: boolean;
}

export const ContextualTip: React.FC<ContextualTipProps> = ({
  tip,
  onDismiss,
  actionText,
  onAction,
  autoHideDelay = 0,
  showMascot = true,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  // Find target element if specified
  useEffect(() => {
    if (!tip.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(tip.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }

    // Update position on scroll/resize
    const handleUpdate = () => {
      const el = document.querySelector(tip.target!);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [tip.target]);

  // Auto-hide timer
  useEffect(() => {
    if (autoHideDelay <= 0) return;

    const timer = setTimeout(() => {
      handleDismiss(false);
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [autoHideDelay]);

  const handleDismiss = useCallback((permanent: boolean) => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss(tip.id, permanent);
    }, 200);
  }, [tip.id, onDismiss]);

  const handleAction = useCallback(() => {
    onAction?.();
    handleDismiss(false);
  }, [onAction, handleDismiss]);

  // Calculate position based on target and position preference
  const getPositionStyle = (): React.CSSProperties => {
    if (!targetRect || !tip.target) {
      // Default to bottom-right corner
      return {
        position: 'fixed',
        bottom: 80,
        right: 16,
      };
    }

    const padding = 12;
    const tipWidth = 280;
    const tipHeight = 120;

    let top = 0;
    let left = 0;

    switch (tip.position) {
      case 'top':
        top = targetRect.top - tipHeight - padding;
        left = targetRect.left + targetRect.width / 2 - tipWidth / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tipHeight / 2;
        left = targetRect.left - tipWidth - padding;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tipHeight / 2;
        left = targetRect.right + padding;
        break;
      default:
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tipWidth / 2;
    }

    // Keep within viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - tipHeight - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tipWidth - padding));

    return {
      position: 'fixed',
      top,
      left,
      width: tipWidth,
    };
  };

  if (!isVisible) return null;

  return (
    <div
      ref={tipRef}
      className={`z-[9998] bg-zinc-900 border border-purple-500/30 rounded-xl shadow-lg shadow-purple-500/10 overflow-hidden transition-all duration-200 ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-scale-up'
      }`}
      style={getPositionStyle()}
      role="tooltip"
      aria-live="polite"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/10 to-twitch-brand/10 px-3 py-2 flex items-center gap-2">
        {showMascot ? (
          <MascotFace emotion="happy" size={24} />
        ) : (
          <div className="p-1 bg-purple-500/20 rounded-lg">
            <Lightbulb size={14} className="text-purple-400" />
          </div>
        )}
        <h4 className="flex-1 font-semibold text-white text-sm">
          {tip.title}
        </h4>
        <button
          onClick={() => handleDismiss(false)}
          className="p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition-colors"
          aria-label="Cerrar tip"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <p className="text-xs text-zinc-400 leading-relaxed">
          {tip.message}
        </p>
      </div>

      {/* Actions */}
      <div className="px-3 py-2 bg-zinc-800/50 flex items-center justify-between gap-2">
        {tip.dismissable && (
          <button
            onClick={() => handleDismiss(true)}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            No mostrar más
          </button>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          {actionText && onAction && (
            <button
              onClick={handleAction}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-twitch-brand hover:bg-twitch-light text-white rounded transition-colors"
            >
              {actionText}
              <ChevronRight size={12} />
            </button>
          )}
          
          {!actionText && (
            <button
              onClick={() => handleDismiss(false)}
              className="px-2 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Entendido
            </button>
          )}
        </div>
      </div>

      {/* Arrow pointing to target */}
      {targetRect && tip.position && (
        <div
          className={`absolute w-3 h-3 bg-zinc-900 border-purple-500/30 transform rotate-45 ${
            tip.position === 'top' ? 'bottom-[-6px] left-1/2 -translate-x-1/2 border-r border-b' :
            tip.position === 'bottom' ? 'top-[-6px] left-1/2 -translate-x-1/2 border-l border-t' :
            tip.position === 'left' ? 'right-[-6px] top-1/2 -translate-y-1/2 border-t border-r' :
            'left-[-6px] top-1/2 -translate-y-1/2 border-b border-l'
          }`}
        />
      )}
    </div>
  );
};

/**
 * ContextualTipContainer Component
 * 
 * Container for managing multiple contextual tips.
 * Handles tip queue and display logic.
 */
interface ContextualTipContainerProps {
  /** Array of tips to potentially show */
  tips: ContextualTipType[];
  /** Currently active context */
  activeContext: string | null;
  /** Callback when tip is dismissed */
  onDismiss: (tipId: string, permanent: boolean) => void;
  /** Set of dismissed tip IDs */
  dismissedTips: Set<string>;
  /** Whether tips are enabled */
  enabled?: boolean;
}

export const ContextualTipContainer: React.FC<ContextualTipContainerProps> = ({
  tips,
  activeContext,
  onDismiss,
  dismissedTips,
  enabled = true,
}) => {
  const [currentTip, setCurrentTip] = useState<ContextualTipType | null>(null);

  // Find matching tip for current context
  useEffect(() => {
    if (!enabled || !activeContext) {
      setCurrentTip(null);
      return;
    }

    const matchingTip = tips.find(
      tip => tip.context === activeContext && !dismissedTips.has(tip.id)
    );

    setCurrentTip(matchingTip || null);
  }, [tips, activeContext, dismissedTips, enabled]);

  if (!currentTip) return null;

  return (
    <ContextualTip
      tip={currentTip}
      onDismiss={onDismiss}
      autoHideDelay={10000} // Auto-hide after 10 seconds
    />
  );
};

export default ContextualTip;
