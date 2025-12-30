import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  EventMapping,
  EventFilters,
  MappedAction,
  IntegrationProvider,
  IntegrationEventType,
} from '../types/integrations';
import { EventMappingService } from '../src/integrations/services/EventMappingService';

interface UseEventMappingsReturn {
  mappings: EventMapping[];
  isLoading: boolean;
  error: string | null;
  
  // CRUD
  createMapping: (
    name: string,
    provider: IntegrationProvider,
    eventType: IntegrationEventType,
    action: MappedAction,
    filters?: EventFilters
  ) => EventMapping;
  updateMapping: (id: string, updates: Partial<EventMapping>) => EventMapping | null;
  deleteMapping: (id: string) => boolean;
  toggleMapping: (id: string) => boolean;
  
  // Filters
  getMappingsByProvider: (provider: IntegrationProvider) => EventMapping[];
  getMappingsByEventType: (eventType: IntegrationEventType) => EventMapping[];
  getEnabledMappings: () => EventMapping[];
  
  // Import/Export
  exportMappings: () => string;
  importMappings: (json: string, replace?: boolean) => number;
  clearMappings: () => void;
}

export function useEventMappings(): UseEventMappingsReturn {
  const serviceRef = useRef<EventMappingService>(new EventMappingService());
  
  const [mappings, setMappings] = useState<EventMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMappings = useCallback(() => {
    setMappings(serviceRef.current.getMappings());
  }, []);

  useEffect(() => {
    refreshMappings();
  }, [refreshMappings]);

  const createMapping = useCallback((
    name: string,
    provider: IntegrationProvider,
    eventType: IntegrationEventType,
    action: MappedAction,
    filters?: EventFilters
  ): EventMapping => {
    const mapping = serviceRef.current.createMapping(name, provider, eventType, action, filters);
    refreshMappings();
    return mapping;
  }, [refreshMappings]);

  const updateMapping = useCallback((id: string, updates: Partial<EventMapping>): EventMapping | null => {
    const result = serviceRef.current.updateMapping(id, updates);
    refreshMappings();
    return result;
  }, [refreshMappings]);

  const deleteMapping = useCallback((id: string): boolean => {
    const result = serviceRef.current.deleteMapping(id);
    refreshMappings();
    return result;
  }, [refreshMappings]);

  const toggleMapping = useCallback((id: string): boolean => {
    const result = serviceRef.current.toggleMapping(id);
    refreshMappings();
    return result;
  }, [refreshMappings]);

  const getMappingsByProvider = useCallback((provider: IntegrationProvider): EventMapping[] => {
    return serviceRef.current.getMappingsByProvider(provider);
  }, []);

  const getMappingsByEventType = useCallback((eventType: IntegrationEventType): EventMapping[] => {
    return serviceRef.current.getMappingsByEventType(eventType);
  }, []);

  const getEnabledMappings = useCallback((): EventMapping[] => {
    return serviceRef.current.getEnabledMappings();
  }, []);

  const exportMappings = useCallback((): string => {
    return serviceRef.current.exportMappings();
  }, []);

  const importMappings = useCallback((json: string, replace = false): number => {
    try {
      const count = serviceRef.current.importMappings(json, replace);
      refreshMappings();
      return count;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import');
      throw err;
    }
  }, [refreshMappings]);

  const clearMappings = useCallback(() => {
    serviceRef.current.clearMappings();
    refreshMappings();
  }, [refreshMappings]);

  return {
    mappings,
    isLoading,
    error,
    createMapping,
    updateMapping,
    deleteMapping,
    toggleMapping,
    getMappingsByProvider,
    getMappingsByEventType,
    getEnabledMappings,
    exportMappings,
    importMappings,
    clearMappings,
  };
}
