// Chat entre moderadores
import React, { useState, useRef, useEffect } from 'react';
import { useCollaborationContext } from '../../context/CollaborationContext';
import { useModChat } from '../../hooks/useModChat';
import { ChatMessage } from '../../types/collaboration';

export interface ModeratorChatProps {
  className?: string;
}

export function ModeratorChat({ className = '' }: ModeratorChatProps) {
  const { collaborators, currentUser } = useCollaborationContext();
  const { messages, sendMessage, setTyping } = useModChat();
  
  const [inputValue, setInputValue] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter collaborators for mentions
  const filteredCollaborators = collaborators.filter(c =>
    c.id !== currentUser?.id &&
    c.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check for @ mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true);
      setMentionFilter('');
      setMentionIndex(0);
    } else if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(afterAt);
        setMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    // Handle typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  // Handle mention selection
  const handleSelectMention = (collaborator: typeof collaborators[0]) => {
    const lastAtIndex = inputValue.lastIndexOf('@');
    const newValue = inputValue.slice(0, lastAtIndex) + `@${collaborator.name} `;
    setInputValue(newValue);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions && filteredCollaborators.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => Math.min(i + 1, filteredCollaborators.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(filteredCollaborators[mentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle send message
  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    sendMessage(inputValue.trim());
    setInputValue('');
    setShowMentions(false);
    setTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render message content with highlighted mentions (safe version)
  // Note: Messages are already sanitized by ChatService before storage (Requirements: 6.1, 6.6)
  const renderMessageContent = (message: ChatMessage) => {
    const content = message.content;
    
    // Build parts array for safe rendering
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Find all mentions and create safe React elements
    message.mentions.forEach(userId => {
      const user = collaborators.find(c => c.id === userId);
      if (user) {
        const mentionPattern = `@${user.name}`;
        const regex = new RegExp(mentionPattern, 'gi');
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          // Add text before mention
          if (match.index > lastIndex) {
            parts.push(content.slice(lastIndex, match.index));
          }
          // Add highlighted mention as React element
          parts.push(
            <span key={`${userId}-${match.index}`} className="text-purple-400 font-medium">
              {match[0]}
            </span>
          );
          lastIndex = match.index + match[0].length;
        }
      }
    });
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    return <span>{parts.length > 0 ? parts : content}</span>;
  };

  // Get typing users
  const typingUsers = collaborators.filter(c => 
    c.isTyping && c.id !== currentUser?.id
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-4">
            No hay mensajes aún. ¡Inicia la conversación!
          </p>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-2 ${
                message.isSystem ? 'justify-center' : ''
              }`}
            >
              {message.isSystem ? (
                <p className="text-gray-500 text-xs italic">
                  {message.content}
                </p>
              ) : (
                <>
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {message.userAvatar ? (
                      <img
                        src={message.userAvatar}
                        alt={message.userName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-sm">
                        {message.userName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={`font-medium text-sm ${
                        message.userId === currentUser?.id
                          ? 'text-purple-400'
                          : 'text-white'
                      }`}>
                        {message.userName}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm break-words">
                      {renderMessageContent(message)}
                    </p>
                  </div>
                </>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-gray-400 text-xs">
          {typingUsers.length === 1
            ? `${typingUsers[0].name} está escribiendo...`
            : `${typingUsers.map(u => u.name).join(', ')} están escribiendo...`
          }
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-700 relative">
        {/* Mentions dropdown */}
        {showMentions && filteredCollaborators.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-gray-700 rounded-lg shadow-lg overflow-hidden">
            {filteredCollaborators.map((collaborator, index) => (
              <button
                key={collaborator.id}
                onClick={() => handleSelectMention(collaborator)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
                  index === mentionIndex
                    ? 'bg-purple-600'
                    : 'hover:bg-gray-600'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center overflow-hidden">
                  {collaborator.avatar ? (
                    <img
                      src={collaborator.avatar}
                      alt={collaborator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xs">
                      {collaborator.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-white text-sm">{collaborator.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... (usa @ para mencionar)"
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded 
                     placeholder-gray-400 focus:outline-none focus:ring-2 
                     focus:ring-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 
                     disabled:cursor-not-allowed text-white px-4 py-2 rounded 
                     transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
