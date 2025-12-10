import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  AIConfig,
  StreamSession,
  StoredMessage,
  PollSummary,
  loadAIConfig,
  saveAIConfig,
  createSession,
  saveSession,
} from '../services/aiAnalyticsService';
import type { UserDifficulty } from '../components/mascot/types';

/**
 * Return type for the useAIAnalytics hook
 */
export interface UseAIAnalyticsReturn {
  // AI Config State
  config: AIConfig | null;
  currentSession: StreamSession | null;
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
  addMessageToSession: (message: StoredMessage) => void;
  addPollResultToSession: (result: PollSummary) => void;
}

/**
 * Options for configuring the useAIAnalytics hook
 */
export interface UseAIAnalyticsOptions {
  /** Initial visibility state for mascot (default: true) */
  initialMascotVisible?: boolean;
  /** Maximum messages to keep in session (default: 1000) */
  maxSessionMessages?: number;
}

const DEFAULT_OPTIONS: Required<UseAIAnalyticsOptions> = {
  initialMascotVisible: true,
  maxSessionMessages: 1000,
};

/**
 * Hook for managing AI analytics and mascot state
 *
 * Features:
 * - AI configuration persistence via localStorage
 * - Stream session lifecycle management
 * - Mascot visibility and difficulty tracking
 * - Connection attempt tracking
 *
 * @param options - Optional configuration
 * @returns AI analytics state and actions
 *
 * @example
 * const {
 *   config,
 *   currentSession,
 *   showMascot,
 *   setConfig,
 *   startSession,
 *   endSession,
 * } = useAIAnalytics();
 */
export function useAIAnalytics(
  options?: UseAIAnalyticsOptions
): UseAIAnalyticsReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // AI Config State - persisted to localStorage
  const [config, setConfigState] = useState<AIConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Session State
  const [currentSession, setCurrentSession] = useState<StreamSession | null>(null);
  const sessionRef = useRef<StreamSession | null>(null);

  // Mascot State
  const [showMascot, setShowMascot] = useState(opts.initialMascotVisible);
  const [userDifficulty, setUserDifficultyState] = useState<UserDifficulty | undefined>(undefined);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Keep ref in sync with state for callbacks
  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);

  // Load AI config on mount
  useEffect(() => {
    const savedConfig = loadAIConfig();
    if (savedConfig) {
      setConfigState(savedConfig);
    }
  }, []);

  // Set config and persist to localStorage
  const setConfig = useCallback((newConfig: AIConfig) => {
    setConfigState(newConfig);
    saveAIConfig(newConfig);
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
    const session = createSession(channelName);
    setCurrentSession(session);
  }, []);

  // End the current session and save it
  const endSession = useCallback(() => {
    if (sessionRef.current) {
      const finalSession: StreamSession = {
        ...sessionRef.current,
        endTime: Date.now(),
      };
      saveSession(finalSession);
      setCurrentSession(null);
    }
  }, []);

  // Add a message to the current session
  const addMessageToSession = useCallback((message: StoredMessage) => {
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
      return {
        ...prev,
        pollResults: [...(prev.pollResults || []), result],
      };
    });
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
    addMessageToSession,
    addPollResultToSession,
  };
}

export default useAIAnalytics;
