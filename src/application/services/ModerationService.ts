/**
 * ModerationService - Servicio de moderación de votos
 * 
 * Este servicio implementa toda la lógica de validación y moderación de votos,
 * incluyendo validación de cuenta, cooldowns, whitelist/blacklist, y cálculo de pesos.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import {
  ModerationConfig,
  ModerationResult,
  ModerationStats,
  RejectionReason,
  DEFAULT_MODERATION_CONFIG,
  DEFAULT_MODERATION_STATS,
} from '../../domain/entities/ModerationConfig';

/**
 * Input para procesar un voto
 */
export interface VoteInput {
  userId: string;
  username: string;
  optionId: number;
  isSubscriber: boolean;
  isFollower: boolean;
  accountAgeDays: number;
}

/**
 * Estado del voto de un usuario
 */
export interface UserVoteState {
  optionId: number;
  timestamp: number;
  weight: number;
}

/**
 * Preset de moderación guardado
 */
export interface ModerationPreset {
  id: string;
  name: string;
  config: ModerationConfig;
  createdAt: number;
}

// Storage key for presets
const PRESETS_STORAGE_KEY = 'twitch_vote_mod_presets';

/**
 * Servicio de moderación de votos
 * 
 * Implementa la lógica de validación de votos según la configuración de moderación.
 */
export class ModerationService {
  private config: ModerationConfig;
  private stats: ModerationStats;
  private userVotes: Map<string, UserVoteState>;

  constructor(config?: Partial<ModerationConfig>) {
    this.config = config 
      ? { ...DEFAULT_MODERATION_CONFIG, ...config }
      : { ...DEFAULT_MODERATION_CONFIG };
    this.stats = { 
      ...DEFAULT_MODERATION_STATS,
      rejectedByReason: { ...DEFAULT_MODERATION_STATS.rejectedByReason }
    };
    this.userVotes = new Map();
  }

  // ============================================================================
  // Core Validation - Requirements 1.1, 1.2, 1.3, 1.6
  // ============================================================================

  /**
   * Procesa un voto y retorna el resultado de validación
   * 
   * Orden de validación:
   * 1. Blacklist check
   * 2. Whitelist check (si está habilitada)
   * 3. Account age check
   * 4. Vote change permission check
   * 5. Cooldown check
   * 6. Invalid option check
   * 
   * @param input - Datos del voto
   * @param validOptionIds - IDs de opciones válidas
   * @returns Resultado de la validación
   */
  processVote(input: VoteInput, validOptionIds: number[]): ModerationResult {
    const normalizedUsername = input.username.toLowerCase();
    const existingVote = this.userVotes.get(input.userId);
    const currentTime = Date.now();

    // Step 1: Check blacklist first (blocked users)
    if (this.config.blacklist.enabled && this.config.blacklist.usernames.length > 0) {
      const isBlacklisted = this.config.blacklist.usernames.some(
        (name) => name.toLowerCase() === normalizedUsername
      );
      if (isBlacklisted) {
        this.updateStats(false, 'BLACKLISTED');
        return {
          isValid: false,
          rejectionReason: 'BLACKLISTED',
          weight: 0,
        };
      }
    }

    // Step 2: Check whitelist if enabled
    if (this.config.whitelist.enabled && this.config.whitelist.usernames.length > 0) {
      const isWhitelisted = this.config.whitelist.usernames.some(
        (name) => name.toLowerCase() === normalizedUsername
      );
      if (!isWhitelisted) {
        this.updateStats(false, 'NOT_WHITELISTED');
        return {
          isValid: false,
          rejectionReason: 'NOT_WHITELISTED',
          weight: 0,
        };
      }
    }

    // Step 3: Check account age filter
    if (this.config.minAccountAgeDays > 0 && input.accountAgeDays < this.config.minAccountAgeDays) {
      this.updateStats(false, 'ACCOUNT_TOO_YOUNG');
      return {
        isValid: false,
        rejectionReason: 'ACCOUNT_TOO_YOUNG',
        weight: 0,
      };
    }

    // Step 4: Check vote change permission
    if (existingVote && !this.config.voteChangeEnabled) {
      this.updateStats(false, 'VOTE_CHANGE_DISABLED');
      return {
        isValid: false,
        rejectionReason: 'VOTE_CHANGE_DISABLED',
        weight: 0,
      };
    }

    // Step 5: Check cooldown if user has voted before
    if (existingVote && this.config.voteChangeCooldownSeconds > 0) {
      const elapsedSeconds = (currentTime - existingVote.timestamp) / 1000;
      if (elapsedSeconds < this.config.voteChangeCooldownSeconds) {
        this.updateStats(false, 'COOLDOWN_ACTIVE');
        return {
          isValid: false,
          rejectionReason: 'COOLDOWN_ACTIVE',
          weight: 0,
        };
      }
    }

    // Step 6: Check if option is valid
    if (!validOptionIds.includes(input.optionId)) {
      this.updateStats(false, 'INVALID_OPTION');
      return {
        isValid: false,
        rejectionReason: 'INVALID_OPTION',
        weight: 0,
      };
    }

    // All validations passed - calculate weight
    const weight = this.calculateWeight(input.isSubscriber, input.isFollower);
    const isVoteChange = !!existingVote;

    // Store the vote
    const newVoteState: UserVoteState = {
      optionId: input.optionId,
      timestamp: currentTime,
      weight,
    };
    this.userVotes.set(input.userId, newVoteState);

    // Update stats
    this.updateStats(true);

    // Build result
    const result: ModerationResult = {
      isValid: true,
      weight,
      isVoteChange,
    };

    if (isVoteChange && existingVote) {
      result.previousOptionId = existingVote.optionId;
      result.previousWeight = existingVote.weight;
    }

    return result;
  }

  /**
   * Calcula el peso del voto según el tipo de usuario
   */
  private calculateWeight(isSubscriber: boolean, isFollower: boolean): number {
    if (isSubscriber) {
      return this.config.weights.subscriber;
    }
    if (isFollower) {
      return this.config.weights.follower;
    }
    return this.config.weights.regular;
  }

  /**
   * Actualiza las estadísticas de moderación
   */
  private updateStats(isAccepted: boolean, reason?: RejectionReason): void {
    this.stats.totalAttempts++;
    
    if (isAccepted) {
      this.stats.acceptedVotes++;
    } else if (reason) {
      this.stats.rejectedByReason[reason]++;
    }

    // Recalculate acceptance rate
    this.stats.acceptanceRate = this.stats.totalAttempts > 0
      ? (this.stats.acceptedVotes / this.stats.totalAttempts) * 100
      : 0;
  }

  // ============================================================================
  // Configuration - Requirements 1.7
  // ============================================================================

  /**
   * Establece la configuración de moderación
   */
  setConfig(config: ModerationConfig): void {
    this.config = { ...config };
  }

  /**
   * Obtiene la configuración actual de moderación
   */
  getConfig(): ModerationConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Statistics - Requirements 1.4
  // ============================================================================

  /**
   * Obtiene las estadísticas de moderación
   */
  getStats(): ModerationStats {
    return { 
      ...this.stats,
      rejectedByReason: { ...this.stats.rejectedByReason }
    };
  }

  /**
   * Reinicia las estadísticas de moderación
   */
  resetStats(): void {
    this.stats = { 
      ...DEFAULT_MODERATION_STATS,
      rejectedByReason: { ...DEFAULT_MODERATION_STATS.rejectedByReason }
    };
  }

  // ============================================================================
  // User State
  // ============================================================================

  /**
   * Obtiene el estado del voto de un usuario
   */
  getUserVote(userId: string): UserVoteState | undefined {
    const vote = this.userVotes.get(userId);
    return vote ? { ...vote } : undefined;
  }

  /**
   * Limpia todos los votos de usuarios
   */
  clearUserVotes(): void {
    this.userVotes.clear();
  }

  // ============================================================================
  // Presets - Requirements 1.5
  // ============================================================================

  /**
   * Guarda la configuración actual como un preset
   * @param name - Nombre del preset
   * @returns ID del preset creado
   */
  savePreset(name: string): string {
    const preset: ModerationPreset = {
      id: this.generatePresetId(),
      name,
      config: this.getConfig(),
      createdAt: Date.now(),
    };

    const presets = this.getAllPresets();
    presets.push(preset);
    this.saveAllPresets(presets);

    return preset.id;
  }

  /**
   * Carga un preset por su ID
   * @param id - ID del preset
   * @returns Configuración del preset o null si no existe
   */
  loadPreset(id: string): ModerationConfig | null {
    const presets = this.getAllPresets();
    const preset = presets.find(p => p.id === id);
    
    if (preset) {
      this.setConfig(preset.config);
      return this.getConfig();
    }
    
    return null;
  }

  /**
   * Elimina un preset por su ID
   * @param id - ID del preset
   * @returns true si se eliminó, false si no existía
   */
  deletePreset(id: string): boolean {
    const presets = this.getAllPresets();
    const initialLength = presets.length;
    const filteredPresets = presets.filter(p => p.id !== id);
    
    if (filteredPresets.length < initialLength) {
      this.saveAllPresets(filteredPresets);
      return true;
    }
    
    return false;
  }

  /**
   * Obtiene todos los presets guardados
   */
  getAllPresets(): ModerationPreset[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored) as ModerationPreset[];
        }
      }
    } catch {
      // Fall back to empty array
    }
    return [];
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Genera un ID único para un preset
   */
  private generatePresetId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Guarda todos los presets en localStorage
   */
  private saveAllPresets(presets: ModerationPreset[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
      }
    } catch {
      // Ignore errors in environments without localStorage
    }
  }
}
