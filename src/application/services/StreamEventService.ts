/**
 * StreamEventService - Servicio de aplicación para eventos de stream
 * 
 * Este servicio gestiona eventos de stream como suscripciones, raids, cheers, bans, etc.
 * Proporciona funcionalidad para agregar, consultar y persistir eventos por sesión.
 * 
 * @requirements 2.4, 2.5, 2.7 - Aggregate and store stream events, notify listeners, query by type/time
 */

import type { StreamEvent, StreamEventType, SubTier } from '../../domain/entities/StreamEvent';

// Storage keys
const SESSIONS_KEY = 'stream_event_sessions';
const MAX_EVENTS_PER_SESSION = 2000;
const MAX_SESSIONS_STORED = 30;

/**
 * Listener callback type for stream events
 */
export type StreamEventListener = (event: StreamEvent) => void;

/**
 * Session data structure for persistence
 */
export interface StreamSession {
  id: string;
  channelName: string;
  startTime: number;
  endTime?: number;
  events: StreamEvent[];
}

/**
 * Event summary by type
 */
export type EventSummary = Record<StreamEventType, number>;

/**
 * Generate a unique ID for events
 */
const generateEventId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

/**
 * Generate a unique session ID
 */
const generateSessionId = (channelName: string): string => {
  return `${channelName.toLowerCase()}_${Date.now()}`;
};


/**
 * StreamEventService class
 * 
 * Manages stream events with session-based storage and listener notifications.
 */
export class StreamEventService {
  private events: StreamEvent[] = [];
  private listeners: Map<StreamEventType | 'all', Set<StreamEventListener>> = new Map();
  private sessionId: string | null = null;
  private channelName: string | null = null;
  private sessionStartTime: number | null = null;

  constructor() {
    // Initialize listener sets for all event types
    this.initializeListeners();
  }

  /**
   * Initialize listener sets for all event types
   */
  private initializeListeners(): void {
    const eventTypes: (StreamEventType | 'all')[] = [
      'all', 'sub', 'resub', 'subgift', 'submysterygift',
      'primepaidupgrade', 'giftpaidupgrade', 'raid', 'cheer',
      'hosted', 'ban', 'timeout'
    ];
    
    for (const type of eventTypes) {
      this.listeners.set(type, new Set());
    }
  }

  // ==================== Session Management ====================

  /**
   * Start a new session for a channel
   * @param channelName - Name of the channel
   */
  startSession(channelName: string): void {
    // End any existing session first
    if (this.sessionId) {
      this.endSession();
    }

    this.channelName = channelName;
    this.sessionId = generateSessionId(channelName);
    this.sessionStartTime = Date.now();
    this.events = [];
  }

  /**
   * End the current session
   */
  endSession(): void {
    if (this.sessionId) {
      // Save session before ending
      this.saveSession();
    }
    
    this.sessionId = null;
    this.channelName = null;
    this.sessionStartTime = null;
    this.events = [];
  }

  /**
   * Get the current session ID
   * @returns Current session ID or null if no session is active
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get the current channel name
   * @returns Current channel name or null if no session is active
   */
  getChannelName(): string | null {
    return this.channelName;
  }

  // ==================== Event Handling ====================

  /**
   * Add a new event to the current session
   * @param eventData - Event data without ID (ID will be generated)
   * @returns The created event with generated ID
   */
  addEvent(eventData: Omit<StreamEvent, 'id'>): StreamEvent {
    const event: StreamEvent = {
      ...eventData,
      id: generateEventId(),
    };

    // Add to events array
    this.events.push(event);

    // Trim to max size
    if (this.events.length > MAX_EVENTS_PER_SESSION) {
      this.events = this.events.slice(-MAX_EVENTS_PER_SESSION);
    }

    // Notify listeners
    this.notifyListeners(event);

    return event;
  }

  /**
   * Get all events or filter by type
   * @param type - Optional event type to filter by
   * @returns Array of events
   */
  getEvents(type?: StreamEventType): StreamEvent[] {
    if (type) {
      return this.events.filter(e => e.type === type);
    }
    return [...this.events];
  }

  /**
   * Get events within a time range
   * @param start - Start timestamp (inclusive)
   * @param end - End timestamp (inclusive)
   * @returns Array of events within the time range
   */
  getEventsByTimeRange(start: number, end: number): StreamEvent[] {
    return this.events.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  /**
   * Clear all events from the current session
   */
  clearEvents(): void {
    this.events = [];
  }

  // ==================== Listener Management ====================

  /**
   * Register a listener for a specific event type or all events
   * @param type - Event type to listen for, or 'all' for all events
   * @param listener - Callback function to invoke when event occurs
   * @returns Unsubscribe function
   */
  on(type: StreamEventType | 'all', listener: StreamEventListener): () => void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.add(listener);
    }

    // Return unsubscribe function
    return () => this.off(type, listener);
  }

  /**
   * Remove a listener
   * @param type - Event type the listener was registered for
   * @param listener - Callback function to remove
   */
  off(type: StreamEventType | 'all', listener: StreamEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Notify all relevant listeners about an event
   * @param event - The event to notify about
   */
  private notifyListeners(event: StreamEvent): void {
    // Notify type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in stream event listener for type ${event.type}:`, error);
        }
      }
    }

    // Notify 'all' listeners
    const allListeners = this.listeners.get('all');
    if (allListeners) {
      for (const listener of allListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in stream event listener for all events:', error);
        }
      }
    }
  }


  // ==================== Aggregations ====================

  /**
   * Get total subscription count (subs + resubs + gift subs)
   * @returns Total number of subscription events
   */
  getSubCount(): number {
    return this.events.filter(e => 
      e.type === 'sub' || 
      e.type === 'resub' || 
      e.type === 'subgift' ||
      e.type === 'submysterygift' ||
      e.type === 'primepaidupgrade' ||
      e.type === 'giftpaidupgrade'
    ).length;
  }

  /**
   * Get total raid count
   * @returns Number of raid events
   */
  getRaidCount(): number {
    return this.events.filter(e => e.type === 'raid').length;
  }

  /**
   * Get total bits cheered
   * @returns Total bits from all cheer events
   */
  getTotalBits(): number {
    return this.events
      .filter(e => e.type === 'cheer')
      .reduce((total, e) => total + (e.bits || 0), 0);
  }

  /**
   * Get event summary by type
   * @returns Object with count for each event type
   */
  getEventSummary(): EventSummary {
    const summary: EventSummary = {
      sub: 0,
      resub: 0,
      subgift: 0,
      submysterygift: 0,
      primepaidupgrade: 0,
      giftpaidupgrade: 0,
      raid: 0,
      cheer: 0,
      hosted: 0,
      ban: 0,
      timeout: 0,
    };

    for (const event of this.events) {
      if (event.type in summary) {
        summary[event.type]++;
      }
    }

    return summary;
  }

  /**
   * Get subscription events by tier
   * @param tier - Subscription tier to filter by
   * @returns Array of subscription events for the specified tier
   */
  getSubsByTier(tier: SubTier): StreamEvent[] {
    return this.events.filter(e => 
      (e.type === 'sub' || e.type === 'resub' || e.type === 'subgift') && 
      e.tier === tier
    );
  }

  /**
   * Categorize a plan value to SubTier
   * @param plan - Plan value from Twitch (e.g., 'Prime', '1000', '2000', '3000')
   * @returns Categorized SubTier
   */
  static categorizeTier(plan?: string): SubTier {
    switch (plan) {
      case 'Prime':
        return 'Prime';
      case '2000':
        return '2000';
      case '3000':
        return '3000';
      case '1000':
      default:
        return '1000';
    }
  }

  /**
   * Get gift count (total gifts given)
   * @returns Total number of gifted subscriptions
   */
  getGiftCount(): number {
    let total = 0;
    
    for (const event of this.events) {
      if (event.type === 'subgift') {
        total += 1;
      } else if (event.type === 'submysterygift') {
        total += event.giftCount || 1;
      }
    }
    
    return total;
  }

  // ==================== Persistence ====================

  /**
   * Save the current session to localStorage
   */
  saveSession(): void {
    if (!this.sessionId || !this.channelName) {
      return;
    }

    const session: StreamSession = {
      id: this.sessionId,
      channelName: this.channelName,
      startTime: this.sessionStartTime || Date.now(),
      endTime: Date.now(),
      events: this.events,
    };

    try {
      // Load existing sessions
      const sessions = this.loadAllSessions();
      
      // Find and update existing session or add new one
      const existingIndex = sessions.findIndex(s => s.id === this.sessionId);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      // Trim to max sessions
      const trimmedSessions = sessions.slice(-MAX_SESSIONS_STORED);
      
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmedSessions));
    } catch (error) {
      console.error('Failed to save stream event session:', error);
    }
  }

  /**
   * Load a session by ID
   * @param sessionId - Session ID to load
   * @returns True if session was loaded successfully
   */
  loadSession(sessionId: string): boolean {
    try {
      const sessions = this.loadAllSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (session) {
        this.sessionId = session.id;
        this.channelName = session.channelName;
        this.sessionStartTime = session.startTime;
        this.events = session.events;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to load stream event session:', error);
      return false;
    }
  }

  /**
   * Load all stored sessions
   * @returns Array of stored sessions
   */
  private loadAllSessions(): StreamSession[] {
    try {
      const stored = localStorage.getItem(SESSIONS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load stream event sessions:', error);
    }
    return [];
  }

  /**
   * Get all stored sessions (for history viewing)
   * @returns Array of stored sessions
   */
  getAllSessions(): StreamSession[] {
    return this.loadAllSessions();
  }

  /**
   * Delete a stored session
   * @param sessionId - Session ID to delete
   * @returns True if session was deleted
   */
  deleteSession(sessionId: string): boolean {
    try {
      const sessions = this.loadAllSessions();
      const filtered = sessions.filter(s => s.id !== sessionId);
      
      if (filtered.length < sessions.length) {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete stream event session:', error);
      return false;
    }
  }

  /**
   * Clear old sessions beyond the retention limit
   * @param keepCount - Number of recent sessions to keep (default: MAX_SESSIONS_STORED)
   */
  clearOldSessions(keepCount: number = MAX_SESSIONS_STORED): void {
    try {
      const sessions = this.loadAllSessions();
      const trimmed = sessions.slice(-keepCount);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to clear old stream event sessions:', error);
    }
  }
}
