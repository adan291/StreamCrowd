import DOMPurify from 'dompurify';

/**
 * SanitizationService provides methods to sanitize user-generated content
 * and prevent XSS attacks using DOMPurify.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
export class SanitizationService {
  private config: DOMPurify.Config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
  };

  /**
   * Sanitizes HTML content while preserving safe formatting tags.
   * Removes potentially dangerous HTML tags and attributes.
   * 
   * @param dirty - The unsanitized HTML string
   * @returns Sanitized HTML string safe for rendering
   * 
   * Requirements: 6.2, 6.3
   */
  sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, this.config);
  }

  /**
   * Sanitizes chat messages by removing all HTML tags and escaping special characters.
   * This is more restrictive than sanitizeHtml and suitable for user chat messages.
   * 
   * @param message - The unsanitized chat message
   * @returns Plain text message with HTML entities escaped
   * 
   * Requirements: 6.1
   */
  sanitizeChatMessage(message: string): string {
    // Remove all HTML, keep only text
    // DOMPurify already escapes HTML entities, so we don't need to escape again
    return DOMPurify.sanitize(message, { ALLOWED_TAGS: [] });
  }

  /**
   * Checks if content contains potentially malicious patterns.
   * Detects common XSS attack vectors like script tags, javascript: URLs, and event handlers.
   * 
   * @param content - The content to check
   * @returns true if malicious patterns are detected, false otherwise
   * 
   * Requirements: 6.4
   */
  isMalicious(content: string): boolean {
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /data:/i,
      /vbscript:/i,
    ];
    return maliciousPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Escapes HTML special characters to prevent XSS.
   * 
   * @param text - The text to escape
   * @returns Text with HTML entities escaped
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

/**
 * Singleton instance of SanitizationService for application-wide use.
 */
export const sanitizationService = new SanitizationService();
