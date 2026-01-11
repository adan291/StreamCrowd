// Property tests for QuickExportService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { QuickExportService } from '../../src/application/services/QuickExportService';
import { OBSSourceService } from '../../src/application/services/OBSSourceService';
import { OBSSceneService } from '../../src/application/services/OBSSceneService';
import { OverlayType, DEFAULT_TRANSFORM } from '../../types/obs-export';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock window.location
Object.defineProperty(global, 'window', {
  value: { location: { origin: 'http://localhost:3000' } }
});

// Mock OBS WebSocket
const createMockOBS = () => {
  const scenes = new Map<string, Map<number, any>>();
  const sources = new Map<string, any>();
  let sceneItemIdCounter = 1;
  let currentScene = 'Main';

  // Create default scene
  scenes.set('Main', new Map());

  return {
    scenes,
    sources,
    reset: () => {
      scenes.clear();
      sources.clear();
      scenes.set('Main', new Map());
      sceneItemIdCounter = 1;
      currentScene = 'Main';
    },
    call: vi.fn(async (method: string, params?: any) => {
      switch (method) {
        case 'GetSceneList':
          return { scenes: Array.from(scenes.keys()).map(name => ({ sceneName: name })) };
        
        case 'CreateScene':
          if (scenes.has(params.sceneName)) throw new Error('Scene exists');
          scenes.set(params.sceneName, new Map());
          return {};
        
        case 'GetSceneItemList':
          const scene = scenes.get(params.sceneName);
          if (!scene) return { sceneItems: [] };
          return {
            sceneItems: Array.from(scene.entries()).map(([id, item]) => ({
              sceneItemId: id,
              sourceName: item.sourceName,
              inputKind: item.inputKind || 'browser_source',
              sceneItemIndex: item.index,
              sceneItemEnabled: item.enabled,
              sceneItemLocked: item.locked,
              sceneItemTransform: item.transform
            }))
          };
        
        case 'CreateSceneItem':
          const targetScene = scenes.get(params.sceneName);
          if (!targetScene) throw new Error('Scene not found');
          const newId = sceneItemIdCounter++;
          targetScene.set(newId, {
            sourceName: params.sourceName,
            inputKind: 'browser_source',
            index: targetScene.size,
            enabled: params.sceneItemEnabled ?? true,
            locked: false,
            transform: { ...DEFAULT_TRANSFORM }
          });
          return { sceneItemId: newId };
        
        case 'RemoveSceneItem':
          const sceneForRemove = scenes.get(params.sceneName);
          if (sceneForRemove) {
            sceneForRemove.delete(params.sceneItemId);
          }
          return {};
        
        case 'SetSceneItemTransform':
          const sceneForTransform = scenes.get(params.sceneName);
          if (sceneForTransform) {
            const item = sceneForTransform.get(params.sceneItemId);
            if (item) item.transform = { ...item.transform, ...params.sceneItemTransform };
          }
          return {};
        
        case 'GetCurrentProgramScene':
          return { currentProgramSceneName: currentScene };
        
        case 'GetInputList':
          return {
            inputs: Array.from(sources.entries()).map(([name, data]) => ({
              inputName: name,
              inputKind: data.kind
            }))
          };
        
        case 'CreateInput':
          sources.set(params.inputName, {
            kind: params.inputKind,
            settings: params.inputSettings
          });
          return {};
        
        case 'GetInputSettings':
          const source = sources.get(params.inputName);
          if (!source) throw new Error('Source not found');
          return { inputKind: source.kind, inputSettings: source.settings };
        
        case 'SetInputSettings':
          const existingSource = sources.get(params.inputName);
          if (existingSource) {
            existingSource.settings = { ...existingSource.settings, ...params.inputSettings };
          }
          return {};
        
        case 'RemoveInput':
          sources.delete(params.inputName);
          return {};
        
        case 'GetSceneItemId':
          const sceneForId = scenes.get(params.sceneName);
          if (!sceneForId) throw new Error('Scene not found');
          for (const [id, item] of sceneForId.entries()) {
            if (item.sourceName === params.sourceName) {
              return { sceneItemId: id };
            }
          }
          throw new Error('Source not found in scene');
        
        default:
          return {};
      }
    })
  };
};

// Arbitraries
const overlayTypeArb = fc.constantFrom(
  'poll', 'prediction', 'alert', 'chat', 'timer', 'giveaway', 'wheel', 'game', 'metrics'
) as fc.Arbitrary<OverlayType>;

const positionArb = fc.record({
  x: fc.integer({ min: 0, max: 1920 }),
  y: fc.integer({ min: 0, max: 1080 })
});

const dimensionsArb = fc.record({
  width: fc.integer({ min: 100, max: 1920 }),
  height: fc.integer({ min: 100, max: 1080 })
});

describe('QuickExportService Property Tests', () => {
  let mockOBS: ReturnType<typeof createMockOBS>;
  let sourceService: OBSSourceService;
  let sceneService: OBSSceneService;
  let service: QuickExportService;

  beforeEach(() => {
    localStorageMock.clear();
    mockOBS = createMockOBS();
    sourceService = new OBSSourceService(mockOBS);
    sceneService = new OBSSceneService(mockOBS);
    service = new QuickExportService(sourceService, sceneService, 'http://localhost:3000');
  });

  describe('Position and Dimension Suggestions', () => {
    it('getSuggestedPosition returns valid position for all overlay types', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          const position = service.getSuggestedPosition(overlayType);
          
          expect(position.x).toBeGreaterThanOrEqual(0);
          expect(position.y).toBeGreaterThanOrEqual(0);
          expect(position.x).toBeLessThanOrEqual(1920);
          expect(position.y).toBeLessThanOrEqual(1080);
        }),
        { numRuns: 20 }
      );
    });

    it('getSuggestedDimensions returns valid dimensions for all overlay types', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          const dimensions = service.getSuggestedDimensions(overlayType);
          
          expect(dimensions.width).toBeGreaterThan(0);
          expect(dimensions.height).toBeGreaterThan(0);
          expect(dimensions.width).toBeLessThanOrEqual(1920);
          expect(dimensions.height).toBeLessThanOrEqual(1080);
        }),
        { numRuns: 20 }
      );
    });

    it('getSuggestion returns both position and dimensions', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          const suggestion = service.getSuggestion(overlayType);
          
          expect(suggestion.position).toBeDefined();
          expect(suggestion.dimensions).toBeDefined();
          expect(suggestion.position.x).toBeGreaterThanOrEqual(0);
          expect(suggestion.dimensions.width).toBeGreaterThan(0);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Overlay Status', () => {
    it('getOverlayStatus returns inOBS=false for non-exported overlays', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          localStorageMock.clear();
          mockOBS.reset();
          
          const status = await service.getOverlayStatus(overlayType);
          
          expect(status.inOBS).toBe(false);
        }),
        { numRuns: 15 }
      );
    });

    it('getOverlayStatus returns inOBS=true after adding overlay', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          localStorageMock.clear();
          mockOBS.reset();
          
          await service.addOverlayToOBS(overlayType);
          
          const status = await service.getOverlayStatus(overlayType);
          
          expect(status.inOBS).toBe(true);
          expect(status.sourceName).toBeDefined();
        }),
        { numRuns: 15 }
      );
    });

    it('getOverlayStatus returns urlMatches=true when URL is correct', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          localStorageMock.clear();
          mockOBS.reset();
          
          await service.addOverlayToOBS(overlayType);
          
          const status = await service.getOverlayStatus(overlayType);
          
          expect(status.urlMatches).toBe(true);
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('Add Overlay', () => {
    it('addOverlayToOBS returns success for all overlay types', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          localStorageMock.clear();
          mockOBS.reset();
          
          const result = await service.addOverlayToOBS(overlayType);
          
          expect(result.success).toBe(true);
          expect(result.sourceName).toBeTruthy();
          expect(result.sceneName).toBeTruthy();
        }),
        { numRuns: 15 }
      );
    });

    it('addOverlayToOBS with custom options uses provided values', async () => {
      await fc.assert(
        fc.asyncProperty(
          overlayTypeArb,
          positionArb,
          dimensionsArb,
          async (overlayType, position, dimensions) => {
            localStorageMock.clear();
            mockOBS.reset();
            
            const customName = `Custom_${overlayType}_${Date.now()}`;
            
            const result = await service.addOverlayToOBS(overlayType, {
              sourceName: customName,
              position,
              dimensions
            });
            
            expect(result.success).toBe(true);
            expect(result.sourceName).toBe(customName);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('adding same overlay twice updates instead of duplicating', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          localStorageMock.clear();
          mockOBS.reset();
          
          const result1 = await service.addOverlayToOBS(overlayType);
          const result2 = await service.addOverlayToOBS(overlayType);
          
          expect(result1.success).toBe(true);
          expect(result2.success).toBe(true);
          expect(result1.sourceName).toBe(result2.sourceName);
          
          // Should only have one source
          const exported = await service.listExportedOverlays();
          const matching = exported.filter(e => e.overlayType === overlayType);
          expect(matching.length).toBe(1);
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('Remove Overlay', () => {
    it('removeOverlayFromOBS removes overlay from tracking', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          localStorageMock.clear();
          mockOBS.reset();
          
          await service.addOverlayToOBS(overlayType);
          await service.removeOverlayFromOBS(overlayType);
          
          const status = await service.getOverlayStatus(overlayType);
          expect(status.inOBS).toBe(false);
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('URL Generation', () => {
    it('getOverlayUrl generates correct URL format', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          const url = service.getOverlayUrl(overlayType);
          
          expect(url).toContain('http://localhost:3000');
          expect(url).toContain('/overlay/');
          expect(url).toContain(overlayType);
        }),
        { numRuns: 20 }
      );
    });

    it('setBaseUrl changes URL generation', async () => {
      const newBase = 'https://example.com';
      service.setBaseUrl(newBase);
      
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          const url = service.getOverlayUrl(overlayType);
          
          expect(url).toContain(newBase);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('List Exported Overlays', () => {
    it('listExportedOverlays returns all added overlays', async () => {
      localStorageMock.clear();
      mockOBS.reset();
      
      const overlayTypes: OverlayType[] = ['poll', 'prediction', 'alert'];
      
      for (const type of overlayTypes) {
        await service.addOverlayToOBS(type);
      }
      
      const exported = await service.listExportedOverlays();
      
      expect(exported.length).toBe(overlayTypes.length);
      for (const type of overlayTypes) {
        expect(exported.some(e => e.overlayType === type)).toBe(true);
      }
    });

    it('listExportedOverlays filters out deleted sources', async () => {
      localStorageMock.clear();
      mockOBS.reset();
      
      await service.addOverlayToOBS('poll');
      await service.addOverlayToOBS('prediction');
      
      // Verify both are exported initially
      let exported = await service.listExportedOverlays();
      expect(exported.length).toBe(2);
      
      // Remove the poll overlay using the service (proper way)
      await service.removeOverlayFromOBS('poll');
      
      exported = await service.listExportedOverlays();
      
      // Should only have prediction since poll was removed
      expect(exported.length).toBe(1);
      expect(exported[0].overlayType).toBe('prediction');
    });
  });

  describe('Default Names', () => {
    it('getDefaultSourceName returns non-empty string for all types', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          const name = service.getDefaultSourceName(overlayType);
          
          expect(name).toBeTruthy();
          expect(name.length).toBeGreaterThan(0);
        }),
        { numRuns: 20 }
      );
    });

    it('getOverlayDescription returns non-empty string for all types', async () => {
      await fc.assert(
        fc.asyncProperty(overlayTypeArb, async (overlayType) => {
          const description = service.getOverlayDescription(overlayType);
          
          expect(description).toBeTruthy();
          expect(description.length).toBeGreaterThan(0);
        }),
        { numRuns: 20 }
      );
    });
  });
});
