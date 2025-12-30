/**
 * useCompactMode - Hook para gestionar el modo compacto de la UI
 * 
 * Proporciona estado y toggle para el modo compacto con persistencia
 * en localStorage.
 * 
 * @requirements 7.1 - Toggle para modo compacto
 * @requirements 7.5 - Persistencia en localStorage
 */

import { useState, useCallback, useEffect } from 'react';

const COMPACT_MODE_KEY = 'activity_compact_mode';

/**
 * Guarda el estado del modo compacto en localStorage
 */
export const saveCompactMode = (isCompact: boolean): void => {
  try {
    localStorage.setItem(COMPACT_MODE_KEY, JSON.stringify(isCompact));
  } catch {
    // localStorage no disponible, ignorar silenciosamente
  }
};

/**
 * Carga el estado del modo compacto desde localStorage
 */
export const loadCompactMode = (): boolean => {
  try {
    const stored = localStorage.getItem(COMPACT_MODE_KEY);
    if (stored !== null) {
      return JSON.parse(stored) === true;
    }
  } catch {
    // localStorage no disponible o valor inválido
  }
  return false; // Default: modo normal
};

/**
 * Interfaz del valor retornado por useCompactMode
 */
export interface CompactModeValue {
  /** Estado actual del modo compacto */
  isCompact: boolean;
  /** Función para alternar el modo compacto */
  toggleCompact: () => void;
  /** Función para establecer el modo compacto directamente */
  setCompact: (value: boolean) => void;
}

/**
 * Hook para gestionar el modo compacto de la UI
 * 
 * @param initialValue - Valor inicial opcional (default: carga de localStorage)
 * @returns Objeto con estado y funciones de control
 * 
 * @example
 * const { isCompact, toggleCompact } = useCompactMode();
 * 
 * return (
 *   <button onClick={toggleCompact}>
 *     {isCompact ? 'Modo Normal' : 'Modo Compacto'}
 *   </button>
 * );
 */
export const useCompactMode = (initialValue?: boolean): CompactModeValue => {
  // Inicializar desde localStorage o valor proporcionado
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (initialValue !== undefined) {
      return initialValue;
    }
    return loadCompactMode();
  });

  // Persistir cambios en localStorage
  useEffect(() => {
    saveCompactMode(isCompact);
  }, [isCompact]);

  // Toggle del modo compacto
  const toggleCompact = useCallback(() => {
    setIsCompact(prev => !prev);
  }, []);

  // Setter directo
  const setCompact = useCallback((value: boolean) => {
    setIsCompact(value);
  }, []);

  return {
    isCompact,
    toggleCompact,
    setCompact,
  };
};

export default useCompactMode;
