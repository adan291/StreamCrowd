/**
 * Property-based tests for AlertProviderService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the alert provider system.
 * 
 * @requirements 1.7, 1.8
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AlertProviderService } from '../../src/application/services/AlertProviderService';
import type {
  IAlertProvider,
  AlertProviderConfig,
  AlertProviderStatus,
  AlertProviderType,
  ExternalAlert,
  AlertCallback,
  AlertProviderStatusCallback,
} from '../../src/domain/ports/IAlertProvider';

// ============ ARBITRARIES ============

const alertProviderTypeArb: fc.Arbitrary<AlertProviderType> = fc.constantFrom(
  'streamelements', 'streamlabs'
);

const jwtTokenArb = fc.string({ minLength: 20, maxLength: 100 }).map(s => `jwt_${s}`);
const socketTokenArb = fc.string({ minLength: 20, maxLength: 100 }).map(s => `socket_${s}`);

const alertProviderConfigArb: fc.Arbitrary<AlertProviderConfig> = fc.oneof(
  // StreamElements config
  fc.record({
    provider: fc.constant('streamelements' as AlertProviderType),
    enabled: fc.boolean(),
    jwtToken: jwtTokenArb,
    socketToken: fc.constant(undefined),
  }),
  // Streamlabs config
  fc.record({
    provider: fc.constant('streamlabs' as AlertProviderType),
    enabled: fc.boolean(),
    jwtToken: fc.constant(undefined),
    socketToken: socketTokenArb,
  })
);

// ============ MOCK PROVIDER FOR TESTING ============

class MockAlertProvider implements IAlertProvider {
  readonly providerName: AlertProviderType;
  private status: AlertProviderStatus = 'disconnected';
  private alertCallbacks = new Set<AlertCallback>();
  private statusCallbacks = new Set<AlertProviderStatusCallback>();
  private _connected = false;

  constructor(name: AlertProviderType) {
    this.providerName = name;
  }

  async connect(config: AlertProviderConfig): Promise<void> {
    this.status = 'connecting';
    this.notifyStatusChange();
    
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 10));
    
    this._connected = true;
    this.status = 'connected';
    this.notifyStatusChange();
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this.status = 'disconnected';
    this.notifyStatusChange();
  }

  isConnected(): boolean {
    return this._connected;
  }

  getStatus(): AlertProviderStatus {
    return this.status;
  }

  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  onStatusChange(callback: AlertProviderStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  dispose(): void {
    this.disconnect();
    this.alertCallbacks.clear();
    this.statusCallbacks.clear();
  }

  // Test helper to emit an alert
  emitAlert(alert: ExternalAlert): void {
    this.alertCallbacks.forEach(cb => cb(alert));
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(cb => cb(this.status));
  }
}

// ============ TESTS ============

describe('AlertProviderService Property Tests', () => {
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

  describe('Property 4: Provider Config Round-Trip', () => {
    /**
     * Feature: pending-features, Property 4: Provider Config Round-Trip
     * 
     * For any valid AlertProviderConfig, saving and then loading SHALL return 
     * an equivalent config.
     * 
     * **Validates: Requirements 1.7**
     */
    it('should persist and retrieve provider configs correctly', () => {
      fc.assert(
        fc.property(
          alertProviderConfigArb,
          (config) => {
            // Clear localStorage for fresh test
            localStorage.clear();
            
            // Create service and save config
            const service1 = new AlertProviderService();
            service1.saveProviderConfig(config);
            
            // Create new service instance (simulates app reload)
            const service2 = new AlertProviderService();
            const loadedConfig = service2.getProviderConfig(config.provider);
            
            expect(loadedConfig).not.toBeNull();
            expect(loadedConfig!.provider).toBe(config.provider);
            expect(loadedConfig!.enabled).toBe(config.enabled);
            
            // Check provider-specific tokens
            if (config.provider === 'streamelements') {
              expect(loadedConfig!.jwtToken).toBe(config.jwtToken);
            } else {
              expect(loadedConfig!.socketToken).toBe(config.socketToken);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all configs when saving multiple providers', () => {
      fc.assert(
        fc.property(
          fc.array(alertProviderConfigArb, { minLength: 1, maxLength: 5 }),
          (configs) => {
            // Clear localStorage for fresh test
            localStorage.clear();
            
            // Create service and save all configs
            const service1 = new AlertProviderService();
            configs.forEach(config => service1.saveProviderConfig(config));
            
            // Create new service instance (simulates app reload)
            const service2 = new AlertProviderService();
            const loadedConfigs = service2.getConfigs();
            
            // Each unique provider should have exactly one config (last one wins)
            const uniqueProviders = new Set(configs.map(c => c.provider));
            expect(loadedConfigs.length).toBe(uniqueProviders.size);
            
            // Verify each provider's last config is preserved
            for (const provider of uniqueProviders) {
              const lastConfig = [...configs].reverse().find(c => c.provider === provider);
              const loadedConfig = loadedConfigs.find(c => c.provider === provider);
              
              expect(loadedConfig).toBeDefined();
              expect(loadedConfig!.enabled).toBe(lastConfig!.enabled);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Simultaneous Providers', () => {
    /**
     * Feature: pending-features, Property 5: Simultaneous Providers
     * 
     * For any two different providers, connecting both SHALL result in both 
     * being active and receiving alerts independently.
     * 
     * **Validates: Requirements 1.8**
     */
    it('should support multiple providers connected simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            seConfig: fc.record({
              provider: fc.constant('streamelements' as AlertProviderType),
              enabled: fc.constant(true),
              jwtToken: jwtTokenArb,
            }),
            slConfig: fc.record({
              provider: fc.constant('streamlabs' as AlertProviderType),
              enabled: fc.constant(true),
              socketToken: socketTokenArb,
            }),
          }),
          async ({ seConfig, slConfig }) => {
            localStorage.clear();
            
            const service = new AlertProviderService();
            const seProvider = new MockAlertProvider('streamelements');
            const slProvider = new MockAlertProvider('streamlabs');
            
            service.addProvider(seProvider);
            service.addProvider(slProvider);
            
            // Connect both providers
            await service.connectProvider('streamelements', seConfig);
            await service.connectProvider('streamlabs', slConfig);
            
            // Both should be connected
            expect(service.isProviderConnected('streamelements')).toBe(true);
            expect(service.isProviderConnected('streamlabs')).toBe(true);
            
            // Track received alerts
            const receivedAlerts: ExternalAlert[] = [];
            service.onAlert(alert => receivedAlerts.push(alert));
            
            // Emit alerts from both providers
            const seAlert: ExternalAlert = {
              id: 'se-1',
              type: 'donation',
              username: 'user1',
              amount: 10,
              timestamp: Date.now(),
              provider: 'streamelements',
            };
            
            const slAlert: ExternalAlert = {
              id: 'sl-1',
              type: 'follow',
              username: 'user2',
              timestamp: Date.now(),
              provider: 'streamlabs',
            };
            
            seProvider.emitAlert(seAlert);
            slProvider.emitAlert(slAlert);
            
            // Both alerts should be received
            expect(receivedAlerts.length).toBe(2);
            expect(receivedAlerts.some(a => a.id === 'se-1')).toBe(true);
            expect(receivedAlerts.some(a => a.id === 'sl-1')).toBe(true);
            
            // Cleanup
            await service.disconnectAll();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should maintain provider independence when one disconnects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            seConfig: fc.record({
              provider: fc.constant('streamelements' as AlertProviderType),
              enabled: fc.constant(true),
              jwtToken: jwtTokenArb,
            }),
            slConfig: fc.record({
              provider: fc.constant('streamlabs' as AlertProviderType),
              enabled: fc.constant(true),
              socketToken: socketTokenArb,
            }),
          }),
          async ({ seConfig, slConfig }) => {
            localStorage.clear();
            
            const service = new AlertProviderService();
            const seProvider = new MockAlertProvider('streamelements');
            const slProvider = new MockAlertProvider('streamlabs');
            
            service.addProvider(seProvider);
            service.addProvider(slProvider);
            
            // Connect both providers
            await service.connectProvider('streamelements', seConfig);
            await service.connectProvider('streamlabs', slConfig);
            
            // Disconnect one provider
            await service.disconnectProvider('streamelements');
            
            // StreamElements should be disconnected, Streamlabs should still be connected
            expect(service.isProviderConnected('streamelements')).toBe(false);
            expect(service.isProviderConnected('streamlabs')).toBe(true);
            
            // Track received alerts
            const receivedAlerts: ExternalAlert[] = [];
            service.onAlert(alert => receivedAlerts.push(alert));
            
            // Emit alert from still-connected provider
            const slAlert: ExternalAlert = {
              id: 'sl-2',
              type: 'subscription',
              username: 'user3',
              timestamp: Date.now(),
              provider: 'streamlabs',
            };
            
            slProvider.emitAlert(slAlert);
            
            // Alert should be received
            expect(receivedAlerts.length).toBe(1);
            expect(receivedAlerts[0].id).toBe('sl-2');
            
            // Cleanup
            await service.disconnectAll();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
