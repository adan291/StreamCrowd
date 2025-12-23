/**
 * Custom hooks for the Twitch Vote application
 * 
 * This module exports all custom hooks used throughout the application.
 * Hooks are organized to encapsulate specific domains of functionality:
 * - useLocalStorage: Type-safe localStorage persistence
 * - usePoll: Poll state and actions management
 * - useModeration: Vote moderation logic
 * - useOverlay: Overlay mode configuration
 * - useTwitchConnection: Twitch chat connection handling
 * - useAIAnalytics: AI/mascot analytics state
 */

// Hooks will be exported here as they are implemented
export { useLocalStorage } from './useLocalStorage';
export type { UseLocalStorageOptions } from './useLocalStorage';
export { usePoll } from './usePoll';
export type { UsePollReturn, UsePollOptions, CreatePollConfig, PollOptionConfig } from './usePoll';
export { useModeration } from './useModeration';
export type { UseModerationReturn, VoteContext, ProcessVoteResult } from './useModeration';
export { useOverlay, detectOverlayMode, getChannelFromUrl, getPollConfigFromUrl, DEFAULT_OVERLAY_SETTINGS } from './useOverlay';
export type { UseOverlayReturn, OverlaySettings } from './useOverlay';
export { useTwitchConnection } from './useTwitchConnection';
export type { UseTwitchConnectionReturn, UseTwitchConnectionOptions } from './useTwitchConnection';
export { useAIAnalytics } from './useAIAnalytics';
export type { UseAIAnalyticsReturn, UseAIAnalyticsOptions } from './useAIAnalytics';
export { useDemoTour } from './useDemoTour';
export type { UseDemoTourReturn, UseDemoTourOptions, TourStep, TourStepAction } from './useDemoTour';
export { useViewerCount } from './useViewerCount';
export type { default as UseViewerCountReturn } from './useViewerCount';
export { useStreamEvents } from './useStreamEvents';
export type { UseStreamEventsReturn } from './useStreamEvents';
