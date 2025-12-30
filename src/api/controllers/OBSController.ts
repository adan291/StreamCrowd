// OBS Controller - Endpoints para control de OBS
import {
  APIResponse,
  OBSStatusResponse,
  OBSSceneResponse,
  OBSSourceResponse,
  SwitchSceneRequest,
  SetVisibilityRequest,
  APIException,
  RequestContext
} from '../../../types/api';
import { validateOrThrow, COMMON_SCHEMAS } from '../middleware/validation';

// OBS WebSocket connection reference (injected)
let obsWebSocket: any = null;

export class OBSController {
  setOBSWebSocket(ws: any): void {
    obsWebSocket = ws;
  }

  async getStatus(_context: RequestContext): Promise<APIResponse<OBSStatusResponse>> {
    if (!obsWebSocket) {
      return {
        success: true,
        data: {
          connected: false
        }
      };
    }

    try {
      const version = await obsWebSocket.call('GetVersion');
      const currentScene = await obsWebSocket.call('GetCurrentProgramScene');

      return {
        success: true,
        data: {
          connected: true,
          version: version.obsVersion,
          platform: version.platform,
          currentScene: currentScene.currentProgramSceneName
        }
      };
    } catch {
      return {
        success: true,
        data: { connected: false }
      };
    }
  }

  async getScenes(_context: RequestContext): Promise<APIResponse<OBSSceneResponse[]>> {
    if (!obsWebSocket) {
      throw APIException.serviceUnavailable('OBS is not connected');
    }

    try {
      const response = await obsWebSocket.call('GetSceneList');
      const scenes: OBSSceneResponse[] = response.scenes.map((scene: any, index: number) => ({
        name: scene.sceneName,
        index,
        isCurrent: scene.sceneName === response.currentProgramSceneName
      }));

      return { success: true, data: scenes };
    } catch (error) {
      throw APIException.internal('Failed to get scenes from OBS');
    }
  }

  async switchScene(body: SwitchSceneRequest, _context: RequestContext): Promise<APIResponse<{ switched: boolean; sceneName: string }>> {
    if (!obsWebSocket) {
      throw APIException.serviceUnavailable('OBS is not connected');
    }

    const validated = validateOrThrow(body, COMMON_SCHEMAS.switchScene);

    try {
      await obsWebSocket.call('SetCurrentProgramScene', {
        sceneName: validated.sceneName
      });

      this.emitEvent('obs:scene_changed', { sceneName: validated.sceneName });

      return {
        success: true,
        data: { switched: true, sceneName: validated.sceneName }
      };
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw APIException.notFound('Scene');
      }
      throw APIException.internal('Failed to switch scene');
    }
  }

  async getSources(_context: RequestContext): Promise<APIResponse<OBSSourceResponse[]>> {
    if (!obsWebSocket) {
      throw APIException.serviceUnavailable('OBS is not connected');
    }

    try {
      const sceneList = await obsWebSocket.call('GetSceneList');
      const sources: OBSSourceResponse[] = [];

      for (const scene of sceneList.scenes) {
        const items = await obsWebSocket.call('GetSceneItemList', {
          sceneName: scene.sceneName
        });

        for (const item of items.sceneItems) {
          sources.push({
            name: item.sourceName,
            type: item.inputKind || 'unknown',
            visible: item.sceneItemEnabled,
            sceneName: scene.sceneName
          });
        }
      }

      return { success: true, data: sources };
    } catch (error) {
      throw APIException.internal('Failed to get sources from OBS');
    }
  }

  async setSourceVisibility(
    sourceName: string,
    body: SetVisibilityRequest,
    _context: RequestContext
  ): Promise<APIResponse<{ sourceName: string; visible: boolean }>> {
    if (!obsWebSocket) {
      throw APIException.serviceUnavailable('OBS is not connected');
    }

    const validated = validateOrThrow(body, COMMON_SCHEMAS.setVisibility);

    try {
      // Get current scene if not specified
      let sceneName = validated.sceneName;
      if (!sceneName) {
        const current = await obsWebSocket.call('GetCurrentProgramScene');
        sceneName = current.currentProgramSceneName;
      }

      // Find the scene item ID
      const items = await obsWebSocket.call('GetSceneItemList', { sceneName });
      const item = items.sceneItems.find((i: any) => i.sourceName === sourceName);

      if (!item) {
        throw APIException.notFound('Source');
      }

      // Set visibility
      await obsWebSocket.call('SetSceneItemEnabled', {
        sceneName,
        sceneItemId: item.sceneItemId,
        sceneItemEnabled: validated.visible
      });

      return {
        success: true,
        data: { sourceName, visible: validated.visible }
      };
    } catch (error) {
      if (error instanceof APIException) throw error;
      throw APIException.internal('Failed to set source visibility');
    }
  }

  private emitEvent(type: string, data: any): void {
    console.log(`[API Event] ${type}:`, data);
  }
}

let instance: OBSController | null = null;
export function getOBSController(): OBSController {
  if (!instance) instance = new OBSController();
  return instance;
}
