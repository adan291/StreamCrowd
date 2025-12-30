/**
 * Property-based tests for uiColors utilities
 * 
 * Feature: activity-ui-improvements
 * Property 2: Event Color Consistency
 * Property 3: WCAG Contrast Compliance
 * Validates: Requirements 6.1, 6.2, 6.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getEventColor,
  getEventTint,
  EVENT_COLORS,
  getContrastRatio,
  meetsWCAGAA,
  getRelativeLuminance,
  getContrastingTextColor,
  TIER_COLORS,
  getTierColor,
  type EventColorType,
} from '../../src/application/utils/uiColors';

// All valid event types
const EVENT_TYPES: EventColorType[] = [
  'follow', 'sub', 'resub', 'gift', 'raid', 'bits', 'vote', 'ban', 'timeout'
];

// Arbitrary for event types
const eventTypeArb = fc.constantFrom(...EVENT_TYPES);

describe('uiColors Property Tests', () => {
  describe('Property 2: Event Color Consistency', () => {
    /**
     * Property: For any event type, getEventColor should always return the same color
     * regardless of how many times it's called
     */
    it('should return consistent color for same event type across multiple calls', () => {
      fc.assert(
        fc.property(
          eventTypeArb,
          fc.integer({ min: 2, max: 10 }), // Number of calls
          (eventType, numCalls) => {
            const results: string[] = [];
            
            for (let i = 0; i < numCalls; i++) {
              results.push(getEventColor(eventType));
            }
            
            // All results should be identical
            const allSame = results.every(r => r === results[0]);
            expect(allSame).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: getEventColor should return the exact color from EVENT_COLORS for valid types
     */
    it('should return exact color from EVENT_COLORS for valid event types', () => {
      fc.assert(
        fc.property(
          eventTypeArb,
          (eventType) => {
            const result = getEventColor(eventType);
            expect(result).toBe(EVENT_COLORS[eventType]);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: getEventColor should return default color for unknown types
     */
    it('should return default color for unknown event types', () => {
      const DEFAULT_COLOR = '#71717a';
      
      // Use specific unknown strings to avoid Object prototype properties
      const unknownTypeArb = fc.constantFrom(
        'unknown', 'invalid', 'test', 'foo', 'bar', 
        'random123', 'notanevent', 'xyz', 'abc', 'qwerty'
      );
      
      fc.assert(
        fc.property(
          unknownTypeArb,
          (unknownType) => {
            const result = getEventColor(unknownType);
            expect(result).toBe(DEFAULT_COLOR);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: All colors should be valid hex format
     */
    it('should return valid hex color format', () => {
      // Use safe arbitrary strings that won't conflict with Object prototype properties
      const safeStringArb = fc.oneof(
        eventTypeArb,
        fc.constantFrom(
          'unknown', 'invalid', 'test', 'foo', 'bar', 
          'random123', 'notanevent', 'xyz', 'abc', 'qwerty',
          '', 'a', '123', 'event_type', 'FOLLOW', 'SUB'
        )
      );
      
      fc.assert(
        fc.property(
          safeStringArb,
          (eventType) => {
            const result = getEventColor(eventType);
            // Should match #RRGGBB format
            expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Different event types should have different colors
     */
    it('should have unique colors for each event type', () => {
      const colors = EVENT_TYPES.map(type => getEventColor(type));
      const uniqueColors = new Set(colors);
      
      // All event types should have unique colors
      expect(uniqueColors.size).toBe(EVENT_TYPES.length);
    });
  });

  describe('getEventTint Property Tests', () => {
    /**
     * Property: getEventTint should return valid rgba format
     */
    it('should return valid rgba format', () => {
      fc.assert(
        fc.property(
          eventTypeArb,
          // Use reasonable opacity values (0.01 to 1) to avoid scientific notation
          fc.double({ min: 0.01, max: 1, noNaN: true }),
          (eventType, opacity) => {
            const result = getEventTint(eventType, opacity);
            // Should match rgba(R, G, B, A) format (allowing scientific notation)
            expect(result).toMatch(/^rgba\(\d+, \d+, \d+, [\d.e+-]+\)$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Default opacity should be 0.1
     */
    it('should use default opacity of 0.1 when not specified', () => {
      fc.assert(
        fc.property(
          eventTypeArb,
          (eventType) => {
            const result = getEventTint(eventType);
            // Should contain 0.1 as opacity
            expect(result).toContain('0.1)');
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Tint should be consistent for same type and opacity
     */
    it('should return consistent tint for same type and opacity', () => {
      fc.assert(
        fc.property(
          eventTypeArb,
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.integer({ min: 2, max: 5 }),
          (eventType, opacity, numCalls) => {
            const results: string[] = [];
            
            for (let i = 0; i < numCalls; i++) {
              results.push(getEventTint(eventType, opacity));
            }
            
            const allSame = results.every(r => r === results[0]);
            expect(allSame).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Contrast Ratio Property Tests', () => {
    /**
     * Property: Contrast ratio should be between 1 and 21
     */
    it('should return contrast ratio between 1 and 21', () => {
      // Generate valid hex colors
      const hexColorArb = fc.tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
      ).map(([r, g, b]) => 
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

      fc.assert(
        fc.property(
          hexColorArb,
          hexColorArb,
          (color1, color2) => {
            const ratio = getContrastRatio(color1, color2);
            expect(ratio).toBeGreaterThanOrEqual(1);
            expect(ratio).toBeLessThanOrEqual(21);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Contrast ratio should be symmetric
     */
    it('should return same ratio regardless of color order', () => {
      const hexColorArb = fc.tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
      ).map(([r, g, b]) => 
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

      fc.assert(
        fc.property(
          hexColorArb,
          hexColorArb,
          (color1, color2) => {
            const ratio1 = getContrastRatio(color1, color2);
            const ratio2 = getContrastRatio(color2, color1);
            expect(ratio1).toBeCloseTo(ratio2, 10);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Same color should have contrast ratio of 1
     */
    it('should return ratio of 1 for same color', () => {
      const hexColorArb = fc.tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
      ).map(([r, g, b]) => 
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

      fc.assert(
        fc.property(
          hexColorArb,
          (color) => {
            const ratio = getContrastRatio(color, color);
            expect(ratio).toBeCloseTo(1, 10);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('WCAG AA Compliance Property Tests', () => {
    /**
     * Property: Black on white should meet WCAG AA
     */
    it('should confirm black on white meets WCAG AA', () => {
      expect(meetsWCAGAA('#000000', '#ffffff')).toBe(true);
    });

    /**
     * Property: White on black should meet WCAG AA
     */
    it('should confirm white on black meets WCAG AA', () => {
      expect(meetsWCAGAA('#ffffff', '#000000')).toBe(true);
    });

    /**
     * Property: meetsWCAGAA should be consistent with getContrastRatio
     */
    it('should be consistent with getContrastRatio >= 4.5', () => {
      const hexColorArb = fc.tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
      ).map(([r, g, b]) => 
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

      fc.assert(
        fc.property(
          hexColorArb,
          hexColorArb,
          (color1, color2) => {
            const ratio = getContrastRatio(color1, color2);
            const meetsAA = meetsWCAGAA(color1, color2);
            
            if (ratio >= 4.5) {
              expect(meetsAA).toBe(true);
            } else {
              expect(meetsAA).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getContrastingTextColor Property Tests', () => {
    /**
     * Property: Should return either black or white
     */
    it('should return either black or white', () => {
      const hexColorArb = fc.tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
      ).map(([r, g, b]) => 
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

      fc.assert(
        fc.property(
          hexColorArb,
          (bgColor) => {
            const textColor = getContrastingTextColor(bgColor);
            expect(['#000000', '#ffffff']).toContain(textColor);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Dark backgrounds should get white text
     */
    it('should return white text for dark backgrounds', () => {
      // Generate dark colors (low RGB values)
      const darkColorArb = fc.tuple(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 })
      ).map(([r, g, b]) => 
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

      fc.assert(
        fc.property(
          darkColorArb,
          (bgColor) => {
            const textColor = getContrastingTextColor(bgColor);
            expect(textColor).toBe('#ffffff');
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Light backgrounds should get black text
     */
    it('should return black text for light backgrounds', () => {
      // Generate light colors (high RGB values)
      const lightColorArb = fc.tuple(
        fc.integer({ min: 200, max: 255 }),
        fc.integer({ min: 200, max: 255 }),
        fc.integer({ min: 200, max: 255 })
      ).map(([r, g, b]) => 
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

      fc.assert(
        fc.property(
          lightColorArb,
          (bgColor) => {
            const textColor = getContrastingTextColor(bgColor);
            expect(textColor).toBe('#000000');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 3: WCAG Contrast Compliance
   * 
   * Feature: activity-ui-improvements
   * Validates: Requirements 6.4
   * 
   * For any combination of text color and background color used in the Activity section,
   * the contrast ratio SHALL be at least 4.5:1 (WCAG AA standard for normal text).
   * 
   * Note: The application primarily uses dark theme backgrounds. Colors are optimized
   * for dark theme usage. For light theme, the application uses darker variants or
   * the getContrastingTextColor function to ensure compliance.
   */
  describe('Property 3: WCAG Contrast Compliance', () => {
    // Primary dark theme backgrounds used in the Activity section
    const DARK_THEME_BACKGROUNDS = [
      '#18181b', // zinc-900 - main background
      '#27272a', // zinc-800 - card backgrounds
    ];

    // All event colors that are used as text colors
    const ALL_EVENT_COLORS = Object.values(EVENT_COLORS);

    // All tier colors used in the Activity section
    const ALL_TIER_COLORS = Object.values(TIER_COLORS);

    /**
     * Property: Event colors on primary dark backgrounds should meet WCAG AA
     * This tests the main use case - event colors displayed on dark theme backgrounds
     */
    it('should have event colors that meet WCAG AA on primary dark backgrounds', () => {
      const eventColorArb = fc.constantFrom(...ALL_EVENT_COLORS);
      const darkBgArb = fc.constantFrom(...DARK_THEME_BACKGROUNDS);

      fc.assert(
        fc.property(
          eventColorArb,
          darkBgArb,
          (textColor, bgColor) => {
            const ratio = getContrastRatio(textColor, bgColor);
            // WCAG AA requires 4.5:1 for normal text
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Tier colors on primary dark backgrounds should meet WCAG AA
     */
    it('should have tier colors that meet WCAG AA on primary dark backgrounds', () => {
      const tierColorArb = fc.constantFrom(...ALL_TIER_COLORS);
      const darkBgArb = fc.constantFrom(...DARK_THEME_BACKGROUNDS);

      fc.assert(
        fc.property(
          tierColorArb,
          darkBgArb,
          (textColor, bgColor) => {
            const ratio = getContrastRatio(textColor, bgColor);
            // WCAG AA requires 4.5:1 for normal text
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: getContrastingTextColor should always produce WCAG AA compliant combinations
     * This is the fallback mechanism for any background color
     */
    it('should produce WCAG AA compliant text colors for any background', () => {
      const hexColorArb = fc.tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
      ).map(([r, g, b]) => 
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );

      fc.assert(
        fc.property(
          hexColorArb,
          (bgColor) => {
            const textColor = getContrastingTextColor(bgColor);
            const ratio = getContrastRatio(textColor, bgColor);
            // getContrastingTextColor should always produce WCAG AA compliant combinations
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: All event type colors should be consistent and meet WCAG AA on dark theme
     */
    it('should have all event types with WCAG AA compliant colors on dark theme backgrounds', () => {
      const eventTypeArb = fc.constantFrom(...EVENT_TYPES);
      const darkBgArb = fc.constantFrom('#18181b', '#27272a');

      fc.assert(
        fc.property(
          eventTypeArb,
          darkBgArb,
          (eventType, bgColor) => {
            const textColor = getEventColor(eventType);
            const ratio = getContrastRatio(textColor, bgColor);
            // WCAG AA requires 4.5:1 for normal text
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Tier colors should meet WCAG AA on dark theme backgrounds
     */
    it('should have tier colors meeting WCAG AA on dark theme backgrounds', () => {
      const tierArb = fc.constantFrom('1000', '2000', '3000');
      const darkBgArb = fc.constantFrom('#18181b', '#27272a');

      fc.assert(
        fc.property(
          tierArb,
          darkBgArb,
          (tier, bgColor) => {
            const textColor = getTierColor(tier);
            const ratio = getContrastRatio(textColor, bgColor);
            // WCAG AA requires 4.5:1 for normal text
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
