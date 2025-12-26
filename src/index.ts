/**
 * Hexagonal Architecture - Main Exports
 * 
 * Estructura:
 * - domain/    → Lógica de negocio pura (entities + ports)
 * - infrastructure/ → Implementaciones concretas (adapters)
 * - application/    → Servicios, hooks y juegos
 */

// Domain
export * from './domain/entities/Poll';
export * from './domain/entities/Vote';
export * from './domain/ports/IChatProvider';
export * from './domain/ports/IOverlaySync';
export * from './domain/ports/IStorage';

// Infrastructure
export * from './infrastructure/factories/ProviderFactory';

// Application
export * from './application';
