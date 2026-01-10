/**
 * ModeSelector Property Tests
 * Tests for mode selection visual state
 * 
 * **Feature: giveaway-improvements**
 * **Property 9: Mode Selection Visual State**
 * **Validates: Requirements 6.2, 6.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// TYPES
// ============================================

type RaffleMode = 'viewers' | 'keyword' | 'subs';

interface ModeConfig {
  id: RaffleMode;
  name: string;
  description: string;
  icon: string;
  gradient: string;
}

// ============================================
// MODE CONFIGURATIONS (from component)
// ============================================

const MODES: ModeConfig[] = [
  {
    id: 'viewers',
    name: 'Viewers',
    description: 'Sorteo entre todos los viewers activos del chat',
    icon: '👥',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'keyword',
    name: 'Keyword',
    description: 'Los usuarios participan escribiendo una palabra clave',
    icon: '🔑',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 'subs',
    name: 'Subs',
    description: 'Sorteo exclusivo para suscriptores con entradas ponderadas',
    icon: '⭐',
    gradient: 'from-amber-500 to-orange-500',
  },
];

// ============================================
// PURE FUNCTIONS FOR TESTING
// ============================================

function getModeConfig(mode: RaffleMode): ModeConfig | undefined {
  return MODES.find(m => m.id === mode);
}

function isValidMode(mode: string): mode is RaffleMode {
  return ['viewers', 'keyword', 'subs'].includes(mode);
}

function getSelectedClasses(isSelected: boolean): string {
  if (isSelected) {
    return 'ring-2 ring-white/50 scale-105';
  }
  return 'opacity-70 hover:opacity-100';
}

function getGradientClasses(mode: RaffleMode): string {
  const config = getModeConfig(mode);
  return config ? `bg-gradient-to-br ${config.gradient}` : '';
}

// ============================================
// ARBITRARIES
// ============================================

const raffleModeArb = fc.constantFrom<RaffleMode>('viewers', 'keyword', 'subs');
const invalidModeArb = fc.string().filter(s => !isValidMode(s));

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 9: Mode Selection Visual State', () => {
  describe('Mode Configuration', () => {
    it('all valid modes should have a configuration', () => {
      fc.assert(
        fc.property(raffleModeArb, (mode) => {
          const config = getModeConfig(mode);
          expect(config).toBeDefined();
          expect(config?.id).toBe(mode);
        }),
        { numRuns: 100 }
      );
    });

    it('all mode configs should have required fields', () => {
      MODES.forEach(config => {
        expect(config.id).toBeTruthy();
        expect(config.name).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.icon).toBeTruthy();
        expect(config.gradient).toBeTruthy();
      });
    });

    it('mode IDs should be unique', () => {
      const ids = MODES.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('invalid modes should return undefined config', () => {
      fc.assert(
        fc.property(invalidModeArb, (invalidMode) => {
          const config = getModeConfig(invalidMode as RaffleMode);
          expect(config).toBeUndefined();
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Selection State', () => {
    it('selected mode should have distinct visual classes', () => {
      const selectedClasses = getSelectedClasses(true);
      const unselectedClasses = getSelectedClasses(false);
      
      expect(selectedClasses).not.toBe(unselectedClasses);
      expect(selectedClasses).toContain('ring');
      expect(selectedClasses).toContain('scale');
    });

    it('unselected mode should have hover state', () => {
      const unselectedClasses = getSelectedClasses(false);
      expect(unselectedClasses).toContain('hover:');
    });

    it('selection state should be deterministic', () => {
      fc.assert(
        fc.property(fc.boolean(), (isSelected) => {
          const classes1 = getSelectedClasses(isSelected);
          const classes2 = getSelectedClasses(isSelected);
          expect(classes1).toBe(classes2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Gradient Classes', () => {
    it('each mode should have unique gradient', () => {
      const gradients = MODES.map(m => m.gradient);
      const uniqueGradients = new Set(gradients);
      expect(uniqueGradients.size).toBe(gradients.length);
    });

    it('gradient classes should include bg-gradient-to-br', () => {
      fc.assert(
        fc.property(raffleModeArb, (mode) => {
          const classes = getGradientClasses(mode);
          expect(classes).toContain('bg-gradient-to-br');
        }),
        { numRuns: 100 }
      );
    });

    it('gradient classes should include from- and to- colors', () => {
      fc.assert(
        fc.property(raffleModeArb, (mode) => {
          const config = getModeConfig(mode);
          expect(config?.gradient).toContain('from-');
          expect(config?.gradient).toContain('to-');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Mode Validation', () => {
    it('isValidMode should return true for valid modes', () => {
      fc.assert(
        fc.property(raffleModeArb, (mode) => {
          expect(isValidMode(mode)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('isValidMode should return false for invalid modes', () => {
      fc.assert(
        fc.property(invalidModeArb, (invalidMode) => {
          expect(isValidMode(invalidMode)).toBe(false);
        }),
        { numRuns: 50 }
      );
    });
  });
});
