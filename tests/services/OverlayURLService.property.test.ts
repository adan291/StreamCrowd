/**
 * Property-based tests for OverlayURLService
 * 
 * Tests the overlay URL generation service for correctness properties:
 * - Property 3: Overlay URL Validity
 * - Property 4: Overlay URL Idempotency
 * 
 * @requirements 2.1, 2.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  OVERLAY_TYPES,
  CHROMA_COLORS,
  generateOverlayURL,
  getOverlayType,
  getOverlaysByCategory,
  isValidOverlayURL,
  getOverlayTypeFromURL,
  type OverlayOptions,
} from '../../src/application/services/OverlayURLService';

describe('OverlayURLService Property Tests', () => {
  // Arbitrary for valid overlay type IDs
  const overlayTypeIdArb = fc.constantFrom(...OVERLAY_TYPES.map(t => t.id));
  
  // Arbitrary for theme options
  const themeArb = fc.constantFrom('light', 'dark', 'transparent') as fc.Arbitrary<'light' | 'dark' | 'transparent'>;
  
  // Arbitrary for background colors
  const bgColorArb = fc.constantFrom(...Object.values(CHROMA_COLORS), undefined);
  
  // Arbitrary for channel names (alphanumeric, 3-25 chars like Twitch)
  const channelArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')),
    { minLength: 3, maxLength: 25 }
  );
  
  // Arbitrary for overlay options
  const overlayOptionsArb: fc.Arbitrary<OverlayOptions> = fc.record({
    theme: fc.option(themeArb, { nil: undefined }),
    bg: fc.option(bgColorArb, { nil: undefined }),
    channel: fc.option(channelArb, { nil: undefined }),
  });

  /**
   * Property 3: Overlay URL Validity
   * For any generated overlay URL, it SHALL be a valid URL with the correct base and parameters.
   * @validates Requirements 2.1, 2.2
   */
  describe('Property 3: Overlay URL Validity', () => {
    it('should generate valid URLs for all overlay types', () => {
      fc.assert(
        fc.property(overlayTypeIdArb, (typeId) => {
          const url = generateOverlayURL(typeId);
          
          // URL should be parseable
          expect(() => new URL(url)).not.toThrow();
          
          // URL should contain the overlay parameter
          const urlObj = new URL(url);
          const overlayType = OVERLAY_TYPES.find(t => t.id === typeId);
          expect(overlayType).toBeDefined();
          expect(urlObj.searchParams.get(overlayType!.urlParam)).toBe('true');
        }),
        { numRuns: 100 }
      );
    });

    it('should generate valid URLs with all option combinations', () => {
      fc.assert(
        fc.property(overlayTypeIdArb, overlayOptionsArb, (typeId, options) => {
          const url = generateOverlayURL(typeId, options);
          
          // URL should be parseable
          expect(() => new URL(url)).not.toThrow();
          
          const urlObj = new URL(url);
          
          // Should have the overlay type parameter
          const overlayType = OVERLAY_TYPES.find(t => t.id === typeId);
          expect(urlObj.searchParams.get(overlayType!.urlParam)).toBe('true');
          
          // If channel is provided, it should be in the URL
          if (options.channel) {
            expect(urlObj.searchParams.get('channel')).toBe(options.channel);
          }
          
          // If bg is provided, it should be in the URL
          if (options.bg) {
            expect(urlObj.searchParams.get('bg')).toBe(options.bg);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should throw for invalid overlay types', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !OVERLAY_TYPES.some(t => t.id === s)),
          (invalidTypeId) => {
            expect(() => generateOverlayURL(invalidTypeId)).toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 4: Overlay URL Idempotency
   * For any overlay type and options, generating the URL multiple times SHALL return identical results.
   * @validates Requirements 2.2
   */
  describe('Property 4: Overlay URL Idempotency', () => {
    it('should generate identical URLs for the same inputs', () => {
      fc.assert(
        fc.property(overlayTypeIdArb, overlayOptionsArb, (typeId, options) => {
          const url1 = generateOverlayURL(typeId, options);
          const url2 = generateOverlayURL(typeId, options);
          const url3 = generateOverlayURL(typeId, options);
          
          expect(url1).toBe(url2);
          expect(url2).toBe(url3);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate different URLs for different overlay types', () => {
      fc.assert(
        fc.property(
          overlayTypeIdArb,
          overlayTypeIdArb.filter(id => id !== 'poll'), // Ensure we can get different types
          (typeId1, typeId2) => {
            fc.pre(typeId1 !== typeId2);
            
            const url1 = generateOverlayURL(typeId1);
            const url2 = generateOverlayURL(typeId2);
            
            expect(url1).not.toBe(url2);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property: URL Validation Consistency
   * isValidOverlayURL should correctly identify generated URLs as valid
   */
  describe('URL Validation Consistency', () => {
    it('should validate all generated URLs as valid', () => {
      fc.assert(
        fc.property(overlayTypeIdArb, overlayOptionsArb, (typeId, options) => {
          const url = generateOverlayURL(typeId, options);
          expect(isValidOverlayURL(url)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid URLs', () => {
      fc.assert(
        fc.property(fc.webUrl(), (randomUrl) => {
          // Random URLs without overlay params should be invalid
          const url = new URL(randomUrl);
          const hasOverlayParam = OVERLAY_TYPES.some(
            t => url.searchParams.get(t.urlParam) === 'true'
          );
          
          if (!hasOverlayParam) {
            expect(isValidOverlayURL(randomUrl)).toBe(false);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property: Type Extraction Roundtrip
   * getOverlayTypeFromURL should correctly extract the type from generated URLs
   */
  describe('Type Extraction Roundtrip', () => {
    it('should extract the correct type from generated URLs', () => {
      fc.assert(
        fc.property(overlayTypeIdArb, overlayOptionsArb, (typeId, options) => {
          const url = generateOverlayURL(typeId, options);
          const extractedType = getOverlayTypeFromURL(url);
          
          expect(extractedType).not.toBeNull();
          expect(extractedType!.id).toBe(typeId);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: getOverlayType Consistency
   * getOverlayType should return the correct type for valid IDs
   */
  describe('getOverlayType Consistency', () => {
    it('should return correct type for all valid IDs', () => {
      fc.assert(
        fc.property(overlayTypeIdArb, (typeId) => {
          const type = getOverlayType(typeId);
          
          expect(type).toBeDefined();
          expect(type!.id).toBe(typeId);
          expect(type!.name).toBeTruthy();
          expect(type!.icon).toBeTruthy();
          expect(type!.urlParam).toBeTruthy();
          expect(type!.defaultSize.width).toBeGreaterThan(0);
          expect(type!.defaultSize.height).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });

    it('should return undefined for invalid IDs', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !OVERLAY_TYPES.some(t => t.id === s)),
          (invalidId) => {
            expect(getOverlayType(invalidId)).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property: Category Grouping Completeness
   * getOverlaysByCategory should include all overlay types
   */
  describe('Category Grouping Completeness', () => {
    it('should include all overlay types in categories', () => {
      const categories = getOverlaysByCategory();
      const allTypesInCategories = Object.values(categories).flat();
      
      // All types should be present
      for (const type of OVERLAY_TYPES) {
        expect(allTypesInCategories.some(t => t.id === type.id)).toBe(true);
      }
      
      // No duplicates
      const ids = allTypesInCategories.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  /**
   * Property: OVERLAY_TYPES Invariants
   * All overlay types should have required properties
   */
  describe('OVERLAY_TYPES Invariants', () => {
    it('should have unique IDs', () => {
      const ids = OVERLAY_TYPES.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique urlParams', () => {
      const urlParams = OVERLAY_TYPES.map(t => t.urlParam);
      expect(new Set(urlParams).size).toBe(urlParams.length);
    });

    it('should have valid default sizes', () => {
      for (const type of OVERLAY_TYPES) {
        expect(type.defaultSize.width).toBeGreaterThan(0);
        expect(type.defaultSize.height).toBeGreaterThan(0);
        expect(type.defaultSize.width).toBeLessThanOrEqual(1920);
        expect(type.defaultSize.height).toBeLessThanOrEqual(1080);
      }
    });

    it('should have non-empty names and descriptions', () => {
      for (const type of OVERLAY_TYPES) {
        expect(type.name.length).toBeGreaterThan(0);
        expect(type.description.length).toBeGreaterThan(0);
        expect(type.icon.length).toBeGreaterThan(0);
      }
    });
  });
});
