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

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PollService, getPollService, CreatePollParams, ProcessVoteParams, ProcessVoteResult } from '../services/PollService';
import { ModerationService } from '../services/ModerationService';
import type { Poll, PollOption, VoteRecord, PollResult } from '../../domain/entities/Poll';
import type { ModerationConfig, ModerationStats } from '../../domain/entities/ModerationConfig';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

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
  stopPoll: () => PollResult | null;
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
}

export interface UsePollServiceOptions {
  /** Callback cuando cambia la encuesta */
  onPollChange?: (poll: Poll | null) => void;
  /** Callback cuando se registra un voto válido */
  onVote?: (result: ProcessVoteResult) => void;
  /** Configuración inicial de moderación */
  initialModerationConfig?: ModerationConfig;
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
  
  // Suscribirse a cambios
  useEffect(() => {
    const unsubscribe = service.onChange((poll) => {
      setCurrentPoll(poll);
      setVoteHistory(service.getVoteHistory());
      setPastPolls(service.getPollHistory());
      onPollChange?.(poll);
    });
    
    return unsubscribe;
  }, [service, onPollChange]);
  
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
  
  const stopPoll = useCallback((): PollResult | null => {
    return service.stopPoll();
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
  };
}

export default usePollService;
