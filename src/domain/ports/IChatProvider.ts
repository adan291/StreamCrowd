/**
 * IChatProvider - Puerto para proveedores de chat
 * 
 * Esta interfaz define el contrato que deben implementar todos los
 * proveedores de chat (Twitch, YouTube, OBS, etc.)
 * 
 * Arquitectura Hexagonal: Este es un "puerto" del dominio.
 * Las implementaciones concretas (adapters) están en infrastructure/
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ChatMessage {
  id: string;
  username: string;
  displayName: string;
  message: string;
  timestamp: number;
  userId?: string;
  color?: string;
  isSubscriber?: boolean;
  isModerator?: boolean;
  isBroadcaster?: boolean;
  badges?: Record<string, string>;
  /** Canal de origen (para multistream) */
  sourceChannel?: string;
  /** Proveedor de origen */
  provider: 'twitch' | 'youtube' | 'obs' | 'custom';
}

export interface StreamEvent {
  id: string;
  type: 'sub' | 'resub' | 'gift' | 'raid' | 'bits' | 'follow' | 'ban' | 'timeout';
  username: string;
  displayName: string;
  timestamp: number;
  channel: string;
  provider: 'twitch' | 'youtube' | 'obs' | 'custom';
  data?: Record<string, unknown>;
}

export interface ChannelInfo {
  name: string;
  displayName?: string;
  avatar?: string;
  isLive?: boolean;
  viewerCount?: number;
}

export interface ConnectionOptions {
  channel: string;
  token?: string;
  userId?: string;
}

export type MessageCallback = (message: ChatMessage) => void;
export type StatusCallback = (status: ConnectionStatus, error?: string) => void;
export type StreamEventCallback = (event: StreamEvent) => void;

/**
 * Interfaz principal para proveedores de chat
 */
export interface IChatProvider {
  /** Identificador único del proveedor */
  readonly providerId: string;
  
  /** Nombre legible del proveedor */
  readonly providerName: string;
  
  /** Estado actual de conexión */
  getConnectionStatus(): ConnectionStatus;
  
  /** Canal actual conectado */
  getCurrentChannel(): string | null;
  
  /** Conectar a un canal */
  connect(options: ConnectionOptions): Promise<void>;
  
  /** Desconectar del canal actual */
  disconnect(): Promise<void>;
  
  /** Enviar mensaje al chat (si está autenticado) */
  sendMessage(message: string): Promise<boolean>;
  
  /** Registrar callback para mensajes */
  onMessage(callback: MessageCallback): () => void;
  
  /** Registrar callback para cambios de estado */
  onStatusChange(callback: StatusCallback): () => void;
  
  /** Registrar callback para eventos de stream */
  onStreamEvent(callback: StreamEventCallback): () => void;
  
  /** Obtener información del canal */
  getChannelInfo(channel?: string): Promise<ChannelInfo | null>;
  
  /** Obtener conteo de viewers (si disponible) */
  getViewerCount(channel?: string): Promise<number | null>;
  
  /** Limpiar recursos */
  dispose(): void;
}

/**
 * Interfaz para proveedores que soportan múltiples canales (colaboración)
 */
export interface IMultiChannelProvider extends IChatProvider {
  /** Añadir canal de colaboración */
  addChannel(channel: string): Promise<boolean>;
  
  /** Eliminar canal de colaboración */
  removeChannel(channel: string): void;
  
  /** Obtener canales conectados */
  getConnectedChannels(): string[];
}
