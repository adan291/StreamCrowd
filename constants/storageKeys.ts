/**
 * Centralized localStorage keys for the Twitch Vote application
 * 
 * All localStorage keys should be defined here to avoid magic strings
 * scattered throughout the codebase.
 */

export const STORAGE_KEYS = {
  // Poll Sync
  POLL_SYNC: 'twitch_vote_sync_poll',
  VOTE_HISTORY_SYNC: 'twitch_vote_sync_history',
  
  // Assets
  MEDIA_ASSETS: 'twitch_vote_assets',
  
  // AI Config
  AI_CONFIG: 'twitch_ai_config',
  STREAM_SESSIONS: 'twitch_stream_sessions',
  
  // Theme
  THEME: 'twitch_vote_theme',
  
  // Locale
  LOCALE: 'twitch_vote_locale',
  
  // Overlay
  OVERLAY_CONFIG: 'twitch_vote_overlay_config',
  
  // Poll Templates
  POLL_TEMPLATES: 'twitch_vote_templates',
  
  // Mascot Position
  MASCOT_POSITION: 'twitch_vote_mascot_position',
  
  // Moderation Presets
  MODERATION_PRESETS: 'twitch_vote_moderation_presets',
  
  // Poll History
  POLL_HISTORY: 'twitch_vote_poll_history',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
