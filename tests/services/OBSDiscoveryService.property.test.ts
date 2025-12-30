/**
 * Property-based tests for OBSDiscoveryService
 * 
 * Tests the OBS discovery service for correctness properties:
 * - Property 1: Discovery Port Scanning
 * - Property 2: Discovery Result Consistency
 * 
 * @requirements 1.1, 1.2, 1.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  OBS_PORTS,
  testConnection,
  discoverOBS,
  saveLastConnection,
  getLastConnection,
  clearLastConnection,
  type OBSInstance,
  type DiscoveryResult,
  type ConnectionTestResult,
} from '../../src/application/services/OBSDiscoveryService';

// Mock WebSocket for testing
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static mockResponses: Map<number, { success: boolean; requiresPassword: boolean; version?: string }> = new Map();
  
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  
  private port: number;
  private closed = false;
  
  constructor(url: string) {
    MockWebSocket.instances.push(this);
    // Extract port from URL
    const match = url.match(/:(\d+)$/);
    this.port = match ? parseInt(match[1]) : 0;
    
    // Simulate async connection
    setTimeout(() => {
      if (this.closed) return;
      
      const mockResponse = MockWebSocket.mockResponses.get(this.port);
      if (mockResponse?.success) {
        this.onopen?.();
        // Send Hello message
        setTimeout(() => {
          if (this.closed) return;
          this.onmessage?.({
            data: JSON.stringify({
              op: 0,
              d: {
                obsWebSocketVersion: mockResponse.version || '5.0.0',
                authentication: mockResponse.requiresPassword ? { challenge: 'test', salt: 'test' } : undefined,
              },
            }),
          });
        }, 10);
      } else {
        this.onerror?.();
      }
    }, 50);
  }
  
  send(_data: string): void {
    // Mock send
  }
  
  close(): void {
    this.closed = true;
    this.onclose?.();
  }
  
  static reset(): void {
    MockWebSocket.instances = [];
    MockWebSocket.mockResponses.clear();
  }
  
  static setPortResponse(port: number, response: { success: boolean; requiresPassword: boolean; version?: string }): void {
    MockWebSocket.mockResponses.set(port, response);
  }
}

// Store original WebSocket
const originalWebSocket = global.WebSocket;

describe('OBSDiscoveryService Property Tests', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    // @ts-expect-error - Mocking WebSocket
    global.WebSocket = MockWebSocket;
    clearLastConnection();
  });
  
  afterEach(() => {
    global.WebSocket = originalWebSocket;
    MockWebSocket.reset();
  });

  /**
   * Property 1: Discovery Port Scanning
   * For any discovery attempt, the system SHALL check all ports in OBS_PORTS array.
   * @validates Requirements 1.1, 1.3
   */
  describe('Property 1: Discovery Port Scanning', () => {
    it('should scan all defined OBS ports', async () => {
      // Setup: All ports fail
      for (const port of OBS_PORTS) {
        MockWebSocket.setPortResponse(port, { success: false, requiresPassword: false });
      }
      
      const result = await discoverOBS('localhost');
      
      // Verify all ports were attempted (by checking MockWebSocket instances)
      const attemptedPorts = MockWebSocket.instances.map(ws => {
        const match = (ws as any).port;
        return match;
      });
      
      for (const port of OBS_PORTS) {
        expect(attemptedPorts).toContain(port);
      }
    });

    it('should find instances on any responding port', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...OBS_PORTS),
          async (respondingPort) => {
            MockWebSocket.reset();
            
            // Only one port responds
            for (const port of OBS_PORTS) {
              MockWebSocket.setPortResponse(port, {
                success: port === respondingPort,
                requiresPassword: false,
                version: '5.0.0',
              });
            }
            
            const result = await discoverOBS('localhost');
            
            expect(result.found).toBe(true);
            expect(result.instances.length).toBeGreaterThanOrEqual(1);
            expect(result.instances.some(i => i.port === respondingPort)).toBe(true);
          }
        ),
        { numRuns: OBS_PORTS.length }
      );
    });

    it('should return empty when no ports respond', async () => {
      // All ports fail
      for (const port of OBS_PORTS) {
        MockWebSocket.setPortResponse(port, { success: false, requiresPassword: false });
      }
      
      const result = await discoverOBS('localhost');
      
      expect(result.found).toBe(false);
      expect(result.instances).toHaveLength(0);
      expect(result.defaultInstance).toBeUndefined();
    });
  });

  /**
   * Property 2: Discovery Result Consistency
   * For any successful discovery, the returned instances SHALL have valid host and port values.
   * @validates Requirements 1.2
   */
  describe('Property 2: Discovery Result Consistency', () => {
    it('should return valid instance data for all found instances', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.subarray(OBS_PORTS, { minLength: 1 }),
          fc.boolean(),
          fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
          async (respondingPorts, requiresPassword, version) => {
            MockWebSocket.reset();
            
            // Setup responding ports
            for (const port of OBS_PORTS) {
              MockWebSocket.setPortResponse(port, {
                success: respondingPorts.includes(port),
                requiresPassword,
                version: version || '5.0.0',
              });
            }
            
            const result = await discoverOBS('localhost');
            
            // All instances should have valid data
            for (const instance of result.instances) {
              expect(instance.host).toBe('localhost');
              expect(OBS_PORTS).toContain(instance.port);
              expect(typeof instance.requiresPassword).toBe('boolean');
            }
            
            // If found, should have a default instance
            if (result.found) {
              expect(result.defaultInstance).toBeDefined();
              expect(result.instances).toContain(result.defaultInstance);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should include scan duration in results', async () => {
      MockWebSocket.setPortResponse(4455, { success: true, requiresPassword: false });
      
      const result = await discoverOBS('localhost');
      
      expect(result.scanDuration).toBeGreaterThanOrEqual(0);
      expect(typeof result.scanDuration).toBe('number');
    });

    it('should detect password requirement correctly', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...OBS_PORTS),
          fc.boolean(),
          async (port, requiresPassword) => {
            MockWebSocket.reset();
            MockWebSocket.setPortResponse(port, {
              success: true,
              requiresPassword,
              version: '5.0.0',
            });
            
            const result = await discoverOBS('localhost');
            
            expect(result.found).toBe(true);
            const instance = result.instances.find(i => i.port === port);
            expect(instance).toBeDefined();
            expect(instance!.requiresPassword).toBe(requiresPassword);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property: Last Connection Persistence
   * Saved connections should be retrievable
   */
  describe('Last Connection Persistence', () => {
    it('should persist and retrieve last connection', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...OBS_PORTS),
          fc.boolean(),
          fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
          (port, requiresPassword, version) => {
            const instance: OBSInstance = {
              host: 'localhost',
              port,
              requiresPassword,
              version: version || undefined,
            };
            
            saveLastConnection(instance);
            const retrieved = getLastConnection();
            
            expect(retrieved).not.toBeNull();
            expect(retrieved!.host).toBe(instance.host);
            expect(retrieved!.port).toBe(instance.port);
            expect(retrieved!.requiresPassword).toBe(instance.requiresPassword);
            expect(retrieved!.timestamp).toBeGreaterThan(0);
            
            // Cleanup
            clearLastConnection();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return null when no connection saved', () => {
      clearLastConnection();
      expect(getLastConnection()).toBeNull();
    });

    it('should clear saved connection', () => {
      const instance: OBSInstance = {
        host: 'localhost',
        port: 4455,
        requiresPassword: false,
      };
      
      saveLastConnection(instance);
      expect(getLastConnection()).not.toBeNull();
      
      clearLastConnection();
      expect(getLastConnection()).toBeNull();
    });
  });

  /**
   * Property: OBS_PORTS Invariants
   */
  describe('OBS_PORTS Invariants', () => {
    it('should have valid port numbers', () => {
      for (const port of OBS_PORTS) {
        expect(port).toBeGreaterThan(0);
        expect(port).toBeLessThanOrEqual(65535);
        expect(Number.isInteger(port)).toBe(true);
      }
    });

    it('should have unique ports', () => {
      expect(new Set(OBS_PORTS).size).toBe(OBS_PORTS.length);
    });

    it('should include default OBS WebSocket port', () => {
      expect(OBS_PORTS).toContain(4455); // OBS WebSocket 5.x default
    });
  });
});
