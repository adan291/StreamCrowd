// Property tests for ChatService
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatService, resetChatService } from '../../src/collaboration/services/ChatService';
import { ChatMessage } from '../../types/collaboration';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    resetChatService();
    service = new ChatService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    service.dispose();
    vi.useRealTimers();
  });

  // ============================================
  // Message Sending Tests
  // ============================================

  describe('sendMessage', () => {
    it('should create a message with correct properties', () => {
      const message = service.sendMessage('user1', 'Alice', 'Hello world');

      expect(message).not.toBeNull();
      expect(message!.userId).toBe('user1');
      expect(message!.userName).toBe('Alice');
      expect(message!.content).toBe('Hello world');
      expect(message!.isSystem).toBe(false);
      expect(message!.id).toMatch(/^msg-/);
      expect(message!.timestamp).toBeGreaterThan(0);
    });

    it('should include avatar when provided', () => {
      const message = service.sendMessage('user1', 'Alice', 'Hello', 'avatar.png');

      expect(message!.userAvatar).toBe('avatar.png');
    });

    it('should return null for empty content', () => {
      expect(service.sendMessage('user1', 'Alice', '')).toBeNull();
      expect(service.sendMessage('user1', 'Alice', '   ')).toBeNull();
    });

    it('should trim whitespace from content', () => {
      const message = service.sendMessage('user1', 'Alice', '  Hello  ');

      expect(message!.content).toBe('Hello');
    });

    it('should truncate messages exceeding max length', () => {
      const longContent = 'a'.repeat(2000);
      const customService = new ChatService({ maxMessageLength: 100 });
      
      const message = customService.sendMessage('user1', 'Alice', longContent);

      expect(message!.content.length).toBe(100);
      customService.dispose();
    });

    it('should store messages in order', () => {
      service.sendMessage('user1', 'Alice', 'First');
      service.sendMessage('user2', 'Bob', 'Second');
      service.sendMessage('user1', 'Alice', 'Third');

      const messages = service.getMessages();
      expect(messages.length).toBe(3);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });
  });

  describe('sendSystemMessage', () => {
    it('should create a system message', () => {
      const message = service.sendSystemMessage('User joined');

      expect(message.userId).toBe('system');
      expect(message.userName).toBe('Sistema');
      expect(message.isSystem).toBe(true);
      expect(message.id).toMatch(/^sys-/);
    });
  });

  // ============================================
  // Message Storage Tests
  // ============================================

  describe('message storage', () => {
    it('should limit messages to maxMessages', () => {
      const customService = new ChatService({ maxMessages: 5 });

      for (let i = 0; i < 10; i++) {
        customService.sendMessage('user1', 'Alice', `Message ${i}`);
      }

      const messages = customService.getMessages();
      expect(messages.length).toBe(5);
      expect(messages[0].content).toBe('Message 5');
      expect(messages[4].content).toBe('Message 9');
      
      customService.dispose();
    });

    it('should avoid duplicate messages on receive', () => {
      const message = service.sendMessage('user1', 'Alice', 'Hello')!;
      
      // Try to receive the same message
      service.receiveMessage(message);

      expect(service.getMessageCount()).toBe(1);
    });

    it('should add new messages on receive', () => {
      const externalMessage: ChatMessage = {
        id: 'external-123',
        userId: 'user2',
        userName: 'Bob',
        content: 'External message',
        mentions: [],
        timestamp: Date.now(),
        isSystem: false
      };

      service.receiveMessage(externalMessage);

      expect(service.getMessageCount()).toBe(1);
      expect(service.getMessageById('external-123')).not.toBeNull();
    });
  });

  // ============================================
  // Message Query Tests
  // ============================================

  describe('getMessages', () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        service.sendMessage('user1', 'Alice', `Message ${i}`);
      }
    });

    it('should return all messages without limit', () => {
      const messages = service.getMessages();
      expect(messages.length).toBe(10);
    });

    it('should return limited messages', () => {
      const messages = service.getMessages(3);
      expect(messages.length).toBe(3);
      expect(messages[0].content).toBe('Message 7');
      expect(messages[2].content).toBe('Message 9');
    });

    it('should return copy of messages array', () => {
      const messages1 = service.getMessages();
      const messages2 = service.getMessages();
      
      expect(messages1).not.toBe(messages2);
    });
  });

  describe('getMessagesSince', () => {
    it('should return messages after timestamp', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      service.sendMessage('user1', 'Alice', 'Old message');

      vi.setSystemTime(baseTime + 1000);
      service.sendMessage('user1', 'Alice', 'New message');

      const messages = service.getMessagesSince(baseTime + 500);
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe('New message');
    });
  });

  describe('getMessagesByUser', () => {
    it('should filter messages by user', () => {
      service.sendMessage('user1', 'Alice', 'Alice 1');
      service.sendMessage('user2', 'Bob', 'Bob 1');
      service.sendMessage('user1', 'Alice', 'Alice 2');

      const aliceMessages = service.getMessagesByUser('user1');
      expect(aliceMessages.length).toBe(2);
      expect(aliceMessages.every(m => m.userId === 'user1')).toBe(true);
    });
  });

  describe('getMessagesWithMention', () => {
    it('should find messages mentioning a user', () => {
      service.sendMessage('user1', 'Alice', 'Hello @Bob');
      service.sendMessage('user2', 'Bob', 'Hi @Alice');
      service.sendMessage('user1', 'Alice', 'No mentions here');

      const mentioningBob = service.getMessagesWithMention('Bob');
      expect(mentioningBob.length).toBe(1);
      expect(mentioningBob[0].content).toBe('Hello @Bob');
    });
  });

  // ============================================
  // Mention Parsing Tests
  // ============================================

  describe('parseMentions', () => {
    it('should extract single mention', () => {
      const mentions = service.parseMentions('Hello @Alice');
      expect(mentions).toEqual(['Alice']);
    });

    it('should extract multiple mentions', () => {
      const mentions = service.parseMentions('@Alice and @Bob are here');
      expect(mentions).toEqual(['Alice', 'Bob']);
    });

    it('should not duplicate mentions', () => {
      const mentions = service.parseMentions('@Alice said hi to @Alice');
      expect(mentions).toEqual(['Alice']);
    });

    it('should return empty array for no mentions', () => {
      const mentions = service.parseMentions('No mentions here');
      expect(mentions).toEqual([]);
    });

    it('should handle mentions at start and end', () => {
      const mentions = service.parseMentions('@Start middle @End');
      expect(mentions).toEqual(['Start', 'End']);
    });

    it('should handle alphanumeric usernames', () => {
      const mentions = service.parseMentions('@User123 and @Test_User');
      expect(mentions).toEqual(['User123', 'Test_User']);
    });
  });

  describe('formatMentions', () => {
    it('should format mentions with user IDs', () => {
      const userMap = new Map([
        ['id1', 'Alice'],
        ['id2', 'Bob']
      ]);

      const formatted = service.formatMentions('Hello @Alice', userMap);
      expect(formatted).toContain('userId="id1"');
      expect(formatted).toContain('@Alice');
    });

    it('should leave unknown mentions unchanged', () => {
      const userMap = new Map([['id1', 'Alice']]);

      const formatted = service.formatMentions('Hello @Unknown', userMap);
      expect(formatted).toBe('Hello @Unknown');
    });

    it('should be case insensitive', () => {
      const userMap = new Map([['id1', 'Alice']]);

      const formatted = service.formatMentions('Hello @alice', userMap);
      expect(formatted).toContain('userId="id1"');
    });
  });

  // ============================================
  // Typing Indicator Tests
  // ============================================

  describe('typing indicators', () => {
    it('should track typing users', () => {
      service.setTyping('user1', 'Alice', true);

      const typing = service.getTypingUsers();
      expect(typing.length).toBe(1);
      expect(typing[0]).toEqual({ userId: 'user1', userName: 'Alice' });
    });

    it('should remove typing indicator when set to false', () => {
      service.setTyping('user1', 'Alice', true);
      service.setTyping('user1', 'Alice', false);

      expect(service.getTypingUsers().length).toBe(0);
    });

    it('should auto-clear typing after timeout', () => {
      service.setTyping('user1', 'Alice', true);
      
      vi.advanceTimersByTime(5001);

      expect(service.getTypingUsers().length).toBe(0);
    });

    it('should clear typing when sending message', () => {
      service.setTyping('user1', 'Alice', true);
      service.sendMessage('user1', 'Alice', 'Hello');

      expect(service.getTypingUsers().length).toBe(0);
    });

    it('should track multiple typing users', () => {
      service.setTyping('user1', 'Alice', true);
      service.setTyping('user2', 'Bob', true);

      const typing = service.getTypingUsers();
      expect(typing.length).toBe(2);
    });

    it('should reset timeout when typing again', () => {
      service.setTyping('user1', 'Alice', true);
      vi.advanceTimersByTime(3000);
      
      service.setTyping('user1', 'Alice', true);
      vi.advanceTimersByTime(3000);

      // Should still be typing (timeout reset)
      expect(service.getTypingUsers().length).toBe(1);
    });
  });

  // ============================================
  // History Management Tests
  // ============================================

  describe('clearHistory', () => {
    it('should remove all messages', () => {
      service.sendMessage('user1', 'Alice', 'Message 1');
      service.sendMessage('user2', 'Bob', 'Message 2');

      service.clearHistory();

      expect(service.getMessageCount()).toBe(0);
    });
  });

  describe('loadHistory', () => {
    it('should load messages from history', () => {
      const history: ChatMessage[] = [
        {
          id: 'hist-1',
          userId: 'user1',
          userName: 'Alice',
          content: 'Old message',
          mentions: [],
          timestamp: Date.now() - 10000
        },
        {
          id: 'hist-2',
          userId: 'user2',
          userName: 'Bob',
          content: 'Another old message',
          mentions: [],
          timestamp: Date.now() - 5000
        }
      ];

      service.loadHistory(history);

      expect(service.getMessageCount()).toBe(2);
    });

    it('should merge with existing messages', () => {
      service.sendMessage('user1', 'Alice', 'New message');

      const history: ChatMessage[] = [
        {
          id: 'hist-1',
          userId: 'user2',
          userName: 'Bob',
          content: 'Old message',
          mentions: [],
          timestamp: Date.now() - 10000
        }
      ];

      service.loadHistory(history);

      expect(service.getMessageCount()).toBe(2);
    });

    it('should not duplicate existing messages', () => {
      const message = service.sendMessage('user1', 'Alice', 'Message')!;

      service.loadHistory([message]);

      expect(service.getMessageCount()).toBe(1);
    });

    it('should sort messages by timestamp', () => {
      const now = Date.now();
      
      service.sendMessage('user1', 'Alice', 'Middle');

      const history: ChatMessage[] = [
        {
          id: 'hist-1',
          userId: 'user2',
          userName: 'Bob',
          content: 'First',
          mentions: [],
          timestamp: now - 10000
        },
        {
          id: 'hist-2',
          userId: 'user2',
          userName: 'Bob',
          content: 'Last',
          mentions: [],
          timestamp: now + 10000
        }
      ];

      service.loadHistory(history);

      const messages = service.getMessages();
      expect(messages[0].content).toBe('First');
      expect(messages[2].content).toBe('Last');
    });
  });

  describe('exportHistory', () => {
    it('should return copy of all messages', () => {
      service.sendMessage('user1', 'Alice', 'Message 1');
      service.sendMessage('user2', 'Bob', 'Message 2');

      const exported = service.exportHistory();

      expect(exported.length).toBe(2);
      expect(exported).not.toBe(service.getMessages());
    });
  });

  // ============================================
  // Listener Tests
  // ============================================

  describe('subscribe', () => {
    it('should notify on new message', () => {
      const listener = vi.fn();
      service.subscribe(listener);

      // Clear initial call
      listener.mockClear();

      service.sendMessage('user1', 'Alice', 'Hello');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ content: 'Hello' })
      ]));
    });

    it('should call listener immediately with current messages', () => {
      service.sendMessage('user1', 'Alice', 'Existing');

      const listener = vi.fn();
      service.subscribe(listener);

      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ content: 'Existing' })
      ]));
    });

    it('should allow unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribe(listener);

      listener.mockClear();
      unsubscribe();

      service.sendMessage('user1', 'Alice', 'Hello');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToTyping', () => {
    it('should notify on typing changes', () => {
      const listener = vi.fn();
      service.subscribeToTyping(listener);

      service.setTyping('user1', 'Alice', true);

      expect(listener).toHaveBeenCalledWith([
        { userId: 'user1', userName: 'Alice' }
      ]);
    });

    it('should allow unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribeToTyping(listener);

      unsubscribe();
      service.setTyping('user1', 'Alice', true);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Dispose Tests
  // ============================================

  describe('dispose', () => {
    it('should clear all state', () => {
      service.sendMessage('user1', 'Alice', 'Message');
      service.setTyping('user1', 'Alice', true);

      service.dispose();

      expect(service.getMessageCount()).toBe(0);
      expect(service.getTypingUsers().length).toBe(0);
    });

    it('should clear typing timeouts', () => {
      service.setTyping('user1', 'Alice', true);
      
      service.dispose();

      // Advance time - should not throw
      vi.advanceTimersByTime(10000);
    });
  });
});
