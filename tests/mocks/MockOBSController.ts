/**
 * MockOBSController - Mock implementation of IOBSController for testing
 * 
 * Simulates OBS WebSocket behavior without requiring actual OBS connection.
 * Used for unit testing OBSService and related hooks.
 * 
 * @requirements 2.4
 */

import type {
  IOBSController,
  OBSConnectionStatus,
  OBSScene,
  OBSSource,
  OBSStreamStatus,
  OBSConnectionOptions,
  OBSVersion,
  OBSStatusCallback,
  OBSSceneCallback,
  OBSStreamCallback,
  OBSSourceCallback,
} from '../../src/domain/ports/IOBSController';

export interface MockOBSControllerOptions {
  /** Initial scenes */
  scenes?: OBSScene[];
  /** Initial sources per scene */
  sourcesByScene?: Record<string, OBSSource[]>;
  /** Initial transitions */
  transitions?: string[];
  /** Should connection fail */
  shouldFailConnection?: boolean;
  /** Connection error message */
  connectionErrorMessage?: string;
  /** Delay for async operations (ms) */
  operationDelay?: number;
}

const DEFAULT_SCENES: OBSScene[] = [
  { name: 'Main', index: 0, isCurrentProgram: true },
  { name: 'Game', index: 1 },
  { name: 'BRB', index: 2 },
  { name: 'Starting', index: 3 },
  { name: 'Ending', index: 4 },
];

const DEFAULT_SOURCES: Record<string, OBSSource[]> = {
  'Main': [
    { name: 'Webcam', type: 'video_capture', enabled: true, sceneItemId: 1 },
    { name: 'Chat', type: 'browser_source', enabled: true, sceneItemId: 2 },
    { name: 'Alerts', type: 'browser_source', enabled: true, sceneItemId: 3 },
  ],
  'Game': [
    { name: 'Game Capture', type: 'game_capture', enabled: true, sceneItemId: 4 },
    { name: 'Webcam', type: 'video_capture', enabled: true, sceneItemId: 5 },
  ],
  'BRB': [
    { name: 'BRB Image', type: 'image_source', enabled: true, sceneItemId: 6 },
    { name: 'Music', type: 'ffmpeg_source', enabled: true, sceneItemId: 7 },
  ],
};

const DEFAULT_TRANSITIONS = ['Cut', 'Fade', 'Slide', 'Stinger'];

export class MockOBSController implements IOBSController {
  readonly controllerId = 'mock-obs';
  
  private status: OBSConnectionStatus = 'disconnected';
  private scenes: OBSScene[];
  private sourcesByScene: Record<string, OBSSource[]>;
  private transitions: string[];
  private currentScene: string;
  private currentTransition: string;
  private previewScene: string | null = null;
  private streamStatus: OBSStreamStatus = { isStreaming: false, isRecording: false };
  
  private shouldFailConnection: boolean;
  private connectionErrorMessage: string;
  private operationDelay: number;
  
  private statusCallbacks = new Set<OBSStatusCallback>();
  private sceneCallbacks = new Set<OBSSceneCallback>();
  private streamCallbacks = new Set<OBSStreamCallback>();
  private sourceCallbacks = new Set<OBSSourceCallback>();
  
  // Track method calls for testing
  public callHistory: { method: string; args: unknown[] }[] = [];
  
  constructor(options: MockOBSControllerOptions = {}) {
    this.scenes = options.scenes ?? [...DEFAULT_SCENES];
    this.sourcesByScene = options.sourcesByScene ?? { ...DEFAULT_SOURCES };
    this.transitions = options.transitions ?? [...DEFAULT_TRANSITIONS];
    this.currentScene = this.scenes[0]?.name ?? 'Main';
    this.currentTransition = this.transitions[0] ?? 'Cut';
    this.shouldFailConnection = options.shouldFailConnection ?? false;
    this.connectionErrorMessage = options.connectionErrorMessage ?? 'Mock connection failed';
    this.operationDelay = options.operationDelay ?? 0;
  }
  
  private async delay(): Promise<void> {
    if (this.operationDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.operationDelay));
    }
  }
  
  private trackCall(method: string, ...args: unknown[]): void {
    this.callHistory.push({ method, args });
  }
  
  getConnectionStatus(): OBSConnectionStatus {
    return this.status;
  }

  async connect(options?: OBSConnectionOptions): Promise<void> {
    this.trackCall('connect', options);
    await this.delay();
    
    if (this.shouldFailConnection) {
      this.setStatus('error', this.connectionErrorMessage);
      throw new Error(this.connectionErrorMessage);
    }
    
    this.setStatus('connecting');
    await this.delay();
    this.setStatus('connected');
  }
  
  async disconnect(): Promise<void> {
    this.trackCall('disconnect');
    await this.delay();
    this.setStatus('disconnected');
  }
  
  async getVersion(): Promise<OBSVersion | null> {
    this.trackCall('getVersion');
    if (this.status !== 'connected') return null;
    return {
      obsVersion: '30.0.0',
      obsWebSocketVersion: '5.3.0',
      platform: 'windows',
    };
  }
  
  // === SCENES ===
  
  async getScenes(): Promise<OBSScene[]> {
    this.trackCall('getScenes');
    await this.delay();
    return this.scenes.map(s => ({
      ...s,
      isCurrentProgram: s.name === this.currentScene,
      isCurrentPreview: s.name === this.previewScene,
    }));
  }
  
  async getCurrentScene(): Promise<string | null> {
    this.trackCall('getCurrentScene');
    await this.delay();
    return this.currentScene;
  }
  
  async setScene(sceneName: string): Promise<void> {
    this.trackCall('setScene', sceneName);
    await this.delay();
    
    const scene = this.scenes.find(s => s.name === sceneName);
    if (!scene) {
      throw new Error(`Scene "${sceneName}" not found`);
    }
    
    const oldScene = this.currentScene;
    this.currentScene = sceneName;
    
    // Notify scene change
    if (oldScene !== sceneName) {
      this.sceneCallbacks.forEach(cb => cb({
        name: sceneName,
        index: scene.index,
        isCurrentProgram: true,
      }));
    }
  }
  
  async getPreviewScene(): Promise<string | null> {
    this.trackCall('getPreviewScene');
    await this.delay();
    return this.previewScene;
  }
  
  async setPreviewScene(sceneName: string): Promise<void> {
    this.trackCall('setPreviewScene', sceneName);
    await this.delay();
    
    const scene = this.scenes.find(s => s.name === sceneName);
    if (!scene) {
      throw new Error(`Scene "${sceneName}" not found`);
    }
    
    this.previewScene = sceneName;
  }
  
  // === SOURCES ===
  
  async getSceneSources(sceneName: string): Promise<OBSSource[]> {
    this.trackCall('getSceneSources', sceneName);
    await this.delay();
    return this.sourcesByScene[sceneName] ?? [];
  }
  
  async setSourceVisible(sceneName: string, sourceName: string, visible: boolean): Promise<void> {
    this.trackCall('setSourceVisible', sceneName, sourceName, visible);
    await this.delay();
    
    const sources = this.sourcesByScene[sceneName];
    if (!sources) {
      throw new Error(`Scene "${sceneName}" not found`);
    }
    
    const source = sources.find(s => s.name === sourceName);
    if (!source) {
      throw new Error(`Source "${sourceName}" not found in scene "${sceneName}"`);
    }
    
    source.enabled = visible;
    
    // Notify source change
    this.sourceCallbacks.forEach(cb => cb(sceneName, { ...source }));
  }
  
  async isSourceVisible(sceneName: string, sourceName: string): Promise<boolean> {
    this.trackCall('isSourceVisible', sceneName, sourceName);
    await this.delay();
    
    const sources = this.sourcesByScene[sceneName];
    const source = sources?.find(s => s.name === sourceName);
    return source?.enabled ?? false;
  }
  
  async refreshBrowserSource(sourceName: string): Promise<void> {
    this.trackCall('refreshBrowserSource', sourceName);
    await this.delay();
  }
  
  // === STREAMING/RECORDING ===
  
  async getStreamStatus(): Promise<OBSStreamStatus> {
    this.trackCall('getStreamStatus');
    await this.delay();
    return { ...this.streamStatus };
  }
  
  async startStream(): Promise<void> {
    this.trackCall('startStream');
    await this.delay();
    this.streamStatus.isStreaming = true;
    this.notifyStreamStatus();
  }
  
  async stopStream(): Promise<void> {
    this.trackCall('stopStream');
    await this.delay();
    this.streamStatus.isStreaming = false;
    this.notifyStreamStatus();
  }
  
  async toggleStream(): Promise<void> {
    this.trackCall('toggleStream');
    await this.delay();
    this.streamStatus.isStreaming = !this.streamStatus.isStreaming;
    this.notifyStreamStatus();
  }
  
  async startRecording(): Promise<void> {
    this.trackCall('startRecording');
    await this.delay();
    this.streamStatus.isRecording = true;
    this.notifyStreamStatus();
  }
  
  async stopRecording(): Promise<void> {
    this.trackCall('stopRecording');
    await this.delay();
    this.streamStatus.isRecording = false;
    this.notifyStreamStatus();
  }
  
  async pauseRecording(): Promise<void> {
    this.trackCall('pauseRecording');
    await this.delay();
    this.streamStatus.isPaused = true;
    this.notifyStreamStatus();
  }
  
  async resumeRecording(): Promise<void> {
    this.trackCall('resumeRecording');
    await this.delay();
    this.streamStatus.isPaused = false;
    this.notifyStreamStatus();
  }
  
  async toggleRecording(): Promise<void> {
    this.trackCall('toggleRecording');
    await this.delay();
    this.streamStatus.isRecording = !this.streamStatus.isRecording;
    this.notifyStreamStatus();
  }
  
  private notifyStreamStatus(): void {
    this.streamCallbacks.forEach(cb => cb({ ...this.streamStatus }));
  }

  // === TRANSITIONS ===
  
  async getTransitions(): Promise<string[]> {
    this.trackCall('getTransitions');
    await this.delay();
    return [...this.transitions];
  }
  
  async getCurrentTransition(): Promise<string | null> {
    this.trackCall('getCurrentTransition');
    await this.delay();
    return this.currentTransition;
  }
  
  async setTransition(transitionName: string): Promise<void> {
    this.trackCall('setTransition', transitionName);
    await this.delay();
    
    if (!this.transitions.includes(transitionName)) {
      throw new Error(`Transition "${transitionName}" not found`);
    }
    
    this.currentTransition = transitionName;
  }
  
  async triggerTransition(): Promise<void> {
    this.trackCall('triggerTransition');
    await this.delay();
  }
  
  // === CALLBACKS ===
  
  onStatusChange(callback: OBSStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.status);
    return () => this.statusCallbacks.delete(callback);
  }
  
  onSceneChange(callback: OBSSceneCallback): () => void {
    this.sceneCallbacks.add(callback);
    return () => this.sceneCallbacks.delete(callback);
  }
  
  onStreamStatusChange(callback: OBSStreamCallback): () => void {
    this.streamCallbacks.add(callback);
    return () => this.streamCallbacks.delete(callback);
  }
  
  onSourceChange(callback: OBSSourceCallback): () => void {
    this.sourceCallbacks.add(callback);
    return () => this.sourceCallbacks.delete(callback);
  }
  
  dispose(): void {
    this.trackCall('dispose');
    this.statusCallbacks.clear();
    this.sceneCallbacks.clear();
    this.streamCallbacks.clear();
    this.sourceCallbacks.clear();
  }
  
  private setStatus(status: OBSConnectionStatus, error?: string): void {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(status, error));
  }
  
  // === TEST HELPERS ===
  
  /** Reset call history */
  resetCallHistory(): void {
    this.callHistory = [];
  }
  
  /** Simulate connection drop */
  simulateDisconnect(): void {
    this.setStatus('disconnected');
  }
  
  /** Simulate connection error */
  simulateError(message: string): void {
    this.setStatus('error', message);
  }
  
  /** Set stream status directly for testing */
  setStreamStatus(status: Partial<OBSStreamStatus>): void {
    this.streamStatus = { ...this.streamStatus, ...status };
    this.notifyStreamStatus();
  }
  
  /** Add a scene for testing */
  addScene(scene: OBSScene): void {
    this.scenes.push(scene);
  }
  
  /** Add sources to a scene for testing */
  addSources(sceneName: string, sources: OBSSource[]): void {
    this.sourcesByScene[sceneName] = sources;
  }
  
  /** Configure connection behavior */
  setConnectionBehavior(shouldFail: boolean, errorMessage?: string): void {
    this.shouldFailConnection = shouldFail;
    if (errorMessage) {
      this.connectionErrorMessage = errorMessage;
    }
  }
}
