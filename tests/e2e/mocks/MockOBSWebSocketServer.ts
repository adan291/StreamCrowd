/**
 * Mock OBS WebSocket Server for E2E Tests
 * 
 * Simulates OBS WebSocket protocol for testing OBS integration
 * without requiring a real OBS instance.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createHash } from 'crypto';

export interface MockOBSScene {
  sceneName: string;
  sceneIndex: number;
  sources?: MockOBSSource[];
}

export interface MockOBSSource {
  sourceName: string;
  sourceType: string;
  sceneItemId: number;
  sceneItemEnabled: boolean;
}

export interface MockOBSServerConfig {
  port: number;
  password?: string;
  scenes?: MockOBSScene[];
  currentScene?: string;
  isStreaming?: boolean;
  isRecording?: boolean;
}

const DEFAULT_SCENES: MockOBSScene[] = [
  { sceneName: 'Main', sceneIndex: 0, sources: [
    { sourceName: 'Camera', sourceType: 'video_capture', sceneItemId: 1, sceneItemEnabled: true },
    { sourceName: 'Overlay', sourceType: 'browser_source', sceneItemId: 2, sceneItemEnabled: true },
  ]},
  { sceneName: 'Game', sceneIndex: 1, sources: [
    { sourceName: 'Game Capture', sourceType: 'game_capture', sceneItemId: 3, sceneItemEnabled: true },
    { sourceName: 'Webcam', sourceType: 'video_capture', sceneItemId: 4, sceneItemEnabled: true },
  ]},
  { sceneName: 'BRB', sceneIndex: 2, sources: [
    { sourceName: 'BRB Image', sourceType: 'image_source', sceneItemId: 5, sceneItemEnabled: true },
  ]},
  { sceneName: 'Starting', sceneIndex: 3, sources: [] },
  { sceneName: 'Ending', sceneIndex: 4, sources: [] },
];

export class MockOBSWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private config: Required<MockOBSServerConfig>;
  private scenes: MockOBSScene[];
  private currentScene: string;
  private isStreaming: boolean;
  private isRecording: boolean;
  private streamStartTime: number = 0;
  private recordStartTime: number = 0;

  constructor(config: MockOBSServerConfig) {
    this.config = {
      port: config.port,
      password: config.password || '',
      scenes: config.scenes || DEFAULT_SCENES,
      currentScene: config.currentScene || 'Main',
      isStreaming: config.isStreaming || false,
      isRecording: config.isRecording || false,
    };
    this.scenes = [...this.config.scenes];
    this.currentScene = this.config.currentScene;
    this.isStreaming = this.config.isStreaming;
    this.isRecording = this.config.isRecording;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.config.port });
        
        this.wss.on('connection', (ws) => {
          this.clients.add(ws);
          this.handleConnection(ws);
          
          ws.on('close', () => {
            this.clients.delete(ws);
          });
        });

        this.wss.on('listening', () => {
          console.log(`Mock OBS WebSocket Server listening on port ${this.config.port}`);
          resolve();
        });

        this.wss.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.clients.forEach((client) => client.close());
        this.clients.clear();
        this.wss.close(() => {
          this.wss = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private handleConnection(ws: WebSocket): void {
    // Send Hello message (OBS WebSocket 5.x protocol)
    const hello = {
      op: 0, // Hello
      d: {
        obsWebSocketVersion: '5.0.0',
        rpcVersion: 1,
        authentication: this.config.password ? {
          challenge: 'mock-challenge-string',
          salt: 'mock-salt-string',
        } : undefined,
      },
    };
    ws.send(JSON.stringify(hello));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (err) {
        console.error('Mock OBS Server: Failed to parse message', err);
      }
    });
  }

  private handleMessage(ws: WebSocket, message: any): void {
    const { op, d } = message;

    switch (op) {
      case 1: // Identify
        this.handleIdentify(ws, d);
        break;
      case 6: // Request
        this.handleRequest(ws, d);
        break;
      default:
        console.log('Mock OBS Server: Unknown op code', op);
    }
  }

  private handleIdentify(ws: WebSocket, data: any): void {
    // Validate authentication if password is set
    if (this.config.password && data.authentication) {
      // For simplicity, accept any authentication in mock
    }

    // Send Identified response
    const identified = {
      op: 2, // Identified
      d: {
        negotiatedRpcVersion: 1,
      },
    };
    ws.send(JSON.stringify(identified));
  }

  private handleRequest(ws: WebSocket, data: any): void {
    const { requestType, requestId, requestData } = data;
    let responseData: any = {};
    let requestStatus = { result: true, code: 100 };

    switch (requestType) {
      case 'GetVersion':
        responseData = {
          obsVersion: '29.0.0',
          obsWebSocketVersion: '5.0.0',
          rpcVersion: 1,
          availableRequests: [],
          supportedImageFormats: ['png', 'jpg'],
          platform: 'windows',
          platformDescription: 'Windows 10',
        };
        break;

      case 'GetSceneList':
        responseData = {
          currentProgramSceneName: this.currentScene,
          currentPreviewSceneName: null,
          scenes: this.scenes.map(s => ({
            sceneName: s.sceneName,
            sceneIndex: s.sceneIndex,
          })),
        };
        break;

      case 'GetCurrentProgramScene':
        responseData = {
          currentProgramSceneName: this.currentScene,
        };
        break;

      case 'SetCurrentProgramScene':
        if (requestData?.sceneName) {
          const scene = this.scenes.find(s => s.sceneName === requestData.sceneName);
          if (scene) {
            this.currentScene = requestData.sceneName;
            this.broadcastEvent('CurrentProgramSceneChanged', {
              sceneName: this.currentScene,
            });
          } else {
            requestStatus = { result: false, code: 600 };
          }
        }
        break;

      case 'GetSceneItemList':
        const sceneName = requestData?.sceneName || this.currentScene;
        const scene = this.scenes.find(s => s.sceneName === sceneName);
        responseData = {
          sceneItems: scene?.sources?.map(s => ({
            sceneItemId: s.sceneItemId,
            sourceName: s.sourceName,
            sourceType: s.sourceType,
            sceneItemEnabled: s.sceneItemEnabled,
          })) || [],
        };
        break;

      case 'SetSceneItemEnabled':
        if (requestData?.sceneName && requestData?.sceneItemId !== undefined) {
          const targetScene = this.scenes.find(s => s.sceneName === requestData.sceneName);
          const source = targetScene?.sources?.find(s => s.sceneItemId === requestData.sceneItemId);
          if (source) {
            source.sceneItemEnabled = requestData.sceneItemEnabled;
          }
        }
        break;

      case 'GetStreamStatus':
        responseData = {
          outputActive: this.isStreaming,
          outputReconnecting: false,
          outputTimecode: this.isStreaming ? this.formatTimecode(Date.now() - this.streamStartTime) : '00:00:00.000',
          outputDuration: this.isStreaming ? Date.now() - this.streamStartTime : 0,
          outputCongestion: 0,
          outputBytes: 0,
          outputSkippedFrames: 0,
          outputTotalFrames: 0,
        };
        break;

      case 'StartStream':
        if (!this.isStreaming) {
          this.isStreaming = true;
          this.streamStartTime = Date.now();
          this.broadcastEvent('StreamStateChanged', {
            outputActive: true,
            outputState: 'OBS_WEBSOCKET_OUTPUT_STARTED',
          });
        }
        break;

      case 'StopStream':
        if (this.isStreaming) {
          this.isStreaming = false;
          this.broadcastEvent('StreamStateChanged', {
            outputActive: false,
            outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED',
          });
        }
        break;

      case 'GetRecordStatus':
        responseData = {
          outputActive: this.isRecording,
          outputPaused: false,
          outputTimecode: this.isRecording ? this.formatTimecode(Date.now() - this.recordStartTime) : '00:00:00.000',
          outputDuration: this.isRecording ? Date.now() - this.recordStartTime : 0,
          outputBytes: 0,
        };
        break;

      case 'StartRecord':
        if (!this.isRecording) {
          this.isRecording = true;
          this.recordStartTime = Date.now();
          this.broadcastEvent('RecordStateChanged', {
            outputActive: true,
            outputState: 'OBS_WEBSOCKET_OUTPUT_STARTED',
          });
        }
        break;

      case 'StopRecord':
        if (this.isRecording) {
          this.isRecording = false;
          this.broadcastEvent('RecordStateChanged', {
            outputActive: false,
            outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED',
            outputPath: 'C:/Videos/recording.mp4',
          });
        }
        break;

      case 'GetSceneTransitionList':
        responseData = {
          currentSceneTransitionName: 'Fade',
          currentSceneTransitionDuration: 300,
          transitions: [
            { transitionName: 'Cut', transitionKind: 'cut_transition', transitionFixed: true },
            { transitionName: 'Fade', transitionKind: 'fade_transition', transitionFixed: false },
            { transitionName: 'Slide', transitionKind: 'slide_transition', transitionFixed: false },
          ],
        };
        break;

      case 'SetCurrentSceneTransition':
        // Accept any transition name
        break;

      case 'RefreshBrowserSource':
        // No-op for mock
        break;

      default:
        console.log('Mock OBS Server: Unknown request type', requestType);
        requestStatus = { result: false, code: 204 };
    }

    // Send response
    const response = {
      op: 7, // RequestResponse
      d: {
        requestType,
        requestId,
        requestStatus,
        responseData,
      },
    };
    ws.send(JSON.stringify(response));
  }

  private broadcastEvent(eventType: string, eventData: any): void {
    const event = {
      op: 5, // Event
      d: {
        eventType,
        eventIntent: 1,
        eventData,
      },
    };
    const message = JSON.stringify(event);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private formatTimecode(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  // Public methods for test manipulation
  setCurrentScene(sceneName: string): void {
    this.currentScene = sceneName;
    this.broadcastEvent('CurrentProgramSceneChanged', { sceneName });
  }

  setStreaming(streaming: boolean): void {
    this.isStreaming = streaming;
    if (streaming) {
      this.streamStartTime = Date.now();
    }
  }

  setRecording(recording: boolean): void {
    this.isRecording = recording;
    if (recording) {
      this.recordStartTime = Date.now();
    }
  }

  addScene(scene: MockOBSScene): void {
    this.scenes.push(scene);
  }

  getScenes(): MockOBSScene[] {
    return [...this.scenes];
  }

  getCurrentScene(): string {
    return this.currentScene;
  }
}

export default MockOBSWebSocketServer;
