/**
 * Infrastructure Adapters - Implementaciones concretas de los puertos
 * 
 * Estos adapters implementan las interfaces definidas en domain/ports/
 * y pueden ser intercambiados sin afectar la lógica de negocio.
 */

export * from './TwitchAdapter';
export * from './FirebaseSyncAdapter';
export * from './LocalStorageAdapter';
