/**
 * useCommandsExport Hook
 * 
 * Hook for exporting and importing custom commands to/from JSON files.
 * Supports merge and replace import modes.
 * Supports v1.0 (legacy) and v2.0 (with categories) formats.
 * 
 * @module src/application/hooks/useCommandsExport
 * @requirements 6.1, 6.2, 6.3, 6.4
 */

import { useCallback } from 'react';
import type { CustomCommand } from '../../domain/ports/ICommandPort';
import type { CommandCategory } from '../../../types/commandEditor';
import {
  CommandExportFormat,
  CommandExportFormatV2,
  ExportedCommand,
  ExportedCommandV2,
  ExportedCategory,
  ExportMetadata,
  AnyCommandExportFormat,
  ImportMode,
  ImportValidationResult,
  ImportResult,
  CURRENT_EXPORT_VERSION,
  EXPORT_CONSTRAINTS,
  VALID_USER_LEVELS,
  SUPPORTED_EXPORT_VERSIONS,
  isValidUserLevel,
  getExportVersion,
} from '../../../types/commandExport';

/**
 * Extended command with category info for v2.0 export
 */
export interface ExtendedCustomCommand extends Omit<CustomCommand, 'lastUsed'> {
  categoryId?: string;
  createdBy?: 'manual' | 'template' | 'ai' | 'imported';
  createdAt?: string;
  lastUsed?: number | string; // Support both timestamp and ISO string
}

/**
 * Return type for the useCommandsExport hook
 */
export interface UseCommandsExportReturn {
  /** Export commands to a JSON file (triggers download) - v2.0 format */
  exportCommands: (categories?: CommandCategory[]) => void;
  /** Export commands in legacy v1.0 format */
  exportCommandsLegacy: () => void;
  /** Validate an import file before importing */
  validateImport: (data: unknown) => ImportValidationResult;
  /** Import commands from a file with merge or replace mode */
  importCommands: (file: File, mode: ImportMode) => Promise<ImportResult>;
  /** Parse file content to JSON */
  parseFile: (file: File) => Promise<unknown>;
  /** Convert internal commands to export format v2.0 */
  toExportFormat: (commands: ExtendedCustomCommand[], categories?: CommandCategory[]) => CommandExportFormatV2;
  /** Convert internal commands to legacy export format v1.0 */
  toExportFormatLegacy: (commands: CustomCommand[]) => CommandExportFormat;
  /** Convert exported commands to internal format */
  fromExportFormat: (exported: ExportedCommand[] | ExportedCommandV2[]) => Omit<ExtendedCustomCommand, 'id' | 'usageCount'>[];
}

/**
 * Validates a single exported command
 */
function validateCommand(cmd: unknown, index: number): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Command ${index + 1}`;

  if (typeof cmd !== 'object' || cmd === null) {
    errors.push(`${prefix}: Invalid command object`);
    return { errors, warnings };
  }

  const command = cmd as Record<string, unknown>;

  // Required fields
  if (typeof command.name !== 'string' || !command.name.trim()) {
    errors.push(`${prefix}: Missing or invalid 'name' field`);
  } else {
    if (command.name.length > EXPORT_CONSTRAINTS.MAX_COMMAND_NAME_LENGTH) {
      errors.push(`${prefix}: Name exceeds ${EXPORT_CONSTRAINTS.MAX_COMMAND_NAME_LENGTH} characters`);
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(command.name)) {
      errors.push(`${prefix}: Name must start with a letter and contain only letters, numbers, and underscores`);
    }
  }

  if (typeof command.response !== 'string') {
    errors.push(`${prefix}: Missing or invalid 'response' field`);
  } else if (command.response.length > EXPORT_CONSTRAINTS.MAX_RESPONSE_LENGTH) {
    warnings.push(`${prefix}: Response exceeds ${EXPORT_CONSTRAINTS.MAX_RESPONSE_LENGTH} characters`);
  }

  if (typeof command.cooldown !== 'number') {
    errors.push(`${prefix}: Missing or invalid 'cooldown' field`);
  } else if (command.cooldown < EXPORT_CONSTRAINTS.MIN_COOLDOWN || command.cooldown > EXPORT_CONSTRAINTS.MAX_COOLDOWN) {
    errors.push(`${prefix}: Cooldown must be between ${EXPORT_CONSTRAINTS.MIN_COOLDOWN} and ${EXPORT_CONSTRAINTS.MAX_COOLDOWN}`);
  }

  if (!isValidUserLevel(command.userLevel)) {
    errors.push(`${prefix}: Invalid 'userLevel'. Must be one of: ${VALID_USER_LEVELS.join(', ')}`);
  }

  if (typeof command.enabled !== 'boolean') {
    errors.push(`${prefix}: Missing or invalid 'enabled' field`);
  }

  // Optional fields
  if (command.aliases !== undefined) {
    if (!Array.isArray(command.aliases)) {
      warnings.push(`${prefix}: 'aliases' should be an array`);
    } else if (command.aliases.length > EXPORT_CONSTRAINTS.MAX_ALIASES) {
      warnings.push(`${prefix}: Too many aliases (max ${EXPORT_CONSTRAINTS.MAX_ALIASES})`);
    }
  }

  if (command.description !== undefined && typeof command.description === 'string') {
    if (command.description.length > EXPORT_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
      warnings.push(`${prefix}: Description exceeds ${EXPORT_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`);
    }
  }

  return { errors, warnings };
}

// ============================================
// PURE FUNCTIONS (exported for testing)
// ============================================

/**
 * Convert internal commands to export format v2.0 (pure function)
 */
export function toExportFormat(cmds: ExtendedCustomCommand[], categories?: CommandCategory[]): CommandExportFormatV2 {
  const exportedCommands: ExportedCommandV2[] = cmds.map(cmd => ({
    name: cmd.name,
    response: cmd.response,
    cooldown: cmd.cooldown,
    userLevel: cmd.userLevel,
    enabled: cmd.enabled,
    categoryId: cmd.categoryId || 'general',
    createdBy: cmd.createdBy || 'manual',
    createdAt: cmd.createdAt || new Date().toISOString(),
    lastUsed: typeof cmd.lastUsed === 'number' 
      ? new Date(cmd.lastUsed).toISOString() 
      : cmd.lastUsed,
    usageCount: cmd.usageCount || 0,
  }));

  // Export only custom (non-default) categories
  const customCategories: ExportedCategory[] = (categories || [])
    .filter(c => !c.isDefault)
    .map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      order: c.order,
    }));

  // Calculate metadata
  const commandsByCategory: Record<string, number> = {};
  exportedCommands.forEach(cmd => {
    const catId = cmd.categoryId || 'general';
    commandsByCategory[catId] = (commandsByCategory[catId] || 0) + 1;
  });

  const metadata: ExportMetadata = {
    totalCommands: exportedCommands.length,
    enabledCommands: exportedCommands.filter(c => c.enabled).length,
    disabledCommands: exportedCommands.filter(c => !c.enabled).length,
    commandsByCategory,
    exportedAt: new Date().toISOString(),
  };

  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    source: 'twitch-vote',
    commands: exportedCommands,
    categories: customCategories.length > 0 ? customCategories : undefined,
    metadata,
  };
}

/**
 * Convert internal commands to legacy export format v1.0 (pure function)
 */
export function toExportFormatLegacy(cmds: CustomCommand[]): CommandExportFormat {
  const exportedCommands: ExportedCommand[] = cmds.map(cmd => ({
    name: cmd.name,
    response: cmd.response,
    cooldown: cmd.cooldown,
    userLevel: cmd.userLevel,
    enabled: cmd.enabled,
  }));

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    source: 'twitch-vote',
    commands: exportedCommands,
  };
}

/**
 * Convert exported commands to internal format (pure function)
 * Supports both v1.0 and v2.0 formats
 */
export function fromExportFormat(exported: ExportedCommand[] | ExportedCommandV2[]): Omit<ExtendedCustomCommand, 'id' | 'usageCount'>[] {
  return exported.map(cmd => {
    const base: Omit<ExtendedCustomCommand, 'id' | 'usageCount'> = {
      name: cmd.name.toLowerCase(),
      response: cmd.response,
      cooldown: cmd.cooldown,
      userLevel: cmd.userLevel,
      enabled: cmd.enabled,
    };

    // Add v2.0 fields if present
    const cmdV2 = cmd as ExportedCommandV2;
    if (cmdV2.categoryId) base.categoryId = cmdV2.categoryId;
    if (cmdV2.createdBy) base.createdBy = cmdV2.createdBy;
    if (cmdV2.createdAt) base.createdAt = cmdV2.createdAt;
    if (cmdV2.lastUsed) base.lastUsed = cmdV2.lastUsed;

    return base;
  });
}

/**
 * Validate import data structure (pure function)
 * Supports both v1.0 and v2.0 formats with backward compatibility
 * @requirements 6.3 - WHEN importing THEN the system SHALL validate the JSON structure before importing
 * @requirements 6.6 - IF import validation fails THEN the system SHALL display specific error messages
 */
export function validateImport(data: unknown): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if data is an object
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      errors: ['Invalid JSON: Expected an object'],
      warnings: [],
      commandCount: 0,
    };
  }

  const obj = data as Record<string, unknown>;

  // Check version - support both 1.0 and 2.0
  const version = getExportVersion(data);
  if (!version) {
    if (obj.version === undefined) {
      errors.push("Missing 'version' field");
    } else {
      errors.push(`Unsupported version: ${obj.version}. Supported versions: ${SUPPORTED_EXPORT_VERSIONS.join(', ')}`);
    }
  }

  // Check source (warning only, not required)
  if (obj.source !== undefined && obj.source !== 'twitch-vote') {
    warnings.push(`File was exported from '${obj.source}', some features may not be compatible`);
  }

  // Check exportedAt (warning only)
  if (obj.exportedAt !== undefined && typeof obj.exportedAt !== 'string') {
    warnings.push("Invalid 'exportedAt' field");
  }

  // Check commands array
  if (!Array.isArray(obj.commands)) {
    errors.push("Missing or invalid 'commands' array");
    return {
      valid: false,
      errors,
      warnings,
      commandCount: 0,
    };
  }

  // Validate each command
  const commandNames = new Set<string>();
  for (let i = 0; i < obj.commands.length; i++) {
    const cmdValidation = validateCommand(obj.commands[i], i);
    errors.push(...cmdValidation.errors);
    warnings.push(...cmdValidation.warnings);

    // Check for duplicate names (only if command is valid object with name)
    const cmd = obj.commands[i];
    if (cmd !== null && typeof cmd === 'object' && typeof (cmd as Record<string, unknown>).name === 'string') {
      const normalizedName = ((cmd as Record<string, unknown>).name as string).toLowerCase();
      if (commandNames.has(normalizedName)) {
        errors.push(`Duplicate command name: '${(cmd as Record<string, unknown>).name}'`);
      }
      commandNames.add(normalizedName);
    }
  }

  // Validate categories if present (v2.0)
  if (version === '2.0' && obj.categories !== undefined) {
    if (!Array.isArray(obj.categories)) {
      warnings.push("'categories' should be an array");
    } else {
      obj.categories.forEach((cat, i) => {
        if (typeof cat !== 'object' || cat === null) {
          warnings.push(`Category ${i + 1}: Invalid category object`);
        } else {
          const category = cat as Record<string, unknown>;
          if (typeof category.id !== 'string') warnings.push(`Category ${i + 1}: Missing 'id'`);
          if (typeof category.name !== 'string') warnings.push(`Category ${i + 1}: Missing 'name'`);
        }
      });
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    commandCount: obj.commands.length,
    data: valid ? (data as AnyCommandExportFormat) : undefined,
  };
}

/**
 * Parse file content to JSON (pure async function)
 */
export function parseFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ============================================
// REACT HOOK
// ============================================

/**
 * Hook for exporting and importing custom commands
 * 
 * @param commands - Current list of commands
 * @param onImport - Callback to handle imported commands
 * @param onImportCategories - Optional callback to handle imported categories (v2.0)
 * @returns Export/import functions
 * 
 * @example
 * ```tsx
 * const { commands, addCommand } = useCommands();
 * const { exportCommands, importCommands, validateImport } = useCommandsExport(
 *   commands,
 *   (newCommands) => newCommands.forEach(cmd => addCommand(cmd)),
 *   (categories) => categories.forEach(cat => addCategory(cat))
 * );
 * 
 * // Export commands (v2.0 with categories)
 * exportCommands(customCategories);
 * 
 * // Export commands (legacy v1.0)
 * exportCommandsLegacy();
 * 
 * // Import commands
 * const result = await importCommands(file, 'merge');
 * ```
 */
export function useCommandsExport(
  commands: ExtendedCustomCommand[],
  onImport: (commands: Omit<ExtendedCustomCommand, 'id' | 'usageCount'>[]) => void,
  onImportCategories?: (categories: ExportedCategory[]) => void
): UseCommandsExportReturn {
  /**
   * Export commands to a JSON file (v2.0 format with categories)
   * @requirements 6.1 - THE CommandPanel SHALL display an "Export" button that downloads commands as JSON
   */
  const exportCommands = useCallback((categories?: CommandCategory[]) => {
    const exportData = toExportFormat(commands, categories);
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `commands-export-v2-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [commands]);

  /**
   * Export commands in legacy v1.0 format
   */
  const exportCommandsLegacy = useCallback(() => {
    // Convert ExtendedCustomCommand to CustomCommand for legacy export
    const legacyCommands = commands.map(cmd => ({
      id: cmd.id,
      name: cmd.name,
      response: cmd.response,
      cooldown: cmd.cooldown,
      userLevel: cmd.userLevel,
      enabled: cmd.enabled,
      usageCount: cmd.usageCount,
      lastUsed: typeof cmd.lastUsed === 'string' ? Date.parse(cmd.lastUsed) : cmd.lastUsed,
    }));
    const exportData = toExportFormatLegacy(legacyCommands);
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `commands-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [commands]);

  /**
   * Import commands from a file
   * Supports both v1.0 and v2.0 formats with auto-migration
   * @requirements 6.2 - THE CommandPanel SHALL display an "Import" button that allows uploading a JSON file
   * @requirements 6.4 - WHEN importing THEN the system SHALL ask whether to merge or replace existing commands
   */
  const importCommands = useCallback(async (file: File, mode: ImportMode): Promise<ImportResult> => {
    try {
      // Parse file
      const data = await parseFile(file);

      // Validate
      const validation = validateImport(data);
      if (!validation.valid || !validation.data) {
        return {
          success: false,
          imported: 0,
          skipped: 0,
          replaced: 0,
          error: validation.errors.join('; '),
        };
      }

      const version = getExportVersion(validation.data);
      const importedCommands = fromExportFormat(validation.data.commands);
      
      // Auto-assign category for v1.0 imports (migrate to v2.0)
      if (version === '1.0') {
        importedCommands.forEach(cmd => {
          if (!cmd.categoryId) {
            cmd.categoryId = 'general';
            cmd.createdBy = 'imported';
          }
        });
      }

      // Import categories if present (v2.0) and callback provided
      if (version === '2.0' && onImportCategories) {
        const v2Data = validation.data as CommandExportFormatV2;
        if (v2Data.categories && v2Data.categories.length > 0) {
          onImportCategories(v2Data.categories);
        }
      }

      const existingNames = new Set(commands.map(c => c.name.toLowerCase()));

      let imported = 0;
      let skipped = 0;
      let replaced = 0;

      if (mode === 'replace') {
        // Replace mode: import all commands
        onImport(importedCommands);
        imported = importedCommands.length;
        replaced = commands.length;
      } else {
        // Merge mode: only import new commands
        const newCommands = importedCommands.filter(cmd => {
          if (existingNames.has(cmd.name.toLowerCase())) {
            skipped++;
            return false;
          }
          return true;
        });
        
        if (newCommands.length > 0) {
          onImport(newCommands);
          imported = newCommands.length;
        }
      }

      return {
        success: true,
        imported,
        skipped,
        replaced,
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        replaced: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [commands, onImport, onImportCategories]);

  return {
    exportCommands,
    exportCommandsLegacy,
    validateImport,
    importCommands,
    parseFile,
    toExportFormat,
    toExportFormatLegacy,
    fromExportFormat,
  };
}

export default useCommandsExport;
