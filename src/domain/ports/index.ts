/**
 * Domain Ports - Interfaces que definen los contratos del dominio
 * 
 * Estos puertos son implementados por los adapters en infrastructure/
 * Permiten desacoplar la lógica de negocio de las implementaciones concretas.
 */

export * from './IChatProvider';
export * from './IOBSController';
export * from './IOverlaySync';
export * from './IStorage';
export * from './IStreamEventProvider';
export * from './IAnalyticsProvider';
export * from './IAlertPort';
export * from './IAlertProvider';
export * from './ICommandPort';
export * from './IAdvancedAnalyticsPort';
