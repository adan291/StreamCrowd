/**
 * Command Export/Import Types
 * 
 * Defines the format for exporting and importing custom commands.
 * The format is designed to be compatible with common bot formats where possible.
 * Supports v1.0 (legacy) and v2.0 (with categories and metadata).
 * 
 * @requirements 6.5 - Export format compatible with common bot formats
 */

// ============================================
// EXPORT FORMAT TYPES
// ============================================

/**
 * User level required to execute a command
 */
export type CommandUserLevel = 
  | 'everyone' 
  | 'subscriber' 
  | 'vip' 
  | 'moderator' 
  | 'broadcaster';

/**
 * How the command was created
 */
export type CommandCreatedBy = 'manual' | 'template' | 'ai' | 'imported';

/**
 * A single exported command (v1.0 format)
 */
export interface ExportedCommand {
  /** Command name (without prefix) */
  name: string;
  /** Response text or template */
  response: string;
  /** Cooldown in seconds between uses */
  cooldown: number;
  /** Minimum user level required */
  userLevel: CommandUserLevel;
  /** Whether the command is enabled */
  enabled: boolean;
  /** Optional command aliases */
  aliases?: string[];
  /** Optional description for documentation */
  description?: string;
}

/**
 * A single exported command (v2.0 format with categories and metadata)
 */
export interface ExportedCommandV2 extends ExportedCommand {
  /** Category ID */
  categoryId?: string;
  /** How the command was created */
  createdBy?: CommandCreatedBy;
  /** Creation timestamp (ISO string) */
  createdAt?: string;
  /** Last used timestamp (ISO string) */
  lastUsed?: string;
  /** Usage count */
  usageCount?: number;
}

/**
 * Exported category (v2.0)
 */
export interface ExportedCategory {
  /** Category ID */
  id: string;
  /** Display name */
  name: string;
  /** Icon/emoji */
  icon: string;
  /** Color for UI */
  color: string;
  /** Sort order */
  order: number;
}

/**
 * Export metadata (v2.0)
 */
export interface ExportMetadata {
  /** Total commands exported */
  totalCommands: number;
  /** Total enabled commands */
  enabledCommands: number;
  /** Total disabled commands */
  disabledCommands: number;
  /** Commands by category */
  commandsByCategory: Record<string, number>;
  /** Export timestamp */
  exportedAt: string;
  /** Application version */
  appVersion?: string;
}

/**
 * The complete export file format (v1.0 - legacy)
 */
export interface CommandExportFormat {
  /** Format version for future compatibility */
  version: '1.0';
  /** ISO date string of when the export was created */
  exportedAt: string;
  /** Source application identifier */
  source: 'twitch-vote';
  /** Array of exported commands */
  commands: ExportedCommand[];
}

/**
 * The complete export file format (v2.0 - with categories)
 */
export interface CommandExportFormatV2 {
  /** Format version */
  version: '2.0';
  /** ISO date string of when the export was created */
  exportedAt: string;
  /** Source application identifier */
  source: 'twitch-vote';
  /** Array of exported commands with extended metadata */
  commands: ExportedCommandV2[];
  /** Custom categories (non-default) */
  categories?: ExportedCategory[];
  /** Export metadata and statistics */
  metadata?: ExportMetadata;
}

/**
 * Union type for all export formats
 */
export type AnyCommandExportFormat = CommandExportFormat | CommandExportFormatV2;

// ============================================
// IMPORT TYPES
// ============================================

/**
 * Import mode options
 * - merge: Add new commands, skip existing ones
 * - replace: Replace all existing commands with imported ones
 */
export type ImportMode = 'merge' | 'replace';

/**
 * Result of validating an import file
 */
export interface ImportValidationResult {
  /** Whether the file is valid */
  valid: boolean;
  /** Validation error messages */
  errors: string[];
  /** Warnings that don't prevent import */
  warnings: string[];
  /** Number of commands that would be imported */
  commandCount: number;
  /** Parsed data if valid (supports both v1.0 and v2.0) */
  data?: AnyCommandExportFormat;
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  /** Whether the import was successful */
  success: boolean;
  /** Number of commands imported */
  imported: number;
  /** Number of commands skipped (in merge mode) */
  skipped: number;
  /** Number of commands replaced (in replace mode) */
  replaced: number;
  /** Error message if failed */
  error?: string;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Valid user levels for validation
 */
export const VALID_USER_LEVELS: CommandUserLevel[] = [
  'everyone',
  'subscriber',
  'vip',
  'moderator',
  'broadcaster',
];

/**
 * Current export format version
 */
export const CURRENT_EXPORT_VERSION = '2.0' as const;

/**
 * Legacy export format version
 */
export const LEGACY_EXPORT_VERSION = '1.0' as const;

/**
 * Supported export versions
 */
export const SUPPORTED_EXPORT_VERSIONS = ['1.0', '2.0'] as const;

/**
 * Export format constraints
 */
export const EXPORT_CONSTRAINTS = {
  MAX_COMMAND_NAME_LENGTH: 50,
  MAX_RESPONSE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 200,
  MIN_COOLDOWN: 0,
  MAX_COOLDOWN: 86400, // 24 hours
  MAX_ALIASES: 10,
} as const;

/**
 * Type guard to check if a value is a valid CommandUserLevel
 */
export function isValidUserLevel(value: unknown): value is CommandUserLevel {
  return typeof value === 'string' && VALID_USER_LEVELS.includes(value as CommandUserLevel);
}

/**
 * Type guard to check if an object is a valid ExportedCommand
 */
export function isValidExportedCommand(obj: unknown): obj is ExportedCommand {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const cmd = obj as Record<string, unknown>;
  
  return (
    typeof cmd.name === 'string' &&
    typeof cmd.response === 'string' &&
    typeof cmd.cooldown === 'number' &&
    isValidUserLevel(cmd.userLevel) &&
    typeof cmd.enabled === 'boolean'
  );
}

/**
 * Type guard to check if an object is a valid CommandExportFormat (v1.0)
 */
export function isValidExportFormat(obj: unknown): obj is CommandExportFormat {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const format = obj as Record<string, unknown>;
  
  return (
    format.version === '1.0' &&
    typeof format.exportedAt === 'string' &&
    format.source === 'twitch-vote' &&
    Array.isArray(format.commands) &&
    format.commands.every(isValidExportedCommand)
  );
}

/**
 * Type guard to check if an object is a valid CommandExportFormatV2 (v2.0)
 */
export function isValidExportFormatV2(obj: unknown): obj is CommandExportFormatV2 {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const format = obj as Record<string, unknown>;
  
  return (
    format.version === '2.0' &&
    typeof format.exportedAt === 'string' &&
    format.source === 'twitch-vote' &&
    Array.isArray(format.commands) &&
    format.commands.every(isValidExportedCommand)
  );
}

/**
 * Type guard to check if an object is any valid export format
 */
export function isValidAnyExportFormat(obj: unknown): obj is AnyCommandExportFormat {
  return isValidExportFormat(obj) || isValidExportFormatV2(obj);
}

/**
 * Get the version of an export format
 */
export function getExportVersion(obj: unknown): '1.0' | '2.0' | null {
  if (typeof obj !== 'object' || obj === null) return null;
  const format = obj as Record<string, unknown>;
  if (format.version === '1.0') return '1.0';
  if (format.version === '2.0') return '2.0';
  return null;
}
