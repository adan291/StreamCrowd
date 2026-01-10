/**
 * Giveaway Module
 * Re-exports all giveaway-related components, hooks, and types
 */

// Types
export * from './types';

// Constants
export { SUBS_PRESETS, getPresetById, matchesPreset } from './constants/presets';
export { PRESET_SIMPLE, PRESET_WEIGHTED, PRESET_VIP, PRESET_MONETIZATION } from './constants/presets';

// Services
export { GiveawayStorage, GiveawayStorageError } from './services/GiveawayStorage';
export type { ValidationResult, ImportResult, StorageErrorCode } from './services/GiveawayStorage';
export { ChatCommandsService, getChatCommandsService, CHAT_COMMANDS, DEFAULT_CHAT_COMMANDS_CONFIG } from './services/ChatCommands';
export type { ChatCommand, CommandResponse, ChatCommandsConfig } from './services/ChatCommands';

// Hooks
export { useRaffle } from './hooks/useRaffle';
export type { UseRaffleReturn, RaffleState, RafflePhase } from './hooks/useRaffle';
export { useThreads } from './hooks/useThreads';
export type { UseThreadsReturn, CreateThreadConfig } from './hooks/useThreads';
export { useParticipants } from './hooks/useParticipants';
export type { UseParticipantsReturn, UseParticipantsOptions } from './hooks/useParticipants';
export { useGiveawaySync } from './hooks/useGiveawaySync';
export type { UseGiveawaySyncReturn, UseGiveawaySyncOptions, GiveawaySyncState } from './hooks/useGiveawaySync';
export { useWinnerAnimation } from './hooks/useWinnerAnimation';
export type { UseWinnerAnimationReturn, UseWinnerAnimationOptions, AnimationState, AnimationPhase } from './hooks/useWinnerAnimation';
export { useGiveawaySound } from './hooks/useGiveawaySound';
export type { UseGiveawaySoundReturn, UseGiveawaySoundOptions, SoundType } from './hooks/useGiveawaySound';

// Components
export { WinnerDisplay } from './WinnerDisplay';
export type { WinnerDisplayProps } from './WinnerDisplay';
export { ModeSelector } from './ModeSelector';
export type { ModeSelectorProps } from './ModeSelector';
export { ParticipantsList } from './ParticipantsList';
export type { ParticipantsListProps, ParticipantSource, ParticipantEntry } from './ParticipantsList';
export { ThreadCard } from './ThreadCard';
export type { ThreadCardProps } from './ThreadCard';
export { RaffleTab } from './RaffleTab';
export type { RaffleTabProps } from './RaffleTab';
export { ThreadsTab } from './ThreadsTab';
export type { ThreadsTabProps } from './ThreadsTab';
export { GiveawayHub } from './GiveawayHub';
export { SpinWheel } from './SpinWheel';
export type { SpinWheelProps, SpinPhase } from './SpinWheel';
export { StatsPanel } from './StatsPanel';
export type { StatsPanelProps } from './StatsPanel';
export { DurationPicker } from './DurationPicker';
export type { DurationPickerProps } from './DurationPicker';
export { RaffleTimingConfigComponent } from './RaffleTimingConfig';
export type { RaffleTimingConfig, RaffleTimingConfigProps, TimingMode, DurationMode } from './RaffleTimingConfig';
export { PrizeImagePicker } from './PrizeImagePicker';
export type { PrizeImagePickerProps } from './PrizeImagePicker';
export { ActiveGiveawayCard } from './ActiveGiveawayCard';
export type { ActiveGiveawayCardProps } from './ActiveGiveawayCard';
export { SoundSettings } from './SoundSettings';
export { MultiWinnerConfig } from './MultiWinnerConfig';
export { MultiWinnerDisplay } from './MultiWinnerDisplay';
export { ChatSettings } from './ChatSettings';

// Modals
export { SubsConfigModal } from './modals/SubsConfigModal';
export type { SubsConfigModalProps } from './modals/SubsConfigModal';
export { BlacklistModal } from './modals/BlacklistModal';
export type { BlacklistModalProps } from './modals/BlacklistModal';

// New Phase 4 Components
export { HistoryPanel } from './HistoryPanel';
export { ScheduleModal } from './ScheduleModal';
export { RequirementsConfig } from './RequirementsConfig';
export { PrizeLibrary } from './PrizeLibrary';
export { BotFilterConfig } from './BotFilterConfig';

// Empty States
export { EmptyState, NoParticipants, NoActiveThreads, NoHistory } from './EmptyState';
export type { EmptyStateProps, EmptyStateType } from './EmptyState';

// Preview & Modals
export { RafflePreview } from './RafflePreview';
export type { RafflePreviewProps } from './RafflePreview';
export { AnimatedModal, ModalFooter, ModalButton } from './AnimatedModal';
export type { AnimatedModalProps, ModalFooterProps, ModalButtonProps } from './AnimatedModal';

// New Phase 4 Services
export { SchedulerService } from './services/SchedulerService';
export { PrizeService } from './services/PrizeService';
export { BotDetectionService } from './services/BotDetectionService';
export type { FilterResult, FilterStats } from './services/BotDetectionService';
