// Property tests for TemplateService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { TemplateService } from '../../src/application/services/TemplateService';
import { OBSSceneService } from '../../src/application/services/OBSSceneService';
import { OBSSourceService } from '../../src/application/services/OBSSourceService';
import { SceneTemplate, DEFAULT_TRANSFORM } from '../../types/obs-export';

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

// Mock OBS WebSocket for services
const createMockOBS = () => {
  const scenes = new Map<string, Map<number, any>>();
  const sources = new Map<string, any>();
  const filters = new Map<string, any[]>();
  let sceneItemIdCounter = 1;

  return {
    scenes,
    sources,
    filters,
    call: vi.fn(async (method: string, params?: any) => {
      switch (method) {
        case 'GetSceneList':
          return { scenes: Array.from(scenes.keys()).map(name => ({ sceneName: name })) };
        
        case 'CreateScene':
          if (scenes.has(params.sceneName)) throw new Error('Scene exists');
          scenes.set(params.sceneName, new Map());
          return {};
        
        case 'RemoveScene':
          scenes.delete(params.sceneName);
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
        
        case 'SetSceneItemTransform':
          const sceneForTransform = scenes.get(params.sceneName);
          if (sceneForTransform) {
            const item = sceneForTransform.get(params.sceneItemId);
            if (item) item.transform = { ...item.transform, ...params.sceneItemTransform };
          }
          return {};
        
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
        
        case 'CreateSourceFilter':
          if (!filters.has(params.sourceName)) filters.set(params.sourceName, []);
          filters.get(params.sourceName)!.push({
            filterName: params.filterName,
            filterKind: params.filterKind,
            filterSettings: params.filterSettings,
            filterEnabled: true
          });
          return {};
        
        default:
          return {};
      }
    })
  };
};

// Arbitraries
const templateVariableArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^\w+$/.test(s)),
  type: fc.constantFrom('string', 'number', 'url', 'color') as fc.Arbitrary<'string' | 'number' | 'url' | 'color'>,
  label: fc.string({ minLength: 1, maxLength: 50 }),
  defaultValue: fc.string({ maxLength: 100 })
});

const templateSceneItemArb = fc.record({
  sourceType: fc.constantFrom('browser_source', 'color_source', 'text_gdi_plus') as fc.Arbitrary<'browser_source' | 'color_source' | 'text_gdi_plus'>,
  sourceName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  settings: fc.constant({}),
  transform: fc.constant({ ...DEFAULT_TRANSFORM })
});

const templateSceneArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  items: fc.array(templateSceneItemArb, { minLength: 1, maxLength: 3 })
});

const customTemplateArb = fc.record({
  id: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  description: fc.string({ maxLength: 200 }),
  category: fc.constantFrom('gaming', 'just_chatting', 'irl', 'creative', 'custom') as fc.Arbitrary<'gaming' | 'just_chatting' | 'irl' | 'creative' | 'custom'>,
  builtIn: fc.constant(false),
  scenes: fc.array(templateSceneArb, { minLength: 1, maxLength: 3 }),
  variables: fc.array(templateVariableArb, { maxLength: 3 }),
  createdAt: fc.constant(Date.now()),
  updatedAt: fc.constant(Date.now())
});

describe('TemplateService Property Tests', () => {
  let mockOBS: ReturnType<typeof createMockOBS>;
  let sceneService: OBSSceneService;
  let sourceService: OBSSourceService;
  let service: TemplateService;

  beforeEach(() => {
    localStorageMock.clear();
    mockOBS = createMockOBS();
    sceneService = new OBSSceneService(mockOBS);
    sourceService = new OBSSourceService(mockOBS);
    service = new TemplateService(sceneService, sourceService);
  });

  describe('Property 2: Template Application Completeness', () => {
    it('applyTemplate creates all scenes from template', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          // Ensure unique scene names
          const uniqueScenes = template.scenes.filter((s, i, arr) => 
            arr.findIndex(x => x.name === s.name) === i
          );
          template.scenes = uniqueScenes;
          
          if (template.scenes.length === 0) return;

          const result = await service.applyTemplate(template, { replaceExisting: true });
          
          // All scenes should be created
          for (const scene of template.scenes) {
            expect(result.scenesCreated).toContain(scene.name);
          }
        }),
        { numRuns: 15 }
      );
    });

    it('applyTemplate with prefix adds prefix to all names', async () => {
      await fc.assert(
        fc.asyncProperty(
          customTemplateArb,
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\w+$/.test(s)),
          async (template, prefix) => {
            const uniqueScenes = template.scenes.filter((s, i, arr) => 
              arr.findIndex(x => x.name === s.name) === i
            );
            template.scenes = uniqueScenes;
            
            if (template.scenes.length === 0) return;

            const result = await service.applyTemplate(template, { 
              prefix: prefix + '_',
              replaceExisting: true 
            });
            
            // All created scenes should have prefix
            for (const sceneName of result.scenesCreated) {
              expect(sceneName.startsWith(prefix + '_')).toBe(true);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('dry run does not create actual scenes', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          const uniqueScenes = template.scenes.filter((s, i, arr) => 
            arr.findIndex(x => x.name === s.name) === i
          );
          template.scenes = uniqueScenes;
          
          if (template.scenes.length === 0) return;

          const result = await service.applyTemplate(template, { dryRun: true });
          
          // Should report scenes but not actually create them
          expect(result.scenesCreated.length).toBe(template.scenes.length);
          
          // Verify no scenes were actually created
          const scenes = await sceneService.listScenes();
          for (const scene of template.scenes) {
            expect(scenes.some(s => s.name === scene.name)).toBe(false);
          }
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('Import/Export Roundtrip', () => {
    it('exported template can be imported back', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          // Save as custom template first
          await service.saveCustomTemplate(template);
          
          // Export
          const json = await service.exportTemplate(template.id);
          
          // Import (creates new template with different ID)
          const imported = await service.importTemplate(json);
          
          // Core properties should match
          expect(imported.name).toBe(template.name);
          expect(imported.description).toBe(template.description);
          expect(imported.category).toBe(template.category);
          expect(imported.scenes.length).toBe(template.scenes.length);
        }),
        { numRuns: 15 }
      );
    });

    it('import generates unique ID', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          await service.saveCustomTemplate(template);
          const json = await service.exportTemplate(template.id);
          
          const imported1 = await service.importTemplate(json);
          const imported2 = await service.importTemplate(json);
          
          expect(imported1.id).not.toBe(imported2.id);
          expect(imported1.id).not.toBe(template.id);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Built-in Templates', () => {
    it('getBuiltInTemplates returns 4 templates', () => {
      const templates = service.getBuiltInTemplates();
      expect(templates.length).toBe(4);
    });

    it('all built-in templates have required fields', () => {
      const templates = service.getBuiltInTemplates();
      
      for (const template of templates) {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(template.scenes.length).toBeGreaterThan(0);
        expect(template.builtIn).toBe(true);
      }
    });

    it('built-in templates cover all categories', () => {
      const templates = service.getBuiltInTemplates();
      const categories = new Set(templates.map(t => t.category));
      
      expect(categories.has('gaming')).toBe(true);
      expect(categories.has('just_chatting')).toBe(true);
      expect(categories.has('irl')).toBe(true);
      expect(categories.has('creative')).toBe(true);
    });
  });

  describe('Custom Templates CRUD', () => {
    it('saved templates can be retrieved', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          await service.saveCustomTemplate(template);
          
          const templates = await service.getCustomTemplates();
          expect(templates.some(t => t.id === template.id)).toBe(true);
        }),
        { numRuns: 15 }
      );
    });

    it('deleted templates are removed', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          await service.saveCustomTemplate(template);
          await service.deleteCustomTemplate(template.id);
          
          const templates = await service.getCustomTemplates();
          expect(templates.some(t => t.id === template.id)).toBe(false);
        }),
        { numRuns: 15 }
      );
    });

    it('updating template preserves ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          customTemplateArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          async (template, newName) => {
            await service.saveCustomTemplate(template);
            
            const updated = { ...template, name: newName };
            await service.saveCustomTemplate(updated);
            
            const templates = await service.getCustomTemplates();
            const found = templates.find(t => t.id === template.id);
            
            expect(found).toBeDefined();
            expect(found?.name).toBe(newName);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Template Preview', () => {
    it('preview returns correct scene count', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          const preview = service.previewTemplate(template);
          
          expect(preview.scenes.length).toBe(template.scenes.length);
        }),
        { numRuns: 20 }
      );
    });

    it('preview calculates total sources correctly', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          const preview = service.previewTemplate(template);
          
          const expectedTotal = template.scenes.reduce((sum, s) => sum + s.items.length, 0);
          expect(preview.totalSources).toBe(expectedTotal);
        }),
        { numRuns: 20 }
      );
    });

    it('preview includes all variables', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          const preview = service.previewTemplate(template);
          
          expect(preview.variables.length).toBe(template.variables.length);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Template Customization', () => {
    it('customizeTemplate applies prefix to scene names', async () => {
      await fc.assert(
        fc.asyncProperty(
          customTemplateArb,
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\w+$/.test(s)),
          async (template, prefix) => {
            const customized = service.customizeTemplate(template, {
              variableValues: {},
              prefix: prefix + '_'
            });
            
            for (const scene of customized.scenes) {
              expect(scene.name.startsWith(prefix + '_')).toBe(true);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('customizeTemplate filters selected scenes', async () => {
      await fc.assert(
        fc.asyncProperty(customTemplateArb, async (template) => {
          if (template.scenes.length < 2) return;
          
          const selectedScenes = [template.scenes[0].name];
          const customized = service.customizeTemplate(template, {
            variableValues: {},
            selectedScenes
          });
          
          expect(customized.scenes.length).toBe(1);
          expect(customized.scenes[0].name).toBe(template.scenes[0].name);
        }),
        { numRuns: 15 }
      );
    });
  });
});
