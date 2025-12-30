/**
 * Macro Types
 * 
 * Type definitions for the Macro System.
 * Macros are automated sequences of actions triggered by events, commands, or schedules.
 */

// ============================================================================
// Trigger Types
// ============================================================================

/**
 * Types of triggers that can activate a macro
 */
export type TriggerType = 'chat_command' | 'chat_keyword' | 'schedule' | 'event' | 'manual';

/**
 * Chat command trigger configuration
 * Activates when a specific command is typed in chat (e.g., !raid)
 */
export interface ChatCommandTrigger {
  command: string;
  caseSensitive: boolean;
  requiredRole?: 'viewer' | 'subscriber' | 'moderator' | 'broadcaster';
}

/**
 * Chat keyword trigger configuration
 * Activates when specific keywords appear in any chat message
 */
export interface ChatKeywordTrigger {
  keywords: string[];
  matchAll: boolean; // true = AND, false = OR
  caseSensitive: boolean;
}

/**
 * Schedule trigger configuration
 * Activates at regular intervals or specific times
 */
export interface ScheduleTrigger {
  type: 'interval' | 'cron';
  interval?: number; // minutes (for interval type)
  cron?: string;     // cron expression (for cron type)
}

/**
 * Event trigger configuration
 * Activates when specific stream events occur
 */
export interface EventTrigger {
  eventType: 'follower' | 'raid' | 'subscription' | 'bits' | 'host' | 'poll_ended' | 'prediction_resolved';
  minValue?: number; // e.g., minimum bits amount
}

/**
 * Manual trigger configuration
 * Activates via UI button or hotkey
 */
export interface ManualTrigger {
  hotkey?: string;
  showInQuickActions: boolean;
}

/**
 * Union type for all trigger configurations
 */
export type TriggerConfig = 
  | ChatCommandTrigger 
  | ChatKeywordTrigger 
  | ScheduleTrigger 
  | EventTrigger 
  | ManualTrigger;

/**
 * Macro trigger definition
 */
export interface MacroTrigger {
  type: TriggerType;
  config: TriggerConfig;
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Types of actions that can be executed by a macro
 */
export type ActionType = 
  | 'send_chat_message'
  | 'change_scene'
  | 'toggle_source'
  | 'play_sound'
  | 'start_poll'
  | 'start_prediction'
  | 'send_notification'
  | 'set_variable'
  | 'delay';

/**
 * Send chat message action configuration
 */
export interface SendChatMessageConfig {
  message: string; // Can contain {variables}
  platform?: 'twitch' | 'youtube' | 'kick' | 'all';
}

/**
 * Change OBS scene action configuration
 */
export interface ChangeSceneConfig {
  sceneName: string;
}

/**
 * Toggle OBS source visibility action configuration
 */
export interface ToggleSourceConfig {
  sourceName: string;
  action: 'show' | 'hide' | 'toggle';
}

/**
 * Play sound action configuration
 */
export interface PlaySoundConfig {
  soundId: string;
  volume?: number; // 0-100
}

/**
 * Start poll action configuration
 */
export interface StartPollConfig {
  title: string;
  options: string[];
  duration: number; // seconds
}

/**
 * Start prediction action configuration
 */
export interface StartPredictionConfig {
  title: string;
  outcomes: string[];
  duration: number; // seconds
}

/**
 * Send notification action configuration
 */
export interface SendNotificationConfig {
  channels: ('push' | 'discord' | 'telegram')[];
  title: string;
  message: string;
}

/**
 * Set variable action configuration
 */
export interface SetVariableConfig {
  variableName: string;
  value: string | number;
  operation?: 'set' | 'increment' | 'decrement';
}

/**
 * Delay action configuration
 */
export interface DelayConfig {
  seconds: number; // 0-60
}

/**
 * Union type for all action configurations
 */
export type ActionConfig = 
  | SendChatMessageConfig
  | ChangeSceneConfig
  | ToggleSourceConfig
  | PlaySoundConfig
  | StartPollConfig
  | StartPredictionConfig
  | SendNotificationConfig
  | SetVariableConfig
  | DelayConfig;

// ============================================================================
// Condition Types
// ============================================================================

/**
 * Comparison operators for conditions
 */
export type ConditionOperator = 'equals' | 'not_equals' | 'greater' | 'less' | 'contains' | 'not_contains';

/**
 * Logical operators for condition groups
 */
export type LogicalOperator = 'and' | 'or';

/**
 * Simple condition comparing two operands
 */
export interface SimpleCondition {
  leftOperand: string;  // variable name or literal
  operator: ConditionOperator;
  rightOperand: string; // variable name or literal
}

/**
 * Group of conditions combined with a logical operator
 */
export interface ConditionGroup {
  operator: LogicalOperator;
  conditions: MacroCondition[];
}

/**
 * Macro condition (simple or group)
 */
export interface MacroCondition {
  type: 'simple' | 'group';
  simple?: SimpleCondition;
  group?: ConditionGroup;
}

// ============================================================================
// Action Definition
// ============================================================================

/**
 * A single action within a macro
 */
export interface MacroAction {
  id: string;
  type: ActionType;
  config: ActionConfig;
  condition?: MacroCondition;
  delay: number; // seconds before executing (0-60)
}

// ============================================================================
// Variable Types
// ============================================================================

/**
 * Variable scope
 */
export type VariableScope = 'system' | 'stream' | 'user';

/**
 * Variable type
 */
export type VariableType = 'string' | 'number' | 'boolean';

/**
 * A macro variable
 */
export interface MacroVariable {
  name: string;
  type: VariableType;
  value: string | number | boolean;
  scope: VariableScope;
  readonly: boolean;
}

// ============================================================================
// Macro Definition
// ============================================================================

/**
 * A complete macro definition
 */
export interface Macro {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: MacroTrigger;
  actions: MacroAction[];
  cooldown: number; // seconds
  lastExecuted?: number;
  createdAt: number;
  updatedAt: number;
  executionCount: number;
  lastError?: string;
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * User role in the execution context
 */
export type UserRole = 'viewer' | 'subscriber' | 'moderator' | 'broadcaster';

/**
 * User information in execution context
 */
export interface ExecutionUser {
  username: string;
  displayName: string;
  role: UserRole;
  platform: string;
}

/**
 * Event information in execution context
 */
export interface ExecutionEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Context provided during macro execution
 */
export interface ExecutionContext {
  triggeredBy: TriggerType;
  user?: ExecutionUser;
  message?: string;
  event?: ExecutionEvent;
  variables: Map<string, MacroVariable>;
}

/**
 * Result of a single action execution
 */
export interface ActionResult {
  actionId: string;
  actionType: ActionType;
  success: boolean;
  skipped: boolean; // true if condition was not met
  error?: string;
  duration: number; // milliseconds
}

/**
 * Result of a complete macro execution
 */
export interface ExecutionResult {
  macroId: string;
  success: boolean;
  startedAt: number;
  completedAt: number;
  actionsExecuted: number;
  actionResults: ActionResult[];
  error?: string;
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Execution log entry stored in database
 */
export interface MacroExecutionLog {
  id: string;
  macroId: string;
  macroName: string;
  triggeredBy: TriggerType;
  startedAt: number;
  completedAt: number;
  success: boolean;
  actionsExecuted: number;
  actionResults: ActionResult[];
  error?: string;
}

// ============================================================================
// Import/Export Types
// ============================================================================

/**
 * Export format for macros
 */
export interface MacroExport {
  version: string;
  exportedAt: number;
  author?: string;
  macros: Macro[];
  variables?: MacroVariable[];
}

/**
 * Result of importing macros
 */
export interface MacroImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  renamed: string[]; // names that were renamed due to conflicts
  errors: string[];
}

// ============================================================================
// Form Types
// ============================================================================

/**
 * Macro form data (for create/edit)
 */
export type MacroFormData = Omit<Macro, 'id' | 'createdAt' | 'updatedAt' | 'lastExecuted' | 'executionCount' | 'lastError'>;

/**
 * Action form data (for create/edit)
 */
export type MacroActionFormData = Omit<MacroAction, 'id'>;

// ============================================================================
// Trigger Event Types
// ============================================================================

/**
 * Event that can trigger a macro
 */
export interface TriggerEvent {
  type: TriggerType;
  user?: ExecutionUser;
  message?: string;
  command?: string;
  eventType?: string;
  eventData?: Record<string, unknown>;
}

// ============================================================================
// System Variables (Constants)
// ============================================================================

/**
 * System variables available in macros (readonly)
 */
export const SYSTEM_VARIABLES = [
  '{username}',      // User who triggered the macro
  '{displayName}',   // Display name of the user
  '{message}',       // Chat message (if applicable)
  '{platform}',      // Source platform
  '{timestamp}',     // Current timestamp
] as const;

/**
 * Stream variables available in macros (readonly)
 */
export const STREAM_VARIABLES = [
  '{viewers}',       // Current viewer count
  '{followers}',     // Total followers
  '{uptime}',        // Stream uptime
  '{game}',          // Current game
  '{title}',         // Stream title
] as const;

/**
 * All available variable names
 */
export type SystemVariableName = typeof SYSTEM_VARIABLES[number];
export type StreamVariableName = typeof STREAM_VARIABLES[number];
