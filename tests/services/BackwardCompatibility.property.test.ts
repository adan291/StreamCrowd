/**
 * Property-based tests for Backward Compatibility
 * 
 * Uses fast-check for property-based testing to validate that the hexagonal
 * architecture maintains backward compatibility with legacy data formats.
 * 
 * @requirements 7.4, 7.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AnalyticsService, AIConfig, LegacyAIConfig } from '../../src/application/services/AnalyticsService';
import type { AIProvider } from '../../src/domain/ports/IAnalyticsProvider';

// ============ CONSTANTS ============

const STORAGE_KEY = 'twitch_ai_config_v2';
const LEGACY_STORAGE_KEY = 'twitch_ai_config';
const ENCRYPTION_KEY = 'TwitchVoteLive2024';

// ============ HELPERS ============

const encryptKey = (text: string): string => {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
};

// ============ ARBITRARIES ============

const providerArb: fc.Arbitrary<AIProvider> = fc.constantFrom('gemini', 'openai', 'anthropic');

const apiKeyArb = fc.string({ minLength: 10, maxLength: 50 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

const legacyConfigArb: fc.Arbitrary<LegacyAIConfig> = fc.record({
  provider: providerArb,
  apiKey: apiKeyArb,
  enabled: fc.boolean(),
});

const aiConfigArb: fc.Arbitrary<AIConfig> = fc.record({
  providers: fc.record({
    gemini: fc.record({
      apiKey: fc.oneof(apiKeyArb, fc.constant('')),
      enabled: fc.boolean(),
    }),
    openai: fc.record({
      apiKey: fc.oneof(apiKeyArb, fc.constant('')),
      enabled: fc.boolean(),
    }),
    anthropic: fc.record({
      apiKey: fc.oneof(apiKeyArb, fc.constant('')),
      enabled: fc.boolean(),
    }),
  }),
  analyticsProvider: providerArb,
  gamesProvider: providerArb,
});

// ============ TESTS ============

describe('Backward Compatibility Property Tests', () => {
  let originalLocalStorage: Storage;
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map<string, string>();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
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

  describe('Property 28: Legacy data format is read correctly', () => {
    /**
     * Data stored in legacy format should be readable by the new service.
     * 
     * @validates Requirements 7.4
     */
    it('should read legacy AI config format correctly', () => {
      fc.assert(
        fc.property(
          legacyConfigArb,
          (legacyConfig) => {
            storage.clear();
            
            // Store in legacy format (encrypted)
            const legacyStored = {
              provider: legacyConfig.provider,
              apiKey: encryptKey(legacyConfig.apiKey),
              enabled: legacyConfig.enabled,
            };
            storage.set(LEGACY_STORAGE_KEY, JSON.stringify(legacyStored));
            
            // Create new service - should migrate legacy config
            const service = new AnalyticsService();
            const fullConfig = service.getFullAIConfig();
            
            // The legacy provider should have the API key (if provider exists in config)
            const providerConfig = fullConfig.providers[legacyConfig.provider];
            if (providerConfig) {
              expect(providerConfig.apiKey).toBe(legacyConfig.apiKey);
            }
            expect(fullConfig.analyticsProvider).toBe(legacyConfig.provider);
            expect(fullConfig.gamesProvider).toBe(legacyConfig.provider);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 29: New format data can be saved and loaded', () => {
    /**
     * Data saved in new format should be loadable by subsequent service instances.
     * 
     * @validates Requirements 7.5
     */
    it('should save and load new AI config format correctly', () => {
      fc.assert(
        fc.property(
          aiConfigArb,
          (config) => {
            storage.clear();
            
            // Create service and set config
            const service1 = new AnalyticsService();
            service1.setFullAIConfig(config);
            
            // Create new service instance - should load saved config
            const service2 = new AnalyticsService();
            const loadedConfig = service2.getFullAIConfig();
            
            // Verify providers match
            expect(loadedConfig.analyticsProvider).toBe(config.analyticsProvider);
            expect(loadedConfig.gamesProvider).toBe(config.gamesProvider);
            
            // Verify API keys match (for non-empty keys)
            (['gemini', 'openai', 'anthropic'] as AIProvider[]).forEach(provider => {
              if (config.providers[provider].apiKey) {
                expect(loadedConfig.providers[provider].apiKey).toBe(config.providers[provider].apiKey);
              }
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property: Legacy migration creates new format', () => {
    /**
     * After reading legacy format, the service should save in new format.
     * 
     * @validates Requirements 7.4, 7.5
     */
    it('should migrate legacy config to new format', () => {
      fc.assert(
        fc.property(
          legacyConfigArb,
          (legacyConfig) => {
            storage.clear();
            
            // Store in legacy format
            const legacyStored = {
              provider: legacyConfig.provider,
              apiKey: encryptKey(legacyConfig.apiKey),
              enabled: legacyConfig.enabled,
            };
            storage.set(LEGACY_STORAGE_KEY, JSON.stringify(legacyStored));
            
            // Create service - triggers migration
            new AnalyticsService();
            
            // New format should now exist
            const newFormatStored = storage.get(STORAGE_KEY);
            expect(newFormatStored).not.toBeNull();
            
            if (newFormatStored) {
              const parsed = JSON.parse(newFormatStored);
              expect(parsed.analyticsProvider).toBe(legacyConfig.provider);
              expect(parsed.gamesProvider).toBe(legacyConfig.provider);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property: New format takes precedence over legacy', () => {
    /**
     * When both formats exist, new format should take precedence.
     * 
     * @validates Requirements 7.5
     */
    it('should prefer new format over legacy', () => {
      fc.assert(
        fc.property(
          legacyConfigArb,
          aiConfigArb,
          (legacyConfig, newConfig) => {
            storage.clear();
            
            // Store both formats
            const legacyStored = {
              provider: legacyConfig.provider,
              apiKey: encryptKey(legacyConfig.apiKey),
              enabled: legacyConfig.enabled,
            };
            storage.set(LEGACY_STORAGE_KEY, JSON.stringify(legacyStored));
            
            // Store new format with encrypted keys
            const newStored = {
              ...newConfig,
              providers: {
                gemini: {
                  apiKey: newConfig.providers.gemini.apiKey ? encryptKey(newConfig.providers.gemini.apiKey) : '',
                  enabled: newConfig.providers.gemini.enabled,
                },
                openai: {
                  apiKey: newConfig.providers.openai.apiKey ? encryptKey(newConfig.providers.openai.apiKey) : '',
                  enabled: newConfig.providers.openai.enabled,
                },
                anthropic: {
                  apiKey: newConfig.providers.anthropic.apiKey ? encryptKey(newConfig.providers.anthropic.apiKey) : '',
                  enabled: newConfig.providers.anthropic.enabled,
                },
              },
            };
            storage.set(STORAGE_KEY, JSON.stringify(newStored));
            
            // Create service
            const service = new AnalyticsService();
            const loadedConfig = service.getFullAIConfig();
            
            // Should use new format values
            expect(loadedConfig.analyticsProvider).toBe(newConfig.analyticsProvider);
            expect(loadedConfig.gamesProvider).toBe(newConfig.gamesProvider);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property: Empty storage returns default config', () => {
    /**
     * When no config is stored, service should return default config.
     * 
     * @validates Requirements 7.4
     */
    it('should return default config when storage is empty', () => {
      storage.clear();
      
      const service = new AnalyticsService();
      const config = service.getFullAIConfig();
      
      // Should have default structure
      expect(config.providers).toBeDefined();
      expect(config.providers.gemini).toBeDefined();
      expect(config.providers.openai).toBeDefined();
      expect(config.providers.anthropic).toBeDefined();
      expect(config.analyticsProvider).toBeDefined();
      expect(config.gamesProvider).toBeDefined();
    });
  });

  describe('Property: clearAIConfig removes both formats', () => {
    /**
     * clearAIConfig should remove both legacy and new format data.
     * 
     * @validates Requirements 7.4, 7.5
     */
    it('should clear both config formats', () => {
      fc.assert(
        fc.property(
          legacyConfigArb,
          aiConfigArb,
          (legacyConfig, newConfig) => {
            storage.clear();
            
            // Store both formats
            storage.set(LEGACY_STORAGE_KEY, JSON.stringify(legacyConfig));
            storage.set(STORAGE_KEY, JSON.stringify(newConfig));
            
            // Create service and clear
            const service = new AnalyticsService();
            service.clearAIConfig();
            
            // Both should be removed (storage.get returns undefined when not found)
            expect(storage.has(LEGACY_STORAGE_KEY)).toBe(false);
            expect(storage.has(STORAGE_KEY)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
