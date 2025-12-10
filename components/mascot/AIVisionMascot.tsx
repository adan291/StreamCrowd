// AI Vision Mascot - Main component
import React, { useState, useEffect, useMemo } from 'react';
import { TwitchMessage } from '../../types';
import { useI18n } from '../../i18n';
import { Sparkles, HelpCircle, Frown, Meh, Smile, X, GripHorizontal } from 'lucide-react';

import { MascotPosition, UserDifficulty, ChatSentiment } from './types';
import { analyzeChatSentiment, determineEmotion } from './emotionUtils';
import { useMascotDrag } from './useMascotDrag';
import { useIdleTime } from './useIdleTime';
import { MascotFace } from './MascotFace';

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
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Custom hooks
  const { position, isDragging, containerRef, handleDragStart } = useMascotDrag({
    initialPosition,
    onPositionChange,
  });

  const { idleTime, resetIdleTime } = useIdleTime({
    updateInterval: 10000,
    idleThreshold: 60000,
  });

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

  const positionStyle: React.CSSProperties =
    position.x !== -1
      ? { position: 'fixed', left: position.x, top: position.y, zIndex: 9999 }
      : {};

  return (
    <div
      ref={containerRef}
      className={`${className} ${isDragging ? 'cursor-grabbing' : ''}`}
      style={positionStyle}
    >
      {/* Main container */}
      <div
        className={`
          relative bg-gray-900/90 backdrop-blur-sm rounded-2xl border border-purple-500/30
          transition-all duration-300 overflow-hidden select-none
          hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20
          ${isExpanded ? 'p-4' : 'p-3'}
          ${isDragging ? 'shadow-2xl shadow-purple-500/40 scale-105' : ''}
        `}
      >
        {/* Drag handle */}
        <div
          className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing group"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          title={t.mascot.dragToMove}
        >
          <GripHorizontal size={14} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
        </div>

        {/* Header */}
        <div
          className="flex items-center gap-3 mt-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <MascotFace emotion={emotion} size={isExpanded ? 64 : 48} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                {t.mascot.title}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'} animate-pulse`}
              />
            </div>
            <p className={`text-white font-medium truncate ${isExpanded ? 'text-sm' : 'text-xs'}`}>
              {message}
            </p>
          </div>

          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 space-y-3 animate-fadeIn">
            {/* Chat sentiment indicator */}
            <SentimentIndicator sentiment={chatSentiment} t={t} />

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
              votesCount={pollVotes}
              activityPercent={chatSentiment.intensity}
              t={t}
            />
          </div>
        )}
      </div>

      {/* Celebration particles */}
      {emotion === 'celebrating' && <CelebrationParticles />}
    </div>
  );
};

// Sub-components
const SentimentIndicator: React.FC<{ sentiment: ChatSentiment; t: any }> = ({ sentiment, t }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-gray-400">{t.mascot.chatSentiment}:</span>
    <div className="flex items-center gap-1">
      {sentiment.sentiment === 'positive' && <Smile size={14} className="text-green-400" />}
      {sentiment.sentiment === 'neutral' && <Meh size={14} className="text-gray-400" />}
      {sentiment.sentiment === 'negative' && <Frown size={14} className="text-red-400" />}
      <span
        className={
          sentiment.sentiment === 'positive'
            ? 'text-green-400'
            : sentiment.sentiment === 'negative'
              ? 'text-red-400'
              : 'text-gray-400'
        }
      >
        {sentiment.sentiment === 'positive'
          ? t.mascot.positive
          : sentiment.sentiment === 'negative'
            ? t.mascot.negative
            : t.mascot.neutral}
      </span>
      <span className="text-gray-500">({sentiment.intensity}%)</span>
    </div>
  </div>
);

const StatsGrid: React.FC<{
  messagesCount: number;
  votesCount: number;
  activityPercent: number;
  t: any;
}> = ({ messagesCount, votesCount, activityPercent, t }) => (
  <div className="grid grid-cols-3 gap-2 text-center">
    <div className="bg-gray-800/50 rounded-lg p-2">
      <div className="text-lg font-bold text-white">{messagesCount}</div>
      <div className="text-xs text-gray-400">{t.mascot.messages}</div>
    </div>
    <div className="bg-gray-800/50 rounded-lg p-2">
      <div className="text-lg font-bold text-white">{votesCount || 0}</div>
      <div className="text-xs text-gray-400">{t.mascot.votes}</div>
    </div>
    <div className="bg-gray-800/50 rounded-lg p-2">
      <div className="text-lg font-bold text-white">{activityPercent}%</div>
      <div className="text-xs text-gray-400">{t.mascot.activity}</div>
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
