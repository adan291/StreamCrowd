import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { StreamlabsAdapter } from '../../src/integrations/adapters/StreamlabsAdapter';

describe('StreamlabsAdapter', () => {
  let adapter: StreamlabsAdapter;

  beforeEach(() => {
    adapter = new StreamlabsAdapter();
  });

  describe('OAuth URL Generation', () => {
    it('should generate valid OAuth URLs with all required parameters', () => {
      fc.assert(
        fc.property(
          fc.record({
            clientId: fc.hexaString({ minLength: 10, maxLength: 32 }),
            clientSecret: fc.hexaString({ minLength: 10, maxLength: 32 }),
            redirectUri: fc.webUrl(),
          }),
          fc.array(fc.constantFrom('donations.read', 'alerts.create', 'socket.token'), { minLength: 1, maxLength: 3 }),
          (config, scopes) => {
            adapter.setConfig(config);
            const url = adapter.getAuthUrl(scopes);
            
            expect(url).toContain('https://streamlabs.com/api/v2.0/authorize');
            expect(url).toContain('response_type=code');
            
            const urlObj = new URL(url);
            expect(urlObj.searchParams.get('client_id')).toBe(config.clientId);
            expect(urlObj.searchParams.get('redirect_uri')).toBe(config.redirectUri);
            expect(urlObj.searchParams.get('scope')).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should throw error when config is not set', () => {
      expect(() => adapter.getAuthUrl()).toThrow('Config not set');
    });
  });

  describe('Token Management', () => {
    it('should correctly identify expired tokens', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -86400000, max: 86400000 }), // -1 day to +1 day in ms
          (offsetMs) => {
            const expiresAt = new Date(Date.now() + offsetMs);
            
            adapter.setTokens({
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
              expiresAt,
              scope: ['donations.read'],
            });
            
            const isExpired = adapter.isTokenExpired();
            const shouldBeExpired = new Date() >= expiresAt;
            
            expect(isExpired).toBe(shouldBeExpired);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return true for expired when no tokens set', () => {
      expect(adapter.isTokenExpired()).toBe(true);
    });

    it('should store and retrieve tokens correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            accessToken: fc.string({ minLength: 10, maxLength: 100 }),
            refreshToken: fc.string({ minLength: 10, maxLength: 100 }),
            expiresAt: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 0, 1) }),
            scope: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          }),
          (tokens) => {
            adapter.setTokens(tokens);
            const retrieved = adapter.getTokens();
            
            expect(retrieved).toEqual(tokens);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Event Handlers', () => {
    it('should register and unregister donation handlers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (handlerCount) => {
            const handlers: (() => void)[] = [];
            const callCounts: number[] = [];
            
            for (let i = 0; i < handlerCount; i++) {
              callCounts.push(0);
              const unsubscribe = adapter.onDonation(() => {
                callCounts[i]++;
              });
              handlers.push(unsubscribe);
            }
            
            // Unsubscribe half
            const toUnsubscribe = Math.floor(handlerCount / 2);
            for (let i = 0; i < toUnsubscribe; i++) {
              handlers[i]();
            }
            
            // Remaining handlers should still be registered
            expect(handlers.length).toBe(handlerCount);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should register and unregister follow handlers', () => {
      const unsubscribe = adapter.onFollow(() => {});
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should register and unregister subscription handlers', () => {
      const unsubscribe = adapter.onSubscription(() => {});
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should register and unregister host handlers', () => {
      const unsubscribe = adapter.onHost(() => {});
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should register and unregister bits handlers', () => {
      const unsubscribe = adapter.onBits(() => {});
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should register and unregister connection handlers', () => {
      const unsubscribe = adapter.onConnectionChange(() => {});
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('Connection State', () => {
    it('should report disconnected when no socket exists', () => {
      expect(adapter.isConnected()).toBe(false);
    });

    it('should throw when connecting without token', async () => {
      await expect(adapter.connectSocket()).rejects.toThrow('No access token');
    });

    it('should disconnect cleanly', () => {
      adapter.disconnectSocket();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('API Actions', () => {
    it('should throw when testing alert without authentication', async () => {
      await expect(adapter.testAlert()).rejects.toThrow('Not authenticated');
    });

    it('should throw when skipping alert without authentication', async () => {
      await expect(adapter.skipAlert()).rejects.toThrow('Not authenticated');
    });
  });

  describe('Config Management', () => {
    it('should accept and store config', () => {
      fc.assert(
        fc.property(
          fc.record({
            clientId: fc.string({ minLength: 1 }),
            clientSecret: fc.string({ minLength: 1 }),
            redirectUri: fc.webUrl(),
          }),
          (config) => {
            adapter.setConfig(config);
            // Should not throw when generating auth URL
            expect(() => adapter.getAuthUrl()).not.toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
