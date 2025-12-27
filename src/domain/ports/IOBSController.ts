/**
 * IOBSController - Puerto para controlar OBS Studio
 * 
 * Esta interfaz define el contrato para controlar OBS via WebSocket.
 * Permite cambiar escenas, controlar fuentes y automatizar el stream.
 * 
 * Arquitectura Hexagonal: Este es un "puerto" del dominio.
 * La implementación concreta está en infrastructure/adapters/OBSWebSocketAdapter.ts
 */

export type OBSConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface OBSScene {
  name: string;
  index: number;
  isCurrentProgram?: boolean;
  isCurrentPreview?: boolean;
}

export interface OBSSource {
  name: string;
  type: string;
  enabled: boolean;
  sceneItemId: number;
  locked?: boolean;
}

export interface OBSStreamStatus {
  isStreaming: boolean;
  isRecording: boolean;
  isPaused?: boolean;
  streamTimecode?: string;
  recordTimecode?: string;
  bytesPerSec?: number;
  kbitsPerSec?: number;
  totalStreamTime?: number;
}

export interface OBSConnectionOptions {
  /** Host de OBS WebSocket (default: localhost) */
  host?: string;
  /** Puerto de OBS WebSocket (default: 4455) */
  port?: number;
  /** Contraseña de autenticación */
  password?: string;
}

export interface OBSVersion {
  obsVersion: string;
  obsWebSocketVersion: string;
  platform: string;
}

export type OBSStatusCallback = (status: OBSConnectionStatus, error?: string) => void;
export type OBSSceneCallback = (scene: OBSScene) => void;
export type OBSStreamCallback = (status: OBSStreamStatus) => void;
export type OBSSourceCallback = (sceneName: string, source: OBSSource) => void;

/**
 * Puerto principal para controlar OBS Studio
 */
export interface IOBSController {
  /** Identificador del controlador */
  readonly controllerId: string;
  
  /** Estado actual de conexión */
  getConnectionStatus(): OBSConnectionStatus;
  
  /** Conectar a OBS WebSocket */
  connect(options?: OBSConnectionOptions): Promise<void>;
  
  /** Desconectar de OBS */
  disconnect(): Promise<void>;
  
  /** Obtener versión de OBS */
  getVersion(): Promise<OBSVersion | null>;
  
  // === ESCENAS ===
  
  /** Obtener lista de todas las escenas */
  getScenes(): Promise<OBSScene[]>;
  
  /** Obtener nombre de la escena actual (Program) */
  getCurrentScene(): Promise<string | null>;
  
  /** Cambiar a una escena específica */
  setScene(sceneName: string): Promise<void>;
  
  /** Obtener escena de preview (Studio Mode) */
  getPreviewScene(): Promise<string | null>;
  
  /** Establecer escena de preview (Studio Mode) */
  setPreviewScene(sceneName: string): Promise<void>;
  
  // === FUENTES ===
  
  /** Obtener fuentes de una escena */
  getSceneSources(sceneName: string): Promise<OBSSource[]>;
  
  /** Mostrar/ocultar una fuente */
  setSourceVisible(sceneName: string, sourceName: string, visible: boolean): Promise<void>;
  
  /** Verificar si una fuente está visible */
  isSourceVisible(sceneName: string, sourceName: string): Promise<boolean>;
  
  /** Refrescar una fuente de navegador */
  refreshBrowserSource(sourceName: string): Promise<void>;
  
  // === STREAMING/GRABACIÓN ===
  
  /** Obtener estado del stream y grabación */
  getStreamStatus(): Promise<OBSStreamStatus>;
  
  /** Iniciar streaming */
  startStream(): Promise<void>;
  
  /** Detener streaming */
  stopStream(): Promise<void>;
  
  /** Alternar streaming */
  toggleStream(): Promise<void>;
  
  /** Iniciar grabación */
  startRecording(): Promise<void>;
  
  /** Detener grabación */
  stopRecording(): Promise<void>;
  
  /** Pausar grabación */
  pauseRecording(): Promise<void>;
  
  /** Reanudar grabación */
  resumeRecording(): Promise<void>;
  
  /** Alternar grabación */
  toggleRecording(): Promise<void>;
  
  // === TRANSICIONES ===
  
  /** Obtener transiciones disponibles */
  getTransitions(): Promise<string[]>;
  
  /** Obtener transición actual */
  getCurrentTransition(): Promise<string | null>;
  
  /** Establecer transición */
  setTransition(transitionName: string): Promise<void>;
  
  /** Ejecutar transición (Studio Mode) */
  triggerTransition(): Promise<void>;
  
  // === CALLBACKS ===
  
  /** Registrar callback para cambios de estado de conexión */
  onStatusChange(callback: OBSStatusCallback): () => void;
  
  /** Registrar callback para cambios de escena */
  onSceneChange(callback: OBSSceneCallback): () => void;
  
  /** Registrar callback para cambios de estado del stream */
  onStreamStatusChange(callback: OBSStreamCallback): () => void;
  
  /** Registrar callback para cambios en fuentes */
  onSourceChange(callback: OBSSourceCallback): () => void;
  
  /** Limpiar recursos */
  dispose(): void;
}
