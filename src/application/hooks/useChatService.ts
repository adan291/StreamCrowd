/**
 * useChatService Hook
 * 
 * Hook de React para usar ChatService con la arquitectura hexagonal.
 * Proporciona una API similar a useTwitchConnection pero usando
 * el servicio desacoplado que soporta múltiples proveedores.
 * 
 * @module src/application/hooks/useChatService
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatService, getChatService, ChatServiceConfig } from '../services/ChatService';
import type { ChatMessage, ConnectionStatus } from '../../domain/ports/IChatProvider';

export interface UseChatServiceReturn {
  /** Estado de conexión actual */
  connectionStatus: ConnectionStatus;
  /** Nombre del canal conectado */
  channelName: string | null;
  /** Mensajes del chat */
  messages: ChatMessage[];
  /** Conectar a un canal */
  connect: (channel: string, token?: string, userId?: string) => Promise<void>;
  /** Desconectar del canal actual */
  disconnect: () => Promise<void>;
  /** Enviar un mensaje al chat */
  sendMessage: (message: string) => Promise<boolean>;
  /** Limpiar mensajes */
  clearMessages: () => void;
  /** Servicio subyacente para acceso directo */
  service: ChatService;
}

export interface UseChatServiceOptions {
  /** Callback cuando cambia el estado de conexión */
  onStatusChange?: (status: ConnectionStatus, error?: string) => void;
  /** Callback cuando llega un mensaje */
  onMessage?: (message: ChatMessage) => void;
  /** Máximo de mensajes a mantener en memoria */
  maxMessages?: number;
}

/**
 * Hook para gestionar la conexión al chat usando ChatService
 * 
 * @example
 * ```tsx
 * const { connectionStatus, messages, connect, disconnect } = useChatService();
 * 
 * // Conectar
 * await connect('streamer_name', 'oauth:token');
 * 
 * // Los mensajes se actualizan automáticamente
 * console.log(messages);
 * ```
 */
export function useChatService(options: UseChatServiceOptions = {}): UseChatServiceReturn {
  const { onStatusChange, onMessage, maxMessages = 500 } = options;
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [channelName, setChannelName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const serviceRef = useRef<ChatService | null>(null);
  
  // Crear servicio con callbacks
  useEffect(() => {
    const config: ChatServiceConfig = {
      onMessage: (message) => {
        setMessages(prev => {
          const updated = [...prev, message];
          return updated.slice(-maxMessages);
        });
        onMessage?.(message);
      },
      onStatusChange: (status, error) => {
        setConnectionStatus(status);
        onStatusChange?.(status, error);
      },
    };
    
    serviceRef.current = new ChatService(config);
    
    return () => {
      serviceRef.current?.dispose();
    };
  }, [maxMessages, onMessage, onStatusChange]);
  
  const connect = useCallback(async (channel: string, token?: string, userId?: string) => {
    if (!serviceRef.current) return;
    await serviceRef.current.connect({ channel, token, userId });
    setChannelName(serviceRef.current.getCurrentChannel());
  }, []);
  
  const disconnect = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.disconnect();
    setChannelName(null);
    setMessages([]);
  }, []);
  
  const sendMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!serviceRef.current) return false;
    return serviceRef.current.sendMessage(message);
  }, []);
  
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);
  
  return {
    connectionStatus,
    channelName,
    messages,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    service: serviceRef.current || getChatService(),
  };
}

export default useChatService;
