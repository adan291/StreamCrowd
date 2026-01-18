/**
 * Audit Log Entities - Domain models for tracking overlay state changes
 * 
 * These entities define the structure for audit logging of overlay state changes,
 * providing comprehensive tracking of who changed what, when, and why.
 * 
 * Requirements: 5.5 - Maintain audit logs of all overlay state changes with timestamps and user context
 */

import { OverlayType } from './OverlayState';

/**
 * Types of operations that can be audited
 */
export type AuditOperation = 
  | 'create'
  | 'update' 
  | 'delete'
  | 'activate'
  | 'deactivate'
  | 'clear'
  | 'sync'
  | 'migrate';

/**
 * Source of the audit event
 */
export type AuditSource = 
  | 'user'
  | 'system'
  | 'api'
  | 'webhook'
  | 'migration'
  | 'recovery';

/**
 * User context information for audit logs
 */
export interface AuditUserContext {
  /** User ID (if authenticated) */
  userId?: string;
  
  /** Username or display name */
  username?: string;
  
  /** User's role or permission level */
  role?: string;
  
  /** Session ID for tracking user sessions */
  sessionId?: string;
  
  /** IP address of the user */
  ipAddress?: string;
  
  /** User agent string */
  userAgent?: string;
}

/**
 * System context information for audit logs
 */
export interface AuditSystemContext {
  /** Application version */
  appVersion?: string;
  
  /** Environment (development, staging, production) */
  environment?: string;
  
  /** Service or component that initiated the change */
  service?: string;
  
  /** Request ID for tracing */
  requestId?: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Change details for audit logs
 */
export interface AuditChangeDetails {
  /** Previous state (for updates) */
  previousState?: Record<string, unknown>;
  
  /** New state */
  newState?: Record<string, unknown>;
  
  /** Specific fields that changed */
  changedFields?: string[];
  
  /** Reason for the change */
  reason?: string;
  
  /** Additional change metadata */
  changeMetadata?: Record<string, unknown>;
}

/**
 * Main audit log entry entity
 */
export interface AuditLogEntry {
  /** Unique identifier for the audit log entry */
  id: string;
  
  /** Timestamp when the event occurred */
  timestamp: number;
  
  /** Type of operation performed */
  operation: AuditOperation;
  
  /** Source of the operation */
  source: AuditSource;
  
  /** Type of overlay affected */
  overlayType: OverlayType;
  
  /** ID of the overlay state that was changed */
  overlayId: string;
  
  /** Channel ID where the change occurred */
  channelId: string;
  
  /** User context information */
  userContext?: AuditUserContext;
  
  /** System context information */
  systemContext?: AuditSystemContext;
  
  /** Details about what changed */
  changeDetails?: AuditChangeDetails;
  
  /** Success status of the operation */
  success: boolean;
  
  /** Error message if operation failed */
  error?: string;
  
  /** Duration of the operation in milliseconds */
  duration?: number;
}

/**
 * Audit log query filters
 */
export interface AuditLogFilters {
  /** Filter by channel ID */
  channelId?: string;
  
  /** Filter by overlay type */
  overlayType?: OverlayType;
  
  /** Filter by operation type */
  operation?: AuditOperation;
  
  /** Filter by source */
  source?: AuditSource;
  
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by success status */
  success?: boolean;
  
  /** Filter by date range */
  startTime?: number;
  endTime?: number;
  
  /** Limit number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}

/**
 * Audit log statistics
 */
export interface AuditLogStats {
  /** Total number of audit entries */
  totalEntries: number;
  
  /** Entries by operation type */
  byOperation: Record<AuditOperation, number>;
  
  /** Entries by source */
  bySource: Record<AuditSource, number>;
  
  /** Entries by overlay type */
  byOverlayType: Record<OverlayType, number>;
  
  /** Success rate */
  successRate: number;
  
  /** Average operation duration */
  averageDuration: number;
  
  /** Most active users */
  topUsers: Array<{
    userId: string;
    username?: string;
    count: number;
  }>;
  
  /** Most active channels */
  topChannels: Array<{
    channelId: string;
    count: number;
  }>;
}

/**
 * Factory function to create a new audit log entry
 */
export function createAuditLogEntry(
  operation: AuditOperation,
  source: AuditSource,
  overlayType: OverlayType,
  overlayId: string,
  channelId: string,
  options?: {
    userContext?: AuditUserContext;
    systemContext?: AuditSystemContext;
    changeDetails?: AuditChangeDetails;
    success?: boolean;
    error?: string;
    duration?: number;
  }
): AuditLogEntry {
  const now = Date.now();
  const id = `audit_${now}_${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id,
    timestamp: now,
    operation,
    source,
    overlayType,
    overlayId,
    channelId,
    userContext: options?.userContext,
    systemContext: options?.systemContext,
    changeDetails: options?.changeDetails,
    success: options?.success ?? true,
    error: options?.error,
    duration: options?.duration,
  };
}

/**
 * Creates sanitized audit log entry for external logging (removes sensitive data)
 */
export function sanitizeAuditLogEntry(entry: AuditLogEntry): Partial<AuditLogEntry> {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    operation: entry.operation,
    source: entry.source,
    overlayType: entry.overlayType,
    overlayId: entry.overlayId,
    channelId: entry.channelId.substring(0, 8) + '...', // Truncate for privacy
    userContext: entry.userContext ? {
      userId: entry.userContext.userId?.substring(0, 8) + '...',
      username: entry.userContext.username,
      role: entry.userContext.role,
      // Remove IP and user agent for privacy
    } : undefined,
    systemContext: entry.systemContext,
    success: entry.success,
    error: entry.error,
    duration: entry.duration,
  };
}

/**
 * Validates an audit log entry
 */
export function validateAuditLogEntry(entry: AuditLogEntry): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!entry.id || typeof entry.id !== 'string') {
    errors.push('ID must be a non-empty string');
  }
  
  if (!entry.timestamp || typeof entry.timestamp !== 'number' || entry.timestamp <= 0) {
    errors.push('Timestamp must be a positive number');
  }
  
  if (!entry.operation || !['create', 'update', 'delete', 'activate', 'deactivate', 'clear', 'sync', 'migrate'].includes(entry.operation)) {
    errors.push('Operation must be a valid audit operation');
  }
  
  if (!entry.source || !['user', 'system', 'api', 'webhook', 'migration', 'recovery'].includes(entry.source)) {
    errors.push('Source must be a valid audit source');
  }
  
  if (!entry.overlayType || !['poll', 'giveaway', 'game', 'prediction'].includes(entry.overlayType)) {
    errors.push('Overlay type must be valid');
  }
  
  if (!entry.overlayId || typeof entry.overlayId !== 'string') {
    errors.push('Overlay ID must be a non-empty string');
  }
  
  if (!entry.channelId || typeof entry.channelId !== 'string') {
    errors.push('Channel ID must be a non-empty string');
  }
  
  if (typeof entry.success !== 'boolean') {
    errors.push('Success must be a boolean');
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Creates change details for state updates
 */
export function createChangeDetails(
  previousState: Record<string, unknown> | undefined,
  newState: Record<string, unknown>,
  reason?: string
): AuditChangeDetails {
  const changedFields: string[] = [];
  
  if (previousState) {
    // Find changed fields by comparing states
    const findChangedFields = (prev: Record<string, unknown>, curr: Record<string, unknown>, prefix = '') => {
      for (const key in curr) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (!(key in prev)) {
          changedFields.push(fullKey);
        } else if (typeof curr[key] === 'object' && curr[key] !== null && typeof prev[key] === 'object' && prev[key] !== null) {
          findChangedFields(prev[key] as Record<string, unknown>, curr[key] as Record<string, unknown>, fullKey);
        } else if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
          changedFields.push(fullKey);
        }
      }
    };
    
    findChangedFields(previousState, newState);
  }
  
  return {
    previousState,
    newState,
    changedFields: changedFields.length > 0 ? changedFields : undefined,
    reason,
  };
}