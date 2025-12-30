/**
 * useMacroExecution - Hook for executing macros manually
 * 
 * This hook provides access to macro execution functionality,
 * including manual execution, execution logs, and global pause/resume.
 * 
 * @requirements 9.3 - THE Macro_Service SHALL show a real-time log of executions
 * @requirements 9.6 - THE Macro_Service SHALL allow pausing all macros globally (emergency mode)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  MacroService,
  getMacroService,
  type IMacroService,
} from '../src/application/services/MacroService';
import {
  MacroStorageService,
  getMacroStorageService,
  type IMacroStorageService,
} from '../src/application/services/MacroStorageService';
import type {
  ExecutionContext,
  ExecutionResult,
  MacroExecutionLog,
  TriggerType,
  MacroVariable,
} from '../types/macros';

// ============ TYPES ============

/**
 * Options for the useMacroExecution hook
 */
export interface UseMacroExecutionOptions {
  /**
   * Custom MacroService instance (useful for testing)
   */
  macroService?: IMacroService;
  /**
   * Custom MacroStorageService instance (useful for testing)
   */
  storageService?: IMacroStorageService;
  /**
   * Auto-load execution log on mount (default: true)
   */
  autoLoadLog?: boolean;
  /**
   * Polling interval for log updates in ms (default: 2000)
   */
  logPollingInterval?: number;
}

/**
 * Return type for the useMacroExecution hook
 */
export interface UseMacroExecutionReturn {
  /**
   * Execution log entries
   * @requirements 9.3
   */
  executionLog: MacroExecutionLog[];
  
  /**
   * Whether macros are globally paused
   * @requirements 9.6
   */
  isPaused: boolean;
  
  /**
   * Whether an execution is in progress
   */
  isExecuting: boolean;
  
  /**
   * Last execution result
   */
  lastResult: ExecutionResult | null;
  
  /**
   * Error state
   */
  error: Error | null;
  
  /**
   * Executes a macro manually
   */
  execute: (macroId: string, context?: Partial<ExecutionContext>) => Promise<ExecutionResult>;
  
  /**
   * Pauses all macro execution globally
   * @requirements 9.6
   */
  pauseAll: () => void;
  
  /**
   * Resumes all macro execution globally
   * @requirements 9.6
   */
  resumeAll: () => void;
  
  /**
   * Toggles global pause state
   * @requirements 9.6
   */
  togglePause: () => void;
  
  /**
   * Refreshes the execution log
   */
  refreshLog: () => Promise<void>;
  
  /**
   * Gets execution log for a specific macro
   */
  getLogForMacro: (macroId: string) => MacroExecutionLog[];
  
  /**
   * Clears the execution log
   */
  clearLog: () => Promise<void>;
  
  /**
   * Clears the error state
   */
  clearError: () => void;
}

// ============ HELPERS ============

/**
 * Creates a default execution context for manual execution
 */
function createDefaultContext(): ExecutionContext {
  return {
    triggeredBy: 'manual' as TriggerType,
    variables: new Map<string, MacroVariable>(),
  };
}

/**
 * Merges partial context with default context
 */
function mergeContext(partial?: Partial<ExecutionContext>): ExecutionContext {
  const defaultContext = createDefaultContext();
  
  if (!partial) {
    return defaultContext;
  }
  
  return {
    triggeredBy: partial.triggeredBy ?? defaultContext.triggeredBy,
    user: partial.user,
    message: partial.message,
    event: partial.event,
    variables: partial.variables ?? defaultContext.variables,
  };
}

// ============ HOOK ============

/**
 * Hook for executing macros manually
 * 
 * Provides access to macro execution functionality with reactive state
 * for execution logs and global pause control.
 * 
 * @example
 * ```tsx
 * function MacroExecutor({ macroId }: { macroId: string }) {
 *   const {
 *     execute,
 *     executionLog,
 *     isPaused,
 *     pauseAll,
 *     resumeAll,
 *     isExecuting,
 *   } = useMacroExecution();
 *   
 *   const handleExecute = async () => {
 *     try {
 *       const result = await execute(macroId);
 *       console.log('Execution result:', result);
 *     } catch (error) {
 *       console.error('Execution failed:', error);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleExecute} disabled={isExecuting || isPaused}>
 *         Execute Macro
 *       </button>
 *       <button onClick={isPaused ? resumeAll : pauseAll}>
 *         {isPaused ? 'Resume All' : 'Pause All'}
 *       </button>
 *       <h3>Execution Log</h3>
 *       <ul>
 *         {executionLog.map(log => (
 *           <li key={log.id}>
 *             {log.macroName}: {log.success ? 'Success' : 'Failed'}
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @requirements 9.3, 9.6
 */
export function useMacroExecution(
  options: UseMacroExecutionOptions = {}
): UseMacroExecutionReturn {
  const {
    macroService,
    storageService,
    autoLoadLog = true,
    logPollingInterval = 2000,
  } = options;
  
  // Get service instances
  const macroServiceRef = useRef<IMacroService>(
    macroService || getMacroService()
  );
  const storageServiceRef = useRef<IMacroStorageService>(
    storageService || getMacroStorageService()
  );
  
  // State
  const [executionLog, setExecutionLog] = useState<MacroExecutionLog[]>([]);
  const [isPaused, setIsPaused] = useState(() => {
    // Check initial pause state from service
    if (macroServiceRef.current instanceof MacroService) {
      return macroServiceRef.current.isPaused();
    }
    return false;
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Track mounted state
  const isMountedRef = useRef(true);

  /**
   * Loads execution log from storage
   */
  const loadExecutionLog = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const log = await storageServiceRef.current.getExecutionLog();
      if (isMountedRef.current) {
        setExecutionLog(log);
      }
    } catch (err) {
      console.warn('Failed to load execution log:', err);
    }
  }, []);

  // Load log on mount and poll for updates
  useEffect(() => {
    isMountedRef.current = true;
    
    if (autoLoadLog) {
      loadExecutionLog();
      
      // Poll for updates
      const interval = setInterval(loadExecutionLog, logPollingInterval);
      
      return () => {
        isMountedRef.current = false;
        clearInterval(interval);
      };
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [autoLoadLog, loadExecutionLog, logPollingInterval]);

  /**
   * Executes a macro manually
   */
  const execute = useCallback(async (
    macroId: string,
    partialContext?: Partial<ExecutionContext>
  ): Promise<ExecutionResult> => {
    if (!isMountedRef.current) {
      throw new Error('Component unmounted');
    }
    
    setIsExecuting(true);
    setError(null);
    
    try {
      const context = mergeContext(partialContext);
      const result = await macroServiceRef.current.executeMacro(macroId, context);
      
      if (isMountedRef.current) {
        setLastResult(result);
        // Refresh log after execution
        await loadExecutionLog();
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Execution failed');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsExecuting(false);
      }
    }
  }, [loadExecutionLog]);

  /**
   * Pauses all macro execution globally
   * @requirements 9.6
   */
  const pauseAll = useCallback(() => {
    macroServiceRef.current.pauseAll();
    if (isMountedRef.current) {
      setIsPaused(true);
    }
  }, []);

  /**
   * Resumes all macro execution globally
   * @requirements 9.6
   */
  const resumeAll = useCallback(() => {
    macroServiceRef.current.resumeAll();
    if (isMountedRef.current) {
      setIsPaused(false);
    }
  }, []);

  /**
   * Toggles global pause state
   * @requirements 9.6
   */
  const togglePause = useCallback(() => {
    if (isPaused) {
      resumeAll();
    } else {
      pauseAll();
    }
  }, [isPaused, pauseAll, resumeAll]);

  /**
   * Refreshes the execution log
   */
  const refreshLog = useCallback(async (): Promise<void> => {
    await loadExecutionLog();
  }, [loadExecutionLog]);

  /**
   * Gets execution log for a specific macro
   */
  const getLogForMacro = useCallback((macroId: string): MacroExecutionLog[] => {
    return executionLog.filter(log => log.macroId === macroId);
  }, [executionLog]);

  /**
   * Clears the execution log
   */
  const clearLog = useCallback(async (): Promise<void> => {
    setError(null);
    
    try {
      await storageServiceRef.current.clearExecutionLog();
      if (isMountedRef.current) {
        setExecutionLog([]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear log');
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
    executionLog,
    isPaused,
    isExecuting,
    lastResult,
    error,
    execute,
    pauseAll,
    resumeAll,
    togglePause,
    refreshLog,
    getLogForMacro,
    clearLog,
    clearError,
  };
}

export default useMacroExecution;
