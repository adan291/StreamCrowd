// Config Sync Service - Sincronización de configuración OBS

import {
  OBSConfig,
  Backup,
  BackupInfo,
  ConfigDiff,
  DiffItem,
  Conflict,
  Resolution,
  ExportOptions,
  ImportOptions,
  ImportResult,
  SceneConfig,
  SceneItemConfig,
  SourceConfigEntry,
  TransitionConfig,
  DEFAULT_TRANSFORM,
  OBSExportError
} from '../../../types/obs-export';
import { OBSSceneService } from './OBSSceneService';
import { OBSSourceService } from './OBSSourceService';

// Storage keys
const BACKUPS_KEY = 'obs_config_backups';
const MAX_BACKUPS = 10;
const CONFIG_VERSION = '1.0.0';

export class ConfigSyncService {
  private sceneService: OBSSceneService;
  private sourceService: OBSSourceService;

  constructor(sceneService: OBSSceneService, sourceService: OBSSourceService) {
    this.sceneService = sceneService;
    this.sourceService = sourceService;
  }

  // ============================================================================
  // Export/Import
  // ============================================================================

  async exportConfig(options: ExportOptions = {}): Promise<OBSConfig> {
    const config: OBSConfig = {
      version: CONFIG_VERSION,
      exportedAt: Date.now(),
      scenes: [],
      sources: [],
      transitions: []
    };

    // Export scenes
    if (options.includeScenes !== false) {
      const scenes = await this.sceneService.listScenes();
      const sceneFilter = options.sceneFilter || scenes.map(s => s.name);

      for (const scene of scenes) {
        if (!sceneFilter.includes(scene.name)) continue;

        const items = await this.sceneService.getSceneItems(scene.name);
        const sceneConfig: SceneConfig = {
          name: scene.name,
          items: items.map(item => ({
            sourceName: item.sourceName,
            sourceType: item.sourceType,
            transform: item.sceneItemTransform,
            enabled: item.sceneItemEnabled,
            locked: item.sceneItemLocked,
            filters: []
          }))
        };
        config.scenes.push(sceneConfig);
      }
    }

    // Export sources
    if (options.includeSources !== false) {
      const sources = await this.sourceService.listSources();
      for (const source of sources) {
        config.sources.push({
          name: source.name,
          type: source.type,
          settings: source.settings
        });
      }
    }

    return config;
  }

  async importConfig(config: OBSConfig, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: { scenes: 0, sources: 0, transitions: 0 },
      skipped: [],
      errors: []
    };

    // Create backup before import if requested
    if (options.createBackup !== false) {
      try {
        await this.createBackup('Auto-backup before import');
      } catch (error) {
        result.errors.push(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    const prefix = options.prefix || '';
    const selectedItems = options.selectedItems;

    // Import sources first
    for (const source of config.sources) {
      if (selectedItems && !selectedItems.includes(source.name)) {
        result.skipped.push(`Source: ${source.name}`);
        continue;
      }

      const sourceName = prefix + source.name;

      try {
        const exists = await this.sourceService.sourceExists(sourceName);
        
        if (exists && !options.replaceExisting) {
          result.skipped.push(`Source: ${sourceName} (exists)`);
          continue;
        }

        await this.sourceService.createSource(source.type, {
          name: sourceName,
          ...source.settings
        } as any);
        
        result.imported.sources++;
      } catch (error) {
        result.errors.push(`Source ${sourceName}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Import scenes
    for (const scene of config.scenes) {
      if (selectedItems && !selectedItems.includes(scene.name)) {
        result.skipped.push(`Scene: ${scene.name}`);
        continue;
      }

      const sceneName = prefix + scene.name;

      try {
        const exists = await this.sceneService.sceneExists(sceneName);
        
        if (exists) {
          if (options.replaceExisting) {
            await this.sceneService.deleteScene(sceneName);
          } else {
            result.skipped.push(`Scene: ${sceneName} (exists)`);
            continue;
          }
        }

        await this.sceneService.createScene(sceneName);

        // Add items to scene
        for (const item of scene.items) {
          const itemSourceName = prefix + item.sourceName;
          try {
            await this.sceneService.addSourceToScene(sceneName, itemSourceName, {
              transform: item.transform,
              enabled: item.enabled,
              locked: item.locked
            });
          } catch (itemError) {
            result.errors.push(`Scene item ${itemSourceName}: ${itemError instanceof Error ? itemError.message : 'Unknown'}`);
          }
        }

        result.imported.scenes++;
      } catch (error) {
        result.errors.push(`Scene ${sceneName}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  }

  // ============================================================================
  // Backup Management
  // ============================================================================

  async createBackup(description?: string): Promise<Backup> {
    const config = await this.exportConfig();
    
    const backup: Backup = {
      id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: description || `Backup ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      config,
      automatic: !description
    };

    const backups = await this.getBackupsInternal();
    backups.unshift(backup);

    // Keep only MAX_BACKUPS
    while (backups.length > MAX_BACKUPS) {
      backups.pop();
    }

    localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
    return backup;
  }

  async listBackups(): Promise<BackupInfo[]> {
    const backups = await this.getBackupsInternal();
    
    return backups.map(b => ({
      id: b.id,
      description: b.description,
      createdAt: b.createdAt,
      automatic: b.automatic,
      sceneCount: b.config.scenes.length,
      sourceCount: b.config.sources.length
    }));
  }

  async restoreBackup(backupId: string): Promise<void> {
    const backups = await this.getBackupsInternal();
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
      throw new OBSExportError(
        `Backup "${backupId}" not found`,
        'RESTORE_FAILED',
        { backupId }
      );
    }

    // Create a backup of current state before restore
    await this.createBackup('Auto-backup before restore');

    // Clear current scenes (except default)
    const currentScenes = await this.sceneService.listScenes();
    for (const scene of currentScenes) {
      try {
        await this.sceneService.deleteScene(scene.name);
      } catch {
        // Ignore errors when deleting
      }
    }

    // Import the backup
    await this.importConfig(backup.config, {
      replaceExisting: true,
      createBackup: false
    });
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backups = await this.getBackupsInternal();
    const filtered = backups.filter(b => b.id !== backupId);
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(filtered));
  }

  async getBackup(backupId: string): Promise<Backup | null> {
    const backups = await this.getBackupsInternal();
    return backups.find(b => b.id === backupId) || null;
  }

  // ============================================================================
  // Change Detection
  // ============================================================================

  async detectChanges(referenceConfig?: OBSConfig): Promise<ConfigDiff> {
    const currentConfig = await this.exportConfig();
    const reference = referenceConfig || { scenes: [], sources: [], transitions: [], version: CONFIG_VERSION, exportedAt: 0 };

    const diff: ConfigDiff = {
      added: [],
      modified: [],
      removed: []
    };

    // Compare scenes
    const currentSceneNames = new Set(currentConfig.scenes.map(s => s.name));
    const referenceSceneNames = new Set(reference.scenes.map(s => s.name));

    for (const scene of currentConfig.scenes) {
      if (!referenceSceneNames.has(scene.name)) {
        diff.added.push({ type: 'scene', name: scene.name });
      } else {
        const refScene = reference.scenes.find(s => s.name === scene.name);
        if (refScene && this.scenesDiffer(scene, refScene)) {
          diff.modified.push({ type: 'scene', name: scene.name, details: 'Items changed' });
        }
      }
    }

    for (const scene of reference.scenes) {
      if (!currentSceneNames.has(scene.name)) {
        diff.removed.push({ type: 'scene', name: scene.name });
      }
    }

    // Compare sources
    const currentSourceNames = new Set(currentConfig.sources.map(s => s.name));
    const referenceSourceNames = new Set(reference.sources.map(s => s.name));

    for (const source of currentConfig.sources) {
      if (!referenceSourceNames.has(source.name)) {
        diff.added.push({ type: 'source', name: source.name });
      }
    }

    for (const source of reference.sources) {
      if (!currentSourceNames.has(source.name)) {
        diff.removed.push({ type: 'source', name: source.name });
      }
    }

    return diff;
  }

  // ============================================================================
  // Conflict Detection
  // ============================================================================

  async detectConflicts(config: OBSConfig): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Check for scene name collisions
    const existingScenes = await this.sceneService.listScenes();
    const existingSceneNames = new Set(existingScenes.map(s => s.name));

    for (const scene of config.scenes) {
      if (existingSceneNames.has(scene.name)) {
        conflicts.push({
          type: 'name_collision',
          item: scene.name,
          details: `Scene "${scene.name}" already exists`,
          suggestions: [
            { action: 'replace', description: 'Replace existing scene' },
            { action: 'rename', newName: `${scene.name}_imported`, description: 'Rename to avoid conflict' },
            { action: 'skip', description: 'Skip this scene' }
          ]
        });
      }
    }

    // Check for source name collisions
    const existingSources = await this.sourceService.listSources();
    const existingSourceNames = new Set(existingSources.map(s => s.name));

    for (const source of config.sources) {
      if (existingSourceNames.has(source.name)) {
        conflicts.push({
          type: 'name_collision',
          item: source.name,
          details: `Source "${source.name}" already exists`,
          suggestions: [
            { action: 'replace', description: 'Replace existing source' },
            { action: 'rename', newName: `${source.name}_imported`, description: 'Rename to avoid conflict' },
            { action: 'skip', description: 'Skip this source' }
          ]
        });
      }
    }

    // Check version compatibility
    if (config.version !== CONFIG_VERSION) {
      conflicts.push({
        type: 'version_mismatch',
        item: 'config',
        details: `Config version ${config.version} differs from current ${CONFIG_VERSION}`,
        suggestions: [
          { action: 'merge', description: 'Attempt to import anyway' },
          { action: 'skip', description: 'Cancel import' }
        ]
      });
    }

    return conflicts;
  }

  resolveConflict(config: OBSConfig, conflict: Conflict, resolution: Resolution): OBSConfig {
    const resolved = JSON.parse(JSON.stringify(config)) as OBSConfig;

    switch (resolution.action) {
      case 'rename':
        if (conflict.type === 'name_collision') {
          // Rename scene
          const sceneIndex = resolved.scenes.findIndex(s => s.name === conflict.item);
          if (sceneIndex >= 0 && resolution.newName) {
            resolved.scenes[sceneIndex].name = resolution.newName;
          }
          
          // Rename source
          const sourceIndex = resolved.sources.findIndex(s => s.name === conflict.item);
          if (sourceIndex >= 0 && resolution.newName) {
            resolved.sources[sourceIndex].name = resolution.newName;
            // Update references in scenes
            for (const scene of resolved.scenes) {
              for (const item of scene.items) {
                if (item.sourceName === conflict.item) {
                  item.sourceName = resolution.newName;
                }
              }
            }
          }
        }
        break;

      case 'skip':
        // Remove the conflicting item
        resolved.scenes = resolved.scenes.filter(s => s.name !== conflict.item);
        resolved.sources = resolved.sources.filter(s => s.name !== conflict.item);
        break;

      case 'replace':
      case 'merge':
        // Keep as-is, will be handled during import with replaceExisting option
        break;
    }

    return resolved;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async getBackupsInternal(): Promise<Backup[]> {
    try {
      const stored = localStorage.getItem(BACKUPS_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private scenesDiffer(a: SceneConfig, b: SceneConfig): boolean {
    if (a.items.length !== b.items.length) return true;
    
    for (let i = 0; i < a.items.length; i++) {
      if (a.items[i].sourceName !== b.items[i].sourceName) return true;
      if (a.items[i].enabled !== b.items[i].enabled) return true;
    }
    
    return false;
  }
}
