/**
 * AICommandService
 * 
 * Service for AI-powered command generation and analysis.
 * Integrates with the existing AI analytics service.
 */

import type { 
  ChannelContext, 
  GeneratedCommand, 
  CommandAnalysis, 
  CommandSuggestion 
} from '../../../types/commandEditor';
import type { ExportedCommand } from '../../../types/commandExport';

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
};

let requestCount = 0;
let windowStart = Date.now();

/**
 * Check rate limit
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - windowStart > RATE_LIMIT.windowMs) {
    requestCount = 0;
    windowStart = now;
  }
  if (requestCount >= RATE_LIMIT.maxRequests) {
    return false;
  }
  requestCount++;
  return true;
}

/**
 * Common command patterns for local analysis
 */
const COMMON_PATTERNS = {
  social: ['twitter', 'instagram', 'youtube', 'tiktok', 'discord', 'kick'],
  info: ['horario', 'schedule', 'comandos', 'commands', 'help', 'ayuda'],
  entertainment: ['abrazo', 'hug', 'dado', 'dice', 'love', '8ball', 'slap'],
  utility: ['uptime', 'game', 'juego', 'titulo', 'title', 'viewers'],
};

/**
 * Analyze commands locally (fallback when AI is not available)
 */
function analyzeCommandsLocally(commands: ExportedCommand[]): CommandAnalysis {
  const duplicates: CommandAnalysis['duplicates'] = [];
  const similarTriggers: CommandAnalysis['similarTriggers'] = [];
  const longResponses: CommandAnalysis['longResponses'] = [];
  const suggestions: CommandSuggestion[] = [];
  const newCommandIdeas: CommandAnalysis['newCommandIdeas'] = [];

  // Find duplicates (same response)
  const responseMap = new Map<string, string[]>();
  commands.forEach(cmd => {
    const normalized = cmd.response.toLowerCase().trim();
    const existing = responseMap.get(normalized) || [];
    existing.push(cmd.name);
    responseMap.set(normalized, existing);
  });
  responseMap.forEach((names, response) => {
    if (names.length > 1) {
      duplicates.push({
        commands: names,
        reason: 'Misma respuesta',
      });
    }
  });

  // Find similar triggers
  const triggers = commands.map(c => c.name.toLowerCase());
  for (let i = 0; i < triggers.length; i++) {
    for (let j = i + 1; j < triggers.length; j++) {
      if (triggers[i].includes(triggers[j]) || triggers[j].includes(triggers[i])) {
        similarTriggers.push({
          triggers: [triggers[i], triggers[j]],
          suggestion: 'Considera combinar estos comandos',
        });
      }
    }
  }

  // Find long responses
  commands.forEach(cmd => {
    if (cmd.response.length > 300) {
      longResponses.push({
        trigger: cmd.name,
        length: cmd.response.length,
      });
      suggestions.push({
        type: 'optimize',
        target: cmd.name,
        suggestion: 'Acortar la respuesta',
        reason: `La respuesta tiene ${cmd.response.length} caracteres`,
        priority: 'medium',
      });
    }
  });

  // Suggest missing common commands
  const existingTriggers = new Set(triggers);
  Object.entries(COMMON_PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach(pattern => {
      if (!existingTriggers.has(pattern)) {
        newCommandIdeas.push({
          trigger: pattern,
          description: `Comando común de ${category}`,
        });
      }
    });
  });

  // Check for commands without variables
  commands.forEach(cmd => {
    if (!cmd.response.includes('$(') && !cmd.response.includes('{')) {
      suggestions.push({
        type: 'add_variable',
        target: cmd.name,
        suggestion: 'Agregar variables dinámicas',
        reason: 'El comando no usa variables, podría ser más interactivo',
        priority: 'low',
      });
    }
  });

  return {
    totalCommands: commands.length,
    duplicates,
    similarTriggers,
    unusedCommands: [], // Would need usage data
    longResponses,
    suggestions: suggestions.slice(0, 10), // Limit suggestions
    newCommandIdeas: newCommandIdeas.slice(0, 5), // Limit ideas
  };
}

/**
 * Generate command locally (fallback)
 */
function generateCommandLocally(description: string, context: ChannelContext): GeneratedCommand {
  const lowerDesc = description.toLowerCase();
  
  // Try to match common patterns
  let trigger = '';
  let response = '';
  let confidence = 0.5;

  if (lowerDesc.includes('salud') || lowerDesc.includes('hola') || lowerDesc.includes('bienven')) {
    trigger = 'hola';
    response = '¡Hola $(user)! Bienvenido al stream de $(channel) 👋';
    confidence = 0.8;
  } else if (lowerDesc.includes('redes') || lowerDesc.includes('social')) {
    trigger = 'redes';
    response = '🌐 Sígueme en mis redes sociales: [Agrega tus enlaces]';
    confidence = 0.7;
  } else if (lowerDesc.includes('juego') || lowerDesc.includes('game')) {
    trigger = 'juego';
    response = '🎮 Estamos jugando: $(game)';
    confidence = 0.9;
  } else if (lowerDesc.includes('tiempo') || lowerDesc.includes('uptime')) {
    trigger = 'uptime';
    response = '⏱️ El stream lleva activo: $(uptime)';
    confidence = 0.9;
  } else if (lowerDesc.includes('abrazo') || lowerDesc.includes('hug')) {
    trigger = 'abrazo';
    response = '🤗 $(user) le da un abrazo a $(touser) ❤️';
    confidence = 0.9;
  } else {
    // Generic fallback
    const words = description.split(' ').filter(w => w.length > 3);
    trigger = words[0]?.toLowerCase() || 'comando';
    response = description;
    confidence = 0.3;
  }

  // Check if trigger already exists
  if (context.existingCommands.includes(trigger)) {
    trigger = trigger + '2';
    confidence *= 0.8;
  }

  return {
    trigger,
    response,
    description,
    userLevel: 'everyone',
    cooldown: 5,
    confidence,
    alternatives: [
      { trigger: trigger + '_alt', response },
    ],
  };
}

/**
 * AI Command Service
 */
export class AICommandService {
  private apiKey: string | null = null;
  private provider: string = 'openai';

  /**
   * Configure the AI service
   */
  configure(apiKey: string, provider: string = 'openai'): void {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  /**
   * Check if AI is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate a command from natural language description
   */
  async generateCommand(description: string, context: ChannelContext): Promise<GeneratedCommand> {
    if (!checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait a moment.');
    }

    // If no API key, use local generation
    if (!this.apiKey) {
      return generateCommandLocally(description, context);
    }

    // TODO: Implement actual AI API call
    // For now, use local generation
    return generateCommandLocally(description, context);
  }

  /**
   * Analyze existing commands
   */
  async analyzeCommands(commands: ExportedCommand[]): Promise<CommandAnalysis> {
    if (!checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait a moment.');
    }

    // If no API key, use local analysis
    if (!this.apiKey) {
      return analyzeCommandsLocally(commands);
    }

    // TODO: Implement actual AI API call
    // For now, use local analysis
    return analyzeCommandsLocally(commands);
  }

  /**
   * Suggest improvements for a single command
   */
  async suggestImprovements(command: ExportedCommand): Promise<CommandSuggestion[]> {
    if (!checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait a moment.');
    }

    const suggestions: CommandSuggestion[] = [];

    // Check response length
    if (command.response.length > 300) {
      suggestions.push({
        type: 'optimize',
        target: command.name,
        suggestion: 'Considera acortar la respuesta para mejor legibilidad',
        reason: `La respuesta tiene ${command.response.length} caracteres`,
        priority: 'medium',
      });
    }

    // Check for variables
    if (!command.response.includes('$(')) {
      suggestions.push({
        type: 'add_variable',
        target: command.name,
        suggestion: 'Agregar $(user) para personalizar la respuesta',
        reason: 'Las respuestas personalizadas son más engaging',
        priority: 'low',
      });
    }

    // Check cooldown
    if (command.cooldown === 0) {
      suggestions.push({
        type: 'optimize',
        target: command.name,
        suggestion: 'Agregar un cooldown para evitar spam',
        reason: 'Sin cooldown, el comando puede ser abusado',
        priority: 'high',
      });
    }

    return suggestions;
  }
}

// Singleton instance
export const aiCommandService = new AICommandService();

export default aiCommandService;
