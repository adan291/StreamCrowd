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
  // Predicciones usan la API de Twitch directamente (requiere auth de streamer)
  {
    id: 'prediction-api-win-lose',
    name: 'Predicción: ¿Ganará?',
    description: 'Crea predicción de victoria/derrota (requiere auth de streamer)',
    icon: 'TrendingUp',
    color: '#00f0f0',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: false,
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
    description: 'Plantilla de predicción editable (requiere auth de streamer)',
    icon: 'TrendingUp',
    color: '#00f0f0',
    category: 'predictions',
    platforms: ['twitch'],
    worksForModerators: false,
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
