/**
 * Event Grouping Utility
 * 
 * Provides functionality to group similar stream events within a time window.
 * Groupable types (follow, vote) are combined when they occur close together,
 * while important individual events (sub, raid, bits) remain separate.
 * 
 * @requirements 5.1 - Group multiple events of the same type in a short period
 */

/**
 * Extended stream event types used in the activity feed
 * Includes both domain types and UI-specific types (vote, follow, gift, bits)
 */
export type ActivityEventType = 
  | 'vote' 
  | 'follow' 
  | 'sub' 
  | 'resub' 
  | 'gift' 
  | 'raid' 
  | 'bits' 
  | 'ban' 
  | 'timeout';

/**
 * Stream event interface for activity feed
 * Compatible with both domain StreamEvent and UI StreamEvent types
 */
export interface ActivityStreamEvent {
  id: string;
  type: ActivityEventType;
  username: string;
  timestamp: number;
  displayName?: string;
  data?: {
    optionId?: number;
    tier?: string;
    months?: number;
    message?: string;
    giftCount?: number;
    recipientUsername?: string;
    viewerCount?: number;
    amount?: number;
    duration?: number;
    reason?: string;
    bits?: number;
  };
}

/**
 * Configuration for event grouping behavior
 */
export interface EventGroupingConfig {
  /** Time window in milliseconds for grouping events (default: 120000 = 2 min) */
  windowMs: number;
  /** Minimum number of events to form a group (default: 2) */
  minGroupSize: number;
  /** Event types that can be grouped together */
  groupableTypes: Set<ActivityEventType>;
}

/**
 * Represents a group of similar events
 */
export interface EventGroup {
  /** Unique identifier for the group */
  id: string;
  /** Type of events in this group */
  type: ActivityEventType;
  /** Individual events in this group */
  events: ActivityStreamEvent[];
  /** Number of events in the group */
  count: number;
  /** Timestamp of the first event in the group */
  startTime: number;
  /** Timestamp of the last event in the group */
  endTime: number;
  /** Whether this is a grouped item (true) or single event (false) */
  isGrouped: boolean;
}

/**
 * Default groupable event types
 * - follow and vote can be grouped (high volume, less individual importance)
 * - sub, resub, gift, raid, bits, ban, timeout remain individual (important events)
 */
export const DEFAULT_GROUPABLE_TYPES: Set<ActivityEventType> = new Set([
  'follow',
  'vote',
]);

/**
 * Default configuration for event grouping
 */
export const DEFAULT_GROUPING_CONFIG: EventGroupingConfig = {
  windowMs: 120000, // 2 minutes
  minGroupSize: 2,
  groupableTypes: DEFAULT_GROUPABLE_TYPES,
};

/**
 * Creates a unique group ID based on type and time range
 */
const createGroupId = (type: ActivityEventType, startTime: number, endTime: number): string => {
  return `group_${type}_${startTime}_${endTime}`;
};

/**
 * Creates an EventGroup from a single event (ungrouped)
 */
const createSingleEventGroup = (event: ActivityStreamEvent): EventGroup => ({
  id: event.id,
  type: event.type,
  events: [event],
  count: 1,
  startTime: event.timestamp,
  endTime: event.timestamp,
  isGrouped: false,
});

/**
 * Creates an EventGroup from multiple events
 */
const createMultiEventGroup = (events: ActivityStreamEvent[]): EventGroup => {
  if (events.length === 0) {
    throw new Error('Cannot create group from empty events array');
  }
  
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sortedEvents[0].timestamp;
  const endTime = sortedEvents[sortedEvents.length - 1].timestamp;
  
  return {
    id: createGroupId(sortedEvents[0].type, startTime, endTime),
    type: sortedEvents[0].type,
    events: sortedEvents,
    count: sortedEvents.length,
    startTime,
    endTime,
    isGrouped: true,
  };
};

/**
 * Groups events of the same type that occur within the time window
 * 
 * @param events - Array of stream events to group
 * @param config - Grouping configuration (optional, uses defaults)
 * @returns Array of EventGroups, maintaining chronological order
 * 
 * @example
 * ```typescript
 * const events = [...]; // Array of ActivityStreamEvent
 * const groups = groupEvents(events);
 * // Returns EventGroup[] where similar events are combined
 * ```
 */
export function groupEvents(
  events: ActivityStreamEvent[],
  config: Partial<EventGroupingConfig> = {}
): EventGroup[] {
  const fullConfig: EventGroupingConfig = {
    ...DEFAULT_GROUPING_CONFIG,
    ...config,
    groupableTypes: config.groupableTypes ?? DEFAULT_GROUPING_CONFIG.groupableTypes,
  };

  if (events.length === 0) {
    return [];
  }

  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  
  const result: EventGroup[] = [];
  let currentGroupEvents: ActivityStreamEvent[] = [];
  let currentGroupType: ActivityEventType | null = null;
  let currentGroupStartTime: number | null = null;

  const flushCurrentGroup = () => {
    if (currentGroupEvents.length === 0) return;

    if (currentGroupEvents.length >= fullConfig.minGroupSize) {
      // Create a grouped item
      result.push(createMultiEventGroup(currentGroupEvents));
    } else {
      // Not enough events to group, add as individual items
      for (const event of currentGroupEvents) {
        result.push(createSingleEventGroup(event));
      }
    }
    
    currentGroupEvents = [];
    currentGroupType = null;
    currentGroupStartTime = null;
  };

  for (const event of sortedEvents) {
    const isGroupable = fullConfig.groupableTypes.has(event.type);

    if (!isGroupable) {
      // Non-groupable event: flush current group and add as single
      flushCurrentGroup();
      result.push(createSingleEventGroup(event));
      continue;
    }

    // Groupable event
    if (currentGroupType === null) {
      // Start a new potential group
      currentGroupType = event.type;
      currentGroupStartTime = event.timestamp;
      currentGroupEvents = [event];
    } else if (
      currentGroupType === event.type &&
      currentGroupStartTime !== null &&
      event.timestamp - currentGroupStartTime <= fullConfig.windowMs
    ) {
      // Same type and within time window: add to current group
      currentGroupEvents.push(event);
    } else {
      // Different type or outside time window: flush and start new
      flushCurrentGroup();
      currentGroupType = event.type;
      currentGroupStartTime = event.timestamp;
      currentGroupEvents = [event];
    }
  }

  // Flush any remaining events
  flushCurrentGroup();

  // Sort result by the start time of each group
  result.sort((a, b) => a.startTime - b.startTime);

  return result;
}

/**
 * Checks if an event type is groupable with the given configuration
 */
export function isGroupableType(
  type: ActivityEventType,
  config: Partial<EventGroupingConfig> = {}
): boolean {
  const groupableTypes = config.groupableTypes ?? DEFAULT_GROUPING_CONFIG.groupableTypes;
  return groupableTypes.has(type);
}

/**
 * Gets the display text for a grouped event
 * 
 * @param group - The event group
 * @returns Human-readable description of the group
 */
export function getGroupDisplayText(group: EventGroup): string {
  if (!group.isGrouped || group.count === 1) {
    return '';
  }

  const durationMs = group.endTime - group.startTime;
  const durationMinutes = Math.ceil(durationMs / 60000);
  
  const typeLabels: Record<ActivityEventType, string> = {
    follow: 'follows',
    vote: 'votos',
    sub: 'subs',
    resub: 'resubs',
    gift: 'gifts',
    raid: 'raids',
    bits: 'bits',
    ban: 'bans',
    timeout: 'timeouts',
  };

  const typeLabel = typeLabels[group.type] || group.type;
  
  if (durationMinutes <= 1) {
    return `${group.count} ${typeLabel} en el último minuto`;
  }
  
  return `${group.count} ${typeLabel} en los últimos ${durationMinutes} min`;
}

/**
 * Merges adjacent groups of the same type if they're within the time window
 * Useful for re-grouping after filtering
 */
export function mergeAdjacentGroups(
  groups: EventGroup[],
  config: Partial<EventGroupingConfig> = {}
): EventGroup[] {
  const fullConfig: EventGroupingConfig = {
    ...DEFAULT_GROUPING_CONFIG,
    ...config,
    groupableTypes: config.groupableTypes ?? DEFAULT_GROUPING_CONFIG.groupableTypes,
  };

  if (groups.length <= 1) {
    return groups;
  }

  // Flatten all events and re-group
  const allEvents: ActivityStreamEvent[] = groups.flatMap(g => g.events);
  return groupEvents(allEvents, fullConfig);
}
