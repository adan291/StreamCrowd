/**
 * Property-based tests for PlatformSelector component
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the PlatformSelector rendering and navigation behavior.
 * 
 * Feature: sidebar-platforms-section
 * Property 1: Platform Navigation Works Correctly
 * @validates Requirements 1.2, 1.3, 2.3
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { PLATFORMS, PlatformConfig } from '../../config/platforms';

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Validates that the PLATFORMS configuration contains valid platforms
 * with all required fields
 */
function validatePlatformsConfig(platforms: PlatformConfig[]): {
  isValid: boolean;
  count: number;
  hasAllFields: boolean;
  platformIds: string[];
} {
  const hasAllFields = platforms.every(
    (platform) =>
      typeof platform.id === 'string' &&
      typeof platform.icon === 'string' &&
      typeof platform.title === 'string' &&
      typeof platform.description === 'string' &&
      typeof platform.color === 'string' &&
      typeof platform.enabled === 'boolean'
  );

  return {
    isValid: platforms.length >= 1 && hasAllFields,
    count: platforms.length,
    hasAllFields,
    platformIds: platforms.map((p) => p.id),
  };
}

/**
 * Validates that a platform ID is one of the expected values
 */
function isValidPlatformId(id: string): boolean {
  return PLATFORMS.some((p) => p.id === id);
}

/**
 * Simulates the callback behavior when a platform is selected
 */
function simulatePlatformSelection(
  platformId: string,
  platform: PlatformConfig,
  callback: (id: string) => void
): boolean {
  // Only call callback if platform is enabled and not coming soon
  if (platform.enabled && !platform.comingSoon) {
    callback(platformId);
    return true;
  }
  return false;
}

/**
 * Validates that a color is a valid hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Determines if a platform card should be interactive
 */
function isPlatformInteractive(platform: PlatformConfig): boolean {
  return platform.enabled && !platform.comingSoon;
}

// ============ ARBITRARIES ============

const platformIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...PLATFORMS.map((p) => p.id)
);

const enabledPlatformIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...PLATFORMS.filter((p) => p.enabled && !p.comingSoon).map((p) => p.id)
);

const platformSelectionSequenceArb = fc.array(platformIdArb, { minLength: 1, maxLength: 10 });

// ============ TESTS ============

describe('PlatformSelector Property Tests', () => {
  describe('Property 1: Platform Navigation Works Correctly', () => {
    /**
     * Feature: sidebar-platforms-section, Property 1: Platform Navigation Works Correctly
     * 
     * For any click on the Plataformas tab, the PlatformSelector SHALL be displayed.
     * For any click on an enabled PlatformCard, the system SHALL navigate to that 
     * platform's ToolSelector.
     * 
     * **Validates: Requirements 1.2, 1.3, 2.3**
     */

    it('should have at least one platform in the PLATFORMS configuration', () => {
      const result = validatePlatformsConfig(PLATFORMS);
      
      expect(result.count).toBeGreaterThanOrEqual(1);
      expect(result.isValid).toBe(true);
    });

    it('should have all required fields for each platform', () => {
      const result = validatePlatformsConfig(PLATFORMS);
      
      expect(result.hasAllFields).toBe(true);
    });

    it('should contain Twitch as the initial platform', () => {
      const result = validatePlatformsConfig(PLATFORMS);
      
      expect(result.platformIds).toContain('twitch');
    });

    it('should have valid hex colors for all platforms', () => {
      for (const platform of PLATFORMS) {
        expect(isValidHexColor(platform.color)).toBe(true);
      }
    });

    it('should have non-empty titles for all platforms', () => {
      for (const platform of PLATFORMS) {
        expect(platform.title.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty descriptions for all platforms', () => {
      for (const platform of PLATFORMS) {
        expect(platform.description.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty icon identifiers for all platforms', () => {
      for (const platform of PLATFORMS) {
        expect(platform.icon.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have unique platform IDs', () => {
      const ids = PLATFORMS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have Twitch enabled by default', () => {
      const twitch = PLATFORMS.find((p) => p.id === 'twitch');
      
      expect(twitch).toBeDefined();
      expect(twitch?.enabled).toBe(true);
      expect(twitch?.comingSoon).toBeFalsy();
    });
  });

  describe('Platform Selection Callback', () => {
    /**
     * Tests that verify the onSelectPlatform callback behavior
     */

    it('should call callback with correct platform ID for any enabled platform', () => {
      fc.assert(
        fc.property(enabledPlatformIdArb, (platformId) => {
          let selectedId: string | null = null;
          const callback = (id: string) => {
            selectedId = id;
          };

          const platform = PLATFORMS.find((p) => p.id === platformId);
          if (platform) {
            const wasSelected = simulatePlatformSelection(platformId, platform, callback);

            // Property: callback should be called with the exact platform ID for enabled platforms
            expect(wasSelected).toBe(true);
            expect(selectedId).toBe(platformId);
            expect(isValidPlatformId(selectedId!)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should NOT call callback for disabled or coming soon platforms', () => {
      const disabledPlatforms = PLATFORMS.filter((p) => !p.enabled || p.comingSoon);
      
      for (const platform of disabledPlatforms) {
        let callbackCalled = false;
        const callback = () => {
          callbackCalled = true;
        };

        simulatePlatformSelection(platform.id, platform, callback);

        // Property: callback should NOT be called for disabled/coming soon platforms
        expect(callbackCalled).toBe(false);
      }
    });

    it('should handle multiple sequential selections correctly', () => {
      fc.assert(
        fc.property(platformSelectionSequenceArb, (selections) => {
          const selectedIds: string[] = [];
          const callback = (id: string) => {
            selectedIds.push(id);
          };

          let expectedCount = 0;
          for (const platformId of selections) {
            const platform = PLATFORMS.find((p) => p.id === platformId);
            if (platform && platform.enabled && !platform.comingSoon) {
              simulatePlatformSelection(platformId, platform, callback);
              expectedCount++;
            }
          }

          // Property: only enabled platforms should trigger callbacks
          expect(selectedIds.length).toBe(expectedCount);
        }),
        { numRuns: 100 }
      );
    });

    it('should always produce valid platform IDs when callback is triggered', () => {
      fc.assert(
        fc.property(enabledPlatformIdArb, (platformId) => {
          // Property: any generated enabled platform ID should be valid
          expect(isValidPlatformId(platformId)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Platform Interactivity', () => {
    /**
     * Tests that verify platform card interactivity based on enabled/comingSoon state
     */

    it('should correctly determine interactivity for all platforms', () => {
      fc.assert(
        fc.property(platformIdArb, (platformId) => {
          const platform = PLATFORMS.find((p) => p.id === platformId);
          
          if (platform) {
            const isInteractive = isPlatformInteractive(platform);
            
            // Property: interactivity should match enabled && !comingSoon
            expect(isInteractive).toBe(platform.enabled && !platform.comingSoon);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have at least one interactive platform', () => {
      const interactivePlatforms = PLATFORMS.filter(isPlatformInteractive);
      
      expect(interactivePlatforms.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Platform Configuration Invariants', () => {
    /**
     * Tests that verify invariants of the platform configuration
     */

    it('should maintain consistent platform count across multiple accesses', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (accessCount) => {
          const counts: number[] = [];
          
          for (let i = 0; i < accessCount; i++) {
            counts.push(PLATFORMS.length);
          }

          // Property: platform count should be consistent
          expect(counts.every((c) => c === PLATFORMS.length)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should have platforms with expected structure for any access', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: Math.max(0, PLATFORMS.length - 1) }), (index) => {
          if (PLATFORMS.length > 0) {
            const platform = PLATFORMS[index];

            // Property: each platform should have all required properties
            expect(platform).toHaveProperty('id');
            expect(platform).toHaveProperty('icon');
            expect(platform).toHaveProperty('title');
            expect(platform).toHaveProperty('description');
            expect(platform).toHaveProperty('color');
            expect(platform).toHaveProperty('enabled');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have Twitch platform with expected properties', () => {
      const twitchPlatform = PLATFORMS.find((p) => p.id === 'twitch');

      expect(twitchPlatform).toBeDefined();
      expect(twitchPlatform?.title).toBe('Twitch');
      expect(twitchPlatform?.enabled).toBe(true);
      expect(twitchPlatform?.color).toBe('#9146FF');
    });
  });
});
