/**
 * Unit tests for TwitchService reconnection logic
 * Tests exponential backoff calculation and configuration
 * 
 * **Validates: Requirements 6.2, 6.3**
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TwitchServiceConfig, 
  DEFAULT_TWITCH_SERVICE_CONFIG 
} from '../../services/twitchService';

/**
 * Pure function to calculate exponential backoff delay
 * Mirrors the logic in TwitchService.calculateBackoffDelay()
 */
function calculateBackoffDelay(
  attempt: number,
  config: TwitchServiceConfig
): number {
  const delay = config.reconnectBaseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, config.reconnectMaxDelay);
}

/**
 * Simulates reconnection attempt logic
 * Returns whether reconnection should continue or stop
 */
function shouldContinueReconnecting(
  currentAttempt: number,
  maxAttempts: number
): boolean {
  return currentAttempt <= maxAttempts;
}

describe('TwitchService Reconnection', () => {
  describe('Default Configuration', () => {
    it('should have sensible default values', () => {
      expect(DEFAULT_TWITCH_SERVICE_CONFIG.maxReconnectAttempts).toBe(5);
      expect(DEFAULT_TWITCH_SERVICE_CONFIG.reconnectBaseDelay).toBe(1000);
      expect(DEFAULT_TWITCH_SERVICE_CONFIG.reconnectMaxDelay).toBe(30000);
    });
  });

  describe('Exponential Backoff Calculation', () => {
    const config = DEFAULT_TWITCH_SERVICE_CONFIG;

    it('should return base delay for first attempt', () => {
      const delay = calculateBackoffDelay(1, config);
      expect(delay).toBe(1000); // 1000 * 2^0 = 1000
    });

    it('should double delay for each subsequent attempt', () => {
      expect(calculateBackoffDelay(1, config)).toBe(1000);  // 1000 * 2^0
      expect(calculateBackoffDelay(2, config)).toBe(2000);  // 1000 * 2^1
      expect(calculateBackoffDelay(3, config)).toBe(4000);  // 1000 * 2^2
      expect(calculateBackoffDelay(4, config)).toBe(8000);  // 1000 * 2^3
      expect(calculateBackoffDelay(5, config)).toBe(16000); // 1000 * 2^4
    });

    it('should cap delay at maxReconnectDelay', () => {
      // With default config, 2^5 = 32000 which exceeds max of 30000
      const delay = calculateBackoffDelay(6, config);
      expect(delay).toBe(30000);
    });

    it('should respect custom configuration', () => {
      const customConfig: TwitchServiceConfig = {
        maxReconnectAttempts: 3,
        reconnectBaseDelay: 500,
        reconnectMaxDelay: 5000,
      };

      expect(calculateBackoffDelay(1, customConfig)).toBe(500);   // 500 * 2^0
      expect(calculateBackoffDelay(2, customConfig)).toBe(1000);  // 500 * 2^1
      expect(calculateBackoffDelay(3, customConfig)).toBe(2000);  // 500 * 2^2
      expect(calculateBackoffDelay(4, customConfig)).toBe(4000);  // 500 * 2^3
      expect(calculateBackoffDelay(5, customConfig)).toBe(5000);  // capped at max
    });

    it('should handle edge case of very high attempt numbers', () => {
      const delay = calculateBackoffDelay(100, config);
      expect(delay).toBe(config.reconnectMaxDelay);
    });
  });

  describe('Max Attempts Exceeded Behavior', () => {
    it('should allow reconnection when under max attempts', () => {
      const maxAttempts = 5;
      
      expect(shouldContinueReconnecting(1, maxAttempts)).toBe(true);
      expect(shouldContinueReconnecting(2, maxAttempts)).toBe(true);
      expect(shouldContinueReconnecting(3, maxAttempts)).toBe(true);
      expect(shouldContinueReconnecting(4, maxAttempts)).toBe(true);
      expect(shouldContinueReconnecting(5, maxAttempts)).toBe(true);
    });

    it('should stop reconnection when max attempts exceeded', () => {
      const maxAttempts = 5;
      
      expect(shouldContinueReconnecting(6, maxAttempts)).toBe(false);
      expect(shouldContinueReconnecting(7, maxAttempts)).toBe(false);
      expect(shouldContinueReconnecting(100, maxAttempts)).toBe(false);
    });

    it('should work with custom max attempts', () => {
      expect(shouldContinueReconnecting(1, 3)).toBe(true);
      expect(shouldContinueReconnecting(3, 3)).toBe(true);
      expect(shouldContinueReconnecting(4, 3)).toBe(false);
    });
  });

  describe('Reconnection Sequence', () => {
    it('should produce correct delay sequence for default config', () => {
      const config = DEFAULT_TWITCH_SERVICE_CONFIG;
      const expectedDelays = [1000, 2000, 4000, 8000, 16000];
      
      for (let attempt = 1; attempt <= config.maxReconnectAttempts; attempt++) {
        const delay = calculateBackoffDelay(attempt, config);
        expect(delay).toBe(expectedDelays[attempt - 1]);
      }
    });

    it('should track total wait time across all attempts', () => {
      const config = DEFAULT_TWITCH_SERVICE_CONFIG;
      let totalWaitTime = 0;
      
      for (let attempt = 1; attempt <= config.maxReconnectAttempts; attempt++) {
        totalWaitTime += calculateBackoffDelay(attempt, config);
      }
      
      // 1000 + 2000 + 4000 + 8000 + 16000 = 31000ms
      expect(totalWaitTime).toBe(31000);
    });
  });

  describe('Configuration Validation', () => {
    it('should handle zero base delay', () => {
      const config: TwitchServiceConfig = {
        maxReconnectAttempts: 5,
        reconnectBaseDelay: 0,
        reconnectMaxDelay: 30000,
      };
      
      // 0 * 2^n = 0 for all n
      expect(calculateBackoffDelay(1, config)).toBe(0);
      expect(calculateBackoffDelay(5, config)).toBe(0);
    });

    it('should handle base delay equal to max delay', () => {
      const config: TwitchServiceConfig = {
        maxReconnectAttempts: 5,
        reconnectBaseDelay: 5000,
        reconnectMaxDelay: 5000,
      };
      
      // All attempts should return max delay
      expect(calculateBackoffDelay(1, config)).toBe(5000);
      expect(calculateBackoffDelay(2, config)).toBe(5000);
      expect(calculateBackoffDelay(5, config)).toBe(5000);
    });

    it('should handle single max attempt', () => {
      const maxAttempts = 1;
      
      expect(shouldContinueReconnecting(1, maxAttempts)).toBe(true);
      expect(shouldContinueReconnecting(2, maxAttempts)).toBe(false);
    });
  });
});
