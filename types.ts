
// ============================================
// NAVIGATION TYPES (Sidebar Dynamics Grouping)
// ============================================

/**
 * Main sidebar tab options
 * @requirements 1.1 - Plataformas tab in sidebar
 */
export type LeftTab = 'dynamics' | 'games' | 'platforms' | 'obs' | 'gallery' | 'data';

/**
 * Sub-views within the Dynamics section
 */
export type DynamicsView = 'selector' | 'poll' | 'judge' | 'giveaway' | 'countdown' | 'spinner';

// ============================================
// PLATFORMS NAVIGATION TYPES
// ============================================

/**
 * Sub-views within the Platforms section
 * 'selector' - Shows available platforms (Twitch, YouTube, etc.)
 * 'twitch' - Shows Twitch-specific tools
 * Expandable for future platforms: 'youtube', 'kick', etc.
 * 
 * @requirements 6.3 - Navigation state supports platform and tool selection independently
 */
export type PlatformsView = 'selector' | 'twitch';

/**
 * Tool selection within a platform
 * 'none' - No tool selected (showing tool selector)
 * 'commands' - Custom chat commands panel
 * 'predictions' - Twitch predictions (coming soon)
 * 'channelpoints' - Channel points rewards (coming soon)
 * 
 * @requirements 6.3 - Navigation state supports platform and tool selection independently
 */
export type PlatformsTool = 'none' | 'commands' | 'macros' | 'predictions' | 'channelpoints' | 'timers';

/**
 * Configuration for each activity card in the ActivitySelector
 */
export interface ActivityConfig {
  id: Exclude<DynamicsView, 'selector'>;
  icon: string;
  title: string;
  description: string;
  color: string;
}

/**
 * Activity configurations for the Dynamics section
 * Used by ActivitySelector to render activity cards
 */
export const ACTIVITIES: ActivityConfig[] = [
  {
    id: 'poll',
    icon: 'Vote',
    title: 'Encuesta',
    description: 'Crea votaciones interactivas para tu audiencia',
    color: '#a970ff', // Twitch purple
  },
  {
    id: 'judge',
    icon: 'Trophy',
    title: 'Jurado',
    description: 'Panel de puntuación en vivo',
    color: '#fbbf24', // Amber
  },
  {
    id: 'giveaway',
    icon: 'Gift',
    title: 'Sorteos',
    description: 'Sorteos y giveaways para tu comunidad',
    color: '#f472b6', // Pink
  },
  {
    id: 'countdown',
    icon: 'Timer',
    title: 'Countdown',
    description: 'Temporizador con cuenta atrás para eventos',
    color: '#3b82f6', // Blue
  },
];

// ============================================
// POLL TYPES
// ============================================

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

// Re-export moderation types from domain entities
export type {
  RejectionReason,
  ModerationConfig,
  ModerationResult,
  ModerationStats,
} from './src/domain/entities/ModerationConfig';

export {
  DEFAULT_MODERATION_CONFIG,
  DEFAULT_MODERATION_STATS,
} from './src/domain/entities/ModerationConfig';

// Re-export from ModerationService
export type {
  VoteInput,
  UserVoteState,
  ModerationPreset,
} from './src/application/services/ModerationService';

// Legacy type aliases for backward compatibility
export type VoteValidationResult = import('./src/domain/entities/ModerationConfig').ModerationResult;
export type VoteValidationInput = {
  username?: string;
  accountAgeDays: number;
  hasVoted: boolean;
  lastVoteTime: number;
  currentTime: number;
  isSubscriber: boolean;
  isFollower: boolean;
};

// Legacy ModerationLogEntry type for backward compatibility
export interface ModerationLogEntry {
  timestamp: number;
  username: string;
  oderId: string;
  action: 'REJECTED' | 'ACCEPTED' | 'VOTE_CHANGED';
  reason?: import('./src/domain/entities/ModerationConfig').RejectionReason;
  optionId: number;
  weight: number;
}

// ============================================================================
// Legacy Moderation Functions (for backward compatibility)
// These functions are kept for components that still use them directly.
// New code should use ModerationService instead.
// ============================================================================

/**
 * Validates if an account meets the minimum age requirement.
 * @deprecated Use ModerationService.processVote() instead
 */
export function validateAccountAge(accountAgeDays: number, minAge: number): boolean {
  if (minAge === 0) return true;
  return accountAgeDays >= minAge;
}

/**
 * Validates if a user can vote based on cooldown period.
 * @deprecated Use ModerationService.processVote() instead
 */
export function validateCooldown(
  lastVoteTime: number,
  cooldownSeconds: number,
  currentTime: number
): boolean {
  if (lastVoteTime === 0) return true;
  const elapsedSeconds = (currentTime - lastVoteTime) / 1000;
  return elapsedSeconds >= cooldownSeconds;
}

/**
 * Validates if a user can change their vote.
 * @deprecated Use ModerationService.processVote() instead
 */
export function canChangeVote(hasVoted: boolean, voteChangeEnabled: boolean): boolean {
  if (!hasVoted) return true;
  return voteChangeEnabled;
}

/**
 * Main vote validation function.
 * @deprecated Use ModerationService.processVote() instead
 */
export function validateVote(
  input: VoteValidationInput,
  config: import('./src/domain/entities/ModerationConfig').ModerationConfig
): VoteValidationResult {
  const normalizedUsername = input.username?.toLowerCase() || '';

  if (config.blacklist?.enabled && config.blacklist.usernames.length > 0) {
    const isBlacklisted = config.blacklist.usernames.some(
      (name) => name.toLowerCase() === normalizedUsername
    );
    if (isBlacklisted) {
      return { isValid: false, rejectionReason: 'BLACKLISTED', weight: 0 };
    }
  }

  if (config.whitelist?.enabled && config.whitelist.usernames.length > 0) {
    const isWhitelisted = config.whitelist.usernames.some(
      (name) => name.toLowerCase() === normalizedUsername
    );
    if (!isWhitelisted) {
      return { isValid: false, rejectionReason: 'NOT_WHITELISTED', weight: 0 };
    }
  }

  if (!validateAccountAge(input.accountAgeDays, config.minAccountAgeDays)) {
    return { isValid: false, rejectionReason: 'ACCOUNT_TOO_YOUNG', weight: 0 };
  }

  if (!canChangeVote(input.hasVoted, config.voteChangeEnabled)) {
    return { isValid: false, rejectionReason: 'VOTE_CHANGE_DISABLED', weight: 0 };
  }

  if (input.hasVoted && !validateCooldown(input.lastVoteTime, config.voteChangeCooldownSeconds, input.currentTime)) {
    return { isValid: false, rejectionReason: 'COOLDOWN_ACTIVE', weight: 0 };
  }

  let weight = config.weights.regular;
  if (input.isSubscriber) {
    weight = config.weights.subscriber;
  } else if (input.isFollower) {
    weight = config.weights.follower;
  }

  return { isValid: true, weight };
}

/**
 * Validates if a weight value is within the valid range (1-5).
 * @deprecated Use ModerationService instead
 */
export function isValidWeight(weight: number): boolean {
  return Number.isInteger(weight) && weight >= 1 && weight <= 5;
}

/**
 * Calculates the vote weight based on user trust level.
 * @deprecated Use ModerationService instead
 */
export function calculateWeight(
  isSubscriber: boolean,
  isFollower: boolean,
  config: import('./src/domain/entities/ModerationConfig').ModerationConfig
): number {
  if (isSubscriber) return config.weights.subscriber;
  if (isFollower) return config.weights.follower;
  return 1;
}

/**
 * Calculates the weighted total of votes.
 * @deprecated Use ModerationService instead
 */
export function calculateWeightedTotal(
  votes: { oderId: string }[],
  weights: Map<string, number>
): number {
  return votes.reduce((total, vote) => {
    const weight = weights.get(vote.oderId) ?? 1;
    return total + weight;
  }, 0);
}

/**
 * Creates a moderation log entry.
 * @deprecated Use ModerationService instead
 */
export function createLogEntry(
  username: string,
  oderId: string,
  action: 'REJECTED' | 'ACCEPTED' | 'VOTE_CHANGED',
  reason: import('./src/domain/entities/ModerationConfig').RejectionReason | undefined,
  optionId: number,
  weight: number
): ModerationLogEntry {
  return { timestamp: Date.now(), username, oderId, action, reason, optionId, weight };
}

// In-memory storage for log entries
const logStorage: Map<string, ModerationLogEntry[]> = new Map();

export function addLogEntry(pollId: string, entry: ModerationLogEntry): void {
  const entries = logStorage.get(pollId) ?? [];
  entries.push(entry);
  logStorage.set(pollId, entries);
}

export function getLogEntries(pollId: string, limit: number = 100): ModerationLogEntry[] {
  const entries = logStorage.get(pollId) ?? [];
  if (entries.length <= limit) return [...entries];
  return entries.slice(-limit);
}

export function groupLogByReason(entries: ModerationLogEntry[]): Record<import('./src/domain/entities/ModerationConfig').RejectionReason, number> {
  const result: Record<import('./src/domain/entities/ModerationConfig').RejectionReason, number> = {
    ACCOUNT_TOO_YOUNG: 0,
    COOLDOWN_ACTIVE: 0,
    VOTE_CHANGE_DISABLED: 0,
    INVALID_OPTION: 0,
    NOT_WHITELISTED: 0,
    BLACKLISTED: 0,
  };
  for (const entry of entries) {
    if (entry.action === 'REJECTED' && entry.reason) {
      result[entry.reason]++;
    }
  }
  return result;
}

export function exportLogToCSV(entries: ModerationLogEntry[]): string {
  const headers = ['timestamp', 'username', 'oderId', 'action', 'reason', 'optionId', 'weight'];
  const rows = entries.map(entry => [
    entry.timestamp.toString(),
    `"${entry.username.replace(/"/g, '""')}"`,
    `"${entry.oderId.replace(/"/g, '""')}"`,
    entry.action,
    entry.reason ?? '',
    entry.optionId.toString(),
    entry.weight.toString(),
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function clearLogEntries(pollId: string): void {
  logStorage.delete(pollId);
}

export function clearAllLogEntries(): void {
  logStorage.clear();
}

export function updateStats(
  stats: import('./src/domain/entities/ModerationConfig').ModerationStats,
  isAccepted: boolean,
  reason?: import('./src/domain/entities/ModerationConfig').RejectionReason
): import('./src/domain/entities/ModerationConfig').ModerationStats {
  const newTotalAttempts = stats.totalAttempts + 1;
  const newAcceptedVotes = isAccepted ? stats.acceptedVotes + 1 : stats.acceptedVotes;
  const newRejectedByReason = { ...stats.rejectedByReason };
  if (!isAccepted && reason) {
    newRejectedByReason[reason] = (newRejectedByReason[reason] ?? 0) + 1;
  }
  const newAcceptanceRate = newTotalAttempts > 0 ? (newAcceptedVotes / newTotalAttempts) * 100 : 100;
  return {
    totalAttempts: newTotalAttempts,
    acceptedVotes: newAcceptedVotes,
    rejectedByReason: newRejectedByReason,
    acceptanceRate: newAcceptanceRate,
  };
}

export function calculateAcceptanceRate(stats: import('./src/domain/entities/ModerationConfig').ModerationStats): number {
  if (stats.totalAttempts === 0) return 100;
  return (stats.acceptedVotes / stats.totalAttempts) * 100;
}

export function shouldShowWarning(acceptanceRate: number): boolean {
  return acceptanceRate < 50;
}

export function handleVoteChange(
  poll: ModeratedPoll,
  _oderId: string,
  oldOptionId: number,
  newOptionId: number,
  weight: number
): ModeratedPoll {
  const updatedPoll: ModeratedPoll = {
    ...poll,
    options: poll.options.map(option => ({ ...option })),
    moderationStats: { ...poll.moderationStats, rejectedByReason: { ...poll.moderationStats.rejectedByReason } },
    moderationLog: [...poll.moderationLog],
  };
  const oldOption = updatedPoll.options.find(opt => opt.id === oldOptionId);
  if (oldOption) oldOption.votes -= weight;
  const newOption = updatedPoll.options.find(opt => opt.id === newOptionId);
  if (newOption) newOption.votes += weight;
  return updatedPoll;
}

// Preset functions - delegate to ModerationService
const PRESETS_STORAGE_KEY = 'twitch_vote_mod_presets';
let inMemoryPresets: import('./src/application/services/ModerationService').ModerationPreset[] = [];

function generatePresetId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getAllPresets(): import('./src/application/services/ModerationService').ModerationPreset[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    }
  } catch { /* ignore */ }
  return [...inMemoryPresets];
}

function saveAllPresets(presets: import('./src/application/services/ModerationService').ModerationPreset[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    }
  } catch { /* ignore */ }
  inMemoryPresets = [...presets];
}

export function savePreset(name: string, config: import('./src/domain/entities/ModerationConfig').ModerationConfig): import('./src/application/services/ModerationService').ModerationPreset {
  const preset: import('./src/application/services/ModerationService').ModerationPreset = {
    id: generatePresetId(),
    name,
    config: { ...config, weights: { ...config.weights } },
    createdAt: Date.now(),
  };
  const presets = getAllPresets();
  presets.push(preset);
  saveAllPresets(presets);
  return preset;
}

export function loadPreset(id: string): import('./src/application/services/ModerationService').ModerationPreset | null {
  const presets = getAllPresets();
  return presets.find(p => p.id === id) ?? null;
}

export function deletePreset(id: string): boolean {
  const presets = getAllPresets();
  const initialLength = presets.length;
  const filteredPresets = presets.filter(p => p.id !== id);
  if (filteredPresets.length < initialLength) {
    saveAllPresets(filteredPresets);
    return true;
  }
  return false;
}

export function formatPresetSummary(preset: import('./src/application/services/ModerationService').ModerationPreset): string {
  const { name, config } = preset;
  const parts: string[] = [name];
  if (config.minAccountAgeDays > 0) {
    parts.push(`Min Age: ${config.minAccountAgeDays} days`);
  } else {
    parts.push('Min Age: None');
  }
  parts.push(`Vote Change: ${config.voteChangeEnabled ? 'Enabled' : 'Disabled'}`);
  parts.push(`Weights: Sub=${config.weights.subscriber}, Follow=${config.weights.follower}`);
  return parts.join(' | ');
}

export function clearAllPresets(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PRESETS_STORAGE_KEY);
    }
  } catch { /* ignore */ }
  inMemoryPresets = [];
}

// Extended Poll type with moderation support
export interface ModeratedPoll extends Poll {
  moderationConfig: import('./src/domain/entities/ModerationConfig').ModerationConfig;
  moderationStats: import('./src/domain/entities/ModerationConfig').ModerationStats;
  moderationLog: ModerationLogEntry[];
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
