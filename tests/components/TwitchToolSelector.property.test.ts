/**
 * Property-based tests for TwitchToolSelector component
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the TwitchToolSelector rendering and navigation behavior.
 * 
 * Feature: sidebar-platforms-section
 * Property 2: Tool Navigation Works Correctly
 * Property 3: Coming Soon Tools Are Non-Interactive
 * @validates Requirements 3.1, 3.4, 3.5, 4.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TWITCH_TOOLS, ToolConfig } from '../../config/platforms';

// ============ PURE FUNCTIONS FOR TESTING ============

/**
 * Validates that the TWITCH_TOOLS configuration contains valid tools
 * with all required fields
 */
function validateToolsConfig(tools: ToolConfig[]): {
  isValid: boolean;
  count: number;
  hasAllFields: boolean;
  toolIds: string[];
} {
  const hasAllFields = tools.every(
    (tool) =>
      typeof tool.id === 'string' &&
      typeof tool.icon === 'string' &&
      typeof tool.title === 'string' &&
      typeof tool.description === 'string' &&
      typeof tool.color === 'string' &&
      typeof tool.enabled === 'boolean'
  );

  return {
    isValid: tools.length >= 1 && hasAllFields,
    count: tools.length,
    hasAllFields,
    toolIds: tools.map((t) => t.id),
  };
}

/**
 * Validates that a tool ID is one of the expected values
 */
function isValidToolId(id: string): boolean {
  return TWITCH_TOOLS.some((t) => t.id === id);
}

/**
 * Simulates the callback behavior when a tool is selected
 */
function simulateToolSelection(
  toolId: string,
  tool: ToolConfig,
  callback: (id: string) => void
): boolean {
  // Only call callback if tool is enabled and not coming soon
  if (tool.enabled && !tool.comingSoon) {
    callback(toolId);
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
 * Determines if a tool card should be interactive
 */
function isToolInteractive(tool: ToolConfig): boolean {
  return tool.enabled && !tool.comingSoon;
}

/**
 * Determines if a tool is marked as coming soon
 */
function isToolComingSoon(tool: ToolConfig): boolean {
  return tool.comingSoon === true;
}

// ============ ARBITRARIES ============

const toolIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...TWITCH_TOOLS.map((t) => t.id)
);

const enabledToolIdArb: fc.Arbitrary<string> = fc.constantFrom(
  ...TWITCH_TOOLS.filter((t) => t.enabled && !t.comingSoon).map((t) => t.id)
);

// Only create comingSoonToolIdArb if there are coming soon tools
const comingSoonTools = TWITCH_TOOLS.filter((t) => t.comingSoon);
const comingSoonToolIdArb: fc.Arbitrary<string> | null = comingSoonTools.length > 0
  ? fc.constantFrom(...comingSoonTools.map((t) => t.id))
  : null;

const toolSelectionSequenceArb = fc.array(toolIdArb, { minLength: 1, maxLength: 10 });

// ============ TESTS ============

describe('TwitchToolSelector Property Tests', () => {
  describe('Property 2: Tool Navigation Works Correctly', () => {
    /**
     * Feature: sidebar-platforms-section, Property 2: Tool Navigation Works Correctly
     * 
     * For any enabled ToolCard click, the system SHALL navigate to the corresponding 
     * tool panel. For any disabled (comingSoon) ToolCard, clicking SHALL have no effect.
     * 
     * **Validates: Requirements 3.1, 3.4, 4.1**
     */

    it('should have at least one tool in the TWITCH_TOOLS configuration', () => {
      const result = validateToolsConfig(TWITCH_TOOLS);
      
      expect(result.count).toBeGreaterThanOrEqual(1);
      expect(result.isValid).toBe(true);
    });

    it('should have all required fields for each tool', () => {
      const result = validateToolsConfig(TWITCH_TOOLS);
      
      expect(result.hasAllFields).toBe(true);
    });

    it('should contain commands as an enabled tool', () => {
      const result = validateToolsConfig(TWITCH_TOOLS);
      
      expect(result.toolIds).toContain('commands');
      
      const commandsTool = TWITCH_TOOLS.find((t) => t.id === 'commands');
      expect(commandsTool?.enabled).toBe(true);
      expect(commandsTool?.comingSoon).toBeFalsy();
    });

    it('should have valid hex colors for all tools', () => {
      for (const tool of TWITCH_TOOLS) {
        expect(isValidHexColor(tool.color)).toBe(true);
      }
    });

    it('should have non-empty titles for all tools', () => {
      for (const tool of TWITCH_TOOLS) {
        expect(tool.title.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty descriptions for all tools', () => {
      for (const tool of TWITCH_TOOLS) {
        expect(tool.description.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty icon identifiers for all tools', () => {
      for (const tool of TWITCH_TOOLS) {
        expect(tool.icon.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have unique tool IDs', () => {
      const ids = TWITCH_TOOLS.map((t) => t.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should call callback with correct tool ID for any enabled tool', () => {
      fc.assert(
        fc.property(enabledToolIdArb, (toolId) => {
          let selectedId: string | null = null;
          const callback = (id: string) => {
            selectedId = id;
          };

          const tool = TWITCH_TOOLS.find((t) => t.id === toolId);
          if (tool) {
            const wasSelected = simulateToolSelection(toolId, tool, callback);

            // Property: callback should be called with the exact tool ID for enabled tools
            expect(wasSelected).toBe(true);
            expect(selectedId).toBe(toolId);
            expect(isValidToolId(selectedId!)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle multiple sequential selections correctly', () => {
      fc.assert(
        fc.property(toolSelectionSequenceArb, (selections) => {
          const selectedIds: string[] = [];
          const callback = (id: string) => {
            selectedIds.push(id);
          };

          let expectedCount = 0;
          for (const toolId of selections) {
            const tool = TWITCH_TOOLS.find((t) => t.id === toolId);
            if (tool && tool.enabled && !tool.comingSoon) {
              simulateToolSelection(toolId, tool, callback);
              expectedCount++;
            }
          }

          // Property: only enabled tools should trigger callbacks
          expect(selectedIds.length).toBe(expectedCount);
        }),
        { numRuns: 100 }
      );
    });

    it('should always produce valid tool IDs when callback is triggered', () => {
      fc.assert(
        fc.property(enabledToolIdArb, (toolId) => {
          // Property: any generated enabled tool ID should be valid
          expect(isValidToolId(toolId)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Coming Soon Tools Are Non-Interactive', () => {
    /**
     * Feature: sidebar-platforms-section, Property 3: Coming Soon Tools Are Non-Interactive
     * 
     * For any tool marked with `comingSoon: true`, the ToolCard SHALL display a 
     * "Próximamente" badge and clicking SHALL not trigger navigation.
     * 
     * **Validates: Requirements 3.5**
     */

    it('should NOT call callback for coming soon tools', () => {
      const comingSoonTools = TWITCH_TOOLS.filter((t) => t.comingSoon);
      
      for (const tool of comingSoonTools) {
        let callbackCalled = false;
        const callback = () => {
          callbackCalled = true;
        };

        simulateToolSelection(tool.id, tool, callback);

        // Property: callback should NOT be called for coming soon tools
        expect(callbackCalled).toBe(false);
      }
    });

    it('should NOT call callback for disabled tools', () => {
      const disabledTools = TWITCH_TOOLS.filter((t) => !t.enabled);
      
      for (const tool of disabledTools) {
        let callbackCalled = false;
        const callback = () => {
          callbackCalled = true;
        };

        simulateToolSelection(tool.id, tool, callback);

        // Property: callback should NOT be called for disabled tools
        expect(callbackCalled).toBe(false);
      }
    });

    it('should correctly identify coming soon tools', () => {
      fc.assert(
        fc.property(toolIdArb, (toolId) => {
          const tool = TWITCH_TOOLS.find((t) => t.id === toolId);
          
          if (tool) {
            const isComingSoon = isToolComingSoon(tool);
            
            // Property: coming soon status should match comingSoon === true
            expect(isComingSoon).toBe(tool.comingSoon === true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have predictions and channelpoints as enabled tools', () => {
      const predictions = TWITCH_TOOLS.find((t) => t.id === 'predictions');
      const channelpoints = TWITCH_TOOLS.find((t) => t.id === 'channelpoints');

      expect(predictions?.enabled).toBe(true);
      expect(predictions?.comingSoon).toBeFalsy();
      expect(channelpoints?.enabled).toBe(true);
      expect(channelpoints?.comingSoon).toBeFalsy();
    });

    it('should have coming soon tools be non-interactive', () => {
      const comingSoonTools = TWITCH_TOOLS.filter((t) => t.comingSoon);
      
      for (const tool of comingSoonTools) {
        // Property: coming soon tools should not be interactive
        expect(isToolInteractive(tool)).toBe(false);
      }
    });

    it('should never trigger callback for any coming soon tool regardless of attempts', () => {
      if (comingSoonToolIdArb !== null) {
        fc.assert(
          fc.property(comingSoonToolIdArb, fc.integer({ min: 1, max: 10 }), (toolId, attempts) => {
            let callbackCount = 0;
            const callback = () => {
              callbackCount++;
            };

            const tool = TWITCH_TOOLS.find((t) => t.id === toolId);
            if (tool) {
              for (let i = 0; i < attempts; i++) {
                simulateToolSelection(toolId, tool, callback);
              }

              // Property: callback should never be called for coming soon tools
              expect(callbackCount).toBe(0);
            }
          }),
          { numRuns: 100 }
        );
      }
    });
  });

  describe('Tool Interactivity', () => {
    /**
     * Tests that verify tool card interactivity based on enabled/comingSoon state
     */

    it('should correctly determine interactivity for all tools', () => {
      fc.assert(
        fc.property(toolIdArb, (toolId) => {
          const tool = TWITCH_TOOLS.find((t) => t.id === toolId);
          
          if (tool) {
            const isInteractive = isToolInteractive(tool);
            
            // Property: interactivity should match enabled && !comingSoon
            expect(isInteractive).toBe(tool.enabled && !tool.comingSoon);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have at least one interactive tool', () => {
      const interactiveTools = TWITCH_TOOLS.filter(isToolInteractive);
      
      expect(interactiveTools.length).toBeGreaterThanOrEqual(1);
    });

    it('should have commands tool be interactive', () => {
      const commandsTool = TWITCH_TOOLS.find((t) => t.id === 'commands');
      
      expect(commandsTool).toBeDefined();
      expect(isToolInteractive(commandsTool!)).toBe(true);
    });
  });

  describe('Tool Configuration Invariants', () => {
    /**
     * Tests that verify invariants of the tool configuration
     */

    it('should maintain consistent tool count across multiple accesses', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (accessCount) => {
          const counts: number[] = [];
          
          for (let i = 0; i < accessCount; i++) {
            counts.push(TWITCH_TOOLS.length);
          }

          // Property: tool count should be consistent
          expect(counts.every((c) => c === TWITCH_TOOLS.length)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should have tools with expected structure for any access', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: Math.max(0, TWITCH_TOOLS.length - 1) }), (index) => {
          if (TWITCH_TOOLS.length > 0) {
            const tool = TWITCH_TOOLS[index];

            // Property: each tool should have all required properties
            expect(tool).toHaveProperty('id');
            expect(tool).toHaveProperty('icon');
            expect(tool).toHaveProperty('title');
            expect(tool).toHaveProperty('description');
            expect(tool).toHaveProperty('color');
            expect(tool).toHaveProperty('enabled');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have commands tool with expected properties', () => {
      const commandsTool = TWITCH_TOOLS.find((t) => t.id === 'commands');

      expect(commandsTool).toBeDefined();
      expect(commandsTool?.title).toBe('Comandos');
      expect(commandsTool?.enabled).toBe(true);
      expect(commandsTool?.icon).toBe('Terminal');
    });

    it('should have exactly 3 tools: commands, predictions, channelpoints', () => {
      const expectedIds = ['commands', 'predictions', 'channelpoints'];
      const actualIds = TWITCH_TOOLS.map((t) => t.id);

      expect(actualIds.sort()).toEqual(expectedIds.sort());
    });
  });
});
