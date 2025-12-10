/**
 * Property-based tests for useOverlay hook
 * Uses fast-check for property-based testing
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { detectOverlayMode, getChannelFromUrl, getPollConfigFromUrl, DEFAULT_OVERLAY_SETTINGS } from '../../hooks/useOverlay';

describe('useOverlay Property Tests', () => {
  // Store original window.location
  let originalLocation: Location;

  beforeEach(() => {
    // Save original location
    originalLocation = window.location;
  });

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  /**
   * Helper to mock window.location.search
   */
  function mockLocationSearch(search: string) {
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search,
        href: `http://localhost${search}`,
      },
      writable: true,
    });
  }

  /**
   * **Feature: app-refactoring, Property 9: useOverlay URL Detection**
   * 
   * *For any* URL containing overlay=true parameter, the hook should
   * initialize with isOverlayMode=true.
   * 
   * **Validates: Requirements 3.2, 3.4**
   */
  describe('Property 9: useOverlay URL Detection', () => {
    it('should detect overlay mode when overlay=true is present in URL', () => {
      fc.assert(
        fc.property(
          // Generate random additional query params
          fc.array(
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'overlay' && /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
              fc.string({ minLength: 0, maxLength: 50 }).map(s => encodeURIComponent(s))
            ),
            { minLength: 0, maxLength: 5 }
          ),
          (additionalParams) => {
            // Build URL with overlay=true and additional random params
            const params = new URLSearchParams();
            params.set('overlay', 'true');
            
            for (const [key, value] of additionalParams) {
              params.set(key, value);
            }
            
            mockLocationSearch(`?${params.toString()}`);
            
            // detectOverlayMode should return true
            const result = detectOverlayMode();
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not detect overlay mode when overlay=true is absent', () => {
      fc.assert(
        fc.property(
          // Generate random query params that don't include overlay=true
          fc.array(
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'overlay' && /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
              fc.string({ minLength: 0, maxLength: 50 }).map(s => encodeURIComponent(s))
            ),
            { minLength: 0, maxLength: 5 }
          ),
          (params) => {
            const urlParams = new URLSearchParams();
            
            for (const [key, value] of params) {
              urlParams.set(key, value);
            }
            
            const search = urlParams.toString() ? `?${urlParams.toString()}` : '';
            mockLocationSearch(search);
            
            // detectOverlayMode should return false
            const result = detectOverlayMode();
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not detect overlay mode when overlay has value other than true', () => {
      fc.assert(
        fc.property(
          // Generate values that are not exactly 'true'
          fc.string({ minLength: 0, maxLength: 20 }).filter(s => s !== 'true'),
          (overlayValue) => {
            const params = new URLSearchParams();
            params.set('overlay', overlayValue);
            
            mockLocationSearch(`?${params.toString()}`);
            
            // detectOverlayMode should return false for non-'true' values
            const result = detectOverlayMode();
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect overlay mode regardless of parameter order', () => {
      fc.assert(
        fc.property(
          // Generate random params to place before and after overlay=true
          fc.array(
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'overlay' && /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
              fc.string({ minLength: 0, maxLength: 50 }).map(s => encodeURIComponent(s))
            ),
            { minLength: 1, maxLength: 3 }
          ),
          fc.array(
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'overlay' && /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
              fc.string({ minLength: 0, maxLength: 50 }).map(s => encodeURIComponent(s))
            ),
            { minLength: 1, maxLength: 3 }
          ),
          (beforeParams, afterParams) => {
            // Build URL with params before overlay=true, then overlay=true, then params after
            const parts: string[] = [];
            
            for (const [key, value] of beforeParams) {
              parts.push(`${key}=${value}`);
            }
            parts.push('overlay=true');
            for (const [key, value] of afterParams) {
              parts.push(`${key}=${value}`);
            }
            
            mockLocationSearch(`?${parts.join('&')}`);
            
            // detectOverlayMode should return true regardless of position
            const result = detectOverlayMode();
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract channel from URL when present', () => {
      fc.assert(
        fc.property(
          // Generate valid channel names (alphanumeric, underscores)
          fc.string({ minLength: 1, maxLength: 25 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          (channelName) => {
            const params = new URLSearchParams();
            params.set('overlay', 'true');
            params.set('channel', channelName);
            
            mockLocationSearch(`?${params.toString()}`);
            
            const result = getChannelFromUrl();
            expect(result).toBe(channelName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for channel when not present in URL', () => {
      fc.assert(
        fc.property(
          // Generate random params without channel
          fc.array(
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'channel' && /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
              fc.string({ minLength: 0, maxLength: 50 }).map(s => encodeURIComponent(s))
            ),
            { minLength: 0, maxLength: 5 }
          ),
          (params) => {
            const urlParams = new URLSearchParams();
            urlParams.set('overlay', 'true');
            
            for (const [key, value] of params) {
              urlParams.set(key, value);
            }
            
            mockLocationSearch(`?${urlParams.toString()}`);
            
            const result = getChannelFromUrl();
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract poll config from URL when question and options are present', () => {
      fc.assert(
        fc.property(
          // Generate poll question
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes(',') && s.trim().length > 0),
          // Generate at least 2 options
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(',') && s.trim().length > 0),
            { minLength: 2, maxLength: 6 }
          ),
          (question, options) => {
            const params = new URLSearchParams();
            params.set('overlay', 'true');
            params.set('poll', encodeURIComponent(question));
            params.set('options', options.map(o => encodeURIComponent(o)).join(','));
            
            mockLocationSearch(`?${params.toString()}`);
            
            const result = getPollConfigFromUrl();
            expect(result).not.toBeNull();
            expect(result!.question).toBe(question);
            expect(result!.options).toHaveLength(options.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for poll config when less than 2 options', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0 && !s.includes(',')),
          // Generate 0 or 1 option (without commas since commas are delimiters)
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes(',')),
            { minLength: 0, maxLength: 1 }
          ),
          (question, options) => {
            const params = new URLSearchParams();
            params.set('overlay', 'true');
            params.set('poll', encodeURIComponent(question));
            if (options.length > 0) {
              params.set('options', options.join(','));
            }
            
            mockLocationSearch(`?${params.toString()}`);
            
            const result = getPollConfigFromUrl();
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for poll config when poll question is missing', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            { minLength: 2, maxLength: 6 }
          ),
          (options) => {
            const params = new URLSearchParams();
            params.set('overlay', 'true');
            // No poll question, only options
            params.set('options', options.join(','));
            
            mockLocationSearch(`?${params.toString()}`);
            
            const result = getPollConfigFromUrl();
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Default Settings', () => {
    it('should have valid default overlay settings', () => {
      // Verify default settings structure
      expect(DEFAULT_OVERLAY_SETTINGS).toHaveProperty('bgColor');
      expect(DEFAULT_OVERLAY_SETTINGS).toHaveProperty('textColor');
      expect(DEFAULT_OVERLAY_SETTINGS).toHaveProperty('borderColor');
      expect(DEFAULT_OVERLAY_SETTINGS).toHaveProperty('showBorders');
      expect(DEFAULT_OVERLAY_SETTINGS).toHaveProperty('fontSize');
      expect(DEFAULT_OVERLAY_SETTINGS).toHaveProperty('fontStyle');
      expect(DEFAULT_OVERLAY_SETTINGS).toHaveProperty('theme');
      
      // Verify types
      expect(typeof DEFAULT_OVERLAY_SETTINGS.bgColor).toBe('string');
      expect(typeof DEFAULT_OVERLAY_SETTINGS.textColor).toBe('string');
      expect(typeof DEFAULT_OVERLAY_SETTINGS.borderColor).toBe('string');
      expect(typeof DEFAULT_OVERLAY_SETTINGS.showBorders).toBe('boolean');
      expect(['small', 'medium', 'large']).toContain(DEFAULT_OVERLAY_SETTINGS.fontSize);
      expect(['normal', 'bold', 'italic']).toContain(DEFAULT_OVERLAY_SETTINGS.fontStyle);
      expect(['dark', 'light']).toContain(DEFAULT_OVERLAY_SETTINGS.theme);
    });
  });
});
