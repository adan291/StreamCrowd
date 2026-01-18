/**
 * Spanish translations for Commands feature
 * 
 * Contains all translations related to commands, including the enhanced command system
 * with templates, visual editor, AI generation, and categories.
 * 
 * This module integrates translations from the previous commandEnhancementLocales.ts file
 * into the new modular i18n structure.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-2.1: Traducciones de comandos integradas en la estructura modular
 */

import type { CommandsTranslations } from '../../types';

export const commands: CommandsTranslations = {
  // Templates
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

  // Visual Editor
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

  // Command Tester
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

  // AI Generator
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

  // Categories
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

  // Enhanced Panel
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

  // Export/Import
  export: {
    title: 'Exportar/Importar',
    export: 'Exportar',
    import: 'Importar',
    exporting: 'Exportando...',
    importing: 'Importando...',
    // Export
    exportTitle: 'Exportar Comandos',
    exportV2: 'Exportar (v2.0)',
    exportLegacy: 'Exportar (v1.0 legacy)',
    exportDescription: 'Descarga tus comandos como archivo JSON',
    exportSuccess: 'Comandos exportados correctamente',
    exportError: 'Error al exportar comandos',
    noCommandsToExport: 'No hay comandos para exportar',
    // Import
    importTitle: 'Importar Comandos',
    importDescription: 'Sube un archivo JSON con comandos',
    selectFile: 'Seleccionar archivo JSON',
    dragDropFile: 'Arrastra un archivo aquí o haz clic para seleccionar',
    importMode: 'Modo de importación',
    merge: 'Combinar',
    replace: 'Reemplazar',
    mergeDesc: 'Agregar nuevos comandos, mantener existentes',
    replaceDesc: 'Reemplazar todos los comandos existentes',
    modeMergeDesc: 'Añade nuevos comandos sin eliminar los existentes',
    modeReplaceDesc: 'Reemplaza todos los comandos existentes',
    importSuccess: 'Comandos importados correctamente',
    importError: 'Error al importar comandos',
    success: 'Importación exitosa',
    error: 'Error de importación',
    // Validation
    invalidFormat: 'Formato de archivo inválido',
    invalidVersion: 'Versión de archivo no soportada',
    invalidCommands: 'El archivo contiene comandos inválidos',
    invalidFile: 'Archivo inválido',
    commandsImported: 'comandos importados',
    commandsSkipped: 'comandos omitidos',
    imported: 'importados',
    skipped: 'omitidos',
    replaced: 'reemplazados',
    duplicatesFound: 'Se encontraron duplicados',
    // Confirmation
    confirmReplace: '¿Reemplazar comandos?',
    confirmReplaceDesc: 'Esto eliminará todos los comandos existentes',
    // Additional options
    includeCategories: 'Incluir categorías personalizadas',
    includeMetadata: 'Incluir metadatos y estadísticas',
  },

  // Analysis
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
