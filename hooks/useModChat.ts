// Hook para chat entre moderadores
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '../types/collaboration';
import { getCollaborationService } from '../src/collaboration/services/CollaborationService';
import { getChatService } from '../src/collaboration/services/ChatService';

export interface UseModChatOptions {
  maxMessages?: number;
  onNewMessage?: (message: ChatMessage) => void;
  onMention?: (message: ChatMessage) => void;
}

export interface UseModChatReturn {
  // State
  messages: ChatMessage[];
  typingUsers: Array<{ userId: string; userName: string }>;
  isLoading: boolean;
  
  // Actions
  sendMessage: (content: string) => ChatMessage | null;
  setTyping: (isTyping: boolean) => void;
  clearHistory: () => void;
  
  // Queries
  getMessagesByUser: (userId: string) => ChatMessage[];
  getMessagesWithMention: (userId: string) => ChatMessage[];
  
  // Computed
  messageCount: number;
  unreadMentions: number;
}

export function useModChat(options: UseModChatOptions = {}): UseModChatReturn {
  const { maxMessages = 100, onNewMessage, onMention } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(Date.now());
  
  const currentUserIdRef = useRef<string | null>(null);

  // Sync with chat service
  useEffect(() => {
    const chatService = getChatService();
    const collabService = getCollaborationService();

    // Update current user reference
    const currentUser = collabService.getCurrentUser();
    currentUserIdRef.current = currentUser?.id || null;

    // Subscribe to messages
    const unsubMessages = chatService.subscribe((msgs) => {
      const limitedMessages = msgs.slice(-maxMessages);
      setMessages(limitedMessages);

      // Check for new messages
      const newMessages = limitedMessages.filter(m => m.timestamp > lastReadTimestamp);
      newMessages.forEach(msg => {
        if (!msg.isSystem) {
          onNewMessage?.(msg);
          
          // Check for mentions
          if (currentUserIdRef.current && msg.mentions.includes(currentUserIdRef.current)) {
            onMention?.(msg);
          }
        }
      });
    });

    // Subscribe to typing indicators
    const unsubTyping = chatService.subscribeToTyping(setTypingUsers);

    // Subscribe to chat events from collaboration service
    const unsubChat = collabService.on('chat:message', (_, data) => {
      // Message already handled by chatService subscription
    });

    return () => {
      unsubMessages();
      unsubTyping();
      unsubChat();
    };
  }, [maxMessages, lastReadTimestamp, onNewMessage, onMention]);

  // Send message
  const sendMessage = useCallback((content: string): ChatMessage | null => {
    const service = getCollaborationService();
    return service.sendChatMessage(content);
  }, []);

  // Set typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    const service = getCollaborationService();
    service.setTyping(isTyping);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    const chatService = getChatService();
    chatService.clearHistory();
    setLastReadTimestamp(Date.now());
  }, []);

  // Get messages by user
  const getMessagesByUser = useCallback((userId: string): ChatMessage[] => {
    return messages.filter(m => m.userId === userId);
  }, [messages]);

  // Get messages with mention
  const getMessagesWithMention = useCallback((userId: string): ChatMessage[] => {
    return messages.filter(m => m.mentions.includes(userId));
  }, [messages]);

  // Calculate unread mentions
  const unreadMentions = messages.filter(m => 
    m.timestamp > lastReadTimestamp && 
    currentUserIdRef.current && 
    m.mentions.includes(currentUserIdRef.current)
  ).length;

  return {
    messages,
    typingUsers,
    isLoading,
    sendMessage,
    setTyping,
    clearHistory,
    getMessagesByUser,
    getMessagesWithMention,
    messageCount: messages.length,
    unreadMentions
  };
}
