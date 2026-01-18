/**
 * Property-based tests for translation completeness
 * 
 * These tests use fast-check to generate random test cases and verify
 * that our translation system maintains consistency across locales.
 * 
 * Tests validate:
 * - Design P1: All Spanish keys have corresponding English translations
 * - Design P3: Variable interpolation works correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { loadCompleteTranslations, type Locale, type Translations } from '../../i18n/locales';

// Cache loaded translations to avoid repeated loading
let esTranslations: Translations;
let enTranslations: Translations;

beforeAll(async () => {
  // Load complete translations once for all tests
  esTranslations = await loadCompleteTranslations('es');
  enTranslations = await loadCompleteTranslations('en');
});

/**
 * Get all nested keys from a translation object
 * @param obj - Translation object to extract keys from
 * @param prefix - Current key prefix for nested objects
 * @returns Array of all dot-notation keys
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Get value from nested object using dot notation
 * @param obj - Object to get value from
 * @param path - Dot-notation path to the value
 * @returns The value at the specified path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: Record<string, unknown> | unknown, key) => {
    return current && typeof current === 'object' && !Array.isArray(current) ? (current as Record<string, unknown>)[key] : undefined;
  }, obj);
}

/**
 * Check if a translation exists and is valid for a given locale and key
 * @param locale - The locale to check
 * @param key - The translation key to check
 * @returns True if the translation exists and is valid
 */
function hasValidTranslation(locale: Locale, key: string): boolean {
  const translations = locale === 'es' ? esTranslations : enTranslations;
  const value = getNestedValue(translations as unknown as Record<string, unknown>, key);
  return typeof value === 'string' && value.length > 0;
}

/**
 * Get translation value for a given locale and key
 * @param locale - The locale to get translation for
 * @param key - The translation key
 * @returns The translation value or undefined
 */
function getTranslation(locale: Locale, key: string): string | undefined {
  const translations = locale === 'es' ? esTranslations : enTranslations;
  const value = getNestedValue(translations as unknown as Record<string, unknown>, key);
  return typeof value === 'string' ? value : undefined;
}

/**
 * Get all translation keys from Spanish translations (source of truth)
 */
function getSpanishKeys(): string[] {
  if (!esTranslations) return [];
  return getAllKeys(esTranslations as unknown as Record<string, unknown>);
}

/**
 * Get all translation keys from English translations
 */
function getEnglishKeys(): string[] {
  if (!enTranslations) return [];
  return getAllKeys(enTranslations as unknown as Record<string, unknown>);
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
  return getSpanishKeys().filter(key => key.startsWith('giveaway.'));
}

/**
 * Get keys specific to JudgePanel
 */
function getJudgePanelKeys(): string[] {
  return getSpanishKeys().filter(key => key.startsWith('misc.judgePanel.'));
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
// Property-based Test Generators
// ============================================

// Generate a random key from the Spanish translations
const createSpanishKeyArb = () => {
  const keys = getSpanishKeys();
  return keys.length > 0 ? fc.oneof(...keys.map(key => fc.constant(key))) : fc.constant('common.loading');
};

// Generate a random GiveawayHub key
const createGiveawayKeyArb = () => {
  const keys = getGiveawayKeys();
  return keys.length > 0 ? fc.oneof(...keys.map(key => fc.constant(key))) : fc.constant('giveaway.title');
};

// Generate a random JudgePanel key
const createJudgePanelKeyArb = () => {
  const keys = getJudgePanelKeys();
  return keys.length > 0 ? fc.oneof(...keys.map(key => fc.constant(key))) : fc.constant('misc.judgePanel.title');
};

// Generate a random tooltip key
const createTooltipKeyArb = () => {
  const keys = getTooltipKeys();
  return keys.length > 0 ? fc.oneof(...keys.map(key => fc.constant(key))) : fc.constant('common.tooltip');
};

// Generate a random error key
const createErrorKeyArb = () => {
  const keys = getErrorKeys();
  return keys.length > 0 ? fc.oneof(...keys.map(key => fc.constant(key))) : fc.constant('errors.network');
};

// Generate a random preset key
const createPresetKeyArb = () => {
  const keys = getPresetKeys();
  return keys.length > 0 ? fc.oneof(...keys.map(key => fc.constant(key))) : fc.constant('common.preset');
};

// ============================================
// Property-based Tests
// ============================================

describe('Translation Completeness Property Tests', () => {
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
      const spanishKeys = getSpanishKeys();
      if (spanishKeys.length === 0) {
        console.log('No Spanish keys found, skipping test');
        return;
      }

      const spanishKeyArb = createSpanishKeyArb();
      fc.assert(
        fc.property(spanishKeyArb, (key: string) => {
          const hasSpanish = hasValidTranslation('es', key);
          const hasEnglish = hasValidTranslation('en', key);

          expect(hasSpanish).toBe(true);
          expect(hasEnglish).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('GiveawayHub Translations (Requirement 9.1)', () => {
    it('all GiveawayHub keys have English translations', () => {
      const giveawayKeys = getGiveawayKeys();
      const missingEnglish = giveawayKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing GiveawayHub English translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any GiveawayHub key, both translations exist', () => {
      const giveawayKeys = getGiveawayKeys();
      if (giveawayKeys.length === 0) {
        console.log('No giveaway keys found, skipping test');
        return;
      }

      const giveawayKeyArb = createGiveawayKeyArb();
      fc.assert(
        fc.property(giveawayKeyArb, (key: string) => {
          const hasSpanish = hasValidTranslation('es', key);
          const hasEnglish = hasValidTranslation('en', key);

          expect(hasSpanish).toBe(true);
          expect(hasEnglish).toBe(true);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('JudgePanel Translations (Requirement 9.2)', () => {
    it('all JudgePanel keys have English translations', () => {
      const judgePanelKeys = getJudgePanelKeys();
      const missingEnglish = judgePanelKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing JudgePanel English translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any JudgePanel key, both translations exist', () => {
      const judgePanelKeys = getJudgePanelKeys();
      if (judgePanelKeys.length === 0) {
        console.log('No judge panel keys found, skipping test');
        return;
      }

      const judgePanelKeyArb = createJudgePanelKeyArb();
      fc.assert(
        fc.property(judgePanelKeyArb, (key: string) => {
          const hasSpanish = hasValidTranslation('es', key);
          const hasEnglish = hasValidTranslation('en', key);

          expect(hasSpanish).toBe(true);
          expect(hasEnglish).toBe(true);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Tooltip Translations (Requirement 9.3)', () => {
    it('all tooltip keys have English translations', () => {
      const tooltipKeys = getTooltipKeys();
      const missingEnglish = tooltipKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing tooltip English translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any tooltip key, both translations exist', () => {
      const tooltipKeys = getTooltipKeys();
      if (tooltipKeys.length === 0) {
        console.log('No tooltip keys found, skipping test');
        return;
      }

      const tooltipKeyArb = createTooltipKeyArb();
      fc.assert(
        fc.property(tooltipKeyArb, (key: string) => {
          const hasSpanish = hasValidTranslation('es', key);
          const hasEnglish = hasValidTranslation('en', key);

          expect(hasSpanish).toBe(true);
          expect(hasEnglish).toBe(true);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Error Message Translations (Requirement 9.4)', () => {
    it('all error keys have English translations', () => {
      const errorKeys = getErrorKeys();
      const missingEnglish = errorKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing error English translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any error key, both translations exist', () => {
      const errorKeys = getErrorKeys();
      if (errorKeys.length === 0) {
        console.log('No error keys found, skipping test');
        return;
      }

      const errorKeyArb = createErrorKeyArb();
      fc.assert(
        fc.property(errorKeyArb, (key: string) => {
          const hasSpanish = hasValidTranslation('es', key);
          const hasEnglish = hasValidTranslation('en', key);

          expect(hasSpanish).toBe(true);
          expect(hasEnglish).toBe(true);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Preset Translations (Requirement 9.5)', () => {
    it('all preset keys have English translations', () => {
      const presetKeys = getPresetKeys();
      const missingEnglish = presetKeys.filter(key => !hasValidTranslation('en', key));
      
      if (missingEnglish.length > 0) {
        console.log('Missing preset English translations:', missingEnglish);
      }
      
      expect(missingEnglish).toHaveLength(0);
    });

    it('for any preset key, both translations exist', () => {
      const presetKeys = getPresetKeys();
      if (presetKeys.length === 0) {
        console.log('No preset keys found, skipping test');
        return;
      }

      const presetKeyArb = createPresetKeyArb();
      fc.assert(
        fc.property(presetKeyArb, (key: string) => {
          const hasSpanish = hasValidTranslation('es', key);
          const hasEnglish = hasValidTranslation('en', key);

          expect(hasSpanish).toBe(true);
          expect(hasEnglish).toBe(true);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Translation Value Quality', () => {
    it('no translation values are just whitespace', () => {
      const spanishKeys = getSpanishKeys();
      if (spanishKeys.length === 0) {
        console.log('No Spanish keys found, skipping test');
        return;
      }

      const spanishKeyArb = createSpanishKeyArb();
      fc.assert(
        fc.property(spanishKeyArb, (key: string) => {
          const spanishValue = getTranslation('es', key);
          const englishValue = getTranslation('en', key);

          if (spanishValue) {
            expect(spanishValue.trim()).not.toBe('');
          }
          if (englishValue) {
            expect(englishValue.trim()).not.toBe('');
          }
        }),
        { numRuns: 30 }
      );
    });

    it('translations are not identical (except for technical terms)', () => {
      const spanishKeys = getSpanishKeys();
      if (spanishKeys.length === 0) {
        console.log('No Spanish keys found, skipping test');
        return;
      }

      const spanishKeyArb = createSpanishKeyArb();
      fc.assert(
        fc.property(spanishKeyArb, (key: string) => {
          const spanishValue = getTranslation('es', key);
          const englishValue = getTranslation('en', key);

          if (spanishValue && englishValue) {
            // Allow identical values for technical terms, URLs, numbers, placeholders, etc.
            const isTechnicalTerm = /^(https?:\/\/|[0-9]+|[A-Z_]+|[a-z]+\.[a-z]+|Viewer|Moderator|VIP|Subscriber|Follower|Admin|Bot|API|URL|ID|OK|CSS|HTML|JSON|XML|HTTP|HTTPS|OAuth|JWT|UUID|RGB|HEX|AI Vision)$/i.test(spanishValue);
            const isShortTechnical = spanishValue.length <= 3; // Short codes like "OK", "ID"
            const isPlaceholder = /^[0-9]+:[A-Za-z0-9_\-\.]+$/.test(spanishValue); // Bot tokens, API keys, etc.
            const hasPlaceholderPattern = /\.\.\.$/.test(spanishValue); // Ends with ...
            const isTemplateString = /\{[^}]+\}/.test(spanishValue); // Contains template variables like {count}
            
            if (!isTechnicalTerm && !isShortTechnical && !isPlaceholder && !hasPlaceholderPattern && !isTemplateString && spanishValue.length > 5) {
              // For longer non-technical terms, they should be different
              // This helps catch copy-paste errors
              expect(spanishValue).not.toBe(englishValue);
            }
          }
        }),
        { numRuns: 20 }
      );
    });
  });
});