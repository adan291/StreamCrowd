/**
 * ChatMetrics Entity - Métricas y análisis del chat
 * 
 * Esta entidad modela las métricas de análisis del chat,
 * incluyendo sentimiento, actividad y engagement.
 */

/**
 * Niveles de actividad del chat
 */
export type ActivityLevel = 'dead' | 'low' | 'moderate' | 'high' | 'explosive';

/**
 * Sentimiento general del chat
 */
export type Sentiment = 'positive' | 'neutral' | 'negative';

/**
 * Estados de ánimo especiales detectados
 */
export type SpecialMood = 'love' | 'hype' | 'angry' | 'sad' | 'surprised' | null;

/**
 * Entrada de usuario con conteo
 */
export interface UserCount {
  username: string;
  count: number;
}

/**
 * Entrada de palabra con conteo
 */
export interface WordCount {
  word: string;
  count: number;
}

/**
 * Entrada de emote con conteo
 */
export interface EmoteCount {
  emote: string;
  count: number;
}

/**
 * Métricas completas del chat
 */
export interface ChatMetrics {
  /** Total de mensajes analizados */
  totalMessages: number;
  /** Usuarios únicos */
  uniqueUsers: number;
  /** Mensajes por minuto */
  messagesPerMinute: number;
  /** Promedio de palabras por mensaje */
  avgWordsPerMessage: number;
  /** Sentimiento general */
  sentiment: Sentiment;
  /** Puntuación de sentimiento (-1 a 1) */
  sentimentScore: number;
  /** Intensidad del sentimiento (0 a 1) */
  sentimentIntensity: number;
  /** Puntuación de engagement (0 a 100) */
  engagementScore: number;
  /** Nivel de actividad */
  activityLevel: ActivityLevel;
  /** Top usuarios por mensajes */
  topUsers: UserCount[];
  /** Top palabras */
  topWords: WordCount[];
  /** Top emotes */
  topEmotes: EmoteCount[];
  /** Si la actividad está creciendo */
  isGrowing: boolean;
  /** Pico de actividad (mensajes/min) */
  peakActivity: number;
  /** Tasa de crecimiento */
  growthRate: number;
  /** Estado de ánimo especial detectado */
  specialMood: SpecialMood;
  /** Velocidad del chat (mensajes/segundo) */
  chatVelocity: number;
  /** Retención de usuarios (0 a 1) */
  userRetention: number;
  /** Tasa de respuesta (0 a 1) */
  responseRate: number;
  /** Hora pico de actividad */
  peakHour: string | null;
  /** Idioma dominante */
  dominantLanguage: 'es' | 'en' | 'mixed';
  /** Puntuación de spam (0 a 1) */
  spamScore: number;
  /** Índice de diversidad (0 a 1) */
  diversityIndex: number;
}

/**
 * Métricas por defecto del chat
 */
export const DEFAULT_CHAT_METRICS: ChatMetrics = {
  totalMessages: 0,
  uniqueUsers: 0,
  messagesPerMinute: 0,
  avgWordsPerMessage: 0,
  sentiment: 'neutral',
  sentimentScore: 0,
  sentimentIntensity: 0,
  engagementScore: 0,
  activityLevel: 'dead',
  topUsers: [],
  topWords: [],
  topEmotes: [],
  isGrowing: false,
  peakActivity: 0,
  growthRate: 0,
  specialMood: null,
  chatVelocity: 0,
  userRetention: 0,
  responseRate: 0,
  peakHour: null,
  dominantLanguage: 'mixed',
  spamScore: 0,
  diversityIndex: 0,
};
