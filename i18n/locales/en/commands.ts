/**
 * English (EN) Commands Translations
 * 
 * Commands system translations including enhanced features.
 * Integrates commandEnhancementLocales functionality.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { CommandsTranslations } from '../../types';

/**
 * Commands English translations
 * Enhanced command system with templates, AI, and visual editor
 */
export const commands: CommandsTranslations = {
  // Templates
  templates: {
    title: 'Command Templates',
    search: 'Search',
    searchPlaceholder: 'Search templates...',
    noResults: 'No templates found',
    useTemplate: 'Use Template',
    customize: 'Customize',
    preview: 'Preview',
    categories: {
      info: 'Information',
      social: 'Social Media',
      entertainment: 'Entertainment',
      moderation: 'Moderation',
      utility: 'Utilities',
      games: 'Games',
    },
  },
  
  // Visual Editor
  visualEditor: {
    title: 'Visual Editor',
    visualMode: 'Visual',
    textMode: 'Text',
    addBlock: 'Add block',
    clear: 'Clear',
    preview: 'Preview',
    noContent: 'No content',
    dragHint: 'Add blocks to build your command',
    blocks: {
      text: 'Text',
      variable: 'Variable',
      conditional: 'Conditional',
      api: 'API',
    },
    blockDescriptions: {
      text: 'Static text',
      variable: 'Dynamic value',
      conditional: 'If/then',
      api: 'External data',
    },
  },
  
  // Command Tester
  tester: {
    title: 'Test Command',
    simulateAs: 'Simulate as',
    arguments: 'Arguments',
    argumentsPlaceholder: 'arg1 arg2 arg3',
    runTest: 'Run Test',
    autoTest: 'Auto-test',
    result: 'Result',
    noResult: 'Run the test to see the result',
    validCommand: 'Valid command',
    warnings: 'Warnings',
    variablesUsed: 'Variables',
    userLevels: {
      viewer: 'Viewer',
      subscriber: 'Subscriber',
      vip: 'VIP',
      moderator: 'Moderator',
      broadcaster: 'Broadcaster',
    },
  },
  
  // AI Generator
  ai: {
    title: 'Generate with AI',
    description: 'Describe the command you want to create in natural language',
    inputLabel: 'What do you want the command to do?',
    inputPlaceholder: 'E.g.: A command to show my social media...',
    generate: 'Generate Command',
    generating: 'Generating...',
    confidence: 'confidence',
    alternatives: 'Alternatives',
    discard: 'Discard',
    addCommand: 'Add Command',
    localMode: 'Using local generation. Configure an API key in Data → AI for better results.',
    ideas: 'Ideas',
    examples: {
      greeting: 'A command to greet new viewers',
      social: 'Show my social media',
      hug: 'A fun command to hug someone',
      uptime: 'Show how long the stream has been live',
      rank: 'A command to show my game rank',
    },
  },
  
  // Categories
  categories: {
    title: 'Categories',
    newCategory: 'New',
    editCategory: 'Edit',
    deleteCategory: 'Delete',
    deleteConfirm: 'Delete this category? Commands will be moved to "General".',
    nameLabel: 'Name',
    namePlaceholder: 'Category name',
    iconLabel: 'Icon',
    colorLabel: 'Color',
    defaultCategories: {
      general: 'General',
      info: 'Information',
      social: 'Social Media',
      entertainment: 'Entertainment',
      games: 'Games',
      moderation: 'Moderation',
      utility: 'Utilities',
      other: 'Other',
    },
  },
  
  // Enhanced Panel
  panel: {
    commands: 'Commands',
    templates: 'Templates',
    ai: 'AI',
    categories: 'Categories',
    newCommand: 'New',
    editCommand: 'Edit Command',
    testCommand: 'Test',
    allCategories: 'All',
    activeCommands: 'active',
    totalUsage: 'Total usage',
    noCommands: 'No commands configured',
    createOrTemplate: 'Create command or use template',
  },
  
  // Export/Import
  export: {
    title: 'Export/Import',
    export: 'Export',
    import: 'Import',
    exporting: 'Exporting...',
    importing: 'Importing...',
    // Export
    exportTitle: 'Export Commands',
    exportV2: 'Export (v2.0)',
    exportLegacy: 'Export (v1.0 legacy)',
    exportDescription: 'Download your commands as JSON file',
    exportSuccess: 'Commands exported successfully',
    exportError: 'Error exporting commands',
    noCommandsToExport: 'No commands to export',
    // Import
    importTitle: 'Import Commands',
    importDescription: 'Upload a JSON file with commands',
    selectFile: 'Select JSON file',
    dragDropFile: 'Drag a file here or click to select',
    importMode: 'Import mode',
    merge: 'Merge',
    replace: 'Replace',
    mergeDesc: 'Add new commands, keep existing ones',
    replaceDesc: 'Replace all existing commands',
    modeMergeDesc: 'Add new commands without removing existing ones',
    modeReplaceDesc: 'Replace all existing commands',
    importSuccess: 'Commands imported successfully',
    importError: 'Error importing commands',
    success: 'Import successful',
    error: 'Import error',
    // Validation
    invalidFormat: 'Invalid file format',
    invalidVersion: 'Unsupported file version',
    invalidCommands: 'File contains invalid commands',
    invalidFile: 'Invalid file',
    commandsImported: 'commands imported',
    commandsSkipped: 'commands skipped',
    imported: 'imported',
    skipped: 'skipped',
    replaced: 'replaced',
    duplicatesFound: 'Duplicates found',
    // Confirmation
    confirmReplace: 'Replace commands?',
    confirmReplaceDesc: 'This will remove all existing commands',
    includeCategories: 'Include custom categories',
    includeMetadata: 'Include metadata and statistics',
  },
  
  // Analysis
  analysis: {
    title: 'Command Analysis',
    refresh: 'Refresh',
    analyzing: 'Analyzing commands...',
    noCommands: 'No commands to analyze',
    createFirst: 'Create some commands first',
    allGood: 'Your commands are well optimized!',
    noProblems: 'No problems found',
    stats: {
      total: 'Total commands',
      active: 'Active',
      suggestions: 'Suggestions',
      ideas: 'New ideas',
    },
    sections: {
      duplicates: 'Duplicate Commands',
      similarTriggers: 'Similar Triggers',
      suggestions: 'Improvement Suggestions',
      longResponses: 'Long Responses',
      newIdeas: 'New Command Ideas',
    },
    priority: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    },
    actions: {
      create: 'Create',
      dismiss: 'Dismiss',
      edit: 'Edit',
    },
    aiMode: {
      enabled: 'AI analysis enabled',
      local: 'Local analysis (configure API key for advanced AI)',
    },
  },
};

export default commands;