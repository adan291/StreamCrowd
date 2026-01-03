/**
 * Macro Presets Configuration
 * 
 * Pre-configured macros that users can quickly add.
 * 
 * IMPORTANT: Twitch chat commands (starting with /) do NOT work when sent via
 * TMI.js/IRC. They only work when typed directly in Twitch's web interface.
 * Therefore, presets only include:
 * - Regular chat messages (no / commands)
 * - API-based actions (predictions via Twitch API)
 * 
 * Features like /announce, /slow, /pin, /poll require Twitch HTTP API implementation
 * which is not yet available as macro actions.
 */

import type { MacroFormData } from '../types/macros';

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
  | 'moderation'
  | 'announcements'
  | 'engagement'
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
    description: 'Crear predicciones via API de Twitch',
  },
  {
    id: 'moderation',
    name: 'Moderación',
    icon: 'Shield',
    description: 'Control del chat (slow mode, emotes, etc.)',
  },
  {
    id: 'announcements',
    name: 'Anuncios',
    icon: 'Megaphone',
    description: 'Anuncios y shoutouts',
  },
  {
    id: 'engagement',
    name: 'Engagement',
    icon: 'Heart',
    description: 'Mensajes de interacción con la audiencia',
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
  // ========== PREDICTIONS (API) ==========
  // Predicciones usan la API de Twitch directamente
  // Los moderadores pueden crear predicciones pero no gestionarlas via API
  {
    id: 'prediction-api-win-lose',
    name: 'Predicción: ¿Ganará?',
    description: 'Crea predicción de victoria/derrota',
    icon: 'TrendingUp',
    color: '#00f0f0',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Predicción: ¿Ganará?',
      description: 'Crea una predicción de victoria/derrota via API',
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
          type: 'start_prediction',
          config: {
            title: '¿Ganará esta partida?',
            outcomes: ['Sí', 'No'],
            duration: 120,
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'prediction-api-custom',
    name: 'Predicción: Personalizada',
    description: 'Plantilla de predicción editable',
    icon: 'TrendingUp',
    color: '#00f0f0',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Predicción personalizada',
      description: 'Edita para personalizar la predicción',
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
          type: 'start_prediction',
          config: {
            title: 'Tu pregunta aquí',
            outcomes: ['Opción 1', 'Opción 2'],
            duration: 120,
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'prediction-api-team',
    name: 'Predicción: ¿Qué equipo?',
    description: 'Predicción para elegir entre equipos',
    icon: 'Users',
    color: '#a855f7',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Predicción: ¿Qué equipo?',
      description: 'El chat predice qué equipo ganará',
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
          type: 'start_prediction',
          config: {
            title: '¿Qué equipo ganará?',
            outcomes: ['Equipo Azul', 'Equipo Rojo'],
            duration: 180,
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'prediction-api-survive',
    name: 'Predicción: ¿Sobrevivirá?',
    description: 'Predicción de supervivencia',
    icon: 'Skull',
    color: '#ef4444',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Predicción: ¿Sobrevivirá?',
      description: 'El chat predice si sobrevivirá',
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
          type: 'start_prediction',
          config: {
            title: '¿Sobrevivirá?',
            outcomes: ['Sobrevive', 'Muere'],
            duration: 60,
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'prediction-api-clutch',
    name: 'Predicción: ¿Clutch?',
    description: 'Predicción para momentos clutch',
    icon: 'Flame',
    color: '#f97316',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Predicción: ¿Clutch?',
      description: 'El chat predice si hará el clutch',
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
          type: 'start_prediction',
          config: {
            title: '¿Hará el CLUTCH?',
            outcomes: ['¡CLUTCH!', 'No lo logra'],
            duration: 30,
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },

  // ========== MODERATION (Twitch API) ==========
  // Estos presets usan la API de Twitch para controlar el chat
  {
    id: 'mod-slow-mode-on',
    name: 'Activar modo lento',
    description: 'Activa el modo lento (30 segundos)',
    icon: 'Clock',
    color: '#10b981',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Activar modo lento',
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
          type: 'update_chat_settings',
          config: {
            slowMode: true,
            slowModeWaitTime: 30,
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-slow-mode-off',
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
          type: 'update_chat_settings',
          config: {
            slowMode: false,
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-emote-only-on',
    name: 'Activar solo emotes',
    description: 'Solo se pueden enviar emotes',
    icon: 'Smile',
    color: '#f472b6',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Activar solo emotes',
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
          type: 'update_chat_settings',
          config: {
            emoteMode: true,
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-emote-only-off',
    name: 'Desactivar solo emotes',
    description: 'Permite mensajes normales',
    icon: 'Smile',
    color: '#f472b6',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Desactivar solo emotes',
      description: 'Desactiva modo solo emotes',
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
          type: 'update_chat_settings',
          config: {
            emoteMode: false,
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-sub-only-on',
    name: 'Activar solo subs',
    description: 'Solo suscriptores pueden chatear',
    icon: 'Star',
    color: '#fbbf24',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Activar solo subs',
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
          type: 'update_chat_settings',
          config: {
            subscriberMode: true,
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-sub-only-off',
    name: 'Desactivar solo subs',
    description: 'Todos pueden chatear',
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
          type: 'update_chat_settings',
          config: {
            subscriberMode: false,
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-follower-only-on',
    name: 'Activar solo seguidores',
    description: 'Solo seguidores pueden chatear',
    icon: 'UserCheck',
    color: '#8b5cf6',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Activar solo seguidores',
      description: 'Activa modo solo seguidores (10 min)',
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
          type: 'update_chat_settings',
          config: {
            followerMode: true,
            followerModeDuration: 10,
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },
  {
    id: 'mod-follower-only-off',
    name: 'Desactivar solo seguidores',
    description: 'Todos pueden chatear',
    icon: 'UserCheck',
    color: '#8b5cf6',
    category: 'moderation',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Desactivar solo seguidores',
      description: 'Desactiva modo solo seguidores',
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
          type: 'update_chat_settings',
          config: {
            followerMode: false,
          },
          delay: 0,
        },
      ],
      cooldown: 5,
    },
  },

  // ========== ANNOUNCEMENTS (Twitch API) ==========
  {
    id: 'announce-general',
    name: 'Anuncio general',
    description: 'Envía un anuncio destacado al chat',
    icon: 'Megaphone',
    color: '#9146ff',
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
          type: 'send_announcement',
          config: {
            message: '¡Mensaje importante para el chat!',
            color: 'primary',
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
          type: 'send_announcement',
          config: {
            message: '📱 ¡Sígueme en redes! Twitter: @tu_usuario | Instagram: @tu_usuario | Discord: discord.gg/tu_server',
            color: 'blue',
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
          type: 'send_announcement',
          config: {
            message: '💜 ¡Si te está gustando el stream, no olvides darle al FOLLOW! Es gratis y me ayuda mucho 💜',
            color: 'purple',
          },
          delay: 0,
        },
      ],
      cooldown: 600,
    },
  },
  {
    id: 'shoutout',
    name: 'Shoutout',
    description: 'Da un shoutout a otro streamer',
    icon: 'Megaphone',
    color: '#f97316',
    category: 'announcements',
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
          type: 'send_shoutout',
          config: {
            targetUsername: 'nombre_del_streamer',
          },
          delay: 0,
        },
      ],
      cooldown: 120,
    },
  },
  {
    id: 'create-clip',
    name: 'Crear clip',
    description: 'Crea un clip del momento actual',
    icon: 'Film',
    color: '#ec4899',
    category: 'announcements',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Crear clip',
      description: 'Crea un clip del stream',
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
          type: 'create_clip',
          config: {
            hasDelay: false,
          },
          delay: 0,
        },
      ],
      cooldown: 60,
    },
  },
  {
    id: 'start-raid',
    name: 'Iniciar raid',
    description: 'Inicia un raid a otro canal (solo streamer)',
    icon: 'Zap',
    color: '#8b5cf6',
    category: 'announcements',
    platforms: ['twitch'],
    worksForModerators: false, // Solo el streamer puede hacer raids
    macro: {
      name: 'Iniciar raid',
      description: 'Inicia un raid (edita el nombre)',
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
          type: 'start_raid',
          config: {
            targetUsername: 'nombre_del_canal',
          },
          delay: 0,
        },
      ],
      cooldown: 300,
    },
  },

  // ========== ENGAGEMENT (Mensajes normales) ==========
  // Estos presets envían mensajes normales al chat (funcionan correctamente)
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
  {
    id: 'engagement-social',
    name: 'Redes sociales',
    description: 'Recuerda seguir en redes sociales',
    icon: 'Share2',
    color: '#06b6d4',
    category: 'engagement',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Redes sociales',
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
            message: '📱 ¡Sígueme en redes! Twitter: @tu_usuario | Instagram: @tu_usuario | Discord: discord.gg/tu_server',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 300,
    },
  },
  {
    id: 'engagement-follow',
    name: 'Seguir canal',
    description: 'Recuerda seguir el canal',
    icon: 'Heart',
    color: '#ef4444',
    category: 'engagement',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Seguir canal',
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
            message: '💜 ¡Si te está gustando el stream, no olvides darle al FOLLOW! Es gratis y me ayuda mucho 💜',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 600,
    },
  },
  {
    id: 'engagement-welcome',
    name: 'Bienvenida',
    description: 'Mensaje de bienvenida al stream',
    icon: 'Sparkles',
    color: '#fbbf24',
    category: 'engagement',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'Bienvenida',
      description: 'Da la bienvenida a nuevos viewers',
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
            message: '👋 ¡Bienvenidos al stream! Siéntanse como en casa y disfruten del contenido 🎮',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 300,
    },
  },
  {
    id: 'engagement-gg',
    name: 'GG / Bien jugado',
    description: 'Celebra una victoria o buen momento',
    icon: 'Trophy',
    color: '#10b981',
    category: 'engagement',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'GG',
      description: 'Celebra una victoria',
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
            message: '🏆 ¡GG! ¡Bien jugado! 🎉',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 30,
    },
  },
  {
    id: 'engagement-brb',
    name: 'BRB / Vuelvo enseguida',
    description: 'Avisa que vuelves pronto',
    icon: 'Clock',
    color: '#8b5cf6',
    category: 'engagement',
    platforms: ['twitch'],
    worksForModerators: true,
    macro: {
      name: 'BRB',
      description: 'Avisa que vuelves pronto',
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
            message: '⏰ ¡BRB! Vuelvo en un momento, no se vayan 👀',
            platform: 'twitch',
          },
          delay: 0,
        },
      ],
      cooldown: 60,
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
