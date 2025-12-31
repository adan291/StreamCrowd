// Quick Export Service - Exportación rápida de overlays a OBS

import {
  OverlayType,
  OverlayOBSStatus,
  QuickAddOptions,
  AddResult,
  ExportedOverlay,
  OverlaySuggestion,
  Position,
  Dimensions,
  BrowserSourceConfig,
  DEFAULT_TRANSFORM,
  OBSExportError
} from '../../../types/obs-export';
import { OBSSourceService } from './OBSSourceService';
import { OBSSceneService } from './OBSSceneService';

// Storage key for exported overlays tracking
const EXPORTED_OVERLAYS_KEY = 'obs_exported_overlays';

// Default overlay configurations
const OVERLAY_CONFIGS: Record<OverlayType, { 
  defaultName: string;
  dimensions: Dimensions;
  position: Position;
  description: string;
}> = {
  poll: {
    defaultName: 'TwitchVote Poll',
    dimensions: { width: 400, height: 300 },
    position: { x: 1500, y: 100 },
    description: 'Live poll overlay'
  },
  prediction: {
    defaultName: 'TwitchVote Prediction',
    dimensions: { width: 450, height: 350 },
    position: { x: 1450, y: 100 },
    description: 'Prediction overlay'
  },
  alert: {
    defaultName: 'TwitchVote Alerts',
    dimensions: { width: 800, height: 600 },
    position: { x: 560, y: 100 },
    description: 'Alert notifications overlay'
  },
  chat: {
    defaultName: 'TwitchVote Chat',
    dimensions: { width: 400, height: 600 },
    position: { x: 1500, y: 300 },
    description: 'Chat overlay'
  },
  timer: {
    defaultName: 'TwitchVote Timer',
    dimensions: { width: 400, height: 200 },
    position: { x: 760, y: 50 },
    description: 'Countdown timer overlay'
  },
  giveaway: {
    defaultName: 'TwitchVote Giveaway',
    dimensions: { width: 500, height: 400 },
    position: { x: 710, y: 340 },
    description: 'Giveaway overlay'
  },
  wheel: {
    defaultName: 'TwitchVote Wheel',
    dimensions: { width: 600, height: 600 },
    position: { x: 660, y: 240 },
    description: 'Spinner wheel overlay'
  },
  game: {
    defaultName: 'TwitchVote Game',
    dimensions: { width: 800, height: 600 },
    position: { x: 560, y: 240 },
    description: 'Interactive game overlay'
  },
  metrics: {
    defaultName: 'TwitchVote Metrics',
    dimensions: { width: 350, height: 200 },
    position: { x: 20, y: 20 },
    description: 'Stream metrics overlay'
  }
};

export class QuickExportService {
  private sourceService: OBSSourceService;
  private sceneService: OBSSceneService;
  private baseUrl: string;

  constructor(
    sourceService: OBSSourceService,
    sceneService: OBSSceneService,
    baseUrl: string = window.location.origin
  ) {
    this.sourceService = sourceService;
    this.sceneService = sceneService;
    this.baseUrl = baseUrl;
  }

  // ============================================================================
  // Quick Add
  // ============================================================================

  async addOverlayToOBS(
    overlayType: OverlayType,
    options: QuickAddOptions = {}
  ): Promise<AddResult> {
    const config = OVERLAY_CONFIGS[overlayType];
    const sourceName = options.sourceName || config.defaultName;
    const url = this.getOverlayUrl(overlayType);
    const dimensions = options.dimensions || config.dimensions;
    const position = options.position || config.position;

    try {
      // Determine target scene
      let sceneName = options.sceneName;
      if (!sceneName) {
        sceneName = await this.sceneService.getCurrentScene();
      }

      // Check if source already exists
      const exists = await this.sourceService.sourceExists(sourceName);
      
      if (exists) {
        // Update existing source
        await this.sourceService.updateBrowserSource(sourceName, {
          url,
          width: dimensions.width,
          height: dimensions.height
        });
      } else {
        // Create new browser source
        const browserConfig: BrowserSourceConfig = {
          name: sourceName,
          url,
          width: dimensions.width,
          height: dimensions.height,
          fps: 30,
          shutdownWhenHidden: true,
          restartWhenActive: false
        };

        await this.sourceService.createBrowserSource(browserConfig);
      }

      // Add to scene if not already there
      let sceneItemId: number | undefined;
      try {
        const items = await this.sceneService.getSceneItems(sceneName);
        const existingItem = items.find(i => i.sourceName === sourceName);
        
        if (!existingItem) {
          sceneItemId = await this.sceneService.addSourceToScene(sceneName, sourceName, {
            transform: {
              ...DEFAULT_TRANSFORM,
              positionX: position.x,
              positionY: position.y
            },
            enabled: options.autoShow !== false
          });
        } else {
          sceneItemId = existingItem.sceneItemId;
          // Update position
          await this.sourceService.setSourceTransform(sceneName, sourceName, {
            ...DEFAULT_TRANSFORM,
            positionX: position.x,
            positionY: position.y
          });
        }
      } catch {
        // Scene might not exist, try to add anyway
      }

      // Track exported overlay
      await this.trackExportedOverlay({
        overlayType,
        sourceName,
        sceneName,
        sceneItemId: sceneItemId || 0,
        url,
        exportedAt: Date.now()
      });

      return {
        success: true,
        sourceName,
        sceneName,
        sceneItemId
      };
    } catch (error) {
      return {
        success: false,
        sourceName,
        sceneName: options.sceneName || '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // Status
  // ============================================================================

  async getOverlayStatus(overlayType: OverlayType): Promise<OverlayOBSStatus> {
    const exported = await this.getExportedOverlays();
    const tracked = exported.find(e => e.overlayType === overlayType);
    const expectedUrl = this.getOverlayUrl(overlayType);

    if (!tracked) {
      return {
        inOBS: false,
        urlMatches: false
      };
    }

    // Verify source still exists
    const exists = await this.sourceService.sourceExists(tracked.sourceName);
    
    if (!exists) {
      // Clean up tracking
      await this.removeTrackedOverlay(overlayType);
      return {
        inOBS: false,
        urlMatches: false
      };
    }

    // Get current URL from source
    let currentUrl: string | undefined;
    try {
      const settings = await this.sourceService.getSourceSettings(tracked.sourceName);
      currentUrl = settings.settings.url as string;
    } catch {
      currentUrl = undefined;
    }

    return {
      inOBS: true,
      sceneName: tracked.sceneName,
      sourceName: tracked.sourceName,
      sceneItemId: tracked.sceneItemId,
      lastUpdated: tracked.exportedAt,
      urlMatches: currentUrl === expectedUrl,
      currentUrl
    };
  }

  async listExportedOverlays(): Promise<ExportedOverlay[]> {
    const exported = await this.getExportedOverlays();
    const verified: ExportedOverlay[] = [];

    for (const overlay of exported) {
      const exists = await this.sourceService.sourceExists(overlay.sourceName);
      if (exists) {
        verified.push(overlay);
      }
    }

    // Update storage with only verified overlays
    if (verified.length !== exported.length) {
      localStorage.setItem(EXPORTED_OVERLAYS_KEY, JSON.stringify(verified));
    }

    return verified;
  }

  // ============================================================================
  // Update/Remove
  // ============================================================================

  async updateOverlayInOBS(overlayType: OverlayType): Promise<void> {
    const status = await this.getOverlayStatus(overlayType);
    
    if (!status.inOBS || !status.sourceName) {
      throw new OBSExportError(
        `Overlay "${overlayType}" is not in OBS`,
        'SOURCE_NOT_FOUND',
        { overlayType }
      );
    }

    const newUrl = this.getOverlayUrl(overlayType);
    await this.sourceService.updateBrowserSource(status.sourceName, { url: newUrl });

    // Update tracking
    const exported = await this.getExportedOverlays();
    const index = exported.findIndex(e => e.overlayType === overlayType);
    if (index >= 0) {
      exported[index].url = newUrl;
      exported[index].exportedAt = Date.now();
      localStorage.setItem(EXPORTED_OVERLAYS_KEY, JSON.stringify(exported));
    }
  }

  async removeOverlayFromOBS(overlayType: OverlayType): Promise<void> {
    const status = await this.getOverlayStatus(overlayType);
    
    if (!status.inOBS || !status.sourceName) {
      throw new OBSExportError(
        `Overlay "${overlayType}" is not in OBS`,
        'SOURCE_NOT_FOUND',
        { overlayType }
      );
    }

    // Remove from scene first
    if (status.sceneName && status.sceneItemId) {
      try {
        await this.sceneService.removeSourceFromScene(status.sceneName, status.sceneItemId);
      } catch {
        // Ignore if already removed from scene
      }
    }

    // Delete the source
    try {
      await this.sourceService.deleteBrowserSource(status.sourceName);
    } catch {
      // Ignore if already deleted
    }

    // Remove from tracking
    await this.removeTrackedOverlay(overlayType);
  }

  // ============================================================================
  // Suggestions
  // ============================================================================

  getSuggestedPosition(overlayType: OverlayType): Position {
    return OVERLAY_CONFIGS[overlayType].position;
  }

  getSuggestedDimensions(overlayType: OverlayType): Dimensions {
    return OVERLAY_CONFIGS[overlayType].dimensions;
  }

  getSuggestion(overlayType: OverlayType): OverlaySuggestion {
    const config = OVERLAY_CONFIGS[overlayType];
    return {
      position: config.position,
      dimensions: config.dimensions
    };
  }

  getOverlayDescription(overlayType: OverlayType): string {
    return OVERLAY_CONFIGS[overlayType].description;
  }

  getDefaultSourceName(overlayType: OverlayType): string {
    return OVERLAY_CONFIGS[overlayType].defaultName;
  }

  // ============================================================================
  // URL Generation
  // ============================================================================

  getOverlayUrl(overlayType: OverlayType): string {
    return `${this.baseUrl}/overlay/${overlayType}`;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async getExportedOverlays(): Promise<ExportedOverlay[]> {
    try {
      const stored = localStorage.getItem(EXPORTED_OVERLAYS_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private async trackExportedOverlay(overlay: ExportedOverlay): Promise<void> {
    const exported = await this.getExportedOverlays();
    const index = exported.findIndex(e => e.overlayType === overlay.overlayType);
    
    if (index >= 0) {
      exported[index] = overlay;
    } else {
      exported.push(overlay);
    }

    localStorage.setItem(EXPORTED_OVERLAYS_KEY, JSON.stringify(exported));
  }

  private async removeTrackedOverlay(overlayType: OverlayType): Promise<void> {
    const exported = await this.getExportedOverlays();
    const filtered = exported.filter(e => e.overlayType !== overlayType);
    localStorage.setItem(EXPORTED_OVERLAYS_KEY, JSON.stringify(filtered));
  }
}
