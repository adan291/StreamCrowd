// Hook para sincronización de configuración OBS
import { useState, useCallback, useEffect } from 'react';
import { ConfigSyncService } from '../src/application/services/ConfigSyncService';
import { OBSSceneService } from '../src/application/services/OBSSceneService';
import { OBSSourceService } from '../src/application/services/OBSSourceService';
import {
  OBSConfig,
  BackupInfo,
  ConfigDiff,
  Conflict,
  Resolution,
  ExportOptions,
  ImportOptions,
  ImportResult,
  OBSExportError
} from '../types/obs-export';

interface UseConfigSyncState {
  backups: BackupInfo[];
  currentDiff: ConfigDiff | null;
  conflicts: Conflict[];
  loading: boolean;
  syncing: boolean;
  error: OBSExportError | null;
}

interface UseConfigSyncReturn extends UseConfigSyncState {
  exportConfig: (options?: ExportOptions) => Promise<OBSConfig>;
  importConfig: (config: OBSConfig, options?: ImportOptions) => Promise<ImportResult>;
  createBackup: (description?: string) => Promise<void>;
  restoreBackup: (backupId: string) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
  detectChanges: (referenceConfig?: OBSConfig) => Promise<ConfigDiff>;
  detectConflicts: (config: OBSConfig) => Promise<Conflict[]>;
  resolveConflict: (config: OBSConfig, conflict: Conflict, resolution: Resolution) => OBSConfig;
  downloadConfig: (config: OBSConfig, filename?: string) => void;
  refresh: () => Promise<void>;
}

export function useConfigSync(obsWebSocket: any): UseConfigSyncReturn {
  const [state, setState] = useState<UseConfigSyncState>({
    backups: [],
    currentDiff: null,
    conflicts: [],
    loading: false,
    syncing: false,
    error: null
  });

  const sceneService = new OBSSceneService(obsWebSocket);
  const sourceService = new OBSSourceService(obsWebSocket);
  const service = new ConfigSyncService(sceneService, sourceService);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const backups = await service.listBackups();
      setState(prev => ({
        ...prev,
        backups,
        loading: false,
        error: null
      }));
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
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const exportConfig = useCallback(async (options: ExportOptions = {}): Promise<OBSConfig> => {
    setState(prev => ({ ...prev, syncing: true, error: null }));
    try {
      const config = await service.exportConfig(options);
      setState(prev => ({ ...prev, syncing: false }));
      return config;
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'EXPORT_FAILED'
      );
      setState(prev => ({ ...prev, syncing: false, error: obsError }));
      throw obsError;
    }
  }, [service]);

  const importConfig = useCallback(async (
    config: OBSConfig,
    options: ImportOptions = {}
  ): Promise<ImportResult> => {
    setState(prev => ({ ...prev, syncing: true, error: null }));
    try {
      const result = await service.importConfig(config, options);
      await refresh();
      setState(prev => ({ ...prev, syncing: false }));
      return result;
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'IMPORT_FAILED'
      );
      setState(prev => ({ ...prev, syncing: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const createBackup = useCallback(async (description?: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.createBackup(description);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'BACKUP_FAILED'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const restoreBackup = useCallback(async (backupId: string): Promise<void> => {
    setState(prev => ({ ...prev, syncing: true, error: null }));
    try {
      await service.restoreBackup(backupId);
      await refresh();
      setState(prev => ({ ...prev, syncing: false }));
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'RESTORE_FAILED'
      );
      setState(prev => ({ ...prev, syncing: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const deleteBackup = useCallback(async (backupId: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.deleteBackup(backupId);
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

  const detectChanges = useCallback(async (referenceConfig?: OBSConfig): Promise<ConfigDiff> => {
    const diff = await service.detectChanges(referenceConfig);
    setState(prev => ({ ...prev, currentDiff: diff }));
    return diff;
  }, [service]);

  const detectConflicts = useCallback(async (config: OBSConfig): Promise<Conflict[]> => {
    const conflicts = await service.detectConflicts(config);
    setState(prev => ({ ...prev, conflicts }));
    return conflicts;
  }, [service]);

  const resolveConflict = useCallback((
    config: OBSConfig,
    conflict: Conflict,
    resolution: Resolution
  ): OBSConfig => {
    return service.resolveConflict(config, conflict, resolution);
  }, [service]);

  const downloadConfig = useCallback((config: OBSConfig, filename: string = 'obs-config.json') => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return {
    ...state,
    exportConfig,
    importConfig,
    createBackup,
    restoreBackup,
    deleteBackup,
    detectChanges,
    detectConflicts,
    resolveConflict,
    downloadConfig,
    refresh
  };
}
