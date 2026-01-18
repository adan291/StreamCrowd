/**
 * English (EN) Moderation Translations
 * 
 * Moderation system translations for chat and voting control.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { ModerationTranslations } from '../../types';

/**
 * Moderation English translations
 * Chat moderation, vote filtering, and user management
 */
export const moderation: ModerationTranslations = {
  title: 'Moderation',
  config: 'Configuration',
  stats: 'Statistics',
  log: 'Log',
  accepted: 'Accepted',
  rejected: 'Rejected',
  voteChanged: 'Vote changed',
  acceptanceRate: 'Acceptance rate',
  reset: 'Reset',
  minAccountAge: 'Minimum account age',
  minAccountAgeTooltip: 'Minimum account age in days to vote',
  allowVoteChanges: 'Allow vote changes',
  allowVoteChangesTooltip: 'Allow users to change their vote',
  enabled: 'Enabled',
  disabled: 'Disabled',
  cooldown: 'Cooldown',
  cooldownTooltip: 'Time between votes from the same user',
  voteWeights: 'Vote weights',
  voteWeightsTooltip: 'Different vote values based on user type',
  subscriber: 'Subscriber',
  follower: 'Follower',
  regularUsers: 'Regular users',
  presets: 'Presets',
  presetName: 'Preset name',
  loadPreset: 'Load preset',
  noPresets: 'No presets',
  presetSaved: 'Preset saved',
  presetLoaded: 'Preset loaded',
  presetDeleted: 'Preset deleted',
  enterPresetName: 'Enter preset name',
  resetDefaults: 'Reset to defaults',
  whitelist: 'Whitelist',
  whitelistTooltip: 'Only these users can vote',
  whitelistEnabled: 'Whitelist enabled',
  whitelistPlaceholder: 'username1, username2, username3',
  whitelistCount: '{count} users whitelisted',
  blacklist: 'Blacklist',
  blacklistTooltip: 'These users cannot vote',
  blacklistEnabled: 'Blacklist enabled',
  blacklistPlaceholder: 'username1, username2, username3',
  blacklistCount: '{count} users blacklisted',
  reasons: {
    accountTooNew: 'Account too new',
    cooldownActive: 'Cooldown active',
    alreadyVoted: 'Already voted',
    invalidOption: 'Invalid option',
    voteChangeCooldown: 'Vote change cooldown',
    notWhitelisted: 'Not whitelisted',
    blacklisted: 'Blacklisted',
  },
};

export default moderation;