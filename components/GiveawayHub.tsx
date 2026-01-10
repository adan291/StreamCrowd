/**
 * GiveawayHub - Re-export from modular implementation
 * 
 * This file re-exports the refactored GiveawayHub component from the
 * modular implementation in components/giveaway/
 * 
 * The original 3500+ line component has been split into:
 * - components/giveaway/GiveawayHub.tsx (main component ~300 lines)
 * - components/giveaway/hooks/ (useRaffle, useParticipants, useThreads, etc.)
 * - components/giveaway/services/ (GiveawayStorage)
 * - components/giveaway/modals/ (SubsConfigModal, BlacklistModal)
 * - components/giveaway/RaffleTab.tsx, ThreadsTab.tsx, etc.
 */

// Re-export the main component
export { GiveawayHub } from './giveaway/GiveawayHub';
export { default } from './giveaway/GiveawayHub';

// Re-export types for backward compatibility
export type { FinishedGiveaway } from './giveaway/types';
