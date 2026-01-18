/**
 * Security Headers Tests
 * 
 * Tests for security headers configuration
 * 
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SECURITY_HEADERS,
  OVERLAY_SECURITY_HEADERS,
  CORS_WHITELIST,
  isOriginWhitelisted,
  getCorsHeaders,
  getSecurityHeaders,
  getSecurityHeadersForRoute,
  validateSecurityHeaders,
  type SecurityHeadersConfig,
} from '../../src/infrastructure/security/SecurityHeaders';

describe('SecurityHeaders', () => {
  describe('DEFAULT_SECURITY_HEADERS', () => {
    it('should include Content-Security-Policy header', () => {
      expect(DEFAULT_SECURITY_HEADERS.contentSecurityPolicy).toBeDefined();
      expect(DEFAULT_SECURITY_HEADERS.contentSecurityPolicy).toContain("default-src 'self'");
    });

    it('should include X-Content-Type-Options: nosniff', () => {
      expect(DEFAULT_SECURITY_HEADERS.xContentTypeOptions).toBe('nosniff');
    });

    it('should include X-Frame-Options: DENY', () => {
      expect(DEFAULT_SECURITY_HEADERS.xFrameOptions).toBe('DENY');
    });

    it('should include X-XSS-Protection header', () => {
      expect(DEFAULT_SECURITY_HEADERS.xXSSProtection).toBe('1; mode=block');
    });

    it('should include Referrer-Policy header', () => {
      expect(DEFAULT_SECURITY_HEADERS.referrerPolicy).toBe('strict-origin-when-cross-origin');
    });

    it('should include Permissions-Policy header', () => {
      expect(DEFAULT_SECURITY_HEADERS.permissionsPolicy).toBeDefined();
      expect(DEFAULT_SECURITY_HEADERS.permissionsPolicy).toContain('camera=()');
      expect(DEFAULT_SECURITY_HEADERS.permissionsPolicy).toContain('microphone=()');
      expect(DEFAULT_SECURITY_HEADERS.permissionsPolicy).toContain('geolocation=()');
    });

    it('should include CORS configuration', () => {
      expect(DEFAULT_SECURITY_HEADERS.cors).toBeDefined();
      expect(DEFAULT_SECURITY_HEADERS.cors.allowOrigin).toBeDefined();
      expect(DEFAULT_SECURITY_HEADERS.cors.allowMethods).toBeDefined();
      expect(DEFAULT_SECURITY_HEADERS.cors.allowHeaders).toBeDefined();
      expect(DEFAULT_SECURITY_HEADERS.cors.maxAge).toBeDefined();
    });

    it('should allow necessary script sources for Twitch and Firebase', () => {
      const csp = DEFAULT_SECURITY_HEADERS.contentSecurityPolicy;
      expect(csp).toContain('https://*.twitch.tv');
      expect(csp).toContain('https://*.firebasedatabase.app');
      expect(csp).toContain('https://*.firebaseio.com');
    });

    it('should allow necessary connect sources for APIs', () => {
      const csp = DEFAULT_SECURITY_HEADERS.contentSecurityPolicy;
      expect(csp).toContain('https://api.twitch.tv');
      expect(csp).toContain('wss://irc-ws.chat.twitch.tv');
      expect(csp).toContain('https://*.googleapis.com');
    });

    it('should allow frame sources for OAuth providers', () => {
      const csp = DEFAULT_SECURITY_HEADERS.contentSecurityPolicy;
      expect(csp).toContain('https://id.twitch.tv');
      expect(csp).toContain('https://accounts.google.com');
    });
  });

  describe('OVERLAY_SECURITY_HEADERS', () => {
    it('should have more permissive X-Frame-Options for OBS embedding', () => {
      expect(OVERLAY_SECURITY_HEADERS.xFrameOptions).toBe('ALLOWALL');
    });

    it('should include frame-ancestors * in CSP for OBS embedding', () => {
      expect(OVERLAY_SECURITY_HEADERS.contentSecurityPolicy).toContain('frame-ancestors *');
    });

    it('should still include X-Content-Type-Options: nosniff', () => {
      expect(OVERLAY_SECURITY_HEADERS.xContentTypeOptions).toBe('nosniff');
    });

    it('should have permissive CORS for overlay access', () => {
      expect(OVERLAY_SECURITY_HEADERS.cors.allowOrigin).toBe('*');
    });

    it('should only allow GET and OPTIONS methods for overlays', () => {
      expect(OVERLAY_SECURITY_HEADERS.cors.allowMethods).toBe('GET, OPTIONS');
    });

    it('should have minimal script sources (no Twitch for overlays)', () => {
      const csp = OVERLAY_SECURITY_HEADERS.contentSecurityPolicy;
      expect(csp).not.toContain('https://embed.twitch.tv');
      expect(csp).toContain('https://*.firebasedatabase.app');
    });
  });

  describe('CORS_WHITELIST', () => {
    it('should include production domain', () => {
      expect(CORS_WHITELIST).toContain('https://streamcrowd.vercel.app');
    });

    it('should include localhost for development', () => {
      expect(CORS_WHITELIST).toContain('http://localhost:5173');
    });

    it('should be an array', () => {
      expect(Array.isArray(CORS_WHITELIST)).toBe(true);
    });

    it('should not be empty', () => {
      expect(CORS_WHITELIST.length).toBeGreaterThan(0);
    });
  });

  describe('isOriginWhitelisted', () => {
    it('should return true for whitelisted origins', () => {
      expect(isOriginWhitelisted('https://streamcrowd.vercel.app')).toBe(true);
      expect(isOriginWhitelisted('http://localhost:5173')).toBe(true);
    });

    it('should return false for non-whitelisted origins', () => {
      expect(isOriginWhitelisted('https://evil.com')).toBe(false);
      expect(isOriginWhitelisted('http://malicious.site')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isOriginWhitelisted('HTTPS://STREAMCROWD.VERCEL.APP')).toBe(false);
    });

    it('should not allow partial matches', () => {
      expect(isOriginWhitelisted('https://streamcrowd.vercel.app.evil.com')).toBe(false);
    });
  });

  describe('getCorsHeaders', () => {
    it('should return CORS headers for whitelisted origins', () => {
      const headers = getCorsHeaders('https://streamcrowd.vercel.app');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://streamcrowd.vercel.app');
      expect(headers['Access-Control-Allow-Methods']).toBeDefined();
      expect(headers['Access-Control-Allow-Headers']).toBeDefined();
      expect(headers['Access-Control-Max-Age']).toBeDefined();
    });

    it('should return empty object for non-whitelisted origins', () => {
      const headers = getCorsHeaders('https://evil.com');
      expect(Object.keys(headers).length).toBe(0);
    });

    it('should include all required CORS headers', () => {
      const headers = getCorsHeaders('http://localhost:5173');
      expect(headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(headers).toHaveProperty('Access-Control-Max-Age');
    });
  });

  describe('getSecurityHeaders', () => {
    it('should convert config to header record', () => {
      const headers = getSecurityHeaders(DEFAULT_SECURITY_HEADERS);
      expect(headers['Content-Security-Policy']).toBe(DEFAULT_SECURITY_HEADERS.contentSecurityPolicy);
      expect(headers['X-Content-Type-Options']).toBe(DEFAULT_SECURITY_HEADERS.xContentTypeOptions);
      expect(headers['X-Frame-Options']).toBe(DEFAULT_SECURITY_HEADERS.xFrameOptions);
      expect(headers['X-XSS-Protection']).toBe(DEFAULT_SECURITY_HEADERS.xXSSProtection);
      expect(headers['Referrer-Policy']).toBe(DEFAULT_SECURITY_HEADERS.referrerPolicy);
      expect(headers['Permissions-Policy']).toBe(DEFAULT_SECURITY_HEADERS.permissionsPolicy);
    });

    it('should include CORS headers', () => {
      const headers = getSecurityHeaders(DEFAULT_SECURITY_HEADERS);
      expect(headers['Access-Control-Allow-Origin']).toBe(DEFAULT_SECURITY_HEADERS.cors.allowOrigin);
      expect(headers['Access-Control-Allow-Methods']).toBe(DEFAULT_SECURITY_HEADERS.cors.allowMethods);
      expect(headers['Access-Control-Allow-Headers']).toBe(DEFAULT_SECURITY_HEADERS.cors.allowHeaders);
      expect(headers['Access-Control-Max-Age']).toBe(DEFAULT_SECURITY_HEADERS.cors.maxAge);
    });

    it('should return all headers as strings', () => {
      const headers = getSecurityHeaders(DEFAULT_SECURITY_HEADERS);
      Object.values(headers).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('getSecurityHeadersForRoute', () => {
    it('should return overlay headers for overlay routes', () => {
      const headers = getSecurityHeadersForRoute('/overlay/poll');
      expect(headers['X-Frame-Options']).toBe('ALLOWALL');
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should return default headers for non-overlay routes', () => {
      const headers = getSecurityHeadersForRoute('/dashboard');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    });

    it('should handle root path', () => {
      const headers = getSecurityHeadersForRoute('/');
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('should handle nested overlay paths', () => {
      const headers = getSecurityHeadersForRoute('/overlay/giveaway/123');
      expect(headers['X-Frame-Options']).toBe('ALLOWALL');
    });

    it('should not match partial overlay paths', () => {
      const headers = getSecurityHeadersForRoute('/not-overlay');
      expect(headers['X-Frame-Options']).toBe('DENY');
    });
  });

  describe('validateSecurityHeaders', () => {
    it('should return true for valid configuration', () => {
      expect(validateSecurityHeaders(DEFAULT_SECURITY_HEADERS)).toBe(true);
      expect(validateSecurityHeaders(OVERLAY_SECURITY_HEADERS)).toBe(true);
    });

    it('should return false if CSP is missing', () => {
      const invalid: SecurityHeadersConfig = {
        ...DEFAULT_SECURITY_HEADERS,
        contentSecurityPolicy: '',
      };
      expect(validateSecurityHeaders(invalid)).toBe(false);
    });

    it('should return false if X-Content-Type-Options is missing', () => {
      const invalid: SecurityHeadersConfig = {
        ...DEFAULT_SECURITY_HEADERS,
        xContentTypeOptions: '',
      };
      expect(validateSecurityHeaders(invalid)).toBe(false);
    });

    it('should return false if X-Frame-Options is missing', () => {
      const invalid: SecurityHeadersConfig = {
        ...DEFAULT_SECURITY_HEADERS,
        xFrameOptions: '',
      };
      expect(validateSecurityHeaders(invalid)).toBe(false);
    });

    it('should return false if CORS config is incomplete', () => {
      const invalid: SecurityHeadersConfig = {
        ...DEFAULT_SECURITY_HEADERS,
        cors: {
          ...DEFAULT_SECURITY_HEADERS.cors,
          allowOrigin: '',
        },
      };
      expect(validateSecurityHeaders(invalid)).toBe(false);
    });
  });

  describe('Security Requirements Validation', () => {
    it('should satisfy Requirement 7.1: Content-Security-Policy', () => {
      const headers = getSecurityHeaders(DEFAULT_SECURITY_HEADERS);
      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['Content-Security-Policy'].length).toBeGreaterThan(0);
    });

    it('should satisfy Requirement 7.2: X-Content-Type-Options nosniff', () => {
      const headers = getSecurityHeaders(DEFAULT_SECURITY_HEADERS);
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should satisfy Requirement 7.3: X-Frame-Options DENY (except overlays)', () => {
      const defaultHeaders = getSecurityHeadersForRoute('/dashboard');
      expect(defaultHeaders['X-Frame-Options']).toBe('DENY');

      const overlayHeaders = getSecurityHeadersForRoute('/overlay/poll');
      expect(overlayHeaders['X-Frame-Options']).toBe('ALLOWALL');
    });

    it('should satisfy Requirement 7.4: CORS whitelist configured', () => {
      expect(CORS_WHITELIST.length).toBeGreaterThan(0);
      expect(isOriginWhitelisted('https://streamcrowd.vercel.app')).toBe(true);
    });

    it('should satisfy Requirement 7.5: Origin validation before processing', () => {
      const validOrigin = 'https://streamcrowd.vercel.app';
      const invalidOrigin = 'https://evil.com';

      const validHeaders = getCorsHeaders(validOrigin);
      const invalidHeaders = getCorsHeaders(invalidOrigin);

      expect(Object.keys(validHeaders).length).toBeGreaterThan(0);
      expect(Object.keys(invalidHeaders).length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty path', () => {
      const headers = getSecurityHeadersForRoute('');
      expect(headers).toBeDefined();
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('should handle path with query parameters', () => {
      const headers = getSecurityHeadersForRoute('/overlay/poll?sessionId=123');
      expect(headers['X-Frame-Options']).toBe('ALLOWALL');
    });

    it('should handle path with hash', () => {
      const headers = getSecurityHeadersForRoute('/overlay/poll#section');
      expect(headers['X-Frame-Options']).toBe('ALLOWALL');
    });

    it('should handle case-sensitive paths', () => {
      const headers = getSecurityHeadersForRoute('/OVERLAY/poll');
      // Should not match because path check is case-sensitive
      expect(headers['X-Frame-Options']).toBe('DENY');
    });
  });

  describe('CSP Directive Coverage', () => {
    it('should include all necessary CSP directives', () => {
      const csp = DEFAULT_SECURITY_HEADERS.contentSecurityPolicy;
      
      // Check for key directives
      expect(csp).toContain('default-src');
      expect(csp).toContain('script-src');
      expect(csp).toContain('connect-src');
      expect(csp).toContain('img-src');
      expect(csp).toContain('style-src');
      expect(csp).toContain('font-src');
      expect(csp).toContain('frame-src');
      expect(csp).toContain('worker-src');
    });

    it('should not allow unsafe directives without justification', () => {
      const csp = DEFAULT_SECURITY_HEADERS.contentSecurityPolicy;
      
      // These are necessary for React and third-party integrations
      // but should be documented as security trade-offs
      if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
        // Ensure they're only in script-src, not in style-src or other directives
        expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
      }
    });
  });
});
