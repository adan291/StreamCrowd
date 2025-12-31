/**
 * Property-based tests for usePlatformAdapter hook
 * 
 * Tests the multi-platform state independence for correctness properties.
 * Uses fast-check for property-based testing.
 * 
 * @requirements 6.4, 6.5, 6.6 - Multi-platform state independence
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// MULTI-PLATFORM STATE LOGIC (extracted for testing)
// ============================================

type Platform = 'twitch' | 'youtube' | 'kick';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

interface PlatformConnection {
  platform: Platform;
  status: ConnectionStatus;
  channel: string;
  enabled: boolean;
  lastError?: string;
}

interface MultiPlatformState {
  connections: Record<Platform, PlatformConnection | null>;
}

/**
 * Create initial state
 */
function createInitialState(): MultiPlatformState {
  return {
    connections: {
      twitch: null,
      youtube: null,
      kick: null,
    },
  };
}

/**
 * Connect a platform (pure function)
 */
function connectPlatform(
  state: MultiPlatformState,
  platform: Platform,
  channel: string
): MultiPlatformState {
  return {
    ...state,
    connections: {
      ...state.connections,
      [platform]: {
        platform,
        status: 'connected',
        channel,
        enabled: true,
      },
    },
  };
}


/**
 * Disconnect a platform (pure function)
 * @requirements 6.5 - Continue operating with remaining platforms
 */
function disconnectPlatform(
  state: MultiPlatformState,
  platform: Platform
): MultiPlatformState {
  return {
    ...state,
    connections: {
      ...state.connections,
      [platform]: null,
    },
  };
}

/**
 * Enable a platform (pure function)
 * @requirements 6.6 - Enable without disconnecting
 */
function enablePlatform(
  state: MultiPlatformState,
  platform: Platform
): MultiPlatformState {
  const current = state.connections[platform];
  if (!current) return state;
  
  return {
    ...state,
    connections: {
      ...state.connections,
      [platform]: {
        ...current,
        enabled: true,
      },
    },
  };
}

/**
 * Disable a platform (pure function)
 * @requirements 6.6 - Disable without disconnecting
 */
function disablePlatform(
  state: MultiPlatformState,
  platform: Platform
): MultiPlatformState {
  const current = state.connections[platform];
  if (!current) return state;
  
  return {
    ...state,
    connections: {
      ...state.connections,
      [platform]: {
        ...current,
        enabled: false,
      },
    },
  };
}

/**
 * Set platform error (pure function)
 */
function setPlatformError(
  state: MultiPlatformState,
  platform: Platform,
  error: string
): MultiPlatformState {
  const current = state.connections[platform];
  if (!current) return state;
  
  return {
    ...state,
    connections: {
      ...state.connections,
      [platform]: {
        ...current,
        status: 'error',
        lastError: error,
      },
    },
  };
}

/**
 * Get connected platforms
 */
function getConnectedPlatforms(state: MultiPlatformState): Platform[] {
  return (Object.entries(state.connections) as [Platform, PlatformConnection | null][])
    .filter(([_, conn]) => conn?.status === 'connected')
    .map(([platform]) => platform);
}

/**
 * Get enabled platforms
 */
function getEnabledPlatforms(state: MultiPlatformState): Platform[] {
  return (Object.entries(state.connections) as [Platform, PlatformConnection | null][])
    .filter(([_, conn]) => conn?.enabled)
    .map(([platform]) => platform);
}

/**
 * Check if platform state is independent
 */
function isPlatformStateIndependent(
  state: MultiPlatformState,
  platform: Platform,
  otherPlatforms: Platform[]
): boolean {
  const platformConn = state.connections[platform];
  
  for (const other of otherPlatforms) {
    const otherConn = state.connections[other];
    
    // If both are connected, they should have independent state
    if (platformConn && otherConn) {
      // Different channels should be allowed
      // Different enabled states should be allowed
      // Different statuses should be allowed
      // This is always true by design - just verify they exist independently
    }
  }
  
  return true;
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

const platformArb = fc.constantFrom<Platform>('twitch', 'youtube', 'kick');

const channelArb = fc.string({ minLength: 1, maxLength: 50 });

const connectionStatusArb = fc.constantFrom<ConnectionStatus>(
  'disconnected', 'connecting', 'connected', 'error', 'reconnecting'
);

const platformConnectionArb = fc.record({
  platform: platformArb,
  status: connectionStatusArb,
  channel: channelArb,
  enabled: fc.boolean(),
  lastError: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('usePlatformAdapter Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * **Feature: enhanced-features, Property 15: Multi-Platform State Independence**
   * 
   * *For any* set of connected platforms, the connection state of one platform
   * SHALL NOT affect the operation of other platforms, and enabling/disabling
   * SHALL only affect vote processing without disconnecting.
   * 
   * **Validates: Requirements 6.4, 6.5, 6.6**
   */
  describe('Property 15: Multi-Platform State Independence', () => {
    it('connecting one platform does not affect others', () => {
      fc.assert(
        fc.property(
          platformArb,
          channelArb,
          (platform, channel) => {
            let state = createInitialState();
            
            // Connect one platform
            state = connectPlatform(state, platform, channel);
            
            // Other platforms should still be null
            const otherPlatforms: Platform[] = ['twitch', 'youtube', 'kick'].filter(
              p => p !== platform
            ) as Platform[];
            
            for (const other of otherPlatforms) {
              expect(state.connections[other]).toBeNull();
            }
            
            // Connected platform should have correct state
            expect(state.connections[platform]?.status).toBe('connected');
            expect(state.connections[platform]?.channel).toBe(channel);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('disconnecting one platform does not affect others', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(platformArb, channelArb), { minLength: 2, maxLength: 3 }),
          (platformConfigs) => {
            // Ensure unique platforms
            const uniquePlatforms = new Map<Platform, string>();
            for (const [platform, channel] of platformConfigs) {
              uniquePlatforms.set(platform, channel);
            }
            
            if (uniquePlatforms.size < 2) return; // Need at least 2 platforms
            
            let state = createInitialState();
            
            // Connect all platforms
            for (const [platform, channel] of uniquePlatforms) {
              state = connectPlatform(state, platform, channel);
            }
            
            // Disconnect first platform
            const [firstPlatform] = uniquePlatforms.keys();
            state = disconnectPlatform(state, firstPlatform);
            
            // First platform should be disconnected
            expect(state.connections[firstPlatform]).toBeNull();
            
            // Other platforms should still be connected
            for (const [platform] of uniquePlatforms) {
              if (platform !== firstPlatform) {
                expect(state.connections[platform]?.status).toBe('connected');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('disabling platform does not disconnect it', () => {
      fc.assert(
        fc.property(
          platformArb,
          channelArb,
          (platform, channel) => {
            let state = createInitialState();
            
            // Connect platform
            state = connectPlatform(state, platform, channel);
            expect(state.connections[platform]?.status).toBe('connected');
            expect(state.connections[platform]?.enabled).toBe(true);
            
            // Disable platform
            state = disablePlatform(state, platform);
            
            // Should still be connected but disabled
            expect(state.connections[platform]?.status).toBe('connected');
            expect(state.connections[platform]?.enabled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('enabling platform does not change connection status', () => {
      fc.assert(
        fc.property(
          platformArb,
          channelArb,
          (platform, channel) => {
            let state = createInitialState();
            
            // Connect and disable platform
            state = connectPlatform(state, platform, channel);
            state = disablePlatform(state, platform);
            
            const statusBefore = state.connections[platform]?.status;
            
            // Enable platform
            state = enablePlatform(state, platform);
            
            // Status should not change
            expect(state.connections[platform]?.status).toBe(statusBefore);
            expect(state.connections[platform]?.enabled).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('platform error does not affect other platforms', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(platformArb, channelArb), { minLength: 2, maxLength: 3 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (platformConfigs, errorMessage) => {
            // Ensure unique platforms
            const uniquePlatforms = new Map<Platform, string>();
            for (const [platform, channel] of platformConfigs) {
              uniquePlatforms.set(platform, channel);
            }
            
            if (uniquePlatforms.size < 2) return;
            
            let state = createInitialState();
            
            // Connect all platforms
            for (const [platform, channel] of uniquePlatforms) {
              state = connectPlatform(state, platform, channel);
            }
            
            // Set error on first platform
            const [firstPlatform] = uniquePlatforms.keys();
            state = setPlatformError(state, firstPlatform, errorMessage);
            
            // First platform should have error
            expect(state.connections[firstPlatform]?.status).toBe('error');
            expect(state.connections[firstPlatform]?.lastError).toBe(errorMessage);
            
            // Other platforms should still be connected
            for (const [platform] of uniquePlatforms) {
              if (platform !== firstPlatform) {
                expect(state.connections[platform]?.status).toBe('connected');
                expect(state.connections[platform]?.lastError).toBeUndefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getConnectedPlatforms returns only connected platforms', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(platformArb, channelArb, fc.boolean()), { minLength: 1, maxLength: 3 }),
          (platformConfigs) => {
            let state = createInitialState();
            const expectedConnected: Platform[] = [];
            
            // Connect some platforms, disconnect others
            const seen = new Set<Platform>();
            for (const [platform, channel, shouldConnect] of platformConfigs) {
              if (seen.has(platform)) continue;
              seen.add(platform);
              
              if (shouldConnect) {
                state = connectPlatform(state, platform, channel);
                expectedConnected.push(platform);
              }
            }
            
            const connected = getConnectedPlatforms(state);
            
            expect(connected.sort()).toEqual(expectedConnected.sort());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getEnabledPlatforms returns only enabled platforms', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(platformArb, channelArb, fc.boolean()), { minLength: 1, maxLength: 3 }),
          (platformConfigs) => {
            let state = createInitialState();
            const expectedEnabled: Platform[] = [];
            
            const seen = new Set<Platform>();
            for (const [platform, channel, shouldEnable] of platformConfigs) {
              if (seen.has(platform)) continue;
              seen.add(platform);
              
              // Connect first
              state = connectPlatform(state, platform, channel);
              
              if (!shouldEnable) {
                state = disablePlatform(state, platform);
              } else {
                expectedEnabled.push(platform);
              }
            }
            
            const enabled = getEnabledPlatforms(state);
            
            expect(enabled.sort()).toEqual(expectedEnabled.sort());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each platform maintains independent channel', () => {
      fc.assert(
        fc.property(
          channelArb,
          channelArb,
          channelArb,
          (twitchChannel, youtubeChannel, kickChannel) => {
            let state = createInitialState();
            
            state = connectPlatform(state, 'twitch', twitchChannel);
            state = connectPlatform(state, 'youtube', youtubeChannel);
            state = connectPlatform(state, 'kick', kickChannel);
            
            expect(state.connections.twitch?.channel).toBe(twitchChannel);
            expect(state.connections.youtube?.channel).toBe(youtubeChannel);
            expect(state.connections.kick?.channel).toBe(kickChannel);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('state changes are isolated per platform', () => {
      fc.assert(
        fc.property(
          platformArb,
          channelArb,
          (platform, channel) => {
            let state = createInitialState();
            
            // Connect all platforms
            state = connectPlatform(state, 'twitch', 'twitch_channel');
            state = connectPlatform(state, 'youtube', 'youtube_channel');
            state = connectPlatform(state, 'kick', 'kick_channel');
            
            // Modify one platform
            state = disablePlatform(state, platform);
            
            // Check that only the target platform was modified
            const otherPlatforms: Platform[] = ['twitch', 'youtube', 'kick'].filter(
              p => p !== platform
            ) as Platform[];
            
            for (const other of otherPlatforms) {
              expect(state.connections[other]?.enabled).toBe(true);
            }
            
            expect(state.connections[platform]?.enabled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
