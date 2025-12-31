/**
 * OBS WebSocket Mock
 * Mocks OBS WebSocket connections for testing
 */

import { Page } from '@playwright/test';

export interface OBSMockConfig {
  scenes?: string[];
  currentScene?: string;
  sources?: Array<{ name: string; type: string; visible: boolean }>;
  isConnected?: boolean;
}

const defaultConfig: OBSMockConfig = {
  scenes: ['Scene 1', 'Scene 2', 'Game Scene', 'BRB'],
  currentScene: 'Scene 1',
  sources: [
    { name: 'Camera', type: 'video_capture', visible: true },
    { name: 'Game Capture', type: 'game_capture', visible: true },
    { name: 'Chat Overlay', type: 'browser_source', visible: true },
    { name: 'Alert Box', type: 'browser_source', visible: true },
  ],
  isConnected: true,
};

/**
 * Setup OBS WebSocket mock
 */
export async function setupOBSMock(page: Page, config: OBSMockConfig = {}): Promise<void> {
  const mockConfig = { ...defaultConfig, ...config };

  await page.addInitScript((cfg) => {
    // Store mock state
    const state = {
      scenes: cfg.scenes || [],
      currentScene: cfg.currentScene || cfg.scenes?.[0] || 'Scene 1',
      sources: cfg.sources || [],
      isConnected: cfg.isConnected ?? true,
    };

    // Mock OBSWebSocket class
    class MockOBSWebSocket {
      private handlers: Map<string, Set<Function>> = new Map();
      private connected = false;

      async connect(url?: string, password?: string): Promise<void> {
        if (!state.isConnected) {
          throw new Error('Connection refused');
        }
        this.connected = true;
        this.emit('ConnectionOpened');
        this.emit('Identified', { negotiatedRpcVersion: 1 });
      }

      async disconnect(): Promise<void> {
        this.connected = false;
        this.emit('ConnectionClosed');
      }

      async call(requestType: string, requestData?: any): Promise<any> {
        if (!this.connected) {
          throw new Error('Not connected');
        }

        switch (requestType) {
          case 'GetVersion':
            return {
              obsVersion: '29.0.0',
              obsWebSocketVersion: '5.0.0',
              rpcVersion: 1,
            };

          case 'GetSceneList':
            return {
              currentProgramSceneName: state.currentScene,
              currentPreviewSceneName: null,
              scenes: state.scenes.map((name, i) => ({
                sceneName: name,
                sceneIndex: i,
              })),
            };

          case 'GetCurrentProgramScene':
            return {
              currentProgramSceneName: state.currentScene,
            };

          case 'SetCurrentProgramScene':
            state.currentScene = requestData?.sceneName || state.currentScene;
            this.emit('CurrentProgramSceneChanged', {
              sceneName: state.currentScene,
            });
            return {};

          case 'GetSceneItemList':
            return {
              sceneItems: state.sources.map((source, i) => ({
                sceneItemId: i + 1,
                sourceName: source.name,
                sourceType: source.type,
                sceneItemEnabled: source.visible,
              })),
            };

          case 'SetSceneItemEnabled':
            const sourceIndex = state.sources.findIndex(
              s => s.name === requestData?.sourceName
            );
            if (sourceIndex >= 0) {
              state.sources[sourceIndex].visible = requestData?.sceneItemEnabled ?? true;
            }
            return {};

          case 'GetInputList':
            return {
              inputs: state.sources.map(s => ({
                inputName: s.name,
                inputKind: s.type,
              })),
            };

          case 'CreateInput':
            state.sources.push({
              name: requestData?.inputName || 'New Source',
              type: requestData?.inputKind || 'browser_source',
              visible: true,
            });
            return { sceneItemId: state.sources.length };

          case 'RemoveInput':
            const removeIndex = state.sources.findIndex(
              s => s.name === requestData?.inputName
            );
            if (removeIndex >= 0) {
              state.sources.splice(removeIndex, 1);
            }
            return {};

          case 'GetStreamStatus':
            return {
              outputActive: true,
              outputReconnecting: false,
              outputTimecode: '00:30:00.000',
              outputDuration: 1800000,
              outputBytes: 1000000000,
            };

          case 'GetRecordStatus':
            return {
              outputActive: false,
              outputPaused: false,
            };

          default:
            console.log(`[OBS Mock] Unhandled request: ${requestType}`);
            return {};
        }
      }

      on(eventName: string, handler: Function): void {
        if (!this.handlers.has(eventName)) {
          this.handlers.set(eventName, new Set());
        }
        this.handlers.get(eventName)!.add(handler);
      }

      off(eventName: string, handler: Function): void {
        this.handlers.get(eventName)?.delete(handler);
      }

      private emit(eventName: string, data?: any): void {
        this.handlers.get(eventName)?.forEach(handler => handler(data));
      }
    }

    // Replace global OBSWebSocket
    (window as any).OBSWebSocket = MockOBSWebSocket;
  }, mockConfig);
}

/**
 * Simulate OBS scene change
 */
export async function simulateSceneChange(page: Page, sceneName: string): Promise<void> {
  await page.evaluate((scene) => {
    window.dispatchEvent(new CustomEvent('obs-scene-change', {
      detail: { sceneName: scene },
    }));
  }, sceneName);
}

/**
 * Simulate OBS connection lost
 */
export async function simulateOBSDisconnect(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('obs-disconnected'));
  });
}

/**
 * Simulate OBS reconnection
 */
export async function simulateOBSReconnect(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('obs-reconnected'));
  });
}

export default {
  setupOBSMock,
  simulateSceneChange,
  simulateOBSDisconnect,
  simulateOBSReconnect,
};
