/**
 * useMacroEditor - Hook for the macro editor form
 * 
 * This hook manages the state and validation for the macro editor,
 * including form state, validation, and action management.
 * 
 * @requirements 6.1 - THE Macro_Editor SHALL show a form to configure the trigger
 * @requirements 6.2 - THE Macro_Editor SHALL show an orderable list of actions (drag & drop)
 * @requirements 6.3 - THE Macro_Editor SHALL show an action type selector with descriptive icons
 * @requirements 6.4 - THE Macro_Editor SHALL show specific fields based on selected action type
 * @requirements 6.5 - THE Macro_Editor SHALL show a condition editor with visual UI
 * @requirements 6.6 - THE Macro_Editor SHALL validate the macro before saving
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  Macro,
  MacroFormData,
  MacroAction,
  MacroActionFormData,
  MacroTrigger,
  MacroCondition,
  TriggerType,
  ActionType,
  TriggerConfig,
  ActionConfig,
  ChatCommandTrigger,
  ChatKeywordTrigger,
  ScheduleTrigger,
  EventTrigger,
  ManualTrigger,
} from '../types/macros';

// ============ TYPES ============

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Options for the useMacroEditor hook
 */
export interface UseMacroEditorOptions {
  /**
   * Initial macro data for editing (optional)
   */
  initialMacro?: Macro;
  /**
   * Callback when form data changes
   */
  onChange?: (data: MacroFormData) => void;
}

/**
 * Return type for the useMacroEditor hook
 */
export interface UseMacroEditorReturn {
  /**
   * Current form data
   */
  formData: MacroFormData;
  
  /**
   * Whether the form has been modified
   */
  isDirty: boolean;
  
  /**
   * Validation result
   * @requirements 6.6
   */
  validation: ValidationResult;
  
  /**
   * Whether the form is valid
   */
  isValid: boolean;
  
  // Name and description
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setEnabled: (enabled: boolean) => void;
  setCooldown: (cooldown: number) => void;
  
  // Trigger management
  /**
   * @requirements 6.1
   */
  setTriggerType: (type: TriggerType) => void;
  setTriggerConfig: (config: TriggerConfig) => void;
  
  // Action management
  /**
   * @requirements 6.2, 6.3, 6.4
   */
  addAction: (action: MacroActionFormData) => void;
  updateAction: (index: number, action: Partial<MacroAction>) => void;
  removeAction: (index: number) => void;
  moveAction: (fromIndex: number, toIndex: number) => void;
  setActionCondition: (index: number, condition: MacroCondition | undefined) => void;
  
  /**
   * Resets the form to initial state
   */
  reset: () => void;
  
  /**
   * Gets the form data for submission
   */
  getFormData: () => MacroFormData;
  
  /**
   * Validates the form and returns result
   * @requirements 6.6
   */
  validate: () => ValidationResult;
}

// ============ CONSTANTS ============

const MIN_DELAY = 0;
const MAX_DELAY = 60;
const MAX_COOLDOWN = 3600;

// ============ HELPERS ============

/**
 * Creates default trigger config based on type
 */
function createDefaultTriggerConfig(type: TriggerType): TriggerConfig {
  switch (type) {
    case 'chat_command':
      return {
        command: '!command',
        caseSensitive: false,
      } as ChatCommandTrigger;
    case 'chat_keyword':
      return {
        keywords: [],
        matchAll: false,
        caseSensitive: false,
      } as ChatKeywordTrigger;
    case 'schedule':
      return {
        type: 'interval',
        interval: 30,
      } as ScheduleTrigger;
    case 'event':
      return {
        eventType: 'follower',
      } as EventTrigger;
    case 'manual':
      return {
        showInQuickActions: true,
      } as ManualTrigger;
    default:
      return {
        showInQuickActions: true,
      } as ManualTrigger;
  }
}

/**
 * Creates default form data
 */
function createDefaultFormData(): MacroFormData {
  return {
    name: '',
    description: '',
    enabled: true,
    trigger: {
      type: 'manual',
      config: createDefaultTriggerConfig('manual'),
    },
    actions: [],
    cooldown: 0,
  };
}

/**
 * Converts a Macro to MacroFormData
 */
function macroToFormData(macro: Macro): MacroFormData {
  return {
    name: macro.name,
    description: macro.description,
    enabled: macro.enabled,
    trigger: { ...macro.trigger },
    actions: macro.actions.map(a => ({ ...a })),
    cooldown: macro.cooldown,
  };
}

/**
 * Generates a unique action ID
 */
function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validates trigger configuration
 */
function validateTrigger(trigger: MacroTrigger): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!trigger.type) {
    errors.push({ field: 'trigger.type', message: 'Trigger type is required' });
    return errors;
  }
  
  switch (trigger.type) {
    case 'chat_command': {
      const config = trigger.config as ChatCommandTrigger;
      if (!config.command || config.command.trim() === '') {
        errors.push({ field: 'trigger.config.command', message: 'Command is required' });
      } else if (!config.command.startsWith('!')) {
        errors.push({ field: 'trigger.config.command', message: 'Command must start with !' });
      }
      break;
    }
    case 'chat_keyword': {
      const config = trigger.config as ChatKeywordTrigger;
      if (!config.keywords || config.keywords.length === 0) {
        errors.push({ field: 'trigger.config.keywords', message: 'At least one keyword is required' });
      }
      break;
    }
    case 'schedule': {
      const config = trigger.config as ScheduleTrigger;
      if (config.type === 'interval' && (!config.interval || config.interval < 1)) {
        errors.push({ field: 'trigger.config.interval', message: 'Interval must be at least 1 minute' });
      }
      if (config.type === 'cron' && (!config.cron || config.cron.trim() === '')) {
        errors.push({ field: 'trigger.config.cron', message: 'Cron expression is required' });
      }
      break;
    }
    case 'event': {
      const config = trigger.config as EventTrigger;
      if (!config.eventType) {
        errors.push({ field: 'trigger.config.eventType', message: 'Event type is required' });
      }
      break;
    }
  }
  
  return errors;
}

/**
 * Validates action configuration
 */
function validateAction(action: MacroAction, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `actions[${index}]`;
  
  if (!action.type) {
    errors.push({ field: `${prefix}.type`, message: `Action ${index + 1}: Type is required` });
  }
  
  if (!action.config) {
    errors.push({ field: `${prefix}.config`, message: `Action ${index + 1}: Configuration is required` });
  }
  
  if (action.delay < MIN_DELAY || action.delay > MAX_DELAY) {
    errors.push({ 
      field: `${prefix}.delay`, 
      message: `Action ${index + 1}: Delay must be between ${MIN_DELAY} and ${MAX_DELAY} seconds` 
    });
  }
  
  // Validate specific action configs
  switch (action.type) {
    case 'send_chat_message': {
      const config = action.config as { message?: string };
      if (!config.message || config.message.trim() === '') {
        errors.push({ field: `${prefix}.config.message`, message: `Action ${index + 1}: Message is required` });
      }
      break;
    }
    case 'change_scene': {
      const config = action.config as { sceneName?: string };
      if (!config.sceneName || config.sceneName.trim() === '') {
        errors.push({ field: `${prefix}.config.sceneName`, message: `Action ${index + 1}: Scene name is required` });
      }
      break;
    }
    case 'toggle_source': {
      const config = action.config as { sourceName?: string; action?: string };
      if (!config.sourceName || config.sourceName.trim() === '') {
        errors.push({ field: `${prefix}.config.sourceName`, message: `Action ${index + 1}: Source name is required` });
      }
      if (!config.action) {
        errors.push({ field: `${prefix}.config.action`, message: `Action ${index + 1}: Action (show/hide/toggle) is required` });
      }
      break;
    }
    case 'play_sound': {
      const config = action.config as { soundId?: string };
      if (!config.soundId || config.soundId.trim() === '') {
        errors.push({ field: `${prefix}.config.soundId`, message: `Action ${index + 1}: Sound is required` });
      }
      break;
    }
    case 'start_poll': {
      const config = action.config as { title?: string; options?: string[]; duration?: number };
      if (!config.title || config.title.trim() === '') {
        errors.push({ field: `${prefix}.config.title`, message: `Action ${index + 1}: Poll title is required` });
      }
      if (!config.options || config.options.length < 2) {
        errors.push({ field: `${prefix}.config.options`, message: `Action ${index + 1}: At least 2 options are required` });
      }
      if (!config.duration || config.duration < 15) {
        errors.push({ field: `${prefix}.config.duration`, message: `Action ${index + 1}: Duration must be at least 15 seconds` });
      }
      break;
    }
    case 'start_prediction': {
      const config = action.config as { title?: string; outcomes?: string[]; duration?: number };
      if (!config.title || config.title.trim() === '') {
        errors.push({ field: `${prefix}.config.title`, message: `Action ${index + 1}: Prediction title is required` });
      }
      if (!config.outcomes || config.outcomes.length < 2) {
        errors.push({ field: `${prefix}.config.outcomes`, message: `Action ${index + 1}: At least 2 outcomes are required` });
      }
      if (!config.duration || config.duration < 30) {
        errors.push({ field: `${prefix}.config.duration`, message: `Action ${index + 1}: Duration must be at least 30 seconds` });
      }
      break;
    }
    case 'send_notification': {
      const config = action.config as { channels?: string[]; title?: string; message?: string };
      if (!config.channels || config.channels.length === 0) {
        errors.push({ field: `${prefix}.config.channels`, message: `Action ${index + 1}: At least one channel is required` });
      }
      if (!config.title || config.title.trim() === '') {
        errors.push({ field: `${prefix}.config.title`, message: `Action ${index + 1}: Notification title is required` });
      }
      if (!config.message || config.message.trim() === '') {
        errors.push({ field: `${prefix}.config.message`, message: `Action ${index + 1}: Notification message is required` });
      }
      break;
    }
    case 'set_variable': {
      const config = action.config as { variableName?: string };
      if (!config.variableName || config.variableName.trim() === '') {
        errors.push({ field: `${prefix}.config.variableName`, message: `Action ${index + 1}: Variable name is required` });
      }
      break;
    }
    case 'delay': {
      const config = action.config as { seconds?: number };
      if (config.seconds === undefined || config.seconds < 0 || config.seconds > 60) {
        errors.push({ field: `${prefix}.config.seconds`, message: `Action ${index + 1}: Delay must be between 0 and 60 seconds` });
      }
      break;
    }
  }
  
  return errors;
}

/**
 * Validates the entire form
 * @requirements 6.6
 */
function validateFormData(data: MacroFormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate name
  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Macro name is required' });
  }
  
  // Validate cooldown
  if (data.cooldown < 0 || data.cooldown > MAX_COOLDOWN) {
    errors.push({ field: 'cooldown', message: `Cooldown must be between 0 and ${MAX_COOLDOWN} seconds` });
  }
  
  // Validate trigger
  if (!data.trigger) {
    errors.push({ field: 'trigger', message: 'Trigger is required' });
  } else {
    errors.push(...validateTrigger(data.trigger));
  }
  
  // Validate actions
  if (!data.actions || data.actions.length === 0) {
    errors.push({ field: 'actions', message: 'At least one action is required' });
  } else {
    data.actions.forEach((action, index) => {
      errors.push(...validateAction(action, index));
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============ HOOK ============

/**
 * Hook for the macro editor form
 * 
 * Manages form state, validation, and action management for creating
 * and editing macros.
 * 
 * @example
 * ```tsx
 * function MacroEditor({ macro }: { macro?: Macro }) {
 *   const {
 *     formData,
 *     isValid,
 *     validation,
 *     setName,
 *     setTriggerType,
 *     addAction,
 *     getFormData,
 *   } = useMacroEditor({ initialMacro: macro });
 *   
 *   const handleSave = () => {
 *     if (isValid) {
 *       const data = getFormData();
 *       // Save macro...
 *     }
 *   };
 *   
 *   return (
 *     <form>
 *       <input
 *         value={formData.name}
 *         onChange={e => setName(e.target.value)}
 *       />
 *       {!isValid && (
 *         <ul>
 *           {validation.errors.map(err => (
 *             <li key={err.field}>{err.message}</li>
 *           ))}
 *         </ul>
 *       )}
 *       <button onClick={handleSave} disabled={!isValid}>
 *         Save
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 * 
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export function useMacroEditor(options: UseMacroEditorOptions = {}): UseMacroEditorReturn {
  const { initialMacro, onChange } = options;
  
  // Initialize form data
  const initialFormData = useMemo(() => {
    return initialMacro ? macroToFormData(initialMacro) : createDefaultFormData();
  }, [initialMacro]);
  
  const [formData, setFormData] = useState<MacroFormData>(initialFormData);
  const [isDirty, setIsDirty] = useState(false);
  
  // Validation
  const validation = useMemo(() => validateFormData(formData), [formData]);
  const isValid = validation.valid;
  
  /**
   * Updates form data and marks as dirty
   */
  const updateFormData = useCallback((updates: Partial<MacroFormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      onChange?.(newData);
      return newData;
    });
    setIsDirty(true);
  }, [onChange]);

  // Name and description setters
  const setName = useCallback((name: string) => {
    updateFormData({ name });
  }, [updateFormData]);
  
  const setDescription = useCallback((description: string) => {
    updateFormData({ description });
  }, [updateFormData]);
  
  const setEnabled = useCallback((enabled: boolean) => {
    updateFormData({ enabled });
  }, [updateFormData]);
  
  const setCooldown = useCallback((cooldown: number) => {
    updateFormData({ cooldown: Math.max(0, Math.min(MAX_COOLDOWN, cooldown)) });
  }, [updateFormData]);

  // Trigger management
  /**
   * @requirements 6.1
   */
  const setTriggerType = useCallback((type: TriggerType) => {
    updateFormData({
      trigger: {
        type,
        config: createDefaultTriggerConfig(type),
      },
    });
  }, [updateFormData]);
  
  const setTriggerConfig = useCallback((config: TriggerConfig) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        trigger: {
          ...prev.trigger,
          config,
        },
      };
      onChange?.(newData);
      return newData;
    });
    setIsDirty(true);
  }, [onChange]);

  // Action management
  /**
   * @requirements 6.2, 6.3, 6.4
   */
  const addAction = useCallback((actionData: MacroActionFormData) => {
    const newAction: MacroAction = {
      ...actionData,
      id: generateActionId(),
      delay: actionData.delay ?? 0,
    };
    
    setFormData(prev => {
      const newData = {
        ...prev,
        actions: [...prev.actions, newAction],
      };
      onChange?.(newData);
      return newData;
    });
    setIsDirty(true);
  }, [onChange]);
  
  const updateAction = useCallback((index: number, updates: Partial<MacroAction>) => {
    setFormData(prev => {
      const newActions = [...prev.actions];
      if (index >= 0 && index < newActions.length) {
        newActions[index] = { ...newActions[index], ...updates };
      }
      const newData = { ...prev, actions: newActions };
      onChange?.(newData);
      return newData;
    });
    setIsDirty(true);
  }, [onChange]);
  
  const removeAction = useCallback((index: number) => {
    setFormData(prev => {
      const newActions = prev.actions.filter((_, i) => i !== index);
      const newData = { ...prev, actions: newActions };
      onChange?.(newData);
      return newData;
    });
    setIsDirty(true);
  }, [onChange]);
  
  const moveAction = useCallback((fromIndex: number, toIndex: number) => {
    setFormData(prev => {
      const newActions = [...prev.actions];
      const [removed] = newActions.splice(fromIndex, 1);
      newActions.splice(toIndex, 0, removed);
      const newData = { ...prev, actions: newActions };
      onChange?.(newData);
      return newData;
    });
    setIsDirty(true);
  }, [onChange]);
  
  /**
   * @requirements 6.5
   */
  const setActionCondition = useCallback((index: number, condition: MacroCondition | undefined) => {
    setFormData(prev => {
      const newActions = [...prev.actions];
      if (index >= 0 && index < newActions.length) {
        newActions[index] = { ...newActions[index], condition };
      }
      const newData = { ...prev, actions: newActions };
      onChange?.(newData);
      return newData;
    });
    setIsDirty(true);
  }, [onChange]);

  /**
   * Resets the form to initial state
   */
  const reset = useCallback(() => {
    setFormData(initialFormData);
    setIsDirty(false);
  }, [initialFormData]);

  /**
   * Gets the form data for submission
   */
  const getFormData = useCallback((): MacroFormData => {
    return { ...formData };
  }, [formData]);

  /**
   * Validates the form and returns result
   * @requirements 6.6
   */
  const validate = useCallback((): ValidationResult => {
    return validateFormData(formData);
  }, [formData]);

  return {
    formData,
    isDirty,
    validation,
    isValid,
    setName,
    setDescription,
    setEnabled,
    setCooldown,
    setTriggerType,
    setTriggerConfig,
    addAction,
    updateAction,
    removeAction,
    moveAction,
    setActionCondition,
    reset,
    getFormData,
    validate,
  };
}

export default useMacroEditor;
