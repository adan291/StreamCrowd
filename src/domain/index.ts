/**
 * Domain Layer - Lógica de negocio pura
 * 
 * Este módulo contiene:
 * - Entities: Modelos de datos y lógica de negocio
 * - Ports: Interfaces que definen contratos con el exterior
 * 
 * REGLAS:
 * - NO importar nada de infrastructure/ o presentation/
 * - NO usar dependencias externas (React, Firebase, etc.)
 * - Solo lógica de negocio pura y tipos
 */

// Export entities (StreamEvent comes from here)
export * from './entities';

// Export ports (excluding StreamEvent which is already exported from entities)
export type { 
  ConnectionStatus,
  MessageCallback,
  StatusCallback,
  ChatMessage,
  IChatProvider
} from './ports/IChatProvider';
export * from './ports/IOBSController';
export * from './ports/IOverlaySync';
export * from './ports/IStorage';
export type { StreamEventCallback, IStreamEventProvider } from './ports/IStreamEventProvider';
export * from './ports/IAnalyticsProvider';
export * from './ports/IAlertPort';
export * from './ports/IAlertProvider';
export * from './ports/ICommandPort';
export * from './ports/IAdvancedAnalyticsPort';
