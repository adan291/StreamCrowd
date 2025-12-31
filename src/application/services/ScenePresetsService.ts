/**
 * ScenePresetsService - Servicio para presets de escenas recomendadas
 * 
 * Define configuraciones recomendadas de escenas para diferentes tipos de stream,
 * incluyendo overlay URLs sugeridos para cada escena.
 * 
 * @requirements 5.1
 */

import { generateOverlayURL, type OverlayOptions } from './OverlayURLService';

export type StreamCategory = 'gaming' | 'chatting' | 'irl' | 'podcast' | 'creative';

export interface SuggestedSource {
  name: string;
  type: 'browser' | 'capture' | 'camera' | 'audio' | 'image' | 'text';
  description: string;
  overlayType?: string;
  overlayOptions?: OverlayOptions;
  settings?: {
    width?: number;
    height?: number;
    position?: string;
  };
}

export interface RecommendedScene {
  name: string;
  description: string;
  icon: string;
  suggestedSources: SuggestedSource[];
  tips?: string[];
}

export interface ScenePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: StreamCategory;
  recommendedScenes: RecommendedScene[];
  generalTips?: string[];
}

/**
 * Categorías de stream disponibles
 */
export const STREAM_CATEGORIES: { id: StreamCategory; name: string; icon: string; description: string }[] = [
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    description: 'Streams de videojuegos',
  },
  {
    id: 'chatting',
    name: 'Just Chatting',
    icon: '💬',
    description: 'Charlas con la audiencia',
  },
  {
    id: 'irl',
    name: 'IRL',
    icon: '📱',
    description: 'Streams en la vida real',
  },
  {
    id: 'podcast',
    name: 'Podcast',
    icon: '🎙️',
    description: 'Podcasts y entrevistas',
  },
  {
    id: 'creative',
    name: 'Creativo',
    icon: '🎨',
    description: 'Arte, música, desarrollo',
  },
];

/**
 * Presets de escenas por categoría
 * @requirements 5.1
 */
export const SCENE_PRESETS: ScenePreset[] = [
  // Gaming Preset
  {
    id: 'gaming',
    name: 'Gaming',
    description: 'Setup ideal para streams de videojuegos con overlays interactivos',
    icon: '🎮',
    category: 'gaming',
    recommendedScenes: [
      {
        name: 'Gameplay',
        description: 'Escena principal de juego',
        icon: '🎮',
        suggestedSources: [
          { name: 'Game Capture', type: 'capture', description: 'Captura del juego' },
          { name: 'Webcam', type: 'camera', description: 'Cámara en esquina' },
          { name: 'Chat Overlay', type: 'browser', description: 'Chat en pantalla', overlayType: 'poll', overlayOptions: { theme: 'transparent' } },
          { name: 'Alertas', type: 'browser', description: 'Alertas de subs/donaciones' },
        ],
        tips: ['Usa chroma key si tienes pantalla verde', 'Coloca la webcam en una esquina que no tape información importante'],
      },
      {
        name: 'Just Chatting',
        description: 'Para momentos de charla entre partidas',
        icon: '💬',
        suggestedSources: [
          { name: 'Webcam Full', type: 'camera', description: 'Cámara a pantalla completa o grande' },
          { name: 'Poll Overlay', type: 'browser', description: 'Encuestas interactivas', overlayType: 'poll', overlayOptions: { theme: 'transparent' } },
          { name: 'Background', type: 'image', description: 'Fondo personalizado' },
        ],
      },
      {
        name: 'BRB',
        description: 'Pantalla de espera',
        icon: '☕',
        suggestedSources: [
          { name: 'BRB Screen', type: 'image', description: 'Imagen de "Ya vuelvo"' },
          { name: 'Countdown', type: 'browser', description: 'Cuenta regresiva', overlayType: 'countdown', overlayOptions: { theme: 'transparent' } },
          { name: 'Music', type: 'audio', description: 'Música de espera' },
        ],
      },
      {
        name: 'Starting Soon',
        description: 'Pantalla de inicio',
        icon: '🔴',
        suggestedSources: [
          { name: 'Starting Screen', type: 'image', description: 'Imagen de inicio' },
          { name: 'Countdown', type: 'browser', description: 'Cuenta regresiva para inicio', overlayType: 'countdown' },
        ],
      },
    ],
    generalTips: [
      'Configura hotkeys para cambiar entre escenas rápidamente',
      'Usa transiciones suaves entre escenas',
      'Mantén la webcam consistente en todas las escenas de gameplay',
    ],
  },
  
  // Just Chatting Preset
  {
    id: 'chatting',
    name: 'Just Chatting',
    description: 'Configuración para streams de charla con interacción',
    icon: '💬',
    category: 'chatting',
    recommendedScenes: [
      {
        name: 'Main',
        description: 'Escena principal de charla',
        icon: '💬',
        suggestedSources: [
          { name: 'Webcam', type: 'camera', description: 'Cámara principal' },
          { name: 'Background', type: 'image', description: 'Fondo decorativo' },
          { name: 'Poll Overlay', type: 'browser', description: 'Encuestas', overlayType: 'poll' },
          { name: 'Chat Display', type: 'browser', description: 'Chat en pantalla' },
        ],
      },
      {
        name: 'Polls & Games',
        description: 'Para dinámicas interactivas',
        icon: '🎯',
        suggestedSources: [
          { name: 'Webcam', type: 'camera', description: 'Cámara' },
          { name: 'Game Overlay', type: 'browser', description: 'Juegos interactivos', overlayType: 'trivia' },
          { name: 'Spinner', type: 'browser', description: 'Ruleta de sorteos', overlayType: 'spinner' },
        ],
      },
      {
        name: 'Giveaway',
        description: 'Para sorteos',
        icon: '🎁',
        suggestedSources: [
          { name: 'Webcam', type: 'camera', description: 'Cámara' },
          { name: 'Giveaway Overlay', type: 'browser', description: 'Overlay de sorteo', overlayType: 'giveaway' },
          { name: 'Winner Display', type: 'browser', description: 'Mostrar ganador' },
        ],
      },
    ],
    generalTips: [
      'Mantén la cámara como elemento principal',
      'Usa overlays que no tapen tu cara',
      'Interactúa frecuentemente con las encuestas y juegos',
    ],
  },
  
  // IRL Preset
  {
    id: 'irl',
    name: 'IRL',
    description: 'Setup para streams en exteriores o eventos',
    icon: '📱',
    category: 'irl',
    recommendedScenes: [
      {
        name: 'Camera',
        description: 'Vista principal de cámara',
        icon: '📷',
        suggestedSources: [
          { name: 'Mobile Camera', type: 'camera', description: 'Cámara del móvil' },
          { name: 'Location Overlay', type: 'text', description: 'Ubicación actual' },
          { name: 'Alerts', type: 'browser', description: 'Alertas' },
        ],
      },
      {
        name: 'Map View',
        description: 'Mostrar ubicación en mapa',
        icon: '🗺️',
        suggestedSources: [
          { name: 'Camera Small', type: 'camera', description: 'Cámara en esquina' },
          { name: 'Map', type: 'browser', description: 'Mapa de ubicación' },
        ],
      },
      {
        name: 'Chat Focus',
        description: 'Para leer y responder chat',
        icon: '💬',
        suggestedSources: [
          { name: 'Camera', type: 'camera', description: 'Cámara' },
          { name: 'Chat Overlay', type: 'browser', description: 'Chat grande' },
        ],
      },
    ],
    generalTips: [
      'Asegura buena conexión de datos móviles',
      'Usa estabilizador de imagen',
      'Ten batería externa disponible',
    ],
  },
  
  // Podcast Preset
  {
    id: 'podcast',
    name: 'Podcast',
    description: 'Configuración para podcasts y entrevistas',
    icon: '🎙️',
    category: 'podcast',
    recommendedScenes: [
      {
        name: 'Solo',
        description: 'Una sola persona hablando',
        icon: '🎤',
        suggestedSources: [
          { name: 'Main Camera', type: 'camera', description: 'Cámara principal' },
          { name: 'Mic Overlay', type: 'image', description: 'Gráfico de micrófono' },
          { name: 'Topic Display', type: 'text', description: 'Tema actual' },
        ],
      },
      {
        name: 'Interview',
        description: 'Dos personas en pantalla',
        icon: '👥',
        suggestedSources: [
          { name: 'Host Camera', type: 'camera', description: 'Cámara del host' },
          { name: 'Guest Camera', type: 'browser', description: 'Cámara del invitado (Discord/Zoom)' },
          { name: 'Names Overlay', type: 'text', description: 'Nombres de participantes' },
        ],
      },
      {
        name: 'Multi-cam',
        description: 'Múltiples participantes',
        icon: '📹',
        suggestedSources: [
          { name: 'Camera Grid', type: 'browser', description: 'Grid de cámaras' },
          { name: 'Speaker Highlight', type: 'browser', description: 'Destacar quien habla' },
        ],
      },
    ],
    generalTips: [
      'Usa buena iluminación frontal',
      'Configura audio de alta calidad',
      'Muestra el tema actual en pantalla',
    ],
  },
  
  // Creative Preset
  {
    id: 'creative',
    name: 'Creativo',
    description: 'Para arte, música, programación y más',
    icon: '🎨',
    category: 'creative',
    recommendedScenes: [
      {
        name: 'Work View',
        description: 'Vista del trabajo/proyecto',
        icon: '💻',
        suggestedSources: [
          { name: 'Screen Capture', type: 'capture', description: 'Captura de pantalla/canvas' },
          { name: 'Webcam Small', type: 'camera', description: 'Cámara en esquina' },
          { name: 'Progress Bar', type: 'browser', description: 'Barra de progreso' },
        ],
      },
      {
        name: 'Hands View',
        description: 'Vista de manos/herramientas',
        icon: '✋',
        suggestedSources: [
          { name: 'Overhead Camera', type: 'camera', description: 'Cámara cenital' },
          { name: 'Face Camera', type: 'camera', description: 'Cámara de cara en esquina' },
        ],
      },
      {
        name: 'Review',
        description: 'Mostrar resultado final',
        icon: '🖼️',
        suggestedSources: [
          { name: 'Artwork Display', type: 'image', description: 'Mostrar obra' },
          { name: 'Webcam', type: 'camera', description: 'Reacción del artista' },
          { name: 'Poll', type: 'browser', description: 'Votación del chat', overlayType: 'poll' },
        ],
      },
    ],
    generalTips: [
      'Muestra tu proceso, no solo el resultado',
      'Explica lo que haces mientras trabajas',
      'Pide feedback del chat regularmente',
    ],
  },
];

/**
 * Obtiene un preset por ID
 */
export function getPresetById(id: string): ScenePreset | undefined {
  return SCENE_PRESETS.find(p => p.id === id);
}

/**
 * Obtiene presets por categoría
 */
export function getPresetsByCategory(category: StreamCategory): ScenePreset[] {
  return SCENE_PRESETS.filter(p => p.category === category);
}

/**
 * Genera la URL de overlay para una fuente sugerida
 */
export function generateSourceOverlayURL(source: SuggestedSource): string | null {
  if (!source.overlayType) return null;
  
  try {
    return generateOverlayURL(source.overlayType, source.overlayOptions);
  } catch {
    return null;
  }
}

/**
 * Obtiene todas las URLs de overlay para un preset
 */
export function getPresetOverlayURLs(preset: ScenePreset): { scene: string; source: string; url: string }[] {
  const urls: { scene: string; source: string; url: string }[] = [];
  
  for (const scene of preset.recommendedScenes) {
    for (const source of scene.suggestedSources) {
      const url = generateSourceOverlayURL(source);
      if (url) {
        urls.push({
          scene: scene.name,
          source: source.name,
          url,
        });
      }
    }
  }
  
  return urls;
}

// Singleton service
class ScenePresetsService {
  private static instance: ScenePresetsService;
  
  private constructor() {}
  
  static getInstance(): ScenePresetsService {
    if (!ScenePresetsService.instance) {
      ScenePresetsService.instance = new ScenePresetsService();
    }
    return ScenePresetsService.instance;
  }
  
  getCategories() {
    return STREAM_CATEGORIES;
  }
  
  getAllPresets(): ScenePreset[] {
    return SCENE_PRESETS;
  }
  
  getPreset(id: string): ScenePreset | undefined {
    return getPresetById(id);
  }
  
  getPresetsByCategory(category: StreamCategory): ScenePreset[] {
    return getPresetsByCategory(category);
  }
  
  generateOverlayURL(source: SuggestedSource): string | null {
    return generateSourceOverlayURL(source);
  }
  
  getOverlayURLs(preset: ScenePreset): { scene: string; source: string; url: string }[] {
    return getPresetOverlayURLs(preset);
  }
}

export const scenePresetsService = ScenePresetsService.getInstance();
export default scenePresetsService;
