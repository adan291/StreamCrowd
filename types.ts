
export interface PollOption {
  id: number;
  label: string;
  votes: number;
  color: string;
  icon?: string;
  image?: string; // Base64 or URL
  voteKey?: string; // Custom vote keyword (e.g., "chula" for #chula)
}

export interface VoteRecord {
  userId: string;
  username: string;
  optionId: number;
  timestamp: number;
}

export interface Poll {
  id: string;
  title?: string; // Custom title for the dashboard section
  question: string;
  options: PollOption[];
  isActive: boolean;
  totalVotes: number;
  startTime: number;
  maxVotes?: number; // Optional limit
  duration?: number; // Duration in seconds (optional)
  progressBarColor?: string; // Custom color for progress bar
  limitIndicatorColor?: string; // Custom color for limit alerts
  votePrefix?: string; // Custom vote prefix (default: "+")
  voteMatchMode?: 'exact' | 'partial'; // How to match vote keywords (default: "exact")
}

export interface SavedPoll {
  id: string;
  title?: string;
  question: string;
  options: { label: string; color: string; icon?: string; image?: string }[];
  maxVotes?: number;
  duration?: number;
  isFavorite?: boolean;
  progressBarColor?: string;
  limitIndicatorColor?: string;
  votePrefix?: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  data: string; // Base64
  date: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface TwitchMessage {
  username: string;
  message: string;
  color?: string;
  id?: string;
  userId?: string;
  isSubscriber?: boolean;
  timestamp?: number;
  sourceChannel?: string; // Canal de origen (para colaboraciones)
}

// Collaboration types for multi-channel support
export interface CollaborationChannel {
  name: string;
  color: string; // Color distintivo para identificar mensajes
  isMain: boolean; // Canal principal vs colaboradores
  connectedAt: number;
}

// ============================================
// GIVEAWAY THREAD TYPES (Background Giveaways)
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

/**
 * Hilo de sorteo que corre en segundo plano
 */
export interface GiveawayThread {
  id: string;
  name: string; // Nombre del sorteo (ej: "Sorteo de subs")
  keyword: string; // Palabra clave para participar
  isActive: boolean;
  participants: GiveawayParticipant[];
  createdAt: number;
  closedAt?: number;
  winner?: GiveawayParticipant;
  // Opciones
  subscribersOnly: boolean;
  allowMultipleEntries: boolean; // Si el mismo user puede entrar varias veces
  // Modo del hilo
  mode: 'keyword' | 'subs';
  // Configuración de valores para modo subs
  subsConfig?: SubsGiveawayConfig;
}

/**
 * Configuración de valores para sorteos de subs
 */
export interface SubsGiveawayConfig {
  // Valor base por tipo de sub
  tier1Value: number; // Entradas por sub tier 1 (default: 1)
  tier2Value: number; // Entradas por sub tier 2 (default: 2)
  tier3Value: number; // Entradas por sub tier 3 (default: 5)
  primeValue: number; // Entradas por sub Prime (default: 1)
  
  // Resubs
  resubEnabled: boolean; // Contar resubs
  resubValue: number; // Entradas por resub (default: 1)
  resubBonusPerMonth: number; // Bonus por cada mes de sub (0 = sin bonus)
  
  // Gift subs
  giftSubEnabled: boolean; // Contar gift subs
  giftSubValue: number; // Entradas por cada sub regalada (default: 1)
  
  // Bits
  bitsEnabled: boolean;
  bitsPerEntry: number; // Cuántos bits = 1 entrada (ej: 100 bits = 1 entrada)
  bitsMinimum: number; // Mínimo de bits para participar
  
  // Donaciones (requiere integración externa)
  donationsEnabled: boolean;
  donationPerEntry: number; // Cuánto dinero = 1 entrada (ej: 1€ = 1 entrada)
  donationMinimum: number; // Mínimo para participar
  donationCurrency: string; // EUR, USD, etc.
  
  // Regalos de canal (Hype Train contributions, etc.)
  channelGiftsEnabled: boolean;
  channelGiftValue: number; // Entradas por regalo de canal
}

/**
 * Participación en sorteo de subs con detalles
 */
export interface SubsGiveawayEntry {
  oderId: string;
  username: string;
  entries: number; // Número de entradas
  type: 'sub' | 'resub' | 'giftsub' | 'bits' | 'donation' | 'channelgift';
  tier?: 1 | 2 | 3 | 'prime';
  months?: number; // Meses de sub (para resubs)
  amount?: number; // Cantidad (bits, donación, gifts)
  timestamp: number;
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

export interface CollaborationState {
  isActive: boolean;
  mainChannel: string;
  channels: CollaborationChannel[];
}

// Re-export moderation types from voteModerationService
export type {
  RejectionReason,
  ModerationConfig,
  VoteValidationResult,
  ModerationLogEntry,
  ModerationStats,
  ModerationPreset,
  UserVoteState,
  VoteValidationInput,
} from './services/voteModerationService';

export {
  DEFAULT_MODERATION_CONFIG,
  DEFAULT_MODERATION_STATS,
  validateAccountAge,
  validateCooldown,
  canChangeVote,
  validateVote,
  isValidWeight,
  calculateWeight,
  calculateWeightedTotal,
  createLogEntry,
  addLogEntry,
  getLogEntries,
  groupLogByReason,
  exportLogToCSV,
  clearLogEntries,
  clearAllLogEntries,
  updateStats,
  calculateAcceptanceRate,
  shouldShowWarning,
  handleVoteChange,
  savePreset,
  loadPreset,
  deletePreset,
  getAllPresets,
  formatPresetSummary,
  clearAllPresets,
} from './services/voteModerationService';

// Extended Poll type with moderation support
export interface ModeratedPoll extends Poll {
  moderationConfig: import('./services/voteModerationService').ModerationConfig;
  moderationStats: import('./services/voteModerationService').ModerationStats;
  moderationLog: import('./services/voteModerationService').ModerationLogEntry[];
}

// ============================================
// JUDGE PANEL / TOURNAMENT MODE TYPES
// ============================================

/**
 * Criterio de evaluación para el panel de jueces
 */
export interface JudgeCriterion {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  weight: number; // Peso del criterio en el total (1 = normal)
}

/**
 * Concursante/Participante del torneo
 */
export interface Contestant {
  id: string;
  name: string;
  image?: string; // Base64 o URL
  color: string;
  voteKey?: string; // Clave de voto personalizada (ej: "1", "maria")
}

/**
 * Juez del panel
 */
export interface Judge {
  id: string; // Twitch userId
  username: string;
  channelName: string;
  color: string;
  isHost: boolean; // El streamer principal
}

/**
 * Puntuación de un juez a un concursante en un criterio
 */
export interface JudgeScore {
  judgeId: string;
  contestantId: string;
  criterionId: string;
  score: number;
  timestamp: number;
}

/**
 * Voto del público a un concursante
 */
export interface PublicVote {
  oderId: string;
  odername: string;
  contestantId: string;
  timestamp: number;
}

/**
 * Configuración del torneo/panel de jueces
 */
export interface JudgePanelConfig {
  title: string;
  criteria: JudgeCriterion[];
  contestants: Contestant[];
  judges: Judge[];
  
  // Configuración de puntuación
  defaultMinScore: number;
  defaultMaxScore: number;
  
  // Votación pública
  publicVotingEnabled: boolean;
  publicVotingDuration?: number; // Segundos, undefined = manual
  publicVoteWeight: number; // Peso del voto público vs jueces (0-1)
  publicVotePrefix: string; // Prefijo para votos (default: "+")
  
  // Visualización
  revealScoresLive: boolean; // true = mostrar en tiempo real, false = revelar al final
  showJudgeNames: boolean;
  
  // Estado
  isActive: boolean;
  startTime?: number;
  endTime?: number;
}

/**
 * Estado completo del panel de jueces
 */
export interface JudgePanelState {
  config: JudgePanelConfig;
  scores: JudgeScore[];
  publicVotes: PublicVote[];
  publicVotingActive: boolean;
  publicVotingTimeLeft?: number;
  revealedContestants: string[]; // IDs de concursantes cuyos scores se han revelado
}

/**
 * Resultado calculado de un concursante
 */
export interface ContestantResult {
  contestant: Contestant;
  judgeScores: {
    judge: Judge;
    scores: { criterion: JudgeCriterion; score: number | null }[];
    total: number;
  }[];
  judgeTotal: number;
  publicVotes: number;
  publicPercentage: number;
  finalScore: number;
  rank: number;
}

/**
 * Comando de voto de juez por chat
 * Formato: !score @concursante criterio puntuacion
 * Ejemplo: !score @maria creatividad 8
 */
export interface JudgeVoteCommand {
  judgeId: string;
  contestantId: string;
  criterionId: string;
  score: number;
}

/**
 * Comando de voto público por chat
 * Formato: !voto @concursante o +1, +2, etc.
 */
export interface PublicVoteCommand {
  oderId: string;
  contestantId: string;
}
