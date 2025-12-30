// Property tests for ConfigSyncService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ConfigSyncService } from '../../src/application/services/ConfigSyncService';
import { OBSSceneService } from '../../src/application/services/OBSSceneService';
import { OBSSourceService } from '../../src/application/services/OBSSourceService';
import { OBSConfig, DEFAULT_TRANSFORM } from '../../types/obs-export';

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

// Mock OBS WebSocket
const createMockOBS = () => {
  const scenes = new Map<string, Map<number, any>>();
  const sources = new Map<string, any>();
  let sceneItemIdCounter = 1;

  return {
    scenes,
    sources,
    reset: () => {
      scenes.clear();
      sources.clear();
      sceneItemIdCounter = 1;
    },
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
        
        case 'RemoveInput':
          sources.delete(params.inputName);
          return {};
        
        default:
          return {};
      }
    })
  };
};

// Arbitraries
const sceneNameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);
const sourceNameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);

const sceneItemConfigArb = fc.record({
  sourceName: sourceNameArb,
  sourceType: fc.constantFrom('browser_source', 'color_source') as fc.Arbitrary<'browser_source' | 'color_source'>,
  transform: fc.constant({ ...DEFAULT_TRANSFORM }),
  enabled: fc.boolean(),
  locked: fc.boolean(),
  filters: fc.constant([])
});

const sceneConfigArb = fc.record({
  name: sceneNameArb,
  items: fc.array(sceneItemConfigArb, { minLength: 0, maxLength: 3 })
});

const sourceConfigArb = fc.record({
  name: sourceNameArb,
  type: fc.constantFrom('browser_source', 'color_source') as fc.Arbitrary<'browser_source' | 'color_source'>,
  settings: fc.constant({})
});

const obsConfigArb = fc.record({
  version: fc.constant('1.0.0'),
  exportedAt: fc.constant(Date.now()),
  scenes: fc.array(sceneConfigArb, { minLength: 1, maxLength: 3 })
    .map(scenes => {
      // Ensure unique scene names
      const seen = new Set<string>();
      return scenes.filter(s => {
        if (seen.has(s.name)) return false;
        seen.add(s.name);
        return true;
      });
    }),
  sources: fc.array(sourceConfigArb, { minLength: 0, maxLength: 5 })
    .map(sources => {
      // Ensure unique source names
      const seen = new Set<string>();
      return sources.filter(s => {
        if (seen.has(s.name)) return false;
        seen.add(s.name);
        return true;
      });
    }),
  transitions: fc.constant([])
});

describe('ConfigSyncService Property Tests', () => {
  let mockOBS: ReturnType<typeof createMockOBS>;
  let sceneService: OBSSceneService;
  let sourceService: OBSSourceService;
  let service: ConfigSyncService;

  beforeEach(() => {
    localStorageMock.clear();
    mockOBS = createMockOBS();
    sceneService = new OBSSceneService(mockOBS);
    sourceService = new OBSSourceService(mockOBS);
    service = new ConfigSyncService(sceneService, sourceService);
  });

  describe('Property 3: Backup Restoration Integrity', () => {
    it('restored backup matches original config scene count', async () => {
      await fc.assert(
        fc.asyncProperty(obsConfigArb, async (config) => {
          // Fresh mock for each iteration
          localStorageMock.clear();
          mockOBS.reset();
          
          if (config.scenes.length === 0) return;

          // Import config first
          await service.importConfig(config, { createBackup: false, replaceExisting: true });
          
          // Create backup
          const backup = await service.createBackup('Test backup');
          
          // Clear everything
          mockOBS.reset();
          
          // Restore backup
          await service.restoreBackup(backup.id);
          
          // Export current state
          const exported = await service.exportConfig();
          
          // Scene count should match
          expect(exported.scenes.length).toBe(config.scenes.length);
        }),
        { numRuns: 10 }
      );
    });

    it('backup contains all scenes from export', async () => {
      await fc.assert(
        fc.asyncProperty(obsConfigArb, async (config) => {
          // Fresh mock for each iteration
          localStorageMock.clear();
          mockOBS.reset();
          
          if (config.scenes.length === 0) return;

          await service.importConfig(config, { createBackup: false, replaceExisting: true });
          
          const backup = await service.createBackup();
          
          expect(backup.config.scenes.length).toBe(config.scenes.length);
          
          for (const scene of config.scenes) {
            expect(backup.config.scenes.some(s => s.name === scene.name)).toBe(true);
          }
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 5: Config Export/Import Roundtrip', () => {
    it('export then import preserves scene names', async () => {
      await fc.assert(
        fc.asyncProperty(obsConfigArb, async (config) => {
          // Fresh mock for each iteration
          localStorageMock.clear();
          mockOBS.reset();
          
          if (config.scenes.length === 0) return;

          // Import original config
          await service.importConfig(config, { createBackup: false, replaceExisting: true });
          
          // Export
          const exported = await service.exportConfig();
          
          // Clear and reimport
          mockOBS.reset();
          await service.importConfig(exported, { createBackup: false, replaceExisting: true });
          
          // Export again
          const reexported = await service.exportConfig();
          
          // Scene names should match
          const originalNames = new Set(exported.scenes.map(s => s.name));
          const reimportedNames = new Set(reexported.scenes.map(s => s.name));
          
          expect(reimportedNames.size).toBe(originalNames.size);
          for (const name of originalNames) {
            expect(reimportedNames.has(name)).toBe(true);
          }
        }),
        { numRuns: 10 }
      );
    });

    it('import with prefix adds prefix to all names', async () => {
      await fc.assert(
        fc.asyncProperty(
          obsConfigArb,
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\w+$/.test(s)),
          async (config, prefix) => {
            // Fresh mock for each iteration
            localStorageMock.clear();
            mockOBS.reset();
            
            if (config.scenes.length === 0) return;

            const result = await service.importConfig(config, {
              createBackup: false,
              replaceExisting: true,
              prefix: prefix + '_'
            });
            
            const exported = await service.exportConfig();
            
            // All imported scenes should have prefix
            for (const scene of exported.scenes) {
              expect(scene.name.startsWith(prefix + '_')).toBe(true);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Backup Management', () => {
    it('created backups appear in listBackups', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (description) => {
            const backup = await service.createBackup(description);
            
            const backups = await service.listBackups();
            expect(backups.some(b => b.id === backup.id)).toBe(true);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('deleted backups no longer appear in listBackups', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (description) => {
            const backup = await service.createBackup(description);
            await service.deleteBackup(backup.id);
            
            const backups = await service.listBackups();
            expect(backups.some(b => b.id === backup.id)).toBe(false);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('backup limit is enforced', async () => {
      // Create more than MAX_BACKUPS (10)
      for (let i = 0; i < 15; i++) {
        await service.createBackup(`Backup ${i}`);
      }
      
      const backups = await service.listBackups();
      expect(backups.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Change Detection', () => {
    it('detectChanges finds added scenes', async () => {
      await fc.assert(
        fc.asyncProperty(sceneNameArb, async (sceneName) => {
          const uniqueName = `${sceneName}_${Date.now()}`;
          
          // Get initial state
          const initial = await service.exportConfig();
          
          // Add a scene
          await sceneService.createScene(uniqueName);
          
          // Detect changes
          const diff = await service.detectChanges(initial);
          
          expect(diff.added.some(d => d.name === uniqueName && d.type === 'scene')).toBe(true);
        }),
        { numRuns: 15 }
      );
    });

    it('detectChanges finds removed scenes', async () => {
      await fc.assert(
        fc.asyncProperty(sceneNameArb, async (sceneName) => {
          const uniqueName = `${sceneName}_${Date.now()}`;
          
          // Create scene
          await sceneService.createScene(uniqueName);
          
          // Get state with scene
          const withScene = await service.exportConfig();
          
          // Remove scene
          await sceneService.deleteScene(uniqueName);
          
          // Detect changes
          const diff = await service.detectChanges(withScene);
          
          expect(diff.removed.some(d => d.name === uniqueName && d.type === 'scene')).toBe(true);
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('Conflict Detection', () => {
    it('detectConflicts finds name collisions', async () => {
      await fc.assert(
        fc.asyncProperty(sceneNameArb, async (sceneName) => {
          const uniqueName = `${sceneName}_${Date.now()}`;
          
          // Create existing scene
          await sceneService.createScene(uniqueName);
          
          // Create config with same scene name
          const config: OBSConfig = {
            version: '1.0.0',
            exportedAt: Date.now(),
            scenes: [{ name: uniqueName, items: [] }],
            sources: [],
            transitions: []
          };
          
          const conflicts = await service.detectConflicts(config);
          
          expect(conflicts.some(c => c.item === uniqueName && c.type === 'name_collision')).toBe(true);
        }),
        { numRuns: 15 }
      );
    });

    it('resolveConflict with rename changes name', async () => {
      const config: OBSConfig = {
        version: '1.0.0',
        exportedAt: Date.now(),
        scenes: [{ name: 'TestScene', items: [] }],
        sources: [],
        transitions: []
      };
      
      const conflict = {
        type: 'name_collision' as const,
        item: 'TestScene',
        details: 'Scene exists',
        suggestions: []
      };
      
      const resolved = service.resolveConflict(config, conflict, {
        action: 'rename',
        newName: 'TestScene_renamed',
        description: 'Rename'
      });
      
      expect(resolved.scenes[0].name).toBe('TestScene_renamed');
    });

    it('resolveConflict with skip removes item', async () => {
      const config: OBSConfig = {
        version: '1.0.0',
        exportedAt: Date.now(),
        scenes: [
          { name: 'Scene1', items: [] },
          { name: 'Scene2', items: [] }
        ],
        sources: [],
        transitions: []
      };
      
      const conflict = {
        type: 'name_collision' as const,
        item: 'Scene1',
        details: 'Scene exists',
        suggestions: []
      };
      
      const resolved = service.resolveConflict(config, conflict, {
        action: 'skip',
        description: 'Skip'
      });
      
      expect(resolved.scenes.length).toBe(1);
      expect(resolved.scenes[0].name).toBe('Scene2');
    });
  });
});
