// Hook para suscripción a eventos de plugins
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PluginEvent } from '../types/plugins';
import { getPluginHostService } from '../src/plugins/services/PluginHostService';
import { getPluginManagerService } from '../src/plugins/services/PluginManagerService';

export type EventHandler<T = unknown> = (data: T) => void;

export interface UsePluginEventsReturn {
  // Subscribe to events
  on: <T = unknown>(event: PluginEvent, handler: EventHandler<T>) => () => void;
  once: <T = unknown>(event: PluginEvent, handler: EventHandler<T>) => () => void;
  off: (event: PluginEvent, handler: EventHandler) => void;
  
  // Emit events (for app to notify plugins)
  emit: (event: PluginEvent, data: unknown) => void;
  
  // Event history
  lastEvent: { event: PluginEvent; data: unknown; timestamp: number } | null;
  eventCount: number;
}

export function usePluginEvents(): UsePluginEventsReturn {
  const [lastEvent, setLastEvent] = useState<{ event: PluginEvent; data: unknown; timestamp: number } | null>(null);
  const [eventCount, setEventCount] = useState(0);
  
  const handlersRef = useRef<Map<PluginEvent, Set<EventHandler>>>(new Map());
  const host = getPluginHostService();
  const manager = getPluginManagerService();

  // Set up event listener from host
  useEffect(() => {
    const handleEvent = (event: PluginEvent, data: unknown) => {
      setLastEvent({ event, data, timestamp: Date.now() });
      setEventCount(prev => prev + 1);
      
      // Notify all registered handlers
      const handlers = handlersRef.current.get(event);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (err) {
            console.error(`Error in event handler for ${event}:`, err);
          }
        });
      }
    };

    // Subscribe to host events
    const unsubscribe = host.onEvent(handleEvent);

    return () => {
      unsubscribe();
    };
  }, []);

  const on = useCallback(<T = unknown>(event: PluginEvent, handler: EventHandler<T>): (() => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler as EventHandler);

    return () => {
      handlersRef.current.get(event)?.delete(handler as EventHandler);
    };
  }, []);

  const once = useCallback(<T = unknown>(event: PluginEvent, handler: EventHandler<T>): (() => void) => {
    const wrapper: EventHandler<T> = (data) => {
      handlersRef.current.get(event)?.delete(wrapper as EventHandler);
      handler(data);
    };
    
    return on(event, wrapper);
  }, [on]);

  const off = useCallback((event: PluginEvent, handler: EventHandler): void => {
    handlersRef.current.get(event)?.delete(handler);
  }, []);

  const emit = useCallback((event: PluginEvent, data: unknown): void => {
    manager.broadcastEvent(event, data);
    setLastEvent({ event, data, timestamp: Date.now() });
    setEventCount(prev => prev + 1);
  }, []);

  return {
    on,
    once,
    off,
    emit,
    lastEvent,
    eventCount
  };
}

// Convenience hook for subscribing to a specific event
export function usePluginEvent<T = unknown>(
  event: PluginEvent,
  handler: EventHandler<T>,
  deps: React.DependencyList = []
): void {
  const { on } = usePluginEvents();

  useEffect(() => {
    const unsubscribe = on(event, handler);
    return unsubscribe;
  }, [event, ...deps]);
}
