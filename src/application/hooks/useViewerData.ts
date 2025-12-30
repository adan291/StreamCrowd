/**
 * useViewerData Hook
 * 
 * React hook wrapper for ViewerService with reactive state management.
 * Integrates with useStreamEventService to automatically process events.
 * 
 * @module src/application/hooks/useViewerData
 * @requirements 3.1-3.5 - Viewer data aggregation and management
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ViewerService,
  ViewerData,
  ViewerSortBy,
  ViewerStreamEvent,
  ViewerStreamEventType,
  createViewerService,
} from '../services/ViewerService';
import { useStreamEventService } from './useStreamEventService';
import type { StreamEvent, StreamEventType } from '../../domain/entities/StreamEvent';

// Re-export types for convenience
export type { ViewerData, ViewerSortBy, ViewerStreamEvent, ViewerStreamEventType };

/**
 * Return type for the useViewerData hook
 */
export interface UseViewerDataReturn {
  /** All viewers data */
  viewers: ViewerData[];
  
  /** Total count of unique viewers */
  viewerCount: number;
  
  /** Get data for a specific viewer */
  getViewer: (username: string) => ViewerData | null;
  
  /** Search viewers by username (case-insensitive) */
  searchViewers: (query: string) => ViewerData[];
  
  /** Sort viewers by criteria */
  sortViewers: (sortBy: ViewerSortBy) => ViewerData[];
  
  /** Get top viewers by criteria */
  getTopViewers: (sortBy: ViewerSortBy, limit?: number) => ViewerData[];
  
  /** Manually process a single event */
  processEvent: (event: ViewerStreamEvent) => void;
  
  /** Manually process multiple events */
  processEvents: (events: ViewerStreamEvent[]) => void;
  
  /** Clear all viewer data */
  clear: () => void;
  
  /** Check if a viewer exists */
  hasViewer: (username: string) => boolean;
  
  /** Service instance */
  service: ViewerService;
}

/**
 * Map domain StreamEventType to ViewerStreamEventType
 */
function mapEventType(type: StreamEventType): ViewerStreamEventType | null {
  const typeMap: Record<string, ViewerStreamEventType> = {
    'sub': 'sub',
    'resub': 'resub',
    'subgift': 'gift',
    'submysterygift': 'gift',
    'raid': 'raid',
    'cheer': 'bits',
    'ban': 'ban',
    'timeout': 'timeout',
  };
  
  return typeMap[type] || null;
}

/**
 * Convert domain StreamEvent to ViewerStreamEvent
 */
function convertToViewerEvent(event: StreamEvent): ViewerStreamEvent | null {
  const mappedType = mapEventType(event.type);
  
  if (!mappedType) {
    return null;
  }
  
  const viewerEvent: ViewerStreamEvent = {
    id: event.id,
    type: mappedType,
    username: event.username,
    timestamp: event.timestamp,
    data: {},
  };
  
  // Map type-specific data
  switch (event.type) {
    case 'sub':
    case 'resub':
      viewerEvent.data = {
        tier: event.tier as '1000' | '2000' | '3000' | undefined,
        months: event.cumulativeMonths || event.months,
        message: event.message,
      };
      break;
      
    case 'subgift':
      viewerEvent.data = {
        tier: event.tier as '1000' | '2000' | '3000' | undefined,
        recipientUsername: event.recipientUsername,
        giftCount: 1,
      };
      break;
      
    case 'submysterygift':
      viewerEvent.data = {
        tier: event.tier as '1000' | '2000' | '3000' | undefined,
        giftCount: event.giftCount || 1,
      };
      break;
      
    case 'raid':
      viewerEvent.data = {
        viewerCount: event.viewerCount,
      };
      break;
      
    case 'cheer':
      viewerEvent.data = {
        amount: event.bits,
        message: event.message,
      };
      break;
      
    case 'ban':
      viewerEvent.data = {
        reason: event.reason,
      };
      break;
      
    case 'timeout':
      viewerEvent.data = {
        duration: event.duration,
        reason: event.reason,
      };
      break;
  }
  
  return viewerEvent;
}

/**
 * Hook for managing viewer data with reactive state
 * 
 * @param autoProcess - Whether to automatically process events from useStreamEventService (default: true)
 * 
 * @example
 * ```tsx
 * const { viewers, searchViewers, getTopViewers, viewerCount } = useViewerData();
 * 
 * // Search for viewers
 * const results = searchViewers('user');
 * 
 * // Get top 10 viewers by bits
 * const topBitGivers = getTopViewers('bits', 10);
 * 
 * // Get a specific viewer
 * const viewer = getViewer('username');
 * ```
 */
export function useViewerData(autoProcess: boolean = true): UseViewerDataReturn {
  // Service instance
  const serviceRef = useRef<ViewerService | null>(null);
  
  // Initialize service lazily
  const service = useMemo(() => {
    if (!serviceRef.current) {
      serviceRef.current = createViewerService();
    }
    return serviceRef.current;
  }, []);

  // State for reactive updates
  const [viewers, setViewers] = useState<ViewerData[]>([]);
  const [viewerCount, setViewerCount] = useState<number>(0);
  
  // Track processed event IDs to avoid duplicates
  const processedEventIds = useRef<Set<string>>(new Set());

  // Get stream events from the event service
  const { events: streamEvents, onEvent } = useStreamEventService();

  // Update state from service
  const updateState = useCallback(() => {
    setViewers(service.getAllViewers());
    setViewerCount(service.getViewerCount());
  }, [service]);

  // Process a single event
  const processEvent = useCallback((event: ViewerStreamEvent) => {
    if (processedEventIds.current.has(event.id)) {
      return;
    }
    processedEventIds.current.add(event.id);
    service.processEvent(event);
    updateState();
  }, [service, updateState]);

  // Process multiple events
  const processEvents = useCallback((events: ViewerStreamEvent[]) => {
    const newEvents = events.filter(e => !processedEventIds.current.has(e.id));
    if (newEvents.length === 0) return;
    
    newEvents.forEach(e => processedEventIds.current.add(e.id));
    service.processEvents(newEvents);
    updateState();
  }, [service, updateState]);

  // Auto-process events from stream event service
  useEffect(() => {
    if (!autoProcess) return;

    // Process existing events on mount
    const viewerEvents: ViewerStreamEvent[] = [];
    for (const event of streamEvents) {
      if (!processedEventIds.current.has(event.id)) {
        const viewerEvent = convertToViewerEvent(event);
        if (viewerEvent) {
          viewerEvents.push(viewerEvent);
        }
      }
    }
    
    if (viewerEvents.length > 0) {
      processEvents(viewerEvents);
    }
  }, [autoProcess, streamEvents, processEvents]);

  // Subscribe to new events
  useEffect(() => {
    if (!autoProcess) return;

    const unsubscribe = onEvent((event: StreamEvent) => {
      if (processedEventIds.current.has(event.id)) return;
      
      const viewerEvent = convertToViewerEvent(event);
      if (viewerEvent) {
        processEvent(viewerEvent);
      }
    });

    return unsubscribe;
  }, [autoProcess, onEvent, processEvent]);

  // Get viewer by username
  const getViewer = useCallback((username: string): ViewerData | null => {
    return service.getViewer(username);
  }, [service]);

  // Search viewers
  const searchViewers = useCallback((query: string): ViewerData[] => {
    return service.searchViewers(query);
  }, [service]);

  // Sort viewers
  const sortViewers = useCallback((sortBy: ViewerSortBy): ViewerData[] => {
    return service.sortViewers(service.getAllViewers(), sortBy);
  }, [service]);

  // Get top viewers
  const getTopViewers = useCallback((sortBy: ViewerSortBy, limit?: number): ViewerData[] => {
    return service.getTopViewers(sortBy, limit);
  }, [service]);

  // Check if viewer exists
  const hasViewer = useCallback((username: string): boolean => {
    return service.hasViewer(username);
  }, [service]);

  // Clear all data
  const clear = useCallback(() => {
    service.clear();
    processedEventIds.current.clear();
    updateState();
  }, [service, updateState]);

  return {
    viewers,
    viewerCount,
    getViewer,
    searchViewers,
    sortViewers,
    getTopViewers,
    processEvent,
    processEvents,
    clear,
    hasViewer,
    service,
  };
}

export default useViewerData;
