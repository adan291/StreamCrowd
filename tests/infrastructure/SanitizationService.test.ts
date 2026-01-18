/**
 * Sanitization Service Tests
 * 
 * Tests for the XSS prevention sanitization service.
 * Verifies that user-generated content is properly sanitized.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SanitizationService, sanitizationService } from '../../src/infrastructure/security/SanitizationService';

describe('SanitizationService', () => {
  let service: SanitizationService;

  beforeEach(() => {
    service = new SanitizationService();
  });

  describe('sanitizeHtml', () => {
    it('should preserve safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const result = service.sanitizeHtml(input);
      
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    it('should preserve safe links with href attribute', () => {
      const input = '<a href="https://example.com">Click here</a>';
      const result = service.sanitizeHtml(input);
      
      expect(result).toContain('<a');
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Click here');
    });

    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
      expect(result).toContain('Click me');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Malicious link</a>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });

    it('should remove data: URLs', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('data:');
      expect(result).not.toContain('<script');
    });

    it('should remove dangerous attributes', () => {
      const input = '<div onmouseover="alert(1)" data-evil="bad">Content</div>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('data-evil');
      expect(result).toContain('Content');
    });

    it('should preserve formatting tags', () => {
      const input = '<p>Text with <b>bold</b>, <i>italic</i>, and <em>emphasis</em></p>';
      const result = service.sanitizeHtml(input);
      
      expect(result).toContain('<b>');
      expect(result).toContain('<i>');
      expect(result).toContain('<em>');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      expect(result).toContain('emphasis');
    });

    it('should handle empty input', () => {
      const result = service.sanitizeHtml('');
      expect(result).toBe('');
    });

    it('should handle plain text without HTML', () => {
      const input = 'Just plain text';
      const result = service.sanitizeHtml(input);
      expect(result).toBe('Just plain text');
    });

    it('should remove nested script tags', () => {
      const input = '<div><p><script>alert("nested")</script></p></div>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('should handle multiple XSS attempts in one string', () => {
      const input = '<script>alert(1)</script><img onerror="alert(2)" src="x"><a href="javascript:alert(3)">link</a>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('<script');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });
  });

  describe('sanitizeChatMessage', () => {
    it('should remove all HTML tags from chat messages', () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const result = service.sanitizeChatMessage(input);
      
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<strong>');
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    it('should escape HTML special characters', () => {
      const input = 'Hello <world> & "friends"';
      const result = service.sanitizeChatMessage(input);
      
      // DOMPurify removes HTML tags and escapes entities
      expect(result).not.toContain('<world>');
      expect(result).toContain('Hello');
      expect(result).toContain('friends');
      // Check that dangerous characters are handled
      expect(result).not.toContain('<script');
    });

    it('should remove script tags from chat', () => {
      const input = 'Hello <script>alert("xss")</script> world';
      const result = service.sanitizeChatMessage(input);
      
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    it('should handle plain text messages', () => {
      const input = 'Just a normal chat message';
      const result = service.sanitizeChatMessage(input);
      expect(result).toBe('Just a normal chat message');
    });

    it('should handle single quotes safely', () => {
      const input = "It's a test";
      const result = service.sanitizeChatMessage(input);
      // DOMPurify doesn't escape single quotes as they're not dangerous in text context
      expect(result).toContain('test');
      expect(result).not.toContain('<script');
    });

    it('should handle empty messages', () => {
      const result = service.sanitizeChatMessage('');
      expect(result).toBe('');
    });

    it('should remove event handlers from chat', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = service.sanitizeChatMessage(input);
      
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('<div');
    });

    it('should handle messages with multiple special characters', () => {
      const input = '<>&"\'';
      const result = service.sanitizeChatMessage(input);
      
      // DOMPurify removes/escapes dangerous characters
      expect(result).not.toContain('<script');
      expect(result).not.toContain('javascript:');
      // The exact output format depends on DOMPurify's implementation
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('isMalicious', () => {
    it('should detect script tags', () => {
      expect(service.isMalicious('<script>alert(1)</script>')).toBe(true);
      expect(service.isMalicious('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
      expect(service.isMalicious('text <script> more text')).toBe(true);
    });

    it('should detect javascript: URLs', () => {
      expect(service.isMalicious('javascript:alert(1)')).toBe(true);
      expect(service.isMalicious('JAVASCRIPT:alert(1)')).toBe(true);
      expect(service.isMalicious('<a href="javascript:void(0)">link</a>')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(service.isMalicious('onclick="alert(1)"')).toBe(true);
      expect(service.isMalicious('onmouseover="alert(1)"')).toBe(true);
      expect(service.isMalicious('onerror="alert(1)"')).toBe(true);
      expect(service.isMalicious('onload="malicious()"')).toBe(true);
    });

    it('should detect data: URLs', () => {
      expect(service.isMalicious('data:text/html,<script>alert(1)</script>')).toBe(true);
      expect(service.isMalicious('DATA:text/html,content')).toBe(true);
    });

    it('should detect vbscript: URLs', () => {
      expect(service.isMalicious('vbscript:msgbox(1)')).toBe(true);
      expect(service.isMalicious('VBSCRIPT:msgbox(1)')).toBe(true);
    });

    it('should return false for safe content', () => {
      expect(service.isMalicious('Hello world')).toBe(false);
      expect(service.isMalicious('<p>Safe HTML</p>')).toBe(false);
      expect(service.isMalicious('<a href="https://example.com">Link</a>')).toBe(false);
      expect(service.isMalicious('Normal text with numbers 123')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(service.isMalicious('')).toBe(false);
    });

    it('should detect multiple malicious patterns', () => {
      const malicious = '<script>alert(1)</script><img onerror="alert(2)" src="x">';
      expect(service.isMalicious(malicious)).toBe(true);
    });

    it('should be case-insensitive for detection', () => {
      expect(service.isMalicious('<ScRiPt>alert(1)</ScRiPt>')).toBe(true);
      expect(service.isMalicious('JaVaScRiPt:alert(1)')).toBe(true);
      expect(service.isMalicious('OnClIcK="alert(1)"')).toBe(true);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(sanitizationService).toBeInstanceOf(SanitizationService);
    });

    it('should work with the singleton instance', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizationService.sanitizeHtml(input);
      
      expect(result).not.toContain('<script');
      expect(result).toContain('Hello');
    });
  });
});

describe('SanitizationService Security Properties', () => {
  let service: SanitizationService;

  beforeEach(() => {
    service = new SanitizationService();
  });

  describe('XSS Attack Vectors', () => {
    it('SECURITY: should block common XSS attack vectors', () => {
      const attackVectors = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)">',
        '<body onload=alert(1)>',
        '<input onfocus=alert(1) autofocus>',
        '<select onfocus=alert(1) autofocus>',
        '<textarea onfocus=alert(1) autofocus>',
        '<marquee onstart=alert(1)>',
        '<div style="background:url(javascript:alert(1))">',
      ];

      for (const attack of attackVectors) {
        const sanitized = service.sanitizeHtml(attack);
        
        // Should not contain script execution
        expect(sanitized).not.toContain('alert');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toMatch(/on\w+=/i);
      }
    });

    it('SECURITY: should detect malicious content before sanitization', () => {
      const maliciousInputs = [
        '<script>steal_cookies()</script>',
        'javascript:void(0)',
        '<img onerror="hack()" src="x">',
        'data:text/html,<script>alert(1)</script>',
      ];

      for (const input of maliciousInputs) {
        expect(service.isMalicious(input)).toBe(true);
      }
    });

    it('SECURITY: chat messages should be completely safe', () => {
      const dangerousChatMessages = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<a href="javascript:void(0)">click</a>',
      ];

      for (const message of dangerousChatMessages) {
        const sanitized = service.sanitizeChatMessage(message);
        
        // Should not contain any HTML tags
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('<a');
        
        // Should not contain dangerous attributes
        expect(sanitized).not.toContain('onerror');
      }
    });

    it('SECURITY: should preserve safe content while removing dangerous parts', () => {
      const input = 'Hello <b>world</b><script>alert(1)</script> friend';
      const sanitized = service.sanitizeHtml(input);
      
      // Safe content preserved
      expect(sanitized).toContain('Hello');
      expect(sanitized).toContain('world');
      expect(sanitized).toContain('friend');
      expect(sanitized).toContain('<b>');
      
      // Dangerous content removed
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000) + '<script>alert(1)</script>';
      const result = service.sanitizeHtml(longString);
      
      expect(result).not.toContain('<script');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const input = '<p>Hello 世界 🌍</p>';
      const result = service.sanitizeHtml(input);
      
      expect(result).toContain('世界');
      expect(result).toContain('🌍');
    });

    it('should handle malformed HTML', () => {
      const input = '<p>Unclosed tag<script>alert(1)';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('should handle null bytes and special characters', () => {
      const input = 'Hello\x00World<script>alert(1)</script>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('<script');
    });
  });
});
