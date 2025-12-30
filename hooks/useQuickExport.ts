// Hook para exportación rápida de overlays a OBS
import { useState, useCallback, useEffect } from 'react';
import { QuickExportService } from '../src/application/services/QuickExportService';
import { OBSSourceService } from '../src/application/services/OBSSourceService';
import { OBSSceneService } from '../src/application/services/OBSSceneService';
import {
  OverlayType,
  OverlayOBSStatus,
  QuickAddOptions,
  AddResult,
  ExportedOverlay,
  OverlaySuggestion,
  OBSExportError
} from '../types/obs-export';

interface UseQuickExportState {
  exportedOverlays: ExportedOverlay[];
  overlayStatuses: Map<OverlayType, OverlayOBSStatus>;
  loading: boolean;
  exporting: boolean;
  error: OBSExportError | null;
}

interface UseQuickExportReturn extends UseQuickExportState {
  addOverlayToOBS: (overlayType: OverlayType, options?: QuickAddOptions) => Promise<AddResult>;
  updateOverlayInOBS: (overlayType: OverlayType) => Promise<void>;
  removeOverlayFromOBS: (overlayType: OverlayType) => Promise<void>;
  getOverlayStatus: (overlayType: OverlayType) => Promise<OverlayOBSStatus>;
  getSuggestion: (overlayType: OverlayType) => OverlaySuggestion;
  getOverlayUrl: (overlayType: OverlayType) => string;
  getDefaultSourceName: (overlayType: OverlayType) => string;
  isOverlayInOBS: (overlayType: OverlayType) => boolean;
  refresh: () => Promise<void>;
}

const ALL_OVERLAY_TYPES: OverlayType[] = [
  'poll', 'prediction', 'alert', 'chat', 'timer', 'giveaway', 'wheel', 'game', 'metrics'
];

export function useQuickExport(obsWebSocket: any, baseUrl?: string): UseQuickExportReturn {
  const [state, setState] = useState<UseQuickExportState>({
    exportedOverlays: [],
    overlayStatuses: new Map(),
    loading: false,
    exporting: false,
    error: null
  });

  const sourceService = new OBSSourceService(obsWebSocket);
  const sceneService = new OBSSceneService(obsWebSocket);
  const service = new QuickExportService(
    sourceService,
    sceneService,
    baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  );

  const refresh = useCallback(async () => {
    if (!obsWebSocket) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const exportedOverlays = await service.listExportedOverlays();
      
      // Get status for all overlay types
      const overlayStatuses = new Map<OverlayType, OverlayOBSStatus>();
      for (const type of ALL_OVERLAY_TYPES) {
        const status = await service.getOverlayStatus(type);
        overlayStatuses.set(type, status);
      }
      
      setState({
        exportedOverlays,
        overlayStatuses,
        loading: false,
        exporting: false,
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
  }, [obsWebSocket, service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addOverlayToOBS = useCallback(async (
    overlayType: OverlayType,
    options: QuickAddOptions = {}
  ): Promise<AddResult> => {
    setState(prev => ({ ...prev, exporting: true, error: null }));
    try {
      const result = await service.addOverlayToOBS(overlayType, options);
      await refresh();
      return result;
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, exporting: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const updateOverlayInOBS = useCallback(async (overlayType: OverlayType): Promise<void> => {
    setState(prev => ({ ...prev, exporting: true, error: null }));
    try {
      await service.updateOverlayInOBS(overlayType);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, exporting: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const removeOverlayFromOBS = useCallback(async (overlayType: OverlayType): Promise<void> => {
    setState(prev => ({ ...prev, exporting: true, error: null }));
    try {
      await service.removeOverlayFromOBS(overlayType);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, exporting: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const getOverlayStatus = useCallback(async (overlayType: OverlayType): Promise<OverlayOBSStatus> => {
    return service.getOverlayStatus(overlayType);
  }, [service]);

  const getSuggestion = useCallback((overlayType: OverlayType): OverlaySuggestion => {
    return service.getSuggestion(overlayType);
  }, [service]);

  const getOverlayUrl = useCallback((overlayType: OverlayType): string => {
    return service.getOverlayUrl(overlayType);
  }, [service]);

  const getDefaultSourceName = useCallback((overlayType: OverlayType): string => {
    return service.getDefaultSourceName(overlayType);
  }, [service]);

  const isOverlayInOBS = useCallback((overlayType: OverlayType): boolean => {
    const status = state.overlayStatuses.get(overlayType);
    return status?.inOBS ?? false;
  }, [state.overlayStatuses]);

  return {
    ...state,
    addOverlayToOBS,
    updateOverlayInOBS,
    removeOverlayFromOBS,
    getOverlayStatus,
    getSuggestion,
    getOverlayUrl,
    getDefaultSourceName,
    isOverlayInOBS,
    refresh
  };
}
