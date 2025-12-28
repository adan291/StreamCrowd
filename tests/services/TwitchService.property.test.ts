/**
 * Property-based tests for TwitchService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the Twitch connection service.
 * 
 * @requirements 4.1, 4.2, 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { TwitchService, DEFAULT_TWITCH_SERVICE_CONFIG } from '../../src/application/services/TwitchService';
import { TwitchAdapter } from '../../src/infrastructure/adapters/TwitchAdapter';

// ============ MOCKS ============

// Create a mock TwitchAdapter
const createMockAdapter = () => {
  const mockAdapter = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    getConnectionStatus: vi.fn().mockReturnValue('disconnected'),
    getCurrentChannel: vi.fn().mockReturnValue(null),
    sendMessage: vi.fn().mockResolvedValue(true),
    onMessage: vi.fn().mockReturnValue(() => {}),
    onStatusChange: vi.fn().mockReturnValue(() => {}),
    onStreamEvent: vi.fn().mockReturnValue(() => {}),
    getReconnectAttempts: vi.fn().mockReturnValue(0),
    setConfig: vi.fn(),
    calculateBackoffDelay: vi.fn((attempt: number) => {
      const baseDelay = 1000;
      const maxDelay = 30000;
      return Math.min(maxDelay, baseDelay * Math.pow(2, attempt - 1));
    }),
    addChannel: vi.fn().mockResolvedValue(true),
    removeChannel: vi.fn(),
    validateToken: vi.fn().mockResolvedValue(null),
    revokeToken: vi.fn().mockResolvedValue(true),
    getCurrentToken: vi.fn().mockReturnValue(null),
    getUserId: vi.fn().mockResolvedValue(null),
    getChatters: vi.fn().mockResolvedValue(null),
    getSubscribers: vi.fn().mockResolvedValue(null),
    getBitsLeaderboard: vi.fn().mockResolvedValue(null),
    getClips: vi.fn().mockResolvedValue(null),
    getVideos: vi.fn().mockResolvedValue(null),
    getModerators: vi.fn().mockResolvedValue(null),
    getVIPs: vi.fn().mockResolvedValue(null),
    banUser: vi.fn().mockResolvedValue(true),
    timeoutUser: vi.fn().mockResolvedValue(true),
    unbanUser: vi.fn().mockResolvedValue(true),
    getChattersDetailed: vi.fn().mockResolvedValue(null),
    getViewerCount: vi.fn().mockResolvedValue(null),
    getChannelInfo: vi.fn().mockResolvedValue(null),
  } as unknown as TwitchAdapter;
  
  return mockAdapter;
};

// ============ ARBITRARIES ============

const channelNameArb = fc.string({ minLength: 3, maxLength: 25 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s))
  .map(s => s.toLowerCase());

// ============ TESTS ============

describe('TwitchService Property Tests', () => {
  let service: TwitchService;
  let mockAdapter: TwitchAdapter;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    service = new TwitchService(mockAdapter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 23: Reconnection Backoff - Delay increases exponentially', () => {
    /**
     * Reconnection delay should increase exponentially up to maxDelay.
     * 
     * @validates Requirements 4.1, 4.5
     */
    it('should calculate exponential backoff correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Attempt number
          fc.integer({ min: 500, max: 5000 }), // Base delay
          fc.integer({ min: 10000, max: 60000 }), // Max delay
          (attempt, baseDelay, maxDelay) => {
            const testService = new TwitchService(mockAdapter, {
              maxReconnectAttempts: 10,
              reconnectBaseDelay: baseDelay,
              reconnectMaxDelay: maxDelay,
            });
            
            // Mock the adapter's calculateBackoffDelay to use our config
            (mockAdapter.calculateBackoffDelay as ReturnType<typeof vi.fn>).mockImplementation((a: number) => {
              return Math.min(maxDelay, baseDelay * Math.pow(2, a - 1));
            });
            
            const delay = testService.calculateBackoffDelay(attempt);
            
            // Delay should be at least baseDelay
            expect(delay).toBeGreaterThanOrEqual(baseDelay);
            
            // Delay should not exceed maxDelay
            expect(delay).toBeLessThanOrEqual(maxDelay);
            
            // For attempt > 1, delay should be greater than or equal to previous attempt
            if (attempt > 1) {
              const previousDelay = testService.calculateBackoffDelay(attempt - 1);
              expect(delay).toBeGreaterThanOrEqual(previousDelay);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 24: Reconnection Backoff - First attempt uses base delay', () => {
    /**
     * The first reconnection attempt should use the base delay.
     * 
     * @validates Requirements 4.1
     */
    it('should use base delay for first attempt', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500, max: 5000 }), // Base delay
          fc.integer({ min: 10000, max: 60000 }), // Max delay
          (baseDelay, maxDelay) => {
            const testService = new TwitchService(mockAdapter, {
              maxReconnectAttempts: 5,
              reconnectBaseDelay: baseDelay,
              reconnectMaxDelay: maxDelay,
            });
            
            (mockAdapter.calculateBackoffDelay as ReturnType<typeof vi.fn>).mockImplementation((a: number) => {
              return Math.min(maxDelay, baseDelay * Math.pow(2, a - 1));
            });
            
            const firstDelay = testService.calculateBackoffDelay(1);
            expect(firstDelay).toBe(baseDelay);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 25: Collaboration Channels - addCollaborationChannel adds channel', () => {
    /**
     * addCollaborationChannel should add the channel to the list.
     * 
     * @validates Requirements 4.2
     */
    it('should add collaboration channels correctly', async () => {
      // Set up mock to return a current channel
      (mockAdapter.getCurrentChannel as ReturnType<typeof vi.fn>).mockReturnValue('mainchannel');
      
      await fc.assert(
        fc.asyncProperty(
          channelNameArb.filter(c => c !== 'mainchannel'),
          async (channelName) => {
            const result = await service.addCollaborationChannel(channelName);
            
            expect(result).not.toBeNull();
            expect(result?.name).toBe(channelName.toLowerCase());
            expect(result?.isMain).toBe(false);
            
            const channels = service.getCollaborationChannels();
            expect(channels.some(c => c.name === channelName.toLowerCase())).toBe(true);
            
            // Clean up
            service.removeCollaborationChannel(channelName);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 26: Collaboration Channels - removeCollaborationChannel removes channel', () => {
    /**
     * removeCollaborationChannel should remove the channel from the list.
     * 
     * @validates Requirements 4.2
     */
    it('should remove collaboration channels correctly', async () => {
      (mockAdapter.getCurrentChannel as ReturnType<typeof vi.fn>).mockReturnValue('mainchannel');
      
      await fc.assert(
        fc.asyncProperty(
          channelNameArb.filter(c => c !== 'mainchannel'),
          async (channelName) => {
            // First add the channel
            await service.addCollaborationChannel(channelName);
            
            // Verify it was added
            let channels = service.getCollaborationChannels();
            expect(channels.some(c => c.name === channelName.toLowerCase())).toBe(true);
            
            // Remove the channel
            service.removeCollaborationChannel(channelName);
            
            // Verify it was removed
            channels = service.getCollaborationChannels();
            expect(channels.some(c => c.name === channelName.toLowerCase())).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 27: Collaboration Channels - No duplicate channels', () => {
    /**
     * Adding the same channel twice should not create duplicates.
     * 
     * @validates Requirements 4.2
     */
    it('should not add duplicate collaboration channels', async () => {
      (mockAdapter.getCurrentChannel as ReturnType<typeof vi.fn>).mockReturnValue('mainchannel');
      
      await fc.assert(
        fc.asyncProperty(
          channelNameArb.filter(c => c !== 'mainchannel'),
          async (channelName) => {
            // Add the channel twice
            const result1 = await service.addCollaborationChannel(channelName);
            const result2 = await service.addCollaborationChannel(channelName);
            
            // First add should succeed
            expect(result1).not.toBeNull();
            
            // Second add should return the existing channel (not null, but same channel)
            expect(result2).not.toBeNull();
            expect(result2?.name).toBe(channelName.toLowerCase());
            
            // Should only have one instance
            const channels = service.getCollaborationChannels();
            const matchingChannels = channels.filter(c => c.name === channelName.toLowerCase());
            expect(matchingChannels.length).toBe(1);
            
            // Clean up
            service.removeCollaborationChannel(channelName);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property: Cannot add main channel as collaboration', () => {
    /**
     * The main channel should not be addable as a collaboration channel.
     * 
     * @validates Requirements 4.2
     */
    it('should not add main channel as collaboration', async () => {
      fc.assert(
        fc.asyncProperty(
          channelNameArb,
          async (channelName) => {
            // Set the main channel to be the same as the one we're trying to add
            (mockAdapter.getCurrentChannel as ReturnType<typeof vi.fn>).mockReturnValue(channelName);
            
            const result = await service.addCollaborationChannel(channelName);
            
            // Should return null because it's the main channel
            expect(result).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property: Config updates are applied', () => {
    /**
     * Configuration updates should be reflected in getConfig.
     * 
     * @validates Requirements 4.1
     */
    it('should apply config updates correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // maxReconnectAttempts
          fc.integer({ min: 100, max: 10000 }), // reconnectBaseDelay
          fc.integer({ min: 10000, max: 120000 }), // reconnectMaxDelay
          (maxAttempts, baseDelay, maxDelay) => {
            service.setConfig({
              maxReconnectAttempts: maxAttempts,
              reconnectBaseDelay: baseDelay,
              reconnectMaxDelay: maxDelay,
            });
            
            const config = service.getConfig();
            
            expect(config.maxReconnectAttempts).toBe(maxAttempts);
            expect(config.reconnectBaseDelay).toBe(baseDelay);
            expect(config.reconnectMaxDelay).toBe(maxDelay);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
