/**
 * useStreamEventService Hook
 * 
 * Hook de React para usar StreamEventService con la arquitectura hexagonal.
 * Proporciona gestión de eventos de stream (subs, raids, cheers, etc.) desacoplada de la UI.
 * 
 * Mantiene API compatible con hooks/useStreamEvents.ts
 * 
 * @module src/application/hooks/useStreamEventService
 * @requirements 5.3, 5.6
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { StreamEventService, StreamEventListener, EventSummary, StreamSession } from '../services/StreamEventService';
import type { StreamEvent, StreamEventType, SubTier } from '../../domain/entities/StreamEvent';

// Re-export types for convenience
export type { StreamEvent, StreamEventType, SubTier };

/**
 * Stats summary for stream events
 * Compatible with legacy useStreamEvents hook
 */
export interface StreamEventStats {
  follows: number;
  subs: number;
  resubs: number;
  gifts: number;
  raids: number;
  bits: number;
  // Sub tiers
  tier1: number;
  tier2: number;
  tier3: number;
  prime: number;
  // Gift tiers
  giftsTier1: number;
  giftsTier2: number;
  giftsTier3: number;
  // Moderation
  bans: number;
  timeouts: number;
}

/**
 * Return type for the useStreamEventService hook
 */
export interface UseStreamEventServiceReturn {
  /** Array of stream events (current session) */
  events: StreamEvent[];
  /** Add a manual event */
  addEvent: (event: Omit<StreamEvent, 'id'>) => StreamEvent;
  /** Add multiple events at once */
  addEvents: (events: Omit<StreamEvent, 'id'>[]) => StreamEvent[];
  /** Clear all events from current session */
  clearEvents: () => void;
  /** Statistics summary */
  stats: StreamEventStats;
  /** Current session ID */
  sessionId: string | null;
  /** Channel name for storage */
  channelName: string | null;
  /** Set channel name (starts a new session) - backward compatibility */
  setChannelName: (name: string) => void;
  /** Start a new session */
  startSession: (channelName: string) => void;
  /** End the current session */
  endSession: () => void;
  /** Get events by type */
  getEventsByType: (type: StreamEventType) => StreamEvent[];
  /** Get events by time range */
  getEventsByTimeRange: (start: number, end: number) => StreamEvent[];
  /** Get event summary by type */
  getEventSummary: () => EventSummary;
  /** Register listener for raid events */
  onRaid: (callback: StreamEventListener) => () => void;
  /** Register listener for sub events */
  onSub: (callback: StreamEventListener) => () => void;
  /** Register listener for cheer events */
  onCheer: (callback: StreamEventListener) => () => void;
  /** Register listener for all events */
  onEvent: (callback: StreamEventListener) => () => void;
  /** Get all stored sessions */
  getAllSessions: () => StreamSession[];
  /** Load a session by ID */
  loadSession: (sessionId: string) => boolean;
  /** Delete a session */
  deleteSession: (sessionId: string) => boolean;
  /** Service instance */
  service: StreamEventService;
}

// Singleton service instance
let streamEventServiceInstance: StreamEventService | null = null;

const getStreamEventService = (): StreamEventService => {
  if (!streamEventServiceInstance) {
    streamEventServiceInstance = new StreamEventService();
  }
  return streamEventServiceInstance;
};

/**
 * Calculate stats from events
 */
const calculateStats = (events: StreamEvent[]): StreamEventStats => {
  const stats: StreamEventStats = {
    follows: 0,
    subs: 0,
    resubs: 0,
    gifts: 0,
    raids: 0,
    bits: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    prime: 0,
    giftsTier1: 0,
    giftsTier2: 0,
    giftsTier3: 0,
    bans: 0,
    timeouts: 0,
  };

  for (const event of events) {
    switch (event.type) {
      case 'sub':
        stats.subs++;
        if (event.tier === 'Prime') stats.prime++;
        else if (event.tier === '1000') stats.tier1++;
        else if (event.tier === '2000') stats.tier2++;
        else if (event.tier === '3000') stats.tier3++;
        break;
      case 'resub':
        stats.resubs++;
        if (event.tier === 'Prime') stats.prime++;
        else if (event.tier === '1000') stats.tier1++;
        else if (event.tier === '2000') stats.tier2++;
        else if (event.tier === '3000') stats.tier3++;
        break;
      case 'subgift':
        stats.gifts++;
        if (event.tier === '1000') stats.giftsTier1++;
        else if (event.tier === '2000') stats.giftsTier2++;
        else if (event.tier === '3000') stats.giftsTier3++;
        break;
      case 'submysterygift':
        stats.gifts += event.giftCount || 1;
        if (event.tier === '1000') stats.giftsTier1 += event.giftCount || 1;
        else if (event.tier === '2000') stats.giftsTier2 += event.giftCount || 1;
        else if (event.tier === '3000') stats.giftsTier3 += event.giftCount || 1;
        break;
      case 'raid':
        stats.raids++;
        break;
      case 'cheer':
        stats.bits += event.bits || 0;
        break;
      case 'ban':
        stats.bans++;
        break;
      case 'timeout':
        stats.timeouts++;
        break;
    }
  }

  return stats;
};

/**
 * Hook para gestionar eventos de stream usando StreamEventService
 * 
 * @example
 * ```tsx
 * const { events, stats, startSession, onRaid, onSub } = useStreamEventService();
 * 
 * // Start session when connecting
 * useEffect(() => {
 *   if (connected) {
 *     startSession(channelName);
 *   }
 * }, [connected, channelName]);
 * 
 * // Listen for raids
 * useEffect(() => {
 *   return onRaid((event) => {
 *     console.log(`Raid from ${event.username} with ${event.viewerCount} viewers!`);
 *   });
 * }, [onRaid]);
 * ```
 */
export function useStreamEventService(): UseStreamEventServiceReturn {
  const serviceRef = useRef<StreamEventService>(getStreamEventService());
  
  const [events, setEvents] = useState<StreamEvent[]>(() => serviceRef.current.getEvents());
  const [sessionId, setSessionId] = useState<string | null>(() => serviceRef.current.getSessionId());
  const [channelName, setChannelName] = useState<string | null>(() => serviceRef.current.getChannelName());

  // Subscribe to all events to keep state in sync
  useEffect(() => {
    const unsubscribe = serviceRef.current.on('all', () => {
      setEvents([...serviceRef.current.getEvents()]);
    });
    
    return unsubscribe;
  }, []);

  // Calculate stats from events
  const stats = useMemo(() => calculateStats(events), [events]);

  const startSession = useCallback((channel: string) => {
    serviceRef.current.startSession(channel);
    setSessionId(serviceRef.current.getSessionId());
    setChannelName(channel);
    setEvents([]);
  }, []);

  // Backward compatibility alias for setChannelName
  const setChannelNameCompat = useCallback((name: string) => {
    if (name) {
      startSession(name);
    }
  }, [startSession]);

  const endSession = useCallback(() => {
    serviceRef.current.endSession();
    setSessionId(null);
    setChannelName(null);
    setEvents([]);
  }, []);

  const addEvent = useCallback((eventData: Omit<StreamEvent, 'id'>): StreamEvent => {
    const event = serviceRef.current.addEvent(eventData);
    setEvents([...serviceRef.current.getEvents()]);
    return event;
  }, []);

  const addEvents = useCallback((eventsData: Omit<StreamEvent, 'id'>[]): StreamEvent[] => {
    const addedEvents: StreamEvent[] = [];
    for (const eventData of eventsData) {
      addedEvents.push(serviceRef.current.addEvent(eventData));
    }
    setEvents([...serviceRef.current.getEvents()]);
    return addedEvents;
  }, []);

  const clearEvents = useCallback(() => {
    serviceRef.current.clearEvents();
    setEvents([]);
  }, []);

  const getEventsByType = useCallback((type: StreamEventType): StreamEvent[] => {
    return serviceRef.current.getEvents(type);
  }, []);

  const getEventsByTimeRange = useCallback((start: number, end: number): StreamEvent[] => {
    return serviceRef.current.getEventsByTimeRange(start, end);
  }, []);

  const getEventSummary = useCallback((): EventSummary => {
    return serviceRef.current.getEventSummary();
  }, []);

  // Event listeners
  const onRaid = useCallback((callback: StreamEventListener): () => void => {
    return serviceRef.current.on('raid', callback);
  }, []);

  const onSub = useCallback((callback: StreamEventListener): () => void => {
    // Listen to all sub-related events
    const unsubs = [
      serviceRef.current.on('sub', callback),
      serviceRef.current.on('resub', callback),
      serviceRef.current.on('subgift', callback),
      serviceRef.current.on('submysterygift', callback),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const onCheer = useCallback((callback: StreamEventListener): () => void => {
    return serviceRef.current.on('cheer', callback);
  }, []);

  const onEvent = useCallback((callback: StreamEventListener): () => void => {
    return serviceRef.current.on('all', callback);
  }, []);

  // Session management
  const getAllSessions = useCallback((): StreamSession[] => {
    return serviceRef.current.getAllSessions();
  }, []);

  const loadSession = useCallback((id: string): boolean => {
    const success = serviceRef.current.loadSession(id);
    if (success) {
      setSessionId(serviceRef.current.getSessionId());
      setChannelName(serviceRef.current.getChannelName());
      setEvents([...serviceRef.current.getEvents()]);
    }
    return success;
  }, []);

  const deleteSession = useCallback((id: string): boolean => {
    return serviceRef.current.deleteSession(id);
  }, []);

  return {
    events,
    addEvent,
    addEvents,
    clearEvents,
    stats,
    sessionId,
    channelName,
    setChannelName: setChannelNameCompat,
    startSession,
    endSession,
    getEventsByType,
    getEventsByTimeRange,
    getEventSummary,
    onRaid,
    onSub,
    onCheer,
    onEvent,
    getAllSessions,
    loadSession,
    deleteSession,
    service: serviceRef.current,
  };
}

export default useStreamEventService;

// ==================== Utility Functions ====================
// These are exported for backward compatibility with legacy code

/**
 * Generate a unique ID for an event
 * @param type - Event type
 * @param username - Username
 * @param timestamp - Timestamp
 * @param extra - Optional extra identifier
 * @returns Unique event ID
 */
export const generateEventId = (type: string, username: string, timestamp: number, extra?: string): string => {
  const base = `${type}_${username}_${timestamp}`;
  if (extra) {
    return `${base}_${extra}`;
  }
  // Add random suffix to prevent collisions for same-second events
  return `${base}_${Math.random().toString(36).slice(2, 8)}`;
};

/**
 * Get today's date string in YYYY-MM-DD format
 * @returns Today's date as YYYY-MM-DD string
 */
export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Storage keys for legacy compatibility
const EVENTS_BY_DATE_KEY = 'stream_activity_by_date_v2';
const MAX_EVENTS_PER_DAY = 2000;
const MAX_DAYS_STORED = 30;

/**
 * Base event interface for storage helpers
 * This allows the helpers to work with both domain StreamEvent and legacy component types
 */
interface BaseStorageEvent {
  id: string;
  timestamp: number;
}

/**
 * Storage helper functions for backward compatibility with legacy date-based storage
 * These are used by components that need to access historical data by date
 * Uses generic types to work with both domain and legacy event types
 */
export const storageHelpers = {
  /**
   * Save events for a specific date
   */
  saveEventsForDate: <T extends BaseStorageEvent>(channelName: string, date: string, events: T[]): void => {
    if (!channelName) return;
    
    const key = `${EVENTS_BY_DATE_KEY}_${channelName.toLowerCase()}_${date}`;
    const trimmed = events.slice(-MAX_EVENTS_PER_DAY);
    
    try {
      localStorage.setItem(key, JSON.stringify(trimmed));
      
      // Update dates index
      const datesKey = `${EVENTS_BY_DATE_KEY}_${channelName.toLowerCase()}_dates`;
      const dates: string[] = JSON.parse(localStorage.getItem(datesKey) || '[]');
      if (!dates.includes(date)) {
        dates.push(date);
        dates.sort();
        const trimmedDates = dates.slice(-MAX_DAYS_STORED);
        localStorage.setItem(datesKey, JSON.stringify(trimmedDates));
      }
    } catch (e) {
      console.warn('Failed to save events to localStorage:', e);
    }
  },

  /**
   * Load events for a specific date
   */
  loadEventsForDate: <T extends BaseStorageEvent>(channelName: string, date: string): T[] => {
    if (!channelName) return [];
    
    const key = `${EVENTS_BY_DATE_KEY}_${channelName.toLowerCase()}_${date}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load events from localStorage:', e);
    }
    return [];
  },

  /**
   * Get available dates with stored data
   */
  getAvailableDates: (channelName: string): string[] => {
    if (!channelName) return [];
    
    const datesKey = `${EVENTS_BY_DATE_KEY}_${channelName.toLowerCase()}_dates`;
    try {
      const stored = localStorage.getItem(datesKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load dates from localStorage:', e);
    }
    return [];
  },

  /**
   * Clear events for a specific date
   */
  clearEventsForDate: (channelName: string, date: string): void => {
    if (!channelName) return;
    
    const key = `${EVENTS_BY_DATE_KEY}_${channelName.toLowerCase()}_${date}`;
    localStorage.removeItem(key);
    
    const datesKey = `${EVENTS_BY_DATE_KEY}_${channelName.toLowerCase()}_dates`;
    try {
      const dates: string[] = JSON.parse(localStorage.getItem(datesKey) || '[]');
      const filtered = dates.filter(d => d !== date);
      localStorage.setItem(datesKey, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to update dates in localStorage:', e);
    }
  },

  /**
   * Merge events avoiding duplicates
   */
  mergeEvents: <T extends BaseStorageEvent>(existing: T[], newEvents: T[]): T[] => {
    const existingIds = new Set(existing.map(e => e.id));
    const merged = [...existing];
    
    for (const event of newEvents) {
      if (!existingIds.has(event.id)) {
        merged.push(event);
        existingIds.add(event.id);
      }
    }
    
    // Sort by timestamp
    merged.sort((a, b) => a.timestamp - b.timestamp);
    
    return merged;
  }
};
