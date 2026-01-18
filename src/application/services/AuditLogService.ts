/**
 * Audit Log Service - Application service for tracking overlay state changes
 * 
 * This service provides comprehensive audit logging functionality for overlay state changes,
 * integrating with the existing logging infrastructure while maintaining audit-specific features.
 * 
 * Requirements: 5.5 - Maintain audit logs of all overlay state changes with timestamps and user context
 */

import { 
  AuditLogEntry, 
  AuditOperation, 
  AuditSource, 
  AuditUserContext, 
  AuditSystemContext,
  AuditChangeDetails,
  AuditLogFilters,
  AuditLogStats,
  createAuditLogEntry,
  sanitizeAuditLogEntry,
  validateAuditLogEntry,
  createChangeDetails
} from '../../domain/entities/AuditLog';
import { OverlayState, OverlayType } from '../../domain/entities/OverlayState';
import { logService } from '../../infrastructure/logging/LogService';

/**
 * Configuration for audit logging
 */
export interface AuditLogConfig {
  /** Maximum number of audit entries to keep in memory */
  maxEntries: number;
  
  /** Whether to enable external logging integration */
  enableExternalLogging: boolean;
  
  /** Whether to log sensitive data (should be false in production) */
  logSensitiveData: boolean;
  
  /** Retention period in milliseconds */
  retentionPeriod: number;
  
  /** Whether to enable performance tracking */
  enablePerformanceTracking: boolean;
}

/**
 * Default audit log configuration
 */
const DEFAULT_CONFIG: AuditLogConfig = {
  maxEntries: 10000,
  enableExternalLogging: true,
  logSensitiveData: false,
  retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
  enablePerformanceTracking: true,
};

/**
 * Audit Log Service - Manages audit logging for overlay state changes
 */
export class AuditLogService {
  private auditEntries: AuditLogEntry[] = [];
  private config: AuditLogConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupScheduler();
  }

  /**
   * Logs an overlay state change operation
   */
  async logStateChange(
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
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Create system context
      const systemContext: AuditSystemContext = {
        appVersion: this.getAppVersion(),
        environment: this.getEnvironment(),
        service: 'OverlaySyncService',
        requestId: this.generateRequestId(),
        metadata: {
          timestamp: startTime,
          userAgent: this.getUserAgent(),
        },
      };

      // Create change details
      const changeDetails: AuditChangeDetails | undefined = options?.previousState 
        ? createChangeDetails(
            this.sanitizeStateForAudit(options.previousState),
            this.sanitizeStateForAudit(overlayState),
            options.reason
          )
        : {
            newState: this.sanitizeStateForAudit(overlayState),
            reason: options?.reason,
          };

      // Create audit log entry
      const auditEntry = createAuditLogEntry(
        operation,
        source,
        overlayState.type,
        overlayState.id,
        overlayState.channelId,
        {
          userContext: options?.userContext,
          systemContext,
          changeDetails,
          success: options?.success ?? true,
          error: options?.error,
          duration: options?.duration ?? (Date.now() - startTime),
        }
      );

      // Validate the audit entry
      const validation = validateAuditLogEntry(auditEntry);
      if (!validation.isValid) {
        logService.warn('Invalid audit log entry created', {
          feature: 'audit-logging',
          errors: validation.errors,
          entry: sanitizeAuditLogEntry(auditEntry),
        });
        return;
      }

      // Store the audit entry
      this.storeAuditEntry(auditEntry);

      // Log to external service if enabled
      if (this.config.enableExternalLogging) {
        await this.logToExternalService(auditEntry);
      }

      // Log performance metrics if enabled
      if (this.config.enablePerformanceTracking) {
        this.trackPerformanceMetrics(auditEntry);
      }

    } catch (error) {
      logService.error({
        message: 'Failed to log audit entry',
        feature: 'audit-logging',
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          operation,
          source,
          overlayId: overlayState.id,
          overlayType: overlayState.type,
          channelId: overlayState.channelId,
        },
      });
    }
  }

  /**
   * Logs a bulk operation (multiple state changes)
   */
  async logBulkOperation(
    operation: AuditOperation,
    source: AuditSource,
    overlayStates: OverlayState[],
    options?: {
      userContext?: AuditUserContext;
      reason?: string;
      success?: boolean;
      error?: string;
    }
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Log each state change individually
      const promises = overlayStates.map(state => 
        this.logStateChange(operation, source, state, {
          ...options,
          duration: undefined, // Will be calculated per entry
        })
      );

      await Promise.all(promises);

      // Log the bulk operation summary
      logService.info('Bulk audit operation completed', {
        feature: 'audit-logging',
        operation,
        source,
        count: overlayStates.length,
        duration: Date.now() - startTime,
        success: options?.success ?? true,
      });

    } catch (error) {
      logService.error({
        message: 'Failed to log bulk audit operation',
        feature: 'audit-logging',
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          operation,
          source,
          count: overlayStates.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Retrieves audit log entries based on filters
   */
  getAuditLogs(filters?: AuditLogFilters): AuditLogEntry[] {
    let filteredEntries = [...this.auditEntries];

    if (filters) {
      if (filters.channelId) {
        filteredEntries = filteredEntries.filter(entry => entry.channelId === filters.channelId);
      }
      
      if (filters.overlayType) {
        filteredEntries = filteredEntries.filter(entry => entry.overlayType === filters.overlayType);
      }
      
      if (filters.operation) {
        filteredEntries = filteredEntries.filter(entry => entry.operation === filters.operation);
      }
      
      if (filters.source) {
        filteredEntries = filteredEntries.filter(entry => entry.source === filters.source);
      }
      
      if (filters.userId) {
        filteredEntries = filteredEntries.filter(entry => entry.userContext?.userId === filters.userId);
      }
      
      if (filters.success !== undefined) {
        filteredEntries = filteredEntries.filter(entry => entry.success === filters.success);
      }
      
      if (filters.startTime) {
        filteredEntries = filteredEntries.filter(entry => entry.timestamp >= filters.startTime!);
      }
      
      if (filters.endTime) {
        filteredEntries = filteredEntries.filter(entry => entry.timestamp <= filters.endTime!);
      }
    }

    // Sort by timestamp (newest first)
    filteredEntries.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    if (filters?.offset) {
      filteredEntries = filteredEntries.slice(filters.offset);
    }
    
    if (filters?.limit) {
      filteredEntries = filteredEntries.slice(0, filters.limit);
    }

    return filteredEntries;
  }

  /**
   * Gets audit log statistics
   */
  getAuditStats(filters?: AuditLogFilters): AuditLogStats {
    const entries = this.getAuditLogs(filters);
    
    const byOperation: Record<AuditOperation, number> = {
      create: 0,
      update: 0,
      delete: 0,
      activate: 0,
      deactivate: 0,
      clear: 0,
      sync: 0,
      migrate: 0,
    };
    
    const bySource: Record<AuditSource, number> = {
      user: 0,
      system: 0,
      api: 0,
      webhook: 0,
      migration: 0,
      recovery: 0,
    };
    
    const byOverlayType: Record<OverlayType, number> = {
      poll: 0,
      giveaway: 0,
      game: 0,
      prediction: 0,
    };

    const userCounts: Record<string, { username?: string; count: number }> = {};
    const channelCounts: Record<string, number> = {};
    let successCount = 0;
    let totalDuration = 0;
    let durationCount = 0;

    entries.forEach(entry => {
      byOperation[entry.operation]++;
      bySource[entry.source]++;
      byOverlayType[entry.overlayType]++;
      
      if (entry.success) {
        successCount++;
      }
      
      if (entry.duration) {
        totalDuration += entry.duration;
        durationCount++;
      }
      
      if (entry.userContext?.userId) {
        const userId = entry.userContext.userId;
        if (!userCounts[userId]) {
          userCounts[userId] = { username: entry.userContext.username, count: 0 };
        }
        userCounts[userId].count++;
      }
      
      channelCounts[entry.channelId] = (channelCounts[entry.channelId] || 0) + 1;
    });

    const topUsers = Object.entries(userCounts)
      .map(([userId, data]) => ({ userId, username: data.username, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topChannels = Object.entries(channelCounts)
      .map(([channelId, count]) => ({ channelId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntries: entries.length,
      byOperation,
      bySource,
      byOverlayType,
      successRate: entries.length > 0 ? successCount / entries.length : 0,
      averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      topUsers,
      topChannels,
    };
  }

  /**
   * Exports audit logs as JSON
   */
  exportAuditLogs(filters?: AuditLogFilters): string {
    const entries = this.getAuditLogs(filters);
    const sanitizedEntries = entries.map(entry => sanitizeAuditLogEntry(entry));
    
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
      filters,
      entries: sanitizedEntries,
    }, null, 2);
  }

  /**
   * Clears audit logs based on filters or age
   */
  clearAuditLogs(filters?: AuditLogFilters): number {
    const initialCount = this.auditEntries.length;
    
    if (!filters) {
      // Clear all entries
      this.auditEntries = [];
    } else {
      // Filter out entries that match the criteria
      this.auditEntries = this.auditEntries.filter(entry => {
        if (filters.channelId && entry.channelId === filters.channelId) return false;
        if (filters.overlayType && entry.overlayType === filters.overlayType) return false;
        if (filters.operation && entry.operation === filters.operation) return false;
        if (filters.source && entry.source === filters.source) return false;
        if (filters.userId && entry.userContext?.userId === filters.userId) return false;
        if (filters.success !== undefined && entry.success === filters.success) return false;
        if (filters.startTime && entry.timestamp >= filters.startTime) return false;
        if (filters.endTime && entry.timestamp <= filters.endTime) return false;
        return true;
      });
    }
    
    const clearedCount = initialCount - this.auditEntries.length;
    
    logService.info('Audit logs cleared', {
      feature: 'audit-logging',
      clearedCount,
      remainingCount: this.auditEntries.length,
      filters,
    });
    
    return clearedCount;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): AuditLogConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration
   */
  updateConfig(newConfig: Partial<AuditLogConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logService.info('Audit log configuration updated', {
      feature: 'audit-logging',
      config: this.config,
    });
  }

  /**
   * Disposes of the service and cleans up resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    logService.info('Audit log service disposed', {
      feature: 'audit-logging',
      totalEntries: this.auditEntries.length,
    });
  }

  // Private methods

  private storeAuditEntry(entry: AuditLogEntry): void {
    this.auditEntries.push(entry);
    
    // Enforce max entries limit
    if (this.auditEntries.length > this.config.maxEntries) {
      const removeCount = this.auditEntries.length - this.config.maxEntries;
      this.auditEntries.splice(0, removeCount);
    }
  }

  private async logToExternalService(entry: AuditLogEntry): Promise<void> {
    try {
      // Log to the centralized logging service
      const sanitizedEntry = sanitizeAuditLogEntry(entry);
      
      if (entry.success) {
        logService.info('Overlay state change audited', {
          feature: 'audit-logging',
          audit: sanitizedEntry,
        });
      } else {
        logService.warn('Failed overlay state change audited', {
          feature: 'audit-logging',
          audit: sanitizedEntry,
        });
      }
    } catch (error) {
      logService.error({
        message: 'Failed to log audit entry to external service',
        feature: 'audit-logging',
        stack: error instanceof Error ? error.stack : undefined,
        context: { auditId: entry.id },
      });
    }
  }

  private trackPerformanceMetrics(entry: AuditLogEntry): void {
    if (entry.duration) {
      logService.debug('Audit operation performance', {
        feature: 'audit-logging',
        operation: entry.operation,
        overlayType: entry.overlayType,
        duration: entry.duration,
        success: entry.success,
      });
    }
  }

  private sanitizeStateForAudit(state: OverlayState): Record<string, unknown> {
    if (!this.config.logSensitiveData) {
      // Remove or truncate sensitive data
      return {
        id: state.id,
        type: state.type,
        isActive: state.isActive,
        version: state.version,
        channelId: state.channelId.length > 8 ? state.channelId.substring(0, 8) + '...' : state.channelId,
        updatedAt: state.updatedAt,
        // Include only non-sensitive data fields
        dataKeys: Object.keys(state.data),
      };
    }
    
    return state as Record<string, unknown>;
  }

  private startCleanupScheduler(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60 * 60 * 1000);
  }

  private performCleanup(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    const initialCount = this.auditEntries.length;
    
    this.auditEntries = this.auditEntries.filter(entry => entry.timestamp > cutoffTime);
    
    const cleanedCount = initialCount - this.auditEntries.length;
    
    if (cleanedCount > 0) {
      logService.info('Audit log cleanup completed', {
        feature: 'audit-logging',
        cleanedCount,
        remainingCount: this.auditEntries.length,
        cutoffTime: new Date(cutoffTime).toISOString(),
      });
    }
  }

  private getAppVersion(): string {
    return import.meta.env.VITE_APP_VERSION || '1.0.0';
  }

  private getEnvironment(): string {
    return import.meta.env.PROD ? 'production' : 'development';
  }

  private getUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Singleton instance of AuditLogService
 */
export const auditLogService = new AuditLogService();