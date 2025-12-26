/**
 * usePollService Hook
 * 
 * Hook de React para usar PollService con la arquitectura hexagonal.
 * Proporciona gestión de encuestas desacoplada del proveedor de chat.
 * 
 * @module src/application/hooks/usePollService
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PollService, getPollService, CreatePollParams, ProcessVoteParams, ProcessVoteResult } from '../services/PollService';
import type { Poll, PollOption, VoteRecord, PollResult } from '../../domain/entities/Poll';
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
  /** Servicio subyacente */
  service: PollService;
}

export interface UsePollServiceOptions {
  /** Callback cuando cambia la encuesta */
  onPollChange?: (poll: Poll | null) => void;
  /** Callback cuando se registra un voto válido */
  onVote?: (result: ProcessVoteResult) => void;
}

/**
 * Hook para gestionar encuestas usando PollService
 * 
 * @example
 * ```tsx
 * const { currentPoll, createPoll, stopPoll, processMessage } = usePollService();
 * 
 * // Crear encuesta
 * createPoll({
 *   title: 'Game Poll',
 *   question: '¿Qué juego?',
 *   options: [
 *     { label: 'Minecraft', color: '#4ade80' },
 *     { label: 'Fortnite', color: '#a970ff' },
 *   ],
 * });
 * 
 * // Procesar mensajes del chat
 * chatMessages.forEach(msg => processMessage(msg));
 * ```
 */
export function usePollService(options: UsePollServiceOptions = {}): UsePollServiceReturn {
  const { onPollChange, onVote } = options;
  
  const service = getPollService();
  
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(service.getCurrentPoll());
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>(service.getVoteHistory());
  const [pastPolls, setPastPolls] = useState<Poll[]>(service.getPollHistory());
  
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
    return service.createPoll(params);
  }, [service]);
  
  const stopPoll = useCallback((): PollResult | null => {
    return service.stopPoll();
  }, [service]);
  
  const resetPoll = useCallback(() => {
    service.resetPoll();
  }, [service]);
  
  const processVote = useCallback((params: ProcessVoteParams): ProcessVoteResult => {
    const result = service.processVote(params);
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
    service,
  };
}

export default usePollService;
