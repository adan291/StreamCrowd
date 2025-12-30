# Design Document: Sistema de Macros / Comandos Personalizados

## Overview

Este documento describe el diseño técnico para implementar el sistema de macros de TwitchVote, permitiendo crear secuencias de acciones automatizadas con triggers, condiciones y variables.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
├─────────────────────────────────────────────────────────────┤
│  MacroEditor       MacroManager       MacroExecutionLog      │
│  TriggerConfig     ActionBuilder      ConditionEditor        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Hook Layer                              │
├─────────────────────────────────────────────────────────────┤
│  useMacros    useMacroEditor    useMacroExecution            │
│  useVariables    useTriggers                                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  MacroService (orchestrator)                                 │
│  ├── TriggerService (detecta y dispara triggers)             │
│  ├── ActionExecutor (ejecuta acciones)                       │
│  ├── ConditionEvaluator (evalúa condiciones)                 │
│  ├── VariableResolver (resuelve variables)                   │
│  └── MacroStorageService (persistencia)                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
├─────────────────────────────────────────────────────────────┤
│  IndexedDB (macros, variables, execution log)                │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Macro Model

```typescript
interface Macro {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: MacroTrigger;
  actions: MacroAction[];
  cooldown: number; // segundos
  lastExecuted?: number;
  createdAt: number;
  updatedAt: number;
  executionCount: number;
  lastError?: string;
}

type TriggerType = 'chat_command' | 'chat_keyword' | 'schedule' | 'event' | 'manual';

interface MacroTrigger {
  type: TriggerType;
  config: ChatCommandTrigger | ChatKeywordTrigger | ScheduleTrigger | EventTrigger | ManualTrigger;
}

interface ChatCommandTrigger {
  command: string; // e.g., "!raid"
  caseSensitive: boolean;
  requiredRole?: 'viewer' | 'subscriber' | 'moderator' | 'broadcaster';
}

interface ChatKeywordTrigger {
  keywords: string[];
  matchAll: boolean; // AND vs OR
  caseSensitive: boolean;
}

interface ScheduleTrigger {
  type: 'interval' | 'cron';
  interval?: number; // minutos
  cron?: string; // expresión cron
}

interface EventTrigger {
  eventType: 'follower' | 'raid' | 'subscription' | 'bits' | 'host' | 'poll_ended' | 'prediction_resolved';
  minValue?: number; // e.g., mínimo de bits
}

interface ManualTrigger {
  hotkey?: string;
  showInQuickActions: boolean;
}
```

### Action Model

```typescript
type ActionType = 
  | 'send_chat_message'
  | 'change_scene'
  | 'toggle_source'
  | 'play_sound'
  | 'start_poll'
  | 'start_prediction'
  | 'send_notification'
  | 'set_variable'
  | 'delay';

interface MacroAction {
  id: string;
  type: ActionType;
  config: ActionConfig;
  condition?: MacroCondition;
  delay: number; // segundos antes de ejecutar
}

interface SendChatMessageConfig {
  message: string; // puede contener {variables}
  platform?: 'twitch' | 'youtube' | 'kick' | 'all';
}

interface ChangeSceneConfig {
  sceneName: string;
}

interface ToggleSourceConfig {
  sourceName: string;
  action: 'show' | 'hide' | 'toggle';
}

interface PlaySoundConfig {
  soundId: string;
  volume?: number;
}

interface StartPollConfig {
  title: string;
  options: string[];
  duration: number;
}

interface StartPredictionConfig {
  title: string;
  outcomes: string[];
  duration: number;
}

interface SendNotificationConfig {
  channels: ('push' | 'discord' | 'telegram')[];
  title: string;
  message: string;
}

interface SetVariableConfig {
  variableName: string;
  value: string | number;
  operation?: 'set' | 'increment' | 'decrement';
}

interface DelayConfig {
  seconds: number;
}
```

### Condition Model

```typescript
type ConditionOperator = 'equals' | 'not_equals' | 'greater' | 'less' | 'contains' | 'not_contains';
type LogicalOperator = 'and' | 'or';

interface MacroCondition {
  type: 'simple' | 'group';
  simple?: SimpleCondition;
  group?: ConditionGroup;
}

interface SimpleCondition {
  leftOperand: string; // variable name or literal
  operator: ConditionOperator;
  rightOperand: string; // variable name or literal
}

interface ConditionGroup {
  operator: LogicalOperator;
  conditions: MacroCondition[];
}
```

### Variable Model

```typescript
interface MacroVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  value: string | number | boolean;
  scope: 'system' | 'stream' | 'user';
  readonly: boolean;
}

// System variables (readonly)
const SYSTEM_VARIABLES = [
  '{username}',      // Usuario que disparó el trigger
  '{displayName}',   // Nombre de display del usuario
  '{message}',       // Mensaje del chat (si aplica)
  '{platform}',      // Plataforma de origen
  '{timestamp}',     // Timestamp actual
];

// Stream variables (readonly)
const STREAM_VARIABLES = [
  '{viewers}',       // Viewers actuales
  '{followers}',     // Total de seguidores
  '{uptime}',        // Tiempo de stream
  '{game}',          // Juego actual
  '{title}',         // Título del stream
];
```

### Services

```typescript
interface IMacroService {
  // CRUD
  createMacro(macro: Omit<Macro, 'id' | 'createdAt' | 'updatedAt'>): Promise<Macro>;
  updateMacro(id: string, updates: Partial<Macro>): Promise<Macro>;
  deleteMacro(id: string): Promise<void>;
  getMacro(id: string): Promise<Macro | null>;
  getAllMacros(): Promise<Macro[]>;
  
  // Execution
  executeMacro(id: string, context: ExecutionContext): Promise<ExecutionResult>;
  pauseAll(): void;
  resumeAll(): void;
  
  // Import/Export
  exportMacros(ids: string[]): Promise<string>;
  importMacros(json: string): Promise<ImportResult>;
}

interface ITriggerService {
  registerTrigger(macro: Macro): void;
  unregisterTrigger(macroId: string): void;
  checkTrigger(event: TriggerEvent): Macro[];
}

interface IActionExecutor {
  execute(action: MacroAction, context: ExecutionContext): Promise<ActionResult>;
}

interface IConditionEvaluator {
  evaluate(condition: MacroCondition, context: ExecutionContext): boolean;
}

interface IVariableResolver {
  resolve(template: string, context: ExecutionContext): string;
  getVariable(name: string): MacroVariable | null;
  setVariable(name: string, value: string | number | boolean): void;
}
```

### Execution Context

```typescript
interface ExecutionContext {
  triggeredBy: TriggerType;
  user?: {
    username: string;
    displayName: string;
    role: 'viewer' | 'subscriber' | 'moderator' | 'broadcaster';
    platform: string;
  };
  message?: string;
  event?: {
    type: string;
    data: Record<string, unknown>;
  };
  variables: Map<string, MacroVariable>;
}

interface ExecutionResult {
  macroId: string;
  success: boolean;
  startedAt: number;
  completedAt: number;
  actionsExecuted: number;
  actionResults: ActionResult[];
  error?: string;
}

interface ActionResult {
  actionId: string;
  actionType: ActionType;
  success: boolean;
  skipped: boolean; // si la condición no se cumplió
  error?: string;
  duration: number;
}
```

## Data Models

### Storage Schema

```typescript
const MACRO_STORES = {
  macros: { keyPath: 'id', indexes: ['name', 'enabled', 'trigger.type'] },
  variables: { keyPath: 'name', indexes: ['scope'] },
  executionLog: { keyPath: 'id', indexes: ['macroId', 'startedAt'] },
};
```

### Export Format

```typescript
interface MacroExport {
  version: string;
  exportedAt: number;
  author?: string;
  macros: Macro[];
  variables?: MacroVariable[];
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Macro Structure Validity

*For any* macro created, it SHALL contain all required fields (id, name, trigger, actions) and all delays SHALL be within the valid range (0-60 seconds).

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Macro Persistence Round-Trip

*For any* valid macro, saving to IndexedDB and loading back SHALL produce an equivalent macro with all fields preserved.

**Validates: Requirements 1.4, 1.5**

### Property 3: Trigger Type Recognition

*For any* trigger configuration, the TriggerService SHALL correctly identify and process all supported trigger types (chat_command, chat_keyword, schedule, event, manual).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 4: Action Execution Order

*For any* macro with multiple actions, execution SHALL process actions in their defined sequential order, and a failing action SHALL NOT prevent subsequent actions from executing.

**Validates: Requirements 1.2, 3.10**

### Property 5: Variable Resolution

*For any* template string containing variables, the VariableResolver SHALL replace all valid variables with their current values, and missing variables SHALL be replaced with empty strings.

**Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6**

### Property 6: Condition Evaluation Determinism

*For any* valid condition and execution context, evaluating the condition multiple times SHALL always produce the same boolean result.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6**

### Property 7: Condition-Based Action Skipping

*For any* action with a condition that evaluates to false, the action SHALL be skipped and marked as skipped in the execution result.

**Validates: Requirements 5.5**

### Property 8: Import/Export Round-Trip

*For any* set of valid macros, exporting to JSON and importing back SHALL produce equivalent macros with all properties preserved.

**Validates: Requirements 8.1, 8.2, 8.3, 8.5, 8.6**

### Property 9: Cooldown Enforcement

*For any* macro with a cooldown configured, triggering the macro within the cooldown period SHALL NOT execute the macro.

**Validates: Requirements 2.7**

### Property 10: Execution Log Completeness

*For any* macro execution, the log entry SHALL contain macroId, timestamp, success status, and results for each action executed.

**Validates: Requirements 9.1, 9.2, 9.5**

## Error Handling

### Trigger Errors

- **Invalid Trigger Config**: Rechazar macro al guardar
- **Trigger Not Found**: Log warning, continuar con otras macros

### Action Errors

- **Action Timeout**: Marcar como fallida, continuar con siguiente
- **Invalid Action Config**: Saltar acción, log error
- **External Service Error**: Retry con backoff, marcar como fallida si persiste

### Variable Errors

- **Variable Not Found**: Usar valor vacío
- **Invalid Operation**: Log error, usar valor original
- **Type Mismatch**: Intentar conversión, usar valor por defecto si falla

### Import Errors

- **Invalid JSON**: Rechazar importación completa
- **Invalid Macro Structure**: Saltar macro inválida, importar válidas
- **Name Conflict**: Renombrar automáticamente con sufijo numérico

## Testing Strategy

### Unit Tests

- Validación de estructura de macros
- Parsing de triggers
- Ejecución de cada tipo de acción
- Evaluación de condiciones
- Resolución de variables

### Property-Based Tests

- **Property 1**: Validez de estructura de macros
- **Property 2**: Round-trip de persistencia
- **Property 3**: Reconocimiento de tipos de trigger
- **Property 4**: Orden de ejecución de acciones
- **Property 5**: Resolución de variables
- **Property 6**: Determinismo de condiciones
- **Property 7**: Salto de acciones por condición
- **Property 8**: Round-trip de import/export
- **Property 9**: Enforcement de cooldown
- **Property 10**: Completitud del log de ejecución

### Integration Tests

- Flujo completo de creación y ejecución de macro
- Triggers de chat en tiempo real
- Integración con OBS y otros servicios
- Persistencia entre reinicios

