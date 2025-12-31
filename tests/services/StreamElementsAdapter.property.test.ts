import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { StreamElementsAdapter } from '../../src/integrations/adapters/StreamElementsAdapter';

describe('StreamElementsAdapter', () => {
  let adapter: StreamElementsAdapter;

  beforeEach(() => {
    adapter = new StreamElementsAdapter();
  });

  describe('JWT Token Management', () => {
    it('should store and retrieve JWT token', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (token) => {
            adapter.setJWTToken(token);
            const config = adapter.getConfig();
            
            expect(config).not.toBeNull();
            expect(config?.jwtToken).toBe(token);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should store config with channelId', () => {
      fc.assert(
        fc.property(
          fc.record({
            jwtToken: fc.string({ minLength: 10, maxLength: 500 }),
            channelId: fc.hexaString({ minLength: 24, maxLength: 24 }),
          }),
          (config) => {
            adapter.setConfig(config);
            
            expect(adapter.getConfig()).toEqual(config);
            expect(adapter.getChannelId()).toBe(config.channelId);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Event Handlers', () => {
    it('should register and unregister tip handlers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (handlerCount) => {
            const handlers: (() => void)[] = [];
            
            for (let i = 0; i < handlerCount; i++) {
              const unsubscribe = adapter.onTip(() => {});
              handlers.push(unsubscribe);
            }
            
            expect(handlers.length).toBe(handlerCount);
            
            // Unsubscribe all
            handlers.forEach(h => h());
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

    it('should register and unregister raid handlers', () => {
      const unsubscribe = adapter.onRaid(() => {});
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should register and unregister cheer handlers', () => {
      const unsubscribe = adapter.onCheer(() => {});
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
      await expect(adapter.connectSocket()).rejects.toThrow('No JWT token');
    });

    it('should disconnect cleanly', () => {
      adapter.disconnectSocket();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('Points System', () => {
    it('should throw when getting points without authentication', async () => {
      await expect(adapter.getPoints('testuser')).rejects.toThrow('Not authenticated');
    });

    it('should throw when adding points without authentication', async () => {
      await expect(adapter.addPoints('testuser', 100)).rejects.toThrow('Not authenticated');
    });

    it('should throw when removing points without authentication', async () => {
      await expect(adapter.removePoints('testuser', 100)).rejects.toThrow('Not authenticated');
    });

    it('should validate positive amounts for addPoints', async () => {
      adapter.setConfig({ jwtToken: 'test', channelId: 'test123' });
      
      await expect(adapter.addPoints('user', 0)).rejects.toThrow('Amount must be positive');
      await expect(adapter.addPoints('user', -100)).rejects.toThrow('Amount must be positive');
    });

    it('should validate positive amounts for removePoints', async () => {
      adapter.setConfig({ jwtToken: 'test', channelId: 'test123' });
      
      await expect(adapter.removePoints('user', 0)).rejects.toThrow('Amount must be positive');
      await expect(adapter.removePoints('user', -100)).rejects.toThrow('Amount must be positive');
    });
  });

  describe('API Actions', () => {
    it('should throw when testing alert without authentication', async () => {
      await expect(adapter.testAlert()).rejects.toThrow('Not authenticated');
    });
  });

  describe('Channel ID', () => {
    it('should return null when no channel ID set', () => {
      expect(adapter.getChannelId()).toBeNull();
    });

    it('should return channel ID when set via config', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 24, maxLength: 24 }),
          (channelId) => {
            adapter.setConfig({ jwtToken: 'test', channelId });
            expect(adapter.getChannelId()).toBe(channelId);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
