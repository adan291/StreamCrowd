// AI Vision Mascot - Main component
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { useI18n } from '../../i18n';
import { Sparkles, HelpCircle, Frown, Meh, Smile, X, GripHorizontal, ExternalLink } from 'lucide-react';

import { MascotPosition, UserDifficulty, ChatSentiment } from './types';
import { analyzeChatSentiment, determineEmotion } from './emotionUtils';
import { useMascotDrag } from './useMascotDrag';
import { useIdleTime } from './useIdleTime';
import { MascotFace } from './MascotFace';

// Tamaños disponibles para la mascota (ahora con dimensiones de contenedor)
type MascotSize = 'small' | 'medium' | 'large' | 'custom';
const MASCOT_SIZES: Record<Exclude<MascotSize, 'custom'>, { face: number; faceExpanded: number; label: string; minWidth: number }> = {
  small: { face: 36, faceExpanded: 48, label: 'S', minWidth: 200 },
  medium: { face: 48, faceExpanded: 64, label: 'M', minWidth: 260 },
  large: { face: 64, faceExpanded: 80, label: 'L', minWidth: 320 },
};

// Custom resize hook with scale factor
const useResize = (initialScale: number, minScale: number, maxScale: number) => {
  const [scale, setScale] = useState(initialScale);
  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startScaleRef = useRef(1);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPosRef.current = { x: clientX, y: clientY };
    startScaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      // Use diagonal movement for more intuitive resizing
      const deltaX = clientX - startPosRef.current.x;
      const deltaY = clientY - startPosRef.current.y;
      const delta = (deltaX + deltaY) / 2; // Average of both axes
      const scaleDelta = delta / 150; // Sensitivity factor
      const newScale = Math.min(maxScale, Math.max(minScale, startScaleRef.current + scaleDelta));
      setScale(newScale);
    };

    const handleEnd = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing, minScale, maxScale]);

  return { scale, isResizing, handleResizeStart, setScale };
};

interface AIVisionMascotProps {
  chatMessages: TwitchMessage[];
  isConnected: boolean;
  hasPoll: boolean;
  pollVotes: number;
  userDifficulty?: UserDifficulty;
  onDismiss?: () => void;
  className?: string;
  initialPosition?: MascotPosition;
  onPositionChange?: (pos: MascotPosition) => void;
  theme?: 'light' | 'dark';
  /** Real viewer count from Twitch API (optional) */
  viewerCount?: number | null;
  /** Initial size of the mascot */
  initialSize?: MascotSize;
  /** Callback when size changes */
  onSizeChange?: (size: MascotSize) => void;
  /** Initial custom width */
  initialWidth?: number;
  /** Callback when width changes */
  onWidthChange?: (width: number) => void;
}

export const AIVisionMascot: React.FC<AIVisionMascotProps> = ({
  chatMessages,
  isConnected,
  hasPoll,
  pollVotes,
  userDifficulty,
  onDismiss,
  className = '',
  initialPosition,
  onPositionChange,
  theme = 'dark',
  viewerCount,
  initialSize = 'medium',
  onSizeChange,
  initialWidth,
  onWidthChange,
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(0);
  const [collapsedHeight, setCollapsedHeight] = useState(0);
  const popupWindowRef = useRef<Window | null>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  
  // Get initial scale from initialSize or initialWidth
  const getInitialScale = () => {
    if (initialWidth) return initialWidth / MASCOT_SIZES.medium.minWidth;
    const scaleMap = { small: 0.75, medium: 1, large: 1.25, custom: 1 };
    return scaleMap[initialSize] || 1;
  };
  
  // Resize hook with scale factor (0.6 to 1.6)
  const { scale, isResizing, handleResizeStart } = useResize(
    getInitialScale(),
    0.6, // min scale (60%)
    1.6  // max scale (160%)
  );
  
  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(Math.round(MASCOT_SIZES.medium.minWidth * scale));
    }
  }, [scale, onWidthChange]);
  
  // Get current face size based on scale
  const getCurrentFaceSize = () => {
    const baseSize = isExpanded ? 56 : 44;
    return Math.round(baseSize * scale);
  };
  
  // Get current width based on scale
  const getCurrentWidth = () => {
    const baseWidth = 240;
    return Math.round(baseWidth * scale);
  };
  
  // Get scale percentage for display
  const getScalePercent = () => Math.round(scale * 100);

  // Custom hooks
  const { position, isDragging, containerRef, handleDragStart, screenQuadrant } = useMascotDrag({
    initialPosition,
    onPositionChange,
  });

  const { idleTime, resetIdleTime } = useIdleTime({
    updateInterval: 10000,
    idleThreshold: 60000,
  });

  // Open mascot popup for OBS capture
  const openMascotPopup = () => {
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.focus();
      return;
    }

    const width = 200;
    const height = 200;
    const left = window.screenX + window.innerWidth - width - 50;
    const top = window.screenY + 50;

    popupWindowRef.current = window.open(
      '',
      'MascotOverlay',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
    );

    if (popupWindowRef.current) {
      popupWindowRef.current.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>🤖 AI Vision - Overlay</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              background: #00FF00; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              height: 100vh;
              overflow: hidden;
            }
            .mascot-container {
              animation: float 3s ease-in-out infinite;
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 0.8; }
            }
            .glow {
              animation: pulse 2s ease-in-out infinite;
            }
          </style>
        </head>
        <body>
          <div class="mascot-container">
            <svg viewBox="0 0 50 50" width="150" height="150">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <rect x="2" y="5" width="46" height="40" rx="8" fill="#1a1a2e" stroke="#a970ff" stroke-width="2" filter="url(#glow)"/>
              <rect x="5" y="8" width="40" height="34" rx="5" fill="#a970ff20"/>
              <ellipse cx="17" cy="22" rx="5" ry="6" fill="#a970ff"/>
              <ellipse cx="33" cy="22" rx="5" ry="6" fill="#a970ff"/>
              <circle cx="15" cy="20" r="2" fill="white" opacity="0.9"/>
              <circle cx="31" cy="20" r="2" fill="white" opacity="0.9"/>
              <circle cx="18" cy="23" r="1" fill="white" opacity="0.5"/>
              <circle cx="34" cy="23" r="1" fill="white" opacity="0.5"/>
              <path d="M 18 32 Q 25 36 32 32" fill="none" stroke="#a970ff" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="25" y1="5" x2="25" y2="0" stroke="#a970ff" stroke-width="2"/>
              <circle cx="25" cy="0" r="2.5" fill="#a970ff" class="glow"/>
            </svg>
          </div>
        </body>
        </html>
      `);
      popupWindowRef.current.document.close();
    }
  };

  // Reset idle time when chat messages arrive
  useEffect(() => {
    if (chatMessages.length > 0) {
      resetIdleTime();
    }
  }, [chatMessages.length, resetIdleTime]);

  // Analyze chat sentiment
  const chatSentiment: ChatSentiment = useMemo(
    () => analyzeChatSentiment(chatMessages),
    [chatMessages]
  );

  // Determine current emotion and message
  const { emotion, message, helpTip } = useMemo(
    () =>
      determineEmotion({
        chatSentiment,
        t,
        difficulty: userDifficulty,
        isConnected,
        hasPoll,
        pollVotes,
        messages: chatMessages,
        idleTime,
      }),
    [chatSentiment, t, userDifficulty, isConnected, hasPoll, pollVotes, chatMessages, idleTime]
  );

  // Auto-show help when there's a difficulty
  useEffect(() => {
    if (userDifficulty && helpTip) {
      setShowHelp(true);
      setIsExpanded(true);
    }
  }, [userDifficulty, helpTip]);

  // Auto-collapse help after a while
  useEffect(() => {
    if (showHelp && !userDifficulty) {
      const timer = setTimeout(() => setShowHelp(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showHelp, userDifficulty]);

  // Measure container height for smooth expansion
  useEffect(() => {
    if (innerContainerRef.current) {
      const height = innerContainerRef.current.offsetHeight;
      if (isExpanded) {
        setExpandedHeight(height);
      } else {
        setCollapsedHeight(height);
      }
    }
  }, [isExpanded, scale]);

  // Calculate Y offset for bottom quadrants - move up when expanded
  const getYOffset = () => {
    if (!screenQuadrant.startsWith('bottom') || !isExpanded) return 0;
    // Move up by the difference between expanded and collapsed height
    const heightDiff = expandedHeight - collapsedHeight;
    return heightDiff > 0 ? -heightDiff : 0;
  };

  // Position style with transform for smooth expansion direction
  const positionStyle: React.CSSProperties =
    position.x !== -1
      ? { 
          position: 'fixed', 
          left: position.x, 
          top: position.y, 
          zIndex: 9999,
          transform: `translateY(${getYOffset()}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }
      : {};
  
  // Get border radius based on quadrant (rounded corner faces outward)
  const getBorderRadius = () => {
    switch (screenQuadrant) {
      case 'top-left': return 'rounded-2xl rounded-tl-md';
      case 'top-right': return 'rounded-2xl rounded-tr-md';
      case 'bottom-left': return 'rounded-2xl rounded-bl-md';
      case 'bottom-right': return 'rounded-2xl rounded-br-md';
      default: return 'rounded-2xl';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${className} ${isDragging ? 'cursor-grabbing' : ''}`}
      style={positionStyle}
    >
      {/* Main container */}
      <div
        ref={innerContainerRef}
        className={`
          relative backdrop-blur-sm ${getBorderRadius()} border overflow-visible select-none flex
          ${screenQuadrant.startsWith('bottom') ? 'flex-col-reverse' : 'flex-col'}
          ${theme === 'light' 
            ? 'bg-white/95 border-purple-300 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-300/30' 
            : 'bg-gray-900/90 border-purple-500/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20'
          }
          ${isExpanded ? 'p-4' : 'p-3'}
          ${isDragging ? 'shadow-2xl shadow-purple-500/40 scale-105' : ''}
          ${isResizing ? '' : 'transition-all duration-300'}
        `}
        style={{ width: getCurrentWidth() }}
      >
        {/* Drag handle - positioned based on quadrant */}
        <div
          className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing group ${
            screenQuadrant.startsWith('top') 
              ? 'bottom-0 left-0 right-0 h-6' 
              : 'top-0 left-0 right-0 h-6'
          }`}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          title={t.mascot.dragToMove}
        >
          <GripHorizontal size={14} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
        </div>

        {/* Header - clickable to expand */}
        <div
          className={`flex items-center gap-3 cursor-pointer ${
            screenQuadrant.startsWith('top') ? 'mb-2 mt-0' : 'mt-2 mb-0'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <MascotFace 
            emotion={emotion} 
            size={getCurrentFaceSize()} 
            intensity={chatSentiment.intensity}
            isAnalyzing={chatMessages.length > 0 && chatMessages.length % 10 < 3}
          />

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className={`font-bold uppercase tracking-wider truncate ${
                scale < 0.8 ? 'text-[9px]' : 'text-[10px]'
              } ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`}>
                {scale < 0.8 ? 'AI' : t.mascot.title}
              </span>
              <div
                className={`shrink-0 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'} animate-pulse`}
                style={{ width: scale < 0.8 ? 5 : 6, height: scale < 0.8 ? 5 : 6 }}
              />
            </div>
            <p className={`font-medium truncate ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}
               style={{ fontSize: Math.max(10, Math.round(12 * scale)) }}>
              {message}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Popup button for OBS */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openMascotPopup();
              }}
              className="p-1 text-gray-400 hover:text-green-400 transition-colors"
              title="Abrir para OBS (Chroma Key)"
            >
              <ExternalLink size={16} />
            </button>
            
            {onDismiss && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                aria-label="Cerrar mascota"
                title="Cerrar"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Expanded content - appears above or below header based on quadrant */}
        {isExpanded && (
          <div className={`space-y-3 animate-fadeIn ${
            screenQuadrant.startsWith('bottom') ? 'mb-3' : 'mt-3'
          } ${screenQuadrant.startsWith('top') ? 'mb-6' : ''}`}>
            {/* Chat sentiment indicator */}
            <SentimentIndicator sentiment={chatSentiment} t={t} compact={scale < 0.9} />

            {/* Help tip */}
            {showHelp && helpTip && (
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 animate-fadeIn">
                <div className="flex items-start gap-2">
                  <HelpCircle size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-200">{helpTip}</p>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <StatsGrid
              messagesCount={chatMessages.length}
              viewersCount={viewerCount ?? new Set(chatMessages.map(m => m.username)).size}
              activityPercent={chatSentiment.intensity}
              t={t}
              isRealViewerCount={viewerCount !== undefined && viewerCount !== null}
              compact={scale < 0.9}
            />
          </div>
        )}
        
        {/* Resize handle - positioned based on quadrant */}
        <div
          className={`absolute w-6 h-6 group touch-none ${isResizing ? 'z-50' : ''} ${
            screenQuadrant === 'top-left' ? '-top-1 -left-1 cursor-nw-resize' :
            screenQuadrant === 'top-right' ? '-top-1 -right-1 cursor-ne-resize' :
            screenQuadrant === 'bottom-left' ? '-bottom-1 -left-1 cursor-sw-resize' :
            '-bottom-1 -right-1 cursor-se-resize'
          }`}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          title="Arrastrar para redimensionar"
        >
          {/* Resize handle background */}
          <div className={`absolute inset-0 transition-all ${
            screenQuadrant === 'top-left' ? 'rounded-br-lg' :
            screenQuadrant === 'top-right' ? 'rounded-bl-lg' :
            screenQuadrant === 'bottom-left' ? 'rounded-tr-lg' :
            'rounded-tl-lg'
          } ${
            isResizing 
              ? 'bg-purple-500/40 scale-150' 
              : 'bg-transparent group-hover:bg-purple-500/20'
          }`} />
          {/* Resize indicator dots */}
          <svg 
            viewBox="0 0 16 16" 
            className={`w-full h-full relative z-10 transition-colors ${
              screenQuadrant === 'top-left' ? 'rotate-180' :
              screenQuadrant === 'top-right' ? '-rotate-90' :
              screenQuadrant === 'bottom-left' ? 'rotate-90' :
              ''
            } ${
              isResizing
                ? 'text-purple-400'
                : theme === 'light' 
                  ? 'text-purple-400/60 group-hover:text-purple-600' 
                  : 'text-purple-500/40 group-hover:text-purple-400'
            }`}
          >
            {/* Three diagonal dots pattern */}
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="8" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="8" r="1.5" fill="currentColor" />
          </svg>
        </div>
        
        {/* Resize indicator overlay */}
        {isResizing && (
          <div className="absolute inset-0 border-2 border-purple-500/50 rounded-2xl pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              {getScalePercent()}%
            </div>
          </div>
        )}
      </div>

      {/* Celebration particles */}
      {emotion === 'celebrating' && <CelebrationParticles />}
    </div>
  );
};

// Sub-components
const SentimentIndicator: React.FC<{ sentiment: ChatSentiment; t: any; compact?: boolean }> = ({ sentiment, t, compact }) => (
  <div className={`flex items-center gap-1.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
    <span className="text-gray-400 shrink-0">{compact ? '💬' : t.mascot.chatSentiment + ':'}</span>
    <div className="flex items-center gap-1 min-w-0">
      {sentiment.sentiment === 'positive' && <Smile size={compact ? 12 : 14} className="text-green-400 shrink-0" />}
      {sentiment.sentiment === 'neutral' && <Meh size={compact ? 12 : 14} className="text-gray-400 shrink-0" />}
      {sentiment.sentiment === 'negative' && <Frown size={compact ? 12 : 14} className="text-red-400 shrink-0" />}
      <span
        className={`truncate ${
          sentiment.sentiment === 'positive'
            ? 'text-green-400'
            : sentiment.sentiment === 'negative'
              ? 'text-red-400'
              : 'text-gray-400'
        }`}
      >
        {sentiment.sentiment === 'positive'
          ? t.mascot.positive
          : sentiment.sentiment === 'negative'
            ? t.mascot.negative
            : t.mascot.neutral}
      </span>
      <span className="text-gray-500 tabular-nums shrink-0">({sentiment.intensity}%)</span>
    </div>
  </div>
);

const StatsGrid: React.FC<{
  messagesCount: number;
  viewersCount: number;
  activityPercent: number;
  t: any;
  isRealViewerCount?: boolean;
  compact?: boolean;
}> = ({ messagesCount, viewersCount, activityPercent, t, isRealViewerCount, compact }) => (
  <div className={`grid gap-1.5 text-center ${compact ? 'grid-cols-3' : 'grid-cols-3'}`}>
    <div className="bg-gray-800/50 rounded-lg p-1.5 min-w-0">
      <div className={`font-bold text-white tabular-nums ${compact ? 'text-sm' : 'text-base'}`}>{messagesCount}</div>
      <div className={`text-gray-400 truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{t.mascot.messages}</div>
    </div>
    <div className="bg-gray-800/50 rounded-lg p-1.5 relative min-w-0">
      <div className={`font-bold text-white tabular-nums ${compact ? 'text-sm' : 'text-base'}`}>{viewersCount || 0}</div>
      <div className={`text-gray-400 flex items-center justify-center gap-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        <span className="truncate">{t.mascot.viewers}</span>
        {isRealViewerCount && <span className="w-1 h-1 bg-green-500 rounded-full shrink-0" title="Live count" />}
      </div>
    </div>
    <div className="bg-gray-800/50 rounded-lg p-1.5 min-w-0">
      <div className={`font-bold text-white tabular-nums ${compact ? 'text-sm' : 'text-base'}`}>{activityPercent}%</div>
      <div className={`text-gray-400 truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{t.mascot.intensity}</div>
    </div>
  </div>
);

const CelebrationParticles: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="absolute animate-float"
        style={{
          left: `${15 + i * 15}%`,
          animationDelay: `${i * 0.2}s`,
          animationDuration: '2s',
        }}
      >
        <Sparkles size={12} className="text-yellow-400" />
      </div>
    ))}
  </div>
);

export default AIVisionMascot;

// Export types
export type { MascotSize };
