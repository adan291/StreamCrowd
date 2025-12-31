/**
 * Command Templates Configuration
 * 
 * Predefined command templates organized by category.
 * Users can quickly add these templates and customize the variables.
 */

import type { CommandTemplate, TemplateCategory } from '../types/commandEditor';

/**
 * Category metadata for display
 */
export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { name: string; icon: string; description: string }> = {
  info: { name: 'Información', icon: 'ℹ️', description: 'Comandos informativos del canal' },
  social: { name: 'Redes Sociales', icon: '🌐', description: 'Enlaces a redes sociales' },
  entertainment: { name: 'Entretenimiento', icon: '🎉', description: 'Comandos divertidos' },
  moderation: { name: 'Moderación', icon: '🛡️', description: 'Comandos de moderación' },
  utility: { name: 'Utilidades', icon: '🔧', description: 'Comandos útiles' },
  games: { name: 'Juegos', icon: '🎮', description: 'Comandos relacionados con juegos' },
};

/**
 * Predefined command templates
 */
export const COMMAND_TEMPLATES: CommandTemplate[] = [
  // ============================================
  // INFO CATEGORY
  // ============================================
  {
    id: 'info-schedule',
    name: 'Horario',
    description: 'Muestra el horario de streams',
    category: 'info',
    trigger: 'horario',
    response: '📅 Horario de streams: {SCHEDULE}',
    variables: [
      { key: 'SCHEDULE', label: 'Horario', placeholder: 'Lunes a Viernes 20:00', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 10,
    icon: '📅',
    popularity: 95,
  },
  {
    id: 'info-discord',
    name: 'Discord',
    description: 'Enlace al servidor de Discord',
    category: 'info',
    trigger: 'discord',
    response: '💬 ¡Únete a nuestro Discord! {DISCORD_LINK}',
    variables: [
      { key: 'DISCORD_LINK', label: 'Enlace de Discord', placeholder: 'https://discord.gg/...', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '💬',
    popularity: 90,
  },
  {
    id: 'info-commands',
    name: 'Lista de Comandos',
    description: 'Muestra dónde ver todos los comandos',
    category: 'info',
    trigger: 'comandos',
    response: '📋 Lista de comandos disponibles: {COMMANDS_URL}',
    variables: [
      { key: 'COMMANDS_URL', label: 'URL de comandos', placeholder: 'https://...', required: false, defaultValue: '¡Escribe !help para ver los comandos!' }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '📋',
    popularity: 85,
  },
  {
    id: 'info-donate',
    name: 'Donaciones',
    description: 'Enlace para donaciones',
    category: 'info',
    trigger: 'donar',
    response: '💝 ¡Apoya el stream! {DONATE_LINK}',
    variables: [
      { key: 'DONATE_LINK', label: 'Enlace de donación', placeholder: 'https://streamlabs.com/...', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 60,
    icon: '💝',
    popularity: 80,
  },
  {
    id: 'info-specs',
    name: 'Especificaciones PC',
    description: 'Muestra las specs del PC',
    category: 'info',
    trigger: 'pc',
    response: '🖥️ Mi setup: {PC_SPECS}',
    variables: [
      { key: 'PC_SPECS', label: 'Especificaciones', placeholder: 'RTX 4090, i9-13900K, 64GB RAM', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '🖥️',
    popularity: 70,
  },

  // ============================================
  // SOCIAL CATEGORY
  // ============================================
  {
    id: 'social-twitter',
    name: 'Twitter/X',
    description: 'Enlace a Twitter/X',
    category: 'social',
    trigger: 'twitter',
    response: '🐦 Sígueme en Twitter: twitter.com/{TWITTER_USER}',
    variables: [
      { key: 'TWITTER_USER', label: 'Usuario de Twitter', placeholder: 'tu_usuario', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '🐦',
    popularity: 95,
  },
  {
    id: 'social-instagram',
    name: 'Instagram',
    description: 'Enlace a Instagram',
    category: 'social',
    trigger: 'instagram',
    response: '📸 Sígueme en Instagram: instagram.com/{INSTAGRAM_USER}',
    variables: [
      { key: 'INSTAGRAM_USER', label: 'Usuario de Instagram', placeholder: 'tu_usuario', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '📸',
    popularity: 90,
  },
  {
    id: 'social-youtube',
    name: 'YouTube',
    description: 'Enlace a YouTube',
    category: 'social',
    trigger: 'youtube',
    response: '▶️ Suscríbete en YouTube: youtube.com/{YOUTUBE_CHANNEL}',
    variables: [
      { key: 'YOUTUBE_CHANNEL', label: 'Canal de YouTube', placeholder: '@tu_canal', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '▶️',
    popularity: 90,
  },
  {
    id: 'social-tiktok',
    name: 'TikTok',
    description: 'Enlace a TikTok',
    category: 'social',
    trigger: 'tiktok',
    response: '🎵 Sígueme en TikTok: tiktok.com/@{TIKTOK_USER}',
    variables: [
      { key: 'TIKTOK_USER', label: 'Usuario de TikTok', placeholder: 'tu_usuario', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '🎵',
    popularity: 85,
  },
  {
    id: 'social-kick',
    name: 'Kick',
    description: 'Enlace a Kick',
    category: 'social',
    trigger: 'kick',
    response: '💚 También estoy en Kick: kick.com/{KICK_USER}',
    variables: [
      { key: 'KICK_USER', label: 'Usuario de Kick', placeholder: 'tu_usuario', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '💚',
    popularity: 75,
  },

  // ============================================
  // ENTERTAINMENT CATEGORY
  // ============================================
  {
    id: 'entertainment-hug',
    name: 'Abrazo',
    description: 'Abraza a otro usuario',
    category: 'entertainment',
    trigger: 'abrazo',
    response: '🤗 $(user) le da un abrazo a $(touser) ❤️',
    variables: [],
    userLevel: 'everyone',
    cooldown: 5,
    icon: '🤗',
    popularity: 95,
  },
  {
    id: 'entertainment-dice',
    name: 'Dado',
    description: 'Tira un dado',
    category: 'entertainment',
    trigger: 'dado',
    response: '🎲 $(user) tiró el dado y sacó: $(random)',
    variables: [],
    userLevel: 'everyone',
    cooldown: 5,
    icon: '🎲',
    popularity: 90,
  },
  {
    id: 'entertainment-8ball',
    name: 'Bola 8',
    description: 'Respuesta mágica de la bola 8',
    category: 'entertainment',
    trigger: '8ball',
    response: '🎱 $(user) pregunta... La bola 8 dice: {RESPONSES}',
    variables: [
      { key: 'RESPONSES', label: 'Respuestas (separadas por |)', placeholder: 'Sí|No|Tal vez|Pregunta de nuevo', required: true, defaultValue: 'Sí definitivamente|No lo creo|Tal vez|Pregunta de nuevo|Sin duda|Es dudoso' }
    ],
    userLevel: 'everyone',
    cooldown: 5,
    icon: '🎱',
    popularity: 85,
  },
  {
    id: 'entertainment-love',
    name: 'Compatibilidad',
    description: 'Calcula compatibilidad amorosa',
    category: 'entertainment',
    trigger: 'love',
    response: '💕 Compatibilidad entre $(user) y $(touser): $(random)%',
    variables: [],
    userLevel: 'everyone',
    cooldown: 10,
    icon: '💕',
    popularity: 85,
  },
  {
    id: 'entertainment-slap',
    name: 'Cachetada',
    description: 'Dale una cachetada a alguien',
    category: 'entertainment',
    trigger: 'slap',
    response: '👋 $(user) le da una cachetada a $(touser)!',
    variables: [],
    userLevel: 'everyone',
    cooldown: 5,
    icon: '👋',
    popularity: 80,
  },
  {
    id: 'entertainment-rip',
    name: 'RIP',
    description: 'Descansa en paz',
    category: 'entertainment',
    trigger: 'rip',
    response: '⚰️ Descansa en paz $(touser)... F',
    variables: [],
    userLevel: 'everyone',
    cooldown: 10,
    icon: '⚰️',
    popularity: 75,
  },

  // ============================================
  // MODERATION CATEGORY
  // ============================================
  {
    id: 'moderation-rules',
    name: 'Reglas',
    description: 'Muestra las reglas del chat',
    category: 'moderation',
    trigger: 'reglas',
    response: '📜 Reglas del chat: {RULES}',
    variables: [
      { key: 'RULES', label: 'Reglas', placeholder: '1. Respeto 2. No spam 3. Diviértete', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '📜',
    popularity: 90,
  },
  {
    id: 'moderation-report',
    name: 'Reportar',
    description: 'Cómo reportar usuarios',
    category: 'moderation',
    trigger: 'reportar',
    response: '⚠️ Para reportar un usuario: {REPORT_INFO}',
    variables: [
      { key: 'REPORT_INFO', label: 'Info de reporte', placeholder: 'Usa /report o contacta a un mod', required: true, defaultValue: 'Contacta a un moderador por DM con evidencia' }
    ],
    userLevel: 'everyone',
    cooldown: 60,
    icon: '⚠️',
    popularity: 70,
  },
  {
    id: 'moderation-mods',
    name: 'Moderadores',
    description: 'Lista de moderadores',
    category: 'moderation',
    trigger: 'mods',
    response: '🛡️ Nuestros moderadores: {MOD_LIST}',
    variables: [
      { key: 'MOD_LIST', label: 'Lista de mods', placeholder: '@mod1, @mod2, @mod3', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 60,
    icon: '🛡️',
    popularity: 65,
  },

  // ============================================
  // UTILITY CATEGORY
  // ============================================
  {
    id: 'utility-uptime',
    name: 'Tiempo en vivo',
    description: 'Muestra cuánto tiempo lleva el stream',
    category: 'utility',
    trigger: 'uptime',
    response: '⏱️ El stream lleva activo: $(uptime)',
    variables: [],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '⏱️',
    popularity: 95,
  },
  {
    id: 'utility-game',
    name: 'Juego actual',
    description: 'Muestra el juego actual',
    category: 'utility',
    trigger: 'juego',
    response: '🎮 Jugando: $(game)',
    variables: [],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '🎮',
    popularity: 90,
  },
  {
    id: 'utility-title',
    name: 'Título',
    description: 'Muestra el título del stream',
    category: 'utility',
    trigger: 'titulo',
    response: '📺 $(title)',
    variables: [],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '📺',
    popularity: 85,
  },
  {
    id: 'utility-followers',
    name: 'Seguidores',
    description: 'Muestra el número de seguidores',
    category: 'utility',
    trigger: 'seguidores',
    response: '❤️ ¡Somos $(followers) seguidores!',
    variables: [],
    userLevel: 'everyone',
    cooldown: 60,
    icon: '❤️',
    popularity: 80,
  },
  {
    id: 'utility-viewers',
    name: 'Espectadores',
    description: 'Muestra los espectadores actuales',
    category: 'utility',
    trigger: 'viewers',
    response: '👀 Hay $(viewers) personas viendo ahora mismo',
    variables: [],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '👀',
    popularity: 75,
  },

  // ============================================
  // GAMES CATEGORY
  // ============================================
  {
    id: 'games-rank',
    name: 'Rango',
    description: 'Muestra tu rango en el juego',
    category: 'games',
    trigger: 'rank',
    response: '🏆 Mi rango actual: {RANK}',
    variables: [
      { key: 'RANK', label: 'Tu rango', placeholder: 'Diamante 2', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '🏆',
    popularity: 85,
  },
  {
    id: 'games-stats',
    name: 'Estadísticas',
    description: 'Enlace a estadísticas del juego',
    category: 'games',
    trigger: 'stats',
    response: '📊 Mis estadísticas: {STATS_URL}',
    variables: [
      { key: 'STATS_URL', label: 'URL de stats', placeholder: 'https://tracker.gg/...', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '📊',
    popularity: 80,
  },
  {
    id: 'games-build',
    name: 'Build',
    description: 'Muestra la build actual',
    category: 'games',
    trigger: 'build',
    response: '🔧 Build actual: {BUILD_INFO}',
    variables: [
      { key: 'BUILD_INFO', label: 'Info de build', placeholder: 'Runas, items, etc.', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '🔧',
    popularity: 75,
  },
  {
    id: 'games-sens',
    name: 'Sensibilidad',
    description: 'Muestra tu sensibilidad/config',
    category: 'games',
    trigger: 'sens',
    response: '🎯 Mi sensibilidad: {SENSITIVITY}',
    variables: [
      { key: 'SENSITIVITY', label: 'Sensibilidad', placeholder: '800 DPI, 0.5 in-game', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '🎯',
    popularity: 70,
  },
  {
    id: 'games-elo',
    name: 'ELO',
    description: 'Muestra tu ELO/MMR',
    category: 'games',
    trigger: 'elo',
    response: '📈 Mi ELO actual: {ELO}',
    variables: [
      { key: 'ELO', label: 'ELO/MMR', placeholder: '2500', required: true }
    ],
    userLevel: 'everyone',
    cooldown: 30,
    icon: '📈',
    popularity: 65,
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): CommandTemplate[] {
  return COMMAND_TEMPLATES
    .filter(t => t.category === category)
    .sort((a, b) => b.popularity - a.popularity);
}

/**
 * Get all categories with their templates
 */
export function getAllCategoriesWithTemplates(): Array<{
  category: TemplateCategory;
  meta: typeof TEMPLATE_CATEGORIES[TemplateCategory];
  templates: CommandTemplate[];
}> {
  return (Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[]).map(category => ({
    category,
    meta: TEMPLATE_CATEGORIES[category],
    templates: getTemplatesByCategory(category),
  }));
}

/**
 * Search templates by name or description
 */
export function searchTemplates(query: string): CommandTemplate[] {
  const lowerQuery = query.toLowerCase();
  return COMMAND_TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.trigger.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): CommandTemplate | undefined {
  return COMMAND_TEMPLATES.find(t => t.id === id);
}
