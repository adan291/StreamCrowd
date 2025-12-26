/**
 * IOverlaySync - Puerto para sincronización de overlays
 * 
 * Esta interfaz define el contrato para sincronizar estado
 * entre el panel de control y los overlays (OBS, navegador, etc.)
 * 
 * Implementaciones posibles:
 * - Firebase Realtime Database (actual)
 * - WebSocket server
 * - OBS WebSocket
 * - BroadcastChannel (mismo navegador)
 */

export type OverlayType = 
  | 'poll' 
  | 'countdown' 
  | 'spinner' 
  | 'giveaway' 
  | 'judgePanel' 
  | 'game';

export interface OverlayState<T = unknown> {
  type: OverlayType;
  data: T;
  updatedAt: number;
  isActive: boolean;
}

export interface PollOverlayData {
  question: string;
  options: Array<{
    id: number;
    label: string;
    votes: number;
    color: string;
  }>;
  totalVotes: number;
  isActive: boolean;
  showResults: boolean;
}

export interface CountdownOverlayData {
  endTime: number;
  label: string;
  isActive: boolean;
}

export interface GiveawayOverlayData {
  winner: string | null;
  isSpinning: boolean;
  participants: string[];
}

export interface GameOverlayData {
  gameType: string;
  state: unknown;
}

export type SyncCallback<T> = (state: OverlayState<T> | null) => void;

/**
 * Interfaz principal para sincronización de overlays
 */
export interface IOverlaySync {
  /** Identificador del proveedor de sync */
  readonly syncId: string;
  
  /** Publicar estado de overlay */
  publish<T>(type: OverlayType, data: T): Promise<void>;
  
  /** Suscribirse a cambios de un tipo de overlay */
  subscribe<T>(type: OverlayType, callback: SyncCallback<T>): () => void;
  
  /** Limpiar estado de un overlay */
  clear(type: OverlayType): Promise<void>;
  
  /** Limpiar todos los overlays */
  clearAll(): Promise<void>;
  
  /** Verificar si está conectado */
  isConnected(): boolean;
  
  /** Limpiar recursos */
  dispose(): void;
}

/**
 * Interfaz para sync bidireccional (OBS WebSocket)
 */
export interface IBidirectionalSync extends IOverlaySync {
  /** Recibir comandos desde el overlay */
  onCommand(callback: (command: string, data: unknown) => void): () => void;
  
  /** Enviar comando al overlay */
  sendCommand(command: string, data: unknown): Promise<void>;
}
