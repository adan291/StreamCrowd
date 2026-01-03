/**
 * useMacros - Hook for CRUD operations on macros
 * 
 * This hook provides access to the MacroService for managing macros,
 * including creating, updating, deleting, and listing macros.
 * 
 * @requirements 7.1 - THE Macro_Manager SHALL show list of all macros with state
 * @requirements 7.2 - THE Macro_Manager SHALL allow enabling/disabling macros individually
 * @requirements 7.3 - THE Macro_Manager SHALL allow duplicating macros
 * @requirements 7.4 - THE Macro_Manager SHALL allow deleting macros with confirmation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  MacroService,
  getMacroService,
  type IMacroService,
} from '../src/application/services/MacroService';
import type {
  Macro,
  MacroFormData,
  MacroImportResult,
} from '../types/macros';

// ============ TYPES ============

/**
 * Options for the useMacros hook
 */
export interface UseMacrosOptions {
  /**
   * Custom MacroService instance (useful for testing)
   */
  macroService?: IMacroService;
  /**
   * Auto-load macros on mount (default: true)
   */
  autoLoad?: boolean;
}

/**
 * Return type for the useMacros hook
 */
export interface UseMacrosReturn {
  /**
   * List of all macros
   * @requirements 7.1
   */
  macros: Macro[];
  
  /**
   * Loading state
   */
  isLoading: boolean;
  
  /**
   * Error state
   */
  error: Error | null;
  
  /**
   * Creates a new macro
   */
  createMacro: (data: MacroFormData) => Promise<Macro>;
  
  /**
   * Updates an existing macro
   */
  updateMacro: (id: string, updates: Partial<MacroFormData>) => Promise<Macro>;
  
  /**
   * Deletes a macro by ID
   * @requirements 7.4
   */
  deleteMacro: (id: string) => Promise<void>;
  
  /**
   * Gets a macro by ID
   */
  getMacro: (id: string) => Promise<Macro | null>;
  
  /**
   * Toggles macro enabled state
   * @requirements 7.2
   */
  toggleMacro: (id: string) => Promise<Macro>;
  
  /**
   * Duplicates a macro
   * @requirements 7.3
   */
  duplicateMacro: (id: string, newName?: string) => Promise<Macro>;
  
  /**
   * Exports selected macros to JSON
   */
  exportMacros: (ids: string[], author?: string) => Promise<string>;
  
  /**
   * Imports macros from JSON
   */
  importMacros: (json: string) => Promise<MacroImportResult>;
  
  /**
   * Refreshes the macro list
   */
  refresh: () => Promise<void>;
  
  /**
   * Clears the error state
   */
  clearError: () => void;
  
  /**
   * Clears the last error of a specific macro
   */
  clearMacroError: (id: string) => Promise<void>;
}

// ============ HOOK ============

/**
 * Hook for CRUD operations on macros
 * 
 * Provides access to the MacroService for managing macros with
 * reactive state updates.
 * 
 * @example
 * ```tsx
 * function MacroList() {
 *   const { macros, isLoading, createMacro, deleteMacro, toggleMacro } = useMacros();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   return (
 *     <ul>
 *       {macros.map(macro => (
 *         <li key={macro.id}>
 *           {macro.name}
 *           <button onClick={() => toggleMacro(macro.id)}>
 *             {macro.enabled ? 'Disable' : 'Enable'}
 *           </button>
 *           <button onClick={() => deleteMacro(macro.id)}>Delete</button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 * 
 * @requirements 7.1, 7.2, 7.3, 7.4
 */
export function useMacros(options: UseMacrosOptions = {}): UseMacrosReturn {
  const { macroService, autoLoad = true } = options;
  
  // Get service instance
  const serviceRef = useRef<IMacroService>(
    macroService || getMacroService()
  );
  
  // State
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track mounted state
  const isMountedRef = useRef(true);

  /**
   * Loads all macros from the service
   */
  const loadMacros = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const allMacros = await serviceRef.current.getAllMacros();
      if (isMountedRef.current) {
        setMacros(allMacros);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load macros'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load macros on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    if (autoLoad) {
      loadMacros();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [autoLoad, loadMacros]);

  /**
   * Creates a new macro
   */
  const createMacro = useCallback(async (data: MacroFormData): Promise<Macro> => {
    setError(null);
    
    try {
      const newMacro = await serviceRef.current.createMacro(data);
      
      if (isMountedRef.current) {
        setMacros(prev => [...prev, newMacro]);
      }
      
      return newMacro;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create macro');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Updates an existing macro
   */
  const updateMacro = useCallback(async (
    id: string,
    updates: Partial<MacroFormData>
  ): Promise<Macro> => {
    setError(null);
    
    try {
      const updatedMacro = await serviceRef.current.updateMacro(id, updates);
      
      if (isMountedRef.current) {
        setMacros(prev => prev.map(m => m.id === id ? updatedMacro : m));
      }
      
      return updatedMacro;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update macro');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Deletes a macro by ID
   * @requirements 7.4
   */
  const deleteMacro = useCallback(async (id: string): Promise<void> => {
    setError(null);
    
    try {
      await serviceRef.current.deleteMacro(id);
      
      if (isMountedRef.current) {
        setMacros(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete macro');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Gets a macro by ID
   */
  const getMacro = useCallback(async (id: string): Promise<Macro | null> => {
    setError(null);
    
    try {
      return await serviceRef.current.getMacro(id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get macro');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Toggles macro enabled state
   * @requirements 7.2
   */
  const toggleMacro = useCallback(async (id: string): Promise<Macro> => {
    setError(null);
    
    try {
      const macro = await serviceRef.current.getMacro(id);
      if (!macro) {
        throw new Error(`Macro not found: ${id}`);
      }
      
      const updatedMacro = await serviceRef.current.updateMacro(id, {
        enabled: !macro.enabled
      });
      
      if (isMountedRef.current) {
        setMacros(prev => prev.map(m => m.id === id ? updatedMacro : m));
      }
      
      return updatedMacro;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to toggle macro');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Duplicates a macro
   * @requirements 7.3
   */
  const duplicateMacro = useCallback(async (
    id: string,
    newName?: string
  ): Promise<Macro> => {
    setError(null);
    
    try {
      const macro = await serviceRef.current.getMacro(id);
      if (!macro) {
        throw new Error(`Macro not found: ${id}`);
      }
      
      const duplicateData: MacroFormData = {
        name: newName || `${macro.name} (copy)`,
        description: macro.description,
        enabled: false, // Start disabled
        trigger: { ...macro.trigger },
        actions: macro.actions.map(a => ({ ...a, id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` })),
        cooldown: macro.cooldown
      };
      
      const newMacro = await serviceRef.current.createMacro(duplicateData);
      
      if (isMountedRef.current) {
        setMacros(prev => [...prev, newMacro]);
      }
      
      return newMacro;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to duplicate macro');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Exports selected macros to JSON
   */
  const exportMacros = useCallback(async (
    ids: string[],
    author?: string
  ): Promise<string> => {
    setError(null);
    
    try {
      return await serviceRef.current.exportMacros(ids, author);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to export macros');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Imports macros from JSON
   */
  const importMacros = useCallback(async (json: string): Promise<MacroImportResult> => {
    setError(null);
    
    try {
      const result = await serviceRef.current.importMacros(json);
      
      // Refresh the list after import
      if (isMountedRef.current && result.imported > 0) {
        await loadMacros();
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to import macros');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, [loadMacros]);

  /**
   * Refreshes the macro list
   */
  const refresh = useCallback(async (): Promise<void> => {
    await loadMacros();
  }, [loadMacros]);

  /**
   * Clears the error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clears the last error of a specific macro
   */
  const clearMacroError = useCallback(async (id: string): Promise<void> => {
    try {
      // Update macro to clear the error
      await serviceRef.current.updateMacro(id, {});
      
      // Update local state
      if (isMountedRef.current) {
        setMacros(prev => prev.map(m => m.id === id ? { ...m, lastError: undefined } : m));
      }
    } catch (err) {
      console.error('Failed to clear macro error:', err);
    }
  }, []);

  return {
    macros,
    isLoading,
    error,
    createMacro,
    updateMacro,
    deleteMacro,
    getMacro,
    toggleMacro,
    duplicateMacro,
    exportMacros,
    importMacros,
    refresh,
    clearError,
    clearMacroError,
  };
}

export default useMacros;
