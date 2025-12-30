import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  IntegrationEvent,
  IntegrationProvider,
  IntegrationEventType,
  EventFilters,
} from '../types/integrations';
import { IntegrationService } from '../src/integrations/services/IntegrationService';

interface EventStats {
  totalEvents: number;
  byProvider: Record<IntegrationProvider, number>;
  byType: Record<IntegrationEventType, number>;
  totalDonations: number;
  totalAmount: number;
}

interface UseIntegrationEventsReturn {
  events: IntegrationEvent[];
  stats: EventStats;
  isLoading: boolean;
  
  // Filters
  filters: EventFilters & { provider?: IntegrationProvider; type?: IntegrationEventType };
  setFilters: (filters: EventFilters & { provider?: IntegrationProvider; type?: IntegrationEventType }) => void;
  clearFilters: () => void;
  
  // Actions
  clearEvents: () => void;
  markProcessed: (id: string) => void;
  exportEvents: () => string;
}

export function useIntegrationEvents(
  service?: IntegrationService
): UseIntegrationEventsReturn {
  const serviceRef = useRef<IntegrationService>(service || new IntegrationService());
  
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [stats, setStats] = useState<EventStats>({
    totalEvents: 0,
    byProvider: { streamlabs: 0, streamelements: 0 },
    byType: { donation: 0, follow: 0, subscription: 0, raid: 0, cheer: 0, tip: 0, host: 0, bits: 0 },
    totalDonations: 0,
    totalAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFiltersState] = useState<EventFilters & { provider?: IntegrationProvider; type?: IntegrationEventType }>({});

  const updateEvents = useCallback(() => {
    const svc = serviceRef.current;
    const filteredEvents = svc.getEvents(filters);
    setEvents(filteredEvents);
    setStats(svc.getStats());
  }, [filters]);

  useEffect(() => {
    const svc = serviceRef.current;
    
    const unsubscribe = svc.onEvent(() => {
      updateEvents();
    });

    updateEvents();

    return () => {
      unsubscribe();
    };
  }, [updateEvents]);

  const setFilters = useCallback((newFilters: typeof filters) => {
    setFiltersState(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const clearEvents = useCallback(() => {
    serviceRef.current.clearEvents();
    updateEvents();
  }, [updateEvents]);

  const markProcessed = useCallback((id: string) => {
    serviceRef.current.markEventProcessed(id);
    updateEvents();
  }, [updateEvents]);

  const exportEvents = useCallback((): string => {
    return JSON.stringify(events, null, 2);
  }, [events]);

  return {
    events,
    stats,
    isLoading,
    filters,
    setFilters,
    clearFilters,
    clearEvents,
    markProcessed,
    exportEvents,
  };
}
