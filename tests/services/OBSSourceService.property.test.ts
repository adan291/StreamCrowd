// Property tests for OBSSourceService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { OBSSourceService } from '../../src/application/services/OBSSourceService';
import { BrowserSourceConfig, Transform, DEFAULT_TRANSFORM } from '../../types/obs-export';

// Mock OBS WebSocket
const createMockOBS = () => {
  const sources = new Map<string, any>();
  const sceneItems = new Map<string, Map<string, { id: number; transform: Transform }>>();
  const filters = new Map<string, any[]>();
  let sceneItemIdCounter = 1;

  return {
    sources,
    sceneItems,
    filters,
    call: vi.fn(async (method: string, params?: any) => {
      switch (method) {
        case 'GetInputList':
          return {
            inputs: Array.from(sources.entries()).map(([name, data]) => ({
              inputName: name,
              inputKind: data.kind
            }))
          };

        case 'GetInputSettings':
          if (!sources.has(params.inputName)) {
            throw new Error('Source not found');
          }
          const source = sources.get(params.inputName);
          return {
            inputKind: source.kind,
            inputSettings: source.settings
          };

        case 'SetInputSettings':
          if (!sources.has(params.inputName)) {
            throw new Error('Source not found');
          }
          const existing = sources.get(params.inputName);
          if (params.overlay) {
            sources.set(params.inputName, {
              ...existing,
              settings: { ...existing.settings, ...params.inputSettings }
            });
          } else {
            sources.set(params.inputName, {
              ...existing,
              settings: params.inputSettings
            });
          }
          return {};

        case 'CreateInput':
          if (sources.has(params.inputName)) {
            throw new Error('Source already exists');
          }
          sources.set(params.inputName, {
            kind: params.inputKind,
            settings: params.inputSettings
          });
          // Add to scene
          if (!sceneItems.has(params.sceneName)) {
            sceneItems.set(params.sceneName, new Map());
          }
          sceneItems.get(params.sceneName)!.set(params.inputName, {
            id: sceneItemIdCounter++,
            transform: { ...DEFAULT_TRANSFORM }
          });
          return {};

        case 'RemoveInput':
          if (!sources.has(params.inputName)) {
            throw new Error('Source not found');
          }
          sources.delete(params.inputName);
          // Remove from all scenes
          for (const scene of sceneItems.values()) {
            scene.delete(params.inputName);
          }
          return {};

        case 'GetSceneList':
          const sceneNames = Array.from(sceneItems.keys());
          if (sceneNames.length === 0) {
            // Create default scene
            sceneItems.set('Scene', new Map());
            return { scenes: [{ sceneName: 'Scene' }] };
          }
          return {
            scenes: sceneNames.map(name => ({ sceneName: name }))
          };

        case 'GetSceneItemId':
          const sceneData = sceneItems.get(params.sceneName);
          if (!sceneData || !sceneData.has(params.sourceName)) {
            throw new Error('Scene item not found');
          }
          return { sceneItemId: sceneData.get(params.sourceName)!.id };

        case 'SetSceneItemTransform':
          const scene = sceneItems.get(params.sceneName);
          if (!scene) throw new Error('Scene not found');
          for (const [name, item] of scene.entries()) {
            if (item.id === params.sceneItemId) {
              item.transform = { ...item.transform, ...params.sceneItemTransform };
              return {};
            }
          }
          throw new Error('Scene item not found');

        case 'GetSceneItemTransform':
          const sceneForGet = sceneItems.get(params.sceneName);
          if (!sceneForGet) throw new Error('Scene not found');
          for (const item of sceneForGet.values()) {
            if (item.id === params.sceneItemId) {
              return { sceneItemTransform: item.transform };
            }
          }
          throw new Error('Scene item not found');

        case 'CreateSourceFilter':
          if (!filters.has(params.sourceName)) {
            filters.set(params.sourceName, []);
          }
          filters.get(params.sourceName)!.push({
            filterName: params.filterName,
            filterKind: params.filterKind,
            filterSettings: params.filterSettings,
            filterEnabled: true
          });
          return {};

        case 'SetSourceFilterEnabled':
          const sourceFilters = filters.get(params.sourceName);
          if (sourceFilters) {
            const filter = sourceFilters.find(f => f.filterName === params.filterName);
            if (filter) {
              filter.filterEnabled = params.filterEnabled;
            }
          }
          return {};

        case 'RemoveSourceFilter':
          const filtersToModify = filters.get(params.sourceName);
          if (filtersToModify) {
            const idx = filtersToModify.findIndex(f => f.filterName === params.filterName);
            if (idx >= 0) filtersToModify.splice(idx, 1);
          }
          return {};

        case 'GetSourceFilterList':
          return { filters: filters.get(params.sourceName) ?? [] };

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    })
  };
};

// Arbitraries
const browserSourceConfigArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  url: fc.webUrl(),
  width: fc.integer({ min: 100, max: 4096 }),
  height: fc.integer({ min: 100, max: 2160 }),
  fps: fc.option(fc.integer({ min: 1, max: 60 }), { nil: undefined }),
  css: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  shutdownWhenHidden: fc.option(fc.boolean(), { nil: undefined }),
  restartWhenActive: fc.option(fc.boolean(), { nil: undefined })
});

const transformArb = fc.record({
  positionX: fc.float({ min: Math.fround(-2000), max: Math.fround(4000), noNaN: true }),
  positionY: fc.float({ min: Math.fround(-2000), max: Math.fround(4000), noNaN: true }),
  scaleX: fc.float({ min: Math.fround(0.01), max: Math.fround(10), noNaN: true }),
  scaleY: fc.float({ min: Math.fround(0.01), max: Math.fround(10), noNaN: true }),
  rotation: fc.float({ min: Math.fround(0), max: Math.fround(360), noNaN: true }),
  cropTop: fc.integer({ min: 0, max: 500 }),
  cropBottom: fc.integer({ min: 0, max: 500 }),
  cropLeft: fc.integer({ min: 0, max: 500 }),
  cropRight: fc.integer({ min: 0, max: 500 })
});

describe('OBSSourceService Property Tests', () => {
  let mockOBS: ReturnType<typeof createMockOBS>;
  let service: OBSSourceService;

  beforeEach(() => {
    mockOBS = createMockOBS();
    service = new OBSSourceService(mockOBS);
  });

  describe('Property 1: Source Creation Idempotency', () => {
    it('creating same source twice should update instead of duplicate', async () => {
      await fc.assert(
        fc.asyncProperty(browserSourceConfigArb, async (config) => {
          // First creation
          const result1 = await service.createBrowserSource(config);
          expect(result1.success).toBe(true);
          expect(result1.created).toBe(true);
          expect(result1.updated).toBe(false);

          // Second creation with same name
          const result2 = await service.createBrowserSource(config);
          expect(result2.success).toBe(true);
          expect(result2.created).toBe(false);
          expect(result2.updated).toBe(true);

          // Should only have one source
          const sources = await service.listSources();
          const matchingSources = sources.filter(s => s.name === config.name);
          expect(matchingSources.length).toBe(1);
        }),
        { numRuns: 20 }
      );
    });

    it('updating source preserves name but changes settings', async () => {
      await fc.assert(
        fc.asyncProperty(
          browserSourceConfigArb,
          fc.webUrl(),
          async (config, newUrl) => {
            await service.createBrowserSource(config);
            
            await service.updateBrowserSource(config.name, { url: newUrl });
            
            const settings = await service.getSourceSettings(config.name);
            expect(settings.settings.url).toBe(newUrl);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 4: Transform Preservation', () => {
    it('set transform then get should return same values', async () => {
      await fc.assert(
        fc.asyncProperty(
          browserSourceConfigArb,
          transformArb,
          async (config, transform) => {
            // Create source first
            await service.createBrowserSource(config);
            
            const sceneName = 'Scene';
            
            // Set transform
            await service.setSourceTransform(sceneName, config.name, transform);
            
            // Get transform
            const retrieved = await service.getSourceTransform(sceneName, config.name);
            
            // Compare with tolerance for floating point
            expect(retrieved.positionX).toBeCloseTo(transform.positionX, 2);
            expect(retrieved.positionY).toBeCloseTo(transform.positionY, 2);
            expect(retrieved.scaleX).toBeCloseTo(transform.scaleX, 2);
            expect(retrieved.scaleY).toBeCloseTo(transform.scaleY, 2);
            expect(retrieved.rotation).toBeCloseTo(transform.rotation, 2);
            expect(retrieved.cropTop).toBe(transform.cropTop);
            expect(retrieved.cropBottom).toBe(transform.cropBottom);
            expect(retrieved.cropLeft).toBe(transform.cropLeft);
            expect(retrieved.cropRight).toBe(transform.cropRight);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('multiple transform updates should preserve last value', async () => {
      await fc.assert(
        fc.asyncProperty(
          browserSourceConfigArb,
          fc.array(transformArb, { minLength: 2, maxLength: 5 }),
          async (config, transforms) => {
            await service.createBrowserSource(config);
            const sceneName = 'Scene';
            
            // Apply all transforms
            for (const transform of transforms) {
              await service.setSourceTransform(sceneName, config.name, transform);
            }
            
            // Get final transform
            const final = await service.getSourceTransform(sceneName, config.name);
            const lastTransform = transforms[transforms.length - 1];
            
            expect(final.positionX).toBeCloseTo(lastTransform.positionX, 2);
            expect(final.positionY).toBeCloseTo(lastTransform.positionY, 2);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Duplicate Detection', () => {
    it('sourceExists returns true for existing sources', async () => {
      await fc.assert(
        fc.asyncProperty(browserSourceConfigArb, async (config) => {
          // Clean up any existing source with this name first
          try {
            await service.deleteBrowserSource(config.name);
          } catch {
            // Ignore if doesn't exist
          }
          
          expect(await service.sourceExists(config.name)).toBe(false);
          
          await service.createBrowserSource(config);
          
          expect(await service.sourceExists(config.name)).toBe(true);
          
          // Clean up
          await service.deleteBrowserSource(config.name);
        }),
        { numRuns: 20 }
      );
    });

    it('sourceExists returns false after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(browserSourceConfigArb, async (config) => {
          // Clean up any existing source with this name first
          try {
            await service.deleteBrowserSource(config.name);
          } catch {
            // Ignore if doesn't exist
          }
          
          await service.createBrowserSource(config);
          expect(await service.sourceExists(config.name)).toBe(true);
          
          await service.deleteBrowserSource(config.name);
          expect(await service.sourceExists(config.name)).toBe(false);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Filter Management', () => {
    it('added filters can be retrieved', async () => {
      await fc.assert(
        fc.asyncProperty(
          browserSourceConfigArb,
          fc.string({ minLength: 1, maxLength: 30 }),
          async (config, filterName) => {
            await service.createBrowserSource(config);
            
            await service.addFilter(config.name, {
              name: filterName,
              type: 'color_correction_filter',
              settings: { brightness: 0.5 },
              enabled: true
            });
            
            const filters = await service.getFilters(config.name);
            expect(filters.some(f => f.name === filterName)).toBe(true);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('removed filters are no longer retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          browserSourceConfigArb,
          fc.string({ minLength: 1, maxLength: 30 }),
          async (config, filterName) => {
            await service.createBrowserSource(config);
            
            await service.addFilter(config.name, {
              name: filterName,
              type: 'crop_filter',
              settings: {},
              enabled: true
            });
            
            await service.removeFilter(config.name, filterName);
            
            const filters = await service.getFilters(config.name);
            expect(filters.some(f => f.name === filterName)).toBe(false);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Source Listing', () => {
    it('listSources returns all created sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(browserSourceConfigArb, { minLength: 1, maxLength: 5 })
            .map(configs => {
              // Ensure unique names
              const seen = new Set<string>();
              return configs.filter(c => {
                if (seen.has(c.name)) return false;
                seen.add(c.name);
                return true;
              });
            })
            .filter(configs => configs.length > 0),
          async (configs) => {
            for (const config of configs) {
              await service.createBrowserSource(config);
            }
            
            const sources = await service.listSources();
            
            for (const config of configs) {
              expect(sources.some(s => s.name === config.name)).toBe(true);
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});
