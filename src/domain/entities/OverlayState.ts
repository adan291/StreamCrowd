/**
 * Overlay State Entities - Strongly-typed overlay state models
 * 
 * These entities define the structure for different types of overlay states
 * used in StreamCrowd's real-time synchronization system.
 * 
 * All entities follow hexagonal architecture principles:
 * - Pure domain models with no external dependencies
 * - Immutable data structures
 * - Type-safe interfaces with proper validation
 */

export type OverlayType = 'poll' | 'giveaway' | 'game' | 'prediction';

/**
 * Base interface for all overlay states
 * Provides common properties required for synchronization and versioning
 */
export interface BaseOverlayState {
  /** Unique identifier for the overlay state */
  id: string;
  
  /** Type of overlay (poll, giveaway, game, prediction) */
  type: OverlayType;
  
  /** Whether the overlay is currently active */
  isActive: boolean;
  
  /** Timestamp when the state was last updated */
  updatedAt: number;
  
  /** Schema version for backward compatibility */
  version: number;
  
  /** Channel ID this overlay belongs to */
  channelId: string;
}

/**
 * Poll overlay state entity
 * Represents interactive polls with voting options
 */
export interface PollOverlayState extends BaseOverlayState {
  type: 'poll';
  data: {
    /** The poll question */
    question: string;
    
    /** Available voting options */
    options: Array<{
      id: number;
      label: string;
      votes: number;
      color: string;
      icon?: string;
      image?: string;
      voteKey?: string;
    }>;
    
    /** Total number of votes cast */
    totalVotes: number;
    
    /** Whether to show results to viewers */
    showResults: boolean;
    
    /** Poll start time */
    startTime: number;
    
    /** Poll end time (optional) */
    endTime?: number;
    
    /** Maximum allowed votes (optional) */
    maxVotes?: number;
    
    /** Poll duration in seconds (optional) */
    duration?: number;
  };
}

/**
 * Giveaway overlay state entity
 * Represents giveaway/raffle systems with participant management
 */
export interface GiveawayOverlayState extends BaseOverlayState {
  type: 'giveaway';
  data: {
    /** Current winner (null if no winner selected) */
    winner: string | null;
    
    /** Whether the spinner/selection is currently active */
    isSpinning: boolean;
    
    /** List of participants */
    participants: string[];
    
    /** Giveaway mode */
    mode: 'viewers' | 'keyword' | 'subscribers';
    
    /** Keyword for keyword-based giveaways */
    keyword?: string;
    
    /** Entry requirements */
    requirements?: {
      minFollowTime?: number;
      subscribersOnly?: boolean;
      minAccountAge?: number;
    };
  };
}

/**
 * Game overlay state entity
 * Represents interactive mini-games with dynamic state
 */
export interface GameOverlayState extends BaseOverlayState {
  type: 'game';
  data: {
    /** Type of game being played */
    gameType: string;
    
    /** Game-specific state data */
    state: Record<string, unknown>;
    
    /** List of active players */
    players: string[];
    
    /** Whether the game is currently active */
    isActive: boolean;
    
    /** Game configuration */
    config?: Record<string, unknown>;
    
    /** Current game phase/round */
    phase?: string;
    
    /** Game start time */
    startTime?: number;
    
    /** Game end time */
    endTime?: number;
  };
}

/**
 * Prediction overlay state entity
 * Represents Twitch predictions with outcomes and betting
 */
export interface PredictionOverlayState extends BaseOverlayState {
  type: 'prediction';
  data: {
    /** Prediction title/question */
    title: string;
    
    /** Available prediction outcomes */
    outcomes: Array<{
      id: string;
      title: string;
      color: string;
      users: number;
      channelPoints: number;
    }>;
    
    /** Prediction window duration in seconds */
    predictionWindow: number;
    
    /** Current prediction status */
    status: 'ACTIVE' | 'LOCKED' | 'RESOLVED' | 'CANCELED';
    
    /** Prediction start time */
    startTime: number;
    
    /** Prediction end time */
    endTime?: number;
    
    /** Winning outcome ID (when resolved) */
    winningOutcomeId?: string;
  };
}

/**
 * Union type for all overlay states
 * Enables type-safe handling of different overlay types
 */
export type OverlayState = 
  | PollOverlayState 
  | GiveawayOverlayState 
  | GameOverlayState 
  | PredictionOverlayState;

/**
 * Type guard to check if a state is a poll overlay
 */
export function isPollOverlayState(state: OverlayState): state is PollOverlayState {
  return state.type === 'poll';
}

/**
 * Type guard to check if a state is a giveaway overlay
 */
export function isGiveawayOverlayState(state: OverlayState): state is GiveawayOverlayState {
  return state.type === 'giveaway';
}

/**
 * Type guard to check if a state is a game overlay
 */
export function isGameOverlayState(state: OverlayState): state is GameOverlayState {
  return state.type === 'game';
}

/**
 * Type guard to check if a state is a prediction overlay
 */
export function isPredictionOverlayState(state: OverlayState): state is PredictionOverlayState {
  return state.type === 'prediction';
}

/**
 * Factory function to create a new overlay state with default values
 */
export function createOverlayState<T extends OverlayState>(
  type: T['type'],
  channelId: string,
  data: T['data'],
  options?: {
    id?: string;
    isActive?: boolean;
    version?: number;
  }
): T {
  const now = Date.now();
  const id = options?.id || `${type}_${now}_${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id,
    type,
    isActive: options?.isActive ?? true,
    updatedAt: now,
    version: options?.version ?? 1,
    channelId,
    data,
  } as T;
}

/**
 * Creates a deep copy of an overlay state
 */
export function cloneOverlayState<T extends OverlayState>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Updates an overlay state with new data while preserving metadata
 */
export function updateOverlayState<T extends OverlayState>(
  state: T,
  updates: Partial<T['data']>
): T {
  return {
    ...state,
    data: {
      ...state.data,
      ...updates,
    },
    updatedAt: Date.now(),
  };
}

/**
 * Deactivates an overlay state
 */
export function deactivateOverlayState<T extends OverlayState>(state: T): T {
  return {
    ...state,
    isActive: false,
    updatedAt: Date.now(),
  };
}