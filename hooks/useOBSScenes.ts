// Hook para gestión de escenas OBS
import { useState, useCallback, useEffect } from 'react';
import { OBSSceneService } from '../src/application/services/OBSSceneService';
import {
  SceneInfo,
  SceneItem,
  SceneItemSettings,
  OBSExportError
} from '../types/obs-export';

interface UseOBSScenesState {
  scenes: SceneInfo[];
  currentScene: string;
  selectedSceneItems: SceneItem[];
  loading: boolean;
  error: OBSExportError | null;
}

interface UseOBSScenesReturn extends UseOBSScenesState {
  createScene: (name: string) => Promise<void>;
  deleteScene: (name: string) => Promise<void>;
  renameScene: (oldName: string, newName: string) => Promise<void>;
  duplicateScene: (name: string, newName: string) => Promise<void>;
  setCurrentScene: (name: string) => Promise<void>;
  addSourceToScene: (sceneName: string, sourceName: string, settings?: SceneItemSettings) => Promise<number>;
  removeSourceFromScene: (sceneName: string, sceneItemId: number) => Promise<void>;
  getSceneItems: (sceneName: string) => Promise<SceneItem[]>;
  setSceneItemEnabled: (sceneName: string, sceneItemId: number, enabled: boolean) => Promise<void>;
  setSceneItemLocked: (sceneName: string, sceneItemId: number, locked: boolean) => Promise<void>;
  setSceneItemIndex: (sceneName: string, sceneItemId: number, index: number) => Promise<void>;
  selectScene: (sceneName: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useOBSScenes(obsWebSocket: any): UseOBSScenesReturn {
  const [state, setState] = useState<UseOBSScenesState>({
    scenes: [],
    currentScene: '',
    selectedSceneItems: [],
    loading: false,
    error: null
  });

  const service = new OBSSceneService(obsWebSocket);

  const refresh = useCallback(async () => {
    if (!obsWebSocket) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const scenes = await service.listScenes();
      const currentScene = await service.getCurrentScene();
      
      let selectedSceneItems: SceneItem[] = [];
      if (currentScene) {
        try {
          selectedSceneItems = await service.getSceneItems(currentScene);
        } catch {
          selectedSceneItems = [];
        }
      }
      
      setState({
        scenes,
        currentScene,
        selectedSceneItems,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof OBSExportError ? error : new OBSExportError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR'
        )
      }));
    }
  }, [obsWebSocket]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createScene = useCallback(async (name: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.createScene(name);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const deleteScene = useCallback(async (name: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.deleteScene(name);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const renameScene = useCallback(async (oldName: string, newName: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.renameScene(oldName, newName);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const duplicateScene = useCallback(async (name: string, newName: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.duplicateScene(name, newName);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const setCurrentScene = useCallback(async (name: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.setCurrentScene(name);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const addSourceToScene = useCallback(async (
    sceneName: string,
    sourceName: string,
    settings?: SceneItemSettings
  ): Promise<number> => {
    const sceneItemId = await service.addSourceToScene(sceneName, sourceName, settings);
    await refresh();
    return sceneItemId;
  }, [service, refresh]);

  const removeSourceFromScene = useCallback(async (
    sceneName: string,
    sceneItemId: number
  ): Promise<void> => {
    await service.removeSourceFromScene(sceneName, sceneItemId);
    await refresh();
  }, [service, refresh]);

  const getSceneItems = useCallback(async (sceneName: string): Promise<SceneItem[]> => {
    return service.getSceneItems(sceneName);
  }, [service]);

  const setSceneItemEnabled = useCallback(async (
    sceneName: string,
    sceneItemId: number,
    enabled: boolean
  ): Promise<void> => {
    await service.setSceneItemEnabled(sceneName, sceneItemId, enabled);
    await refresh();
  }, [service, refresh]);

  const setSceneItemLocked = useCallback(async (
    sceneName: string,
    sceneItemId: number,
    locked: boolean
  ): Promise<void> => {
    await service.setSceneItemLocked(sceneName, sceneItemId, locked);
    await refresh();
  }, [service, refresh]);

  const setSceneItemIndex = useCallback(async (
    sceneName: string,
    sceneItemId: number,
    index: number
  ): Promise<void> => {
    await service.setSceneItemIndex(sceneName, sceneItemId, index);
    await refresh();
  }, [service, refresh]);

  const selectScene = useCallback(async (sceneName: string): Promise<void> => {
    try {
      const items = await service.getSceneItems(sceneName);
      setState(prev => ({ ...prev, selectedSceneItems: items }));
    } catch {
      setState(prev => ({ ...prev, selectedSceneItems: [] }));
    }
  }, [service]);

  return {
    ...state,
    createScene,
    deleteScene,
    renameScene,
    duplicateScene,
    setCurrentScene,
    addSourceToScene,
    removeSourceFromScene,
    getSceneItems,
    setSceneItemEnabled,
    setSceneItemLocked,
    setSceneItemIndex,
    selectScene,
    refresh
  };
}
