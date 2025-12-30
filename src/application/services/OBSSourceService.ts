// OBS Source Service - Gestión de fuentes en OBS

import {
  SourceType,
  BrowserSourceConfig,
  SourceConfig,
  SourceSettings,
  SourceInfo,
  SourceResult,
  Transform,
  FilterConfig,
  DEFAULT_TRANSFORM,
  OBSExportError
} from '../../../types/obs-export';

export class OBSSourceService {
  private obs: any; // OBSWebSocket instance

  constructor(obsWebSocket: any) {
    this.obs = obsWebSocket;
  }

  // ============================================================================
  // Browser Sources
  // ============================================================================

  async createBrowserSource(config: BrowserSourceConfig): Promise<SourceResult> {
    try {
      const exists = await this.sourceExists(config.name);
      
      if (exists) {
        // Update existing source instead of creating duplicate
        await this.updateBrowserSource(config.name, config);
        return {
          success: true,
          sourceName: config.name,
          created: false,
          updated: true
        };
      }

      const settings = {
        url: config.url,
        width: config.width,
        height: config.height,
        fps: config.fps ?? 30,
        css: config.css ?? '',
        shutdown: config.shutdownWhenHidden ?? true,
        restart_when_active: config.restartWhenActive ?? false
      };

      await this.obs.call('CreateInput', {
        sceneName: await this.getFirstSceneName(),
        inputName: config.name,
        inputKind: 'browser_source',
        inputSettings: settings,
        sceneItemEnabled: true
      });

      return {
        success: true,
        sourceName: config.name,
        created: true,
        updated: false
      };
    } catch (error) {
      return {
        success: false,
        sourceName: config.name,
        created: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateBrowserSource(name: string, config: Partial<BrowserSourceConfig>): Promise<void> {
    const exists = await this.sourceExists(name);
    if (!exists) {
      throw new OBSExportError(
        `Source "${name}" not found`,
        'SOURCE_NOT_FOUND',
        { sourceName: name }
      );
    }

    const settings: Record<string, unknown> = {};
    if (config.url !== undefined) settings.url = config.url;
    if (config.width !== undefined) settings.width = config.width;
    if (config.height !== undefined) settings.height = config.height;
    if (config.fps !== undefined) settings.fps = config.fps;
    if (config.css !== undefined) settings.css = config.css;
    if (config.shutdownWhenHidden !== undefined) settings.shutdown = config.shutdownWhenHidden;
    if (config.restartWhenActive !== undefined) settings.restart_when_active = config.restartWhenActive;

    await this.obs.call('SetInputSettings', {
      inputName: name,
      inputSettings: settings,
      overlay: true
    });
  }

  async deleteBrowserSource(name: string): Promise<void> {
    await this.deleteSource(name);
  }

  // ============================================================================
  // Generic Sources
  // ============================================================================

  async createSource(type: SourceType, config: SourceConfig): Promise<SourceResult> {
    try {
      const name = (config as any).name;
      const exists = await this.sourceExists(name);

      if (exists) {
        await this.setSourceSettings(name, { type, settings: this.configToSettings(type, config) });
        return {
          success: true,
          sourceName: name,
          created: false,
          updated: true
        };
      }

      const inputKind = this.getInputKind(type);
      const settings = this.configToSettings(type, config);

      await this.obs.call('CreateInput', {
        sceneName: await this.getFirstSceneName(),
        inputName: name,
        inputKind,
        inputSettings: settings,
        sceneItemEnabled: true
      });

      return {
        success: true,
        sourceName: name,
        created: true,
        updated: false
      };
    } catch (error) {
      return {
        success: false,
        sourceName: (config as any).name,
        created: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteSource(name: string): Promise<void> {
    const exists = await this.sourceExists(name);
    if (!exists) {
      throw new OBSExportError(
        `Source "${name}" not found`,
        'SOURCE_NOT_FOUND',
        { sourceName: name }
      );
    }

    await this.obs.call('RemoveInput', { inputName: name });
  }

  async sourceExists(name: string): Promise<boolean> {
    try {
      const { inputs } = await this.obs.call('GetInputList');
      return inputs.some((input: any) => input.inputName === name);
    } catch {
      return false;
    }
  }

  async listSources(): Promise<SourceInfo[]> {
    try {
      const { inputs } = await this.obs.call('GetInputList');
      
      const sources: SourceInfo[] = [];
      for (const input of inputs) {
        try {
          const { inputSettings } = await this.obs.call('GetInputSettings', {
            inputName: input.inputName
          });
          
          sources.push({
            name: input.inputName,
            type: this.inputKindToSourceType(input.inputKind),
            settings: inputSettings
          });
        } catch {
          sources.push({
            name: input.inputName,
            type: this.inputKindToSourceType(input.inputKind),
            settings: {}
          });
        }
      }
      
      return sources;
    } catch {
      return [];
    }
  }

  async getSourceSettings(name: string): Promise<SourceSettings> {
    const exists = await this.sourceExists(name);
    if (!exists) {
      throw new OBSExportError(
        `Source "${name}" not found`,
        'SOURCE_NOT_FOUND',
        { sourceName: name }
      );
    }

    const { inputKind, inputSettings } = await this.obs.call('GetInputSettings', {
      inputName: name
    });

    return {
      type: this.inputKindToSourceType(inputKind),
      settings: inputSettings
    };
  }

  async setSourceSettings(name: string, settings: SourceSettings): Promise<void> {
    const exists = await this.sourceExists(name);
    if (!exists) {
      throw new OBSExportError(
        `Source "${name}" not found`,
        'SOURCE_NOT_FOUND',
        { sourceName: name }
      );
    }

    await this.obs.call('SetInputSettings', {
      inputName: name,
      inputSettings: settings.settings,
      overlay: true
    });
  }

  async duplicateSource(name: string, newName: string): Promise<void> {
    const settings = await this.getSourceSettings(name);
    await this.createSource(settings.type, {
      name: newName,
      ...settings.settings
    } as any);
  }

  // ============================================================================
  // Transformations
  // ============================================================================

  async setSourceTransform(
    sceneName: string,
    sourceName: string,
    transform: Transform
  ): Promise<void> {
    const sceneItemId = await this.getSceneItemId(sceneName, sourceName);
    
    await this.obs.call('SetSceneItemTransform', {
      sceneName,
      sceneItemId,
      sceneItemTransform: {
        positionX: transform.positionX,
        positionY: transform.positionY,
        scaleX: transform.scaleX,
        scaleY: transform.scaleY,
        rotation: transform.rotation,
        cropTop: transform.cropTop,
        cropBottom: transform.cropBottom,
        cropLeft: transform.cropLeft,
        cropRight: transform.cropRight
      }
    });
  }

  async getSourceTransform(sceneName: string, sourceName: string): Promise<Transform> {
    const sceneItemId = await this.getSceneItemId(sceneName, sourceName);
    
    const { sceneItemTransform } = await this.obs.call('GetSceneItemTransform', {
      sceneName,
      sceneItemId
    });

    return {
      positionX: sceneItemTransform.positionX ?? 0,
      positionY: sceneItemTransform.positionY ?? 0,
      scaleX: sceneItemTransform.scaleX ?? 1,
      scaleY: sceneItemTransform.scaleY ?? 1,
      rotation: sceneItemTransform.rotation ?? 0,
      cropTop: sceneItemTransform.cropTop ?? 0,
      cropBottom: sceneItemTransform.cropBottom ?? 0,
      cropLeft: sceneItemTransform.cropLeft ?? 0,
      cropRight: sceneItemTransform.cropRight ?? 0
    };
  }

  // ============================================================================
  // Filters
  // ============================================================================

  async addFilter(sourceName: string, filter: FilterConfig): Promise<void> {
    const exists = await this.sourceExists(sourceName);
    if (!exists) {
      throw new OBSExportError(
        `Source "${sourceName}" not found`,
        'SOURCE_NOT_FOUND',
        { sourceName }
      );
    }

    await this.obs.call('CreateSourceFilter', {
      sourceName,
      filterName: filter.name,
      filterKind: filter.type,
      filterSettings: filter.settings
    });

    if (!filter.enabled) {
      await this.obs.call('SetSourceFilterEnabled', {
        sourceName,
        filterName: filter.name,
        filterEnabled: false
      });
    }
  }

  async removeFilter(sourceName: string, filterName: string): Promise<void> {
    const exists = await this.sourceExists(sourceName);
    if (!exists) {
      throw new OBSExportError(
        `Source "${sourceName}" not found`,
        'SOURCE_NOT_FOUND',
        { sourceName }
      );
    }

    await this.obs.call('RemoveSourceFilter', {
      sourceName,
      filterName
    });
  }

  async getFilters(sourceName: string): Promise<FilterConfig[]> {
    const exists = await this.sourceExists(sourceName);
    if (!exists) {
      throw new OBSExportError(
        `Source "${sourceName}" not found`,
        'SOURCE_NOT_FOUND',
        { sourceName }
      );
    }

    const { filters } = await this.obs.call('GetSourceFilterList', { sourceName });
    
    return filters.map((f: any) => ({
      name: f.filterName,
      type: f.filterKind,
      settings: f.filterSettings ?? {},
      enabled: f.filterEnabled
    }));
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async getFirstSceneName(): Promise<string> {
    const { scenes } = await this.obs.call('GetSceneList');
    if (scenes.length === 0) {
      throw new OBSExportError('No scenes available', 'SCENE_NOT_FOUND');
    }
    return scenes[0].sceneName;
  }

  private async getSceneItemId(sceneName: string, sourceName: string): Promise<number> {
    try {
      const { sceneItemId } = await this.obs.call('GetSceneItemId', {
        sceneName,
        sourceName
      });
      return sceneItemId;
    } catch {
      throw new OBSExportError(
        `Source "${sourceName}" not found in scene "${sceneName}"`,
        'SCENE_ITEM_NOT_FOUND',
        { sceneName, sourceName }
      );
    }
  }

  private getInputKind(type: SourceType): string {
    const mapping: Record<SourceType, string> = {
      browser_source: 'browser_source',
      image_source: 'image_source',
      text_gdi_plus: 'text_gdi_plus_v2',
      color_source: 'color_source_v3',
      ffmpeg_source: 'ffmpeg_source',
      window_capture: 'window_capture',
      game_capture: 'game_capture',
      dshow_input: 'dshow_input'
    };
    return mapping[type] || type;
  }

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

  private configToSettings(type: SourceType, config: SourceConfig): Record<string, unknown> {
    switch (type) {
      case 'browser_source': {
        const c = config as BrowserSourceConfig;
        return {
          url: c.url,
          width: c.width,
          height: c.height,
          fps: c.fps ?? 30,
          css: c.css ?? '',
          shutdown: c.shutdownWhenHidden ?? true,
          restart_when_active: c.restartWhenActive ?? false
        };
      }
      case 'image_source': {
        const c = config as any;
        return { file: c.file, unload: c.unload ?? false };
      }
      case 'text_gdi_plus': {
        const c = config as any;
        return {
          text: c.text,
          font: c.font,
          color: c.color,
          bk_color: c.backgroundColor,
          outline: c.outline,
          outline_color: c.outlineColor,
          outline_size: c.outlineSize
        };
      }
      case 'color_source': {
        const c = config as any;
        return { color: c.color, width: c.width, height: c.height };
      }
      case 'ffmpeg_source': {
        const c = config as any;
        return {
          local_file: c.localFile,
          looping: c.looping ?? false,
          restart_on_activate: c.restart ?? false
        };
      }
      default:
        return (config as any).settings ?? {};
    }
  }
}
