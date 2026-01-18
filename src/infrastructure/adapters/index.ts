/**
 * Infrastructure Adapters - Implementaciones concretas de los puertos
 * 
 * Estos adapters implementan las interfaces definidas en domain/ports/
 * y pueden ser intercambiados sin afectar la lógica de negocio.
 */

export * from './FirebaseSyncAdapter';
export * from './EnhancedFirebaseAdapter';
export * from './LocalStorageAdapter';
export * from './LocalStorageAlertAdapter';
export * from './LocalStorageAnalyticsAdapter';
export * from './LocalStorageCommandAdapter';
export * from './OBSWebSocketAdapter';
export * from './StreamElementsAdapter';
export * from './StreamlabsAdapter';
export * from './TwitchAdapter';
export * from './YouTubeAdapter';
export * from './KickAdapter';
