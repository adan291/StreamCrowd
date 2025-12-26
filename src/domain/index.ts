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

export * from './entities';
export * from './ports';
