// Hook para gestión de fuentes OBS
import { useState, useCallback, useEffect } from 'react';
import { OBSSourceService } from '../src/application/services/OBSSourceService';
import {
  BrowserSourceConfig,
  SourceType,
  SourceConfig,
  SourceInfo,
  SourceResult,
  Transform,
  FilterConfig,
  OBSExportError
} from '../types/obs-export';

interface UseOBSSourcesState {
  sources: SourceInfo[];
  loading: boolean;
  error: OBSExportError | null;
}

interface UseOBSSourcesReturn extends UseOBSSourcesState {
  createBrowserSource: (config: BrowserSourceConfig) => Promise<SourceResult>;
  updateBrowserSource: (name: string, config: Partial<BrowserSourceConfig>) => Promise<void>;
  deleteSource: (name: string) => Promise<void>;
  createSource: (type: SourceType, config: SourceConfig) => Promise<SourceResult>;
  sourceExists: (name: string) => Promise<boolean>;
  getSourceSettings: (name: string) => Promise<any>;
  setSourceTransform: (sceneName: string, sourceName: string, transform: Transform) => Promise<void>;
  addFilter: (sourceName: string, filter: FilterConfig) => Promise<void>;
  removeFilter: (sourceName: string, filterName: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useOBSSources(obsWebSocket: any): UseOBSSourcesReturn {
  const [state, setState] = useState<UseOBSSourcesState>({
    sources: [],
    loading: false,
    error: null
  });

  const service = new OBSSourceService(obsWebSocket);

  const refresh = useCallback(async () => {
    if (!obsWebSocket) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const sources = await service.listSources();
      setState({ sources, loading: false, error: null });
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

  const createBrowserSource = useCallback(async (config: BrowserSourceConfig): Promise<SourceResult> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await service.createBrowserSource(config);
      await refresh();
      return result;
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const updateBrowserSource = useCallback(async (name: string, config: Partial<BrowserSourceConfig>): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.updateBrowserSource(name, config);
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

  const deleteSource = useCallback(async (name: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.deleteSource(name);
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

  const createSource = useCallback(async (type: SourceType, config: SourceConfig): Promise<SourceResult> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await service.createSource(type, config);
      await refresh();
      return result;
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const sourceExists = useCallback(async (name: string): Promise<boolean> => {
    return service.sourceExists(name);
  }, [service]);

  const getSourceSettings = useCallback(async (name: string) => {
    return service.getSourceSettings(name);
  }, [service]);

  const setSourceTransform = useCallback(async (
    sceneName: string,
    sourceName: string,
    transform: Transform
  ): Promise<void> => {
    await service.setSourceTransform(sceneName, sourceName, transform);
  }, [service]);

  const addFilter = useCallback(async (sourceName: string, filter: FilterConfig): Promise<void> => {
    await service.addFilter(sourceName, filter);
  }, [service]);

  const removeFilter = useCallback(async (sourceName: string, filterName: string): Promise<void> => {
    await service.removeFilter(sourceName, filterName);
  }, [service]);

  return {
    ...state,
    createBrowserSource,
    updateBrowserSource,
    deleteSource,
    createSource,
    sourceExists,
    getSourceSettings,
    setSourceTransform,
    addFilter,
    removeFilter,
    refresh
  };
}
