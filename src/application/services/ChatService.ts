/**
 * ChatService - Servicio de aplicación para gestión de chat
 * 
 * Este servicio orquesta la comunicación con el proveedor de chat
 * y proporciona una API limpia para los hooks de React.
 * 
 * Beneficios:
 * - Desacopla los hooks del proveedor concreto
 * - Facilita testing con mocks
 * - Permite cambiar de Twitch a YouTube sin modificar hooks
 */

import type { 
  IChatProvider, 
  IMultiChannelProvider,
  ChatMessage, 
  StreamEvent,
  ConnectionStatus,
  ConnectionOptions,
} from '../../domain/ports/IChatProvider';
import { getChatProvider } from '../../infrastructure/factories/ProviderFactory';

export interface ChatServiceConfig {
  /** Callback cuando se recibe un mensaje */
  onMessage?: (message: ChatMessage) => void;
  /** Callback cuando cambia el estado de conexión */
  onStatusChange?: (status: ConnectionStatus, error?: string) => void;
  /** Callback cuando ocurre un evento de stream */
  onStreamEvent?: (event: StreamEvent) => void;
}

export class ChatService {
  private provider: IChatProvider;
  private config: ChatServiceConfig;
  private unsubscribers: Array<() => void> = [];
  
  constructor(config: ChatServiceConfig = {}) {
    this.provider = getChatProvider();
    this.config = config;
    this.setupCallbacks();
  }
  
  private setupCallbacks(): void {
    if (this.config.onMessage) {
      const unsub = this.provider.onMessage(this.config.onMessage);
      this.unsubscribers.push(unsub);
    }
    
    if (this.config.onStatusChange) {
      const unsub = this.provider.onStatusChange(this.config.onStatusChange);
      this.unsubscribers.push(unsub);
    }
    
    if (this.config.onStreamEvent) {
      const unsub = this.provider.onStreamEvent(this.config.onStreamEvent);
      this.unsubscribers.push(unsub);
    }
  }
  
  /**
   * Conectar a un canal
   */
  async connect(options: ConnectionOptions): Promise<void> {
    await this.provider.connect(options);
  }
  
  /**
   * Desconectar del canal actual
   */
  async disconnect(): Promise<void> {
    await this.provider.disconnect();
  }
  
  /**
   * Enviar mensaje al chat
   */
  async sendMessage(message: string): Promise<boolean> {
    return this.provider.sendMessage(message);
  }
  
  /**
   * Obtener estado de conexión actual
   */
  getStatus(): ConnectionStatus {
    return this.provider.getConnectionStatus();
  }
  
  /**
   * Obtener canal actual
   */
  getCurrentChannel(): string | null {
    return this.provider.getCurrentChannel();
  }
  
  /**
   * Obtener conteo de viewers
   */
  async getViewerCount(channel?: string): Promise<number | null> {
    return this.provider.getViewerCount(channel);
  }
  
  /**
   * Obtener información del canal
   */
  async getChannelInfo(channel?: string) {
    return this.provider.getChannelInfo(channel);
  }
  
  /**
   * Añadir canal de colaboración (si el proveedor lo soporta)
   */
  async addCollaborationChannel(channel: string): Promise<boolean> {
    if ('addChannel' in this.provider) {
      return (this.provider as IMultiChannelProvider).addChannel(channel);
    }
    return false;
  }
  
  /**
   * Eliminar canal de colaboración
   */
  removeCollaborationChannel(channel: string): void {
    if ('removeChannel' in this.provider) {
      (this.provider as IMultiChannelProvider).removeChannel(channel);
    }
  }
  
  /**
   * Obtener canales conectados
   */
  getConnectedChannels(): string[] {
    if ('getConnectedChannels' in this.provider) {
      return (this.provider as IMultiChannelProvider).getConnectedChannels();
    }
    const current = this.provider.getCurrentChannel();
    return current ? [current] : [];
  }
  
  /**
   * Verificar si soporta múltiples canales
   */
  supportsMultiChannel(): boolean {
    return 'addChannel' in this.provider;
  }
  
  /**
   * Obtener ID del proveedor
   */
  getProviderId(): string {
    return this.provider.providerId;
  }
  
  /**
   * Obtener nombre del proveedor
   */
  getProviderName(): string {
    return this.provider.providerName;
  }
  
  /**
   * Limpiar recursos
   */
  dispose(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}

// Singleton para uso global (backward compatibility)
let defaultService: ChatService | null = null;

export function getChatService(config?: ChatServiceConfig): ChatService {
  if (!defaultService) {
    defaultService = new ChatService(config);
  }
  return defaultService;
}

export function resetChatService(): void {
  if (defaultService) {
    defaultService.dispose();
    defaultService = null;
  }
}
