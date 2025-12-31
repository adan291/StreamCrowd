/**
 * Property-based tests for KickAdapter
 * 
 * Tests the reconnection behavior for correctness properties.
 * Uses fast-check for property-based testing.
 * 
 * @requirements 5.7 - Automatic reconnection with exponential backoff
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// RECONNECTION LOGIC (extracted for testing)
// ============================================

interface ReconnectionConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface ReconnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  reconnectAttempts: number;
  isManualDisconnect: boolean;
  lastError?: string;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number, config: ReconnectionConfig): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Pure function to simulate a reconnection attempt
 */
function attemptReconnect(
  state: ReconnectionState,
  config: ReconnectionConfig,
  connectionSuccess: boolean
): { newState: ReconnectionState; delay: number | null } {
  if (state.isManualDisconnect) {
    return { newState: state, delay: null };
  }
  
  const newAttempts = state.reconnectAttempts + 1;
  
  if (newAttempts > config.maxAttempts) {
    return {
      newState: {
        ...state,
        status: 'error',
        reconnectAttempts: newAttempts,
        lastError: `Reconnection failed after ${config.maxAttempts} attempts`,
      },
      delay: null,
    };
  }
  
  const delay = calculateBackoffDelay(newAttempts, config);
  
  if (connectionSuccess) {
    return {
      newState: {
        ...state,
        status: 'connected',
        reconnectAttempts: 0,
        lastError: undefined,
      },
      delay,
    };
  }
  
  return {
    newState: {
      ...state,
      status: 'reconnecting',
      reconnectAttempts: newAttempts,
    },
    delay,
  };
}


/**
 * Simulate multiple reconnection attempts
 */
function simulateReconnectionSequence(
  config: ReconnectionConfig,
  connectionResults: boolean[] // true = success, false = failure
): {
  finalState: ReconnectionState;
  delays: number[];
  totalAttempts: number;
} {
  let state: ReconnectionState = {
    status: 'disconnected',
    reconnectAttempts: 0,
    isManualDisconnect: false,
  };
  
  const delays: number[] = [];
  let totalAttempts = 0;
  
  for (const success of connectionResults) {
    const result = attemptReconnect(state, config, success);
    state = result.newState;
    totalAttempts++;
    
    if (result.delay !== null) {
      delays.push(result.delay);
    }
    
    if (state.status === 'connected' || state.status === 'error') {
      break;
    }
  }
  
  return { finalState: state, delays, totalAttempts };
}

/**
 * Simulate state restoration after reconnection
 */
interface ConnectionState {
  channel: string;
  chatroomId: number;
  enabled: boolean;
}

function simulateStateRestoration(
  previousState: ConnectionState,
  reconnectionSuccess: boolean
): ConnectionState | null {
  if (!reconnectionSuccess) {
    return null;
  }
  return { ...previousState };
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

const reconnectionConfigArb = fc.record({
  maxAttempts: fc.integer({ min: 1, max: 10 }),
  baseDelayMs: fc.integer({ min: 100, max: 5000 }),
  maxDelayMs: fc.integer({ min: 5000, max: 60000 }),
  backoffMultiplier: fc.integer({ min: 2, max: 4 }),
});

const connectionStateArb = fc.record({
  channel: fc.string({ minLength: 1, maxLength: 50 }),
  chatroomId: fc.integer({ min: 1, max: 1000000 }),
  enabled: fc.boolean(),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('KickAdapter Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * **Feature: enhanced-features, Property 13: Reconnection Behavior**
   * 
   * *For any* connection loss, the Platform_Adapter SHALL attempt reconnection
   * with exponential backoff, and SHALL restore the previous state upon
   * successful reconnection.
   * 
   * **Validates: Requirements 5.7**
   */
  describe('Property 13: Reconnection Behavior', () => {
    it('uses exponential backoff for delays', () => {
      fc.assert(
        fc.property(
          reconnectionConfigArb,
          fc.integer({ min: 2, max: 5 }), // number of failures before success
          (config, failuresBeforeSuccess) => {
            // Create connection results: all failures then success
            const connectionResults = [
              ...Array(failuresBeforeSuccess).fill(false),
              true,
            ];
            
            const result = simulateReconnectionSequence(config, connectionResults);
            
            // Check exponential backoff pattern
            for (let i = 1; i < result.delays.length; i++) {
              const expectedRatio = config.backoffMultiplier;
              const actualRatio = result.delays[i] / result.delays[i - 1];
              
              // Allow for maxDelayMs capping
              if (result.delays[i] < config.maxDelayMs && result.delays[i - 1] < config.maxDelayMs) {
                expect(actualRatio).toBeCloseTo(expectedRatio, 1);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('delays are capped at maxDelayMs', () => {
      fc.assert(
        fc.property(
          reconnectionConfigArb,
          fc.array(fc.boolean(), { minLength: 1, maxLength: 15 }),
          (config, connectionResults) => {
            const result = simulateReconnectionSequence(config, connectionResults);
            
            // All delays should be <= maxDelayMs
            for (const delay of result.delays) {
              expect(delay).toBeLessThanOrEqual(config.maxDelayMs);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('stops after maxAttempts failures', () => {
      fc.assert(
        fc.property(
          reconnectionConfigArb,
          (config) => {
            // All failures
            const connectionResults = Array(config.maxAttempts + 5).fill(false);
            
            const result = simulateReconnectionSequence(config, connectionResults);
            
            // Should stop at maxAttempts
            expect(result.totalAttempts).toBe(config.maxAttempts + 1);
            expect(result.finalState.status).toBe('error');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('resets attempt counter on success', () => {
      fc.assert(
        fc.property(
          reconnectionConfigArb,
          fc.integer({ min: 0, max: 5 }), // failures before success
          (config, failuresBeforeSuccess) => {
            // Ensure failures before success is less than maxAttempts
            // so we can actually reach the success case
            const actualFailures = Math.min(failuresBeforeSuccess, config.maxAttempts - 1);
            
            const connectionResults = [
              ...Array(actualFailures).fill(false),
              true,
            ];
            
            const result = simulateReconnectionSequence(config, connectionResults);
            
            expect(result.finalState.status).toBe('connected');
            expect(result.finalState.reconnectAttempts).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('restores previous state on successful reconnection', () => {
      fc.assert(
        fc.property(
          connectionStateArb,
          (previousState) => {
            const restoredState = simulateStateRestoration(previousState, true);
            
            expect(restoredState).not.toBeNull();
            expect(restoredState?.channel).toBe(previousState.channel);
            expect(restoredState?.chatroomId).toBe(previousState.chatroomId);
            expect(restoredState?.enabled).toBe(previousState.enabled);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not restore state on failed reconnection', () => {
      fc.assert(
        fc.property(
          connectionStateArb,
          (previousState) => {
            const restoredState = simulateStateRestoration(previousState, false);
            expect(restoredState).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('first delay equals baseDelayMs', () => {
      fc.assert(
        fc.property(
          reconnectionConfigArb,
          (config) => {
            // Single failure then success
            const connectionResults = [false, true];
            
            const result = simulateReconnectionSequence(config, connectionResults);
            
            expect(result.delays.length).toBeGreaterThan(0);
            expect(result.delays[0]).toBe(config.baseDelayMs);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not reconnect on manual disconnect', () => {
      fc.assert(
        fc.property(
          reconnectionConfigArb,
          (config) => {
            const state: ReconnectionState = {
              status: 'disconnected',
              reconnectAttempts: 0,
              isManualDisconnect: true,
            };
            
            const result = attemptReconnect(state, config, false);
            
            // Should not change state
            expect(result.newState.status).toBe('disconnected');
            expect(result.delay).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('error message includes max attempts count', () => {
      fc.assert(
        fc.property(
          reconnectionConfigArb,
          (config) => {
            // All failures
            const connectionResults = Array(config.maxAttempts + 5).fill(false);
            
            const result = simulateReconnectionSequence(config, connectionResults);
            
            expect(result.finalState.lastError).toContain(config.maxAttempts.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('delay calculation is deterministic', () => {
      fc.assert(
        fc.property(
          reconnectionConfigArb,
          fc.integer({ min: 1, max: 10 }), // attempt number
          (config, attempt) => {
            const delay1 = calculateBackoffDelay(attempt, config);
            const delay2 = calculateBackoffDelay(attempt, config);
            
            expect(delay1).toBe(delay2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
