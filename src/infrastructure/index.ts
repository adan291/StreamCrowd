/**
 * Infrastructure Layer - Implementaciones concretas
 * 
 * Este módulo contiene:
 * - Adapters: Implementaciones de los puertos del dominio
 * - Factories: Factories para crear instancias de proveedores
 * - Utils: Utilidades de infraestructura para gestión de recursos
 * 
 * REGLAS:
 * - Implementar interfaces de domain/ports/
 * - NO importar nada de presentation/
 * - Puede usar dependencias externas (Firebase, tmi.js, etc.)
 */

export * from './adapters';
export * from './factories';
export * from './utils';
