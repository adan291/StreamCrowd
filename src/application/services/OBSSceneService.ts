// OBS Scene Service - Gestión de escenas en OBS

import {
  SceneInfo,
  SceneItem,
  SceneItemSettings,
  Transform,
  SourceType,
  DEFAULT_TRANSFORM,
  OBSExportError
} from '../../../types/obs-export';

export class OBSSceneService {
  private obs: any; // OBSWebSocket instance

  constructor(obsWebSocket: any) {
    this.obs = obsWebSocket;
  }

  // ============================================================================
  // Scene CRUD
  // ============================================================================

  async createScene(name: string): Promise<void> {
    const exists = await this.sceneExists(name);
    if (exists) {
      throw new OBSExportError(
        `Scene "${name}" already exists`,
        'SCENE_EXISTS',
        { sceneName: name }
      );
    }

    await this.obs.call('CreateScene', { sceneName: name });
  }

  async deleteScene(name: string): Promise<void> {
    const exists = await this.sceneExists(name);
    if (!exists) {
      throw new OBSExportError(
        `Scene "${name}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName: name }
      );
    }

    await this.obs.call('RemoveScene', { sceneName: name });
  }

  async renameScene(oldName: string, newName: string): Promise<void> {
    const exists = await this.sceneExists(oldName);
    if (!exists) {
      throw new OBSExportError(
        `Scene "${oldName}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName: oldName }
      );
    }

    const newExists = await this.sceneExists(newName);
    if (newExists) {
      throw new OBSExportError(
        `Scene "${newName}" already exists`,
        'SCENE_EXISTS',
        { sceneName: newName }
      );
    }

    await this.obs.call('SetSceneName', {
      sceneName: oldName,
      newSceneName: newName
    });
  }

  async duplicateScene(name: string, newName: string): Promise<void> {
    const exists = await this.sceneExists(name);
    if (!exists) {
      throw new OBSExportError(
        `Scene "${name}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName: name }
      );
    }

    const newExists = await this.sceneExists(newName);
    if (newExists) {
      throw new OBSExportError(
        `Scene "${newName}" already exists`,
        'SCENE_EXISTS',
        { sceneName: newName }
      );
    }

    // Create new scene
    await this.createScene(newName);

    // Get items from original scene
    const items = await this.getSceneItems(name);

    // Add each item to new scene
    for (const item of items) {
      await this.addSourceToScene(newName, item.sourceName, {
        transform: item.sceneItemTransform,
        enabled: item.sceneItemEnabled,
        locked: item.sceneItemLocked
      });
    }
  }

  async sceneExists(name: string): Promise<boolean> {
    try {
      const scenes = await this.listScenes();
      return scenes.some(s => s.name === name);
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Scene Items
  // ============================================================================

  async addSourceToScene(
    sceneName: string,
    sourceName: string,
    settings?: SceneItemSettings
  ): Promise<number> {
    const sceneExists = await this.sceneExists(sceneName);
    if (!sceneExists) {
      throw new OBSExportError(
        `Scene "${sceneName}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName }
      );
    }

    const { sceneItemId } = await this.obs.call('CreateSceneItem', {
      sceneName,
      sourceName,
      sceneItemEnabled: settings?.enabled ?? true
    });

    // Apply transform if provided
    if (settings?.transform) {
      await this.obs.call('SetSceneItemTransform', {
        sceneName,
        sceneItemId,
        sceneItemTransform: {
          ...DEFAULT_TRANSFORM,
          ...settings.transform
        }
      });
    }

    // Apply locked state if provided
    if (settings?.locked !== undefined) {
      await this.obs.call('SetSceneItemLocked', {
        sceneName,
        sceneItemId,
        sceneItemLocked: settings.locked
      });
    }

    return sceneItemId;
  }

  async removeSourceFromScene(sceneName: string, sceneItemId: number): Promise<void> {
    const sceneExists = await this.sceneExists(sceneName);
    if (!sceneExists) {
      throw new OBSExportError(
        `Scene "${sceneName}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName }
      );
    }

    await this.obs.call('RemoveSceneItem', {
      sceneName,
      sceneItemId
    });
  }

  async getSceneItems(sceneName: string): Promise<SceneItem[]> {
    const sceneExists = await this.sceneExists(sceneName);
    if (!sceneExists) {
      throw new OBSExportError(
        `Scene "${sceneName}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName }
      );
    }

    const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName });

    return sceneItems.map((item: any) => ({
      sceneItemId: item.sceneItemId,
      sourceName: item.sourceName,
      sourceType: this.inputKindToSourceType(item.inputKind),
      sceneItemIndex: item.sceneItemIndex,
      sceneItemEnabled: item.sceneItemEnabled,
      sceneItemLocked: item.sceneItemLocked,
      sceneItemTransform: this.parseTransform(item.sceneItemTransform)
    }));
  }

  // ============================================================================
  // Scene Item Ordering
  // ============================================================================

  async setSceneItemIndex(
    sceneName: string,
    sceneItemId: number,
    index: number
  ): Promise<void> {
    const sceneExists = await this.sceneExists(sceneName);
    if (!sceneExists) {
      throw new OBSExportError(
        `Scene "${sceneName}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName }
      );
    }

    await this.obs.call('SetSceneItemIndex', {
      sceneName,
      sceneItemId,
      sceneItemIndex: index
    });
  }

  async reorderScenes(sceneNames: string[]): Promise<void> {
    // OBS doesn't have a direct reorder API, so we need to use SetSceneSceneTransitionOverride
    // or manipulate through other means. For now, we'll validate and log.
    for (const name of sceneNames) {
      const exists = await this.sceneExists(name);
      if (!exists) {
        throw new OBSExportError(
          `Scene "${name}" not found`,
          'SCENE_NOT_FOUND',
          { sceneName: name }
        );
      }
    }
    
    // Note: OBS WebSocket 5.x doesn't have a direct scene reorder API
    // This would require removing and recreating scenes in order
    console.warn('Scene reordering is not directly supported by OBS WebSocket');
  }

  // ============================================================================
  // Scene Item Visibility & Lock
  // ============================================================================

  async setSceneItemEnabled(
    sceneName: string,
    sceneItemId: number,
    enabled: boolean
  ): Promise<void> {
    const sceneExists = await this.sceneExists(sceneName);
    if (!sceneExists) {
      throw new OBSExportError(
        `Scene "${sceneName}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName }
      );
    }

    await this.obs.call('SetSceneItemEnabled', {
      sceneName,
      sceneItemId,
      sceneItemEnabled: enabled
    });
  }

  async setSceneItemLocked(
    sceneName: string,
    sceneItemId: number,
    locked: boolean
  ): Promise<void> {
    const sceneExists = await this.sceneExists(sceneName);
    if (!sceneExists) {
      throw new OBSExportError(
        `Scene "${sceneName}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName }
      );
    }

    await this.obs.call('SetSceneItemLocked', {
      sceneName,
      sceneItemId,
      sceneItemLocked: locked
    });
  }

  // ============================================================================
  // Scene Queries
  // ============================================================================

  async listScenes(): Promise<SceneInfo[]> {
    try {
      const { scenes } = await this.obs.call('GetSceneList');
      
      const sceneInfos: SceneInfo[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        try {
          const { sceneItems } = await this.obs.call('GetSceneItemList', {
            sceneName: scene.sceneName
          });
          sceneInfos.push({
            name: scene.sceneName,
            index: i,
            itemCount: sceneItems?.length ?? 0
          });
        } catch {
          sceneInfos.push({
            name: scene.sceneName,
            index: i,
            itemCount: 0
          });
        }
      }
      
      return sceneInfos;
    } catch {
      return [];
    }
  }

  async getCurrentScene(): Promise<string> {
    const { currentProgramSceneName } = await this.obs.call('GetCurrentProgramScene');
    return currentProgramSceneName;
  }

  async setCurrentScene(name: string): Promise<void> {
    const exists = await this.sceneExists(name);
    if (!exists) {
      throw new OBSExportError(
        `Scene "${name}" not found`,
        'SCENE_NOT_FOUND',
        { sceneName: name }
      );
    }

    await this.obs.call('SetCurrentProgramScene', {
      sceneName: name
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private inputKindToSourceType(inputKind: string): SourceType {
    const mapping: Record<string, SourceType> = {
      browser_source: 'browser_source',
      image_source: 'image_source',
      text_gdi_plus_v2: 'text_gdi_plus',
      text_gdi_plus: 'text_gdi_plus',
      color_source_v3: 'color_source',
      color_source: 'color_source',
      ffmpeg_source: 'ffmpeg_source',
      window_capture: 'window_capture',
      game_capture: 'game_capture',
      dshow_input: 'dshow_input'
    };
    return mapping[inputKind] || 'browser_source';
  }

  private parseTransform(transform: any): Transform {
    if (!transform) return { ...DEFAULT_TRANSFORM };
    
    return {
      positionX: transform.positionX ?? 0,
      positionY: transform.positionY ?? 0,
      scaleX: transform.scaleX ?? 1,
      scaleY: transform.scaleY ?? 1,
      rotation: transform.rotation ?? 0,
      cropTop: transform.cropTop ?? 0,
      cropBottom: transform.cropBottom ?? 0,
      cropLeft: transform.cropLeft ?? 0,
      cropRight: transform.cropRight ?? 0
    };
  }
}
