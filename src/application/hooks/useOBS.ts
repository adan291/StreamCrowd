/**
 * useOBS - Hook de React para controlar OBS Studio
 * 
 * Proporciona acceso reactivo al servicio OBS con estado
 * de conexión, escenas, y automatizaciones.
 * 
 * @example
 * ```tsx
 * const { isConnected, scenes, connect, switchScene, trigger } = useOBS();
 * 
 * // Conectar a OBS
 * await connect('mi-password');
 * 
 * // Cambiar escena
 * await switchScene('Juego');
 * 
 * // Disparar automatización desde un juego
 * await trigger('game_start');
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getOBSService, 
  type SceneAutomation, 
  type AutomationTrigger,
  type OBSConnectionConfig,
} from '../services/OBSService';
import type { 
  OBSConnectionStatus, 
  OBSScene, 
  OBSSource,
  OBSStreamStatus,
  OBSVersion,
} from '../../domain/ports/IOBSController';

export interface UseOBSReturn {
  // Estado de conexión
  status: OBSConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  version: OBSVersion | null;
  connectionConfig: OBSConnectionConfig | null;
  
  // Escenas
  scenes: OBSScene[];
  currentScene: string | null;
  
  // Stream status
  streamStatus: OBSStreamStatus | null;
  
  // Transiciones
  transitions: string[];
  currentTransition: string | null;
  
  // Automatizaciones
  automations: SceneAutomation[];
  
  // Acciones de conexión
  connect: (password?: string, host?: string, port?: number) => Promise<void>;
  disconnect: () => Promise<void>;
  setAutoConnect: (enabled: boolean) => void;
  
  // Acciones de escenas
  switchScene: (sceneName: string) => Promise<void>;
  refreshScenes: () => Promise<void>;
  
  // Acciones de fuentes
  getSceneSources: (sceneName: string) => Promise<OBSSource[]>;
  setSourceVisible: (sceneName: string, sourceName: string, visible: boolean) => Promise<void>;
  refreshBrowserSource: (sourceName: string) => Promise<void>;
  
  // Acciones de streaming
  startStream: () => Promise<void>;
  stopStream: () => Promise<void>;
  toggleStream: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleRecording: () => Promise<void>;
  refreshStreamStatus: () => Promise<void>;
  
  // Acciones de transiciones
  setTransition: (transitionName: string) => Promise<void>;
  
  // Acciones de automatizaciones
  addAutomation: (automation: Omit<SceneAutomation, 'id'>) => SceneAutomation;
  updateAutomation: (id: string, updates: Partial<Omit<SceneAutomation, 'id'>>) => boolean;
  removeAutomation: (id: string) => boolean;
  toggleAutomation: (id: string) => boolean;
  executeAutomation: (automation: SceneAutomation) => Promise<boolean>;
  
  // Trigger para usar desde juegos/encuestas
  trigger: (triggerType: AutomationTrigger, customName?: string) => Promise<boolean>;
}

export function useOBS(): UseOBSReturn {
  const service = useRef(getOBSService());
  
  // Estado
  const [status, setStatus] = useState<OBSConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<OBSVersion | null>(null);
  const [scenes, setScenes] = useState<OBSScene[]>([]);
  const [currentScene, setCurrentScene] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<OBSStreamStatus | null>(null);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [currentTransition, setCurrentTransition] = useState<string | null>(null);
  const [automations, setAutomations] = useState<SceneAutomation[]>([]);
  
  // Cargar automatizaciones al montar
  useEffect(() => {
    setAutomations(service.current.getAutomations());
  }, []);
  
  // Suscribirse a cambios de estado
  useEffect(() => {
    const unsubStatus = service.current.onStatusChange((newStatus, err) => {
      setStatus(newStatus);
      setError(err || null);
    });
    
    const unsubScene = service.current.onSceneChange((scene) => {
      setCurrentScene(scene.name);
    });
    
    const unsubStream = service.current.onStreamStatusChange((status) => {
      setStreamStatus(prev => ({ ...prev, ...status }));
    });
    
    return () => {
      unsubStatus();
      unsubScene();
      unsubStream();
    };
  }, []);
  
  // Auto-connect si está configurado
  useEffect(() => {
    const config = service.current.getConnectionConfig();
    if (config?.autoConnect && status === 'disconnected') {
      service.current.connect().catch(() => {
        // Silently fail auto-connect
      });
    }
  }, []);

  // === ACCIONES DE CONEXIÓN ===
  
  const connect = useCallback(async (password?: string, host?: string, port?: number) => {
    setError(null);
    try {
      await service.current.connect(password, host, port);
      
      // Cargar datos iniciales
      const [sceneList, ver, trans, currentTrans, status] = await Promise.all([
        service.current.getScenes(),
        service.current.getVersion(),
        service.current.getTransitions(),
        service.current.controller?.getCurrentTransition?.() || Promise.resolve(null),
        service.current.getStreamStatus(),
      ]);
      
      setScenes(sceneList);
      setVersion(ver);
      setTransitions(trans);
      setCurrentTransition(currentTrans as string | null);
      setStreamStatus(status);
      
      const current = await service.current.getCurrentScene();
      setCurrentScene(current);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      setError(msg);
      throw err;
    }
  }, []);
  
  const disconnect = useCallback(async () => {
    await service.current.disconnect();
    setScenes([]);
    setCurrentScene(null);
    setVersion(null);
    setStreamStatus(null);
    setTransitions([]);
    setCurrentTransition(null);
  }, []);
  
  const setAutoConnect = useCallback((enabled: boolean) => {
    service.current.setAutoConnect(enabled);
  }, []);
  
  // === ACCIONES DE ESCENAS ===
  
  const switchScene = useCallback(async (sceneName: string) => {
    await service.current.switchScene(sceneName);
    setCurrentScene(sceneName);
  }, []);
  
  const refreshScenes = useCallback(async () => {
    const sceneList = await service.current.getScenes();
    setScenes(sceneList);
    const current = await service.current.getCurrentScene();
    setCurrentScene(current);
  }, []);
  
  // === ACCIONES DE FUENTES ===
  
  const getSceneSources = useCallback(async (sceneName: string) => {
    return service.current.getSceneSources(sceneName);
  }, []);
  
  const setSourceVisible = useCallback(async (
    sceneName: string, 
    sourceName: string, 
    visible: boolean
  ) => {
    await service.current.setSourceVisible(sceneName, sourceName, visible);
  }, []);
  
  const refreshBrowserSource = useCallback(async (sourceName: string) => {
    await service.current.refreshBrowserSource(sourceName);
  }, []);
  
  // === ACCIONES DE STREAMING ===
  
  const startStream = useCallback(async () => {
    await service.current.startStream();
    setStreamStatus(prev => prev ? { ...prev, isStreaming: true } : { isStreaming: true, isRecording: false });
  }, []);
  
  const stopStream = useCallback(async () => {
    await service.current.stopStream();
    setStreamStatus(prev => prev ? { ...prev, isStreaming: false } : { isStreaming: false, isRecording: false });
  }, []);
  
  const toggleStream = useCallback(async () => {
    await service.current.toggleStream();
    const status = await service.current.getStreamStatus();
    setStreamStatus(status);
  }, []);
  
  const startRecording = useCallback(async () => {
    await service.current.startRecording();
    setStreamStatus(prev => prev ? { ...prev, isRecording: true } : { isStreaming: false, isRecording: true });
  }, []);
  
  const stopRecording = useCallback(async () => {
    await service.current.stopRecording();
    setStreamStatus(prev => prev ? { ...prev, isRecording: false } : { isStreaming: false, isRecording: false });
  }, []);
  
  const toggleRecording = useCallback(async () => {
    await service.current.toggleRecording();
    const status = await service.current.getStreamStatus();
    setStreamStatus(status);
  }, []);
  
  const refreshStreamStatus = useCallback(async () => {
    const status = await service.current.getStreamStatus();
    setStreamStatus(status);
  }, []);
  
  // === ACCIONES DE TRANSICIONES ===
  
  const setTransition = useCallback(async (transitionName: string) => {
    await service.current.setTransition(transitionName);
    setCurrentTransition(transitionName);
  }, []);
  
  // === ACCIONES DE AUTOMATIZACIONES ===
  
  const addAutomation = useCallback((automation: Omit<SceneAutomation, 'id'>) => {
    const newAutomation = service.current.addAutomation(automation);
    setAutomations(service.current.getAutomations());
    return newAutomation;
  }, []);
  
  const updateAutomation = useCallback((id: string, updates: Partial<Omit<SceneAutomation, 'id'>>) => {
    const result = service.current.updateAutomation(id, updates);
    setAutomations(service.current.getAutomations());
    return result;
  }, []);
  
  const removeAutomation = useCallback((id: string) => {
    const result = service.current.removeAutomation(id);
    setAutomations(service.current.getAutomations());
    return result;
  }, []);
  
  const toggleAutomation = useCallback((id: string) => {
    const result = service.current.toggleAutomation(id);
    setAutomations(service.current.getAutomations());
    return result;
  }, []);
  
  const executeAutomation = useCallback(async (automation: SceneAutomation) => {
    return service.current.executeAutomation(automation);
  }, []);
  
  const trigger = useCallback(async (triggerType: AutomationTrigger, customName?: string) => {
    return service.current.executeTrigger(triggerType, customName);
  }, []);
  
  return {
    // Estado
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    error,
    version,
    connectionConfig: service.current.getConnectionConfig(),
    scenes,
    currentScene,
    streamStatus,
    transitions,
    currentTransition,
    automations,
    
    // Acciones
    connect,
    disconnect,
    setAutoConnect,
    switchScene,
    refreshScenes,
    getSceneSources,
    setSourceVisible,
    refreshBrowserSource,
    startStream,
    stopStream,
    toggleStream,
    startRecording,
    stopRecording,
    toggleRecording,
    refreshStreamStatus,
    setTransition,
    addAutomation,
    updateAutomation,
    removeAutomation,
    toggleAutomation,
    executeAutomation,
    trigger,
  };
}

export default useOBS;
