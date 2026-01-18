/**
 * GiveawayHub - Re-export from modular implementation with Error Boundary
 * 
 * This file re-exports the refactored GiveawayHub component from the
 * modular implementation in components/giveaway/, wrapped with an ErrorBoundary
 * for error isolation and recovery.
 * 
 * The original 3500+ line component has been split into:
 * - components/giveaway/GiveawayHub.tsx (main component ~300 lines)
 * - components/giveaway/hooks/ (useRaffle, useParticipants, useThreads, etc.)
 * - components/giveaway/services/ (GiveawayStorage)
 * - components/giveaway/modals/ (SubsConfigModal, BlacklistModal)
 * - components/giveaway/RaffleTab.tsx, ThreadsTab.tsx, etc.
 * 
 * Requirements: 2.2 - Wrap Giveaway feature with ErrorBoundary
 */

// Re-export the wrapped component with error boundary
export { GiveawayHubWithErrorBoundary as GiveawayHub } from './giveaway/GiveawayHubWithErrorBoundary';
export { GiveawayHubWithErrorBoundary as default } from './giveaway/GiveawayHubWithErrorBoundary';

// Re-export the unwrapped component for direct use if needed
export { GiveawayHub as GiveawayHubCore } from './giveaway/GiveawayHub';

// Re-export types for backward compatibility
export type { FinishedGiveaway } from './giveaway/types';
