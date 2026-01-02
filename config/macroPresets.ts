/**
 * Macro Presets Configuration
 * 
 * Pre-configured macros that users can quickly add.
 * Especially useful for moderators who can't access API features directly.
 * 
 * Presets use chat commands (/prediction, /poll, etc.) to work for moderators.
 */

import type { MacroFormData, TriggerType, ActionType } from '../types/macros';

// ============================================
// Types
// ============================================

export interface MacroPreset {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string;
  category: PresetCategory;
  /** Platforms where this preset works */
  platforms: ('twitch' | 'youtube' | 'kick')[];
  /** Whether this preset works for moderators (uses chat commands) */
  worksForModerators: boolean;
  /** The macro configuration */
  macro: MacroFormData;
}

export type PresetCategory = 
  | 'predictions'
  | 'polls'
  | 'moderation'
  | 'engagement'
  | 'announcements'
  | 'obs';

export interface PresetCategoryInfo {
  id: PresetCategory;
  name: string;
  icon: string;
  description: string;
}

// ============================================
// Categories
// ============================================

export const PRESET_CATEGORIES: PresetCategoryInfo[] = [
  {
    id: 'predictions',
    name: 'Predicciones',
    icon: 'TrendingUp',
    description: 'Crear y gestionar predicciones rápidamente',
  },
  {
    id: 'polls',
    name: 'Encuestas',
    icon: 'BarChart2',
    description: 'Encuestas rápidas para el chat',
  },
  {
    id: 'moderation',
    name: 'Moderación',
    icon: 'Shield',
    description: 'Acciones de moderación del chat',
  },
  {
    id: 'engagement',
    name: 'Engagement',
    icon: 'Heart',
    description: 'Interacción con la audiencia',
  },
  {
    id: 'announcements',
    name: 'Anuncios',
    icon: 'Megaphone',
    description: 'Mensajes y anuncios automáticos',
  },
  {
    id: 'obs',
    name: 'OBS',
    icon: 'Monitor',
    description: 'Control de escenas y fuentes',
  },
];

// ============================================
// Presets
// ============================================

export const MACRO_PRESETS: MacroPreset[] = [
  // ========== PREDICTIONS ==========
  {
    id: 'prediction-win-lose',
    name: 'Predicción: ¿Ganará?',
    description: 'Predicción rápida de victoria/derrota',
    icon: 'TrendingUp',
    color: '#00f0f0',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Predicción: ¿Ganará?',
      description: 'Crea una predicción de victoria/derrota',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/prediction ¿Ganará esta partida? | Sí | No',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'prediction-custom',
    name: 'Predicción personalizada',
    description: 'Plantilla para predicción con opciones personalizables',
    icon: 'TrendingUp',
    color: '#00f0f0',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Predicción personalizada',
      description: 'Edita el mensaje para personalizar la predicción',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/prediction Tu pregunta aquí | Opción 1 | Opción 2',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'prediction-level',
    name: 'Predicción: ¿Qué nivel?',
    description: 'Predicción de nivel alcanzado',
    icon: 'TrendingUp',
    color: '#00f0f0',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Predicción: ¿Qué nivel?',
      description: 'Predicción de nivel alcanzado',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/prediction ¿Qué nivel alcanzará? | Nivel 1-5 | Nivel 6-10 | Nivel 11+',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },

  // ========== POLLS ==========
  {
    id: 'poll-yes-no',
    name: 'Encuesta: Sí/No',
    description: 'Encuesta rápida de sí o no',
    icon: 'BarChart2',
    color: '#a970ff',
    category: 'polls',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Encuesta: Sí/No',
      description: 'Encuesta rápida de sí o no',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/poll ¿Qué opinas? | Sí | No',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'poll-game-choice',
    name: 'Encuesta: Elegir juego',
    description: 'Deja que el chat elija el próximo juego',
    icon: 'Gamepad2',
    color: '#a970ff',
    category: 'polls',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Encuesta: Elegir juego',
      description: 'El chat elige el próximo juego',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/poll ¿Qué juego jugamos? | Juego 1 | Juego 2 | Juego 3',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },

  // ========== MODERATION ==========
  {
    id: 'mod-slow-mode',
    name: 'Modo lento',
    description: 'Activa el modo lento en el chat',
    icon: 'Clock',
    color: '#10b981',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Modo lento',
      description: 'Activa modo lento de 30 segundos',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/slow 30',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-slow-off',
    name: 'Desactivar modo lento',
    description: 'Desactiva el modo lento',
    icon: 'Clock',
    color: '#10b981',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Desactivar modo lento',
      description: 'Desactiva el modo lento del chat',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/slowoff',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-subscribers-only',
    name: 'Solo suscriptores',
    description: 'Activa el modo solo suscriptores',
    icon: 'Star',
    color: '#fbbf24',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Solo suscriptores',
      description: 'Activa modo solo suscriptores',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/subscribers',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-subscribers-off',
    name: 'Desactivar solo subs',
    description: 'Desactiva el modo solo suscriptores',
    icon: 'Star',
    color: '#fbbf24',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Desactivar solo subs',
      description: 'Desactiva modo solo suscriptores',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/subscribersoff',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-emote-only',
    name: 'Solo emotes',
    description: 'Activa el modo solo emotes',
    icon: 'Smile',
    color: '#f472b6',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Solo emotes',
      description: 'Activa modo solo emotes',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/emoteonly',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-clear-chat',
    name: 'Limpiar chat',
    description: 'Limpia todos los mensajes del chat',
    icon: 'Trash2',
    color: '#ef4444',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Limpiar chat',
      description: 'Limpia todos los mensajes del chat',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/clear',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 10,
    },
  },

  // ========== ANNOUNCEMENTS ==========
  {
    id: 'announce-general',
    name: 'Anuncio general',
    description: 'Envía un anuncio destacado al chat',
    icon: 'Megaphone',
    color: '#8b5cf6',
    category: 'announcements',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Anuncio general',
      description: 'Envía un anuncio al chat',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/announce ¡Mensaje importante para el chat!',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'announce-social',
    name: 'Anuncio: Redes sociales',
    description: 'Recuerda seguir en redes sociales',
    icon: 'Share2',
    color: '#06b6d4',
    category: 'announcements',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Anuncio: Redes sociales',
      description: 'Recuerda las redes sociales',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/announce 📱 ¡Sígueme en redes! Twitter: @tu_usuario | Instagram: @tu_usuario | Discord: discord.gg/tu_server',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 300,
    },
  },
  {
    id: 'announce-follow',
    name: 'Anuncio: Seguir canal',
    description: 'Recuerda seguir el canal',
    icon: 'Heart',
    color: '#ef4444',
    category: 'announcements',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Anuncio: Seguir canal',
      description: 'Recuerda seguir el canal',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/announce 💜 ¡Si te está gustando el stream, no olvides darle al FOLLOW! Es gratis y me ayuda mucho 💜',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 600,
    },
  },

  // ========== ENGAGEMENT ==========
  {
    id: 'engagement-shoutout',
    name: 'Shoutout',
    description: 'Da un shoutout a otro streamer',
    icon: 'Megaphone',
    color: '#f97316',
    category: 'engagement',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Shoutout',
      description: 'Da un shoutout (edita el nombre)',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '/shoutout nombre_del_streamer',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 60,
    },
  },
  {
    id: 'engagement-raid-thanks',
    name: 'Agradecer raid',
    description: 'Mensaje de agradecimiento por raid',
    icon: 'Users',
    color: '#ec4899',
    category: 'engagement',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Agradecer raid',
      description: 'Agradece un raid entrante',
      enabled: true,
      trigger: {
        type: 'event',
        config: {
          eventType: 'raid',
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '🎉 ¡RAID! ¡Bienvenidos todos los que vienen de {username}! ¡Gracias por el raid! 💜',
            platform: 'twitch',
          },
          delay: 2,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'engagement-hydrate',
    name: 'Recordatorio: Hidratarse',
    description: 'Recuerda al chat beber agua',
    icon: 'Droplet',
    color: '#3b82f6',
    category: 'engagement',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Recordatorio: Hidratarse',
      description: 'Recuerda beber agua',
      enabled: true,
      trigger: {
        type: 'manual',
        config: {
          showInQuickActions: true,
        },
      },
      actions: [
        {
          id: 'action-1',
          type: 'send_chat_message',
          config: {
            message: '💧 ¡Hora de hidratarse! Recuerda beber agua y estirar un poco 💧',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 1800,
    },
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): MacroPreset[] {
  return MACRO_PRESETS.filter(p => p.category === category);
}

/**
 * Get presets that work for moderators
 */
export function getModeratorPresets(): MacroPreset[] {
  return MACRO_PRESETS.filter(p => p.worksForModerators);
}

/**
 * Get presets for a specific platform
 */
export function getPresetsForPlatform(platform: 'twitch' | 'youtube' | 'kick'): MacroPreset[] {
  return MACRO_PRESETS.filter(p => p.platforms.includes(platform));
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): MacroPreset | undefined {
  return MACRO_PRESETS.find(p => p.id === id);
}
