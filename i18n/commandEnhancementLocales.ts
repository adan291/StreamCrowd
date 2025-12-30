/**
 * Command Enhancement Translations
 * 
 * Translations for the enhanced command system including
 * templates, visual editor, AI generation, and categories.
 */

export interface CommandEnhancementTranslations {
  // Templates
  templates: {
    title: string;
    search: string;
    searchPlaceholder: string;
    noResults: string;
    useTemplate: string;
    customize: string;
    preview: string;
    categories: {
      info: string;
      social: string;
      entertainment: string;
      moderation: string;
      utility: string;
      games: string;
    };
  };
  // Visual Editor
  visualEditor: {
    title: string;
    visualMode: string;
    textMode: string;
    addBlock: string;
    clear: string;
    preview: string;
    noContent: string;
    dragHint: string;
    blocks: {
      text: string;
      variable: string;
      conditional: string;
      api: string;
    };
    blockDescriptions: {
      text: string;
      variable: string;
      conditional: string;
      api: string;
    };
  };
  // Command Tester
  tester: {
    title: string;
    simulateAs: string;
    arguments: string;
    argumentsPlaceholder: string;
    runTest: string;
    autoTest: string;
    result: string;
    noResult: string;
    validCommand: string;
    warnings: string;
    variablesUsed: string;
    userLevels: {
      viewer: string;
      subscriber: string;
      vip: string;
      moderator: string;
      broadcaster: string;
    };
  };
  // AI Generator
  ai: {
    title: string;
    description: string;
    inputLabel: string;
    inputPlaceholder: string;
    generate: string;
    generating: string;
    confidence: string;
    alternatives: string;
    discard: string;
    addCommand: string;
    localMode: string;
    ideas: string;
    examples: {
      greeting: string;
      social: string;
      hug: string;
      uptime: string;
      rank: string;
    };
  };
  // Categories
  categories: {
    title: string;
    newCategory: string;
    editCategory: string;
    deleteCategory: string;
    deleteConfirm: string;
    nameLabel: string;
    namePlaceholder: string;
    iconLabel: string;
    colorLabel: string;
    defaultCategories: {
      general: string;
      info: string;
      social: string;
      entertainment: string;
      games: string;
      moderation: string;
      utility: string;
      other: string;
    };
  };
  // Enhanced Panel
  panel: {
    commands: string;
    templates: string;
    ai: string;
    categories: string;
    newCommand: string;
    editCommand: string;
    testCommand: string;
    allCategories: string;
    activeCommands: string;
    totalUsage: string;
    noCommands: string;
    createOrTemplate: string;
  };
  // Export/Import
  export: {
    title: string;
    exportV2: string;
    exportLegacy: string;
    import: string;
    importMode: string;
    merge: string;
    replace: string;
    mergeDesc: string;
    replaceDesc: string;
    success: string;
    imported: string;
    skipped: string;
    replaced: string;
    error: string;
    invalidFile: string;
    selectFile: string;
    includeCategories: string;
    includeMetadata: string;
  };
  // Analysis
  analysis: {
    title: string;
    refresh: string;
    analyzing: string;
    noCommands: string;
    createFirst: string;
    allGood: string;
    noProblems: string;
    stats: {
      total: string;
      active: string;
      suggestions: string;
      ideas: string;
    };
    sections: {
      duplicates: string;
      similarTriggers: string;
      suggestions: string;
      longResponses: string;
      newIdeas: string;
    };
    priority: {
      low: string;
      medium: string;
      high: string;
    };
    actions: {
      create: string;
      dismiss: string;
      edit: string;
    };
    aiMode: {
      enabled: string;
      local: string;
    };
  };
}

export const commandEnhancementEs: CommandEnhancementTranslations = {
  templates: {
    title: 'Plantillas de Comandos',
    search: 'Buscar',
    searchPlaceholder: 'Buscar plantillas...',
    noResults: 'No se encontraron plantillas',
    useTemplate: 'Usar Plantilla',
    customize: 'Personalizar',
    preview: 'Vista previa',
    categories: {
      info: 'Información',
      social: 'Redes Sociales',
      entertainment: 'Entretenimiento',
      moderation: 'Moderación',
      utility: 'Utilidades',
      games: 'Juegos',
    },
  },
  visualEditor: {
    title: 'Editor Visual',
    visualMode: 'Visual',
    textMode: 'Texto',
    addBlock: 'Agregar bloque',
    clear: 'Limpiar',
    preview: 'Vista previa',
    noContent: 'Sin contenido',
    dragHint: 'Agrega bloques para construir tu comando',
    blocks: {
      text: 'Texto',
      variable: 'Variable',
      conditional: 'Condicional',
      api: 'API',
    },
    blockDescriptions: {
      text: 'Texto estático',
      variable: 'Valor dinámico',
      conditional: 'Si/entonces',
      api: 'Datos externos',
    },
  },
  tester: {
    title: 'Probar Comando',
    simulateAs: 'Simular como',
    arguments: 'Argumentos',
    argumentsPlaceholder: 'arg1 arg2 arg3',
    runTest: 'Ejecutar Test',
    autoTest: 'Auto-test',
    result: 'Resultado',
    noResult: 'Ejecuta el test para ver el resultado',
    validCommand: 'Comando válido',
    warnings: 'Advertencias',
    variablesUsed: 'Variables',
    userLevels: {
      viewer: 'Viewer',
      subscriber: 'Suscriptor',
      vip: 'VIP',
      moderator: 'Moderador',
      broadcaster: 'Broadcaster',
    },
  },
  ai: {
    title: 'Generar con IA',
    description: 'Describe el comando que quieres crear en lenguaje natural',
    inputLabel: '¿Qué quieres que haga el comando?',
    inputPlaceholder: 'Ej: Un comando para mostrar mis redes sociales...',
    generate: 'Generar Comando',
    generating: 'Generando...',
    confidence: 'confianza',
    alternatives: 'Alternativas',
    discard: 'Descartar',
    addCommand: 'Agregar Comando',
    localMode: 'Usando generación local. Configura una API key en Datos → IA para mejores resultados.',
    ideas: 'Ideas',
    examples: {
      greeting: 'Un comando para saludar a los nuevos viewers',
      social: 'Mostrar mis redes sociales',
      hug: 'Un comando divertido para abrazar a alguien',
      uptime: 'Mostrar el tiempo que lleva el stream',
      rank: 'Un comando para mostrar mi rango en el juego',
    },
  },
  categories: {
    title: 'Categorías',
    newCategory: 'Nueva',
    editCategory: 'Editar',
    deleteCategory: 'Eliminar',
    deleteConfirm: '¿Eliminar esta categoría? Los comandos se moverán a "General".',
    nameLabel: 'Nombre',
    namePlaceholder: 'Nombre de categoría',
    iconLabel: 'Icono',
    colorLabel: 'Color',
    defaultCategories: {
      general: 'General',
      info: 'Información',
      social: 'Redes Sociales',
      entertainment: 'Entretenimiento',
      games: 'Juegos',
      moderation: 'Moderación',
      utility: 'Utilidades',
      other: 'Otros',
    },
  },
  panel: {
    commands: 'Comandos',
    templates: 'Plantillas',
    ai: 'IA',
    categories: 'Categorías',
    newCommand: 'Nuevo',
    editCommand: 'Editar Comando',
    testCommand: 'Probar',
    allCategories: 'Todas',
    activeCommands: 'activos',
    totalUsage: 'Total usos',
    noCommands: 'No hay comandos configurados',
    createOrTemplate: 'Crear comando o usar plantilla',
  },
  export: {
    title: 'Exportar/Importar',
    exportV2: 'Exportar (v2.0)',
    exportLegacy: 'Exportar (v1.0 legacy)',
    import: 'Importar',
    importMode: 'Modo de importación',
    merge: 'Combinar',
    replace: 'Reemplazar',
    mergeDesc: 'Agregar nuevos comandos, mantener existentes',
    replaceDesc: 'Reemplazar todos los comandos existentes',
    success: 'Importación exitosa',
    imported: 'importados',
    skipped: 'omitidos',
    replaced: 'reemplazados',
    error: 'Error de importación',
    invalidFile: 'Archivo inválido',
    selectFile: 'Seleccionar archivo JSON',
    includeCategories: 'Incluir categorías personalizadas',
    includeMetadata: 'Incluir metadatos y estadísticas',
  },
  analysis: {
    title: 'Análisis de Comandos',
    refresh: 'Actualizar',
    analyzing: 'Analizando comandos...',
    noCommands: 'No hay comandos para analizar',
    createFirst: 'Crea algunos comandos primero',
    allGood: '¡Tus comandos están bien optimizados!',
    noProblems: 'No se encontraron problemas',
    stats: {
      total: 'Total comandos',
      active: 'Activos',
      suggestions: 'Sugerencias',
      ideas: 'Ideas nuevas',
    },
    sections: {
      duplicates: 'Comandos Duplicados',
      similarTriggers: 'Triggers Similares',
      suggestions: 'Sugerencias de Mejora',
      longResponses: 'Respuestas Largas',
      newIdeas: 'Ideas para Nuevos Comandos',
    },
    priority: {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
    },
    actions: {
      create: 'Crear',
      dismiss: 'Descartar',
      edit: 'Editar',
    },
    aiMode: {
      enabled: 'Análisis con IA activado',
      local: 'Análisis local (configura API key para IA avanzada)',
    },
  },
};

export const commandEnhancementEn: CommandEnhancementTranslations = {
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
  export: {
    title: 'Export/Import',
    exportV2: 'Export (v2.0)',
    exportLegacy: 'Export (v1.0 legacy)',
    import: 'Import',
    importMode: 'Import mode',
    merge: 'Merge',
    replace: 'Replace',
    mergeDesc: 'Add new commands, keep existing ones',
    replaceDesc: 'Replace all existing commands',
    success: 'Import successful',
    imported: 'imported',
    skipped: 'skipped',
    replaced: 'replaced',
    error: 'Import error',
    invalidFile: 'Invalid file',
    selectFile: 'Select JSON file',
    includeCategories: 'Include custom categories',
    includeMetadata: 'Include metadata and statistics',
  },
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
