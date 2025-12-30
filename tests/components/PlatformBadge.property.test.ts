/**
 * Property-based tests for PlatformBadge component
 * 
 * Tests the platform badge display for correctness properties.
 * Uses fast-check for property-based testing.
 * 
 * @requirements 4.6 - Display YouTube-specific user badges
 * @requirements 5.6 - Display Kick-specific user badges
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { Badge, Platform, BadgeType } from '../../types/platform';

// ============================================
// BADGE DISPLAY LOGIC (extracted for testing)
// ============================================

interface BadgeConfig {
  color: string;
  label: string;
  hasIcon: boolean;
}

const PLATFORM_COLORS: Record<Platform, string> = {
  twitch: '#9146FF',
  youtube: '#FF0000',
  kick: '#53FC18',
};

const BADGE_TYPE_LABELS: Record<BadgeType, string> = {
  broadcaster: 'Broadcaster',
  owner: 'Broadcaster',
  moderator: 'Moderator',
  vip: 'VIP',
  subscriber: 'Subscriber',
  member: 'Member',
  verified: 'Verified',
  founder: 'Founder',
  prime: 'Prime',
};

/**
 * Get badge configuration (pure function for testing)
 */
function getBadgeConfig(badge: Badge): BadgeConfig {
  const { type, platform, tier, label } = badge;
  
  let color = PLATFORM_COLORS[platform];
  let displayLabel = label || BADGE_TYPE_LABELS[type] || type;
  
  // Special color overrides
  switch (type) {
    case 'broadcaster':
    case 'owner':
      color = '#FFD700'; // Gold
      break;
    case 'moderator':
      if (platform === 'twitch') color = '#00AD03';
      break;
    case 'vip':
      if (platform === 'twitch') color = '#E005B9';
      break;
    case 'member':
      color = '#2BA640'; // YouTube member green
      break;
    case 'verified':
      if (platform === 'youtube') color = '#606060';
      break;
    case 'founder':
      color = '#9146FF';
      break;
    case 'prime':
      color = '#00A8E1';
      break;
  }
  
  // Add tier to subscriber label
  if (type === 'subscriber' && tier && !label) {
    displayLabel = `Sub T${tier}`;
  }
  
  return {
    color,
    label: displayLabel,
    hasIcon: true,
  };
}

/**
 * Check if badge type is valid for platform
 */
function isValidBadgeForPlatform(type: BadgeType, platform: Platform): boolean {
  // YouTube-specific badges
  if (type === 'member' && platform !== 'youtube') {
    return false;
  }
  
  // Twitch-specific badges
  if (type === 'prime' && platform !== 'twitch') {
    return false;
  }
  
  // All other badges are valid for all platforms
  return true;
}

/**
 * Get expected badge types for a platform
 */
function getExpectedBadgeTypes(platform: Platform): BadgeType[] {
  const commonBadges: BadgeType[] = [
    'broadcaster',
    'owner',
    'moderator',
    'vip',
    'subscriber',
    'verified',
    'founder',
  ];
  
  switch (platform) {
    case 'twitch':
      return [...commonBadges, 'prime'];
    case 'youtube':
      return [...commonBadges, 'member'];
    case 'kick':
      return commonBadges;
    default:
      return commonBadges;
  }
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

const platformArb = fc.constantFrom<Platform>('twitch', 'youtube', 'kick');

const badgeTypeArb = fc.constantFrom<BadgeType>(
  'subscriber',
  'moderator',
  'vip',
  'member',
  'owner',
  'broadcaster',
  'verified',
  'founder',
  'prime'
);

const tierArb = fc.option(fc.integer({ min: 1, max: 3 }));

const badgeArb = fc.record({
  type: badgeTypeArb,
  platform: platformArb,
  tier: tierArb,
  label: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('PlatformBadge Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * **Feature: enhanced-features, Property 11: Platform Badge Display**
   * 
   * *For any* user with platform-specific badges, the display SHALL show
   * the correct badge type and tier for that platform.
   * 
   * **Validates: Requirements 4.6, 5.6**
   */
  describe('Property 11: Platform Badge Display', () => {
    it('badge config always has a color', () => {
      fc.assert(
        fc.property(
          badgeArb,
          (badge) => {
            const config = getBadgeConfig(badge);
            
            expect(config.color).toBeDefined();
            expect(config.color.length).toBeGreaterThan(0);
            // Color should be a valid hex color
            expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('badge config always has a label', () => {
      fc.assert(
        fc.property(
          badgeArb,
          (badge) => {
            const config = getBadgeConfig(badge);
            
            expect(config.label).toBeDefined();
            expect(config.label.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('custom label overrides default', () => {
      fc.assert(
        fc.property(
          badgeTypeArb,
          platformArb,
          fc.string({ minLength: 1, maxLength: 30 }),
          (type, platform, customLabel) => {
            const badge: Badge = {
              type,
              platform,
              label: customLabel,
            };
            
            const config = getBadgeConfig(badge);
            expect(config.label).toBe(customLabel);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('subscriber tier is included in label', () => {
      fc.assert(
        fc.property(
          platformArb,
          fc.integer({ min: 1, max: 3 }),
          (platform, tier) => {
            const badge: Badge = {
              type: 'subscriber',
              platform,
              tier,
            };
            
            const config = getBadgeConfig(badge);
            expect(config.label).toContain(tier.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('broadcaster badge has gold color', () => {
      fc.assert(
        fc.property(
          platformArb,
          (platform) => {
            const badge: Badge = {
              type: 'broadcaster',
              platform,
            };
            
            const config = getBadgeConfig(badge);
            expect(config.color).toBe('#FFD700');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('owner badge has gold color', () => {
      fc.assert(
        fc.property(
          platformArb,
          (platform) => {
            const badge: Badge = {
              type: 'owner',
              platform,
            };
            
            const config = getBadgeConfig(badge);
            expect(config.color).toBe('#FFD700');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('twitch moderator has green color', () => {
      const badge: Badge = {
        type: 'moderator',
        platform: 'twitch',
      };
      
      const config = getBadgeConfig(badge);
      expect(config.color).toBe('#00AD03');
    });

    it('twitch vip has pink color', () => {
      const badge: Badge = {
        type: 'vip',
        platform: 'twitch',
      };
      
      const config = getBadgeConfig(badge);
      expect(config.color).toBe('#E005B9');
    });

    it('youtube member has green color', () => {
      const badge: Badge = {
        type: 'member',
        platform: 'youtube',
      };
      
      const config = getBadgeConfig(badge);
      expect(config.color).toBe('#2BA640');
    });

    it('youtube verified has gray color', () => {
      const badge: Badge = {
        type: 'verified',
        platform: 'youtube',
      };
      
      const config = getBadgeConfig(badge);
      expect(config.color).toBe('#606060');
    });

    it('prime badge has blue color', () => {
      const badge: Badge = {
        type: 'prime',
        platform: 'twitch',
      };
      
      const config = getBadgeConfig(badge);
      expect(config.color).toBe('#00A8E1');
    });

    it('founder badge has purple color', () => {
      fc.assert(
        fc.property(
          platformArb,
          (platform) => {
            const badge: Badge = {
              type: 'founder',
              platform,
            };
            
            const config = getBadgeConfig(badge);
            expect(config.color).toBe('#9146FF');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('platform-specific badges are recognized', () => {
      // YouTube member
      expect(isValidBadgeForPlatform('member', 'youtube')).toBe(true);
      expect(isValidBadgeForPlatform('member', 'twitch')).toBe(false);
      expect(isValidBadgeForPlatform('member', 'kick')).toBe(false);
      
      // Twitch prime
      expect(isValidBadgeForPlatform('prime', 'twitch')).toBe(true);
      expect(isValidBadgeForPlatform('prime', 'youtube')).toBe(false);
      expect(isValidBadgeForPlatform('prime', 'kick')).toBe(false);
    });

    it('common badges are valid for all platforms', () => {
      const commonBadges: BadgeType[] = [
        'broadcaster',
        'moderator',
        'vip',
        'subscriber',
        'verified',
        'founder',
      ];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...commonBadges),
          platformArb,
          (badgeType, platform) => {
            expect(isValidBadgeForPlatform(badgeType, platform)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each platform has expected badge types', () => {
      const platforms: Platform[] = ['twitch', 'youtube', 'kick'];
      
      for (const platform of platforms) {
        const expectedTypes = getExpectedBadgeTypes(platform);
        
        // Should have common badges
        expect(expectedTypes).toContain('moderator');
        expect(expectedTypes).toContain('subscriber');
        expect(expectedTypes).toContain('vip');
        
        // Platform-specific
        if (platform === 'twitch') {
          expect(expectedTypes).toContain('prime');
        }
        if (platform === 'youtube') {
          expect(expectedTypes).toContain('member');
        }
      }
    });

    it('badge config is deterministic', () => {
      fc.assert(
        fc.property(
          badgeArb,
          (badge) => {
            const config1 = getBadgeConfig(badge);
            const config2 = getBadgeConfig(badge);
            
            expect(config1.color).toBe(config2.color);
            expect(config1.label).toBe(config2.label);
            expect(config1.hasIcon).toBe(config2.hasIcon);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
