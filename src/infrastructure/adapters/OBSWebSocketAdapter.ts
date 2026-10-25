/**
 * OBSWebSocketAdapter - Implementación de IOBSController usando obs-websocket-js
 * 
 * Este adapter conecta con OBS Studio via WebSocket (puerto 4455 por defecto)
 * y permite controlar escenas, fuentes, streaming y grabación.
 * 
 * Requisitos:
 * - OBS Studio v28+ (WebSocket incluido)
 * - Habilitar WebSocket Server en OBS: Herramientas → Configuración de WebSocket Server
 */

import OBSWebSocket from 'obs-websocket-js';
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
} from '../../domain/ports/IOBSController';

const DEFAULT_OPTIONS: Required<OBSConnectionOptions> = {
  host: 'localhost',
  port: 4455,
  password: '',
};

export class OBSWebSocketAdapter implements IOBSController {
  readonly controllerId = 'obs-websocket';
  
  private obs: OBSWebSocket;
  private status: OBSConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastOptions: OBSConnectionOptions | null = null;
  
  private statusCallbacks = new Set<OBSStatusCallback>();
  private sceneCallbacks = new Set<OBSSceneCallback>();
  private streamCallbacks = new Set<OBSStreamCallback>();
  private sourceCallbacks = new Set<OBSSourceCallback>();
  
  constructor() {
    this.obs = new OBSWebSocket();
    this.setupEventHandlers();
  }
  
  getConnectionStatus(): OBSConnectionStatus {
    return this.status;
  }
  
  async connect(options: OBSConnectionOptions = {}): Promise<void> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    this.lastOptions = config;
    this.reconnectAttempts = 0;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    await this.openConnection(config);
  }
  
  /**
   * Opens the WebSocket connection without resetting the reconnect counter.
   * Used by connect() and by the auto-reconnect loop.
   */
  private async openConnection(config: OBSConnectionOptions): Promise<void> {
    this.setStatus('connecting');
    
    try {
      const url = `ws://${config.host}:${config.port}`;
      await this.obs.connect(url, config.password || undefined);
      this.setStatus('connected');
    } catch (error) {
      const errorMsg = this.parseError(error);
      this.setStatus('error', errorMsg);
      throw new Error(errorMsg);
    }
  }
  
  async disconnect(): Promise<void> {
    this.lastOptions = null;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    try {
      await this.obs.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    
    this.setStatus('disconnected');
  }

  async getVersion(): Promise<OBSVersion | null> {
    try {
      const version = await this.obs.call('GetVersion');
      return {
        obsVersion: version.obsVersion,
        obsWebSocketVersion: version.obsWebSocketVersion,
        platform: version.platform,
      };
    } catch {
      return null;
    }
  }
  
  // === ESCENAS ===
  
  async getScenes(): Promise<OBSScene[]> {
    try {
      const { scenes, currentProgramSceneName, currentPreviewSceneName } = 
        await this.obs.call('GetSceneList');
      
      return scenes.map((scene, index) => ({
        name: scene.sceneName as string,
        index,
        isCurrentProgram: scene.sceneName === currentProgramSceneName,
        isCurrentPreview: scene.sceneName === currentPreviewSceneName,
      })).reverse(); // OBS returns scenes in reverse order
    } catch (error) {
      console.error('Error getting scenes:', error);
      return [];
    }
  }
  
  async getCurrentScene(): Promise<string | null> {
    try {
      const { currentProgramSceneName } = await this.obs.call('GetCurrentProgramScene');
      return currentProgramSceneName;
    } catch {
      return null;
    }
  }
  
  async setScene(sceneName: string): Promise<void> {
    await this.obs.call('SetCurrentProgramScene', { sceneName });
  }
  
  async getPreviewScene(): Promise<string | null> {
    try {
      const { currentPreviewSceneName } = await this.obs.call('GetCurrentPreviewScene');
      return currentPreviewSceneName;
    } catch {
      return null;
    }
  }
  
  async setPreviewScene(sceneName: string): Promise<void> {
    await this.obs.call('SetCurrentPreviewScene', { sceneName });
  }
  
  // === FUENTES ===
  
  async getSceneSources(sceneName: string): Promise<OBSSource[]> {
    try {
      const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName });
      
      return sceneItems.map(item => ({
        name: item.sourceName as string,
        type: (item.inputKind as string) || (item.sourceType as string) || 'unknown',
        enabled: item.sceneItemEnabled as boolean,
        sceneItemId: item.sceneItemId as number,
        locked: item.sceneItemLocked as boolean,
      }));
    } catch (error) {
      console.error('Error getting scene sources:', error);
      return [];
    }
  }
  
  async setSourceVisible(sceneName: string, sourceName: string, visible: boolean): Promise<void> {
    const sources = await this.getSceneSources(sceneName);
    const source = sources.find(s => s.name === sourceName);
    
    if (!source) {
      throw new Error(`Source "${sourceName}" not found in scene "${sceneName}"`);
    }
    
    await this.obs.call('SetSceneItemEnabled', {
      sceneName,
      sceneItemId: source.sceneItemId,
      sceneItemEnabled: visible,
    });
  }
  
  async isSourceVisible(sceneName: string, sourceName: string): Promise<boolean> {
    const sources = await this.getSceneSources(sceneName);
    const source = sources.find(s => s.name === sourceName);
    return source?.enabled ?? false;
  }
  
  async refreshBrowserSource(sourceName: string): Promise<void> {
    await this.obs.call('PressInputPropertiesButton', {
      inputName: sourceName,
      propertyName: 'refreshnocache',
    });
  }
  
  // === STREAMING/GRABACIÓN ===
  
  async getStreamStatus(): Promise<OBSStreamStatus> {
    try {
      const [streamStatus, recordStatus] = await Promise.all([
        this.obs.call('GetStreamStatus').catch(() => null),
        this.obs.call('GetRecordStatus').catch(() => null),
      ]);
      
      return {
        isStreaming: streamStatus?.outputActive ?? false,
        isRecording: recordStatus?.outputActive ?? false,
        isPaused: recordStatus?.outputPaused ?? false,
        streamTimecode: streamStatus?.outputTimecode,
        recordTimecode: recordStatus?.outputTimecode,
        bytesPerSec: streamStatus?.outputBytes,
        kbitsPerSec: streamStatus?.outputBytes ? Math.round(streamStatus.outputBytes * 8 / 1000) : undefined,
        totalStreamTime: streamStatus?.outputDuration ? Math.floor(streamStatus.outputDuration / 1000) : undefined,
      };
    } catch {
      return { isStreaming: false, isRecording: false };
    }
  }
  
  async startStream(): Promise<void> {
    await this.obs.call('StartStream');
  }
  
  async stopStream(): Promise<void> {
    await this.obs.call('StopStream');
  }
  
  async toggleStream(): Promise<void> {
    await this.obs.call('ToggleStream');
  }
  
  async startRecording(): Promise<void> {
    await this.obs.call('StartRecord');
  }
  
  async stopRecording(): Promise<void> {
    await this.obs.call('StopRecord');
  }
  
  async pauseRecording(): Promise<void> {
    await this.obs.call('PauseRecord');
  }
  
  async resumeRecording(): Promise<void> {
    await this.obs.call('ResumeRecord');
  }
  
  async toggleRecording(): Promise<void> {
    await this.obs.call('ToggleRecord');
  }

  // === TRANSICIONES ===
  
  async getTransitions(): Promise<string[]> {
    try {
      const { transitions } = await this.obs.call('GetSceneTransitionList');
      return transitions.map(t => t.transitionName as string);
    } catch {
      return [];
    }
  }
  
  async getCurrentTransition(): Promise<string | null> {
    try {
      const result = await this.obs.call('GetCurrentSceneTransition');
      return result.transitionName;
    } catch {
      return null;
    }
  }
  
  async setTransition(transitionName: string): Promise<void> {
    await this.obs.call('SetCurrentSceneTransition', { transitionName });
  }
  
  async triggerTransition(): Promise<void> {
    await this.obs.call('TriggerStudioModeTransition');
  }
  
  // === CALLBACKS ===
  
  onStatusChange(callback: OBSStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Emit current status immediately
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
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.obs.disconnect();
    this.statusCallbacks.clear();
    this.sceneCallbacks.clear();
    this.streamCallbacks.clear();
    this.sourceCallbacks.clear();
  }
  
  // === PRIVATE METHODS ===
  
  private setupEventHandlers(): void {
    // Scene changes
    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.sceneCallbacks.forEach(cb => cb({
        name: data.sceneName,
        index: 0,
        isCurrentProgram: true,
      }));
    });
    
    // Stream state
    this.obs.on('StreamStateChanged', (data) => {
      this.streamCallbacks.forEach(cb => cb({
        isStreaming: data.outputActive,
        isRecording: false,
      }));
    });
    
    // Record state
    this.obs.on('RecordStateChanged', (data) => {
      this.streamCallbacks.forEach(cb => cb({
        isStreaming: false,
        isRecording: data.outputActive,
      }));
    });
    
    // Source visibility changes
    this.obs.on('SceneItemEnableStateChanged', (data) => {
      this.sourceCallbacks.forEach(cb => cb(data.sceneName, {
        name: '', // We don't have the name in this event
        type: 'unknown',
        enabled: data.sceneItemEnabled,
        sceneItemId: data.sceneItemId,
      }));
    });
    
    // Connection events
    this.obs.on('ConnectionClosed', () => {
      if (this.status === 'connected') {
        this.setStatus('disconnected');
        this.attemptReconnect();
      }
    });
    
    this.obs.on('ConnectionError', (err) => {
      this.setStatus('error', err.message);
    });
  }
  
  private setStatus(status: OBSConnectionStatus, error?: string): void {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(status, error));
  }
  
  private parseError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('Authentication')) {
        return 'Contraseña incorrecta. Verifica la configuración de OBS WebSocket.';
      }
      if (error.message.includes('ECONNREFUSED')) {
        return 'No se pudo conectar. ¿Está OBS abierto con WebSocket habilitado?';
      }
      if (error.message.includes('timeout')) {
        return 'Tiempo de conexión agotado. Verifica que OBS esté ejecutándose.';
      }
      return error.message;
    }
    return 'Error desconocido al conectar con OBS';
  }
  
  private attemptReconnect(): void {
    if (!this.lastOptions || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
    
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      if (this.lastOptions && this.status !== 'connected') {
        try {
          await this.openConnection(this.lastOptions);
          this.reconnectAttempts = 0;
        } catch {
          // A failed connect sets status to 'error', so ConnectionClosed will not
          // retry. Schedule the next attempt here (bounded by maxReconnectAttempts).
          this.attemptReconnect();
        }
      }
    }, delay);
  }
}

// Singleton instance
let instance: OBSWebSocketAdapter | null = null;

export function getOBSAdapter(): OBSWebSocketAdapter {
  if (!instance) {
    instance = new OBSWebSocketAdapter();
  }
  return instance;
}

export function resetOBSAdapter(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
