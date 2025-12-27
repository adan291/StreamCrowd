/**
 * Property-based tests for AlertService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the alert system.
 * 
 * @requirements 1.3, 1.6, 1.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AlertService } from '../../src/application/services/AlertService';
import { LocalStorageAlertAdapter } from '../../src/infrastructure/adapters/LocalStorageAlertAdapter';
import type { AlertConfig, AlertEvent, AlertEventType } from '../../src/domain/ports/IAlertPort';

// ============ ARBITRARIES ============

const alertEventTypeArb: fc.Arbitrary<AlertEventType> = fc.constantFrom(
  'follow', 'sub', 'raid', 'bits', 'gift'
);

const alertTemplateArb = fc.constantFrom('default', 'minimal', 'fancy') as fc.Arbitrary<'default' | 'minimal' | 'fancy'>;

const alertAnimationArb = fc.constantFrom('fade', 'slide', 'bounce', 'zoom') as fc.Arbitrary<'fade' | 'slide' | 'bounce' | 'zoom'>;

const usernameArb = fc.string({ minLength: 3, maxLength: 25 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s));

const alertEventArb: fc.Arbitrary<AlertEvent> = fc.record({
  type: alertEventTypeArb,
  username: usernameArb,
  amount: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  message: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  tier: fc.option(fc.constantFrom('1000', '2000', '3000', 'Prime'), { nil: undefined }),
  timestamp: fc.integer({ min: 1000000000000, max: 2000000000000 }),
});

const alertConfigArb: fc.Arbitrary<AlertConfig> = fc.record({
  id: fc.uuid(),
  eventType: alertEventTypeArb,
  enabled: fc.boolean(),
  template: alertTemplateArb,
  duration: fc.integer({ min: 1000, max: 15000 }),
  animation: alertAnimationArb,
  soundUrl: fc.option(fc.webUrl(), { nil: undefined }),
  soundVolume: fc.integer({ min: 0, max: 100 }),
  customMessage: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  customImage: fc.option(fc.webUrl(), { nil: undefined }),
});

// ============ MOCK ADAPTER FOR TESTING ============

class MockAlertAdapter {
  private configs: Map<string, AlertConfig> = new Map();

  constructor(initialConfigs: AlertConfig[] = []) {
    // Initialize with enabled configs for all event types
    const defaultConfigs: AlertConfig[] = [
      { id: 'test-follow', eventType: 'follow', enabled: true, template: 'default', duration: 100, animation: 'fade', soundVolume: 50 },
      { id: 'test-sub', eventType: 'sub', enabled: true, template: 'default', duration: 100, animation: 'fade', soundVolume: 50 },
      { id: 'test-raid', eventType: 'raid', enabled: true, template: 'default', duration: 100, animation: 'fade', soundVolume: 50 },
      { id: 'test-bits', eventType: 'bits', enabled: true, template: 'default', duration: 100, animation: 'fade', soundVolume: 50 },
      { id: 'test-gift', eventType: 'gift', enabled: true, template: 'default', duration: 100, animation: 'fade', soundVolume: 50 },
    ];
    
    defaultConfigs.forEach(c => this.configs.set(c.id, c));
    initialConfigs.forEach(c => this.configs.set(c.id, c));
  }

  getConfigs(): AlertConfig[] {
    return Array.from(this.configs.values());
  }

  saveConfig(config: AlertConfig): void {
    this.configs.set(config.id, config);
  }

  deleteConfig(id: string): void {
    this.configs.delete(id);
  }

  getConfigByEvent(eventType: AlertEventType): AlertConfig | null {
    for (const config of this.configs.values()) {
      if (config.eventType === eventType && config.enabled) {
        return config;
      }
    }
    return null;
  }
}

// ============ TESTS ============

describe('AlertService Property Tests', () => {
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

  describe('Property 1: Alert Queue Ordering - FIFO processing', () => {
    /**
     * Feature: stream-enhancements, Property 1: Alert Queue Ordering
     * 
     * For any sequence of alert events, the Alert_System SHALL process them 
     * in FIFO order, with each alert completing before the next begins.
     * 
     * **Validates: Requirements 1.3**
     */
    it('should process alerts in FIFO order', async () => {
      // Use a mock adapter with very short duration for fast testing
      class ShortDurationAdapter extends MockAlertAdapter {
        getConfigByEvent(eventType: AlertEventType): AlertConfig | null {
          const config = super.getConfigByEvent(eventType);
          if (config) {
            return { ...config, duration: 1 }; // 1ms duration for fast testing
          }
          return null;
        }
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(alertEventArb, { minLength: 2, maxLength: 5 }),
          async (events) => {
            const adapter = new ShortDurationAdapter();
            const service = new AlertService(adapter);
            
            const processedEvents: AlertEvent[] = [];
            
            // Register listener to track processed order
            service.onAlert((event) => {
              processedEvents.push(event);
            });
            
            // Enqueue all events
            events.forEach(event => service.enqueue(event));
            
            // Wait for all alerts to process (1ms duration each + buffer)
            await new Promise(resolve => setTimeout(resolve, events.length * 10 + 50));
            
            // Verify FIFO order - events should be processed in the same order they were enqueued
            expect(processedEvents.length).toBe(events.length);
            
            for (let i = 0; i < events.length; i++) {
              expect(processedEvents[i].username).toBe(events[i].username);
              expect(processedEvents[i].type).toBe(events[i].type);
              expect(processedEvents[i].timestamp).toBe(events[i].timestamp);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // 30 second timeout for async property test
  });

  describe('Property 2: Alert Configuration Round-Trip', () => {
    /**
     * Feature: stream-enhancements, Property 2: Alert Configuration Round-Trip
     * 
     * For any valid AlertConfig, saving it and then loading all configs 
     * SHALL return a collection containing an equivalent config.
     * 
     * **Validates: Requirements 1.6, 1.7**
     */
    it('should persist and retrieve alert configs correctly', () => {
      fc.assert(
        fc.property(
          alertConfigArb,
          (config) => {
            // Clear localStorage for fresh test
            localStorage.clear();
            
            // Create adapter and save config
            const adapter1 = new LocalStorageAlertAdapter();
            adapter1.saveConfig(config);
            
            // Create new adapter instance (simulates app reload)
            const adapter2 = new LocalStorageAlertAdapter();
            const loadedConfigs = adapter2.getConfigs();
            
            // Find the saved config
            const loadedConfig = loadedConfigs.find(c => c.id === config.id);
            
            expect(loadedConfig).toBeDefined();
            expect(loadedConfig!.id).toBe(config.id);
            expect(loadedConfig!.eventType).toBe(config.eventType);
            expect(loadedConfig!.enabled).toBe(config.enabled);
            expect(loadedConfig!.template).toBe(config.template);
            expect(loadedConfig!.duration).toBe(config.duration);
            expect(loadedConfig!.animation).toBe(config.animation);
            expect(loadedConfig!.soundVolume).toBe(config.soundVolume);
            expect(loadedConfig!.soundUrl).toBe(config.soundUrl);
            expect(loadedConfig!.customMessage).toBe(config.customMessage);
            expect(loadedConfig!.customImage).toBe(config.customImage);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
