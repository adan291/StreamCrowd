/**
 * Giveaway Types
 * Tipos específicos para el sistema de sorteos
 */

// ============================================
// RAFFLE MODE TYPES
// ============================================

export type RaffleMode = 'viewers' | 'keyword' | 'subs';
export type TabType = 'raffle' | 'active' | 'stats';

// ============================================
// PARTICIPANT TYPES
// ============================================

/**
 * Participante en un hilo de sorteo
 */
export interface GiveawayParticipant {
  oderId: string; // Twitch user ID
  username: string;
  timestamp: number;
  messageId?: string;
}

// ============================================
// THREAD TYPES
// ============================================

/**
 * Hilo de sorteo que corre en segundo plano
 */
export interface GiveawayThread {
  id: string;
  name: string;
  keyword: string;
  isActive: boolean;
  isPaused?: boolean;
  participants: GiveawayParticipant[];
  createdAt: number;
  closedAt?: number;
  winner?: GiveawayParticipant;
  subscribersOnly: boolean;
  allowMultipleEntries: boolean;
  mode: RaffleMode;
  subsConfig?: SubsGiveawayConfig;
  startsAt?: number;
  endsAt?: number;
  prizeImages?: string[];
  prizeDescription?: string;
  timerDuration?: number; // in seconds
  timeRemaining?: number; // remaining seconds when paused
  timingConfig?: RaffleTimingConfig; // New unified timing config
}

// ============================================
// SUBS CONFIGURATION TYPES
// ============================================

/**
 * Configuración de valores para sorteos de subs
 */
export interface SubsGiveawayConfig {
  tier1Value: number;
  tier2Value: number;
  tier3Value: number;
  primeValue: number;
  resubEnabled: boolean;
  resubValue: number;
  resubBonusPerMonth: number;
  giftSubEnabled: boolean;
  giftSubValue: number;
  bitsEnabled: boolean;
  bitsPerEntry: number;
  bitsMinimum: number;
  donationsEnabled: boolean;
  donationPerEntry: number;
  donationMinimum: number;
  donationCurrency: string;
  channelGiftsEnabled: boolean;
  channelGiftValue: number;
}

/**
 * Configuración por defecto para sorteos de subs
 */
export const DEFAULT_SUBS_CONFIG: SubsGiveawayConfig = {
  tier1Value: 1,
  tier2Value: 2,
  tier3Value: 5,
  primeValue: 1,
  resubEnabled: true,
  resubValue: 1,
  resubBonusPerMonth: 0,
  giftSubEnabled: true,
  giftSubValue: 1,
  bitsEnabled: false,
  bitsPerEntry: 100,
  bitsMinimum: 100,
  donationsEnabled: false,
  donationPerEntry: 1,
  donationMinimum: 1,
  donationCurrency: 'EUR',
  channelGiftsEnabled: false,
  channelGiftValue: 1,
};

/**
 * Participación en sorteo de subs con detalles
 */
export interface SubsGiveawayEntry {
  oderId: string;
  username: string;
  entries: number;
  type: 'sub' | 'resub' | 'giftsub' | 'bits' | 'donation' | 'channelgift';
  tier?: 1 | 2 | 3 | 'prime';
  months?: number;
  amount?: number;
  timestamp: number;
}

// ============================================
// HISTORY TYPES
// ============================================

/**
 * Sorteo finalizado (para historial)
 */
export interface FinishedGiveaway {
  id: string;
  name: string;
  keyword: string;
  mode: RaffleMode;
  winner: string;
  participantCount: number;
  subscribersOnly: boolean;
  createdAt: number;
  finishedAt: number;
}

// ============================================
// EXPORT/IMPORT TYPES
// ============================================

/**
 * Formato de exportación de datos
 */
export interface GiveawayExport {
  version: number;
  exportedAt: number;
  threads: GiveawayThread[];
  history: FinishedGiveaway[];
}

// ============================================
// STATISTICS TYPES
// ============================================

/**
 * Estadísticas de sorteos
 */
export interface GiveawayStats {
  totalGiveaways: number;
  totalParticipants: number;
  uniqueWinners: string[];
  participantCounts: number[];
  byMode: {
    viewers: number;
    keyword: number;
    subs: number;
  };
  lastUpdated: number;
}

export const DEFAULT_STATS: GiveawayStats = {
  totalGiveaways: 0,
  totalParticipants: 0,
  uniqueWinners: [],
  participantCounts: [],
  byMode: { viewers: 0, keyword: 0, subs: 0 },
  lastUpdated: Date.now(),
};

// ============================================
// ANIMATION TYPES
// ============================================

export type AnimationPhase = 'idle' | 'spinning' | 'slowing' | 'nearMiss' | 'winner' | 'celebration';

export interface AnimationState {
  phase: AnimationPhase;
  progress: number;
  currentDisplay: string;
  nearMissCandidates: string[];
  winner: string | null;
}

export interface WinnerAnimationConfig {
  totalDuration: number;
  startInterval: number;
  endInterval: number;
  nearMissThreshold: number;
  easingFunction: (t: number) => number;
}

// ============================================
// SYNC TYPES
// ============================================

export interface WinnerState {
  winner: string | null;
  isSelecting: boolean;
  displayName: string;
  participantCount: number;
}

// ============================================
// RAFFLE TIMING TYPES
// ============================================

export type TimingMode = 'instant' | 'scheduled';
export type DurationMode = 'fixed' | 'until';

export interface RaffleTimingConfig {
  // Cuándo empieza
  timingMode: TimingMode;
  scheduledStartDate?: string;
  scheduledStartTime?: string;
  
  // Cuánto dura
  durationMode: DurationMode;
  fixedDuration: number; // en segundos
  endDate?: string;
  endTime?: string;
}

export const DEFAULT_TIMING_CONFIG: RaffleTimingConfig = {
  timingMode: 'instant',
  durationMode: 'fixed',
  fixedDuration: 60,
};

// ============================================
// RAFFLE CONFIG TYPES
// ============================================

export interface RaffleConfig {
  title: string;
  keyword: string;
  subsOnly: boolean;
  useTimer: boolean;
  timerDuration: number; // in seconds (legacy, use timingConfig)
  startNow: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  prizeImages: string[];
  subsConfig: SubsGiveawayConfig;
  soundEnabled: boolean;
  // Multiple winners config
  winnersCount: number; // Number of winners to select (1-10)
  allowRepeatWinners: boolean; // Allow same person to win multiple times
  prizes: string[]; // Prize for each position (1st, 2nd, 3rd, etc.)
  // New timing config
  timingConfig: RaffleTimingConfig;
}

export const DEFAULT_RAFFLE_CONFIG: RaffleConfig = {
  title: '',
  keyword: '',
  subsOnly: false,
  useTimer: true,
  timerDuration: 60,
  startNow: true,
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  prizeImages: [],
  subsConfig: DEFAULT_SUBS_CONFIG,
  soundEnabled: true,
  winnersCount: 1,
  allowRepeatWinners: false,
  prizes: [],
  timingConfig: DEFAULT_TIMING_CONFIG,
};

// ============================================
// MULTIPLE WINNERS TYPES
// ============================================

export interface WinnerEntry {
  position: number; // 1, 2, 3, etc.
  username: string;
  prize?: string;
  timestamp: number;
}

// ============================================
// PRESET TYPES
// ============================================

export interface SubsPreset {
  id: string;
  name: string;
  description: string;
  config: SubsGiveawayConfig;
}

// ============================================
// SCHEDULED GIVEAWAY TYPES
// ============================================

export type RepeatType = 'once' | 'minutes' | 'hours' | 'daily';

export interface ScheduledGiveaway {
  id: string;
  config: RaffleConfig;
  scheduledAt: number;
  repeatConfig?: {
    type: RepeatType;
    interval: number; // minutes or hours depending on type
    maxExecutions?: number;
    executionCount: number;
  };
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  lastExecutedAt?: number;
  nextExecutionAt?: number;
  createdAt: number;
}

// ============================================
// PARTICIPATION REQUIREMENTS TYPES
// ============================================

export interface ParticipationRequirements {
  minFollowTime?: number; // minutes
  minMessages?: number;
  minChannelPoints?: number;
  requireVerified?: boolean;
  minAccountAge?: number; // days
}

// ============================================
// PRIZE TYPES
// ============================================

export type PrizeStatus = 'available' | 'assigned' | 'delivered' | 'cancelled';

export interface Prize {
  id: string;
  name: string;
  description?: string;
  image?: string;
  value?: number;
  category?: string;
  status: PrizeStatus;
  createdAt: number;
}

export interface PrizeAssignment {
  id: string;
  prizeId: string;
  giveawayId: string;
  winner: string;
  status: 'pending' | 'delivered' | 'cancelled';
  assignedAt: number;
  deliveredAt?: number;
}

// ============================================
// BOT DETECTION TYPES
// ============================================

export interface BotDetectionConfig {
  enabled: boolean;
  filterKnownBots: boolean;
  minAccountAge: number; // days
  requireVerifiedEmail: boolean;
  customBotList: string[];
}

export const DEFAULT_BOT_DETECTION_CONFIG: BotDetectionConfig = {
  enabled: false,
  filterKnownBots: true,
  minAccountAge: 0,
  requireVerifiedEmail: false,
  customBotList: [],
};

// ============================================
// HISTORY FILTER TYPES
// ============================================

export type DateRangeType = 'today' | 'week' | 'month' | 'all' | 'custom';

export interface HistoryFilters {
  dateRange: DateRangeType;
  customStartDate?: string;
  customEndDate?: string;
  mode?: RaffleMode | 'all';
  winnerSearch?: string;
}
