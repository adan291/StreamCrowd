// useMetrics - Hook for real-time metrics collection and display

import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionMetrics, MetricType, StreamEvent } from '../types/metrics';
import { metricsService } from '../src/application/services/MetricsService';

interface UseMetricsOptions {
  autoStart?: boolean;
  platform?: string;
  channelName?: string;
  refreshInterval?: number;
}

interface UseMetricsReturn {
  currentSession: SessionMetrics | null;
  isRecording: boolean;
  startSession: (platform: string, channelName: string) => void;
  endSession: () => Promise<SessionMetrics | null>;
  recordMetric: (type: MetricType, value: number) => void;
  recordEvent: (event: Omit<StreamEvent, 'id'>) => void;
  refresh: () => void;
}

export function useMetrics(options: UseMetricsOptions = {}): UseMetricsReturn {
  const { autoStart = false, platform, channelName, refreshInterval = 5000 } = options;
  
  const [currentSession, setCurrentSession] = useState<SessionMetrics | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh current metrics
  const refresh = useCallback(() => {
    const metrics = metricsService.getCurrentMetrics();
    setCurrentSession(metrics);
    setIsRecording(metrics !== null);
  }, []);

  // Start a new session
  const startSession = useCallback((plat: string, channel: string) => {
    const session = metricsService.startSession(plat, channel);
    setCurrentSession(session);
    setIsRecording(true);
  }, []);

  // End current session
  const endSession = useCallback(async () => {
    const session = await metricsService.endSession();
    setCurrentSession(null);
    setIsRecording(false);
    return session;
  }, []);

  // Record a metric
  const recordMetric = useCallback((type: MetricType, value: number) => {
    metricsService.recordMetric(type, value);
  }, []);

  // Record an event
  const recordEvent = useCallback((event: Omit<StreamEvent, 'id'>) => {
    metricsService.recordEvent(event);
  }, []);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && platform && channelName) {
      startSession(platform, channelName);
    }
  }, [autoStart, platform, channelName, startSession]);

  // Set up refresh interval
  useEffect(() => {
    if (isRecording && refreshInterval > 0) {
      intervalRef.current = setInterval(refresh, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording, refreshInterval, refresh]);

  // Initial refresh
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    currentSession,
    isRecording,
    startSession,
    endSession,
    recordMetric,
    recordEvent,
    refresh,
  };
}
