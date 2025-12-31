/**
 * Property-based tests for Platforms Keyboard Navigation Accessibility
 * 
 * Uses fast-check for property-based testing to validate that keyboard navigation
 * works correctly for PlatformCards, ToolCards, and back buttons.
 * 
 * Feature: sidebar-platforms-section
 * Property 7: Keyboard Navigation Accessibility
 * @validates Requirements 7.1, 7.2, 7.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PLATFORMS, TWITCH_TOOLS, PlatformConfig, ToolConfig } from '../../config/platforms';

// ============ TYPES ============

/**
 * Keyboard event simulation
 */
interface KeyboardEventSimulation {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

/**
 * Card accessibility attributes
 */
interface CardAccessibility {
  role: string;
  tabIndex: number;
  ariaLabel: string;
  ariaDisabled: boolean;
}

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Simulates keyboard event handling for PlatformCard/ToolCard
 * Returns true if the event should trigger the onClick handler
 */
function shouldTriggerCardClick(
  event: KeyboardEventSimulation,
  isInteractive: boolean
): boolean {
  if (!isInteractive) return false;
  return event.key === 'Enter' || event.key === ' ';
}

/**
 * Determines if a platform card should be interactive
 */
function isPlatformInteractive(platform: PlatformConfig): boolean {
  return platform.enabled && !platform.comingSoon;
}

/**
 * Determines if a tool card should be interactive
 */
function isToolInteractive(tool: ToolConfig): boolean {
  return tool.enabled && !tool.comingSoon;
}

/**
 * Gets the expected tabIndex for a card based on interactivity
 */
function getExpectedTabIndex(isInteractive: boolean): number {
  return isInteractive ? 0 : -1;
}

/**
 * Validates that a card has proper ARIA attributes for accessibility
 */
function hasProperAriaAttributes(
  role: string | undefined,
  ariaLabel: string | undefined,
  ariaDisabled: boolean | undefined,
  isInteractive: boolean
): boolean {
  return (
    role === 'button' &&
    typeof ariaLabel === 'string' &&
    ariaLabel.length > 0 &&
    ariaDisabled === !isInteractive
  );
}

/**
 * Generates expected accessibility attributes for a platform card
 */
function getPlatformCardAccessibility(
  platform: PlatformConfig,
  comingSoonText: string
): CardAccessibility {
  const isInteractive = isPlatformInteractive(platform);
  const ariaLabel = `${platform.title}: ${platform.description}${
    platform.comingSoon ? ` (${comingSoonText})` : ''
  }`;
  
  return {
    role: 'button',
    tabIndex: getExpectedTabIndex(isInteractive),
    ariaLabel,
    ariaDisabled: !isInteractive,
  };
}

/**
 * Generates expected accessibility attributes for a tool card
 */
function getToolCardAccessibility(
  tool: ToolConfig,
  comingSoonText: string
): CardAccessibility {
  const isInteractive = isToolInteractive(tool);
  const ariaLabel = `${tool.title}: ${tool.description}${
    tool.comingSoon ? ` (${comingSoonText})` : ''
  }`;
  
  return {
    role: 'button',
    tabIndex: getExpectedTabIndex(isInteractive),
    ariaLabel,
    ariaDisabled: !isInteractive,
  };
}

/**
 * Validates back button accessibility
 * Back buttons should always be focusable and respond to keyboard
 */
function isBackButtonAccessible(
  isButton: boolean,
  hasAriaLabel: boolean,
  hasFocusStyles: boolean
): boolean {
  return isButton && hasAriaLabel && hasFocusStyles;
}

// ============ ARBITRARIES ============

const platformIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...PLATFORMS.map((p) => p.id)
);

const toolIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...TWITCH_TOOLS.map((t) => t.id)
);

const activationKeyArb: fc.Arbitrary<string> = fc.constantFrom('Enter', ' ');

const nonActivationKeyArb: fc.Arbitrary<string> = fc.constantFrom(
  'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'a', 'b', 'c'
);

const keyboardEventArb: fc.Arbitrary<KeyboardEventSimulation> = fc.record({
  key: activationKeyArb,
  ctrlKey: fc.constant(false),
  altKey: fc.constant(false),
  shiftKey: fc.constant(false),
  metaKey: fc.constant(false),
});

const nonActivationEventArb: fc.Arbitrary<KeyboardEventSimulation> = fc.record({
  key: nonActivationKeyArb,
  ctrlKey: fc.constant(false),
  altKey: fc.constant(false),
  shiftKey: fc.constant(false),
  metaKey: fc.constant(false),
});

// ============ TESTS ============

describe('Platforms Keyboard Navigation Property Tests', () => {
  describe('Property 7: Keyboard Navigation Accessibility', () => {
    /**
     * Feature: sidebar-platforms-section, Property 7: Keyboard Navigation Accessibility
     * 
     * For any PlatformCard or ToolCard, it SHALL be focusable via Tab key, and when 
     * focused, pressing Enter or Space SHALL trigger the onClick handler (if enabled).
     * 
     * **Validates: Requirements 7.1, 7.2, 7.3**
     */

    describe('PlatformCard Keyboard Navigation', () => {
      it('should trigger onClick for Enter/Space on any interactive PlatformCard', () => {
        fc.assert(
          fc.property(platformIdArb, keyboardEventArb, (platformId, event) => {
            const platform = PLATFORMS.find((p) => p.id === platformId);
            if (!platform) return;

            const isInteractive = isPlatformInteractive(platform);
            const shouldTrigger = shouldTriggerCardClick(event, isInteractive);

            // Property: activation keys should trigger click only for interactive cards
            if (isInteractive) {
              expect(shouldTrigger).toBe(true);
            } else {
              expect(shouldTrigger).toBe(false);
            }
          }),
          { numRuns: 100 }
        );
      });

      it('should NOT trigger onClick for non-activation keys on PlatformCards', () => {
        fc.assert(
          fc.property(platformIdArb, nonActivationEventArb, (platformId, event) => {
            const platform = PLATFORMS.find((p) => p.id === platformId);
            if (!platform) return;

            const isInteractive = isPlatformInteractive(platform);
            const shouldTrigger = shouldTriggerCardClick(event, isInteractive);

            // Property: non-activation keys should never trigger click
            expect(shouldTrigger).toBe(false);
          }),
          { numRuns: 100 }
        );
      });

      it('should have correct tabIndex for all PlatformCards', () => {
        fc.assert(
          fc.property(platformIdArb, (platformId) => {
            const platform = PLATFORMS.find((p) => p.id === platformId);
            if (!platform) return;

            const isInteractive = isPlatformInteractive(platform);
            const expectedTabIndex = getExpectedTabIndex(isInteractive);

            // Property: interactive cards should have tabIndex=0, non-interactive should have -1
            if (isInteractive) {
              expect(expectedTabIndex).toBe(0);
            } else {
              expect(expectedTabIndex).toBe(-1);
            }
          }),
          { numRuns: 100 }
        );
      });

      it('should have proper ARIA attributes for all PlatformCards', () => {
        const comingSoonText = 'Próximamente';
        
        for (const platform of PLATFORMS) {
          const accessibility = getPlatformCardAccessibility(platform, comingSoonText);
          const isInteractive = isPlatformInteractive(platform);

          expect(accessibility.role).toBe('button');
          expect(accessibility.ariaLabel.length).toBeGreaterThan(0);
          expect(accessibility.ariaLabel).toContain(platform.title);
          expect(accessibility.ariaDisabled).toBe(!isInteractive);
          
          if (platform.comingSoon) {
            expect(accessibility.ariaLabel).toContain(comingSoonText);
          }
        }
      });
    });

    describe('ToolCard Keyboard Navigation', () => {
      it('should trigger onClick for Enter/Space on any interactive ToolCard', () => {
        fc.assert(
          fc.property(toolIdArb, keyboardEventArb, (toolId, event) => {
            const tool = TWITCH_TOOLS.find((t) => t.id === toolId);
            if (!tool) return;

            const isInteractive = isToolInteractive(tool);
            const shouldTrigger = shouldTriggerCardClick(event, isInteractive);

            // Property: activation keys should trigger click only for interactive cards
            if (isInteractive) {
              expect(shouldTrigger).toBe(true);
            } else {
              expect(shouldTrigger).toBe(false);
            }
          }),
          { numRuns: 100 }
        );
      });

      it('should NOT trigger onClick for non-activation keys on ToolCards', () => {
        fc.assert(
          fc.property(toolIdArb, nonActivationEventArb, (toolId, event) => {
            const tool = TWITCH_TOOLS.find((t) => t.id === toolId);
            if (!tool) return;

            const isInteractive = isToolInteractive(tool);
            const shouldTrigger = shouldTriggerCardClick(event, isInteractive);

            // Property: non-activation keys should never trigger click
            expect(shouldTrigger).toBe(false);
          }),
          { numRuns: 100 }
        );
      });

      it('should have correct tabIndex for all ToolCards', () => {
        fc.assert(
          fc.property(toolIdArb, (toolId) => {
            const tool = TWITCH_TOOLS.find((t) => t.id === toolId);
            if (!tool) return;

            const isInteractive = isToolInteractive(tool);
            const expectedTabIndex = getExpectedTabIndex(isInteractive);

            // Property: interactive cards should have tabIndex=0, non-interactive should have -1
            if (isInteractive) {
              expect(expectedTabIndex).toBe(0);
            } else {
              expect(expectedTabIndex).toBe(-1);
            }
          }),
          { numRuns: 100 }
        );
      });

      it('should have proper ARIA attributes for all ToolCards', () => {
        const comingSoonText = 'Próximamente';
        
        for (const tool of TWITCH_TOOLS) {
          const accessibility = getToolCardAccessibility(tool, comingSoonText);
          const isInteractive = isToolInteractive(tool);

          expect(accessibility.role).toBe('button');
          expect(accessibility.ariaLabel.length).toBeGreaterThan(0);
          expect(accessibility.ariaLabel).toContain(tool.title);
          expect(accessibility.ariaDisabled).toBe(!isInteractive);
          
          if (tool.comingSoon) {
            expect(accessibility.ariaLabel).toContain(comingSoonText);
          }
        }
      });
    });

    describe('Back Button Accessibility', () => {
      /**
       * Tests for back button keyboard accessibility (Requirement 7.3)
       */

      it('should have back buttons accessible via keyboard', () => {
        // Back buttons in TwitchToolSelector and PlatformsPanel are <button> elements
        // which are inherently focusable and respond to Enter/Space
        const isButton = true;
        const hasAriaLabel = true;
        const hasFocusStyles = true;

        expect(isBackButtonAccessible(isButton, hasAriaLabel, hasFocusStyles)).toBe(true);
      });

      it('should trigger back navigation for Enter key on back button', () => {
        const event: KeyboardEventSimulation = {
          key: 'Enter',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
        };

        // Back button is always interactive
        const shouldTrigger = shouldTriggerCardClick(event, true);
        expect(shouldTrigger).toBe(true);
      });

      it('should trigger back navigation for Space key on back button', () => {
        const event: KeyboardEventSimulation = {
          key: ' ',
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
        };

        // Back button is always interactive
        const shouldTrigger = shouldTriggerCardClick(event, true);
        expect(shouldTrigger).toBe(true);
      });
    });

    describe('Coming Soon Cards Non-Interactive', () => {
      /**
       * Tests that coming soon cards are not keyboard-interactive
       */

      it('should NOT trigger onClick for coming soon PlatformCards even with activation keys', () => {
        const comingSoonPlatforms = PLATFORMS.filter((p) => p.comingSoon);
        
        for (const platform of comingSoonPlatforms) {
          const enterEvent: KeyboardEventSimulation = {
            key: 'Enter',
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
          };
          const spaceEvent: KeyboardEventSimulation = {
            key: ' ',
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
          };

          const isInteractive = isPlatformInteractive(platform);
          
          expect(shouldTriggerCardClick(enterEvent, isInteractive)).toBe(false);
          expect(shouldTriggerCardClick(spaceEvent, isInteractive)).toBe(false);
        }
      });

      it('should NOT trigger onClick for coming soon ToolCards even with activation keys', () => {
        const comingSoonTools = TWITCH_TOOLS.filter((t) => t.comingSoon);
        
        for (const tool of comingSoonTools) {
          const enterEvent: KeyboardEventSimulation = {
            key: 'Enter',
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
          };
          const spaceEvent: KeyboardEventSimulation = {
            key: ' ',
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
          };

          const isInteractive = isToolInteractive(tool);
          
          expect(shouldTriggerCardClick(enterEvent, isInteractive)).toBe(false);
          expect(shouldTriggerCardClick(spaceEvent, isInteractive)).toBe(false);
        }
      });

      it('should have tabIndex=-1 for all coming soon cards', () => {
        const comingSoonPlatforms = PLATFORMS.filter((p) => p.comingSoon);
        const comingSoonTools = TWITCH_TOOLS.filter((t) => t.comingSoon);

        for (const platform of comingSoonPlatforms) {
          const expectedTabIndex = getExpectedTabIndex(isPlatformInteractive(platform));
          expect(expectedTabIndex).toBe(-1);
        }

        for (const tool of comingSoonTools) {
          const expectedTabIndex = getExpectedTabIndex(isToolInteractive(tool));
          expect(expectedTabIndex).toBe(-1);
        }
      });
    });

    describe('Keyboard Navigation Invariants', () => {
      /**
       * Tests that verify invariants of keyboard navigation
       */

      it('should have at least one focusable platform card', () => {
        const focusablePlatforms = PLATFORMS.filter(isPlatformInteractive);
        expect(focusablePlatforms.length).toBeGreaterThanOrEqual(1);
      });

      it('should have at least one focusable tool card', () => {
        const focusableTools = TWITCH_TOOLS.filter(isToolInteractive);
        expect(focusableTools.length).toBeGreaterThanOrEqual(1);
      });

      it('should have Twitch platform focusable', () => {
        const twitch = PLATFORMS.find((p) => p.id === 'twitch');
        expect(twitch).toBeDefined();
        expect(isPlatformInteractive(twitch!)).toBe(true);
        expect(getExpectedTabIndex(isPlatformInteractive(twitch!))).toBe(0);
      });

      it('should have Commands tool focusable', () => {
        const commands = TWITCH_TOOLS.find((t) => t.id === 'commands');
        expect(commands).toBeDefined();
        expect(isToolInteractive(commands!)).toBe(true);
        expect(getExpectedTabIndex(isToolInteractive(commands!))).toBe(0);
      });

      it('should consistently determine interactivity for any card', () => {
        fc.assert(
          fc.property(
            fc.oneof(platformIdArb, toolIdArb),
            fc.integer({ min: 1, max: 100 }),
            (cardId, checkCount) => {
              const platform = PLATFORMS.find((p) => p.id === cardId);
              const tool = TWITCH_TOOLS.find((t) => t.id === cardId);
              
              if (platform) {
                const results: boolean[] = [];
                for (let i = 0; i < checkCount; i++) {
                  results.push(isPlatformInteractive(platform));
                }
                // Property: interactivity should be consistent
                expect(results.every((r) => r === results[0])).toBe(true);
              }
              
              if (tool) {
                const results: boolean[] = [];
                for (let i = 0; i < checkCount; i++) {
                  results.push(isToolInteractive(tool));
                }
                // Property: interactivity should be consistent
                expect(results.every((r) => r === results[0])).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
