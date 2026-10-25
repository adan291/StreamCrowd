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
  type QuickCommand,
  type QuickCommandAction,
} from '../services/OBSService';
import type { 
  OBSConnectionStatus, 
  OBSScene, 
  OBSSource,
  OBSStreamStatus,
  OBSVersion,
} from '../../domain/ports/IOBSController';

/** Storage key for favorite scenes */
const STORAGE_KEY_FAVORITE_SCENES = 'obs_favorite_scenes';

/** Storage key for quick commands */
const STORAGE_KEY_QUICK_COMMANDS = 'obs_quick_commands';

/** Maximum number of favorite scenes allowed */
export const MAX_FAVORITE_SCENES = 6;

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
  
  // Escenas favoritas
  favoriteScenes: string[];
  saveFavoriteScenes: (scenes: string[]) => void;
  
  // Quick Commands
  quickCommands: QuickCommand[];
  addQuickCommand: (command: Omit<QuickCommand, 'id'>) => QuickCommand;
  updateQuickCommand: (id: string, updates: Partial<Omit<QuickCommand, 'id'>>) => boolean;
  removeQuickCommand: (id: string) => boolean;
  executeQuickCommand: (command: QuickCommand) => Promise<boolean>;
  
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
  
  // Estado de escenas favoritas - cargar desde localStorage
  const [favoriteScenes, setFavoriteScenes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FAVORITE_SCENES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Limitar a MAX_FAVORITE_SCENES
          return parsed.slice(0, MAX_FAVORITE_SCENES);
        }
      }
    } catch (e) {
      console.error('Error loading favorite scenes:', e);
    }
    return [];
  });
  
  // Estado de comandos rápidos - cargar desde localStorage
  const [quickCommands, setQuickCommands] = useState<QuickCommand[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUICK_COMMANDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading quick commands:', e);
    }
    return [];
  });
  
  // Función para guardar escenas favoritas
  const saveFavoriteScenes = useCallback((newFavorites: string[]) => {
    // Limitar a MAX_FAVORITE_SCENES
    const limitedFavorites = newFavorites.slice(0, MAX_FAVORITE_SCENES);
    setFavoriteScenes(limitedFavorites);
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITE_SCENES, JSON.stringify(limitedFavorites));
    } catch (e) {
      console.error('Error saving favorite scenes:', e);
    }
  }, []);
  
  // Función para guardar comandos rápidos en localStorage
  const saveQuickCommandsToStorage = useCallback((commands: QuickCommand[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_QUICK_COMMANDS, JSON.stringify(commands));
    } catch (e) {
      console.error('Error saving quick commands:', e);
    }
  }, []);
  
  // Función para añadir un comando rápido
  const addQuickCommand = useCallback((command: Omit<QuickCommand, 'id'>): QuickCommand => {
    const newCommand: QuickCommand = {
      ...command,
      id: `qc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setQuickCommands(prev => {
      const updated = [...prev, newCommand];
      saveQuickCommandsToStorage(updated);
      return updated;
    });
    return newCommand;
  }, [saveQuickCommandsToStorage]);
  
  // Función para actualizar un comando rápido
  const updateQuickCommand = useCallback((id: string, updates: Partial<Omit<QuickCommand, 'id'>>): boolean => {
    let found = false;
    setQuickCommands(prev => {
      const index = prev.findIndex(c => c.id === id);
      if (index === -1) return prev;
      found = true;
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      saveQuickCommandsToStorage(updated);
      return updated;
    });
    return found;
  }, [saveQuickCommandsToStorage]);
  
  // Función para eliminar un comando rápido
  const removeQuickCommand = useCallback((id: string): boolean => {
    let found = false;
    setQuickCommands(prev => {
      const index = prev.findIndex(c => c.id === id);
      if (index === -1) return prev;
      found = true;
      const updated = prev.filter(c => c.id !== id);
      saveQuickCommandsToStorage(updated);
      return updated;
    });
    return found;
  }, [saveQuickCommandsToStorage]);
  
  // Función para ejecutar un comando rápido (acciones en secuencia)
  const executeQuickCommand = useCallback(async (command: QuickCommand): Promise<boolean> => {
    if (!service.current.isConnected()) return false;
    
    try {
      for (const action of command.actions) {
        switch (action.type) {
          case 'switch_scene':
            await service.current.switchScene(action.sceneName);
            break;
          case 'toggle_source':
            await service.current.setSourceVisible(action.sceneName, action.sourceName, action.visible);
            break;
          case 'set_transition':
            await service.current.setTransition(action.transitionName);
            break;
          case 'start_recording':
            await service.current.startRecording();
            break;
          case 'stop_recording':
            await service.current.stopRecording();
            break;
          case 'start_stream':
            await service.current.startStream();
            break;
          case 'stop_stream':
            await service.current.stopStream();
            break;
        }
        // Pequeño delay entre acciones para evitar race conditions
        await new Promise(r => setTimeout(r, 100));
      }
      return true;
    } catch (error) {
      console.error('Error executing quick command:', error);
      return false;
    }
  }, []);
  
  // Validar que las escenas favoritas existen en OBS
  useEffect(() => {
    if (scenes.length > 0 && favoriteScenes.length > 0) {
      const sceneNames = scenes.map(s => s.name);
      const validFavorites = favoriteScenes.filter(f => sceneNames.includes(f));
      if (validFavorites.length !== favoriteScenes.length) {
        saveFavoriteScenes(validFavorites);
      }
    }
  }, [scenes, favoriteScenes, saveFavoriteScenes]);
  
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
        service.current.getCurrentTransition(),
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
    favoriteScenes,
    saveFavoriteScenes,
    quickCommands,
    addQuickCommand,
    updateQuickCommand,
    removeQuickCommand,
    executeQuickCommand,
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
