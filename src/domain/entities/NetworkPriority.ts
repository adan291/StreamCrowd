/**
 * Network Priority Entities - Domain models for network prioritization
 * 
 * These entities define the structure for network condition detection,
 * update prioritization, and sync queue management in the overlay
 * synchronization system.
 * 
 * Requirements: 7.5 - Critical Update Prioritization
 */

import { OverlayType, OverlayState } from './OverlayState';

/**
 * Network condition levels based on detected performance
 */
export type NetworkCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * Priority levels for overlay updates
 */
export type UpdatePriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Network condition metrics
 */
export interface NetworkMetrics {
  /** Average latency in milliseconds */
  latency: number;
  
  /** Packet loss percentage (0-100) */
  packetLoss: number;
  
  /** Connection stability score (0-100) */
  stability: number;
  
  /** Bandwidth estimate in kbps */
  bandwidth: number;
  
  /** Timestamp when metrics were collected */
  timestamp: number;
  
  /** Number of samples used for calculation */
  sampleCount: number;
}

/**
 * Network condition assessment
 */
export interface NetworkConditionAssessment {
  /** Current network condition level */
  condition: NetworkCondition;
  
  /** Underlying metrics */
  metrics: NetworkMetrics;
  
  /** Confidence level in assessment (0-100) */
  confidence: number;
  
  /** Recommended actions based on condition */
  recommendations: NetworkRecommendation[];
  
  /** Timestamp of assessment */
  assessedAt: number;
}

/**
 * Network-based recommendations
 */
export interface NetworkRecommendation {
  /** Type of recommendation */
  type: 'reduce_frequency' | 'prioritize_critical' | 'enable_compression' | 'fallback_mode';
  
  /** Human-readable description */
  description: string;
  
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
  
  /** Estimated impact if followed */
  impact: string;
}

/**
 * Priority configuration for different overlay types
 */
export interface OverlayPriorityConfig {
  /** Base priority for this overlay type */
  basePriority: UpdatePriority;
  
  /** Conditions that elevate priority to critical */
  criticalConditions: Array<{
    /** Field path to check (e.g., 'data.isSpinning') */
    field: string;
    
    /** Value that triggers critical priority */
    value: unknown;
    
    /** Optional comparison operator */
    operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than';
  }>;
  
  /** Maximum age before update becomes stale (ms) */
  maxAge: number;
  
  /** Whether this type supports batching */
  supportsBatching: boolean;
}

/**
 * Prioritized update item in the sync queue
 */
export interface PrioritizedUpdate<T extends OverlayState = OverlayState> {
  /** Unique identifier for this update */
  id: string;
  
  /** The overlay state to sync */
  state: T;
  
  /** Calculated priority for this update */
  priority: UpdatePriority;
  
  /** Timestamp when update was queued */
  queuedAt: number;
  
  /** Timestamp when update should be processed by */
  deadline: number;
  
  /** Number of retry attempts */
  retryCount: number;
  
  /** Maximum allowed retries */
  maxRetries: number;
  
  /** Reason for the priority assignment */
  priorityReason: string;
  
  /** Whether this update can be batched with others */
  batchable: boolean;
  
  /** Estimated size/cost of this update */
  estimatedCost: number;
}

/**
 * Sync queue statistics
 */
export interface SyncQueueStats {
  /** Total items in queue */
  totalItems: number;
  
  /** Items by priority level */
  byPriority: Record<UpdatePriority, number>;
  
  /** Items by overlay type */
  byType: Record<OverlayType, number>;
  
  /** Average queue time in milliseconds */
  averageQueueTime: number;
  
  /** Oldest item age in milliseconds */
  oldestItemAge: number;
  
  /** Queue processing rate (items/second) */
  processingRate: number;
  
  /** Estimated time to clear queue */
  estimatedClearTime: number;
}

/**
 * Batch update configuration
 */
export interface BatchConfig {
  /** Maximum number of updates per batch */
  maxBatchSize: number;
  
  /** Maximum time to wait for batch to fill (ms) */
  maxWaitTime: number;
  
  /** Maximum total cost for a batch */
  maxBatchCost: number;
  
  /** Whether to batch across different overlay types */
  crossTypeBatching: boolean;
}

/**
 * Network prioritization configuration
 */
export interface NetworkPrioritizationConfig {
  /** Enable network condition monitoring */
  enabled: boolean;
  
  /** Interval for network condition assessment (ms) */
  assessmentInterval: number;
  
  /** Priority configuration per overlay type */
  overlayPriorities: Record<OverlayType, OverlayPriorityConfig>;
  
  /** Default priority configuration */
  defaultPriority: OverlayPriorityConfig;
  
  /** Batch processing configuration */
  batching: BatchConfig;
  
  /** Network condition thresholds */
  thresholds: {
    /** Latency thresholds (ms) */
    latency: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
    
    /** Packet loss thresholds (%) */
    packetLoss: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
    
    /** Stability thresholds (0-100) */
    stability: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
  };
}

/**
 * Default network prioritization configuration
 */
export const DEFAULT_NETWORK_PRIORITIZATION_CONFIG: NetworkPrioritizationConfig = {
  enabled: true,
  assessmentInterval: 5000, // 5 seconds
  overlayPriorities: {
    poll: {
      basePriority: 'normal',
      criticalConditions: [
        { field: 'data.showResults', value: true },
        { field: 'isActive', value: false }
      ],
      maxAge: 30000, // 30 seconds
      supportsBatching: true,
    },
    giveaway: {
      basePriority: 'high',
      criticalConditions: [
        { field: 'data.isSpinning', value: true },
        { field: 'data.winner', value: null, operator: 'not_equals' }
      ],
      maxAge: 10000, // 10 seconds
      supportsBatching: false,
    },
    game: {
      basePriority: 'high',
      criticalConditions: [
        { field: 'data.isActive', value: true },
        { field: 'data.phase', value: 'ending' }
      ],
      maxAge: 5000, // 5 seconds
      supportsBatching: false,
    },
    prediction: {
      basePriority: 'critical',
      criticalConditions: [
        { field: 'data.status', value: 'LOCKED' },
        { field: 'data.status', value: 'RESOLVED' }
      ],
      maxAge: 2000, // 2 seconds
      supportsBatching: false,
    },
  },
  defaultPriority: {
    basePriority: 'normal',
    criticalConditions: [],
    maxAge: 30000,
    supportsBatching: true,
  },
  batching: {
    maxBatchSize: 5,
    maxWaitTime: 1000, // 1 second
    maxBatchCost: 100,
    crossTypeBatching: false,
  },
  thresholds: {
    latency: {
      excellent: 50,   // < 50ms
      good: 100,       // < 100ms
      fair: 200,       // < 200ms
      poor: 500,       // < 500ms
    },
    packetLoss: {
      excellent: 0.1,  // < 0.1%
      good: 0.5,       // < 0.5%
      fair: 2.0,       // < 2%
      poor: 5.0,       // < 5%
    },
    stability: {
      excellent: 95,   // > 95%
      good: 85,        // > 85%
      fair: 70,        // > 70%
      poor: 50,        // > 50%
    },
  },
};

/**
 * Factory function to create a prioritized update
 */
export function createPrioritizedUpdate<T extends OverlayState>(
  state: T,
  priority: UpdatePriority,
  options?: {
    deadline?: number;
    maxRetries?: number;
    priorityReason?: string;
    batchable?: boolean;
    estimatedCost?: number;
  }
): PrioritizedUpdate<T> {
  const now = Date.now();
  const defaultDeadline = now + (priority === 'critical' ? 1000 : priority === 'high' ? 5000 : 30000);
  
  return {
    id: `update_${now}_${Math.random().toString(36).substring(2, 9)}`,
    state,
    priority,
    queuedAt: now,
    deadline: options?.deadline || defaultDeadline,
    retryCount: 0,
    maxRetries: options?.maxRetries || 3,
    priorityReason: options?.priorityReason || `Base priority for ${state.type}`,
    batchable: options?.batchable ?? true,
    estimatedCost: options?.estimatedCost || 1,
  };
}

/**
 * Utility function to assess network condition from metrics
 */
export function assessNetworkCondition(
  metrics: NetworkMetrics,
  thresholds = DEFAULT_NETWORK_PRIORITIZATION_CONFIG.thresholds
): NetworkCondition {
  const { latency, packetLoss, stability } = metrics;
  
  // Calculate scores for each metric (0-4, where 4 is excellent)
  let latencyScore = 0;
  if (latency <= thresholds.latency.excellent) latencyScore = 4;
  else if (latency <= thresholds.latency.good) latencyScore = 3;
  else if (latency <= thresholds.latency.fair) latencyScore = 2;
  else if (latency <= thresholds.latency.poor) latencyScore = 1;
  
  let packetLossScore = 0;
  if (packetLoss <= thresholds.packetLoss.excellent) packetLossScore = 4;
  else if (packetLoss <= thresholds.packetLoss.good) packetLossScore = 3;
  else if (packetLoss <= thresholds.packetLoss.fair) packetLossScore = 2;
  else if (packetLoss <= thresholds.packetLoss.poor) packetLossScore = 1;
  
  let stabilityScore = 0;
  if (stability >= thresholds.stability.excellent) stabilityScore = 4;
  else if (stability >= thresholds.stability.good) stabilityScore = 3;
  else if (stability >= thresholds.stability.fair) stabilityScore = 2;
  else if (stability >= thresholds.stability.poor) stabilityScore = 1;
  
  // Calculate overall score (weighted average)
  const overallScore = (latencyScore * 0.4 + packetLossScore * 0.3 + stabilityScore * 0.3);
  
  // Map score to condition
  if (overallScore >= 3.5) return 'excellent';
  if (overallScore >= 2.5) return 'good';
  if (overallScore >= 1.5) return 'fair';
  if (overallScore >= 0.5) return 'poor';
  return 'critical';
}

/**
 * Utility function to calculate update priority
 */
export function calculateUpdatePriority<T extends OverlayState>(
  state: T,
  config: OverlayPriorityConfig,
  networkCondition: NetworkCondition
): { priority: UpdatePriority; reason: string } {
  let priority = config.basePriority;
  let reason = `Base priority for ${state.type}`;
  
  // Check critical conditions
  for (const condition of config.criticalConditions) {
    if (evaluateCondition(state, condition)) {
      priority = 'critical';
      reason = `Critical condition met: ${condition.field} ${condition.operator || 'equals'} ${condition.value}`;
      break;
    }
  }
  
  // Adjust based on network condition
  if (networkCondition === 'poor' || networkCondition === 'critical') {
    if (priority === 'normal') {
      priority = 'low';
      reason += ` (downgraded due to ${networkCondition} network)`;
    }
  }
  
  // Check age-based priority elevation
  const age = Date.now() - state.updatedAt;
  if (age > config.maxAge && priority !== 'critical') {
    priority = priority === 'low' ? 'normal' : priority === 'normal' ? 'high' : 'critical';
    reason += ` (elevated due to age: ${age}ms)`;
  }
  
  return { priority, reason };
}

/**
 * Utility function to evaluate a condition against state
 */
function evaluateCondition<T extends OverlayState>(
  state: T,
  condition: { field: string; value: unknown; operator?: string }
): boolean {
  const fieldValue = getNestedValue(state, condition.field);
  const operator = condition.operator || 'equals';
  
  switch (operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'not_equals':
      return fieldValue !== condition.value;
    case 'greater_than':
      return typeof fieldValue === 'number' && typeof condition.value === 'number' && 
             fieldValue > condition.value;
    case 'less_than':
      return typeof fieldValue === 'number' && typeof condition.value === 'number' && 
             fieldValue < condition.value;
    default:
      return false;
  }
}

/**
 * Utility function to get nested object value by path
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' && key in current 
      ? (current as Record<string, unknown>)[key] 
      : undefined;
  }, obj);
}