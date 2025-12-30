/**
 * Twitch API Types for Predictions and Channel Points
 * 
 * These types match the Twitch Helix API response structures.
 * @see https://dev.twitch.tv/docs/api/reference
 * 
 * @requirements 1.1, 4.1 - Data models for predictions and rewards
 */

// ============================================
// PREDICTION TYPES
// ============================================

/**
 * Status of a Twitch prediction
 * - ACTIVE: Prediction is open for voting
 * - LOCKED: Prediction is locked, no more votes allowed
 * - RESOLVED: Prediction has been resolved with a winning outcome
 * - CANCELED: Prediction was canceled and points refunded
 */
export type PredictionStatus = 'ACTIVE' | 'LOCKED' | 'RESOLVED' | 'CANCELED';

/**
 * Color options for prediction outcomes
 */
export type OutcomeColor = 'BLUE' | 'PINK';

/**
 * A user who predicted on an outcome
 */
export interface TwitchPredictor {
  user_id: string;
  user_name: string;
  user_login: string;
  channel_points_used: number;
  channel_points_won: number;
}

/**
 * An outcome option in a prediction
 */
export interface TwitchOutcome {
  id: string;
  title: string;
  users: number;
  channel_points: number;
  top_predictors: TwitchPredictor[] | null;
  color: OutcomeColor;
}

/**
 * A Twitch prediction
 */
export interface TwitchPrediction {
  id: string;
  broadcaster_id: string;
  broadcaster_name: string;
  broadcaster_login: string;
  title: string;
  winning_outcome_id: string | null;
  outcomes: TwitchOutcome[];
  prediction_window: number;
  status: PredictionStatus;
  created_at: string;
  ended_at: string | null;
  locked_at: string | null;
}

/**
 * Data required to create a new prediction
 */
export interface CreatePredictionData {
  broadcaster_id: string;
  title: string;
  outcomes: { title: string }[];
  prediction_window: number; // 30-1800 seconds
}

/**
 * Data required to end a prediction
 */
export interface EndPredictionData {
  broadcaster_id: string;
  id: string;
  status: 'RESOLVED' | 'CANCELED' | 'LOCKED';
  winning_outcome_id?: string; // Required when status is RESOLVED
}

// ============================================
// CHANNEL POINTS / REWARDS TYPES
// ============================================

/**
 * Image URLs for a reward
 */
export interface RewardImage {
  url_1x: string;
  url_2x: string;
  url_4x: string;
}

/**
 * Max per stream configuration
 */
export interface MaxPerStreamSetting {
  is_enabled: boolean;
  max_per_stream: number;
}

/**
 * Max per user per stream configuration
 */
export interface MaxPerUserPerStreamSetting {
  is_enabled: boolean;
  max_per_user_per_stream: number;
}

/**
 * Global cooldown configuration
 */
export interface GlobalCooldownSetting {
  is_enabled: boolean;
  global_cooldown_seconds: number;
}

/**
 * A custom channel point reward
 */
export interface TwitchReward {
  id: string;
  broadcaster_id: string;
  broadcaster_name: string;
  broadcaster_login: string;
  title: string;
  prompt: string;
  cost: number;
  is_enabled: boolean;
  is_paused: boolean;
  is_in_stock: boolean;
  is_user_input_required: boolean;
  max_per_stream: MaxPerStreamSetting;
  max_per_user_per_stream: MaxPerUserPerStreamSetting;
  global_cooldown: GlobalCooldownSetting;
  background_color: string;
  image: RewardImage | null;
  default_image: RewardImage;
  should_redemptions_skip_request_queue: boolean;
  redemptions_redeemed_current_stream: number | null;
  cooldown_expires_at: string | null;
}

/**
 * Status of a reward redemption
 */
export type RedemptionStatus = 'UNFULFILLED' | 'FULFILLED' | 'CANCELED';

/**
 * Reward info within a redemption
 */
export interface RedemptionReward {
  id: string;
  title: string;
  prompt: string;
  cost: number;
}

/**
 * A channel point reward redemption
 */
export interface TwitchRedemption {
  id: string;
  user_id: string;
  user_name: string;
  user_login: string;
  user_input: string;
  status: RedemptionStatus;
  redeemed_at: string;
  reward: RedemptionReward;
  broadcaster_id: string;
  broadcaster_name: string;
  broadcaster_login: string;
}

/**
 * Data required to create a custom reward
 */
export interface CreateRewardData {
  title: string;
  cost: number;
  prompt?: string;
  is_enabled?: boolean;
  background_color?: string;
  is_user_input_required?: boolean;
  is_max_per_stream_enabled?: boolean;
  max_per_stream?: number;
  is_max_per_user_per_stream_enabled?: boolean;
  max_per_user_per_stream?: number;
  is_global_cooldown_enabled?: boolean;
  global_cooldown_seconds?: number;
  should_redemptions_skip_request_queue?: boolean;
}

/**
 * Data required to update a custom reward
 */
export interface UpdateRewardData extends Partial<CreateRewardData> {
  is_paused?: boolean;
}

/**
 * Data required to update a redemption status
 */
export interface UpdateRedemptionStatusData {
  status: 'FULFILLED' | 'CANCELED';
}

// ============================================
// FORM DATA TYPES (UI Layer)
// ============================================

/**
 * Form data for creating a prediction
 */
export interface PredictionFormData {
  title: string;
  outcomes: string[]; // 2-10 outcomes
  duration: number; // seconds (30-1800)
}

/**
 * Form data for creating/editing a reward
 */
export interface RewardFormData {
  title: string;
  cost: number;
  prompt?: string;
  isEnabled?: boolean;
  backgroundColor?: string;
  isUserInputRequired?: boolean;
  maxPerStream?: number;
  maxPerStreamEnabled?: boolean;
  maxPerUserPerStream?: number;
  maxPerUserPerStreamEnabled?: boolean;
  globalCooldownSeconds?: number;
  globalCooldownEnabled?: boolean;
  skipRequestQueue?: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Generic Twitch API response wrapper
 */
export interface TwitchApiResponse<T> {
  data: T[];
}

/**
 * Twitch API error response
 */
export interface TwitchApiError {
  error: string;
  status: number;
  message: string;
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Result of form validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Prediction form validation constraints
 */
export const PREDICTION_CONSTRAINTS = {
  MIN_OUTCOMES: 2,
  MAX_OUTCOMES: 10,
  MIN_DURATION: 30,
  MAX_DURATION: 1800,
  MAX_TITLE_LENGTH: 45,
  MAX_OUTCOME_LENGTH: 25,
} as const;

/**
 * Reward form validation constraints
 */
export const REWARD_CONSTRAINTS = {
  MIN_COST: 1,
  MAX_COST: 999999999,
  MAX_TITLE_LENGTH: 45,
  MAX_PROMPT_LENGTH: 200,
  MIN_COOLDOWN: 0,
  MAX_COOLDOWN: 604800, // 7 days in seconds
} as const;
