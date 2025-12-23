/**
 * useStreamEvents Hook
 * 
 * Captures and manages stream events like subscriptions, resubs, and gift subs.
 * Integrates with twitchService to receive real-time events.
 * 
 * @module hooks/useStreamEvents
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { twitchService, StreamEventData } from '../services/twitchService';
import { StreamEvent, StreamEventType, SubTier } from '../components/StreamActivity';

/**
 * Return type for the useStreamEvents hook
 */
export interface UseStreamEventsReturn {
  /** Array of stream events */
  events: StreamEvent[];
  /** Add a manual event (for testing or external sources) */
  addEvent: (event: StreamEvent) => void;
  /** Clear all events */
  clearEvents: () => void;
  /** Statistics summary */
  stats: {
    follows: number;
    subs: number;
    resubs: number;
    gifts: number;
    raids: number;
    bits: number;
    tier1: number;
    tier2: number;
    tier3: number;
    prime: number;
  };
}

/**
 * Convert twitchService event to StreamActivity event
 */
const convertToStreamEvent = (data: StreamEventData): StreamEvent => {
  const baseEvent = {
    id: `${data.type}_${data.username}_${data.timestamp}`,
    username: data.displayName || data.username,
    timestamp: data.timestamp,
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
      return {
        ...baseEvent,
        type: 'gift' as StreamEventType,
        data: {
          tier: convertTier(data.tier),
          giftCount: data.giftCount || 1,
        },
      };
    
    case 'primepaidupgrade':
    case 'giftpaidupgrade':
    case 'anongiftpaidupgrade':
      return {
        ...baseEvent,
        type: 'sub' as StreamEventType,
        data: {
          tier: convertTier(data.tier),
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
        type: 'raid' as StreamEventType, // Treat hosts similar to raids
        data: {
          viewerCount: data.viewerCount,
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
  const listenerSetupRef = useRef(false);

  // Set up event listener
  useEffect(() => {
    if (listenerSetupRef.current) return;
    listenerSetupRef.current = true;

    twitchService.onStreamEvent((data: StreamEventData) => {
      const event = convertToStreamEvent(data);
      setEvents(prev => {
        // Avoid duplicates
        if (prev.find(e => e.id === event.id)) {
          return prev;
        }
        // Keep last 500 events in memory
        const updated = [...prev, event];
        return updated.slice(-500);
      });
    });
  }, []);

  // Add event manually
  const addEvent = useCallback((event: StreamEvent) => {
    setEvents(prev => {
      if (prev.find(e => e.id === event.id)) {
        return prev;
      }
      return [...prev, event].slice(-500);
    });
  }, []);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Calculate stats
  const stats = {
    follows: events.filter(e => e.type === 'follow').length,
    subs: events.filter(e => e.type === 'sub').length,
    resubs: events.filter(e => e.type === 'resub').length,
    gifts: events.filter(e => e.type === 'gift').reduce((acc, e) => acc + (e.data?.giftCount || 1), 0),
    raids: events.filter(e => e.type === 'raid').length,
    bits: events.filter(e => e.type === 'bits').reduce((acc, e) => acc + (e.data?.amount || 0), 0),
    tier1: events.filter(e => (e.type === 'sub' || e.type === 'resub') && e.data?.tier === '1000').length,
    tier2: events.filter(e => (e.type === 'sub' || e.type === 'resub') && e.data?.tier === '2000').length,
    tier3: events.filter(e => (e.type === 'sub' || e.type === 'resub') && e.data?.tier === '3000').length,
    prime: events.filter(e => (e.type === 'sub' || e.type === 'resub') && e.data?.tier === '1000').length,
  };

  return {
    events,
    addEvent,
    clearEvents,
    stats,
  };
}
