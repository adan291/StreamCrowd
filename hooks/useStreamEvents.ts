/**
 * useStreamEvents Hook
 * 
 * Captures and manages stream events like subscriptions, resubs, and gift subs.
 * Integrates with twitchService to receive real-time events.
 * Persists data to localStorage to prevent data loss.
 * 
 * @module hooks/useStreamEvents
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { twitchService, StreamEventData } from '../services/twitchService';
import { StreamEvent, StreamEventType, SubTier } from '../components/StreamActivity';

// Storage keys
const EVENTS_STORAGE_KEY = 'stream_events_v2';
const EVENTS_BY_DATE_KEY = 'stream_activity_by_date_v2';
const MAX_EVENTS_IN_MEMORY = 1000;
const MAX_EVENTS_PER_DAY = 2000;
const MAX_DAYS_STORED = 30;

/**
 * Generate a unique ID for an event
 */
const generateEventId = (type: string, username: string, timestamp: number, extra?: string): string => {
  const base = `${type}_${username}_${timestamp}`;
  if (extra) {
    return `${base}_${extra}`;
  }
  // Add random suffix to prevent collisions for same-second events
  return `${base}_${Math.random().toString(36).substr(2, 6)}`;
};

/**
 * Get today's date string in YYYY-MM-DD format
 */
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Return type for the useStreamEvents hook
 */
export interface UseStreamEventsReturn {
  /** Array of stream events (current session) */
  events: StreamEvent[];
  /** Add a manual event (for testing or external sources) */
  addEvent: (event: StreamEvent) => void;
  /** Add multiple events at once (for API fetches) */
  addEvents: (events: StreamEvent[]) => void;
  /** Clear all events from current session */
  clearEvents: () => void;
  /** Load events from a specific date */
  loadEventsFromDate: (date: string) => StreamEvent[];
  /** Load events from a date range */
  loadEventsFromRange: (fromDate: string, toDate: string) => StreamEvent[];
  /** Get available dates with stored data */
  getAvailableDates: () => string[];
  /** Clear events for a specific date */
  clearEventsForDate: (date: string) => void;
  /** Statistics summary */
  stats: {
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
  };
  /** Channel name for storage */
  channelName: string;
  /** Set channel name */
  setChannelName: (name: string) => void;
}

/**
 * Convert twitchService event to StreamActivity event
 * 
 * IMPORTANT: Twitch sends both submysterygift (bulk) AND individual subgift events.
 * To avoid double-counting:
 * - submysterygift: We track this as 'giftbulk' type (the gifter's action)
 * - subgift: We track this as 'gift' type (individual recipient)
 * 
 * For stats, we count:
 * - Total gifts given = sum of giftbulk.giftCount (or count of gift events if no bulk)
 * - Individual recipients = count of gift events
 */
const convertToStreamEvent = (data: StreamEventData): StreamEvent => {
  const timestamp = data.timestamp || Date.now();
  
  // Create unique ID based on event type and data
  let eventId: string;
  switch (data.type) {
    case 'sub':
      // Include tier in ID to differentiate tier upgrades
      eventId = generateEventId('sub', data.username, timestamp, `t${data.tier || '1000'}`);
      break;
    case 'resub':
      // Include months and tier for uniqueness
      eventId = generateEventId('resub', data.username, timestamp, `m${data.cumulativeMonths || data.months}_t${data.tier || '1000'}`);
      break;
    case 'subgift':
      // Individual gift - use recipient in ID to make unique
      eventId = generateEventId('subgift', data.username, timestamp, `to_${data.recipientUsername}`);
      break;
    case 'submysterygift':
      // Bulk gift - use count in ID
      eventId = generateEventId('giftbulk', data.username, timestamp, `x${data.giftCount}`);
      break;
    case 'cheer':
      eventId = generateEventId('cheer', data.username, timestamp, `${data.bits}bits`);
      break;
    case 'raid':
      eventId = generateEventId('raid', data.username, timestamp, `${data.viewerCount}v`);
      break;
    case 'hosted':
      eventId = generateEventId('host', data.username, timestamp, `${data.viewerCount}v`);
      break;
    case 'primepaidupgrade':
      eventId = generateEventId('primeupgrade', data.username, timestamp);
      break;
    case 'giftpaidupgrade':
      eventId = generateEventId('giftupgrade', data.username, timestamp, `from_${data.gifterUsername}`);
      break;
    case 'anongiftpaidupgrade':
      eventId = generateEventId('anongiftupgrade', data.username, timestamp);
      break;
    default:
      eventId = generateEventId(data.type, data.username, timestamp);
  }

  const baseEvent = {
    id: eventId,
    username: data.displayName || data.username,
    timestamp,
  };

  switch (data.type) {
    case 'sub':
      return {
        ...baseEvent,
        type: 'sub' as StreamEventType,
        data: {
          tier: convertTier(data.tier),
          message: data.message,
        },
      };
    
    case 'resub':
      return {
        ...baseEvent,
        type: 'resub' as StreamEventType,
        data: {
          tier: convertTier(data.tier),
          months: data.cumulativeMonths || data.months,
          message: data.message,
        },
      };
    
    case 'subgift':
      // Individual gift to a specific person
      return {
        ...baseEvent,
        type: 'gift' as StreamEventType,
        data: {
          tier: convertTier(data.tier),
          giftCount: 1,
          recipientUsername: data.recipientDisplayName || data.recipientUsername,
        },
      };
    
    case 'submysterygift':
      // Bulk gift announcement (X is gifting Y subs!)
      // We use 'giftbulk' internally but display as 'gift' with the total count
      return {
        ...baseEvent,
        type: 'gift' as StreamEventType,
        data: {
          tier: convertTier(data.tier),
          giftCount: data.giftCount || 1,
          // Mark as bulk gift so we can differentiate in stats
          message: `bulk_gift_${data.giftCount}`,
        },
      };
    
    case 'primepaidupgrade':
      return {
        ...baseEvent,
        type: 'sub' as StreamEventType,
        data: {
          tier: '1000' as SubTier, // Prime upgrades to Tier 1
          message: 'Prime upgrade',
        },
      };
    
    case 'giftpaidupgrade':
      return {
        ...baseEvent,
        type: 'sub' as StreamEventType,
        data: {
          tier: convertTier(data.tier),
          message: `Gift upgrade from ${data.gifterUsername || 'anonymous'}`,
        },
      };
    
    case 'anongiftpaidupgrade':
      return {
        ...baseEvent,
        type: 'sub' as StreamEventType,
        data: {
          tier: convertTier(data.tier),
          message: 'Anonymous gift upgrade',
        },
      };
    
    case 'raid':
      return {
        ...baseEvent,
        type: 'raid' as StreamEventType,
        data: {
          viewerCount: data.viewerCount,
        },
      };
    
    case 'cheer':
      return {
        ...baseEvent,
        type: 'bits' as StreamEventType,
        data: {
          amount: data.bits,
          message: data.message,
        },
      };
    
    case 'hosted':
      return {
        ...baseEvent,
        type: 'raid' as StreamEventType,
        data: {
          viewerCount: data.viewerCount,
          message: 'host', // Mark as host to differentiate from raid
        },
      };
    
    default:
      return {
        ...baseEvent,
        type: 'sub' as StreamEventType,
        data: {},
      };
  }
};

/**
 * Convert twitchService tier to StreamActivity tier
 */
const convertTier = (tier?: string): SubTier => {
  switch (tier) {
    case 'Prime':
    case '1000':
      return '1000';
    case '2000':
      return '2000';
    case '3000':
      return '3000';
    default:
      return '1000';
  }
};

/**
 * Storage helper functions
 */
const storageHelpers = {
  // Save events for a specific date
  saveEventsForDate: (channelName: string, date: string, events: StreamEvent[]): void => {
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

  // Load events for a specific date
  loadEventsForDate: (channelName: string, date: string): StreamEvent[] => {
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

  // Get available dates
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

  // Clear events for a specific date
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

  // Merge events avoiding duplicates
  mergeEvents: (existing: StreamEvent[], newEvents: StreamEvent[]): StreamEvent[] => {
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

/**
 * Hook for managing stream events
 * 
 * @example
 * ```tsx
 * const { events, stats, addEvent, clearEvents } = useStreamEvents();
 * 
 * // Events are automatically captured from twitchService
 * // Use stats for quick summaries
 * console.log(`Total subs: ${stats.subs}`);
 * ```
 */
export function useStreamEvents(): UseStreamEventsReturn {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [channelName, setChannelName] = useState<string>('');
  const listenerSetupRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  // Load events from today on mount or channel change
  useEffect(() => {
    if (!channelName) return;
    
    const today = getTodayString();
    const todayEvents = storageHelpers.loadEventsForDate(channelName, today);
    
    if (todayEvents.length > 0) {
      setEvents(prev => storageHelpers.mergeEvents(prev, todayEvents));
    }
  }, [channelName]);

  // Debounced save to localStorage
  const saveToStorage = useCallback((eventsToSave: StreamEvent[]) => {
    if (!channelName) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save by 2 seconds
    saveTimeoutRef.current = setTimeout(() => {
      const today = getTodayString();
      const todayEvents = eventsToSave.filter(e => {
        const eventDate = new Date(e.timestamp).toISOString().split('T')[0];
        return eventDate === today;
      });
      
      // Only save if there are changes
      const eventsJson = JSON.stringify(todayEvents);
      if (eventsJson !== lastSavedRef.current) {
        storageHelpers.saveEventsForDate(channelName, today, todayEvents);
        lastSavedRef.current = eventsJson;
      }
    }, 2000);
  }, [channelName]);

  // Save events when they change
  useEffect(() => {
    if (events.length > 0) {
      saveToStorage(events);
    }
  }, [events, saveToStorage]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Force immediate save on unmount
      if (channelName && events.length > 0) {
        const today = getTodayString();
        const todayEvents = events.filter(e => {
          const eventDate = new Date(e.timestamp).toISOString().split('T')[0];
          return eventDate === today;
        });
        storageHelpers.saveEventsForDate(channelName, today, todayEvents);
      }
    };
  }, [channelName, events]);

  // Set up event listener for TMI.js events
  useEffect(() => {
    if (listenerSetupRef.current) return;
    listenerSetupRef.current = true;

    twitchService.onStreamEvent((data: StreamEventData) => {
      const event = convertToStreamEvent(data);
      setEvents(prev => {
        // Check for duplicates using ID
        if (prev.find(e => e.id === event.id)) {
          return prev;
        }
        // Also check for near-duplicates (same type, user, within 1 second)
        const isDuplicate = prev.some(e => 
          e.type === event.type && 
          e.username === event.username && 
          Math.abs(e.timestamp - event.timestamp) < 1000
        );
        if (isDuplicate) {
          return prev;
        }
        
        // Add event and trim to max size
        const updated = [...prev, event];
        return updated.slice(-MAX_EVENTS_IN_MEMORY);
      });
    });
  }, []);

  // Add single event manually
  const addEvent = useCallback((event: StreamEvent) => {
    setEvents(prev => {
      // Check for exact duplicate
      if (prev.find(e => e.id === event.id)) {
        return prev;
      }
      // Check for near-duplicate
      const isDuplicate = prev.some(e => 
        e.type === event.type && 
        e.username === event.username && 
        Math.abs(e.timestamp - event.timestamp) < 1000
      );
      if (isDuplicate) {
        return prev;
      }
      
      return [...prev, event].slice(-MAX_EVENTS_IN_MEMORY);
    });
  }, []);

  // Add multiple events at once (for API fetches)
  const addEvents = useCallback((newEvents: StreamEvent[]) => {
    setEvents(prev => {
      const merged = storageHelpers.mergeEvents(prev, newEvents);
      return merged.slice(-MAX_EVENTS_IN_MEMORY);
    });
  }, []);

  // Clear all events from current session
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Load events from a specific date
  const loadEventsFromDate = useCallback((date: string): StreamEvent[] => {
    return storageHelpers.loadEventsForDate(channelName, date);
  }, [channelName]);

  // Load events from a date range
  const loadEventsFromRange = useCallback((fromDate: string, toDate: string): StreamEvent[] => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (from > to) return [];
    
    const allEvents: StreamEvent[] = [];
    const current = new Date(from);
    
    while (current <= to) {
      const dateStr = current.toISOString().split('T')[0];
      const dayEvents = storageHelpers.loadEventsForDate(channelName, dateStr);
      allEvents.push(...dayEvents);
      current.setDate(current.getDate() + 1);
    }
    
    // Sort and deduplicate
    const uniqueEvents = storageHelpers.mergeEvents([], allEvents);
    return uniqueEvents;
  }, [channelName]);

  // Get available dates
  const getAvailableDates = useCallback((): string[] => {
    return storageHelpers.getAvailableDates(channelName);
  }, [channelName]);

  // Clear events for a specific date
  const clearEventsForDate = useCallback((date: string): void => {
    storageHelpers.clearEventsForDate(channelName, date);
  }, [channelName]);

  // Calculate stats using useMemo for performance
  // IMPORTANT: For gifts, we need to avoid double-counting.
  // When someone gifts 5 subs, Twitch sends:
  // 1. One submysterygift event with giftCount=5 (bulk announcement)
  // 2. Five subgift events (one per recipient)
  // 
  // We count gifts by looking at individual gift events (subgift) only,
  // NOT the bulk announcements, to get accurate recipient count.
  const stats = useMemo(() => {
    const giftEvents = events.filter(e => e.type === 'gift');
    
    // Count individual gifts (those with recipientUsername) vs bulk announcements
    const individualGifts = giftEvents.filter(e => e.data?.recipientUsername);
    const bulkGifts = giftEvents.filter(e => e.data?.message?.startsWith('bulk_gift_'));
    
    // Use individual gifts for counting if available, otherwise use bulk
    const giftsToCount = individualGifts.length > 0 ? individualGifts : bulkGifts;
    
    // Total gift count
    let totalGifts: number;
    if (individualGifts.length > 0) {
      totalGifts = individualGifts.length;
    } else {
      totalGifts = bulkGifts.reduce((acc, e) => acc + (e.data?.giftCount || 1), 0);
    }
    
    // Gift tier counts (using the same logic - prefer individual, fall back to bulk)
    const countGiftsByTier = (tier: string): number => {
      if (individualGifts.length > 0) {
        return individualGifts.filter(e => e.data?.tier === tier).length;
      } else {
        return bulkGifts
          .filter(e => e.data?.tier === tier)
          .reduce((acc, e) => acc + (e.data?.giftCount || 1), 0);
      }
    };
    
    return {
      follows: events.filter(e => e.type === 'follow').length,
      subs: events.filter(e => e.type === 'sub').length,
      resubs: events.filter(e => e.type === 'resub').length,
      gifts: totalGifts,
      raids: events.filter(e => e.type === 'raid').length,
      bits: events.filter(e => e.type === 'bits').reduce((acc, e) => acc + (e.data?.amount || 0), 0),
      // Sub/resub tiers
      tier1: events.filter(e => (e.type === 'sub' || e.type === 'resub') && e.data?.tier === '1000').length,
      tier2: events.filter(e => (e.type === 'sub' || e.type === 'resub') && e.data?.tier === '2000').length,
      tier3: events.filter(e => (e.type === 'sub' || e.type === 'resub') && e.data?.tier === '3000').length,
      prime: events.filter(e => (e.type === 'sub' || e.type === 'resub') && e.data?.tier === '1000').length,
      // Gift tiers
      giftsTier1: countGiftsByTier('1000'),
      giftsTier2: countGiftsByTier('2000'),
      giftsTier3: countGiftsByTier('3000'),
    };
  }, [events]);

  return {
    events,
    addEvent,
    addEvents,
    clearEvents,
    loadEventsFromDate,
    loadEventsFromRange,
    getAvailableDates,
    clearEventsForDate,
    stats,
    channelName,
    setChannelName,
  };
}

// Export storage helpers for use in other components
export { storageHelpers, generateEventId, getTodayString };
