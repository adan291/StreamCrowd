/**
 * Property-based tests for AlertConfigService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the alert configuration system.
 * 
 * Feature: push-notifications
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  AlertConfigService,
  resetAlertConfigService,
  parseTimeToMinutes,
  isTimeInQuietHours,
  validateAlertConfig,
} from '../../src/application/services/AlertConfigService';
import {
  AlertConfig,
  NotificationChannel,
  NotificationEventType,
  DEFAULT_ALERT_CONFIG,
} from '../../types/notifications';

// ============ MOCK STORAGE ============

function createMockStorage(): Storage {
  const storage = new Map<string, string>();
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    get length() { return storage.size; },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
  };
}

// ============ ARBITRARIES ============

/**
 * Arbitrary for notification event types
 */
const eventTypeArb: fc.Arbitrary<NotificationEventType> = fc.constantFrom(
  'follower',
  'raid',
  'host',
  'donation',
  'subscription',
  'bits',
  'poll_ended',
  'prediction_resolved',
  'giveaway_winner',
  'command_executed'
);

/**
 * Arbitrary for notification channels
 */
const channelArb: fc.Arbitrary<NotificationChannel> = fc.constantFrom('push', 'discord', 'telegram');

/**
 * Arbitrary for array of unique channels
 */
const channelsArrayArb: fc.Arbitrary<NotificationChannel[]> = fc.array(channelArb, { minLength: 0, maxLength: 3 })
  .map(channels => [...new Set(channels)]);

/**
 * Arbitrary for valid time strings in HH:mm format
 */
const timeStringArb: fc.Arbitrary<string> = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 })
).map(([hours, minutes]) => 
  `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
);

/**
 * Arbitrary for push notification config
 */
const pushConfigArb = fc.record({
  enabled: fc.boolean(),
  permission: fc.constantFrom('granted', 'denied', 'default') as fc.Arbitrary<NotificationPermission>,
});

/**
 * Arbitrary for Discord webhook config
 */
const discordConfigArb = fc.record({
  enabled: fc.boolean(),
  webhookUrl: fc.string({ minLength: 0, maxLength: 200 }),
  username: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  avatarUrl: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
});

/**
 * Arbitrary for Telegram bot config
 */
const telegramConfigArb = fc.record({
  enabled: fc.boolean(),
  botToken: fc.string({ minLength: 0, maxLength: 100 }),
  chatId: fc.string({ minLength: 0, maxLength: 50 }),
});

/**
 * Arbitrary for event notification config
 */
const eventConfigArb = fc.record({
  enabled: fc.boolean(),
  channels: channelsArrayArb,
});

/**
 * Arbitrary for quiet hours config
 */
const quietHoursConfigArb = fc.record({
  enabled: fc.boolean(),
  start: timeStringArb,
  end: timeStringArb,
});

/**
 * Arbitrary for complete AlertConfig
 */
const alertConfigArb: fc.Arbitrary<AlertConfig> = fc.record({
  channels: fc.record({
    push: pushConfigArb,
    discord: discordConfigArb,
    telegram: telegramConfigArb,
  }),
  events: fc.record({
    follower: eventConfigArb,
    raid: eventConfigArb,
    host: eventConfigArb,
    donation: eventConfigArb,
    subscription: eventConfigArb,
    bits: eventConfigArb,
    poll_ended: eventConfigArb,
    prediction_resolved: eventConfigArb,
    giveaway_winner: eventConfigArb,
    command_executed: eventConfigArb,
  }),
  quietHours: quietHoursConfigArb,
});

// ============ TESTS ============

describe('AlertConfigService Property Tests', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    resetAlertConfigService();
    mockStorage = createMockStorage();
  });

  afterEach(() => {
    resetAlertConfigService();
    mockStorage.clear();
  });

  describe('Property 3: Alert Config Round-Trip', () => {
    /**
     * Feature: push-notifications, Property 3: Alert Config Round-Trip
     * 
     * For any valid AlertConfig object, saving to storage and loading back 
     * SHALL produce an equivalent configuration with all channels, events, 
     * and quiet hours settings preserved.
     * 
     * **Validates: Requirements 4.4, 4.8**
     */
    it('should preserve all configuration after save and load round-trip', () => {
      fc.assert(
        fc.property(alertConfigArb, (config) => {
          const service = new AlertConfigService(mockStorage);
          
          // Save the config
          service.saveConfig(config);
          
          // Create a new service instance to load from storage
          resetAlertConfigService();
          const newService = new AlertConfigService(mockStorage);
          const loadedConfig = newService.loadConfig();
          
          // Verify channels are preserved
          expect(loadedConfig.channels.push.enabled).toBe(config.channels.push.enabled);
          expect(loadedConfig.channels.push.permission).toBe(config.channels.push.permission);
          
          expect(loadedConfig.channels.discord.enabled).toBe(config.channels.discord.enabled);
          expect(loadedConfig.channels.discord.webhookUrl).toBe(config.channels.discord.webhookUrl);
          
          expect(loadedConfig.channels.telegram.enabled).toBe(config.channels.telegram.enabled);
          expect(loadedConfig.channels.telegram.botToken).toBe(config.channels.telegram.botToken);
          expect(loadedConfig.channels.telegram.chatId).toBe(config.channels.telegram.chatId);
          
          // Verify events are preserved
          const eventTypes: NotificationEventType[] = [
            'follower', 'raid', 'host', 'donation', 'subscription',
            'bits', 'poll_ended', 'prediction_resolved', 'giveaway_winner', 'command_executed'
          ];
          
          for (const eventType of eventTypes) {
            expect(loadedConfig.events[eventType].enabled).toBe(config.events[eventType].enabled);
            expect(loadedConfig.events[eventType].channels.sort()).toEqual(
              config.events[eventType].channels.sort()
            );
          }
          
          // Verify quiet hours are preserved
          expect(loadedConfig.quietHours.enabled).toBe(config.quietHours.enabled);
          expect(loadedConfig.quietHours.start).toBe(config.quietHours.start);
          expect(loadedConfig.quietHours.end).toBe(config.quietHours.end);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle multiple consecutive save/load cycles', () => {
      fc.assert(
        fc.property(
          fc.array(alertConfigArb, { minLength: 2, maxLength: 5 }),
          (configs) => {
            const service = new AlertConfigService(mockStorage);
            
            // Save and load each config in sequence
            for (const config of configs) {
              service.saveConfig(config);
              const loaded = service.loadConfig();
              
              // Each load should match the most recent save
              expect(loaded.quietHours.enabled).toBe(config.quietHours.enabled);
              expect(loaded.quietHours.start).toBe(config.quietHours.start);
              expect(loaded.quietHours.end).toBe(config.quietHours.end);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return default config when storage is empty', () => {
      const service = new AlertConfigService(mockStorage);
      const config = service.loadConfig();
      
      // Should match default config structure
      expect(config.channels.push.enabled).toBe(DEFAULT_ALERT_CONFIG.channels.push.enabled);
      expect(config.channels.discord.enabled).toBe(DEFAULT_ALERT_CONFIG.channels.discord.enabled);
      expect(config.channels.telegram.enabled).toBe(DEFAULT_ALERT_CONFIG.channels.telegram.enabled);
    });

    it('should handle corrupted storage data gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => {
            try {
              JSON.parse(s);
              return false; // Valid JSON, skip
            } catch {
              return true; // Invalid JSON, use it
            }
          }),
          (corruptedData) => {
            mockStorage.setItem('twitchvote_alert_config', corruptedData);
            
            const service = new AlertConfigService(mockStorage);
            const config = service.loadConfig();
            
            // Should return default config on parse error
            expect(config).toBeDefined();
            expect(config.channels).toBeDefined();
            expect(config.events).toBeDefined();
            expect(config.quietHours).toBeDefined();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Property 5: Quiet Hours Enforcement', () => {
    /**
     * Feature: push-notifications, Property 5: Quiet Hours Enforcement
     * 
     * For any notification event that occurs during configured quiet hours, 
     * the service SHALL suppress all notifications regardless of channel or event type.
     * 
     * **Validates: Requirements 4.5, 4.6**
     */
    it('should return true when current time is within quiet hours', () => {
      fc.assert(
        fc.property(
          timeStringArb,
          timeStringArb,
          (start, end) => {
            const service = new AlertConfigService(mockStorage);
            
            // Enable quiet hours
            service.saveConfig({
              ...DEFAULT_ALERT_CONFIG,
              quietHours: {
                enabled: true,
                start,
                end,
              },
            });
            
            const startMinutes = parseTimeToMinutes(start);
            const endMinutes = parseTimeToMinutes(end);
            
            // Test a time that should be within quiet hours
            let testMinutes: number;
            if (startMinutes <= endMinutes) {
              // Same day range: pick middle point
              testMinutes = Math.floor((startMinutes + endMinutes) / 2);
            } else {
              // Overnight range: pick a point after start
              testMinutes = (startMinutes + 30) % (24 * 60);
            }
            
            // Skip if start equals end (no quiet hours range)
            if (startMinutes === endMinutes) {
              return true;
            }
            
            const testDate = new Date();
            testDate.setHours(Math.floor(testMinutes / 60), testMinutes % 60, 0, 0);
            
            const isActive = service.isQuietHoursActive(testDate);
            
            // Verify the time is actually in the range
            const shouldBeActive = isTimeInQuietHours(testMinutes, startMinutes, endMinutes);
            expect(isActive).toBe(shouldBeActive);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when quiet hours are disabled', () => {
      fc.assert(
        fc.property(
          timeStringArb,
          timeStringArb,
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          (start, end, hour, minute) => {
            const service = new AlertConfigService(mockStorage);
            
            // Disable quiet hours
            service.saveConfig({
              ...DEFAULT_ALERT_CONFIG,
              quietHours: {
                enabled: false,
                start,
                end,
              },
            });
            
            const testDate = new Date();
            testDate.setHours(hour, minute, 0, 0);
            
            // Should always return false when disabled
            expect(service.isQuietHoursActive(testDate)).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle overnight quiet hours correctly', () => {
      const service = new AlertConfigService(mockStorage);
      
      // Set quiet hours from 23:00 to 08:00 (overnight)
      service.saveConfig({
        ...DEFAULT_ALERT_CONFIG,
        quietHours: {
          enabled: true,
          start: '23:00',
          end: '08:00',
        },
      });
      
      // Test times that should be in quiet hours
      const inQuietHours = [
        new Date(2024, 0, 1, 23, 30), // 23:30
        new Date(2024, 0, 1, 0, 0),   // 00:00
        new Date(2024, 0, 1, 3, 0),   // 03:00
        new Date(2024, 0, 1, 7, 59),  // 07:59
      ];
      
      for (const date of inQuietHours) {
        expect(service.isQuietHoursActive(date)).toBe(true);
      }
      
      // Test times that should NOT be in quiet hours
      const notInQuietHours = [
        new Date(2024, 0, 1, 8, 0),   // 08:00
        new Date(2024, 0, 1, 12, 0),  // 12:00
        new Date(2024, 0, 1, 22, 59), // 22:59
      ];
      
      for (const date of notInQuietHours) {
        expect(service.isQuietHoursActive(date)).toBe(false);
      }
    });

    it('should handle same-day quiet hours correctly', () => {
      const service = new AlertConfigService(mockStorage);
      
      // Set quiet hours from 09:00 to 17:00 (same day)
      service.saveConfig({
        ...DEFAULT_ALERT_CONFIG,
        quietHours: {
          enabled: true,
          start: '09:00',
          end: '17:00',
        },
      });
      
      // Test times that should be in quiet hours
      const inQuietHours = [
        new Date(2024, 0, 1, 9, 0),   // 09:00
        new Date(2024, 0, 1, 12, 0),  // 12:00
        new Date(2024, 0, 1, 16, 59), // 16:59
      ];
      
      for (const date of inQuietHours) {
        expect(service.isQuietHoursActive(date)).toBe(true);
      }
      
      // Test times that should NOT be in quiet hours
      const notInQuietHours = [
        new Date(2024, 0, 1, 8, 59),  // 08:59
        new Date(2024, 0, 1, 17, 0),  // 17:00
        new Date(2024, 0, 1, 23, 0),  // 23:00
      ];
      
      for (const date of notInQuietHours) {
        expect(service.isQuietHoursActive(date)).toBe(false);
      }
    });
  });

  describe('Property 6: Event Type Filtering', () => {
    /**
     * Feature: push-notifications, Property 6: Event Type Filtering
     * 
     * For any notification event, only channels that are both enabled AND 
     * configured for that specific event type SHALL receive the notification.
     * 
     * **Validates: Requirements 4.1, 4.2, 4.3**
     */
    it('should return true only when channel is enabled AND event includes channel', () => {
      fc.assert(
        fc.property(
          eventTypeArb,
          channelArb,
          fc.boolean(), // channel enabled
          fc.boolean(), // event enabled
          fc.boolean(), // channel in event's channels list
          (eventType, channel, channelEnabled, eventEnabled, channelInList) => {
            const service = new AlertConfigService(mockStorage);
            
            // Build config based on test parameters
            const config: AlertConfig = JSON.parse(JSON.stringify(DEFAULT_ALERT_CONFIG));
            
            // Set channel enabled state
            config.channels[channel].enabled = channelEnabled;
            
            // Set event enabled state and channels
            config.events[eventType].enabled = eventEnabled;
            config.events[eventType].channels = channelInList ? [channel] : [];
            
            service.saveConfig(config);
            
            const result = service.isEventEnabled(eventType, channel);
            
            // Should only be true if ALL conditions are met
            const expected = channelEnabled && eventEnabled && channelInList;
            expect(result).toBe(expected);
            
            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct channels for each event type', () => {
      fc.assert(
        fc.property(
          eventTypeArb,
          channelsArrayArb,
          fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }), // enabled state for each channel
          (eventType, eventChannels, channelStates) => {
            const service = new AlertConfigService(mockStorage);
            
            const config: AlertConfig = JSON.parse(JSON.stringify(DEFAULT_ALERT_CONFIG));
            
            // Set channel enabled states
            config.channels.push.enabled = channelStates[0];
            config.channels.discord.enabled = channelStates[1];
            config.channels.telegram.enabled = channelStates[2];
            
            // Set event config
            config.events[eventType].enabled = true;
            config.events[eventType].channels = eventChannels;
            
            service.saveConfig(config);
            
            const result = service.getChannelsForEvent(eventType);
            
            // Result should only include channels that are:
            // 1. In the event's channel list
            // 2. Enabled globally
            const allChannels: NotificationChannel[] = ['push', 'discord', 'telegram'];
            const expected = allChannels.filter((ch, idx) => 
              channelStates[idx] && eventChannels.includes(ch)
            );
            
            expect(result.sort()).toEqual(expected.sort());
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when event is disabled', () => {
      fc.assert(
        fc.property(
          eventTypeArb,
          channelsArrayArb,
          (eventType, channels) => {
            const service = new AlertConfigService(mockStorage);
            
            const config: AlertConfig = JSON.parse(JSON.stringify(DEFAULT_ALERT_CONFIG));
            
            // Enable all channels
            config.channels.push.enabled = true;
            config.channels.discord.enabled = true;
            config.channels.telegram.enabled = true;
            
            // Disable the event but set channels
            config.events[eventType].enabled = false;
            config.events[eventType].channels = channels;
            
            service.saveConfig(config);
            
            const result = service.getChannelsForEvent(eventType);
            
            // Should return empty array when event is disabled
            expect(result).toEqual([]);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only enabled channels from getEnabledChannels', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          (pushEnabled, discordEnabled, telegramEnabled) => {
            const service = new AlertConfigService(mockStorage);
            
            const config: AlertConfig = JSON.parse(JSON.stringify(DEFAULT_ALERT_CONFIG));
            config.channels.push.enabled = pushEnabled;
            config.channels.discord.enabled = discordEnabled;
            config.channels.telegram.enabled = telegramEnabled;
            
            service.saveConfig(config);
            
            const result = service.getEnabledChannels();
            
            // Verify each channel's presence matches its enabled state
            expect(result.includes('push')).toBe(pushEnabled);
            expect(result.includes('discord')).toBe(discordEnabled);
            expect(result.includes('telegram')).toBe(telegramEnabled);
            
            // Verify count matches number of enabled channels
            const expectedCount = [pushEnabled, discordEnabled, telegramEnabled].filter(Boolean).length;
            expect(result.length).toBe(expectedCount);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Helper Functions', () => {
    describe('parseTimeToMinutes', () => {
      it('should correctly parse valid time strings', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            (hours, minutes) => {
              const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              const result = parseTimeToMinutes(timeStr);
              
              expect(result).toBe(hours * 60 + minutes);
              
              return result === hours * 60 + minutes;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should return 0 for invalid time strings', () => {
        const invalidTimes = ['', 'invalid', '25:00', '12:60', '12', ':30', null, undefined];
        
        for (const time of invalidTimes) {
          expect(parseTimeToMinutes(time as string)).toBe(0);
        }
      });
    });

    describe('isTimeInQuietHours', () => {
      it('should handle same-day ranges correctly', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 12 * 60 }), // start in first half of day
            fc.integer({ min: 12 * 60, max: 24 * 60 - 1 }), // end in second half
            fc.integer({ min: 0, max: 24 * 60 - 1 }), // test time
            (start, end, current) => {
              const result = isTimeInQuietHours(current, start, end);
              const expected = current >= start && current < end;
              
              expect(result).toBe(expected);
              
              return result === expected;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle overnight ranges correctly', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 18 * 60, max: 24 * 60 - 1 }), // start in evening
            fc.integer({ min: 0, max: 10 * 60 }), // end in morning
            fc.integer({ min: 0, max: 24 * 60 - 1 }), // test time
            (start, end, current) => {
              const result = isTimeInQuietHours(current, start, end);
              const expected = current >= start || current < end;
              
              expect(result).toBe(expected);
              
              return result === expected;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('validateAlertConfig', () => {
      it('should return default config for invalid input', () => {
        const invalidInputs = [null, undefined, '', 123, [], 'string'];
        
        for (const input of invalidInputs) {
          const result = validateAlertConfig(input);
          expect(result).toBeDefined();
          expect(result.channels).toBeDefined();
          expect(result.events).toBeDefined();
          expect(result.quietHours).toBeDefined();
        }
      });

      it('should preserve valid config values', () => {
        fc.assert(
          fc.property(alertConfigArb, (config) => {
            const result = validateAlertConfig(config);
            
            // Should preserve all valid values
            expect(result.channels.push.enabled).toBe(config.channels.push.enabled);
            expect(result.channels.discord.enabled).toBe(config.channels.discord.enabled);
            expect(result.channels.telegram.enabled).toBe(config.channels.telegram.enabled);
            expect(result.quietHours.enabled).toBe(config.quietHours.enabled);
            
            return true;
          }),
          { numRuns: 100 }
        );
      });
    });
  });
});
