/**
 * i18n Translation Validation System
 * 
 * This module provides comprehensive validation for the modular i18n system.
 * It ensures translation completeness, consistency, and correctness between
 * Spanish and English locales.
 * 
 * Features:
 * - Translation key completeness validation (Design P1)
 * - Type consistency checking (Design P2)
 * - Interpolation variable validation (Design P3)
 * - Detailed reporting and analysis
 * - CLI and programmatic interfaces
 * 
 * @see REQ-7.1: Script de validación de traducciones
 * @see Design P1: Completitud - toda clave ES existe en EN
 * @see Design P2: Consistencia de tipos entre locales
 * @see Design P3: Interpolación Válida
 */

import type { 
  Locale, 
  TranslationModule, 
  Translations,
  ValidationResult,
  TypeInconsistency,
  InterpolationValues
} from './types';
import { extractVariables, validateInterpolation } from './utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Validation configuration options
 */
export interface ValidationConfig {
  /** Locales to validate (default: ['es', 'en']) */
  locales?: Locale[];
  /** Modules to validate (default: all modules) */
  modules?: TranslationModule[];
  /** Whether to validate interpolation variables */
  validateInterpolation?: boolean;
  /** Whether to check type consistency */
  validateTypes?: boolean;
  /** Whether to show detailed output */
  verbose?: boolean;
}

/**
 * Detailed validation result for a single module
 */
export interface ModuleValidationResult {
  /** Module name */
  module: TranslationModule;
  /** Keys missing in each locale */
  missingKeys: Record<Locale, string[]>;
  /** Extra keys in each locale */
  extraKeys: Record<Locale, string[]>;
  /** Type inconsistencies found */
  typeInconsistencies: TypeInconsistency[];
  /** Interpolation validation issues */
  interpolationIssues: InterpolationIssue[];
  /** Total keys per locale */
  totalKeys: Record<Locale, number>;
  /** Coverage percentage per locale */
  coverage: Record<Locale, number>;
  /** Whether this module passed validation */
  isValid: boolean;
}

/**
 * Interpolation validation issue
 */
export interface InterpolationIssue {
  /** Translation key */
  key: string;
  /** Locale where issue was found */
  locale: Locale;
  /** Type of issue */
  type: 'missing_variables' | 'extra_variables' | 'variable_mismatch';
  /** Issue description */
  description: string;
  /** Expected variables */
  expected?: string[];
  /** Actual variables */
  actual?: string[];
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  /** Overall validation result */
  isValid: boolean;
  /** Results per module */
  modules: ModuleValidationResult[];
  /** Summary statistics */
  summary: {
    totalModules: number;
    validModules: number;
    totalKeys: Record<Locale, number>;
    totalMissingKeys: Record<Locale, number>;
    overallCoverage: Record<Locale, number>;
    typeInconsistencies: number;
    interpolationIssues: number;
  };
  /** Validation timestamp */
  timestamp: Date;
}

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validates translation completeness between locales for a single module
 */
export function validateModuleCompleteness(
  esTranslations: Record<string, any>,
  enTranslations: Record<string, any>,
  module: TranslationModule
): ModuleValidationResult {
  const esKeys = getAllKeys(esTranslations);
  const enKeys = getAllKeys(enTranslations);
  
  const missingInEn = esKeys.filter(key => !enKeys.includes(key));
  const missingInEs = enKeys.filter(key => !esKeys.includes(key));
  
  const typeInconsistencies = validateTypeConsistency(
    esTranslations, 
    enTranslations, 
    esKeys.filter(key => enKeys.includes(key))
  );
  
  const interpolationIssues = validateModuleInterpolation(
    esTranslations,
    enTranslations,
    esKeys.filter(key => enKeys.includes(key))
  );
  
  const totalKeys = {
    es: esKeys.length,
    en: enKeys.length
  };
  
  const coverage = {
    es: totalKeys.es > 0 ? ((totalKeys.es - missingInEs.length) / totalKeys.es) * 100 : 100,
    en: totalKeys.en > 0 ? ((totalKeys.en - missingInEn.length) / totalKeys.en) * 100 : 100
  };
  
  return {
    module,
    missingKeys: {
      es: missingInEs,
      en: missingInEn
    },
    extraKeys: {
      es: missingInEs,
      en: missingInEn
    },
    typeInconsistencies,
    interpolationIssues,
    totalKeys,
    coverage,
    isValid: missingInEn.length === 0 && 
             missingInEs.length === 0 && 
             typeInconsistencies.length === 0 &&
             interpolationIssues.length === 0
  };
}

/**
 * Recursively extracts all translation keys from a nested object
 */
export function getAllKeys(obj: Record<string, any>, prefix: string = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      keys.push(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeys(value, fullKey));
    }
  }
  
  return keys.sort();
}

/**
 * Gets a nested value from an object using dot notation
 */
export function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * Validates type consistency between locales
 */
export function validateTypeConsistency(
  esTranslations: Record<string, any>,
  enTranslations: Record<string, any>,
  commonKeys: string[]
): TypeInconsistency[] {
  const inconsistencies: TypeInconsistency[] = [];
  
  for (const key of commonKeys) {
    const esValue = getNestedValue(esTranslations, key);
    const enValue = getNestedValue(enTranslations, key);
    
    const esType = typeof esValue;
    const enType = typeof enValue;
    
    if (esType !== enType) {
      inconsistencies.push({
        key,
        esType,
        enType
      });
    }
  }
  
  return inconsistencies;
}

/**
 * Validates interpolation variables consistency between locales
 */
export function validateModuleInterpolation(
  esTranslations: Record<string, any>,
  enTranslations: Record<string, any>,
  commonKeys: string[]
): InterpolationIssue[] {
  const issues: InterpolationIssue[] = [];
  
  for (const key of commonKeys) {
    const esValue = getNestedValue(esTranslations, key);
    const enValue = getNestedValue(enTranslations, key);
    
    // Only validate string values
    if (typeof esValue !== 'string' || typeof enValue !== 'string') {
      continue;
    }
    
    const esVariables = extractVariables(esValue);
    const enVariables = extractVariables(enValue);
    
    // Check for missing variables in EN
    const missingInEn = esVariables.filter(v => !enVariables.includes(v));
    if (missingInEn.length > 0) {
      issues.push({
        key,
        locale: 'en',
        type: 'missing_variables',
        description: `Missing variables in EN: ${missingInEn.join(', ')}`,
        expected: esVariables,
        actual: enVariables
      });
    }
    
    // Check for extra variables in EN
    const extraInEn = enVariables.filter(v => !esVariables.includes(v));
    if (extraInEn.length > 0) {
      issues.push({
        key,
        locale: 'en',
        type: 'extra_variables',
        description: `Extra variables in EN: ${extraInEn.join(', ')}`,
        expected: esVariables,
        actual: enVariables
      });
    }
  }
  
  return issues;
}

// ============================================================================
// Module Loading and Validation
// ============================================================================

/**
 * Dynamically loads a translation module
 */
export async function loadTranslationModule(
  locale: Locale, 
  module: TranslationModule
): Promise<Record<string, any>> {
  try {
    const moduleImport = await import(`./locales/${locale}/${module}.ts`);
    return moduleImport[module] || moduleImport.default || {};
  } catch (error) {
    console.warn(`Failed to load module ${module} for locale ${locale}:`, error);
    return {};
  }
}

/**
 * Validates all translation modules
 */
export async function validateAllModules(
  config: ValidationConfig = {}
): Promise<ValidationReport> {
  const {
    locales = ['es', 'en'],
    modules = [
      'common', 'errors', 'navigation', 'poll', 'games', 'giveaway',
      'macros', 'commands', 'predictions', 'rewards', 'moderation',
      'analytics', 'overlay', 'platforms', 'misc'
    ],
    validateInterpolation = true,
    validateTypes = true,
    verbose = false
  } = config;
  
  const moduleResults: ModuleValidationResult[] = [];
  
  if (verbose) {
    console.log(`🔍 Validating ${modules.length} modules across ${locales.length} locales...`);
  }
  
  for (const module of modules) {
    if (verbose) {
      console.log(`  📋 Validating module: ${module}`);
    }
    
    // Load translations for all locales
    const translations: Record<Locale, Record<string, any>> = {} as any;
    
    for (const locale of locales) {
      translations[locale] = await loadTranslationModule(locale, module);
    }
    
    // Validate between ES and EN (primary validation)
    if (locales.includes('es') && locales.includes('en')) {
      const result = validateModuleCompleteness(
        translations.es,
        translations.en,
        module
      );
      
      moduleResults.push(result);
      
      if (verbose) {
        const status = result.isValid ? '✅' : '❌';
        console.log(`    ${status} ${module}: ${result.coverage.es.toFixed(1)}% ES, ${result.coverage.en.toFixed(1)}% EN`);
        
        if (!result.isValid) {
          if (result.missingKeys.en.length > 0) {
            console.log(`      Missing in EN: ${result.missingKeys.en.slice(0, 3).join(', ')}${result.missingKeys.en.length > 3 ? '...' : ''}`);
          }
          if (result.missingKeys.es.length > 0) {
            console.log(`      Missing in ES: ${result.missingKeys.es.slice(0, 3).join(', ')}${result.missingKeys.es.length > 3 ? '...' : ''}`);
          }
        }
      }
    }
  }
  
  // Calculate summary statistics
  const summary = calculateSummary(moduleResults);
  
  const report: ValidationReport = {
    isValid: moduleResults.every(r => r.isValid),
    modules: moduleResults,
    summary,
    timestamp: new Date()
  };
  
  if (verbose) {
    printValidationSummary(report);
  }
  
  return report;
}

/**
 * Calculates summary statistics from module results
 */
function calculateSummary(moduleResults: ModuleValidationResult[]) {
  const totalModules = moduleResults.length;
  const validModules = moduleResults.filter(r => r.isValid).length;
  
  const totalKeys = { es: 0, en: 0 };
  const totalMissingKeys = { es: 0, en: 0 };
  let typeInconsistencies = 0;
  let interpolationIssues = 0;
  
  for (const result of moduleResults) {
    totalKeys.es += result.totalKeys.es || 0;
    totalKeys.en += result.totalKeys.en || 0;
    totalMissingKeys.es += result.missingKeys.es?.length || 0;
    totalMissingKeys.en += result.missingKeys.en?.length || 0;
    typeInconsistencies += result.typeInconsistencies.length;
    interpolationIssues += result.interpolationIssues.length;
  }
  
  const overallCoverage = {
    es: totalKeys.es > 0 ? ((totalKeys.es - totalMissingKeys.es) / totalKeys.es) * 100 : 100,
    en: totalKeys.en > 0 ? ((totalKeys.en - totalMissingKeys.en) / totalKeys.en) * 100 : 100
  };
  
  return {
    totalModules,
    validModules,
    totalKeys,
    totalMissingKeys,
    overallCoverage,
    typeInconsistencies,
    interpolationIssues
  };
}

// ============================================================================
// Reporting Functions
// ============================================================================

/**
 * Prints a detailed validation summary to console
 */
export function printValidationSummary(report: ValidationReport): void {
  const { summary, modules } = report;
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  
  // Overall status
  const overallStatus = report.isValid ? '✅ PASSED' : '❌ FAILED';
  console.log(`Status: ${overallStatus}`);
  console.log(`Modules: ${summary.validModules}/${summary.totalModules} valid`);
  
  // Coverage statistics
  console.log('\n📈 Coverage:');
  console.log(`  Spanish (ES): ${summary.overallCoverage.es.toFixed(1)}% (${summary.totalKeys.es - summary.totalMissingKeys.es}/${summary.totalKeys.es} keys)`);
  console.log(`  English (EN): ${summary.overallCoverage.en.toFixed(1)}% (${summary.totalKeys.en - summary.totalMissingKeys.en}/${summary.totalKeys.en} keys)`);
  
  // Issues summary
  if (summary.totalMissingKeys.es > 0 || summary.totalMissingKeys.en > 0) {
    console.log('\n⚠️  Missing Keys:');
    if (summary.totalMissingKeys.en > 0) {
      console.log(`  Missing in EN: ${summary.totalMissingKeys.en} keys`);
    }
    if (summary.totalMissingKeys.es > 0) {
      console.log(`  Missing in ES: ${summary.totalMissingKeys.es} keys`);
    }
  }
  
  if (summary.typeInconsistencies > 0) {
    console.log(`\n🔧 Type Inconsistencies: ${summary.typeInconsistencies}`);
  }
  
  if (summary.interpolationIssues > 0) {
    console.log(`\n🔗 Interpolation Issues: ${summary.interpolationIssues}`);
  }
  
  // Failed modules details
  const failedModules = modules.filter(m => !m.isValid);
  if (failedModules.length > 0) {
    console.log('\n❌ Failed Modules:');
    for (const module of failedModules) {
      console.log(`\n  📋 ${module.module}:`);
      
      if (module.missingKeys.en.length > 0) {
        console.log(`    Missing in EN (${module.missingKeys.en.length}):`);
        module.missingKeys.en.slice(0, 5).forEach(key => {
          console.log(`      - ${key}`);
        });
        if (module.missingKeys.en.length > 5) {
          console.log(`      ... and ${module.missingKeys.en.length - 5} more`);
        }
      }
      
      if (module.missingKeys.es.length > 0) {
        console.log(`    Missing in ES (${module.missingKeys.es.length}):`);
        module.missingKeys.es.slice(0, 5).forEach(key => {
          console.log(`      - ${key}`);
        });
        if (module.missingKeys.es.length > 5) {
          console.log(`      ... and ${module.missingKeys.es.length - 5} more`);
        }
      }
      
      if (module.typeInconsistencies.length > 0) {
        console.log(`    Type inconsistencies (${module.typeInconsistencies.length}):`);
        module.typeInconsistencies.slice(0, 3).forEach(issue => {
          console.log(`      - ${issue.key}: ES(${issue.esType}) vs EN(${issue.enType})`);
        });
        if (module.typeInconsistencies.length > 3) {
          console.log(`      ... and ${module.typeInconsistencies.length - 3} more`);
        }
      }
      
      if (module.interpolationIssues.length > 0) {
        console.log(`    Interpolation issues (${module.interpolationIssues.length}):`);
        module.interpolationIssues.slice(0, 3).forEach(issue => {
          console.log(`      - ${issue.key}: ${issue.description}`);
        });
        if (module.interpolationIssues.length > 3) {
          console.log(`      ... and ${module.interpolationIssues.length - 3} more`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Validation completed at ${report.timestamp.toISOString()}`);
}

/**
 * Generates a detailed validation report in JSON format
 */
export function generateJSONReport(report: ValidationReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generates a validation report in markdown format
 */
export function generateMarkdownReport(report: ValidationReport): string {
  const { summary, modules } = report;
  
  let markdown = `# i18n Validation Report\n\n`;
  markdown += `**Generated:** ${report.timestamp.toISOString()}\n`;
  markdown += `**Status:** ${report.isValid ? '✅ PASSED' : '❌ FAILED'}\n\n`;
  
  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Modules:** ${summary.validModules}/${summary.totalModules} valid\n`;
  markdown += `- **Spanish Coverage:** ${summary.overallCoverage.es.toFixed(1)}% (${summary.totalKeys.es - summary.totalMissingKeys.es}/${summary.totalKeys.es} keys)\n`;
  markdown += `- **English Coverage:** ${summary.overallCoverage.en.toFixed(1)}% (${summary.totalKeys.en - summary.totalMissingKeys.en}/${summary.totalKeys.en} keys)\n`;
  
  if (summary.totalMissingKeys.es > 0 || summary.totalMissingKeys.en > 0) {
    markdown += `- **Missing Keys:** ${summary.totalMissingKeys.en} in EN, ${summary.totalMissingKeys.es} in ES\n`;
  }
  
  if (summary.typeInconsistencies > 0) {
    markdown += `- **Type Inconsistencies:** ${summary.typeInconsistencies}\n`;
  }
  
  if (summary.interpolationIssues > 0) {
    markdown += `- **Interpolation Issues:** ${summary.interpolationIssues}\n`;
  }
  
  // Module details
  markdown += `\n## Module Details\n\n`;
  
  for (const module of modules) {
    const status = module.isValid ? '✅' : '❌';
    markdown += `### ${status} ${module.module}\n\n`;
    markdown += `- **ES Coverage:** ${module.coverage.es.toFixed(1)}% (${module.totalKeys.es} keys)\n`;
    markdown += `- **EN Coverage:** ${module.coverage.en.toFixed(1)}% (${module.totalKeys.en} keys)\n`;
    
    if (!module.isValid) {
      if (module.missingKeys.en.length > 0) {
        markdown += `\n**Missing in EN (${module.missingKeys.en.length}):**\n`;
        module.missingKeys.en.forEach(key => {
          markdown += `- \`${key}\`\n`;
        });
      }
      
      if (module.missingKeys.es.length > 0) {
        markdown += `\n**Missing in ES (${module.missingKeys.es.length}):**\n`;
        module.missingKeys.es.forEach(key => {
          markdown += `- \`${key}\`\n`;
        });
      }
      
      if (module.typeInconsistencies.length > 0) {
        markdown += `\n**Type Inconsistencies (${module.typeInconsistencies.length}):**\n`;
        module.typeInconsistencies.forEach(issue => {
          markdown += `- \`${issue.key}\`: ES(${issue.esType}) vs EN(${issue.enType})\n`;
        });
      }
      
      if (module.interpolationIssues.length > 0) {
        markdown += `\n**Interpolation Issues (${module.interpolationIssues.length}):**\n`;
        module.interpolationIssues.forEach(issue => {
          markdown += `- \`${issue.key}\`: ${issue.description}\n`;
        });
      }
    }
    
    markdown += `\n`;
  }
  
  return markdown;
}

// ============================================================================
// Utility Functions for Testing and CLI
// ============================================================================

/**
 * Validates a specific module by name
 */
export async function validateModule(
  moduleName: TranslationModule,
  options: { verbose?: boolean } = {}
): Promise<ModuleValidationResult> {
  const { verbose = false } = options;
  
  if (verbose) {
    console.log(`🔍 Validating module: ${moduleName}`);
  }
  
  const esTranslations = await loadTranslationModule('es', moduleName);
  const enTranslations = await loadTranslationModule('en', moduleName);
  
  const result = validateModuleCompleteness(esTranslations, enTranslations, moduleName);
  
  if (verbose) {
    const status = result.isValid ? '✅' : '❌';
    console.log(`${status} ${moduleName}: ${result.coverage.es.toFixed(1)}% ES, ${result.coverage.en.toFixed(1)}% EN`);
    
    if (!result.isValid) {
      if (result.missingKeys.en.length > 0) {
        console.log(`  Missing in EN: ${result.missingKeys.en.join(', ')}`);
      }
      if (result.missingKeys.es.length > 0) {
        console.log(`  Missing in ES: ${result.missingKeys.es.join(', ')}`);
      }
    }
  }
  
  return result;
}

/**
 * Quick validation check - returns true if all validations pass
 */
export async function quickValidation(): Promise<boolean> {
  const report = await validateAllModules({ verbose: false });
  return report.isValid;
}

/**
 * Validates interpolation for a specific translation string
 */
export function validateTranslationInterpolation(
  esText: string,
  enText: string,
  key: string
): InterpolationIssue[] {
  const issues: InterpolationIssue[] = [];
  
  const esVariables = extractVariables(esText);
  const enVariables = extractVariables(enText);
  
  // Check for missing variables in EN
  const missingInEn = esVariables.filter(v => !enVariables.includes(v));
  if (missingInEn.length > 0) {
    issues.push({
      key,
      locale: 'en',
      type: 'missing_variables',
      description: `Missing variables in EN: ${missingInEn.join(', ')}`,
      expected: esVariables,
      actual: enVariables
    });
  }
  
  // Check for extra variables in EN
  const extraInEn = enVariables.filter(v => !esVariables.includes(v));
  if (extraInEn.length > 0) {
    issues.push({
      key,
      locale: 'en',
      type: 'extra_variables',
      description: `Extra variables in EN: ${extraInEn.join(', ')}`,
      expected: esVariables,
      actual: enVariables
    });
  }
  
  return issues;
}

// ============================================================================
// Export Main Functions
// ============================================================================

export {
  validateAllModules as validate,
  printValidationSummary as printSummary,
  generateJSONReport as toJSON,
  generateMarkdownReport as toMarkdown,
  quickValidation as isValid
};

// Default export for convenience
export default {
  validate: validateAllModules,
  validateModule,
  quickValidation,
  printSummary: printValidationSummary,
  toJSON: generateJSONReport,
  toMarkdown: generateMarkdownReport,
  isValid: quickValidation
};