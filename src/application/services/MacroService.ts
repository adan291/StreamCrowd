/**
 * MacroService - Orchestrator service for the macro system
 * 
 * This service coordinates all macro-related operations:
 * - CRUD operations for macros (create, read, update, delete)
 * - Macro execution with condition evaluation and action execution
 * - Integration with TriggerService for auto-execution
 * - Global pause/resume functionality
 * - Execution logging
 * 
 * @requirements 1.1 - THE Macro_Service SHALL define a macro with: id, name, description, trigger, actions, conditions and state
 * @requirements 1.2 - THE Macro_Service SHALL support multiple actions per macro in sequential order
 * @requirements 1.3 - THE Macro_Service SHALL allow delays between actions (0-60 seconds)
 * @requirements 9.6 - THE Macro_Service SHALL allow pausing all macros globally (emergency mode)
 */

import type {
  Macro,
  MacroFormData,
  MacroAction,
  MacroTrigger,
  ExecutionContext,
  ExecutionResult,
  ActionResult,
  MacroExecutionLog,
  TriggerType,
  MacroVariable,
  MacroExport,
  MacroImportResult
} from '../../../types/macros';
import { TriggerService, type ITriggerService } from './TriggerService';
import { ActionExecutorService, type IActionExecutor, type ActionExecutorDependencies } from './ActionExecutorService';
import { ConditionEvaluatorService, type IConditionEvaluator } from './ConditionEvaluatorService';
import { VariableResolverService, type IVariableResolver } from './VariableResolverService';
import { MacroStorageService, type IMacroStorageService } from './MacroStorageService';

// ============ CONSTANTS ============

const MIN_DELAY = 0;
const MAX_DELAY = 60;
const EXPORT_VERSION = '1.0.0';

// ============ INTERFACES ============

/**
 * Interface for MacroService dependencies
 */
export interface MacroServiceDependencies {
  triggerService?: ITriggerService;
  actionExecutor?: IActionExecutor;
  conditionEvaluator?: IConditionEvaluator;
  variableResolver?: IVariableResolver;
  storageService?: IMacroStorageService;
  actionExecutorDependencies?: ActionExecutorDependencies;
}

/**
 * Interface for the MacroService
 */
export interface IMacroService {
  // CRUD operations
  createMacro(data: MacroFormData): Promise<Macro>;
  updateMacro(id: string, updates: Partial<MacroFormData>): Promise<Macro>;
  deleteMacro(id: string): Promise<void>;
  getMacro(id: string): Promise<Macro | null>;
  getAllMacros(): Promise<Macro[]>;
  
  // Execution
  executeMacro(id: string, context: ExecutionContext): Promise<ExecutionResult>;
  
  // Global controls
  pauseAll(): void;
  resumeAll(): void;
  isPaused(): boolean;
  
  // Service configuration
  configureServices(services: Partial<ActionExecutorDependencies>): void;
  
  // Import/Export
  exportMacros(ids: string[], author?: string): Promise<string>;
  importMacros(json: string): Promise<MacroImportResult>;
}

// ============ VALIDATION ============

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a macro structure
 * @requirements 1.1, 1.2, 1.3
 */
function validateMacro(data: MacroFormData): ValidationResult {
  const errors: string[] = [];

  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Macro name is required');
  }

  // Validate trigger
  if (!data.trigger) {
    errors.push('Macro trigger is required');
  } else if (!isValidTriggerType(data.trigger.type)) {
    errors.push(`Invalid trigger type: ${data.trigger.type}`);
  }

  // Validate actions
  if (!data.actions || !Array.isArray(data.actions)) {
    errors.push('Macro actions must be an array');
  } else {
    data.actions.forEach((action, index) => {
      const actionErrors = validateAction(action, index);
      errors.push(...actionErrors);
    });
  }

  // Validate cooldown
  if (data.cooldown !== undefined && (data.cooldown < 0 || data.cooldown > 3600)) {
    errors.push('Cooldown must be between 0 and 3600 seconds');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a single action
 * @requirements 1.3
 */
function validateAction(action: MacroAction, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Action ${index + 1}`;

  if (!action.id) {
    errors.push(`${prefix}: Action ID is required`);
  }

  if (!action.type) {
    errors.push(`${prefix}: Action type is required`);
  }

  if (!action.config) {
    errors.push(`${prefix}: Action config is required`);
  }

  // Validate delay (0-60 seconds)
  if (action.delay !== undefined) {
    if (action.delay < MIN_DELAY || action.delay > MAX_DELAY) {
      errors.push(`${prefix}: Delay must be between ${MIN_DELAY} and ${MAX_DELAY} seconds`);
    }
  }

  return errors;
}

/**
 * Checks if a trigger type is valid
 */
function isValidTriggerType(type: string): type is TriggerType {
  return ['chat_command', 'chat_keyword', 'schedule', 'event', 'manual'].includes(type);
}

/**
 * Generates a unique ID
 */
function generateId(): string {
  return `macro_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============ SERVICE CLASS ============

/**
 * MacroService class
 * 
 * Orchestrates macro operations, coordinating between trigger detection,
 * condition evaluation, action execution, and storage.
 */
export class MacroService implements IMacroService {
  private triggerService: ITriggerService;
  private actionExecutor: IActionExecutor;
  private conditionEvaluator: IConditionEvaluator;
  private variableResolver: IVariableResolver;
  private storageService: IMacroStorageService;
  private paused: boolean = false;

  constructor(dependencies: MacroServiceDependencies = {}) {
    this.variableResolver = dependencies.variableResolver || new VariableResolverService();
    this.conditionEvaluator = dependencies.conditionEvaluator || new ConditionEvaluatorService(this.variableResolver);
    this.actionExecutor = dependencies.actionExecutor || new ActionExecutorService({
      ...dependencies.actionExecutorDependencies,
      variableResolver: this.variableResolver,
      conditionEvaluator: this.conditionEvaluator
    });
    this.triggerService = dependencies.triggerService || new TriggerService();
    this.storageService = dependencies.storageService || new MacroStorageService();
  }

  // ============ CRUD OPERATIONS ============

  /**
   * Creates a new macro with validation
   * @requirements 1.1, 1.2, 1.3
   */
  async createMacro(data: MacroFormData): Promise<Macro> {
    // Validate macro structure
    const validation = validateMacro(data);
    if (!validation.valid) {
      throw new Error(`Invalid macro: ${validation.errors.join(', ')}`);
    }

    const now = Date.now();
    const macro: Macro = {
      id: generateId(),
      name: data.name.trim(),
      description: data.description || '',
      enabled: data.enabled ?? true,
      trigger: data.trigger,
      actions: this.normalizeActions(data.actions),
      cooldown: data.cooldown ?? 0,
      createdAt: now,
      updatedAt: now,
      executionCount: 0
    };

    // Save to storage
    await this.storageService.saveMacro(macro);

    // Register trigger if enabled
    if (macro.enabled) {
      this.triggerService.registerTrigger(macro);
    }

    return macro;
  }

  /**
   * Updates an existing macro
   */
  async updateMacro(id: string, updates: Partial<MacroFormData>): Promise<Macro> {
    const existing = await this.storageService.getMacro(id);
    if (!existing) {
      throw new Error(`Macro not found: ${id}`);
    }

    // Merge updates
    const updated: Macro = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation time
      updatedAt: Date.now(),
      executionCount: existing.executionCount, // Preserve execution count
      lastExecuted: existing.lastExecuted, // Preserve last executed
      lastError: existing.lastError // Preserve last error
    };

    // Normalize actions if provided
    if (updates.actions) {
      updated.actions = this.normalizeActions(updates.actions);
    }

    // Validate updated macro
    const validation = validateMacro({
      name: updated.name,
      description: updated.description,
      enabled: updated.enabled,
      trigger: updated.trigger,
      actions: updated.actions,
      cooldown: updated.cooldown
    });

    if (!validation.valid) {
      throw new Error(`Invalid macro update: ${validation.errors.join(', ')}`);
    }

    // Save to storage
    await this.storageService.saveMacro(updated);

    // Update trigger registration
    this.triggerService.unregisterTrigger(id);
    if (updated.enabled) {
      this.triggerService.registerTrigger(updated);
    }

    return updated;
  }

  /**
   * Deletes a macro
   */
  async deleteMacro(id: string): Promise<void> {
    // Unregister trigger
    this.triggerService.unregisterTrigger(id);

    // Delete from storage
    await this.storageService.deleteMacro(id);
  }

  /**
   * Gets a macro by ID
   */
  async getMacro(id: string): Promise<Macro | null> {
    return this.storageService.getMacro(id);
  }

  /**
   * Gets all macros
   */
  async getAllMacros(): Promise<Macro[]> {
    return this.storageService.getAllMacros();
  }

  // ============ EXECUTION ============

  /**
   * Executes a macro
   * @requirements 1.2, 3.10, 9.1, 9.2, 9.5
   */
  async executeMacro(id: string, context: ExecutionContext): Promise<ExecutionResult> {
    const startedAt = Date.now();

    // Check if globally paused
    if (this.paused) {
      return this.createFailedResult(id, startedAt, 'Macro execution is globally paused');
    }

    // Get macro
    const macro = await this.storageService.getMacro(id);
    
    if (!macro) {
      return this.createFailedResult(id, startedAt, `Macro not found: ${id}`);
    }

    // Check if enabled
    if (!macro.enabled) {
      return this.createFailedResult(id, startedAt, 'Macro is disabled');
    }

    // Check cooldown
    if (this.triggerService.isOnCooldown(id)) {
      return this.createFailedResult(id, startedAt, 'Macro is on cooldown');
    }

    // Execute actions sequentially
    const actionResults: ActionResult[] = [];
    let hasError = false;

    for (const action of macro.actions) {
      const result = await this.actionExecutor.execute(action, context);
      actionResults.push(result);

      if (!result.success && !result.skipped) {
        hasError = true;
        // Continue with next action even if this one failed (Requirement 3.10)
      }
    }

    const completedAt = Date.now();
    const actionsExecuted = actionResults.filter(r => !r.skipped).length;

    // Build detailed error message from failed actions (user-friendly)
    const failedActions = actionResults.filter(r => !r.success && !r.skipped && r.error);
    const detailedError = failedActions.length > 0
      ? failedActions.map(r => r.error).join('; ')
      : undefined;

    // Create execution result
    const executionResult: ExecutionResult = {
      macroId: id,
      success: !hasError,
      startedAt,
      completedAt,
      actionsExecuted,
      actionResults,
      error: detailedError
    };

    // Record execution for cooldown
    this.triggerService.recordExecution(id);

    // Update macro stats
    await this.updateMacroStats(macro, executionResult);

    // Log execution
    await this.logExecution(macro, context.triggeredBy, executionResult);

    return executionResult;
  }

  // ============ GLOBAL CONTROLS ============

  /**
   * Pauses all macro execution globally
   * @requirements 9.6
   */
  pauseAll(): void {
    this.paused = true;
  }

  /**
   * Resumes macro execution globally
   * @requirements 9.6
   */
  resumeAll(): void {
    this.paused = false;
  }

  /**
   * Checks if macro execution is globally paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  // ============ IMPORT/EXPORT ============

  /**
   * Exports selected macros to JSON
   * @requirements 8.1, 8.5
   */
  async exportMacros(ids: string[], author?: string): Promise<string> {
    const allMacros = await this.storageService.getAllMacros();
    const macrosToExport = ids.length > 0
      ? allMacros.filter(m => ids.includes(m.id))
      : allMacros;

    const exportData: MacroExport = {
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      author,
      macros: macrosToExport
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Imports macros from JSON
   * @requirements 8.2, 8.3, 8.4
   */
  async importMacros(json: string): Promise<MacroImportResult> {
    const result: MacroImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      renamed: [],
      errors: []
    };

    let exportData: MacroExport;

    // Parse JSON
    try {
      exportData = JSON.parse(json);
    } catch {
      result.success = false;
      result.errors.push('Invalid JSON format');
      return result;
    }

    // Validate structure
    if (!exportData.macros || !Array.isArray(exportData.macros)) {
      result.success = false;
      result.errors.push('Invalid export format: missing macros array');
      return result;
    }

    // Get existing macros for name conflict detection
    const existingMacros = await this.storageService.getAllMacros();
    const existingNames = new Set(existingMacros.map(m => m.name.toLowerCase()));

    // Import each macro
    for (const macro of exportData.macros) {
      try {
        // Validate macro structure
        const validation = validateMacro({
          name: macro.name,
          description: macro.description,
          enabled: macro.enabled,
          trigger: macro.trigger,
          actions: macro.actions,
          cooldown: macro.cooldown
        });

        if (!validation.valid) {
          result.skipped++;
          result.errors.push(`Skipped "${macro.name}": ${validation.errors.join(', ')}`);
          continue;
        }

        // Handle name conflicts
        let finalName = macro.name;
        if (existingNames.has(finalName.toLowerCase())) {
          let counter = 1;
          while (existingNames.has(`${macro.name} (${counter})`.toLowerCase())) {
            counter++;
          }
          finalName = `${macro.name} (${counter})`;
          result.renamed.push(`${macro.name} -> ${finalName}`);
        }

        // Create new macro with new ID
        await this.createMacro({
          name: finalName,
          description: macro.description,
          enabled: macro.enabled,
          trigger: macro.trigger,
          actions: macro.actions,
          cooldown: macro.cooldown
        });

        existingNames.add(finalName.toLowerCase());
        result.imported++;
      } catch (error) {
        result.skipped++;
        result.errors.push(`Failed to import "${macro.name}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  // ============ INITIALIZATION ============

  /**
   * Initializes the service by loading and registering all enabled macros
   */
  async initialize(): Promise<void> {
    const macros = await this.storageService.getAllMacros();
    
    for (const macro of macros) {
      if (macro.enabled) {
        this.triggerService.registerTrigger(macro);
      }
    }
  }

  /**
   * Disposes of all resources
   */
  dispose(): void {
    if (this.triggerService instanceof TriggerService) {
      this.triggerService.dispose();
    }
  }

  // ============ PRIVATE METHODS ============

  /**
   * Normalizes actions by ensuring all have IDs and valid delays
   */
  private normalizeActions(actions: MacroAction[]): MacroAction[] {
    return actions.map((action, index) => ({
      ...action,
      id: action.id || `action_${index}_${Date.now()}`,
      delay: Math.max(MIN_DELAY, Math.min(MAX_DELAY, action.delay || 0))
    }));
  }

  /**
   * Creates a failed execution result
   */
  private createFailedResult(macroId: string, startedAt: number, error: string): ExecutionResult {
    return {
      macroId,
      success: false,
      startedAt,
      completedAt: Date.now(),
      actionsExecuted: 0,
      actionResults: [],
      error
    };
  }

  /**
   * Updates macro statistics after execution
   */
  private async updateMacroStats(macro: Macro, result: ExecutionResult): Promise<void> {
    const updates: Partial<Macro> = {
      executionCount: macro.executionCount + 1,
      lastExecuted: result.completedAt
    };

    if (!result.success && result.error) {
      updates.lastError = result.error;
    } else {
      updates.lastError = undefined;
    }

    const updated = { ...macro, ...updates, updatedAt: Date.now() };
    await this.storageService.saveMacro(updated);
  }

  /**
   * Logs macro execution
   * @requirements 9.1, 9.2
   */
  private async logExecution(
    macro: Macro,
    triggeredBy: TriggerType,
    result: ExecutionResult
  ): Promise<void> {
    const log: MacroExecutionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      macroId: macro.id,
      macroName: macro.name,
      triggeredBy,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      success: result.success,
      actionsExecuted: result.actionsExecuted,
      actionResults: result.actionResults,
      error: result.error
    };

    await this.storageService.saveExecutionLog(log);
  }

  // ============ GETTERS FOR TESTING ============

  /**
   * Gets the trigger service (for testing)
   */
  getTriggerService(): ITriggerService {
    return this.triggerService;
  }

  /**
   * Gets the action executor (for testing)
   */
  getActionExecutor(): IActionExecutor {
    return this.actionExecutor;
  }

  /**
   * Gets the variable resolver (for testing)
   */
  getVariableResolver(): IVariableResolver {
    return this.variableResolver;
  }

  /**
   * Gets the storage service (for testing)
   */
  getStorageService(): IMacroStorageService {
    return this.storageService;
  }

  /**
   * Configures external services for action execution
   * This allows connecting services that are created after MacroService initialization
   */
  configureServices(services: Partial<ActionExecutorDependencies>): void {
    const executor = this.actionExecutor as ActionExecutorService;
    
    if (services.chatService && executor.setChatService) {
      executor.setChatService(services.chatService);
    }
    if (services.obsService && executor.setOBSService) {
      executor.setOBSService(services.obsService);
    }
    if (services.soundService && executor.setSoundService) {
      executor.setSoundService(services.soundService);
    }
    if (services.pollService && executor.setPollService) {
      executor.setPollService(services.pollService);
    }
    if (services.predictionService && executor.setPredictionService) {
      executor.setPredictionService(services.predictionService);
    }
    if (services.notificationService && executor.setNotificationService) {
      executor.setNotificationService(services.notificationService);
    }
    if (services.twitchApiService && executor.setTwitchApiService) {
      executor.setTwitchApiService(services.twitchApiService);
    }
  }
}

// ============ SINGLETON INSTANCE ============

let macroServiceInstance: MacroService | null = null;

/**
 * Gets the singleton instance of MacroService
 */
export function getMacroService(dependencies?: MacroServiceDependencies): MacroService {
  if (!macroServiceInstance) {
    macroServiceInstance = new MacroService(dependencies);
  }
  return macroServiceInstance;
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetMacroService(): void {
  if (macroServiceInstance) {
    macroServiceInstance.dispose();
  }
  macroServiceInstance = null;
}

export default MacroService;
