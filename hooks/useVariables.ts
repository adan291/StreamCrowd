/**
 * useVariables - Hook for managing custom macro variables
 * 
 * This hook provides access to the VariableResolverService for managing
 * user-defined custom variables that can be used in macros.
 * 
 * @requirements 4.3 - THE Macro_Service SHALL support user-defined custom variables
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  VariableResolverService,
  type IVariableResolver,
  type StreamData,
} from '../src/application/services/VariableResolverService';
import {
  MacroStorageService,
  getMacroStorageService,
  type IMacroStorageService,
} from '../src/application/services/MacroStorageService';
import type {
  MacroVariable,
  VariableType,
  SYSTEM_VARIABLES,
  STREAM_VARIABLES,
} from '../types/macros';

// ============ TYPES ============

/**
 * Options for the useVariables hook
 */
export interface UseVariablesOptions {
  /**
   * Custom VariableResolverService instance (useful for testing)
   */
  variableResolver?: IVariableResolver;
  /**
   * Custom MacroStorageService instance (useful for testing)
   */
  storageService?: IMacroStorageService;
  /**
   * Auto-load variables on mount (default: true)
   */
  autoLoad?: boolean;
}

/**
 * Return type for the useVariables hook
 */
export interface UseVariablesReturn {
  /**
   * List of user-defined variables
   * @requirements 4.3
   */
  variables: MacroVariable[];
  
  /**
   * Loading state
   */
  isLoading: boolean;
  
  /**
   * Error state
   */
  error: Error | null;
  
  /**
   * Sets a user-defined variable
   * @requirements 4.3
   */
  setVariable: (name: string, value: string | number | boolean, type?: VariableType) => Promise<void>;
  
  /**
   * Gets a variable by name
   */
  getVariable: (name: string) => MacroVariable | undefined;
  
  /**
   * Deletes a user-defined variable
   * @requirements 4.3
   */
  deleteVariable: (name: string) => Promise<void>;
  
  /**
   * Updates stream data for stream variables
   */
  updateStreamData: (data: Partial<StreamData>) => void;
  
  /**
   * Gets all available variable names (system + stream + user)
   */
  getAvailableVariables: () => string[];
  
  /**
   * Refreshes the variable list from storage
   */
  refresh: () => Promise<void>;
  
  /**
   * Clears all user-defined variables
   */
  clearAll: () => Promise<void>;
  
  /**
   * Clears the error state
   */
  clearError: () => void;
}

// ============ CONSTANTS ============

/**
 * System variable names (readonly)
 */
const SYSTEM_VARIABLE_NAMES = [
  'username',
  'displayName',
  'message',
  'platform',
  'timestamp',
];

/**
 * Stream variable names (readonly)
 */
const STREAM_VARIABLE_NAMES = [
  'viewers',
  'followers',
  'uptime',
  'game',
  'title',
];

// ============ SINGLETON ============

let variableResolverInstance: VariableResolverService | null = null;

/**
 * Gets the singleton instance of VariableResolverService
 */
function getVariableResolverService(): VariableResolverService {
  if (!variableResolverInstance) {
    variableResolverInstance = new VariableResolverService();
  }
  return variableResolverInstance;
}

// ============ HOOK ============

/**
 * Hook for managing custom macro variables
 * 
 * Provides access to user-defined variables that can be used in macros,
 * with persistence to storage.
 * 
 * @example
 * ```tsx
 * function VariableManager() {
 *   const {
 *     variables,
 *     setVariable,
 *     deleteVariable,
 *     getAvailableVariables,
 *   } = useVariables();
 *   
 *   const handleAddVariable = async () => {
 *     await setVariable('counter', 0, 'number');
 *   };
 *   
 *   const handleIncrement = async () => {
 *     const counter = variables.find(v => v.name === 'counter');
 *     if (counter && typeof counter.value === 'number') {
 *       await setVariable('counter', counter.value + 1, 'number');
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <h3>User Variables</h3>
 *       <ul>
 *         {variables.map(v => (
 *           <li key={v.name}>
 *             {v.name}: {String(v.value)}
 *             <button onClick={() => deleteVariable(v.name)}>Delete</button>
 *           </li>
 *         ))}
 *       </ul>
 *       <button onClick={handleAddVariable}>Add Counter</button>
 *       <button onClick={handleIncrement}>Increment</button>
 *       
 *       <h3>Available Variables</h3>
 *       <ul>
 *         {getAvailableVariables().map(name => (
 *           <li key={name}>{`{${name}}`}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @requirements 4.3
 */
export function useVariables(options: UseVariablesOptions = {}): UseVariablesReturn {
  const { variableResolver, storageService, autoLoad = true } = options;
  
  // Get service instances
  const resolverRef = useRef<IVariableResolver>(
    variableResolver || getVariableResolverService()
  );
  const storageRef = useRef<IMacroStorageService>(
    storageService || getMacroStorageService()
  );
  
  // State
  const [variables, setVariables] = useState<MacroVariable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track mounted state
  const isMountedRef = useRef(true);

  /**
   * Loads variables from storage and syncs with resolver
   */
  const loadVariables = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load from storage
      const storedVariables = await storageRef.current.getAllVariables();
      
      // Sync with resolver
      storedVariables.forEach(v => {
        if (v.scope === 'user' && !v.readonly) {
          resolverRef.current.setUserVariable(v.name, v.value, v.type);
        }
      });
      
      // Get current user variables from resolver
      const userVariables = resolverRef.current.getUserVariables();
      
      if (isMountedRef.current) {
        setVariables(userVariables);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load variables'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load variables on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    if (autoLoad) {
      loadVariables();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [autoLoad, loadVariables]);

  /**
   * Sets a user-defined variable
   * @requirements 4.3
   */
  const setVariable = useCallback(async (
    name: string,
    value: string | number | boolean,
    type?: VariableType
  ): Promise<void> => {
    setError(null);
    
    try {
      // Validate name
      if (!name || name.trim() === '') {
        throw new Error('Variable name is required');
      }
      
      // Check if trying to override system/stream variable
      if (SYSTEM_VARIABLE_NAMES.includes(name) || STREAM_VARIABLE_NAMES.includes(name)) {
        throw new Error(`Cannot override system variable: ${name}`);
      }
      
      // Detect type if not provided
      const detectedType: VariableType = type || (
        typeof value === 'number' ? 'number' :
        typeof value === 'boolean' ? 'boolean' : 'string'
      );
      
      // Set in resolver
      resolverRef.current.setUserVariable(name, value, detectedType);
      
      // Create variable object for storage
      const variable: MacroVariable = {
        name,
        type: detectedType,
        value,
        scope: 'user',
        readonly: false,
      };
      
      // Save to storage
      await storageRef.current.saveVariable(variable);
      
      // Update state
      if (isMountedRef.current) {
        setVariables(resolverRef.current.getUserVariables());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to set variable');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Gets a variable by name
   */
  const getVariable = useCallback((name: string): MacroVariable | undefined => {
    return variables.find(v => v.name === name);
  }, [variables]);

  /**
   * Deletes a user-defined variable
   * @requirements 4.3
   */
  const deleteVariable = useCallback(async (name: string): Promise<void> => {
    setError(null);
    
    try {
      // Delete from resolver
      resolverRef.current.deleteUserVariable(name);
      
      // Delete from storage
      await storageRef.current.deleteVariable(name);
      
      // Update state
      if (isMountedRef.current) {
        setVariables(resolverRef.current.getUserVariables());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete variable');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Updates stream data for stream variables
   */
  const updateStreamData = useCallback((data: Partial<StreamData>): void => {
    resolverRef.current.setStreamData(data);
  }, []);

  /**
   * Gets all available variable names (system + stream + user)
   */
  const getAvailableVariables = useCallback((): string[] => {
    const userNames = variables.map(v => v.name);
    return [
      ...SYSTEM_VARIABLE_NAMES,
      ...STREAM_VARIABLE_NAMES,
      ...userNames,
    ];
  }, [variables]);

  /**
   * Refreshes the variable list from storage
   */
  const refresh = useCallback(async (): Promise<void> => {
    await loadVariables();
  }, [loadVariables]);

  /**
   * Clears all user-defined variables
   */
  const clearAll = useCallback(async (): Promise<void> => {
    setError(null);
    
    try {
      // Get all user variables
      const userVars = resolverRef.current.getUserVariables();
      
      // Delete each from storage and resolver
      for (const v of userVars) {
        resolverRef.current.deleteUserVariable(v.name);
        await storageRef.current.deleteVariable(v.name);
      }
      
      // Update state
      if (isMountedRef.current) {
        setVariables([]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear variables');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  /**
   * Clears the error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    variables,
    isLoading,
    error,
    setVariable,
    getVariable,
    deleteVariable,
    updateStreamData,
    getAvailableVariables,
    refresh,
    clearAll,
    clearError,
  };
}

export default useVariables;
