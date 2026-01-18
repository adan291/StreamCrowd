/**
 * Domain Ports - Interfaces que definen los contratos del dominio
 * 
 * Estos puertos son implementados por los adapters en infrastructure/
 * Permiten desacoplar la lógica de negocio de las implementaciones concretas.
 */

// IChatProvider exports (excluding StreamEventCallback which is also in IStreamEventProvider)
export type { 
  ConnectionStatus as ChatConnectionStatus,
  MessageCallback,
  StatusCallback,
  ChatMessage,
  StreamEvent as ChatStreamEvent,
  IChatProvider
} from './IChatProvider';

export * from './IOBSController';

// Enhanced IOverlaySync exports
export type {
  OverlayType,
  OverlayState,
  ConnectionStatus,
  SyncCallback,
  SyncResult,
  SyncSubscription,
  SyncMetrics,
  DiagnosticInfo,
  IOverlaySync,
  IBidirectionalSync,
  SyncProviderConfig,
  ISyncProviderFactory,
  SyncProviderEvent,
  ISyncProviderEventListener,
  IEnhancedOverlaySync
} from './IOverlaySync';

export * from './IStorage';
export * from './IStreamEventProvider';
export * from './IAnalyticsProvider';
export * from './IAlertPort';
export * from './IAlertProvider';
export * from './ICommandPort';
export * from './IAdvancedAnalyticsPort';
