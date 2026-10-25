/**
 * ViewerService - Service for aggregating and managing viewer data
 * 
 * This service processes stream events and aggregates data per viewer,
 * providing methods for querying, sorting, and filtering viewer information.
 * 
 * @requirements 3.1 - Aggregate data per user from stream events
 * @requirements 3.2 - Return complete activity history for a viewer
 * @requirements 3.3 - Sort viewers by activity, bits, subs, or sanctions
 * @requirements 3.4 - Filter viewers by username
 * @requirements 3.5 - Update viewer statistics when events are added
 */

// ============================================
// Types - Using local StreamEvent type from StreamActivity
// ============================================

/**
 * Stream event types supported by the viewer service
 */
export type ViewerStreamEventType = 'vote' | 'follow' | 'sub' | 'resub' | 'gift' | 'raid' | 'bits' | 'ban' | 'timeout';

/**
 * Subscription tier types
 */
export type ViewerSubTier = '1000' | '2000' | '3000';

/**
 * Stream event structure for viewer processing
 */
export interface ViewerStreamEvent {
  id: string;
  type: ViewerStreamEventType;
  username: string;
  timestamp: number;
  data?: {
    optionId?: number;
    tier?: ViewerSubTier;
    months?: number;
    message?: string;
    giftCount?: number;
    recipientUsername?: string;
    viewerCount?: number;
    amount?: number;
    duration?: number;
    reason?: string;
    moderator?: string;
  };
}

/**
 * Aggregated viewer data
 * @requirements 3.1, 3.2
 */
export interface ViewerData {
  /** Username (lowercase key) */
  username: string;
  /** Display name (original casing) */
  displayName?: string;
  
  // Activity counts
  /** Total number of events for this viewer */
  totalActivity: number;
  /** Number of follow events */
  follows: number;
  /** Number of vote events */
  votes: number;
  
  // Subscription data
  /** Number of initial subscription events */
  subs: number;
  /** Number of resubscription events */
  resubs: number;
  /** Total cumulative subscription months */
  totalSubMonths: number;
  /** Current subscription tier */
  currentTier?: ViewerSubTier;
  
  // Gifts
  /** Number of gift subs given */
  giftsGiven: number;
  /** Number of gift subs received */
  giftsReceived: number;
  
  // Bits
  /** Total bits cheered */
  totalBits: number;
  
  // Moderation
  /** Number of ban events */
  bans: number;
  /** Number of timeout events */
  timeouts: number;
  /** Total timeout duration in seconds */
  totalTimeoutSeconds: number;
  
  // Timestamps
  /** First event timestamp */
  firstSeen: number;
  /** Last event timestamp */
  lastSeen: number;
  
  // Event history
  /** All events for this viewer */
  events: ViewerStreamEvent[];
}

/**
 * Sort criteria for viewers
 * @requirements 3.3
 */
export type ViewerSortBy = 'activity' | 'bits' | 'subs' | 'bans';

// ============================================
// ViewerService Class
// ============================================

export class ViewerService {
  /** Internal storage of viewer data by lowercase username */
  private viewers: Map<string, ViewerData>;

  constructor() {
    this.viewers = new Map();
  }

  // ============================================
  // Event Processing
  // @requirements 3.1, 3.5
  // ============================================

  /**
   * Create a new empty ViewerData object
   */
  private createEmptyViewerData(username: string, timestamp: number): ViewerData {
    return {
      username,
      displayName: username,
      totalActivity: 0,
      follows: 0,
      votes: 0,
      subs: 0,
      resubs: 0,
      totalSubMonths: 0,
      currentTier: undefined,
      giftsGiven: 0,
      giftsReceived: 0,
      totalBits: 0,
      bans: 0,
      timeouts: 0,
      totalTimeoutSeconds: 0,
      firstSeen: timestamp,
      lastSeen: timestamp,
      events: [],
    };
  }

  /**
   * Process a single stream event and update viewer data
   * @requirements 3.1, 3.5
   */
  processEvent(event: ViewerStreamEvent): void {
    const key = event.username.toLowerCase();
    const existing = this.viewers.get(key) || this.createEmptyViewerData(event.username, event.timestamp);
    // Register before the switch: processGiftRecipient may look up the same
    // user, and a late set() would overwrite the recipient's updates.
    this.viewers.set(key, existing);

    // Update basic counters
    existing.totalActivity++;
    existing.events.push(event);
    
    // Update display name (keep original casing)
    if (!existing.displayName || existing.displayName === existing.username) {
      existing.displayName = event.username;
    }

    // Update timestamps
    if (event.timestamp < existing.firstSeen) {
      existing.firstSeen = event.timestamp;
    }
    if (event.timestamp > existing.lastSeen) {
      existing.lastSeen = event.timestamp;
    }

    // Update type-specific counters
    switch (event.type) {
      case 'follow':
        existing.follows++;
        break;
        
      case 'sub':
        existing.subs++;
        if (event.data?.tier) {
          existing.currentTier = event.data.tier;
        }
        break;
        
      case 'resub':
        existing.resubs++;
        if (event.data?.months) {
          existing.totalSubMonths = Math.max(existing.totalSubMonths, event.data.months);
        }
        if (event.data?.tier) {
          existing.currentTier = event.data.tier;
        }
        break;
        
      case 'gift':
        if (event.data?.recipientUsername) {
          // This is a gift given - update giver
          existing.giftsGiven += 1;
          
          // Also register the recipient
          this.processGiftRecipient(event.data.recipientUsername, event.timestamp);
        } else if (event.data?.giftCount) {
          // Mystery gift - multiple gifts given
          existing.giftsGiven += event.data.giftCount;
        }
        break;
        
      case 'bits':
        existing.totalBits += event.data?.amount || 0;
        break;
        
      case 'ban':
        existing.bans++;
        break;
        
      case 'timeout':
        existing.timeouts++;
        existing.totalTimeoutSeconds += event.data?.duration || 0;
        break;
        
      case 'vote':
        existing.votes++;
        break;
        
      case 'raid':
        // Raids are counted in totalActivity but don't have a specific counter
        break;
    }

    this.viewers.set(key, existing);
  }

  /**
   * Process a gift recipient (creates/updates their viewer data)
   */
  private processGiftRecipient(recipientUsername: string, timestamp: number): void {
    const recipientKey = recipientUsername.toLowerCase();
    const recipient = this.viewers.get(recipientKey) || this.createEmptyViewerData(recipientUsername, timestamp);
    
    recipient.giftsReceived++;
    recipient.totalActivity++;
    
    if (timestamp < recipient.firstSeen) {
      recipient.firstSeen = timestamp;
    }
    if (timestamp > recipient.lastSeen) {
      recipient.lastSeen = timestamp;
    }
    
    this.viewers.set(recipientKey, recipient);
  }

  /**
   * Process multiple stream events
   * @requirements 3.1, 3.5
   */
  processEvents(events: ViewerStreamEvent[]): void {
    for (const event of events) {
      this.processEvent(event);
    }
  }

  // ============================================
  // Viewer Queries
  // @requirements 3.2
  // ============================================

  /**
   * Get data for a specific viewer by username
   * @requirements 3.2
   */
  getViewer(username: string): ViewerData | null {
    return this.viewers.get(username.toLowerCase()) || null;
  }

  /**
   * Get all viewers as an array
   * @requirements 3.2
   */
  getAllViewers(): ViewerData[] {
    return Array.from(this.viewers.values());
  }

  /**
   * Get the total count of unique viewers
   * @requirements 3.2
   */
  getViewerCount(): number {
    return this.viewers.size;
  }

  // ============================================
  // Sorting and Filtering
  // @requirements 3.3, 3.4
  // ============================================

  /**
   * Sort viewers by the specified criteria (descending order)
   * @requirements 3.3
   */
  sortViewers(viewers: ViewerData[], sortBy: ViewerSortBy): ViewerData[] {
    const sorted = [...viewers];
    
    switch (sortBy) {
      case 'bits':
        sorted.sort((a, b) => b.totalBits - a.totalBits);
        break;
        
      case 'subs':
        // Sort by total subscription value: months + subs + resubs
        sorted.sort((a, b) => {
          const aValue = a.totalSubMonths + a.subs + a.resubs;
          const bValue = b.totalSubMonths + b.subs + b.resubs;
          return bValue - aValue;
        });
        break;
        
      case 'bans':
        // Sort by total sanctions: bans + timeouts
        sorted.sort((a, b) => {
          const aValue = a.bans + a.timeouts;
          const bValue = b.bans + b.timeouts;
          return bValue - aValue;
        });
        break;
        
      case 'activity':
      default:
        sorted.sort((a, b) => b.totalActivity - a.totalActivity);
        break;
    }
    
    return sorted;
  }

  /**
   * Search viewers by username (case-insensitive)
   * @requirements 3.4
   */
  searchViewers(query: string): ViewerData[] {
    if (!query || query.trim() === '') {
      return this.getAllViewers();
    }
    
    const searchTerm = query.toLowerCase().trim();
    return this.getAllViewers().filter(viewer => 
      viewer.username.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get top viewers by the specified criteria
   * @requirements 3.3
   */
  getTopViewers(sortBy: ViewerSortBy, limit: number = 10): ViewerData[] {
    const allViewers = this.getAllViewers();
    const sorted = this.sortViewers(allViewers, sortBy);
    return sorted.slice(0, limit);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Clear all viewer data
   */
  clear(): void {
    this.viewers.clear();
  }

  /**
   * Check if a viewer exists
   */
  hasViewer(username: string): boolean {
    return this.viewers.has(username.toLowerCase());
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new ViewerService instance
 */
export function createViewerService(): ViewerService {
  return new ViewerService();
}
