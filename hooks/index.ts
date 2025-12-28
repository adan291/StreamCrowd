/**
 * Custom hooks for the Twitch Vote application
 * 
 * This module exports all custom hooks used throughout the application.
 * 
 * MIGRATION NOTE: The following hooks have been migrated to the hexagonal architecture
 * and are now re-exported from src/application/hooks:
 * - usePoll → usePollService
 * - useModeration → useModerationService
 * - useStreamEvents → useStreamEventService
 * - useTwitchConnection → useTwitchService
 * - useAIAnalytics → useAnalyticsService
 * 
 * The original hooks are kept as re-exports for backward compatibility.
 */

// ==================== Local Hooks (not migrated) ====================
export { useLocalStorage } from './useLocalStorage';
export type { UseLocalStorageOptions } from './useLocalStorage';

export { useDemoTour } from './useDemoTour';
export type { UseDemoTourReturn, UseDemoTourOptions, TourStep, TourStepAction } from './useDemoTour';

export { useOverlay, detectOverlayMode, getChannelFromUrl, getPollConfigFromUrl, DEFAULT_OVERLAY_SETTINGS } from './useOverlay';
export type { UseOverlayReturn, OverlaySettings } from './useOverlay';

export { useViewerCount } from './useViewerCount';
export type { default as UseViewerCountReturn } from './useViewerCount';

export { useOverlayMode, OVERLAY_BG_COLORS } from './useOverlayMode';

// ==================== Re-exports from Application Layer ====================
// These provide backward compatibility with the legacy hook names

// Poll Service (replaces usePoll)
export { usePollService, usePollService as usePoll } from '../src/application/hooks/usePollService';
export type { 
  UsePollServiceReturn, 
  UsePollServiceReturn as UsePollReturn,
  UsePollServiceOptions,
  UsePollServiceOptions as UsePollOptions,
} from '../src/application/hooks/usePollService';

// Re-export CreatePollParams as CreatePollConfig for backward compatibility
export type { CreatePollParams as CreatePollConfig } from '../src/application/services/PollService';

// PollOptionConfig type for backward compatibility
export interface PollOptionConfig {
  label: string;
  color: string;
  icon?: string;
  image?: string;
  voteKey?: string;
}

// Moderation Service (replaces useModeration)
export { useModerationService, useModerationService as useModeration } from '../src/application/hooks/useModerationService';
export type { 
  UseModerationServiceReturn,
  UseModerationServiceReturn as UseModerationReturn,
  VoteContext,
  ProcessVoteResult,
  ModerationLogEntry,
} from '../src/application/hooks/useModerationService';

// Stream Event Service (replaces useStreamEvents)
export { 
  useStreamEventService, 
  useStreamEventService as useStreamEvents,
  storageHelpers,
  generateEventId,
  getTodayString,
} from '../src/application/hooks/useStreamEventService';
export type { 
  UseStreamEventServiceReturn,
  UseStreamEventServiceReturn as UseStreamEventsReturn,
  StreamEventStats,
} from '../src/application/hooks/useStreamEventService';

// Twitch Service (replaces useTwitchConnection)
export { 
  useTwitchService, 
  useTwitchService as useTwitchConnection,
  ConnectionStatus,
} from '../src/application/hooks/useTwitchService';
export type { 
  UseTwitchServiceReturn,
  UseTwitchServiceReturn as UseTwitchConnectionReturn,
  UseTwitchServiceOptions,
  UseTwitchServiceOptions as UseTwitchConnectionOptions,
  CollaborationChannel,
  SavedCredentials,
} from '../src/application/hooks/useTwitchService';

// Analytics Service (replaces useAIAnalytics)
export { useAnalyticsService, useAnalyticsService as useAIAnalytics } from '../src/application/hooks/useAnalyticsService';
export type { 
  UseAnalyticsServiceReturn,
  UseAnalyticsServiceReturn as UseAIAnalyticsReturn,
  UseAnalyticsServiceOptions,
  UseAnalyticsServiceOptions as UseAIAnalyticsOptions,
  StoredMessage,
  AnalyticsSession,
  PollSummary,
} from '../src/application/hooks/useAnalyticsService';
