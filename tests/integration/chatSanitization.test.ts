/**
 * Integration tests for chat message sanitization
 * 
 * Validates that all chat components properly sanitize user-generated content
 * before rendering, preventing XSS attacks.
 * 
 * Requirements: 6.1, 6.4, 6.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatService } from '../../src/collaboration/services/ChatService';
import { sanitizationService } from '../../src/infrastructure/security/SanitizationService';
import { logService } from '../../src/infrastructure/logging/LogService';

describe('Chat Sanitization Integration', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService();
    // Clear logs before each test
    logService.clearLogs();
  });

  describe('Collaboration Chat Sanitization', () => {
    it('should sanitize malicious content in chat messages', () => {
      const maliciousMessage = '<script>alert("XSS")</script>Hello';
      
      const message = chatService.sendMessage(
        'user123',
        'TestUser',
        maliciousMessage
      );

      expect(message).not.toBeNull();
      expect(message!.content).not.toContain('<script>');
      expect(message!.content).not.toContain('alert');
      // Should preserve the safe text
      expect(message!.content).toContain('Hello');
    });

    it('should sanitize event handlers in chat messages', () => {
      const maliciousMessage = '<img onerror="alert(1)" src="x">Test';
      
      const message = chatService.sendMessage(
        'user123',
        'TestUser',
        maliciousMessage
      );

      expect(message).not.toBeNull();
      expect(message!.content).not.toContain('onerror');
      expect(message!.content).not.toContain('alert');
    });

    it('should sanitize javascript: URLs in chat messages', () => {
      const maliciousMessage = '<a href="javascript:alert(1)">Click</a>';
      
      const message = chatService.sendMessage(
        'user123',
        'TestUser',
        maliciousMessage
      );

      expect(message).not.toBeNull();
      expect(message!.content).not.toContain('javascript:');
      expect(message!.content).not.toContain('alert');
    });

    it('should log malicious content attempts', () => {
      const maliciousMessage = '<script>alert("XSS")</script>Hello';
      
      chatService.sendMessage(
        'user123',
        'TestUser',
        maliciousMessage
      );

      const logs = logService.getLogs('warn');
      const maliciousLog = logs.find(log => 
        log.message.includes('Malicious content detected')
      );

      expect(maliciousLog).toBeDefined();
      expect(maliciousLog?.context?.userId).toBe('user123');
      expect(maliciousLog?.context?.userName).toBe('TestUser');
      expect(maliciousLog?.message).toContain('collaboration chat');
    });

    it('should preserve safe content in chat messages', () => {
      const safeMessage = 'Hello @user, how are you?';
      
      const message = chatService.sendMessage(
        'user123',
        'TestUser',
        safeMessage
      );

      expect(message).not.toBeNull();
      expect(message!.content).toBe(safeMessage);
    });

    it('should handle multiple XSS attempts in one message', () => {
      const maliciousMessage = '<script>alert(1)</script><img onerror="alert(2)" src="x"><a href="javascript:alert(3)">link</a>';
      
      const message = chatService.sendMessage(
        'user123',
        'TestUser',
        maliciousMessage
      );

      expect(message).not.toBeNull();
      expect(message!.content).not.toContain('<script>');
      expect(message!.content).not.toContain('onerror');
      expect(message!.content).not.toContain('javascript:');
      expect(message!.content).not.toContain('alert');
    });
  });

  describe('System Message Sanitization', () => {
    it('should sanitize HTML in system messages', () => {
      const maliciousContent = '<script>alert("XSS")</script>System notification';
      
      const message = chatService.sendSystemMessage(maliciousContent);

      expect(message.content).not.toContain('<script>');
      expect(message.content).not.toContain('alert');
      expect(message.isSystem).toBe(true);
    });

    it('should preserve safe HTML formatting in system messages', () => {
      const safeContent = '<strong>Important:</strong> Server maintenance scheduled';
      
      const message = chatService.sendSystemMessage(safeContent);

      // System messages use sanitizeHtml which preserves safe tags
      expect(message.content).toContain('strong');
      expect(message.content).toContain('Important');
      expect(message.isSystem).toBe(true);
    });
  });

  describe('Message Receiving Sanitization', () => {
    it('should handle received messages that are already sanitized', () => {
      const receivedMessage = {
        id: 'msg-123',
        userId: 'user456',
        userName: 'RemoteUser',
        content: 'Safe message from remote',
        mentions: [],
        timestamp: Date.now(),
        isSystem: false,
      };

      chatService.receiveMessage(receivedMessage);

      const messages = chatService.getMessages();
      const found = messages.find(m => m.id === 'msg-123');

      expect(found).toBeDefined();
      expect(found?.content).toBe('Safe message from remote');
    });

    it('should not duplicate messages when receiving', () => {
      const receivedMessage = {
        id: 'msg-unique',
        userId: 'user456',
        userName: 'RemoteUser',
        content: 'Test message',
        mentions: [],
        timestamp: Date.now(),
        isSystem: false,
      };

      chatService.receiveMessage(receivedMessage);
      chatService.receiveMessage(receivedMessage); // Try to add duplicate

      const messages = chatService.getMessages();
      const duplicates = messages.filter(m => m.id === 'msg-unique');

      expect(duplicates.length).toBe(1);
    });
  });

  describe('Sanitization Service Integration', () => {
    it('should use sanitizationService for chat messages', () => {
      const spy = vi.spyOn(sanitizationService, 'sanitizeChatMessage');
      
      chatService.sendMessage('user123', 'TestUser', 'Test message');

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should use sanitizationService for system messages', () => {
      const spy = vi.spyOn(sanitizationService, 'sanitizeHtml');
      
      chatService.sendSystemMessage('System message');

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should check for malicious content before sanitization', () => {
      const spy = vi.spyOn(sanitizationService, 'isMalicious');
      
      chatService.sendMessage('user123', 'TestUser', '<script>alert(1)</script>');

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages', () => {
      const message = chatService.sendMessage('user123', 'TestUser', '   ');

      expect(message).toBeNull();
    });

    it('should handle very long malicious messages', () => {
      const longMalicious = '<script>alert(1)</script>'.repeat(100) + 'Text';
      
      const message = chatService.sendMessage('user123', 'TestUser', longMalicious);

      expect(message).not.toBeNull();
      expect(message!.content).not.toContain('<script>');
      expect(message!.content.length).toBeLessThanOrEqual(1000); // maxMessageLength
    });

    it('should handle unicode and special characters safely', () => {
      const unicodeMessage = '你好 🎉 مرحبا <script>alert(1)</script>';
      
      const message = chatService.sendMessage('user123', 'TestUser', unicodeMessage);

      expect(message).not.toBeNull();
      expect(message!.content).toContain('你好');
      expect(message!.content).toContain('🎉');
      expect(message!.content).toContain('مرحبا');
      expect(message!.content).not.toContain('<script>');
    });

    it('should handle null bytes and control characters', () => {
      const maliciousMessage = 'Test\x00<script>alert(1)</script>';
      
      const message = chatService.sendMessage('user123', 'TestUser', maliciousMessage);

      expect(message).not.toBeNull();
      expect(message!.content).not.toContain('<script>');
    });
  });
});
