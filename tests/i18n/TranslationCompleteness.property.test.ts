/**
 * Property-based tests for Translation Completeness
 * 
 * Tests that all translation keys have values in both Spanish and English.
 * Uses fast-check for property-based testing.
 * 
 * @requirements 9.1 - English translations for all GiveawayHub text
 * @requirements 9.2 - English translations for all JudgePanel text
 * @requirements 9.3 - English translations for all tooltip text
 * @requirements 9.4 - English translations for all error messages
 * @requirements 9.5 - English translations for all preset names and descriptions
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { translations, Locale } from '../../i18n/locales';

// ============================================
// TRANSLATION COMPLETENESS LOGIC
// ============================================

type TranslationValue = string | Record<string, unknown>;

/**
 * Recursively get all keys from a translation object
 * Returns an array of dot-notation paths (e.g., 'randomWinner.errors.noValidParticipants')
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse into nested objects
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      // Leaf node (string value)
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Get a value from a nested object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

/**
 * Check if a translation value is valid (non-empty string)
 */
function isValidTranslation(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Get all translation keys from Spanish translations (source of truth)
 */
function getSpanishKeys(): string[] {
  return getAllKeys(translations.es as unknown as Record<string, unknown>);
}

/**
 * Get all translation keys from English translations
 */
function getEnglishKeys(): string[] {
  return getAllKeys(translations.en as unknown as Record<string, unknown>);
}

/**
 * Check if a key exists and has a valid value in a locale
 */
function hasValidTranslation(locale: Locale, key: string): boolean {
  const value = getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);
  return isValidTranslation(value);
}

/**
 * Get missing keys in English that exist in Spanish
 */
function getMissingEnglishKeys(): string[] {
  const spanishKeys = getSpanishKeys();
  return spanishKeys.filter(key => !hasValidTranslation('en', key));
}

/**
 * Get missing keys in Spanish that exist in English
 */
function getMissingSpanishKeys(): string[] {
  const englishKeys = getEnglishKeys();
  return englishKeys.filter(key => !hasValidTranslation('es', key));
}

/**
 * Get keys specific to GiveawayHub/RandomWinner
 */
function getGiveawayKeys(): string[] {
  return getSpanishKeys().filter(key => key.startsWith('randomWinner.'));
}

/**
 * Get keys specific to JudgePanel
 */
function getJudgePanelKeys(): string[] {
  return getSpanishKeys().filter(key => key.startsWith('judgePanel.'));
}

/**
 * Get tooltip keys
 */
function getTooltipKeys(): string[] {
  return getSpanishKeys().filter(key => key.toLowerCase().includes('tooltip'));
}

/**
 * Get error message keys
 */
function getErrorKeys(): string[] {
  return getSpanishKeys().filter(key => key.includes('.errors.'));
}

/**
 * Get preset keys
 */
function getPresetKeys(): string[] {
  return getSpanishKeys().filter(key => key.includes('.presets.'));
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

// Generate a random key from the Spanish translations
const spanishKeyArb = fc.constantFrom(...getSpanishKeys());

// Generate a random GiveawayHub key
const giveawayKeyArb = fc.constantFrom(...getGiveawayKeys());

// Generate a random JudgePanel key
const judgePanelKeyArb = fc.constantFrom(...getJudgePanelKeys());

// Generate a random tooltip key
const tooltipKeyArb = fc.constantFrom(...getTooltipKeys());

// Generate a random error key
const errorKeyArb = fc.constantFrom(...getErrorKeys());

// Generate a random preset key
const presetKeyArb = fc.constantFrom(...getPresetKeys());

// ============================================
// PROPERTY TESTS
// ============================================

describe('Translation Completeness Property Tests', () => {
  /**
   * **Feature: ux-polish-and-testing, Property 12: Translation Completeness**
   * 
   * *For any* UI text key K, both Spanish and English translations should exist
   * and be non-empty.
   * 
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
   */
  describe('Property 12: Translation Completeness', () => {
    it('all Spanish keys have corresponding English translations', () => {
      const missingKeys = getMissingEnglishKeys();
      
      if (missingKeys.length > 0) {
        console.log('Missing English translations:', missingKeys);
      }
      
      expect(missingKeys).toHaveLength(0);
    });

    it('all English keys have corresponding Spanish translations', () => {
      const missingKeys = getMissingSpanishKeys();
      
      if (missingKeys.length > 0) {
        console.log('Missing Spanish translations:', missingKeys);
      }
      
      expect(missingKeys).toHaveLength(0);
    });

    it('Spanish and English have the same number of keys', () => {
      const spanishKeys = getSpanishKeys();
      const englishKeys = getEnglishKeys();
      
      expect(spanishKeys.length).toBe(englishKeys.length);
    });

    it('for any random key, both translations exist and are non-empty', () => {
      fc.assert(
        fc.property(
          spanishKeyArb,
          (key) => {
            const hasSpanish = hasValidTranslation('es', key);
            const hasEnglish = hasValidTranslation('en', key);
            
            expect(hasSpanish).toBe(true);
            expect(hasEnglish).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * GiveawayHub translations (Requirement 9.1)
   */
  describe('GiveawayHub Translations (Requirement 9.1)', () => {
    it('all GiveawayHub keys have English translations', () => {
      const giveawayKeys = getGiveawayKeys();
      const missingEnglish = giveawayKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing English GiveawayHub translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any GiveawayHub key, both translations exist', () => {
      if (getGiveawayKeys().length === 0) {
        // Skip if no giveaway keys exist
        return;
      }
      
      fc.assert(
        fc.property(
          giveawayKeyArb,
          (key) => {
            expect(hasValidTranslation('es', key)).toBe(true);
            expect(hasValidTranslation('en', key)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * JudgePanel translations (Requirement 9.2)
   */
  describe('JudgePanel Translations (Requirement 9.2)', () => {
    it('all JudgePanel keys have English translations', () => {
      const judgePanelKeys = getJudgePanelKeys();
      const missingEnglish = judgePanelKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing English JudgePanel translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any JudgePanel key, both translations exist', () => {
      if (getJudgePanelKeys().length === 0) {
        // Skip if no judge panel keys exist
        return;
      }
      
      fc.assert(
        fc.property(
          judgePanelKeyArb,
          (key) => {
            expect(hasValidTranslation('es', key)).toBe(true);
            expect(hasValidTranslation('en', key)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Tooltip translations (Requirement 9.3)
   */
  describe('Tooltip Translations (Requirement 9.3)', () => {
    it('all tooltip keys have English translations', () => {
      const tooltipKeys = getTooltipKeys();
      const missingEnglish = tooltipKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing English tooltip translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any tooltip key, both translations exist', () => {
      if (getTooltipKeys().length === 0) {
        // Skip if no tooltip keys exist
        return;
      }
      
      fc.assert(
        fc.property(
          tooltipKeyArb,
          (key) => {
            expect(hasValidTranslation('es', key)).toBe(true);
            expect(hasValidTranslation('en', key)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Error message translations (Requirement 9.4)
   */
  describe('Error Message Translations (Requirement 9.4)', () => {
    it('all error keys have English translations', () => {
      const errorKeys = getErrorKeys();
      const missingEnglish = errorKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing English error translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any error key, both translations exist', () => {
      if (getErrorKeys().length === 0) {
        // Skip if no error keys exist
        return;
      }
      
      fc.assert(
        fc.property(
          errorKeyArb,
          (key) => {
            expect(hasValidTranslation('es', key)).toBe(true);
            expect(hasValidTranslation('en', key)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Preset translations (Requirement 9.5)
   */
  describe('Preset Translations (Requirement 9.5)', () => {
    it('all preset keys have English translations', () => {
      const presetKeys = getPresetKeys();
      const missingEnglish = presetKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing English preset translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any preset key, both translations exist', () => {
      if (getPresetKeys().length === 0) {
        // Skip if no preset keys exist
        return;
      }
      
      fc.assert(
        fc.property(
          presetKeyArb,
          (key) => {
            expect(hasValidTranslation('es', key)).toBe(true);
            expect(hasValidTranslation('en', key)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Translation value quality checks
   */
  describe('Translation Value Quality', () => {
    it('no translation values are just whitespace', () => {
      const spanishKeys = getSpanishKeys();
      
      for (const key of spanishKeys) {
        const esValue = getNestedValue(translations.es as unknown as Record<string, unknown>, key);
        const enValue = getNestedValue(translations.en as unknown as Record<string, unknown>, key);
        
        if (typeof esValue === 'string') {
          expect(esValue.trim().length).toBeGreaterThan(0);
        }
        if (typeof enValue === 'string') {
          expect(enValue.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('translations are not identical (except for technical terms)', () => {
      // Some keys may have identical translations (e.g., "OAuth", "API", brand names)
      // This test checks that most translations are different
      const spanishKeys = getSpanishKeys();
      let identicalCount = 0;
      
      for (const key of spanishKeys) {
        const esValue = getNestedValue(translations.es as unknown as Record<string, unknown>, key);
        const enValue = getNestedValue(translations.en as unknown as Record<string, unknown>, key);
        
        if (typeof esValue === 'string' && typeof enValue === 'string') {
          if (esValue === enValue) {
            identicalCount++;
          }
        }
      }
      
      // Allow up to 20% identical translations (for technical terms, brand names, etc.)
      const identicalPercentage = (identicalCount / spanishKeys.length) * 100;
      expect(identicalPercentage).toBeLessThan(20);
    });
  });
});
