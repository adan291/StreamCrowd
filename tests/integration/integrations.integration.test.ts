import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntegrationService } from '../../src/integrations/services/IntegrationService';
import { EventMappingService } from '../../src/integrations/services/EventMappingService';
import type { IntegrationEvent, MappedAction } from '../../types/integrations';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Integrations Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('IntegrationService', () => {
    it('should manage connection statuses', () => {
      const service = new IntegrationService();
      
      const slStatus = service.getConnectionStatus('streamlabs');
      expect(slStatus.provider).toBe('streamlabs');
      expect(slStatus.connected).toBe(false);
      
      const seStatus = service.getConnectionStatus('streamelements');
      expect(seStatus.provider).toBe('streamelements');
      expect(seStatus.connected).toBe(false);
    });

    it('should provide access to adapters', () => {
      const service = new IntegrationService();
      
      const slAdapter = service.getStreamlabsAdapter();
      expect(slAdapter).toBeDefined();
      expect(typeof slAdapter.getAuthUrl).toBe('function');
      
      const seAdapter = service.getStreamElementsAdapter();
      expect(seAdapter).toBeDefined();
      expect(typeof seAdapter.setJWTToken).toBe('function');
    });

    it('should track events and provide statistics', () => {
      const service = new IntegrationService();
      
      const initialStats = service.getStats();
      expect(initialStats.totalEvents).toBe(0);
      expect(initialStats.totalDonations).toBe(0);
      expect(initialStats.totalAmount).toBe(0);
    });

    it('should filter events correctly', () => {
      const service = new IntegrationService();
      
      // Get events with filters
      const events = service.getEvents({ minAmount: 10 });
      expect(Array.isArray(events)).toBe(true);
    });

    it('should emit events to handlers', () => {
      const service = new IntegrationService();
      const handler = vi.fn();
      
      const unsubscribe = service.onEvent(handler);
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should emit connection changes to handlers', () => {
      const service = new IntegrationService();
      const handler = vi.fn();
      
      const unsubscribe = service.onConnectionChange(handler);
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });
  });

  describe('EventMappingService', () => {
    it('should create and retrieve mappings', () => {
      const service = new EventMappingService();
      
      const mapping = service.createMapping(
        'Test Mapping',
        'streamlabs',
        'donation',
        { type: 'notification', notificationConfig: { title: 'Test', message: 'Test', channels: ['push'] } },
        { minAmount: 5 }
      );
      
      expect(mapping.id).toBeDefined();
      expect(mapping.name).toBe('Test Mapping');
      expect(mapping.provider).toBe('streamlabs');
      expect(mapping.eventType).toBe('donation');
      expect(mapping.enabled).toBe(true);
      
      const retrieved = service.getMapping(mapping.id);
      expect(retrieved).toEqual(mapping);
    });

    it('should update mappings', () => {
      const service = new EventMappingService();
      
      const mapping = service.createMapping(
        'Original Name',
        'streamlabs',
        'donation',
        { type: 'notification' }
      );
      
      const updated = service.updateMapping(mapping.id, { name: 'Updated Name' });
      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete mappings', () => {
      const service = new EventMappingService();
      
      const mapping = service.createMapping(
        'To Delete',
        'streamlabs',
        'donation',
        { type: 'notification' }
      );
      
      const deleted = service.deleteMapping(mapping.id);
      expect(deleted).toBe(true);
      
      const retrieved = service.getMapping(mapping.id);
      expect(retrieved).toBeUndefined();
    });

    it('should toggle mapping enabled state', () => {
      const service = new EventMappingService();
      
      const mapping = service.createMapping(
        'Toggle Test',
        'streamlabs',
        'donation',
        { type: 'notification' }
      );
      
      expect(mapping.enabled).toBe(true);
      
      const newState = service.toggleMapping(mapping.id);
      expect(newState).toBe(false);
      
      const toggled = service.getMapping(mapping.id);
      expect(toggled?.enabled).toBe(false);
    });

    it('should filter mappings by provider', () => {
      const service = new EventMappingService();
      service.clearMappings();
      
      service.createMapping('SL1', 'streamlabs', 'donation', { type: 'notification' });
      service.createMapping('SE1', 'streamelements', 'tip', { type: 'notification' });
      service.createMapping('SL2', 'streamlabs', 'follow', { type: 'notification' });
      
      const slMappings = service.getMappingsByProvider('streamlabs');
      expect(slMappings.length).toBe(2);
      
      const seMappings = service.getMappingsByProvider('streamelements');
      expect(seMappings.length).toBe(1);
    });

    it('should filter mappings by event type', () => {
      const service = new EventMappingService();
      service.clearMappings();
      
      service.createMapping('D1', 'streamlabs', 'donation', { type: 'notification' });
      service.createMapping('D2', 'streamelements', 'donation', { type: 'notification' });
      service.createMapping('F1', 'streamlabs', 'follow', { type: 'notification' });
      
      const donations = service.getMappingsByEventType('donation');
      expect(donations.length).toBe(2);
      
      const follows = service.getMappingsByEventType('follow');
      expect(follows.length).toBe(1);
    });
  });

  describe('Event Matching', () => {
    it('should find matching mappings for events', () => {
      const service = new EventMappingService();
      service.clearMappings();
      
      service.createMapping(
        'Big Donations',
        'streamlabs',
        'donation',
        { type: 'notification' },
        { minAmount: 10 }
      );
      
      service.createMapping(
        'All Donations',
        'streamlabs',
        'donation',
        { type: 'notification' }
      );
      
      const bigDonation: IntegrationEvent = {
        id: '1',
        provider: 'streamlabs',
        type: 'donation',
        timestamp: new Date(),
        data: { username: 'test', amount: 50 },
        processed: false,
      };
      
      const matches = service.findMatchingMappings(bigDonation);
      expect(matches.length).toBe(2);
      
      const smallDonation: IntegrationEvent = {
        id: '2',
        provider: 'streamlabs',
        type: 'donation',
        timestamp: new Date(),
        data: { username: 'test', amount: 5 },
        processed: false,
      };
      
      const smallMatches = service.findMatchingMappings(smallDonation);
      expect(smallMatches.length).toBe(1);
    });

    it('should filter by keywords', () => {
      const service = new EventMappingService();
      service.clearMappings();
      
      service.createMapping(
        'Keyword Filter',
        'streamlabs',
        'donation',
        { type: 'notification' },
        { keywords: ['hello', 'world'] }
      );
      
      const matchingEvent: IntegrationEvent = {
        id: '1',
        provider: 'streamlabs',
        type: 'donation',
        timestamp: new Date(),
        data: { username: 'test', message: 'Hello there!' },
        processed: false,
      };
      
      const matches = service.findMatchingMappings(matchingEvent);
      expect(matches.length).toBe(1);
      
      const nonMatchingEvent: IntegrationEvent = {
        id: '2',
        provider: 'streamlabs',
        type: 'donation',
        timestamp: new Date(),
        data: { username: 'test', message: 'No keywords here' },
        processed: false,
      };
      
      const noMatches = service.findMatchingMappings(nonMatchingEvent);
      expect(noMatches.length).toBe(0);
    });
  });

  describe('Import/Export', () => {
    it('should export and import mappings', () => {
      const service = new EventMappingService();
      service.clearMappings();
      
      service.createMapping('Export1', 'streamlabs', 'donation', { type: 'notification' });
      service.createMapping('Export2', 'streamelements', 'tip', { type: 'macro', macroId: '123' });
      
      const exported = service.exportMappings();
      expect(exported).toBeTruthy();
      
      const parsed = JSON.parse(exported);
      expect(parsed.length).toBe(2);
      
      // Import into fresh service
      const newService = new EventMappingService();
      newService.clearMappings();
      
      const imported = newService.importMappings(exported);
      expect(imported).toBe(2);
      
      const allMappings = newService.getMappings();
      expect(allMappings.length).toBe(2);
    });

    it('should handle invalid import data', () => {
      const service = new EventMappingService();
      
      expect(() => service.importMappings('invalid json')).toThrow();
      expect(() => service.importMappings('"not an array"')).toThrow();
    });
  });
});
