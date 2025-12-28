/**
 * useAnalyticsService Hook
 * 
 * Hook de React para usar AnalyticsService con la arquitectura hexagonal.
 * Proporciona análisis de chat, métricas y configuración de IA desacoplada de la UI.
 * 
 * Mantiene API compatible con hooks/useAIAnalytics.ts
 * 
 * @module src/application/hooks/useAnalyticsService
 * @requirements 5.5, 5.6
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  AnalyticsService, 
  getAnalyticsService, 
  StoredMessage, 
  AnalyticsSession,
  AIConfig 
} from '../services/AnalyticsService';
import type { ChatMetrics } from '../../domain/entities/ChatMetrics';
import type { AIProviderConfig } from '../../domain/ports/IAnalyticsProvider';
import type { UserDifficulty } from '../../../components/mascot/types';

// Re-export types for convenience
export type { StoredMessage, AnalyticsSession, AIConfig, ChatMetrics };

/**
 * Poll summary for session tracking
 */
export interface PollSummary {
  question: string;
  options: { label: string; votes: number }[];
  totalVotes: number;
  winner?: string;
  timestamp: number;
}

/**
 * Return type for the useAnalyticsService hook
 */
export interface UseAnalyticsServiceReturn {
  // AI Config State
  config: AIConfig | null;
  currentSession: AnalyticsSession | null;
  showConfig: boolean;

  // Mascot State
  showMascot: boolean;
  userDifficulty: UserDifficulty | undefined;
  connectionAttempts: number;

  // Actions
  setConfig: (config: AIConfig) => void;
  toggleConfig: () => void;
  toggleMascot: () => void;
  setUserDifficulty: (difficulty: UserDifficulty | undefined) => void;
  incrementConnectionAttempts: () => void;
  resetConnectionAttempts: () => void;

  // Session Actions
  startSession: (channelName: string) => void;
  endSession: () => void;
  saveCurrentSession: () => void;
  saveSession: (session: AnalyticsSession) => void;
  addMessageToSession: (message: StoredMessage) => void;
  addPollResultToSession: (result: PollSummary) => void;

  // Analysis Actions
  analyzeChat: (messages: StoredMessage[]) => ChatMetrics;
  analyzeWithAI: (messages: StoredMessage[]) => Promise<ChatMetrics>;
  isAIConfigured: () => boolean;

  // Session History
  getSessions: () => AnalyticsSession[];
  getSessionsByDate: (date: string) => AnalyticsSession[];
  clearOldSessions: (keepDays?: number) => void;

  // Service instance
  service: AnalyticsService;
}

/**
 * Options for configuring the useAnalyticsService hook
 */
export interface UseAnalyticsServiceOptions {
  /** Initial visibility state for mascot (default: true) */
  initialMascotVisible?: boolean;
  /** Maximum messages to keep in session (default: 1000) */
  maxSessionMessages?: number;
}

const DEFAULT_OPTIONS: Required<UseAnalyticsServiceOptions> = {
  initialMascotVisible: true,
  maxSessionMessages: 1000,
};

/**
 * Hook para gestionar analytics de chat usando AnalyticsService
 * 
 * @example
 * ```tsx
 * const {
 *   config,
 *   currentSession,
 *   showMascot,
 *   setConfig,
 *   startSession,
 *   endSession,
 *   analyzeChat,
 * } = useAnalyticsService();
 * 
 * // Start session when connecting
 * useEffect(() => {
 *   if (connected) {
 *     startSession(channelName);
 *   }
 *   return () => endSession();
 * }, [connected, channelName]);
 * 
 * // Analyze chat periodically
 * const metrics = analyzeChat(messages);
 * ```
 */
export function useAnalyticsService(
  options?: UseAnalyticsServiceOptions
): UseAnalyticsServiceReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const serviceRef = useRef<AnalyticsService>(getAnalyticsService());

  // AI Config State
  const [config, setConfigState] = useState<AIConfig | null>(() => 
    serviceRef.current.getFullAIConfig()
  );
  const [showConfig, setShowConfig] = useState(false);

  // Session State
  const [currentSession, setCurrentSession] = useState<AnalyticsSession | null>(() =>
    serviceRef.current.getCurrentSession()
  );
  const sessionRef = useRef<AnalyticsSession | null>(currentSession);

  // Mascot State
  const [showMascot, setShowMascot] = useState(opts.initialMascotVisible);
  const [userDifficulty, setUserDifficultyState] = useState<UserDifficulty | undefined>(undefined);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Keep ref in sync with state for callbacks
  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);

  // Set config and persist
  const setConfig = useCallback((newConfig: AIConfig) => {
    serviceRef.current.setFullAIConfig(newConfig);
    setConfigState(newConfig);
  }, []);

  // Toggle config panel visibility
  const toggleConfig = useCallback(() => {
    setShowConfig((prev) => !prev);
  }, []);

  // Toggle mascot visibility
  const toggleMascot = useCallback(() => {
    setShowMascot((prev) => !prev);
  }, []);

  // Set user difficulty
  const setUserDifficulty = useCallback((difficulty: UserDifficulty | undefined) => {
    setUserDifficultyState(difficulty);
  }, []);

  // Connection attempts management
  const incrementConnectionAttempts = useCallback(() => {
    setConnectionAttempts((prev) => prev + 1);
  }, []);

  const resetConnectionAttempts = useCallback(() => {
    setConnectionAttempts(0);
  }, []);

  // Start a new stream session
  const startSession = useCallback((channelName: string) => {
    const session = serviceRef.current.startSession(channelName);
    setCurrentSession(session);
  }, []);

  // End the current session and save it
  const endSession = useCallback(() => {
    const finalSession = serviceRef.current.endSession();
    setCurrentSession(null);
  }, []);

  // Save the current session without ending it
  const saveCurrentSession = useCallback(() => {
    serviceRef.current.saveCurrentSession();
  }, []);

  // Save a specific session
  const saveSession = useCallback((session: AnalyticsSession) => {
    serviceRef.current.saveSession(session);
  }, []);

  // Add a message to the current session
  const addMessageToSession = useCallback((message: StoredMessage) => {
    serviceRef.current.addMessage(message);
    
    // Update local state
    setCurrentSession((prev) => {
      if (!prev) return null;
      const messages = [...prev.messages.slice(-(opts.maxSessionMessages - 1)), message];
      return { ...prev, messages };
    });
  }, [opts.maxSessionMessages]);

  // Add a poll result to the current session
  const addPollResultToSession = useCallback((result: PollSummary) => {
    setCurrentSession((prev) => {
      if (!prev) return null;
      // Store poll results in session (extend session type if needed)
      return prev;
    });
  }, []);

  // Analyze chat messages
  const analyzeChat = useCallback((messages: StoredMessage[]): ChatMetrics => {
    return serviceRef.current.analyzeChat(messages);
  }, []);

  // Analyze with AI
  const analyzeWithAI = useCallback(async (messages: StoredMessage[]): Promise<ChatMetrics> => {
    return serviceRef.current.analyzeWithAI(messages);
  }, []);

  // Check if AI is configured
  const isAIConfigured = useCallback((): boolean => {
    return serviceRef.current.isAIConfigured();
  }, []);

  // Session history
  const getSessions = useCallback((): AnalyticsSession[] => {
    return serviceRef.current.getSessions();
  }, []);

  const getSessionsByDate = useCallback((date: string): AnalyticsSession[] => {
    return serviceRef.current.getSessionsByDate(date);
  }, []);

  const clearOldSessions = useCallback((keepDays: number = 7): void => {
    serviceRef.current.clearOldSessions(keepDays);
  }, []);

  return {
    // AI Config State
    config,
    currentSession,
    showConfig,

    // Mascot State
    showMascot,
    userDifficulty,
    connectionAttempts,

    // Actions
    setConfig,
    toggleConfig,
    toggleMascot,
    setUserDifficulty,
    incrementConnectionAttempts,
    resetConnectionAttempts,

    // Session Actions
    startSession,
    endSession,
    saveCurrentSession,
    saveSession,
    addMessageToSession,
    addPollResultToSession,

    // Analysis Actions
    analyzeChat,
    analyzeWithAI,
    isAIConfigured,

    // Session History
    getSessions,
    getSessionsByDate,
    clearOldSessions,

    // Service instance
    service: serviceRef.current,
  };
}

export default useAnalyticsService;
