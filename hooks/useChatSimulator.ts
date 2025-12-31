/**
 * useChatSimulator - Hook para integrar el simulador de chat con componentes React
 * 
 * Permite simular mensajes de chat para probar dinámicas sin conexión real a Twitch.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TwitchMessage } from '../types';
import { 
  ChatSimulatorService, 
  getChatSimulator, 
  SimulatorConfig, 
  SimulatorContext 
} from '../src/application/services/ChatSimulatorService';

export interface UseChatSimulatorOptions {
  /** Callback cuando se genera un mensaje */
  onMessage?: (message: TwitchMessage) => void;
  /** Configuración inicial */
  initialConfig?: Partial<SimulatorConfig>;
  /** Auto-iniciar el simulador */
  autoStart?: boolean;
}

export interface UseChatSimulatorReturn {
  /** Si el simulador está activo */
  isRunning: boolean;
  /** Estadísticas del simulador */
  stats: {
    messageCount: number;
    uniqueUsers: number;
  };
  /** Configuración actual */
  config: SimulatorConfig;
  /** Contexto actual */
  context: SimulatorContext;
  /** Iniciar simulación */
  start: () => void;
  /** Detener simulación */
  stop: () => void;
  /** Toggle simulación */
  toggle: () => void;
  /** Actualizar configuración */
  setConfig: (config: Partial<SimulatorConfig>) => void;
  /** Establecer contexto (tipo de dinámica activa) */
  setContext: (context: SimulatorContext) => void;
  /** Generar un mensaje único */
  generateMessage: (overrideMessage?: string) => TwitchMessage;
  /** Generar ráfaga de mensajes */
  generateBurst: (count: number) => void;
  /** Simular usuarios uniéndose a un juego */
  simulateJoins: (count: number, command?: string) => void;
  /** Simular votos para encuesta */
  simulateVotes: (options: string[], count: number) => void;
  /** Simular respuestas para trivia */
  simulateAnswers: (correctAnswer: string, wrongAnswers: string[], correctProbability?: number) => void;
  /** Resetear el simulador */
  reset: () => void;
}

export function useChatSimulator(options: UseChatSimulatorOptions = {}): UseChatSimulatorReturn {
  const { onMessage, initialConfig, autoStart = false } = options;
  
  const simulatorRef = useRef<ChatSimulatorService>(getChatSimulator());
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ messageCount: 0, uniqueUsers: 0 });
  const [config, setConfigState] = useState<SimulatorConfig>({
    messagesPerMinute: initialConfig?.messagesPerMinute ?? 30,
    relevantMessageProbability: initialConfig?.relevantMessageProbability ?? 0.6,
    uniqueUsers: initialConfig?.uniqueUsers ?? 20,
    timingVariation: initialConfig?.timingVariation ?? 0.5,
  });
  const [context, setContextState] = useState<SimulatorContext>({ type: 'generic' });

  // Suscribirse a mensajes del simulador
  useEffect(() => {
    const simulator = simulatorRef.current;
    
    const unsubscribe = simulator.onMessage((message) => {
      onMessage?.(message);
      // Actualizar stats
      const newStats = simulator.getStats();
      setStats({
        messageCount: newStats.messageCount,
        uniqueUsers: newStats.uniqueUsers,
      });
    });

    // Aplicar configuración inicial
    if (initialConfig) {
      simulator.setConfig(initialConfig);
    }

    // Auto-start si está configurado
    if (autoStart) {
      simulator.start();
      setIsRunning(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const start = useCallback(() => {
    simulatorRef.current.start();
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    simulatorRef.current.stop();
    setIsRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  const setConfig = useCallback((newConfig: Partial<SimulatorConfig>) => {
    simulatorRef.current.setConfig(newConfig);
    setConfigState(prev => ({ ...prev, ...newConfig }));
  }, []);

  const setContext = useCallback((newContext: SimulatorContext) => {
    simulatorRef.current.setContext(newContext);
    setContextState(newContext);
  }, []);

  const generateMessage = useCallback((overrideMessage?: string) => {
    return simulatorRef.current.generateSingleMessage(overrideMessage);
  }, []);

  const generateBurst = useCallback((count: number) => {
    simulatorRef.current.generateBurst(count);
  }, []);

  const simulateJoins = useCallback((count: number, command?: string) => {
    simulatorRef.current.simulateJoins(count, command);
  }, []);

  const simulateVotes = useCallback((voteOptions: string[], count: number) => {
    simulatorRef.current.simulateVotes(voteOptions, count);
  }, []);

  const simulateAnswers = useCallback((correctAnswer: string, wrongAnswers: string[], correctProbability?: number) => {
    simulatorRef.current.simulateAnswers(correctAnswer, wrongAnswers, correctProbability);
  }, []);

  const reset = useCallback(() => {
    simulatorRef.current.reset();
    setIsRunning(false);
    setStats({ messageCount: 0, uniqueUsers: 0 });
    setContextState({ type: 'generic' });
  }, []);

  return {
    isRunning,
    stats,
    config,
    context,
    start,
    stop,
    toggle,
    setConfig,
    setContext,
    generateMessage,
    generateBurst,
    simulateJoins,
    simulateVotes,
    simulateAnswers,
    reset,
  };
}

export default useChatSimulator;
