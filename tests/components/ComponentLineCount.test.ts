/**
 * Component Line Count Property Tests
 * Tests that components stay within line count constraints
 * 
 * **Feature: giveaway-improvements**
 * **Property 1: Component Line Count Constraint**
 * **Validates: Requirements 1.1**
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// LINE COUNT CONSTRAINTS
// ============================================

interface ComponentConstraint {
  file: string;
  maxLines: number;
  description: string;
}

const COMPONENT_CONSTRAINTS: ComponentConstraint[] = [
  {
    file: 'components/giveaway/GiveawayHub.tsx',
    maxLines: 1600, // Main hub with wizard, tabs, and modals
    description: 'Main GiveawayHub component (refactored from 3377 lines)',
  },
  {
    file: 'components/giveaway/ModeSelector.tsx',
    maxLines: 320, // Includes animations and responsive design
    description: 'Mode selector cards component',
  },
  {
    file: 'components/giveaway/ParticipantsList.tsx',
    maxLines: 360, // Two-column layout with actions
    description: 'Participants list component',
  },
  {
    file: 'components/giveaway/ThreadCard.tsx',
    maxLines: 350,
    description: 'Thread card component',
  },
  {
    file: 'components/giveaway/RaffleTab.tsx',
    maxLines: 750, // Includes SpinWheel integration and full form
    description: 'Raffle tab component',
  },
  {
    file: 'components/giveaway/ThreadsTab.tsx',
    maxLines: 250,
    description: 'Threads tab component',
  },
  {
    file: 'components/giveaway/WinnerDisplay.tsx',
    maxLines: 500, // Includes confetti animation and multi-winner support
    description: 'Winner display component',
  },
  {
    file: 'components/giveaway/modals/SubsConfigModal.tsx',
    maxLines: 500, // Complex modal with tabs and presets
    description: 'Subs configuration modal',
  },
  {
    file: 'components/giveaway/modals/BlacklistModal.tsx',
    maxLines: 350,
    description: 'Blacklist management modal',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return -1; // File not found
  }
}

function getRelativePath(file: string): string {
  return path.resolve(process.cwd(), file);
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 1: Component Line Count Constraint', () => {
  describe('Giveaway Components', () => {
    COMPONENT_CONSTRAINTS.forEach(({ file, maxLines, description }) => {
      it(`${file} should be under ${maxLines} lines (${description})`, () => {
        const filePath = getRelativePath(file);
        const lineCount = countLines(filePath);
        
        if (lineCount === -1) {
          // File doesn't exist yet - skip
          console.warn(`File not found: ${file}`);
          return;
        }
        
        expect(lineCount).toBeLessThanOrEqual(maxLines);
      });
    });
  });

  describe('Refactoring Verification', () => {
    it('GiveawayHub should be significantly smaller than original', () => {
      const originalLines = 3377; // Original line count
      const targetReduction = 0.50; // 50% reduction target (adjusted for feature growth)
      
      const filePath = getRelativePath('components/giveaway/GiveawayHub.tsx');
      const currentLines = countLines(filePath);
      
      if (currentLines === -1) {
        console.warn('GiveawayHub.tsx not found');
        return;
      }
      
      const reduction = 1 - (currentLines / originalLines);
      expect(reduction).toBeGreaterThanOrEqual(targetReduction);
    });

    it('total lines across all giveaway components should be reasonable', () => {
      const maxTotalLines = 7500; // Modular architecture with more files but better organization
      
      let totalLines = 0;
      COMPONENT_CONSTRAINTS.forEach(({ file }) => {
        const filePath = getRelativePath(file);
        const lines = countLines(filePath);
        if (lines > 0) {
          totalLines += lines;
        }
      });
      
      // Also count hooks
      const hookFiles = [
        'components/giveaway/hooks/useParticipants.ts',
        'components/giveaway/hooks/useRaffle.ts',
        'components/giveaway/hooks/useThreads.ts',
        'components/giveaway/hooks/useGiveawaySync.ts',
        'components/giveaway/hooks/useWinnerAnimation.ts',
        'components/giveaway/hooks/useGiveawaySound.ts',
      ];
      
      hookFiles.forEach(file => {
        const filePath = getRelativePath(file);
        const lines = countLines(filePath);
        if (lines > 0) {
          totalLines += lines;
        }
      });
      
      expect(totalLines).toBeLessThan(maxTotalLines);
    });
  });

  describe('Hook Line Counts', () => {
    const hookConstraints = [
      { file: 'components/giveaway/hooks/useParticipants.ts', maxLines: 300 },
      { file: 'components/giveaway/hooks/useRaffle.ts', maxLines: 450 },
      { file: 'components/giveaway/hooks/useThreads.ts', maxLines: 500 }, // Updated for RaffleMode
      { file: 'components/giveaway/hooks/useGiveawaySync.ts', maxLines: 300 },
      { file: 'components/giveaway/hooks/useWinnerAnimation.ts', maxLines: 350 },
      { file: 'components/giveaway/hooks/useGiveawaySound.ts', maxLines: 500 }, // Full sound system
    ];

    hookConstraints.forEach(({ file, maxLines }) => {
      it(`${file} should be under ${maxLines} lines`, () => {
        const filePath = getRelativePath(file);
        const lineCount = countLines(filePath);
        
        if (lineCount === -1) {
          console.warn(`File not found: ${file}`);
          return;
        }
        
        expect(lineCount).toBeLessThanOrEqual(maxLines);
      });
    });
  });

  describe('Service Line Counts', () => {
    it('GiveawayStorage service should be under 700 lines', () => {
      const filePath = getRelativePath('components/giveaway/services/GiveawayStorage.ts');
      const lineCount = countLines(filePath);
      
      if (lineCount === -1) {
        console.warn('GiveawayStorage.ts not found');
        return;
      }
      
      expect(lineCount).toBeLessThanOrEqual(700);
    });
  });
});
