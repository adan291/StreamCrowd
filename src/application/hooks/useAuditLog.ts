/**
 * useAuditLog Hook - React hook for audit logging functionality
 * 
 * Provides a convenient interface for components to interact with the audit logging system,
 * including logging state changes, retrieving audit logs, and managing audit configuration.
 * 
 * Requirements: 5.5 - Maintain audit logs of all overlay state changes with timestamps and user context
 */

import { useCallback, useEffect, useState } from 'react';
import { 
  auditLogService, 
  AuditLogConfig 
} from '../services/AuditLogService';
import { 
  AuditLogEntry, 
  AuditOperation, 
  AuditSource, 
  AuditUserContext,
  AuditLogFilters,
  AuditLogStats
} from '../../domain/entities/AuditLog';
import { OverlayState } from '../../domain/entities/OverlayState';

/**
 * Hook return type
 */
export interface UseAuditLogReturn {
  /** Log an overlay state change */
  logStateChange: (
    operation: AuditOperation,
    source: AuditSource,
    overlayState: OverlayState,
    options?: {
      previousState?: OverlayState;
      userContext?: AuditUserContext;
      reason?: string;
      duration?: number;
      success?: boolean;
      error?: string;
    }
  ) => Promise<void>;
  
  /** Log a bulk operation */
  logBulkOperation: (
    operation: AuditOperation,
    source: AuditSource,
    overlayStates: OverlayState[],
    options?: {
      userContext?: AuditUserContext;
      reason?: string;
      success?: boolean;
      error?: string;
    }
  ) => Promise<void>;
  
  /** Get audit log entries */
  getAuditLogs: (filters?: AuditLogFilters) => AuditLogEntry[];
  
  /** Get audit statistics */
  getAuditStats: (filters?: AuditLogFilters) => AuditLogStats;
  
  /** Export audit logs as JSON */
  exportAuditLogs: (filters?: AuditLogFilters) => string;
  
  /** Clear audit logs */
  clearAuditLogs: (filters?: AuditLogFilters) => number;
  
  /** Get current configuration */
  getConfig: () => AuditLogConfig;
  
  /** Update configuration */
  updateConfig: (config: Partial<AuditLogConfig>) => void;
  
  /** Current audit log count */
  auditLogCount: number;
  
  /** Whether audit logging is enabled */
  isEnabled: boolean;
}

/**
 * Hook options
 */
export interface UseAuditLogOptions {
  /** Whether to enable real-time updates of audit log count */
  enableRealTimeUpdates?: boolean;
  
  /** Update interval for real-time updates (in milliseconds) */
  updateInterval?: number;
  
  /** Default user context to use for all operations */
  defaultUserContext?: AuditUserContext;
}

/**
 * React hook for audit logging functionality
 * 
 * @param options - Hook configuration options
 * @returns Audit logging interface
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { logStateChange, getAuditLogs, auditLogCount } = useAuditLog({
 *     defaultUserContext: { userId: 'user123', username: 'streamer' }
 *   });
 *   
 *   const handlePollUpdate = async (newPollState: PollOverlayState) => {
 *     await logStateChange('update', 'user', newPollState, {
 *       reason: 'Poll option updated by user'
 *     });
 *   };
 *   
 *   const auditLogs = getAuditLogs({ overlayType: 'poll', limit: 10 });
 *   
 *   return (
 *     <div>
 *       <p>Total audit logs: {auditLogCount}</p>
 *       <button onClick={handlePollUpdate}>Update Poll</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuditLog(options: UseAuditLogOptions = {}): UseAuditLogReturn {
  const {
    enableRealTimeUpdates = false,
    updateInterval = 5000,
    defaultUserContext,
  } = options;

  const [auditLogCount, setAuditLogCount] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);

  // Update audit log count
  const updateAuditLogCount = useCallback(() => {
    try {
      const logs = auditLogService.getAuditLogs();
      setAuditLogCount(logs.length);
    } catch (error) {
      console.warn('Failed to update audit log count:', error);
    }
  }, []);

  // Set up real-time updates if enabled
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    updateAuditLogCount();
    const interval = setInterval(updateAuditLogCount, updateInterval);

    return () => clearInterval(interval);
  }, [enableRealTimeUpdates, updateInterval, updateAuditLogCount]);

  // Initialize audit log count
  useEffect(() => {
    updateAuditLogCount();
  }, [updateAuditLogCount]);

  // Log state change with default user context
  const logStateChange = useCallback(async (
    operation: AuditOperation,
    source: AuditSource,
    overlayState: OverlayState,
    options?: {
      previousState?: OverlayState;
      userContext?: AuditUserContext;
      reason?: string;
      duration?: number;
      success?: boolean;
      error?: string;
    }
  ) => {
    try {
      await auditLogService.logStateChange(operation, source, overlayState, {
        ...options,
        userContext: options?.userContext || defaultUserContext,
      });
      
      // Update count if real-time updates are disabled
      if (!enableRealTimeUpdates) {
        updateAuditLogCount();
      }
    } catch (error) {
      console.error('Failed to log state change:', error);
      throw error;
    }
  }, [defaultUserContext, enableRealTimeUpdates, updateAuditLogCount]);

  // Log bulk operation with default user context
  const logBulkOperation = useCallback(async (
    operation: AuditOperation,
    source: AuditSource,
    overlayStates: OverlayState[],
    options?: {
      userContext?: AuditUserContext;
      reason?: string;
      success?: boolean;
      error?: string;
    }
  ) => {
    try {
      await auditLogService.logBulkOperation(operation, source, overlayStates, {
        ...options,
        userContext: options?.userContext || defaultUserContext,
      });
      
      // Update count if real-time updates are disabled
      if (!enableRealTimeUpdates) {
        updateAuditLogCount();
      }
    } catch (error) {
      console.error('Failed to log bulk operation:', error);
      throw error;
    }
  }, [defaultUserContext, enableRealTimeUpdates, updateAuditLogCount]);

  // Get audit logs
  const getAuditLogs = useCallback((filters?: AuditLogFilters) => {
    try {
      return auditLogService.getAuditLogs(filters);
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return [];
    }
  }, []);

  // Get audit statistics
  const getAuditStats = useCallback((filters?: AuditLogFilters) => {
    try {
      return auditLogService.getAuditStats(filters);
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      return {
        totalEntries: 0,
        byOperation: {
          create: 0,
          update: 0,
          delete: 0,
          activate: 0,
          deactivate: 0,
          clear: 0,
          sync: 0,
          migrate: 0,
        },
        bySource: {
          user: 0,
          system: 0,
          api: 0,
          webhook: 0,
          migration: 0,
          recovery: 0,
        },
        byOverlayType: {
          poll: 0,
          giveaway: 0,
          game: 0,
          prediction: 0,
        },
        successRate: 0,
        averageDuration: 0,
        topUsers: [],
        topChannels: [],
      };
    }
  }, []);

  // Export audit logs
  const exportAuditLogs = useCallback((filters?: AuditLogFilters) => {
    try {
      return auditLogService.exportAuditLogs(filters);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      return JSON.stringify({ error: 'Failed to export audit logs' });
    }
  }, []);

  // Clear audit logs
  const clearAuditLogs = useCallback((filters?: AuditLogFilters) => {
    try {
      const clearedCount = auditLogService.clearAuditLogs(filters);
      
      // Update count if real-time updates are disabled
      if (!enableRealTimeUpdates) {
        updateAuditLogCount();
      }
      
      return clearedCount;
    } catch (error) {
      console.error('Failed to clear audit logs:', error);
      return 0;
    }
  }, [enableRealTimeUpdates, updateAuditLogCount]);

  // Get configuration
  const getConfig = useCallback(() => {
    try {
      return auditLogService.getConfig();
    } catch (error) {
      console.error('Failed to get audit config:', error);
      return {
        maxEntries: 10000,
        enableExternalLogging: true,
        logSensitiveData: false,
        retentionPeriod: 30 * 24 * 60 * 60 * 1000,
        enablePerformanceTracking: true,
      };
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback((config: Partial<AuditLogConfig>) => {
    try {
      auditLogService.updateConfig(config);
      
      // Update enabled state based on config
      if ('enableExternalLogging' in config) {
        setIsEnabled(config.enableExternalLogging ?? true);
      }
    } catch (error) {
      console.error('Failed to update audit config:', error);
    }
  }, []);

  return {
    logStateChange,
    logBulkOperation,
    getAuditLogs,
    getAuditStats,
    exportAuditLogs,
    clearAuditLogs,
    getConfig,
    updateConfig,
    auditLogCount,
    isEnabled,
  };
}

/**
 * Hook for simplified audit logging with automatic user context detection
 * 
 * @param overlayType - The type of overlay being audited
 * @param channelId - The channel ID for the overlay
 * @returns Simplified audit logging interface
 * 
 * @example
 * ```tsx
 * function PollComponent({ pollState }: { pollState: PollOverlayState }) {
 *   const { logUpdate, logCreate, logDelete } = useSimpleAuditLog('poll', pollState.channelId);
 *   
 *   const handleUpdate = async (newState: PollOverlayState) => {
 *     await logUpdate(newState, pollState, 'User updated poll options');
 *   };
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useSimpleAuditLog(overlayType: string, channelId: string) {
  const { logStateChange } = useAuditLog();

  const logCreate = useCallback(async (
    state: OverlayState,
    reason?: string
  ) => {
    await logStateChange('create', 'user', state, { reason });
  }, [logStateChange]);

  const logUpdate = useCallback(async (
    newState: OverlayState,
    previousState: OverlayState,
    reason?: string
  ) => {
    await logStateChange('update', 'user', newState, { previousState, reason });
  }, [logStateChange]);

  const logDelete = useCallback(async (
    state: OverlayState,
    reason?: string
  ) => {
    await logStateChange('delete', 'user', state, { reason });
  }, [logStateChange]);

  const logActivate = useCallback(async (
    state: OverlayState,
    reason?: string
  ) => {
    await logStateChange('activate', 'user', state, { reason });
  }, [logStateChange]);

  const logDeactivate = useCallback(async (
    state: OverlayState,
    reason?: string
  ) => {
    await logStateChange('deactivate', 'user', state, { reason });
  }, [logStateChange]);

  return {
    logCreate,
    logUpdate,
    logDelete,
    logActivate,
    logDeactivate,
  };
}