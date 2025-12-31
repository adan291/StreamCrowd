/**
 * PollService - Servicio de aplicación para gestión de encuestas
 * 
 * Este servicio orquesta la lógica de encuestas del dominio
 * con la sincronización de overlays y persistencia.
 */

import {
  Poll,
  PollOption,
  VoteRecord,
  PollResult,
  createPoll as domainCreatePoll,
  addVoteToPoll,
  changeVoteInPoll,
  stopPoll as domainStopPoll,
  getPollResult,
  findOptionByVote,
  isPollExpired,
  isPollAtMaxVotes,
} from '../../domain/entities/Poll';
import {
  ModerationConfig,
  VoteValidationResult,
  UserVoteState,
  DEFAULT_MODERATION_CONFIG,
  validateVote,
} from '../../domain/entities/Vote';
import type { IOverlaySync, PollOverlayData } from '../../domain/ports/IOverlaySync';
import type { IStorage } from '../../domain/ports/IStorage';
import { getSyncProvider, getStorageProvider } from '../../infrastructure/factories/ProviderFactory';

export interface PollServiceConfig {
  /** Sincronizar con overlay automáticamente */
  autoSync?: boolean;
  /** Guardar historial de encuestas */
  saveHistory?: boolean;
  /** Máximo de encuestas en historial */
  maxHistorySize?: number;
}

export interface CreatePollParams {
  title: string;
  question: string;
  options: Array<{
    label: string;
    color: string;
    icon?: string;
    image?: string;
    voteKey?: string;
  }>;
  maxVotes?: number;
  duration?: number;
  votePrefix?: string;
  voteMatchMode?: 'exact' | 'partial';
  moderationConfig?: ModerationConfig;
  /** Color de la barra de progreso */
  progressBarColor?: string;
  /** Color del indicador de límite */
  limitIndicatorColor?: string;
}

export interface ProcessVoteParams {
  oderId: string;
  username: string;
  message: string;
  isSubscriber?: boolean;
  isFollower?: boolean;
  accountAgeDays?: number;
}

export interface ProcessVoteResult extends VoteValidationResult {
  optionId?: number;
  optionLabel?: string;
}

type PollChangeCallback = (poll: Poll | null) => void;

export class PollService {
  private syncProvider: IOverlaySync;
  private storageProvider: IStorage;
  private config: Required<PollServiceConfig>;
  
  private currentPoll: Poll | null = null;
  private moderationConfig: ModerationConfig = DEFAULT_MODERATION_CONFIG;
  private userVoteStates = new Map<string, UserVoteState>();
  private voteHistory: VoteRecord[] = [];
  private pollHistory: Poll[] = [];
  
  private changeCallbacks = new Set<PollChangeCallback>();
  private syncThrottleTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSyncTime = 0;
  
  constructor(config: PollServiceConfig = {}) {
    this.syncProvider = getSyncProvider();
    this.storageProvider = getStorageProvider();
    this.config = {
      autoSync: config.autoSync ?? true,
      saveHistory: config.saveHistory ?? true,
      maxHistorySize: config.maxHistorySize ?? 50,
    };
    
    this.loadHistory();
  }
  
  // ============ Getters ============
  
  getCurrentPoll(): Poll | null {
    return this.currentPoll;
  }
  
  getModerationConfig(): ModerationConfig {
    return this.moderationConfig;
  }
  
  getVoteHistory(): VoteRecord[] {
    return [...this.voteHistory];
  }
  
  getPollHistory(): Poll[] {
    return [...this.pollHistory];
  }
  
  getUserVoteState(oderId: string): UserVoteState | undefined {
    return this.userVoteStates.get(oderId);
  }
  
  hasUserVoted(oderId: string): boolean {
    return this.userVoteStates.has(oderId);
  }
  
  // ============ Poll Lifecycle ============
  
  createPoll(params: CreatePollParams): Poll {
    // Reset state
    this.userVoteStates.clear();
    this.voteHistory = [];
    
    // Set moderation config
    if (params.moderationConfig) {
      this.moderationConfig = params.moderationConfig;
    }
    
    // Create poll using domain function
    this.currentPoll = domainCreatePoll({
      title: params.title,
      question: params.question,
      options: params.options,
      maxVotes: params.maxVotes,
      duration: params.duration,
      votePrefix: params.votePrefix,
      voteMatchMode: params.voteMatchMode,
    });
    
    this.notifyChange();
    this.syncToOverlay();
    
    return this.currentPoll;
  }
  
  stopPoll(): PollResult | null {
    if (!this.currentPoll) return null;
    
    this.currentPoll = domainStopPoll(this.currentPoll);
    const result = getPollResult(this.currentPoll);
    
    // Save to history
    if (this.config.saveHistory) {
      this.pollHistory = [this.currentPoll, ...this.pollHistory].slice(0, this.config.maxHistorySize);
      this.saveHistory();
    }
    
    this.notifyChange();
    this.syncToOverlay();
    
    return result;
  }
  
  resetPoll(): void {
    this.currentPoll = null;
    this.userVoteStates.clear();
    this.voteHistory = [];
    
    this.notifyChange();
    this.syncProvider.clear('poll').catch(() => {});
  }
  
  // ============ Vote Processing ============
  
  processVote(params: ProcessVoteParams): ProcessVoteResult {
    if (!this.currentPoll || !this.currentPoll.isActive) {
      return { isValid: false, weight: 0, isVoteChange: false };
    }
    
    // Check auto-stop conditions
    if (isPollExpired(this.currentPoll) || isPollAtMaxVotes(this.currentPoll)) {
      this.stopPoll();
      return { isValid: false, weight: 0, isVoteChange: false };
    }
    
    // Find option from message
    const option = findOptionByVote(this.currentPoll, params.message);
    if (!option) {
      return { isValid: false, weight: 0, isVoteChange: false };
    }
    
    // Get existing vote state
    const existingState = this.userVoteStates.get(params.oderId);
    const hasVoted = existingState !== undefined;
    
    // Validate vote
    const validOptionIds = this.currentPoll.options.map(o => o.id);
    const validationResult = validateVote(
      {
        username: params.username,
        oderId: params.oderId,
        optionId: option.id,
        accountAgeDays: params.accountAgeDays ?? 365,
        hasVoted,
        lastVoteTime: existingState?.timestamp ?? 0,
        currentTime: Date.now(),
        isSubscriber: params.isSubscriber ?? false,
        isFollower: params.isFollower ?? false,
      },
      this.moderationConfig,
      validOptionIds,
      existingState
    );
    
    if (!validationResult.isValid) {
      return {
        ...validationResult,
        optionId: option.id,
        optionLabel: option.label,
      };
    }
    
    // Apply vote
    if (validationResult.isVoteChange && validationResult.previousOptionId !== undefined) {
      // Change vote
      this.currentPoll = changeVoteInPoll(
        this.currentPoll,
        validationResult.previousOptionId,
        option.id,
        validationResult.previousWeight ?? 1,
        validationResult.weight
      );
      
      // Update vote history
      this.voteHistory = this.voteHistory.map(v =>
        v.oderId === params.oderId
          ? { ...v, optionId: option.id, timestamp: Date.now(), weight: validationResult.weight }
          : v
      );
    } else {
      // New vote
      this.currentPoll = addVoteToPoll(this.currentPoll, option.id, validationResult.weight);
      
      // Add to vote history
      this.voteHistory.push({
        oderId: params.oderId,
        username: params.username,
        optionId: option.id,
        timestamp: Date.now(),
        weight: validationResult.weight,
      });
    }
    
    // Update user vote state
    this.userVoteStates.set(params.oderId, {
      optionId: option.id,
      timestamp: Date.now(),
      weight: validationResult.weight,
      canChangeAt: this.moderationConfig.voteChangeEnabled
        ? Date.now() + (this.moderationConfig.voteChangeCooldownSeconds * 1000)
        : undefined,
    });
    
    this.notifyChange();
    this.syncToOverlayThrottled();
    
    return {
      ...validationResult,
      optionId: option.id,
      optionLabel: option.label,
    };
  }
  
  // ============ Moderation ============
  
  setModerationConfig(config: ModerationConfig): void {
    this.moderationConfig = config;
  }
  
  // ============ Subscriptions ============
  
  onChange(callback: PollChangeCallback): () => void {
    this.changeCallbacks.add(callback);
    // Immediately call with current state
    callback(this.currentPoll);
    return () => this.changeCallbacks.delete(callback);
  }
  
  // ============ Private Methods ============
  
  private notifyChange(): void {
    this.changeCallbacks.forEach(cb => cb(this.currentPoll));
  }
  
  private syncToOverlay(): void {
    if (!this.config.autoSync) return;
    
    if (this.currentPoll) {
      const data: PollOverlayData = {
        question: this.currentPoll.question,
        options: this.currentPoll.options.map(o => ({
          id: o.id,
          label: o.label,
          votes: o.votes,
          color: o.color,
        })),
        totalVotes: this.currentPoll.totalVotes,
        isActive: this.currentPoll.isActive,
        showResults: !this.currentPoll.isActive,
      };
      this.syncProvider.publish('poll', data).catch(() => {});
    } else {
      this.syncProvider.clear('poll').catch(() => {});
    }
    
    this.lastSyncTime = Date.now();
  }
  
  private syncToOverlayThrottled(): void {
    if (!this.config.autoSync) return;
    
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    const throttleMs = 500;
    
    if (this.syncThrottleTimeout) {
      clearTimeout(this.syncThrottleTimeout);
    }
    
    if (timeSinceLastSync >= throttleMs) {
      this.syncToOverlay();
    } else {
      this.syncThrottleTimeout = setTimeout(
        () => this.syncToOverlay(),
        throttleMs - timeSinceLastSync
      );
    }
  }
  
  private async loadHistory(): Promise<void> {
    try {
      const history = await this.storageProvider.get<Poll[]>('poll_history');
      if (history) {
        this.pollHistory = history;
      }
    } catch {
      // Ignore load errors
    }
  }
  
  private async saveHistory(): Promise<void> {
    try {
      await this.storageProvider.set('poll_history', this.pollHistory);
    } catch {
      // Ignore save errors
    }
  }
  
  dispose(): void {
    if (this.syncThrottleTimeout) {
      clearTimeout(this.syncThrottleTimeout);
    }
    this.changeCallbacks.clear();
  }
}

// Singleton instance
let defaultService: PollService | null = null;

export function getPollService(config?: PollServiceConfig): PollService {
  if (!defaultService) {
    defaultService = new PollService(config);
  }
  return defaultService;
}

export function resetPollService(): void {
  if (defaultService) {
    defaultService.dispose();
    defaultService = null;
  }
}
