/**
 * OverlayURLService - Servicio para generar URLs de overlay para OBS Browser Source
 * 
 * Este servicio genera URLs que pueden ser usadas en OBS como Browser Source,
 * permitiendo mostrar overlays sin necesidad de configurar WebSocket.
 * 
 * SECURITY: URLs are generated with session IDs instead of tokens to prevent
 * credential exposure in OBS Browser Source URLs.
 * 
 * @requirements 4.1, 4.6
 */

import { getOverlaySessionService, type OverlayType as SessionOverlayType } from './OverlaySessionService';

export interface OverlayType {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultSize: { width: number; height: number };
  urlParam: string;
}

export interface OverlayOptions {
  theme?: 'light' | 'dark' | 'transparent';
  bg?: string;
  width?: number;
  height?: number;
  position?: 'top' | 'bottom' | 'center';
  channel?: string;
  sessionId?: string; // Optional session ID for secure overlay access
}

/**
 * Tipos de overlay disponibles
 */
export const OVERLAY_TYPES: OverlayType[] = [
  {
    id: 'poll',
    name: 'Encuestas',
    description: 'Muestra encuestas activas con votos en tiempo real',
    icon: '📊',
    defaultSize: { width: 800, height: 600 },
    urlParam: 'overlayPoll',
  },
  {
    id: 'countdown',
    name: 'Cuenta Regresiva',
    description: 'Timer con cuenta regresiva personalizable',
    icon: '⏱️',
    defaultSize: { width: 400, height: 300 },
    urlParam: 'overlayCountdown',
  },
  {
    id: 'spinner',
    name: 'Ruleta',
    description: 'Ruleta giratoria para sorteos',
    icon: '🎡',
    defaultSize: { width: 600, height: 600 },
    urlParam: 'overlaySpinner',
  },
  {
    id: 'giveaway',
    name: 'Sorteos',
    description: 'Muestra sorteos activos y ganadores',
    icon: '🎁',
    defaultSize: { width: 500, height: 400 },
    urlParam: 'overlayRandomWinner',
  },
  {
    id: 'judge',
    name: 'Panel de Jueces',
    description: 'Panel para votaciones de jueces',
    icon: '⚖️',
    defaultSize: { width: 800, height: 400 },
    urlParam: 'overlayJudgePanel',
  },
  {
    id: 'trivia',
    name: 'Trivia',
    description: 'Juego de preguntas y respuestas',
    icon: '🧠',
    defaultSize: { width: 800, height: 600 },
    urlParam: 'overlayTrivia',
  },
  {
    id: 'pium',
    name: 'Pium',
    description: 'Juego de disparos interactivo',
    icon: '🔫',
    defaultSize: { width: 800, height: 600 },
    urlParam: 'overlayPium',
  },
  {
    id: 'roulette',
    name: 'Ruleta Casino',
    description: 'Ruleta estilo casino',
    icon: '🎰',
    defaultSize: { width: 800, height: 600 },
    urlParam: 'overlayRoulette',
  },
  {
    id: 'fishing',
    name: 'Pesca',
    description: 'Juego de pesca interactivo',
    icon: '🎣',
    defaultSize: { width: 800, height: 600 },
    urlParam: 'overlayFishing',
  },
  {
    id: 'potato',
    name: 'Papa Caliente',
    description: 'Juego de papa caliente',
    icon: '🥔',
    defaultSize: { width: 600, height: 400 },
    urlParam: 'overlayPotato',
  },
  {
    id: 'battleship',
    name: 'Batalla Naval',
    description: 'Juego de batalla naval',
    icon: '🚢',
    defaultSize: { width: 800, height: 600 },
    urlParam: 'overlayBattleship',
  },
  {
    id: 'duckHunt',
    name: 'Caza de Patos',
    description: 'Juego de caza de patos',
    icon: '🦆',
    defaultSize: { width: 800, height: 600 },
    urlParam: 'overlayDuckHunt',
  },
  {
    id: 'veoVeo',
    name: 'Veo Veo',
    description: 'Juego de adivinanzas',
    icon: '👀',
    defaultSize: { width: 600, height: 400 },
    urlParam: 'overlayVeoVeo',
  },
  {
    id: 'ppt',
    name: 'Piedra Papel Tijera',
    description: 'Clásico juego de PPT',
    icon: '✊',
    defaultSize: { width: 600, height: 400 },
    urlParam: 'overlayPPT',
  },
  {
    id: 'ahorcado',
    name: 'Ahorcado',
    description: 'Juego del ahorcado',
    icon: '📝',
    defaultSize: { width: 600, height: 500 },
    urlParam: 'overlayAhorcado',
  },
  {
    id: 'carrera',
    name: 'Carrera de Emotes',
    description: 'Carrera con emotes del chat',
    icon: '🏁',
    defaultSize: { width: 800, height: 300 },
    urlParam: 'overlayCarrera',
  },
  {
    id: 'memoria',
    name: 'Memoria',
    description: 'Juego de memoria',
    icon: '🃏',
    defaultSize: { width: 600, height: 600 },
    urlParam: 'overlayMemoria',
  },
  {
    id: 'partyCo',
    name: 'Party & Co',
    description: 'Juego de fiesta',
    icon: '🎉',
    defaultSize: { width: 800, height: 600 },
    urlParam: 'overlayPartyCo',
  },
];

/**
 * Colores de fondo predefinidos para chroma key
 */
export const CHROMA_COLORS = {
  transparent: 'transparent',
  green: '#00FF00',
  magenta: '#FF00FF',
  blue: '#0000FF',
  black: '#000000',
};

/**
 * Genera una URL de overlay para usar en OBS Browser Source
 * 
 * SECURITY: If a sessionId is provided in options, it will be used instead of
 * generating overlay-specific parameters. This ensures tokens are never exposed in URLs.
 * 
 * @param typeId - The overlay type ID
 * @param options - Optional configuration including sessionId for secure access
 * @returns The complete overlay URL
 * 
 * @requirements 4.1, 4.6
 */
export function generateOverlayURL(typeId: string, options: OverlayOptions = {}): string {
  const overlayType = OVERLAY_TYPES.find(t => t.id === typeId);
  if (!overlayType) {
    throw new Error(`Unknown overlay type: ${typeId}`);
  }

  const baseURL = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams();
  
  // If sessionId is provided, use session-based URL (secure)
  if (options.sessionId) {
    params.set('sessionId', options.sessionId);
    params.set('overlayType', typeId);
  } else {
    // Legacy mode: use overlay-specific parameters
    params.set(overlayType.urlParam, 'true');
  }
  
  // Opciones adicionales (non-sensitive only)
  if (options.bg) {
    params.set('bg', options.bg);
  } else if (options.theme === 'transparent') {
    params.set('bg', 'transparent');
  } else if (options.theme === 'dark') {
    params.set('bg', 'black');
  }
  
  if (options.channel) {
    params.set('channel', options.channel);
  }
  
  return `${baseURL}/?${params.toString()}`;
}

/**
 * Generates a secure overlay URL with session ID
 * 
 * This is the recommended way to generate overlay URLs as it ensures
 * tokens and sensitive data are never exposed in the URL.
 * 
 * @param userId - The user ID creating the session
 * @param typeId - The overlay type ID
 * @param options - Optional configuration (theme, channel, etc.)
 * @returns Object with sessionId and the complete URL
 * 
 * @requirements 4.1, 4.6
 */
export function generateSecureOverlayURL(
  userId: string,
  typeId: string,
  options: Omit<OverlayOptions, 'sessionId'> = {}
): { sessionId: string; url: string } {
  const overlayType = OVERLAY_TYPES.find(t => t.id === typeId);
  if (!overlayType) {
    throw new Error(`Unknown overlay type: ${typeId}`);
  }

  // Map overlay type ID to session overlay type
  const sessionType = mapToSessionOverlayType(typeId);
  
  // Create session
  const sessionService = getOverlaySessionService();
  const sessionId = sessionService.createSession(userId, sessionType);
  
  // Generate URL with session ID
  const url = generateOverlayURL(typeId, { ...options, sessionId });
  
  return { sessionId, url };
}

/**
 * Maps overlay type ID to session overlay type
 */
function mapToSessionOverlayType(typeId: string): SessionOverlayType {
  // Map specific overlay types to session types
  const typeMap: Record<string, SessionOverlayType> = {
    'poll': 'poll',
    'countdown': 'timer',
    'spinner': 'poll',
    'giveaway': 'giveaway',
    'judge': 'poll',
    'trivia': 'game',
    'pium': 'game',
    'roulette': 'game',
    'fishing': 'game',
    'potato': 'game',
    'battleship': 'game',
    'duckHunt': 'game',
    'veoVeo': 'game',
    'ppt': 'game',
    'ahorcado': 'game',
    'carrera': 'game',
    'memoria': 'game',
    'partyCo': 'game',
  };
  
  return typeMap[typeId] || 'game';
}

/**
 * Obtiene el tipo de overlay por ID
 */
export function getOverlayType(typeId: string): OverlayType | undefined {
  return OVERLAY_TYPES.find(t => t.id === typeId);
}

/**
 * Obtiene todos los tipos de overlay agrupados por categoría
 */
export function getOverlaysByCategory(): Record<string, OverlayType[]> {
  return {
    'Dinámicas': OVERLAY_TYPES.filter(t => ['poll', 'countdown', 'spinner', 'giveaway', 'judge'].includes(t.id)),
    'Juegos': OVERLAY_TYPES.filter(t => !['poll', 'countdown', 'spinner', 'giveaway', 'judge'].includes(t.id)),
  };
}

/**
 * Valida si una URL es una URL de overlay válida
 */
export function isValidOverlayURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    return OVERLAY_TYPES.some(type => params.get(type.urlParam) === 'true');
  } catch {
    return false;
  }
}

/**
 * Extrae el tipo de overlay de una URL
 */
export function getOverlayTypeFromURL(url: string): OverlayType | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    for (const type of OVERLAY_TYPES) {
      if (params.get(type.urlParam) === 'true') {
        return type;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Singleton service
class OverlayURLService {
  private static instance: OverlayURLService;
  
  private constructor() {}
  
  static getInstance(): OverlayURLService {
    if (!OverlayURLService.instance) {
      OverlayURLService.instance = new OverlayURLService();
    }
    return OverlayURLService.instance;
  }
  
  getTypes(): OverlayType[] {
    return OVERLAY_TYPES;
  }
  
  getTypesByCategory(): Record<string, OverlayType[]> {
    return getOverlaysByCategory();
  }
  
  generateURL(typeId: string, options?: OverlayOptions): string {
    return generateOverlayURL(typeId, options);
  }
  
  generateSecureURL(userId: string, typeId: string, options?: Omit<OverlayOptions, 'sessionId'>): { sessionId: string; url: string } {
    return generateSecureOverlayURL(userId, typeId, options);
  }
  
  getType(typeId: string): OverlayType | undefined {
    return getOverlayType(typeId);
  }
  
  isValidURL(url: string): boolean {
    return isValidOverlayURL(url);
  }
  
  getTypeFromURL(url: string): OverlayType | null {
    return getOverlayTypeFromURL(url);
  }
}

export const overlayURLService = OverlayURLService.getInstance();
export default overlayURLService;
