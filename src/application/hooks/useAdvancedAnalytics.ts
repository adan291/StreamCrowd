/**
 * useAdvancedAnalytics Hook
 * 
 * Hook de React para usar AdvancedAnalyticsService con la arquitectura hexagonal.
 * Proporciona gestión de sesiones, métricas en tiempo real y exportación.
 * 
 * @module src/application/hooks/useAdvancedAnalytics
 * @requirements 3.1, 3.3, 3.4, 3.6
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  AdvancedAnalyticsService, 
  getAdvancedAnalyticsService,
  StreamSession,
  TimelinePoint
} from '../services/AdvancedAnalyticsService';

// Re-export types for convenience
export type { StreamSession, TimelinePoint };

/**
 * Return type for the useAdvancedAnalytics hook
 */
export interface UseAdvancedAnalyticsReturn {
  // State
  currentSession: StreamSession | null;
  sessionHistory: StreamSession[];
  isSessionActive: boolean;

  // Session Actions
  startSession: () => void;
  endSession: () => StreamSession | null;

  // Real-time Updates
  updateViewerCount: (count: number) => void;
  recordMessage: (username: string) => void;
  recordEvent: (type: string, data?: { bits?: number }) => void;

  // Calculations
  calculateRetention: (session?: StreamSession) => number;
  calculateEngagementRate: (session?: StreamSession) => number;

  // History
  refreshHistory: () => void;
  getSession: (id: string) => StreamSession | null;
  deleteSession: (id: string) => void;

  // Export
  exportToCSV: (sessionId: string) => string;
  exportAllToCSV: () => string;
  downloadCSV: (sessionId?: string) => void;

  // Service instance
  service: AdvancedAnalyticsService;
}

/**
 * Hook para gestionar estadísticas avanzadas de stream
 * 
 * @example
 * ```tsx
 * const {
 *   currentSession,
 *   sessionHistory,
 *   startSession,
 *   endSession,
 *   updateViewerCount,
 *   recordMessage,
 *   downloadCSV,
 * } = useAdvancedAnalytics();
 * 
 * // Start session when connecting
 * useEffect(() => {
 *   if (connected) {
 *     startSession();
 *   }
 *   return () => endSession();
 * }, [connected]);
 * 
 * // Update viewer count periodically
 * useEffect(() => {
 *   updateViewerCount(viewerCount);
 * }, [viewerCount]);
 * ```
 */
export function useAdvancedAnalytics(): UseAdvancedAnalyticsReturn {
  const serviceRef = useRef<AdvancedAnalyticsService>(getAdvancedAnalyticsService());

  // State
  const [currentSession, setCurrentSession] = useState<StreamSession | null>(() =>
    serviceRef.current.getCurrentSession()
  );
  const [sessionHistory, setSessionHistory] = useState<StreamSession[]>(() =>
    serviceRef.current.getSessionHistory()
  );
  const [isSessionActive, setIsSessionActive] = useState<boolean>(() =>
    serviceRef.current.getCurrentSession() !== null
  );

  // Refresh current session state periodically when active
  useEffect(() => {
    if (!isSessionActive) return;

    const interval = setInterval(() => {
      const session = serviceRef.current.getCurrentSession();
      if (session) {
        setCurrentSession({ ...session });
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isSessionActive]);

  // Start a new session
  const startSession = useCallback(() => {
    const session = serviceRef.current.startSession();
    setCurrentSession(session);
    setIsSessionActive(true);
  }, []);

  // End the current session
  const endSession = useCallback((): StreamSession | null => {
    const session = serviceRef.current.endSession();
    setCurrentSession(null);
    setIsSessionActive(false);
    // Refresh history to include the new session
    setSessionHistory(serviceRef.current.getSessionHistory());
    return session;
  }, []);

  // Update viewer count
  const updateViewerCount = useCallback((count: number) => {
    serviceRef.current.updateViewerCount(count);
    // Update local state
    const session = serviceRef.current.getCurrentSession();
    if (session) {
      setCurrentSession({ ...session });
    }
  }, []);

  // Record a chat message
  const recordMessage = useCallback((username: string) => {
    serviceRef.current.recordMessage(username);
  }, []);

  // Record a stream event
  const recordEvent = useCallback((type: string, data?: { bits?: number }) => {
    serviceRef.current.recordEvent(type, data);
  }, []);

  // Calculate retention
  const calculateRetention = useCallback((session?: StreamSession): number => {
    return serviceRef.current.calculateRetention(session);
  }, []);

  // Calculate engagement rate
  const calculateEngagementRate = useCallback((session?: StreamSession): number => {
    return serviceRef.current.calculateEngagementRate(session);
  }, []);

  // Refresh history
  const refreshHistory = useCallback(() => {
    setSessionHistory(serviceRef.current.getSessionHistory());
  }, []);

  // Get a specific session
  const getSession = useCallback((id: string): StreamSession | null => {
    return serviceRef.current.getSession(id);
  }, []);

  // Delete a session
  const deleteSession = useCallback((id: string) => {
    serviceRef.current.deleteSession(id);
    setSessionHistory(serviceRef.current.getSessionHistory());
  }, []);

  // Export to CSV
  const exportToCSV = useCallback((sessionId: string): string => {
    return serviceRef.current.exportToCSV(sessionId);
  }, []);

  // Export all to CSV
  const exportAllToCSV = useCallback((): string => {
    return serviceRef.current.exportAllToCSV();
  }, []);

  // Download CSV file
  const downloadCSV = useCallback((sessionId?: string) => {
    const csv = sessionId 
      ? serviceRef.current.exportToCSV(sessionId)
      : serviceRef.current.exportAllToCSV();
    
    if (!csv) return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sessionId 
      ? `session_${sessionId}.csv` 
      : `all_sessions_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    // State
    currentSession,
    sessionHistory,
    isSessionActive,

    // Session Actions
    startSession,
    endSession,

    // Real-time Updates
    updateViewerCount,
    recordMessage,
    recordEvent,

    // Calculations
    calculateRetention,
    calculateEngagementRate,

    // History
    refreshHistory,
    getSession,
    deleteSession,

    // Export
    exportToCSV,
    exportAllToCSV,
    downloadCSV,

    // Service instance
    service: serviceRef.current,
  };
}

export default useAdvancedAnalytics;
