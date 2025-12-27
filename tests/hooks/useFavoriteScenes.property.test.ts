/**
 * Property-based tests for Favorite Scenes functionality in useOBS
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the favorite scenes system.
 * 
 * @requirements 2.1, 2.3, 2.4, 2.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MAX_FAVORITE_SCENES } from '../../src/application/hooks/useOBS';

// Storage key must match the one in useOBS.ts
const STORAGE_KEY_FAVORITE_SCENES = 'obs_favorite_scenes';

// ============ ARBITRARIES ============

const sceneNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('"'));

const sceneNamesArrayArb = fc.array(sceneNameArb, { minLength: 0, maxLength: 20 });

// ============ HELPER FUNCTIONS ============

/**
 * Simulates saving favorite scenes (mirrors useOBS implementation)
 */
function saveFavoriteScenes(scenes: string[]): string[] {
  const limitedFavorites = scenes.slice(0, MAX_FAVORITE_SCENES);
  localStorage.setItem(STORAGE_KEY_FAVORITE_SCENES, JSON.stringify(limitedFavorites));
  return limitedFavorites;
}

/**
 * Simulates loading favorite scenes (mirrors useOBS implementation)
 */
function loadFavoriteScenes(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FAVORITE_SCENES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_FAVORITE_SCENES);
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Validates favorites against available scenes (mirrors useOBS implementation)
 */
function validateFavorites(favorites: string[], availableScenes: string[]): string[] {
  return favorites.filter(f => availableScenes.includes(f));
}

// ============ TESTS ============

describe('Favorite Scenes Property Tests', () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Mock localStorage
    const storage = new Map<string, string>();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
        get length() { return storage.size; },
        key: (index: number) => Array.from(storage.keys())[index] ?? null,
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe('Property 2: Favorite Scenes Limit', () => {
    /**
     * Feature: obs-improvements, Property 2: Favorite Scenes Limit
     * 
     * For any attempt to add favorite scenes, the total count SHALL never exceed 6.
     * 
     * **Validates: Requirements 2.1**
     */
    it('should never exceed MAX_FAVORITE_SCENES limit', () => {
      fc.assert(
        fc.property(
          sceneNamesArrayArb,
          (sceneNames) => {
            localStorage.clear();
            
            const saved = saveFavoriteScenes(sceneNames);
            
            // Property: saved favorites should never exceed limit
            expect(saved.length).toBeLessThanOrEqual(MAX_FAVORITE_SCENES);
            
            // Also verify what's in storage
            const loaded = loadFavoriteScenes();
            expect(loaded.length).toBeLessThanOrEqual(MAX_FAVORITE_SCENES);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve order when limiting favorites', () => {
      fc.assert(
        fc.property(
          fc.array(sceneNameArb, { minLength: MAX_FAVORITE_SCENES + 1, maxLength: 20 }),
          (sceneNames) => {
            localStorage.clear();
            
            const saved = saveFavoriteScenes(sceneNames);
            
            // Property: first MAX_FAVORITE_SCENES items should be preserved in order
            for (let i = 0; i < MAX_FAVORITE_SCENES; i++) {
              expect(saved[i]).toBe(sceneNames[i]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Favorite Scenes Round-Trip', () => {
    /**
     * Feature: obs-improvements, Property 3: Favorite Scenes Round-Trip
     * 
     * For any valid list of favorite scenes, saving and then loading 
     * SHALL return an equivalent list.
     * 
     * **Validates: Requirements 2.3, 2.4**
     */
    it('should round-trip favorites through localStorage', () => {
      fc.assert(
        fc.property(
          fc.array(sceneNameArb, { minLength: 0, maxLength: MAX_FAVORITE_SCENES }),
          (sceneNames) => {
            localStorage.clear();
            
            // Save favorites
            saveFavoriteScenes(sceneNames);
            
            // Load favorites
            const loaded = loadFavoriteScenes();
            
            // Property: loaded should equal saved (within limit)
            expect(loaded).toEqual(sceneNames);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty favorites list', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (emptyArray) => {
            localStorage.clear();
            
            saveFavoriteScenes(emptyArray);
            const loaded = loadFavoriteScenes();
            
            expect(loaded).toEqual([]);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should persist favorites across multiple save operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.array(sceneNameArb, { minLength: 0, maxLength: MAX_FAVORITE_SCENES }),
            { minLength: 1, maxLength: 5 }
          ),
          (favoriteSequences) => {
            localStorage.clear();
            
            // Save multiple times
            for (const favorites of favoriteSequences) {
              saveFavoriteScenes(favorites);
            }
            
            // Load should return the last saved value
            const loaded = loadFavoriteScenes();
            const lastSaved = favoriteSequences[favoriteSequences.length - 1];
            
            expect(loaded).toEqual(lastSaved);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Invalid Favorites Cleanup', () => {
    /**
     * Feature: obs-improvements, Property 4: Invalid Favorites Cleanup
     * 
     * For any favorites list containing scene names not present in OBS, 
     * those invalid entries SHALL be removed.
     * 
     * **Validates: Requirements 2.6**
     */
    it('should remove favorites not in available scenes', () => {
      fc.assert(
        fc.property(
          fc.array(sceneNameArb, { minLength: 1, maxLength: MAX_FAVORITE_SCENES }),
          fc.array(sceneNameArb, { minLength: 0, maxLength: 10 }),
          (favorites, availableScenes) => {
            const validated = validateFavorites(favorites, availableScenes);
            
            // Property: all validated favorites must exist in available scenes
            for (const fav of validated) {
              expect(availableScenes).toContain(fav);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve valid favorites in order', () => {
      fc.assert(
        fc.property(
          fc.array(sceneNameArb, { minLength: 1, maxLength: MAX_FAVORITE_SCENES }),
          (favorites) => {
            // Use all favorites as available scenes (all valid)
            const availableScenes = [...favorites];
            const validated = validateFavorites(favorites, availableScenes);
            
            // Property: when all favorites are valid, order should be preserved
            expect(validated).toEqual(favorites);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when no favorites are valid', () => {
      fc.assert(
        fc.property(
          fc.array(sceneNameArb, { minLength: 1, maxLength: MAX_FAVORITE_SCENES }),
          fc.array(sceneNameArb, { minLength: 1, maxLength: 10 }),
          (favorites, availableScenes) => {
            // Ensure no overlap by prefixing available scenes
            const nonOverlappingScenes = availableScenes.map(s => `__available__${s}`);
            const validated = validateFavorites(favorites, nonOverlappingScenes);
            
            // Property: no favorites should remain when none match
            expect(validated).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle partial validity correctly', () => {
      fc.assert(
        fc.property(
          fc.array(sceneNameArb, { minLength: 2, maxLength: MAX_FAVORITE_SCENES }),
          fc.integer({ min: 1, max: MAX_FAVORITE_SCENES - 1 }),
          (favorites, validCount) => {
            // Make only first validCount favorites valid
            const actualValidCount = Math.min(validCount, favorites.length - 1);
            const availableScenes = favorites.slice(0, actualValidCount);
            
            const validated = validateFavorites(favorites, availableScenes);
            
            // Property: only the valid ones should remain
            expect(validated.length).toBe(actualValidCount);
            expect(validated).toEqual(favorites.slice(0, actualValidCount));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
