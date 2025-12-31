/**
 * usePollService Hook
 * 
 * Hook de React para usar PollService con la arquitectura hexagonal.
 * Proporciona gestión de encuestas desacoplada del proveedor de chat.
 * Integra con ModerationService para validación avanzada de votos.
 * 
 * @module src/application/hooks/usePollService
 * @requirements 5.1, 5.6
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type React from 'react';
import { PollService, getPollService, CreatePollParams, ProcessVoteParams, ProcessVoteResult } from '../services/PollService';
import { ModerationService } from '../services/ModerationService';
import type { Poll, PollOption, VoteRecord, PollResult } from '../../domain/entities/Poll';
import type { ModerationConfig, ModerationStats } from '../../domain/entities/ModerationConfig';
import type { ChatMessage } from '../../domain/ports/IChatProvider';
import { pollSync } from '../../infrastructure/sync/FirebaseSync';

// Debug logging for poll state
const DEBUG_POLL = false;
const logPoll = (msg: string, data?: any) => {
  if (DEBUG_POLL) console.log(`[PollService] ${msg}`, data || '');
};

export interface UsePollServiceReturn {
  /** Encuesta actual */
  currentPoll: Poll | null;
  /** Historial de votos de la sesión */
  voteHistory: VoteRecord[];
  /** Encuestas pasadas */
  pastPolls: Poll[];
  /** Mapa de usuario -> opción votada */
  userVoteMap: Map<string, number>;
  /** Crear una nueva encuesta */
  createPoll: (params: CreatePollParams) => Poll;
  /** Detener la encuesta actual */
  stopPoll: (auto?: boolean) => PollResult | null;
  /** Resetear todo el estado */
  resetPoll: () => void;
  /** Procesar un voto desde mensaje del chat */
  processVote: (params: ProcessVoteParams) => ProcessVoteResult;
  /** Procesar un mensaje del chat (extrae voto si aplica) */
  processMessage: (message: ChatMessage) => ProcessVoteResult;
  /** Verificar si un usuario ya votó */
  hasUserVoted: (oderId: string) => boolean;
  /** Configuración de moderación actual */
  moderationConfig: ModerationConfig;
  /** Estadísticas de moderación */
  moderationStats: ModerationStats;
  /** Establecer configuración de moderación */
  setModerationConfig: (config: ModerationConfig) => void;
  /** Servicio subyacente */
  service: PollService;
  /** Actualizar encuesta actual directamente */
  setCurrentPoll: React.Dispatch<React.SetStateAction<Poll | null>>;
  /** Añadir un voto directamente */
  addVote: (vote: VoteRecord, weight?: number) => void;
  /** Actualizar un voto existente */
  updateVote: (userId: string, previousOptionId: number, newOptionId: number, previousWeight: number, newWeight: number) => void;
}

export interface UsePollServiceOptions {
  /** Callback cuando cambia la encuesta */
  onPollChange?: (poll: Poll | null) => void;
  /** Callback cuando se registra un voto válido */
  onVote?: (result: ProcessVoteResult) => void;
  /** Configuración inicial de moderación */
  initialModerationConfig?: ModerationConfig;
  /** Sincronizar con localStorage */
  syncToStorage?: boolean;
  /** Modo overlay (solo lectura) */
  isOverlayMode?: boolean;
}

/**
 * Hook para gestionar encuestas usando PollService
 * Integra con ModerationService para validación de votos
 * 
 * @example
 * ```tsx
 * const { currentPoll, createPoll, stopPoll, processMessage, moderationConfig } = usePollService();
 * 
 * // Crear encuesta con moderación
 * createPoll({
 *   title: 'Game Poll',
 *   question: '¿Qué juego?',
 *   options: [
 *     { label: 'Minecraft', color: '#4ade80' },
 *     { label: 'Fortnite', color: '#a970ff' },
 *   ],
 *   moderationConfig: moderationConfig,
 * });
 * 
 * // Procesar mensajes del chat
 * chatMessages.forEach(msg => processMessage(msg));
 * ```
 */
export function usePollService(options: UsePollServiceOptions = {}): UsePollServiceReturn {
  const { onPollChange, onVote, initialModerationConfig } = options;
  
  const service = getPollService();
  
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(service.getCurrentPoll());
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>(service.getVoteHistory());
  const [pastPolls, setPastPolls] = useState<Poll[]>(service.getPollHistory());
  const [moderationConfig, setModerationConfigState] = useState<ModerationConfig>(
    initialModerationConfig || service.getModerationConfig()
  );
  const [moderationStats, setModerationStats] = useState<ModerationStats>({
    totalAttempts: 0,
    acceptedVotes: 0,
    rejectedByReason: {
      ACCOUNT_TOO_YOUNG: 0,
      COOLDOWN_ACTIVE: 0,
      VOTE_CHANGE_DISABLED: 0,
      INVALID_OPTION: 0,
      NOT_WHITELISTED: 0,
      BLACKLISTED: 0,
    },
    acceptanceRate: 0,
  });
  
  // Ref to always have access to the latest poll state (avoids stale closure issues)
  const currentPollRef = useRef<Poll | null>(currentPoll);
  // Flag to ignore onChange callback when we're updating state ourselves
  const ignoreOnChangeRef = useRef(false);
  
  useEffect(() => {
    currentPollRef.current = currentPoll;
    logPoll('currentPollRef updated', { 
      question: currentPoll?.question, 
      totalVotes: currentPoll?.totalVotes,
      options: currentPoll?.options.map(o => ({ id: o.id, label: o.label, votes: o.votes }))
    });
  }, [currentPoll]);
  
  // Suscribirse a cambios
  useEffect(() => {
    const unsubscribe = service.onChange((poll) => {
      // Ignore onChange if we're updating state ourselves (e.g., during stopPoll)
      if (ignoreOnChangeRef.current) {
        logPoll('onChange ignored (ignoreOnChangeRef is true)');
        return;
      }
      setCurrentPoll(poll);
      setVoteHistory(service.getVoteHistory());
      setPastPolls(service.getPollHistory());
      onPollChange?.(poll);
    });
    
    return unsubscribe;
  }, [service, onPollChange]);

  // Sync poll state to Firebase for overlay (only in non-overlay mode)
  const isOverlayMode = options.isOverlayMode;
  const lastSyncRef = useRef<string>('');
  
  useEffect(() => {
    if (isOverlayMode) return; // Don't sync from overlay mode
    
    // Create a key to detect actual changes
    const syncKey = currentPoll 
      ? `${currentPoll.question}-${currentPoll.totalVotes}-${currentPoll.isActive}-${currentPoll.options.map(o => `${o.id}:${o.votes}`).join(',')}`
      : 'null';
    
    // Only sync if state actually changed
    if (syncKey === lastSyncRef.current) return;
    lastSyncRef.current = syncKey;
    
    if (currentPoll) {
      // Sync to Firebase for overlay
      pollSync.update({
        question: currentPoll.question,
        options: currentPoll.options.map(opt => ({
          text: opt.label,
          votes: opt.votes,
          color: opt.color,
        })),
        totalVotes: currentPoll.totalVotes,
        isActive: currentPoll.isActive,
      }).catch(err => console.error('[PollService] Firebase sync error:', err));
    } else {
      // Clear poll in Firebase
      pollSync.update(null).catch(err => console.error('[PollService] Firebase clear error:', err));
    }
  }, [currentPoll, isOverlayMode]);
  
  // Mapa de usuario -> opción votada
  const userVoteMap = useMemo(() => {
    const map = new Map<string, number>();
    voteHistory.forEach(v => map.set(v.oderId, v.optionId));
    return map;
  }, [voteHistory]);
  
  const createPoll = useCallback((params: CreatePollParams): Poll => {
    // Include moderation config in poll creation
    return service.createPoll({
      ...params,
      moderationConfig: params.moderationConfig || moderationConfig,
    });
  }, [service, moderationConfig]);
  
  const stopPoll = useCallback((auto?: boolean): PollResult | null => {
    // Use ref to get the latest poll state (avoids stale closure issues)
    const poll = currentPollRef.current;
    
    logPoll('stopPoll called', { 
      auto, 
      hasPoll: !!poll,
      question: poll?.question,
      totalVotes: poll?.totalVotes,
      options: poll?.options.map(o => ({ id: o.id, label: o.label, votes: o.votes }))
    });
    
    if (!poll) {
      logPoll('stopPoll: no poll to stop');
      return null;
    }
    
    const stoppedPoll: Poll = {
      ...poll,
      isActive: false,
      endTime: Date.now(),
    };
    
    // Calculate result from local state
    const winner = stoppedPoll.options.reduce((a, b) => a.votes > b.votes ? a : b);
    const totalVotes = stoppedPoll.options.reduce((sum, o) => sum + o.votes, 0);
    
    logPoll('stopPoll result', { 
      winner: winner.label, 
      winnerVotes: winner.votes, 
      totalVotes,
      allOptions: stoppedPoll.options.map(o => ({ label: o.label, votes: o.votes }))
    });
    
    const result: PollResult = {
      poll: stoppedPoll,
      winner,
      totalVotes,
      duration: stoppedPoll.endTime! - stoppedPoll.startTime,
      votesByOption: stoppedPoll.options.map(o => ({
        option: o,
        percentage: totalVotes > 0 ? (o.votes / totalVotes) * 100 : 0,
      })),
    };
    
    // Update local state and ref
    setCurrentPoll(stoppedPoll);
    currentPollRef.current = stoppedPoll;
    
    // Ignore onChange callback from service.stopPoll() to prevent overwriting our state
    ignoreOnChangeRef.current = true;
    service.stopPoll();
    // Reset the flag after a short delay to allow future onChange callbacks
    setTimeout(() => {
      ignoreOnChangeRef.current = false;
    }, 100);
    
    return result;
  }, [service]);
  
  const resetPoll = useCallback(() => {
    service.resetPoll();
    // Reset moderation stats
    setModerationStats({
      totalAttempts: 0,
      acceptedVotes: 0,
      rejectedByReason: {
        ACCOUNT_TOO_YOUNG: 0,
        COOLDOWN_ACTIVE: 0,
        VOTE_CHANGE_DISABLED: 0,
        INVALID_OPTION: 0,
        NOT_WHITELISTED: 0,
        BLACKLISTED: 0,
      },
      acceptanceRate: 0,
    });
  }, [service]);
  
  const processVote = useCallback((params: ProcessVoteParams): ProcessVoteResult => {
    const result = service.processVote(params);
    
    // Update moderation stats
    setModerationStats(prev => {
      const newStats = { ...prev };
      newStats.totalAttempts++;
      
      if (result.isValid) {
        newStats.acceptedVotes++;
      } else if (result.rejectionReason) {
        newStats.rejectedByReason = {
          ...newStats.rejectedByReason,
          [result.rejectionReason]: (newStats.rejectedByReason[result.rejectionReason] || 0) + 1,
        };
      }
      
      newStats.acceptanceRate = newStats.totalAttempts > 0
        ? (newStats.acceptedVotes / newStats.totalAttempts) * 100
        : 0;
      
      return newStats;
    });
    
    if (result.isValid) {
      onVote?.(result);
    }
    return result;
  }, [service, onVote]);
  
  const processMessage = useCallback((message: ChatMessage): ProcessVoteResult => {
    return processVote({
      oderId: message.userId || message.username,
      username: message.displayName || message.username,
      message: message.message,
      isSubscriber: message.isSubscriber,
    });
  }, [processVote]);
  
  const hasUserVoted = useCallback((oderId: string): boolean => {
    return service.hasUserVoted(oderId);
  }, [service]);
  
  const setModerationConfig = useCallback((config: ModerationConfig): void => {
    service.setModerationConfig(config);
    setModerationConfigState(config);
  }, [service]);

  // Add vote directly (for external vote processing)
  const addVote = useCallback((vote: VoteRecord, weight: number = 1): void => {
    logPoll('addVote called', { optionId: vote.optionId, username: vote.username, weight });
    
    setCurrentPoll(prev => {
      if (!prev || !prev.isActive) {
        logPoll('addVote: poll not active or null', { hasPrev: !!prev, isActive: prev?.isActive });
        return prev;
      }
      
      const updatedOptions = prev.options.map(opt =>
        opt.id === vote.optionId
          ? { ...opt, votes: opt.votes + weight }
          : opt
      );
      
      const newPoll = {
        ...prev,
        options: updatedOptions,
        totalVotes: prev.totalVotes + weight,
      };
      
      logPoll('addVote: updated poll', { 
        totalVotes: newPoll.totalVotes,
        options: newPoll.options.map(o => ({ id: o.id, label: o.label, votes: o.votes }))
      });
      
      // Update ref synchronously to avoid race conditions
      currentPollRef.current = newPoll;
      
      return newPoll;
    });
    
    setVoteHistory(prev => [...prev, { ...vote, weight }]);
  }, []);

  // Update existing vote (for vote changes)
  const updateVote = useCallback((
    userId: string,
    previousOptionId: number,
    newOptionId: number,
    previousWeight: number,
    newWeight: number
  ): void => {
    logPoll('updateVote called', { userId, previousOptionId, newOptionId, previousWeight, newWeight });
    
    setCurrentPoll(prev => {
      if (!prev || !prev.isActive) return prev;
      
      const updatedOptions = prev.options.map(opt => {
        if (opt.id === previousOptionId) {
          return { ...opt, votes: Math.max(0, opt.votes - previousWeight) };
        }
        if (opt.id === newOptionId) {
          return { ...opt, votes: opt.votes + newWeight };
        }
        return opt;
      });
      
      const totalDiff = newWeight - previousWeight;
      
      const newPoll = {
        ...prev,
        options: updatedOptions,
        totalVotes: prev.totalVotes + totalDiff,
      };
      
      // Update ref synchronously to avoid race conditions
      currentPollRef.current = newPoll;
      
      logPoll('updateVote: updated poll', { 
        totalVotes: newPoll.totalVotes,
        options: newPoll.options.map(o => ({ id: o.id, label: o.label, votes: o.votes }))
      });
      
      return newPoll;
    });
    
    setVoteHistory(prev => prev.map(v =>
      v.oderId === userId || v.userId === userId
        ? { ...v, optionId: newOptionId, timestamp: Date.now(), weight: newWeight }
        : v
    ));
  }, []);
  
  return {
    currentPoll,
    voteHistory,
    pastPolls,
    userVoteMap,
    createPoll,
    stopPoll,
    resetPoll,
    processVote,
    processMessage,
    hasUserVoted,
    moderationConfig,
    moderationStats,
    setModerationConfig,
    service,
    setCurrentPoll,
    addVote,
    updateVote,
  };
}

export default usePollService;
