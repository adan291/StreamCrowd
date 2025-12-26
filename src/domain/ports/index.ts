/**
 * Domain Ports - Interfaces que definen los contratos del dominio
 * 
 * Estos puertos son implementados por los adapters en infrastructure/
 * Permiten desacoplar la lógica de negocio de las implementaciones concretas.
 */

export * from './IChatProvider';
export * from './IOverlaySync';
export * from './IStorage';
