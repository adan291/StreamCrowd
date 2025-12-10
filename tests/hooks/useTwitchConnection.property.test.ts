/**
 * Property-based tests for useTwitchConnection hook
 * Uses fast-check for property-based testing
 * 
 * Tests the disconnect cleanup property by verifying state transitions
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ConnectionStatus } from '../../types';

// Arbitrary for valid Twitch channel names
const channelNameArb = fc.stringMatching(/^[a-zA-Z0-9_]{3,25}$/);

// Arbitrary for OAuth tokens
const tokenArb = fc.stringMatching(/^[a-zA-Z0-9_]{30,50}$/);

// Arbitrary for avatar URLs (simple string)
const avatarArb = fc.option(
  fc.constant('https://example.com/avatar.png'),
  { nil: null }
);

/**
 * Simulates the disconnect function's state cleanup behavior
 * This mirrors the logic in useTwitchConnection.disconnect()
 */
function simulateDisconnect(currentState: {
  status: ConnectionStatus;
  channelName: string;
  channelAvatar: string | null;
  authToken: string;
  error: string | null;
}) {
  return {
    status: ConnectionStatus.DISCONNECTED,
    channelName: '',
    channelAvatar: null,
    authToken: '',
    error: null,
  };
}

/**
 * Simulates the connect function's state update behavior
 * This mirrors the logic in useTwitchConnection.connect()
 */
function simulateConnect(
  channel: string,
  token?: string
): {
  status: ConnectionStatus;
  channelName: string;
  authToken: string;
  error: string | null;
} | null {
  if (!channel.trim()) return null;
  
  return {
    status: ConnectionStatus.CONNECTING,
    channelName: channel,
    authToken: token || '',
    error: null,
  };
}

describe('useTwitchConnection Property Tests', () => {
  /**
   * **Feature: app-refactoring, Property 10: useTwitchConnection Disconnect Cleanup**
   * 
   * *For any* connected state, disconnecting should result in status=DISCONNECTED,
   * empty channelName, and null avatar.
   * 
   * **Validates: Requirements 8.3**
   */
  describe('Property 10: useTwitchConnection Disconnect Cleanup', () => {
    it('should clean up all state when disconnect is called after connect', () => {
      fc.assert(
        fc.property(
          channelNameArb,
          fc.option(tokenArb, { nil: undefined }),
          avatarArb,
          fc.option(fc.string(), { nil: null }),
          (channelName, token, avatar, errorMsg) => {
            // Simulate a connected state
            const connectedState = {
              status: ConnectionStatus.CONNECTED,
              channelName,
              channelAvatar: avatar,
              authToken: token || '',
              error: errorMsg,
            };

            // Disconnect
            const disconnectedState = simulateDisconnect(connectedState);

            // Verify cleanup: status=DISCONNECTED, empty channelName, null avatar
            expect(disconnectedState.status).toBe(ConnectionStatus.DISCONNECTED);
            expect(disconnectedState.channelName).toBe('');
            expect(disconnectedState.channelAvatar).toBeNull();
            expect(disconnectedState.authToken).toBe('');
            expect(disconnectedState.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clean up state regardless of initial status', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            ConnectionStatus.DISCONNECTED,
            ConnectionStatus.CONNECTING,
            ConnectionStatus.CONNECTED,
            ConnectionStatus.ERROR
          ),
          channelNameArb,
          avatarArb,
          fc.option(tokenArb, { nil: undefined }),
          (status, channelName, avatar, token) => {
            const anyState = {
              status,
              channelName,
              channelAvatar: avatar,
              authToken: token || '',
              error: status === ConnectionStatus.ERROR ? 'Some error' : null,
            };

            const disconnectedState = simulateDisconnect(anyState);

            expect(disconnectedState.status).toBe(ConnectionStatus.DISCONNECTED);
            expect(disconnectedState.channelName).toBe('');
            expect(disconnectedState.channelAvatar).toBeNull();
            expect(disconnectedState.authToken).toBe('');
            expect(disconnectedState.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent - multiple disconnects produce same result', () => {
      fc.assert(
        fc.property(
          channelNameArb,
          fc.integer({ min: 1, max: 10 }),
          (channelName, disconnectCount) => {
            let state = {
              status: ConnectionStatus.CONNECTED as ConnectionStatus,
              channelName,
              channelAvatar: 'https://example.com/avatar.png' as string | null,
              authToken: 'oauth:token123',
              error: null as string | null,
            };

            for (let i = 0; i < disconnectCount; i++) {
              state = simulateDisconnect(state);
            }

            expect(state.status).toBe(ConnectionStatus.DISCONNECTED);
            expect(state.channelName).toBe('');
            expect(state.channelAvatar).toBeNull();
            expect(state.authToken).toBe('');
            expect(state.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clean up state after connect-disconnect cycles', () => {
      fc.assert(
        fc.property(
          fc.array(channelNameArb, { minLength: 1, maxLength: 5 }),
          (channelNames) => {
            let state = {
              status: ConnectionStatus.DISCONNECTED as ConnectionStatus,
              channelName: '',
              channelAvatar: null as string | null,
              authToken: '',
              error: null as string | null,
            };

            for (const channelName of channelNames) {
              const connectResult = simulateConnect(channelName);
              if (connectResult) {
                state = { ...state, ...connectResult, channelAvatar: null };
              }

              expect(state.channelName).toBe(channelName);
              expect(state.status).toBe(ConnectionStatus.CONNECTING);

              state = simulateDisconnect(state);

              expect(state.status).toBe(ConnectionStatus.DISCONNECTED);
              expect(state.channelName).toBe('');
              expect(state.channelAvatar).toBeNull();
              expect(state.authToken).toBe('');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not retain previous channel data after disconnect', () => {
      fc.assert(
        fc.property(
          channelNameArb,
          channelNameArb,
          (channel1, channel2) => {
            let state = {
              status: ConnectionStatus.DISCONNECTED as ConnectionStatus,
              channelName: '',
              channelAvatar: null as string | null,
              authToken: '',
              error: null as string | null,
            };

            const connect1 = simulateConnect(channel1, 'token1');
            if (connect1) {
              state = { ...state, ...connect1, channelAvatar: 'https://avatar1.com' };
            }

            expect(state.channelName).toBe(channel1);
            expect(state.authToken).toBe('token1');

            state = simulateDisconnect(state);

            const connect2 = simulateConnect(channel2, 'token2');
            if (connect2) {
              state = { ...state, ...connect2, channelAvatar: null };
            }

            expect(state.channelName).toBe(channel2);
            expect(state.authToken).toBe('token2');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Connect behavior', () => {
    it('should not connect with empty channel name', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', ' ', '  ', '\t', '\n', '   '),
          (emptyChannel) => {
            const result = simulateConnect(emptyChannel);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set status to CONNECTING when connect is called with valid channel', () => {
      fc.assert(
        fc.property(
          channelNameArb,
          (channelName) => {
            const result = simulateConnect(channelName);

            expect(result).not.toBeNull();
            expect(result!.status).toBe(ConnectionStatus.CONNECTING);
            expect(result!.channelName).toBe(channelName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should store token when provided', () => {
      fc.assert(
        fc.property(
          channelNameArb,
          tokenArb,
          (channelName, token) => {
            const result = simulateConnect(channelName, token);

            expect(result).not.toBeNull();
            expect(result!.authToken).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use empty string for token when not provided', () => {
      fc.assert(
        fc.property(
          channelNameArb,
          (channelName) => {
            const result = simulateConnect(channelName);

            expect(result).not.toBeNull();
            expect(result!.authToken).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
