/**
 * useModerationService Hook
 * 
 * Hook de React para usar ModerationService con la arquitectura hexagonal.
 * Proporciona gestión de moderación de votos desacoplada de la UI.
 * 
 * Mantiene API compatible con hooks/useModeration.ts
 * 
 * @module src/application/hooks/useModerationService
 * @requirements 5.2, 5.6
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ModerationService, VoteInput, UserVoteState, ModerationPreset } from '../services/ModerationService';
import type { 
  ModerationConfig, 
  ModerationResult, 
  ModerationStats, 
  RejectionReason 
} from '../../domain/entities/ModerationConfig';
import { DEFAULT_MODERATION_CONFIG, DEFAULT_MODERATION_STATS } from '../../domain/entities/ModerationConfig';

/**
 * Entrada de log de moderación
 */
export interface ModerationLogEntry {
  id: string;
  timestamp: number;
  username: string;
  oderId: string;
  action: 'ACCEPTED' | 'REJECTED' | 'VOTE_CHANGED';
  rejectionReason?: RejectionReason;
  optionId: number;
  weight: number;
}

/**
 * Contexto para procesar un voto
 */
export interface VoteContext {
  userId: string;
  username: string;
  optionId: number;
  isSubscriber: boolean;
  isFollower: boolean;
  accountAgeDays?: number;
}

/**
 * Resultado de procesar un voto
 */
export interface ProcessVoteResult extends ModerationResult {
  isVoteChange: boolean;
  previousOptionId?: number;
  previousWeight?: number;
}

/**
 * Retorno del hook useModerationService
 */
export interface UseModerationServiceReturn {
  // State
  config: ModerationConfig;
  stats: ModerationStats;
  log: ModerationLogEntry[];
  userVoteStates: Map<string, UserVoteState>;
  userWeights: Map<string, number>;

  // Actions
  setConfig: (config: ModerationConfig) => void;
  processVote: (context: VoteContext, validOptionIds: number[]) => ProcessVoteResult;
  reset: () => void;
  logEntry: (entry: ModerationLogEntry) => void;
  
  // Preset management
  savePreset: (name: string) => string;
  loadPreset: (id: string) => ModerationConfig | null;
  deletePreset: (id: string) => boolean;
  getAllPresets: () => ModerationPreset[];
  
  // Direct setters for advanced use cases
  setStats: React.Dispatch<React.SetStateAction<ModerationStats>>;
  setLog: React.Dispatch<React.SetStateAction<ModerationLogEntry[]>>;
  setUserVoteStates: React.Dispatch<React.SetStateAction<Map<string, UserVoteState>>>;
  setUserWeights: React.Dispatch<React.SetStateAction<Map<string, number>>>;
}

/**
 * Genera un ID único para una entrada de log
 */
const generateLogId = (): string => {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Crea una entrada de log de moderación
 */
const createLogEntry = (
  username: string,
  oderId: string,
  action: 'ACCEPTED' | 'REJECTED' | 'VOTE_CHANGED',
  rejectionReason: RejectionReason | undefined,
  optionId: number,
  weight: number
): ModerationLogEntry => ({
  id: generateLogId(),
  timestamp: Date.now(),
  username,
  oderId,
  action,
  rejectionReason,
  optionId,
  weight,
});

// Singleton service instance
let moderationServiceInstance: ModerationService | null = null;

const getModerationService = (): ModerationService => {
  if (!moderationServiceInstance) {
    moderationServiceInstance = new ModerationService();
  }
  return moderationServiceInstance;
};

/**
 * Hook para gestionar moderación de votos usando ModerationService
 * 
 * @example
 * ```tsx
 * const { config, stats, processVote, reset } = useModerationService();
 * 
 * // Procesar un voto
 * const result = processVote({
 *   userId: 'user123',
 *   username: 'viewer',
 *   optionId: 1,
 *   isSubscriber: true,
 *   isFollower: false,
 * }, [1, 2, 3]);
 * 
 * if (result.isValid) {
 *   // Voto aceptado con peso: result.weight
 * } else {
 *   // Voto rechazado: result.rejectionReason
 * }
 * ```
 */
export function useModerationService(): UseModerationServiceReturn {
  const serviceRef = useRef<ModerationService>(getModerationService());
  
  // Core moderation state
  const [config, setConfigState] = useState<ModerationConfig>(() => serviceRef.current.getConfig());
  const [stats, setStats] = useState<ModerationStats>(() => serviceRef.current.getStats());
  const [log, setLog] = useState<ModerationLogEntry[]>([]);
  const [userVoteStates, setUserVoteStates] = useState<Map<string, UserVoteState>>(new Map());
  const [userWeights, setUserWeights] = useState<Map<string, number>>(new Map());

  // Refs for callbacks to avoid stale closures
  const configRef = useRef<ModerationConfig>(config);
  const userVoteStatesRef = useRef<Map<string, UserVoteState>>(new Map());
  const userWeightsRef = useRef<Map<string, number>>(new Map());

  // Sync refs with state
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    userVoteStatesRef.current = userVoteStates;
  }, [userVoteStates]);

  useEffect(() => {
    userWeightsRef.current = userWeights;
  }, [userWeights]);

  /**
   * Set the moderation configuration
   */
  const setConfig = useCallback((newConfig: ModerationConfig) => {
    serviceRef.current.setConfig(newConfig);
    setConfigState(newConfig);
    configRef.current = newConfig;
  }, []);

  /**
   * Add a log entry to the moderation log
   */
  const logEntry = useCallback((entry: ModerationLogEntry) => {
    setLog(prev => [...prev, entry]);
  }, []);

  /**
   * Process a vote through moderation validation
   */
  const processVote = useCallback((
    context: VoteContext,
    validOptionIds: number[]
  ): ProcessVoteResult => {
    const { userId, username, optionId, isSubscriber, isFollower, accountAgeDays = 365 } = context;

    // Convert context to VoteInput
    const input: VoteInput = {
      userId,
      username,
      optionId,
      isSubscriber,
      isFollower,
      accountAgeDays,
    };

    // Process through service
    const result = serviceRef.current.processVote(input, validOptionIds);

    // Update stats from service
    setStats(serviceRef.current.getStats());

    // Update user vote states
    const userVote = serviceRef.current.getUserVote(userId);
    if (userVote) {
      userVoteStatesRef.current.set(userId, userVote);
      setUserVoteStates(new Map(userVoteStatesRef.current));
      
      // Update user weights
      userWeightsRef.current.set(userId, userVote.weight);
      setUserWeights(new Map(userWeightsRef.current));
    }

    // Create log entry
    let action: 'ACCEPTED' | 'REJECTED' | 'VOTE_CHANGED';
    if (!result.isValid) {
      action = 'REJECTED';
    } else if (result.isVoteChange) {
      action = 'VOTE_CHANGED';
    } else {
      action = 'ACCEPTED';
    }

    const entry = createLogEntry(
      username,
      userId,
      action,
      result.rejectionReason,
      optionId,
      result.weight
    );
    setLog(prev => [...prev, entry]);

    return {
      ...result,
      isVoteChange: result.isVoteChange || false,
    };
  }, []);

  /**
   * Reset all moderation state to defaults
   */
  const reset = useCallback(() => {
    serviceRef.current.resetStats();
    serviceRef.current.clearUserVotes();
    
    setStats(serviceRef.current.getStats());
    setLog([]);
    setUserVoteStates(new Map());
    userVoteStatesRef.current = new Map();
    setUserWeights(new Map());
    userWeightsRef.current = new Map();
  }, []);

  /**
   * Save current config as a preset
   */
  const savePreset = useCallback((name: string): string => {
    return serviceRef.current.savePreset(name);
  }, []);

  /**
   * Load a preset by ID
   */
  const loadPreset = useCallback((id: string): ModerationConfig | null => {
    const loadedConfig = serviceRef.current.loadPreset(id);
    if (loadedConfig) {
      setConfigState(loadedConfig);
      configRef.current = loadedConfig;
    }
    return loadedConfig;
  }, []);

  /**
   * Delete a preset by ID
   */
  const deletePreset = useCallback((id: string): boolean => {
    return serviceRef.current.deletePreset(id);
  }, []);

  /**
   * Get all saved presets
   */
  const getAllPresets = useCallback((): ModerationPreset[] => {
    return serviceRef.current.getAllPresets();
  }, []);

  return {
    // State
    config,
    stats,
    log,
    userVoteStates,
    userWeights,

    // Actions
    setConfig,
    processVote,
    reset,
    logEntry,

    // Preset management
    savePreset,
    loadPreset,
    deletePreset,
    getAllPresets,

    // Direct setters
    setStats,
    setLog,
    setUserVoteStates,
    setUserWeights,
  };
}

export default useModerationService;
