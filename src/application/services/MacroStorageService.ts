/**
 * MacroStorageService - Servicio de almacenamiento para macros
 * 
 * Este servicio gestiona la persistencia de macros, variables y logs de ejecución
 * usando IndexedDB con fallback a localStorage.
 * 
 * @requirements 1.4, 9.1, 9.2, 9.4
 */

import type { 
  Macro, 
  MacroVariable, 
  MacroExecutionLog 
} from '../../../types/macros';

// ============ CONSTANTS ============

const STORAGE_KEYS = {
  MACROS: 'twitchvote_macros',
  VARIABLES: 'twitchvote_macro_variables',
  EXECUTION_LOG: 'twitchvote_macro_execution_log',
} as const;

const MAX_EXECUTION_LOG_ENTRIES = 100;

// ============ INTERFACE ============

/**
 * Interface for MacroStorageService
 */
export interface IMacroStorageService {
  // Macro operations
  saveMacro(macro: Macro): Promise<void>;
  getMacro(id: string): Promise<Macro | null>;
  getAllMacros(): Promise<Macro[]>;
  deleteMacro(id: string): Promise<void>;
  
  // Variable operations
  saveVariable(variable: MacroVariable): Promise<void>;
  getVariable(name: string): Promise<MacroVariable | null>;
  getAllVariables(): Promise<MacroVariable[]>;
  deleteVariable(name: string): Promise<void>;
  
  // Execution log operations
  saveExecutionLog(log: MacroExecutionLog): Promise<void>;
  getExecutionLog(macroId?: string): Promise<MacroExecutionLog[]>;
  clearExecutionLog(): Promise<void>;
}

// ============ SERVICE CLASS ============

/**
 * MacroStorageService
 * 
 * Provides persistent storage for macros, variables, and execution logs.
 * Uses localStorage for simplicity and compatibility.
 * 
 * @requirements 1.4, 9.1, 9.2, 9.4
 */
export class MacroStorageService implements IMacroStorageService {
  
  // ============ MACRO OPERATIONS ============

  /**
   * Saves a macro to storage
   * 
   * @requirements 1.4
   */
  async saveMacro(macro: Macro): Promise<void> {
    const macros = await this.getAllMacros();
    const existingIndex = macros.findIndex(m => m.id === macro.id);
    
    if (existingIndex >= 0) {
      macros[existingIndex] = macro;
    } else {
      macros.push(macro);
    }
    
    this.saveToStorage(STORAGE_KEYS.MACROS, macros);
  }

  /**
   * Gets a macro by ID
   * 
   * @requirements 1.4
   */
  async getMacro(id: string): Promise<Macro | null> {
    const macros = await this.getAllMacros();
    return macros.find(m => m.id === id) || null;
  }

  /**
   * Gets all macros
   * 
   * @requirements 1.4
   */
  async getAllMacros(): Promise<Macro[]> {
    return this.getFromStorage<Macro[]>(STORAGE_KEYS.MACROS) || [];
  }

  /**
   * Deletes a macro by ID
   * 
   * @requirements 1.4
   */
  async deleteMacro(id: string): Promise<void> {
    const macros = await this.getAllMacros();
    const filtered = macros.filter(m => m.id !== id);
    this.saveToStorage(STORAGE_KEYS.MACROS, filtered);
  }

  // ============ VARIABLE OPERATIONS ============

  /**
   * Saves a variable to storage
   * 
   * @requirements 4.3
   */
  async saveVariable(variable: MacroVariable): Promise<void> {
    const variables = await this.getAllVariables();
    const existingIndex = variables.findIndex(v => v.name === variable.name);
    
    if (existingIndex >= 0) {
      variables[existingIndex] = variable;
    } else {
      variables.push(variable);
    }
    
    this.saveToStorage(STORAGE_KEYS.VARIABLES, variables);
  }

  /**
   * Gets a variable by name
   * 
   * @requirements 4.3
   */
  async getVariable(name: string): Promise<MacroVariable | null> {
    const variables = await this.getAllVariables();
    return variables.find(v => v.name === name) || null;
  }

  /**
   * Gets all variables
   * 
   * @requirements 4.3
   */
  async getAllVariables(): Promise<MacroVariable[]> {
    return this.getFromStorage<MacroVariable[]>(STORAGE_KEYS.VARIABLES) || [];
  }

  /**
   * Deletes a variable by name
   * 
   * @requirements 4.3
   */
  async deleteVariable(name: string): Promise<void> {
    const variables = await this.getAllVariables();
    const filtered = variables.filter(v => v.name !== name);
    this.saveToStorage(STORAGE_KEYS.VARIABLES, filtered);
  }

  // ============ EXECUTION LOG OPERATIONS ============

  /**
   * Saves an execution log entry
   * Limits to MAX_EXECUTION_LOG_ENTRIES entries
   * 
   * @requirements 9.1, 9.2, 9.4
   */
  async saveExecutionLog(log: MacroExecutionLog): Promise<void> {
    let logs = await this.getExecutionLog();
    
    // Add new log at the beginning
    logs.unshift(log);
    
    // Limit to MAX_EXECUTION_LOG_ENTRIES entries
    if (logs.length > MAX_EXECUTION_LOG_ENTRIES) {
      logs = logs.slice(0, MAX_EXECUTION_LOG_ENTRIES);
    }
    
    this.saveToStorage(STORAGE_KEYS.EXECUTION_LOG, logs);
  }

  /**
   * Gets execution logs, optionally filtered by macroId
   * 
   * @requirements 9.1, 9.2
   */
  async getExecutionLog(macroId?: string): Promise<MacroExecutionLog[]> {
    const logs = this.getFromStorage<MacroExecutionLog[]>(STORAGE_KEYS.EXECUTION_LOG) || [];
    
    if (macroId) {
      return logs.filter(log => log.macroId === macroId);
    }
    
    return logs;
  }

  /**
   * Clears all execution logs
   * 
   * @requirements 9.4
   */
  async clearExecutionLog(): Promise<void> {
    this.saveToStorage(STORAGE_KEYS.EXECUTION_LOG, []);
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Saves data to localStorage
   */
  private saveToStorage<T>(key: string, data: T): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      console.error(`MacroStorageService: Error saving to ${key}:`, error);
      
      // Handle QuotaExceededError
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded(key);
      }
    }
  }

  /**
   * Gets data from localStorage
   */
  private getFromStorage<T>(key: string): T | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      
      const data = localStorage.getItem(key);
      if (!data) {
        return null;
      }
      
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`MacroStorageService: Error reading from ${key}:`, error);
      return null;
    }
  }

  /**
   * Handles quota exceeded error by clearing old data
   */
  private handleQuotaExceeded(key: string): void {
    console.warn(`MacroStorageService: Storage quota exceeded for ${key}`);
    
    // If it's the execution log, clear half of it
    if (key === STORAGE_KEYS.EXECUTION_LOG) {
      try {
        const logs = this.getFromStorage<MacroExecutionLog[]>(key) || [];
        const halfLength = Math.floor(logs.length / 2);
        this.saveToStorage(key, logs.slice(0, halfLength));
      } catch {
        // If still failing, clear completely
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Clears all macro-related storage
   */
  async clearAll(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.MACROS);
      localStorage.removeItem(STORAGE_KEYS.VARIABLES);
      localStorage.removeItem(STORAGE_KEYS.EXECUTION_LOG);
    }
  }
}

// ============ SINGLETON INSTANCE ============

let macroStorageServiceInstance: MacroStorageService | null = null;

/**
 * Gets the singleton instance of MacroStorageService
 */
export function getMacroStorageService(): MacroStorageService {
  if (!macroStorageServiceInstance) {
    macroStorageServiceInstance = new MacroStorageService();
  }
  return macroStorageServiceInstance;
}

/**
 * Resets the singleton instance (useful for tests)
 */
export function resetMacroStorageService(): void {
  macroStorageServiceInstance = null;
}
