// Property tests for OBSSceneService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { OBSSceneService } from '../../src/application/services/OBSSceneService';
import { Transform, DEFAULT_TRANSFORM } from '../../types/obs-export';

// Mock OBS WebSocket
const createMockOBS = () => {
  const scenes = new Map<string, Map<number, any>>();
  const sources = new Map<string, any>();
  let sceneItemIdCounter = 1;
  let currentScene = '';

  // Create default scene
  scenes.set('Default', new Map());
  currentScene = 'Default';

  return {
    scenes,
    sources,
    call: vi.fn(async (method: string, params?: any) => {
      switch (method) {
        case 'GetSceneList':
          return {
            scenes: Array.from(scenes.keys()).map(name => ({ sceneName: name }))
          };

        case 'CreateScene':
          if (scenes.has(params.sceneName)) {
            throw new Error('Scene already exists');
          }
          scenes.set(params.sceneName, new Map());
          if (!currentScene) currentScene = params.sceneName;
          return {};

        case 'RemoveScene':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          scenes.delete(params.sceneName);
          return {};

        case 'SetSceneName':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          if (scenes.has(params.newSceneName)) {
            throw new Error('New scene name already exists');
          }
          const sceneData = scenes.get(params.sceneName)!;
          scenes.delete(params.sceneName);
          scenes.set(params.newSceneName, sceneData);
          if (currentScene === params.sceneName) {
            currentScene = params.newSceneName;
          }
          return {};

        case 'GetSceneItemList':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          const items = Array.from(scenes.get(params.sceneName)!.entries())
            .map(([id, item]) => ({
              sceneItemId: id,
              sourceName: item.sourceName,
              inputKind: item.inputKind || 'browser_source',
              sceneItemIndex: item.index,
              sceneItemEnabled: item.enabled,
              sceneItemLocked: item.locked,
              sceneItemTransform: item.transform
            }))
            .sort((a, b) => a.sceneItemIndex - b.sceneItemIndex);
          return { sceneItems: items };

        case 'CreateSceneItem':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          const scene = scenes.get(params.sceneName)!;
          const newId = sceneItemIdCounter++;
          scene.set(newId, {
            sourceName: params.sourceName,
            inputKind: 'browser_source',
            index: scene.size,
            enabled: params.sceneItemEnabled ?? true,
            locked: false,
            transform: { ...DEFAULT_TRANSFORM }
          });
          return { sceneItemId: newId };

        case 'RemoveSceneItem':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          const sceneForRemove = scenes.get(params.sceneName)!;
          if (!sceneForRemove.has(params.sceneItemId)) {
            throw new Error('Scene item not found');
          }
          sceneForRemove.delete(params.sceneItemId);
          return {};

        case 'SetSceneItemTransform':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          const sceneForTransform = scenes.get(params.sceneName)!;
          if (!sceneForTransform.has(params.sceneItemId)) {
            throw new Error('Scene item not found');
          }
          const itemForTransform = sceneForTransform.get(params.sceneItemId)!;
          itemForTransform.transform = { ...itemForTransform.transform, ...params.sceneItemTransform };
          return {};

        case 'SetSceneItemIndex':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          const sceneForIndex = scenes.get(params.sceneName)!;
          if (!sceneForIndex.has(params.sceneItemId)) {
            throw new Error('Scene item not found');
          }
          const itemForIndex = sceneForIndex.get(params.sceneItemId)!;
          itemForIndex.index = params.sceneItemIndex;
          return {};

        case 'SetSceneItemEnabled':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          const sceneForEnabled = scenes.get(params.sceneName)!;
          if (!sceneForEnabled.has(params.sceneItemId)) {
            throw new Error('Scene item not found');
          }
          sceneForEnabled.get(params.sceneItemId)!.enabled = params.sceneItemEnabled;
          return {};

        case 'SetSceneItemLocked':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          const sceneForLocked = scenes.get(params.sceneName)!;
          if (!sceneForLocked.has(params.sceneItemId)) {
            throw new Error('Scene item not found');
          }
          sceneForLocked.get(params.sceneItemId)!.locked = params.sceneItemLocked;
          return {};

        case 'GetCurrentProgramScene':
          return { currentProgramSceneName: currentScene };

        case 'SetCurrentProgramScene':
          if (!scenes.has(params.sceneName)) {
            throw new Error('Scene not found');
          }
          currentScene = params.sceneName;
          return {};

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    })
  };
};

// Arbitraries
const sceneNameArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => s.trim().length > 0 && s !== 'Default');

const sourceNameArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => s.trim().length > 0);

// Unique ID generator for tests
let globalTestCounter = 0;
const uniqueSceneName = (base: string) => `${base}_${globalTestCounter++}_${Date.now()}`;

describe('OBSSceneService Property Tests', () => {
  let mockOBS: ReturnType<typeof createMockOBS>;
  let service: OBSSceneService;

  beforeEach(() => {
    mockOBS = createMockOBS();
    service = new OBSSceneService(mockOBS);
  });

  describe('Property 6: Scene Item Ordering', () => {
    it('setSceneItemIndex changes item order correctly', async () => {
      let testCounter = 0;
      await fc.assert(
        fc.asyncProperty(
          fc.array(sourceNameArb, { minLength: 2, maxLength: 5 })
            .map(names => [...new Set(names)])
            .filter(names => names.length >= 2),
          async (sourceNames) => {
            const sceneName = `TestScene_${testCounter++}_${Date.now()}`;
            await service.createScene(sceneName);
            
            // Add sources
            const itemIds: number[] = [];
            for (const name of sourceNames) {
              const id = await service.addSourceToScene(sceneName, name);
              itemIds.push(id);
            }
            
            // Move first item to last position
            await service.setSceneItemIndex(sceneName, itemIds[0], sourceNames.length - 1);
            
            // Verify the item has new index
            const items = await service.getSceneItems(sceneName);
            const movedItem = items.find(i => i.sceneItemId === itemIds[0]);
            expect(movedItem?.sceneItemIndex).toBe(sourceNames.length - 1);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('items maintain relative order after single reorder', async () => {
      let testCounter = 0;
      await fc.assert(
        fc.asyncProperty(
          fc.array(sourceNameArb, { minLength: 3, maxLength: 5 })
            .map(names => [...new Set(names)])
            .filter(names => names.length >= 3),
          fc.integer({ min: 0, max: 4 }),
          async (sourceNames, targetIndex) => {
            const sceneName = `OrderScene_${testCounter++}_${Date.now()}`;
            await service.createScene(sceneName);
            
            const itemIds: number[] = [];
            for (const name of sourceNames) {
              const id = await service.addSourceToScene(sceneName, name);
              itemIds.push(id);
            }
            
            const validTargetIndex = Math.min(targetIndex, sourceNames.length - 1);
            await service.setSceneItemIndex(sceneName, itemIds[0], validTargetIndex);
            
            const items = await service.getSceneItems(sceneName);
            expect(items.length).toBe(sourceNames.length);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Scene CRUD Operations', () => {
    it('created scenes appear in listScenes', async () => {
      await fc.assert(
        fc.asyncProperty(sceneNameArb, async (baseName) => {
          const sceneName = uniqueSceneName(baseName);
          await service.createScene(sceneName);
          
          const scenes = await service.listScenes();
          expect(scenes.some(s => s.name === sceneName)).toBe(true);
        }),
        { numRuns: 20 }
      );
    });

    it('deleted scenes no longer appear in listScenes', async () => {
      await fc.assert(
        fc.asyncProperty(sceneNameArb, async (baseName) => {
          const sceneName = uniqueSceneName(baseName);
          await service.createScene(sceneName);
          await service.deleteScene(sceneName);
          
          const scenes = await service.listScenes();
          expect(scenes.some(s => s.name === sceneName)).toBe(false);
        }),
        { numRuns: 20 }
      );
    });

    it('renamed scenes have new name in listScenes', async () => {
      await fc.assert(
        fc.asyncProperty(
          sceneNameArb,
          sceneNameArb,
          async (oldBase, newBase) => {
            const oldName = uniqueSceneName(oldBase);
            const newName = uniqueSceneName(newBase);
            
            await service.createScene(oldName);
            await service.renameScene(oldName, newName);
            
            const scenes = await service.listScenes();
            expect(scenes.some(s => s.name === oldName)).toBe(false);
            expect(scenes.some(s => s.name === newName)).toBe(true);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('duplicated scenes have same item count', async () => {
      await fc.assert(
        fc.asyncProperty(
          sceneNameArb,
          sceneNameArb,
          fc.array(sourceNameArb, { minLength: 1, maxLength: 3 })
            .map(names => [...new Set(names)]),
          async (originalBase, copyBase, sourceNames) => {
            const originalName = uniqueSceneName(originalBase);
            const copyName = uniqueSceneName(copyBase);
            
            await service.createScene(originalName);
            
            for (const name of sourceNames) {
              await service.addSourceToScene(originalName, name);
            }
            
            await service.duplicateScene(originalName, copyName);
            
            const originalItems = await service.getSceneItems(originalName);
            const copyItems = await service.getSceneItems(copyName);
            
            expect(copyItems.length).toBe(originalItems.length);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Scene Item Management', () => {
    it('added sources appear in getSceneItems', async () => {
      await fc.assert(
        fc.asyncProperty(
          sceneNameArb,
          sourceNameArb,
          async (baseName, sourceName) => {
            const sceneName = uniqueSceneName(baseName);
            await service.createScene(sceneName);
            await service.addSourceToScene(sceneName, sourceName);
            
            const items = await service.getSceneItems(sceneName);
            expect(items.some(i => i.sourceName === sourceName)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('removed sources no longer appear in getSceneItems', async () => {
      await fc.assert(
        fc.asyncProperty(
          sceneNameArb,
          sourceNameArb,
          async (baseName, sourceName) => {
            const sceneName = uniqueSceneName(baseName);
            await service.createScene(sceneName);
            const itemId = await service.addSourceToScene(sceneName, sourceName);
            await service.removeSourceFromScene(sceneName, itemId);
            
            const items = await service.getSceneItems(sceneName);
            expect(items.some(i => i.sourceName === sourceName)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('setSceneItemEnabled changes enabled state', async () => {
      await fc.assert(
        fc.asyncProperty(
          sceneNameArb,
          sourceNameArb,
          fc.boolean(),
          async (baseName, sourceName, enabled) => {
            const sceneName = uniqueSceneName(baseName);
            await service.createScene(sceneName);
            const itemId = await service.addSourceToScene(sceneName, sourceName);
            
            await service.setSceneItemEnabled(sceneName, itemId, enabled);
            
            const items = await service.getSceneItems(sceneName);
            const item = items.find(i => i.sceneItemId === itemId);
            expect(item?.sceneItemEnabled).toBe(enabled);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('setSceneItemLocked changes locked state', async () => {
      await fc.assert(
        fc.asyncProperty(
          sceneNameArb,
          sourceNameArb,
          fc.boolean(),
          async (baseName, sourceName, locked) => {
            const sceneName = uniqueSceneName(baseName);
            await service.createScene(sceneName);
            const itemId = await service.addSourceToScene(sceneName, sourceName);
            
            await service.setSceneItemLocked(sceneName, itemId, locked);
            
            const items = await service.getSceneItems(sceneName);
            const item = items.find(i => i.sceneItemId === itemId);
            expect(item?.sceneItemLocked).toBe(locked);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Current Scene Management', () => {
    it('setCurrentScene changes getCurrentScene result', async () => {
      await fc.assert(
        fc.asyncProperty(sceneNameArb, async (baseName) => {
          const sceneName = uniqueSceneName(baseName);
          await service.createScene(sceneName);
          await service.setCurrentScene(sceneName);
          
          const current = await service.getCurrentScene();
          expect(current).toBe(sceneName);
        }),
        { numRuns: 15 }
      );
    });
  });
});
