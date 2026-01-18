import React, { useState, useRef, useEffect } from 'react';
import type { MobileAppState, MobileMessage, MobileChatMessage } from '../../types/mobile';
import { sanitizationService } from '../../src/infrastructure/security/SanitizationService';
import { logService } from '../../src/infrastructure/logging/LogService';

/**
 * ChatScreen - Moderator chat view and messaging
 * @requirements Task 11 - Crear ChatScreen
 */

interface ChatScreenProps {
  state: MobileAppState;
  onAction: (action: MobileMessage) => void;
  onBack: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  state,
  onAction,
  onBack,
}) => {
  const { recentChat, channelName } = state;
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'mods'>('all');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const filteredChat = filter === 'mods' 
    ? recentChat.filter(m => m.isMod)
    : recentChat;

  const handleSend = () => {
    if (!message.trim()) return;
    onAction({ type: 'CHAT_SEND', data: { message: message.trim() } });
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentChat]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 px-4 py-4 border-b border-zinc-800 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Chat</h1>
          <p className="text-xs text-zinc-500">{channelName}</p>
        </div>
        
        {/* Filter Toggle */}
        <div className="flex bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              filter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('mods')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              filter === 'mods' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
            }`}
          >
            Mods
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredChat.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-zinc-500 text-sm">
              {filter === 'mods' ? 'Sin mensajes de mods' : 'Sin mensajes recientes'}
            </p>
          </div>
        ) : (
          <>
            {[...filteredChat].reverse().map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 safe-area-bottom">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="p-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ChatMessageItemProps {
  message: MobileChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Sanitize chat message and log malicious content attempts
   * Requirements: 6.1, 6.4, 6.6
   */
  const sanitizedMessage = React.useMemo(() => {
    // Check for malicious content before sanitization
    if (sanitizationService.isMalicious(message.message)) {
      logService.warn('Malicious content detected in mobile chat message', {
        username: message.displayName,
        message: message.message.substring(0, 100), // Log first 100 chars only
        timestamp: new Date().toISOString(),
      });
    }

    // Sanitize the message (removes all HTML tags and escapes special characters)
    return sanitizationService.sanitizeChatMessage(message.message);
  }, [message.message, message.displayName]);

  return (
    <div className="flex gap-2">
      {/* Badges */}
      <div className="flex-shrink-0 flex items-start gap-1 pt-1">
        {message.isMod && (
          <span className="text-xs" title="Moderador">🗡️</span>
        )}
        {message.isSubscriber && (
          <span className="text-xs" title="Suscriptor">⭐</span>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="font-medium text-sm"
            style={{ color: message.color || '#9147ff' }}
          >
            {message.displayName}
          </span>
          <span className="text-xs text-zinc-600">{formatTime(message.timestamp)}</span>
        </div>
        <p className="text-zinc-300 text-sm break-words">{sanitizedMessage}</p>
      </div>
    </div>
  );
};

export default ChatScreen;
