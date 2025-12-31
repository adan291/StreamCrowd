/**
 * Command Editor Types
 * 
 * Types for the visual command editor, templates, and categories.
 */

import type { CommandUserLevel } from './commandExport';

// ============================================
// TEMPLATE TYPES
// ============================================

/**
 * Template categories for organizing predefined commands
 */
export type TemplateCategory = 
  | 'info'           // Channel/stream information
  | 'social'         // Social media links
  | 'entertainment'  // Fun/entertainment commands
  | 'moderation'     // Moderation commands
  | 'utility'        // Utility commands
  | 'games';         // Game-related commands

/**
 * Variable placeholder in a template
 */
export interface TemplateVariable {
  /** Variable key (e.g., "TWITTER_USER") */
  key: string;
  /** Human-readable label */
  label: string;
  /** Placeholder text for input */
  placeholder: string;
  /** Whether the variable is required */
  required: boolean;
  /** Default value if any */
  defaultValue?: string;
}

/**
 * A predefined command template
 */
export interface CommandTemplate {
  /** Unique identifier */
  id: string;
  /** Template name */
  name: string;
  /** Description of what the command does */
  description: string;
  /** Category for organization */
  category: TemplateCategory;
  /** Suggested trigger (without prefix) */
  trigger: string;
  /** Response template with variables */
  response: string;
  /** Variables that need to be filled in */
  variables: TemplateVariable[];
  /** Suggested user level */
  userLevel: CommandUserLevel;
  /** Suggested cooldown in seconds */
  cooldown: number;
  /** Icon/emoji for display */
  icon: string;
  /** Popularity score for sorting (higher = more popular) */
  popularity: number;
}

// ============================================
// CATEGORY TYPES
// ============================================

/**
 * A command category for organization
 */
export interface CommandCategory {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Icon/emoji */
  icon: string;
  /** Color for UI */
  color: string;
  /** Whether this is a default category */
  isDefault: boolean;
  /** Sort order */
  order: number;
}

// ============================================
// VISUAL EDITOR TYPES
// ============================================

/**
 * Block types for the visual editor
 */
export type BlockType = 'text' | 'variable' | 'conditional' | 'api';

/**
 * Text block configuration
 */
export interface TextBlockConfig {
  type: 'text';
  content: string;
}

/**
 * Variable block configuration
 */
export interface VariableBlockConfig {
  type: 'variable';
  variable: string; // e.g., '$(user)', '$(channel)'
}

/**
 * Conditional block configuration
 */
export interface ConditionalBlockConfig {
  type: 'conditional';
  condition: 'has_args' | 'is_sub' | 'is_mod' | 'is_vip' | 'random';
  trueContent: string;
  falseContent: string;
}

/**
 * API block configuration
 */
export interface ApiBlockConfig {
  type: 'api';
  url: string;
  fallback: string;
}

/**
 * Union type for all block configurations
 */
export type BlockConfig = TextBlockConfig | VariableBlockConfig | ConditionalBlockConfig | ApiBlockConfig;

/**
 * A block in the visual editor
 */
export interface CommandBlock {
  /** Unique identifier */
  id: string;
  /** Block type */
  type: BlockType;
  /** Block configuration */
  config: BlockConfig;
  /** Position in the sequence */
  position: number;
}

// ============================================
// EXTENDED COMMAND TYPE
// ============================================

/**
 * Extended command with category and metadata
 */
export interface ExtendedCommand {
  /** Unique identifier */
  id: string;
  /** Command name (trigger without prefix) */
  name: string;
  /** Response text */
  response: string;
  /** Cooldown in seconds */
  cooldown: number;
  /** User level required */
  userLevel: CommandUserLevel;
  /** Whether enabled */
  enabled: boolean;
  /** Category ID */
  categoryId: string;
  /** Usage count */
  usageCount: number;
  /** Last used timestamp */
  lastUsed?: string;
  /** How the command was created */
  createdBy: 'manual' | 'template' | 'ai';
  /** Creation timestamp */
  createdAt: string;
}

// ============================================
// COMMAND TESTER TYPES
// ============================================

/**
 * Context for testing a command
 */
export interface TestContext {
  user: {
    name: string;
    level: CommandUserLevel;
  };
  args: string[];
  channel: {
    name: string;
    game: string;
    title: string;
    uptime: string;
    viewers: number;
    followers: number;
  };
}

/**
 * Result of testing a command
 */
export interface TestResult {
  /** The output after variable substitution */
  output: string;
  /** Warning messages */
  warnings: string[];
  /** Error messages */
  errors: string[];
  /** Variables that were used */
  variablesUsed: string[];
}

// ============================================
// AI TYPES
// ============================================

/**
 * Context for AI command generation
 */
export interface ChannelContext {
  channelName: string;
  currentGame?: string;
  streamTitle?: string;
  existingCommands: string[];
  socialLinks?: Record<string, string>;
}

/**
 * AI-generated command
 */
export interface GeneratedCommand {
  trigger: string;
  response: string;
  description: string;
  userLevel: CommandUserLevel;
  cooldown: number;
  confidence: number; // 0-1
  alternatives: Array<{ trigger: string; response: string }>;
}

/**
 * Command analysis result from AI
 */
export interface CommandAnalysis {
  totalCommands: number;
  duplicates: Array<{ commands: string[]; reason: string }>;
  similarTriggers: Array<{ triggers: string[]; suggestion: string }>;
  unusedCommands: string[];
  longResponses: Array<{ trigger: string; length: number }>;
  suggestions: CommandSuggestion[];
  newCommandIdeas: Array<{ trigger: string; description: string }>;
}

/**
 * A suggestion for improving a command
 */
export interface CommandSuggestion {
  type: 'optimize' | 'combine' | 'split' | 'rename' | 'add_variable';
  target: string;
  suggestion: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================
// AVAILABLE VARIABLES
// ============================================

/**
 * Available variables for command responses
 */
export const AVAILABLE_VARIABLES = [
  { variable: '$(user)', name: 'Usuario', description: 'Nombre del usuario que ejecutó el comando', category: 'user' },
  { variable: '$(touser)', name: 'Usuario objetivo', description: 'Primer argumento o usuario que ejecutó', category: 'user' },
  { variable: '$(channel)', name: 'Canal', description: 'Nombre del canal', category: 'channel' },
  { variable: '$(followers)', name: 'Seguidores', description: 'Número de seguidores', category: 'channel' },
  { variable: '$(game)', name: 'Juego', description: 'Categoría/juego actual', category: 'stream' },
  { variable: '$(title)', name: 'Título', description: 'Título del stream', category: 'stream' },
  { variable: '$(uptime)', name: 'Tiempo en vivo', description: 'Tiempo desde inicio del stream', category: 'stream' },
  { variable: '$(viewers)', name: 'Espectadores', description: 'Número de espectadores actuales', category: 'stream' },
  { variable: '$(time)', name: 'Hora', description: 'Hora actual', category: 'utility' },
  { variable: '$(date)', name: 'Fecha', description: 'Fecha actual', category: 'utility' },
  { variable: '$(random)', name: 'Aleatorio', description: 'Número aleatorio 1-100', category: 'utility' },
  { variable: '$(count)', name: 'Contador', description: 'Veces que se ha usado el comando', category: 'utility' },
  { variable: '$(args)', name: 'Argumentos', description: 'Todos los argumentos', category: 'advanced' },
  { variable: '$(arg1)', name: 'Argumento 1', description: 'Primer argumento', category: 'advanced' },
  { variable: '$(arg2)', name: 'Argumento 2', description: 'Segundo argumento', category: 'advanced' },
  { variable: '$(query)', name: 'Query URL', description: 'Argumentos codificados para URL', category: 'advanced' },
] as const;

export type AvailableVariable = typeof AVAILABLE_VARIABLES[number]['variable'];
