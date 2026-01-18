#!/usr/bin/env node

/**
 * CLI script for i18n validation
 * 
 * Usage:
 *   node i18n/validate-cli.cjs [options]
 * 
 * Options:
 *   --module <name>    Validate specific module only
 *   --format <type>    Output format: console, json, markdown
 *   --output <file>    Save report to file
 *   --verbose          Show detailed output
 *   --help             Show this help
 */

const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// Validation Logic (JavaScript version)
// ============================================================================

/**
 * Recursively extracts all translation keys from a nested object
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
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
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * Extracts interpolation variables from a string
 */
function extractVariables(template) {
  if (!template) return [];
  
  const regex = /\{\{(\w+)\}\}/g;
  const variables = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const varName = match[1];
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }
  
  return variables;
}

/**
 * Validates interpolation variables between two strings
 */
function validateInterpolation(esText, enText, key) {
  const issues = [];
  
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

/**
 * Validates type consistency between locales
 */
function validateTypeConsistency(esTranslations, enTranslations, commonKeys) {
  const inconsistencies = [];
  
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
 * Validates interpolation for all common keys
 */
function validateModuleInterpolation(esTranslations, enTranslations, commonKeys) {
  const issues = [];
  
  for (const key of commonKeys) {
    const esValue = getNestedValue(esTranslations, key);
    const enValue = getNestedValue(enTranslations, key);
    
    // Only validate string values
    if (typeof esValue !== 'string' || typeof enValue !== 'string') {
      continue;
    }
    
    const keyIssues = validateInterpolation(esValue, enValue, key);
    issues.push(...keyIssues);
  }
  
  return issues;
}

/**
 * Creates mock translations for demonstration
 */
function createMockTranslations(module) {
  const mockData = {
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete'
    },
    poll: {
      title: 'Poll',
      question: 'Question',
      votes: 'Votes: {{count}}',
      winner: 'Winner: {{name}}'
    },
    errors: {
      network: 'Network error',
      validation: 'Validation failed'
    },
    navigation: {
      panel: 'Panel',
      poll: 'Poll',
      games: 'Games'
    },
    games: {
      title: 'Games',
      active: 'Active'
    },
    giveaway: {
      title: 'Giveaway',
      participants: 'Participants: {{count}}'
    },
    macros: {
      title: 'Macros',
      newMacro: 'New Macro'
    },
    commands: {
      title: 'Commands',
      newCommand: 'New Command'
    }
  };
  
  return mockData[module] || {};
}

/**
 * Loads a translation module (mock implementation for demo)
 */
async function loadTranslationModule(locale, module) {
  try {
    // For demonstration, we'll use mock data
    // In a real implementation, this would parse the actual TypeScript files
    const mockTranslations = createMockTranslations(module);
    
    // Simulate slight differences between locales for testing
    if (locale === 'en' && module === 'poll') {
      // Simulate a missing key in English
      const { winner, ...rest } = mockTranslations;
      return rest;
    }
    
    if (locale === 'en' && module === 'giveaway') {
      // Simulate interpolation mismatch
      return {
        ...mockTranslations,
        participants: 'Participants: {{total}}' // Different variable name
      };
    }
    
    return mockTranslations;
    
  } catch (error) {
    console.warn(`Failed to load module ${module} for locale ${locale}:`, error.message);
    return {};
  }
}

/**
 * Validates a single module
 */
function validateModuleCompleteness(esTranslations, enTranslations, module) {
  const esKeys = getAllKeys(esTranslations);
  const enKeys = getAllKeys(enTranslations);
  
  const missingInEn = esKeys.filter(key => !enKeys.includes(key));
  const missingInEs = enKeys.filter(key => !esKeys.includes(key));
  
  const commonKeys = esKeys.filter(key => enKeys.includes(key));
  const typeInconsistencies = validateTypeConsistency(esTranslations, enTranslations, commonKeys);
  const interpolationIssues = validateModuleInterpolation(esTranslations, enTranslations, commonKeys);
  
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
 * Validates all modules
 */
async function validateAllModules(options = {}) {
  const {
    modules = ['common', 'errors', 'navigation', 'poll', 'games', 'giveaway', 'macros', 'commands'],
    verbose = false
  } = options;
  
  const moduleResults = [];
  
  if (verbose) {
    console.log(`🔍 Validating ${modules.length} modules...`);
  }
  
  for (const module of modules) {
    if (verbose) {
      console.log(`  📋 Validating module: ${module}`);
    }
    
    const esTranslations = await loadTranslationModule('es', module);
    const enTranslations = await loadTranslationModule('en', module);
    
    const result = validateModuleCompleteness(esTranslations, enTranslations, module);
    moduleResults.push(result);
    
    if (verbose) {
      const status = result.isValid ? '✅' : '❌';
      console.log(`    ${status} ${module}: ${result.coverage.es.toFixed(1)}% ES, ${result.coverage.en.toFixed(1)}% EN`);
      
      if (!result.isValid) {
        if (result.missingKeys.en.length > 0) {
          console.log(`      Missing in EN: ${result.missingKeys.en.join(', ')}`);
        }
        if (result.interpolationIssues.length > 0) {
          console.log(`      Interpolation issues: ${result.interpolationIssues.length}`);
        }
      }
    }
  }
  
  // Calculate summary
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
    isValid: moduleResults.every(r => r.isValid),
    modules: moduleResults,
    summary: {
      totalModules,
      validModules,
      totalKeys,
      totalMissingKeys,
      overallCoverage,
      typeInconsistencies,
      interpolationIssues
    },
    timestamp: new Date()
  };
}

// ============================================================================
// CLI Interface
// ============================================================================

function printHelp() {
  console.log(`
i18n Translation Validation CLI

Usage:
  node i18n/validate-cli.cjs [options]

Options:
  --module <name>    Validate specific module only
  --format <type>    Output format: console, json, markdown (default: console)
  --output <file>    Save report to file
  --verbose          Show detailed output
  --help             Show this help

Examples:
  node i18n/validate-cli.cjs --verbose
  node i18n/validate-cli.cjs --module poll --format json
  node i18n/validate-cli.cjs --format markdown --output report.md
`);
}

function printConsoleReport(report) {
  const { summary, modules } = report;
  
  console.log('\n📊 i18n VALIDATION REPORT');
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
        console.log(`    Missing in EN: ${module.missingKeys.en.join(', ')}`);
      }
      
      if (module.interpolationIssues.length > 0) {
        console.log(`    Interpolation issues:`);
        module.interpolationIssues.forEach(issue => {
          console.log(`      - ${issue.key}: ${issue.description}`);
        });
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Generated: ${report.timestamp.toISOString()}`);
}

function generateMarkdownReport(report) {
  const { summary, modules } = report;
  
  let markdown = `# i18n Validation Report\n\n`;
  markdown += `**Generated:** ${report.timestamp.toISOString()}\n`;
  markdown += `**Status:** ${report.isValid ? '✅ PASSED' : '❌ FAILED'}\n\n`;
  
  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Modules:** ${summary.validModules}/${summary.totalModules} valid\n`;
  markdown += `- **Spanish Coverage:** ${summary.overallCoverage.es.toFixed(1)}%\n`;
  markdown += `- **English Coverage:** ${summary.overallCoverage.en.toFixed(1)}%\n`;
  
  if (summary.totalMissingKeys.es > 0 || summary.totalMissingKeys.en > 0) {
    markdown += `- **Missing Keys:** ${summary.totalMissingKeys.en} in EN, ${summary.totalMissingKeys.es} in ES\n`;
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
        markdown += `\n**Missing in EN:**\n`;
        module.missingKeys.en.forEach(key => {
          markdown += `- \`${key}\`\n`;
        });
      }
      
      if (module.interpolationIssues.length > 0) {
        markdown += `\n**Interpolation Issues:**\n`;
        module.interpolationIssues.forEach(issue => {
          markdown += `- \`${issue.key}\`: ${issue.description}\n`;
        });
      }
    }
    
    markdown += `\n`;
  }
  
  return markdown;
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const options = {
    module: null,
    format: 'console',
    output: null,
    verbose: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
        options.help = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--module':
        options.module = args[++i];
        break;
      case '--format':
        options.format = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
    }
  }
  
  if (options.help) {
    printHelp();
    return;
  }
  
  try {
    console.log('🔍 Starting i18n validation...');
    
    const validationOptions = {
      verbose: options.verbose
    };
    
    if (options.module) {
      validationOptions.modules = [options.module];
    }
    
    const report = await validateAllModules(validationOptions);
    
    // Output report
    switch (options.format) {
      case 'json':
        const jsonReport = JSON.stringify(report, null, 2);
        if (options.output) {
          await fs.writeFile(options.output, jsonReport);
          console.log(`📄 JSON report saved to: ${options.output}`);
        } else {
          console.log(jsonReport);
        }
        break;
        
      case 'markdown':
        const markdownReport = generateMarkdownReport(report);
        if (options.output) {
          await fs.writeFile(options.output, markdownReport);
          console.log(`📄 Markdown report saved to: ${options.output}`);
        } else {
          console.log(markdownReport);
        }
        break;
        
      default:
        printConsoleReport(report);
        break;
    }
    
    // Exit with appropriate code
    process.exit(report.isValid ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateAllModules,
  validateModuleCompleteness,
  getAllKeys,
  extractVariables,
  validateInterpolation
};