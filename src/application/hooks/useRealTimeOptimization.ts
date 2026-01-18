/**
 * useRealTimeOptimization - Master hook for real-time performance optimization
 * Integrates debouncing, throttling, batching, and deduplication
 * Critical for reducing CPU usage in OBS and improving UI responsiveness
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce, useDebouncedCallback } from './useDebounce';
import { useThrottle, useThrottledCallback, useRealTimeThrottle } from './useThrottle';
import { useRequestDeduplication } from '../services/RequestDeduplicator';
import { 
  useBatchedUpdates, 
  useBatchedArrayUpdates, 
  useBatchedChatMessages,
  useBatchedViewerCount,
  useBatchUpdatePerformance 
} from '../services/BatchUpdateOptimizer';
import { WebSocketManagerFactory } from '../services/WebSocketManager';

export interface RealTimeConfig {
  // Debounce settings
  debounceDelay?: number;
  
  // Throttle settings
  throttleInterval?: number;
  maxUpdatesPerSecond?: number;
  
  // Batch settings
  batchSize?: number;
  batchDelay?: number;
  
  // WebSocket settings
  enableWebSocket?: boolean;
  webSocketUrl?: string;
  
  // Performance monitoring
  enableMonitoring?: boolean;
  
  // Feature flags
  enableDeduplication?: boolean;
  enableBatching?: boolean;
  enableThrottling?: boolean;
  enableDebouncing?: boolean;
}

export interface RealTimeStats {
  // Performance metrics
  averageLatency: number;
  messagesPerSecond: number;
  cpuUsageReduction: number;
  
  // Optimization stats
  debounceStats: { calls: number; executions: number };
  throttleStats: { calls: number; executions: number };
  batchStats: { totalUpdates: number; batchedUpdates: number };
  deduplicationStats: { totalRequests: number; duplicatesFiltered: number };
  
  // WebSocket stats
  webSocketStats?: {
    isConnected: boolean;
    messagesReceived: number;
    messagesSent: number;
    reconnectAttempts: number;
  };
}

/**
 * Master hook for real-time optimization
 */
export function useRealTimeOptimization(config: RealTimeConfig = {}) {
  const {
    debounceDelay = 300,
    throttleInterval = 100,
    maxUpdatesPerSecond = 10,
    batchSize = 20,
    batchDelay = 50,
    enableWebSocket = false,
    webSocketUrl,
    enableMonitoring = true,
    enableDeduplication = true,
    enableBatching = true,
    enableThrottling = true,
    enableDebouncing = true
  } = config;

  // Performance monitoring
  const { stats: batchStats } = useBatchUpdatePerformance();
  const { getStats: getDeduplicationStats } = useRequestDeduplication();
  const [performanceStats, setPerformanceStats] = useState<RealTimeStats>({
    averageLatency: 0,
    messagesPerSecond: 0,
    cpuUsageReduction: 0,
    debounceStats: { calls: 0, executions: 0 },
    throttleStats: { calls: 0, executions: 0 },
    batchStats: { totalUpdates: 0, batchedUpdates: 0 },
    deduplicationStats: { totalRequests: 0, duplicatesFiltered: 0 }
  });

  // WebSocket management
  const webSocketManager = useRef(
    enableWebSocket && webSocketUrl 
      ? WebSocketManagerFactory.getTwitchManager(webSocketUrl)
      : null
  );

  // Performance counters
  const performanceCounters = useRef({
    debounceCallCount: 0,
    debounceExecutionCount: 0,
    throttleCallCount: 0,
    throttleExecutionCount: 0,
    lastStatsUpdate: Date.now()
  });

  /**
   * Optimized debounced function
   */
  const createOptimizedDebounce = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = debounceDelay
  ) => {
    if (!enableDebouncing) return fn;

    const [debouncedFn] = useDebouncedCallback(
      (...args: Parameters<T>) => {
        performanceCounters.current.debounceExecutionCount++;
        return fn(...args);
      },
      delay,
      { leading: false, trailing: true }
    );

    return ((...args: Parameters<T>) => {
      performanceCounters.current.debounceCallCount++;
      return debouncedFn(...args);
    }) as T;
  }, [debounceDelay, enableDebouncing]);

  /**
   * Optimized throttled function
   */
  const createOptimizedThrottle = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    interval: number = throttleInterval
  ) => {
    if (!enableThrottling) return fn;

    const [throttledFn] = useThrottledCallback(
      (...args: Parameters<T>) => {
        performanceCounters.current.throttleExecutionCount++;
        return fn(...args);
      },
      interval,
      { leading: true, trailing: true }
    );

    return ((...args: Parameters<T>) => {
      performanceCounters.current.throttleCallCount++;
      return throttledFn(...args);
    }) as T;
  }, [throttleInterval, enableThrottling]);

  /**
   * Optimized real-time data handler
   */
  const createRealTimeHandler = useCallback(<T>(
    initialData: T,
    options: {
      throttleInterval?: number;
      maxUpdatesPerSecond?: number;
      priorityUpdates?: (prev: T, next: T) => boolean;
    } = {}
  ) => {
    const throttledData = useRealTimeThrottle(
      initialData,
      options.throttleInterval || throttleInterval,
      {
        maxUpdatesPerSecond: options.maxUpdatesPerSecond || maxUpdatesPerSecond,
        priorityUpdates: options.priorityUpdates
      }
    );

    return throttledData;
  }, [throttleInterval, maxUpdatesPerSecond]);

  /**
   * Optimized chat message handler
   */
  const createChatHandler = useCallback(() => {
    const [messages, addMessages, clearMessages] = useBatchedChatMessages(500);
    
    const addMessage = createOptimizedDebounce((message: any) => {
      addMessages(message);
    }, 100);

    const addMultipleMessages = createOptimizedThrottle((newMessages: any[]) => {
      addMessages(newMessages);
    }, 200);

    return {
      messages,
      addMessage: enableBatching ? addMessage : (msg: any) => addMessages(msg),
      addMultipleMessages: enableBatching ? addMultipleMessages : addMessages,
      clearMessages
    };
  }, [createOptimizedDebounce, createOptimizedThrottle, enableBatching]);

  /**
   * Optimized viewer count handler
   */
  const createViewerCountHandler = useCallback((initialCount: number = 0) => {
    const [viewerCount, setViewerCount] = useBatchedViewerCount(initialCount);
    
    const updateViewerCount = createOptimizedThrottle((count: number) => {
      setViewerCount(count);
    }, 5000); // Update max once per 5 seconds

    return {
      viewerCount,
      updateViewerCount: enableBatching ? updateViewerCount : setViewerCount
    };
  }, [createOptimizedThrottle, enableBatching]);

  /**
   * WebSocket message sender with optimization
   */
  const sendWebSocketMessage = useCallback((message: any) => {
    if (!webSocketManager.current) return false;

    const optimizedSend = enableDeduplication
      ? createOptimizedDebounce((msg: any) => {
          webSocketManager.current?.sendMessage({
            type: msg.type || 'message',
            data: msg
          });
        }, 50)
      : (msg: any) => {
          webSocketManager.current?.sendMessage({
            type: msg.type || 'message',
            data: msg
          });
        };

    return optimizedSend(message);
  }, [createOptimizedDebounce, enableDeduplication]);

  /**
   * Performance monitoring and stats collection
   */
  useEffect(() => {
    if (!enableMonitoring) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - performanceCounters.current.lastStatsUpdate;
      
      // Calculate messages per second
      const messagesPerSecond = enableBatching 
        ? (batchStats.batchedUpdates / (timeSinceLastUpdate / 1000))
        : 0;

      // Calculate CPU usage reduction (estimated)
      const debounceReduction = performanceCounters.current.debounceCallCount > 0
        ? (1 - (performanceCounters.current.debounceExecutionCount / performanceCounters.current.debounceCallCount)) * 100
        : 0;
      
      const throttleReduction = performanceCounters.current.throttleCallCount > 0
        ? (1 - (performanceCounters.current.throttleExecutionCount / performanceCounters.current.throttleCallCount)) * 100
        : 0;

      const batchReduction = batchStats.totalUpdates > 0
        ? (1 - (batchStats.batchedUpdates / batchStats.totalUpdates)) * 100
        : 0;

      const averageCpuReduction = (debounceReduction + throttleReduction + batchReduction) / 3;

      const deduplicationStats = enableDeduplication ? getDeduplicationStats() : {
        totalRequests: 0,
        duplicatesFiltered: 0
      };

      setPerformanceStats({
        averageLatency: webSocketManager.current?.getStats().averageLatency || 0,
        messagesPerSecond,
        cpuUsageReduction: averageCpuReduction,
        debounceStats: {
          calls: performanceCounters.current.debounceCallCount,
          executions: performanceCounters.current.debounceExecutionCount
        },
        throttleStats: {
          calls: performanceCounters.current.throttleCallCount,
          executions: performanceCounters.current.throttleExecutionCount
        },
        batchStats: {
          totalUpdates: batchStats.totalUpdates,
          batchedUpdates: batchStats.batchedUpdates
        },
        deduplicationStats: {
          totalRequests: deduplicationStats.totalRequests,
          duplicatesFiltered: deduplicationStats.duplicatesFiltered
        },
        webSocketStats: webSocketManager.current ? {
          isConnected: webSocketManager.current.getStats().isConnected,
          messagesReceived: webSocketManager.current.getStats().messagesReceived,
          messagesSent: webSocketManager.current.getStats().messagesSent,
          reconnectAttempts: webSocketManager.current.getStats().reconnectAttempts
        } : undefined
      });

      performanceCounters.current.lastStatsUpdate = now;
    }, 1000);

    return () => clearInterval(interval);
  }, [enableMonitoring, batchStats, getDeduplicationStats, enableDeduplication]);

  /**
   * WebSocket connection management
   */
  useEffect(() => {
    if (enableWebSocket && webSocketManager.current) {
      webSocketManager.current.connect().catch(console.error);

      return () => {
        webSocketManager.current?.disconnect();
      };
    }
  }, [enableWebSocket]);

  return {
    // Optimization functions
    createOptimizedDebounce,
    createOptimizedThrottle,
    createRealTimeHandler,
    
    // Specialized handlers
    createChatHandler,
    createViewerCountHandler,
    
    // WebSocket
    sendWebSocketMessage,
    webSocketManager: webSocketManager.current,
    
    // Performance stats
    performanceStats,
    
    // Configuration
    config: {
      debounceDelay,
      throttleInterval,
      maxUpdatesPerSecond,
      batchSize,
      batchDelay,
      enableWebSocket,
      enableMonitoring,
      enableDeduplication,
      enableBatching,
      enableThrottling,
      enableDebouncing
    }
  };
}

/**
 * Specialized hook for streaming optimization
 */
export function useStreamingOptimization(webSocketUrl?: string) {
  return useRealTimeOptimization({
    debounceDelay: 200,
    throttleInterval: 50,
    maxUpdatesPerSecond: 20,
    batchSize: 30,
    batchDelay: 33, // ~30fps
    enableWebSocket: !!webSocketUrl,
    webSocketUrl,
    enableMonitoring: true,
    enableDeduplication: true,
    enableBatching: true,
    enableThrottling: true,
    enableDebouncing: true
  });
}

/**
 * Specialized hook for OBS overlay optimization
 */
export function useOBSOptimization() {
  return useRealTimeOptimization({
    debounceDelay: 100,
    throttleInterval: 33, // ~30fps
    maxUpdatesPerSecond: 30,
    batchSize: 10,
    batchDelay: 16, // ~60fps
    enableWebSocket: false,
    enableMonitoring: true,
    enableDeduplication: true,
    enableBatching: true,
    enableThrottling: true,
    enableDebouncing: false // Less debouncing for overlays
  });
}

/**
 * Specialized hook for chat optimization
 */
export function useChatOptimization() {
  return useRealTimeOptimization({
    debounceDelay: 300,
    throttleInterval: 100,
    maxUpdatesPerSecond: 10,
    batchSize: 50,
    batchDelay: 100,
    enableWebSocket: false,
    enableMonitoring: true,
    enableDeduplication: true,
    enableBatching: true,
    enableThrottling: true,
    enableDebouncing: true
  });
}