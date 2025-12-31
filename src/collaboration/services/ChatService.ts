// Chat Service - Gestiona el chat entre moderadores
import { ChatMessage } from '../../../types/collaboration';

const MAX_MESSAGES = 500;
const MAX_MESSAGE_LENGTH = 1000;
const MENTION_REGEX = /@(\w+)/g;

export interface ChatServiceOptions {
  maxMessages?: number;
  maxMessageLength?: number;
}

export class ChatService {
  private messages: ChatMessage[] = [];
  private listeners: Set<(messages: ChatMessage[]) => void> = new Set();
  private typingUsers: Map<string, { userName: string; timeout: NodeJS.Timeout }> = new Map();
  private typingListeners: Set<(users: Array<{ userId: string; userName: string }>) => void> = new Set();
  private maxMessages: number;
  private maxMessageLength: number;

  constructor(options: ChatServiceOptions = {}) {
    this.maxMessages = options.maxMessages ?? MAX_MESSAGES;
    this.maxMessageLength = options.maxMessageLength ?? MAX_MESSAGE_LENGTH;
  }

  // ============================================
  // Message Sending
  // ============================================

  sendMessage(
    userId: string,
    userName: string,
    content: string,
    userAvatar?: string
  ): ChatMessage | null {
    // Validate content
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return null;
    }

    // Truncate if too long
    const finalContent = trimmedContent.slice(0, this.maxMessageLength);

    // Parse mentions
    const mentions = this.parseMentions(finalContent);

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      userName,
      userAvatar,
      content: finalContent,
      mentions,
      timestamp: Date.now(),
      isSystem: false
    };

    this.addMessage(message);
    
    // Clear typing indicator for this user
    this.setTyping(userId, userName, false);

    return message;
  }

  sendSystemMessage(content: string): ChatMessage {
    const message: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: 'system',
      userName: 'Sistema',
      content,
      mentions: [],
      timestamp: Date.now(),
      isSystem: true
    };

    this.addMessage(message);
    return message;
  }

  // ============================================
  // Message Management
  // ============================================

  private addMessage(message: ChatMessage): void {
    this.messages.push(message);

    // Trim old messages if exceeding max
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    this.notifyListeners();
  }

  receiveMessage(message: ChatMessage): void {
    // Avoid duplicates
    if (this.messages.some(m => m.id === message.id)) {
      return;
    }

    this.addMessage(message);
  }

  // ============================================
  // Message Queries
  // ============================================

  getMessages(limit?: number): ChatMessage[] {
    if (limit && limit > 0) {
      return this.messages.slice(-limit);
    }
    return [...this.messages];
  }

  getMessagesSince(timestamp: number): ChatMessage[] {
    return this.messages.filter(m => m.timestamp > timestamp);
  }

  getMessageById(messageId: string): ChatMessage | null {
    return this.messages.find(m => m.id === messageId) || null;
  }

  getMessagesByUser(userId: string): ChatMessage[] {
    return this.messages.filter(m => m.userId === userId);
  }

  getMessagesWithMention(userId: string): ChatMessage[] {
    return this.messages.filter(m => m.mentions.includes(userId));
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  // ============================================
  // Mention Parsing
  // ============================================

  parseMentions(content: string): string[] {
    const mentions: string[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state
    MENTION_REGEX.lastIndex = 0;

    while ((match = MENTION_REGEX.exec(content)) !== null) {
      const mention = match[1];
      if (!mentions.includes(mention)) {
        mentions.push(mention);
      }
    }

    return mentions;
  }

  formatMentions(content: string, userMap: Map<string, string>): string {
    // Replace @username with formatted mentions
    return content.replace(MENTION_REGEX, (match, username) => {
      const userId = Array.from(userMap.entries())
        .find(([_, name]) => name.toLowerCase() === username.toLowerCase())?.[0];
      
      if (userId) {
        return `<mention userId="${userId}">@${username}</mention>`;
      }
      return match;
    });
  }

  // ============================================
  // Typing Indicators
  // ============================================

  setTyping(userId: string, userName: string, isTyping: boolean): void {
    const existing = this.typingUsers.get(userId);
    
    if (existing) {
      clearTimeout(existing.timeout);
      this.typingUsers.delete(userId);
    }

    if (isTyping) {
      // Auto-clear typing after 5 seconds
      const timeout = setTimeout(() => {
        this.typingUsers.delete(userId);
        this.notifyTypingListeners();
      }, 5000);

      this.typingUsers.set(userId, { userName, timeout });
    }

    this.notifyTypingListeners();
  }

  getTypingUsers(): Array<{ userId: string; userName: string }> {
    return Array.from(this.typingUsers.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName
    }));
  }

  // ============================================
  // History Management
  // ============================================

  clearHistory(): void {
    this.messages = [];
    this.notifyListeners();
  }

  loadHistory(messages: ChatMessage[]): void {
    // Sort by timestamp and deduplicate
    const existingIds = new Set(this.messages.map(m => m.id));
    const newMessages = messages.filter(m => !existingIds.has(m.id));
    
    this.messages = [...this.messages, ...newMessages]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-this.maxMessages);

    this.notifyListeners();
  }

  exportHistory(): ChatMessage[] {
    return [...this.messages];
  }

  // ============================================
  // Listeners
  // ============================================

  subscribe(listener: (messages: ChatMessage[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current messages
    listener(this.getMessages());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const messages = this.getMessages();
    this.listeners.forEach(listener => listener(messages));
  }

  subscribeToTyping(
    listener: (users: Array<{ userId: string; userName: string }>) => void
  ): () => void {
    this.typingListeners.add(listener);
    return () => this.typingListeners.delete(listener);
  }

  private notifyTypingListeners(): void {
    const users = this.getTypingUsers();
    this.typingListeners.forEach(listener => listener(users));
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    // Clear all typing timeouts
    for (const [_, data] of this.typingUsers) {
      clearTimeout(data.timeout);
    }
    this.typingUsers.clear();
    this.listeners.clear();
    this.typingListeners.clear();
    this.messages = [];
  }
}

// Singleton
let instance: ChatService | null = null;

export function getChatService(): ChatService {
  if (!instance) {
    instance = new ChatService();
  }
  return instance;
}

export function resetChatService(): void {
  if (instance) {
    instance.dispose();
  }
  instance = null;
}
