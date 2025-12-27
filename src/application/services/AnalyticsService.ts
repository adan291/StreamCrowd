/**
 * AnalyticsService - Servicio de análisis de chat y métricas
 * 
 * Este servicio implementa el análisis de chat, detección de sentimiento,
 * generación de word clouds y análisis con IA.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.8
 */

import type { 
  ChatMetrics, 
  ActivityLevel, 
  Sentiment, 
  SpecialMood,
  UserCount,
  WordCount,
  EmoteCount
} from '../../domain/entities/ChatMetrics';
import { DEFAULT_CHAT_METRICS } from '../../domain/entities/ChatMetrics';
import type { AIProvider, AIProviderConfig } from '../../domain/ports/IAnalyticsProvider';

// ============ TYPES ============

/**
 * Mensaje almacenado para análisis
 */
export interface StoredMessage {
  username: string;
  message: string;
  timestamp: number;
  userId?: string;
}

/**
 * Sesión de analytics (chat analysis)
 */
export interface AnalyticsSession {
  id: string;
  channelName: string;
  startTime: number;
  endTime?: number;
  messages: StoredMessage[];
  metrics?: ChatMetrics;
}

/**
 * Configuración extendida de IA con múltiples proveedores
 */
export interface AIConfig {
  providers: {
    gemini: { apiKey: string; enabled: boolean };
    openai: { apiKey: string; enabled: boolean };
    anthropic: { apiKey: string; enabled: boolean };
  };
  analyticsProvider: AIProvider;
  gamesProvider: AIProvider;
}

/**
 * Configuración legacy de IA (formato anterior)
 * Se usa para migración de datos existentes
 */
export interface LegacyAIConfig {
  provider: AIProvider;
  apiKey: string;
  enabled: boolean;
}

// ============ CONSTANTS ============

const STORAGE_KEY = 'twitch_ai_config_v2';
const LEGACY_STORAGE_KEY = 'twitch_ai_config';
const SESSIONS_KEY = 'twitch_stream_sessions';
const ENCRYPTION_KEY = 'TwitchVoteLive2024';

// ============ PATTERNS ============

// Expanded sentiment patterns (Spanish + English + Emotes)
const POSITIVE_PATTERNS = [
  /\b(pog|poggers|pogchamp|hype|gg|nice|amazing|love|great|awesome|lol|lmao|goat|based|w\b|dub|lets\s*go|fire|sick|insane|clutch|clean|ez|ggwp|godlike|legendary)\b/gi,
  /\b(genial|increíble|vamos|bien|bueno|excelente|crack|goat|jaja|xd|ole|bravo|grande|máquina|bestia|capo|ídolo|fenómeno|brutal|épico)\b/gi,
  /(❤️|💜|💕|🎉|👏|🔥|💪|🙌|😍|🥳|✨|⭐|💯|👍|😂|🤣|😊|😄|💖|🫶)+/g,
  /\b(Kappa|PogChamp|LUL|KEKW|OMEGALUL|4Head|EZ|Kreygasm|HeyGuys|VoHiYo|POGGERS|widepeepoHappy|peepoHappy|Clap|catJAM|pepeD|HYPERS)\b/gi,
];

const NEGATIVE_PATTERNS = [
  /\b(bad|terrible|hate|worst|boring|sad|rip|fail|trash|cringe|L\b|ratio|dead|mid|cope|mald|malding|pepega|braindead|throw|choke)\b/gi,
  /\b(basura|aburrido|malo|horrible|fatal|asco|mierda|pésimo|nefasto|desastre|vergüenza|patético)\b/gi,
  /(😢|😭|💔|👎|😡|🤬|😤|😠|💀|☠️|🗑️|😴|😒|🙄)+/g,
  /\b(BibleThump|PepeHands|Sadge|peepoSad|FeelsBadMan|NotLikeThis|ResidentSleeper|DansGame|WutFace|cmonBruh|haHAA|WeirdChamp|COPIUM)\b/gi,
];

const EXCITEMENT_PATTERNS = [
  /[A-Z]{4,}/g,
  /!{2,}/g,
  /\?{2,}/g,
  /(.)\1{3,}/g,
  /\b(omg|wtf|wow|insane|crazy|loco|dios|madre|hostia)\b/gi,
];

const SPECIAL_MOOD_PATTERNS: Record<Exclude<SpecialMood, null>, RegExp> = {
  love: /❤️|💜|💕|💖|love|te\s*amo|<3|amor|te\s*quiero|🫶|😍|💗/gi,
  hype: /🔥|HYPE|LET'S\s*GO|VAMOS|POG|INSANE|CRAZY|OMG|WOW|😱|🤯|🚀/gi,
  angry: /😡|🤬|angry|mad|furioso|enojado|hate|odio|rage|mald/gi,
  sad: /😢|😭|💔|sad|triste|rip|F\b|press\s*f|sadge|peeposad/gi,
  surprised: /😱|🤯|wtf|omg|no\s*way|que|increíble|what|wow|holy/gi,
};

// Common stop words to filter from word cloud
const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'en', 'que', 'es', 'y', 'a', 'por', 'con', 'para', 'no', 'se', 'si', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'ha', 'me', 'del', 'son', 'muy', 'sin', 'sobre', 'ser', 'tiene', 'también', 'fue', 'hay', 'está', 'cuando', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also'
]);

// ============ HELPER FUNCTIONS ============

const encryptKey = (text: string): string => {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
};

const decryptKey = (encoded: string): string => {
  if (!encoded) return '';
  try {
    const text = atob(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return encoded;
  }
};

const getEnvApiKey = (provider: AIProvider): string | null => {
  if (typeof window === 'undefined') return null;
  switch (provider) {
    case 'gemini': return (import.meta as any).env?.VITE_GEMINI_API_KEY || null;
    case 'openai': return (import.meta as any).env?.VITE_OPENAI_API_KEY || null;
    case 'anthropic': return (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || null;
    default: return null;
  }
};

const getDefaultAIConfig = (): AIConfig => ({
  providers: {
    gemini: { apiKey: '', enabled: false },
    openai: { apiKey: '', enabled: false },
    anthropic: { apiKey: '', enabled: false },
  },
  analyticsProvider: 'gemini',
  gamesProvider: 'gemini',
});



// ============ ANALYTICS SERVICE CLASS ============

/**
 * Servicio de análisis de chat
 * 
 * Proporciona análisis de sentimiento, métricas de engagement,
 * word clouds y análisis con IA.
 */
export class AnalyticsService {
  private aiConfig: AIProviderConfig | null = null;
  private fullAIConfig: AIConfig | null = null;
  private currentSession: AnalyticsSession | null = null;

  constructor() {
    this.loadAIConfigFromStorage();
  }

  // ============ AI CONFIGURATION ============

  /**
   * Establece la configuración del proveedor de IA
   * @param config - Configuración del proveedor
   */
  setAIConfig(config: AIProviderConfig): void {
    this.aiConfig = config;
    
    // Update full config
    if (!this.fullAIConfig) {
      this.fullAIConfig = getDefaultAIConfig();
    }
    this.fullAIConfig.providers[config.provider] = {
      apiKey: config.apiKey,
      enabled: true,
    };
    this.fullAIConfig.analyticsProvider = config.provider;
    
    this.saveAIConfigToStorage();
  }

  /**
   * Obtiene la configuración actual del proveedor de IA
   * @returns Configuración del proveedor o null
   */
  getAIConfig(): AIProviderConfig | null {
    return this.aiConfig;
  }

  /**
   * Obtiene la configuración completa de IA
   * @returns Configuración completa de IA
   */
  getFullAIConfig(): AIConfig {
    return this.fullAIConfig || getDefaultAIConfig();
  }

  /**
   * Establece la configuración completa de IA
   * @param config - Configuración completa
   */
  setFullAIConfig(config: AIConfig): void {
    this.fullAIConfig = config;
    
    // Update simple config from active provider
    const activeProvider = config.analyticsProvider;
    const providerConfig = config.providers[activeProvider];
    if (providerConfig.apiKey) {
      this.aiConfig = {
        provider: activeProvider,
        apiKey: providerConfig.apiKey,
      };
    }
    
    this.saveAIConfigToStorage();
  }

  /**
   * Verifica si hay un proveedor de IA configurado
   * @returns true si hay una API key configurada
   */
  isAIConfigured(): boolean {
    if (this.aiConfig?.apiKey) return true;
    
    // Check full config
    if (this.fullAIConfig) {
      return Object.values(this.fullAIConfig.providers).some(p => p.apiKey && p.enabled);
    }
    
    return false;
  }

  /**
   * Limpia la configuración de IA (ambos formatos: nuevo y legacy)
   */
  clearAIConfig(): void {
    if (typeof localStorage === 'undefined') return;
    
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    this.aiConfig = null;
    this.fullAIConfig = null;
  }

  // ============ SESSION MANAGEMENT ============

  /**
   * Inicia una nueva sesión de stream
   * @param channelName - Nombre del canal
   * @returns La sesión creada
   */
  startSession(channelName: string): AnalyticsSession {
    this.currentSession = {
      id: `session_${Date.now()}`,
      channelName,
      startTime: Date.now(),
      messages: [],
    };
    return this.currentSession;
  }

  /**
   * Finaliza la sesión actual
   * @returns La sesión finalizada o null
   */
  endSession(): AnalyticsSession | null {
    if (!this.currentSession) return null;
    
    this.currentSession.endTime = Date.now();
    
    // Calculate final metrics
    if (this.currentSession.messages.length > 0) {
      this.currentSession.metrics = this.analyzeChat(this.currentSession.messages);
    }
    
    // Save session
    this.saveSessionToStorage(this.currentSession);
    
    const session = this.currentSession;
    this.currentSession = null;
    return session;
  }

  /**
   * Obtiene la sesión actual
   * @returns La sesión actual o null
   */
  getCurrentSession(): AnalyticsSession | null {
    return this.currentSession;
  }

  /**
   * Añade un mensaje a la sesión actual
   * @param message - Mensaje a añadir
   */
  addMessage(message: StoredMessage): void {
    if (this.currentSession) {
      this.currentSession.messages.push(message);
    }
  }

  // ============ CHAT ANALYSIS ============

  /**
   * Analiza un conjunto de mensajes de chat
   * @param messages - Mensajes a analizar
   * @param sessionStartTime - Tiempo de inicio de la sesión (opcional)
   * @returns Métricas del chat
   */
  analyzeChat(messages: StoredMessage[], sessionStartTime?: number): ChatMetrics {
    if (messages.length === 0) {
      return { ...DEFAULT_CHAT_METRICS };
    }

    const now = Date.now();
    const startTime = sessionStartTime || messages[0]?.timestamp || now - 300000;
    const durationMinutes = Math.max(1, (now - startTime) / 60000);

    // Basic counts
    const userCounts = new Map<string, number>();
    const wordCounts = new Map<string, number>();
    
    let positiveScore = 0;
    let negativeScore = 0;
    let excitementScore = 0;
    let totalWords = 0;

    // Process each message
    messages.forEach(msg => {
      const text = msg.message;
      const username = msg.username.toLowerCase();
      
      userCounts.set(username, (userCounts.get(username) || 0) + 1);
      
      const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      totalWords += words.length;
      
      words.forEach(word => {
        if (word.startsWith('http') || word.startsWith('@') || word.startsWith('!') || word.startsWith('+')) return;
        if (STOP_WORDS.has(word)) return;
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
      
      // Sentiment scoring
      POSITIVE_PATTERNS.forEach(p => {
        const matches = text.match(p);
        if (matches) positiveScore += matches.length;
      });
      
      NEGATIVE_PATTERNS.forEach(p => {
        const matches = text.match(p);
        if (matches) negativeScore += matches.length;
      });
      
      EXCITEMENT_PATTERNS.forEach(p => {
        const matches = text.match(p);
        if (matches) excitementScore += matches.length;
      });
    });

    // Calculate metrics
    const totalMessages = messages.length;
    const uniqueUsers = userCounts.size;
    const messagesPerMinute = totalMessages / durationMinutes;
    const avgWordsPerMessage = totalWords / Math.max(1, totalMessages);

    // Sentiment calculation
    const sentimentRaw = positiveScore - negativeScore;
    const sentimentDivisor = Math.max(1, positiveScore + negativeScore);
    const sentimentScore = Math.max(-1, Math.min(1, sentimentRaw / sentimentDivisor));
    
    const sentiment = this.detectSentiment(messages);
    const sentimentIntensity = this.calculateSentimentIntensity(positiveScore, negativeScore, excitementScore, totalMessages, messagesPerMinute);
    const engagementScore = this.calculateEngagement(messages);
    const activityLevel = this.calculateActivityLevel(messagesPerMinute);

    // Top users
    const topUsers: UserCount[] = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([username, count]) => ({ username, count }));

    // Top words (word cloud)
    const topWords: WordCount[] = this.generateWordCloud(messages);

    // Top emotes
    const topEmotes: EmoteCount[] = this.generateTopEmotes(messages);

    // Special mood detection
    const specialMood = this.detectSpecialMood(messages.slice(-30));

    // Trend detection
    const midpoint = Math.floor(messages.length / 2);
    const firstHalf = messages.slice(0, midpoint);
    const secondHalf = messages.slice(midpoint);
    const isGrowing = secondHalf.length > firstHalf.length * 1.2;
    const growthRate = firstHalf.length > 0 
      ? Math.round(((secondHalf.length - firstHalf.length) / firstHalf.length) * 100)
      : 0;

    // Advanced metrics
    const chatVelocity = this.calculateChatVelocity(messages, now);
    const userRetention = this.calculateUserRetention(userCounts, uniqueUsers);
    const responseRate = this.calculateResponseRate(totalMessages, uniqueUsers);
    const peakHour = this.calculatePeakHour(messages);
    const dominantLanguage = this.detectDominantLanguage(messages);
    const spamScore = this.calculateSpamScore(messages, topUsers, totalMessages);
    const diversityIndex = totalWords > 0 ? Math.round((wordCounts.size / totalWords) * 100) / 100 : 0;

    return {
      totalMessages,
      uniqueUsers,
      messagesPerMinute: Math.round(messagesPerMinute * 10) / 10,
      avgWordsPerMessage: Math.round(avgWordsPerMessage * 10) / 10,
      sentiment,
      sentimentScore: Math.round(sentimentScore * 100) / 100,
      sentimentIntensity,
      engagementScore,
      activityLevel,
      topUsers,
      topWords,
      topEmotes,
      isGrowing,
      peakActivity: messagesPerMinute,
      growthRate,
      specialMood,
      chatVelocity,
      userRetention,
      responseRate,
      peakHour,
      dominantLanguage,
      spamScore,
      diversityIndex,
    };
  }


  // ============ SENTIMENT DETECTION ============

  /**
   * Detecta el sentimiento general de los mensajes
   * @param messages - Mensajes a analizar
   * @returns Sentimiento detectado
   */
  detectSentiment(messages: StoredMessage[]): Sentiment {
    if (messages.length === 0) return 'neutral';

    let positiveScore = 0;
    let negativeScore = 0;

    messages.forEach(msg => {
      const text = msg.message;
      
      POSITIVE_PATTERNS.forEach(p => {
        const matches = text.match(p);
        if (matches) positiveScore += matches.length;
      });
      
      NEGATIVE_PATTERNS.forEach(p => {
        const matches = text.match(p);
        if (matches) negativeScore += matches.length;
      });
    });

    if (positiveScore > negativeScore * 1.2) return 'positive';
    if (negativeScore > positiveScore * 1.2) return 'negative';
    return 'neutral';
  }

  /**
   * Detecta estados de ánimo especiales en los mensajes recientes
   * @param messages - Mensajes recientes a analizar
   * @returns Estado de ánimo especial o null
   */
  detectSpecialMood(messages: { message: string }[]): SpecialMood {
    if (messages.length < 5) return null;
    
    const allText = messages.map(m => m.message).join(' ');
    
    const moodScores: Record<string, number> = {
      love: 0,
      hype: 0,
      angry: 0,
      sad: 0,
      surprised: 0,
    };
    
    (Object.entries(SPECIAL_MOOD_PATTERNS) as [Exclude<SpecialMood, null>, RegExp][]).forEach(([mood, pattern]) => {
      const matches = allText.match(pattern);
      if (matches) moodScores[mood] = matches.length;
    });
    
    // Find dominant mood (needs at least 3 matches)
    const maxMood = Object.entries(moodScores).reduce((a, b) => a[1] > b[1] ? a : b);
    if (maxMood[1] >= 3) {
      return maxMood[0] as SpecialMood;
    }
    
    return null;
  }

  // ============ WORD CLOUD & EMOTES ============

  /**
   * Genera un word cloud de los mensajes
   * @param messages - Mensajes a analizar
   * @param limit - Número máximo de palabras a retornar (default: 20)
   * @returns Array de palabras con conteo, ordenadas por frecuencia descendente
   * @requirements 3.4
   */
  generateWordCloud(messages: StoredMessage[], limit: number = 20): WordCount[] {
    if (messages.length === 0) return [];
    
    const wordCounts = new Map<string, number>();

    messages.forEach(msg => {
      const words = msg.message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      words.forEach(word => {
        // Skip URLs, mentions, commands, and special prefixes
        if (word.startsWith('http') || word.startsWith('@') || word.startsWith('!') || word.startsWith('+')) return;
        // Skip stop words
        if (STOP_WORDS.has(word)) return;
        // Skip pure numbers
        if (/^\d+$/.test(word)) return;
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));
  }

  /**
   * Genera la lista de top emotes de los mensajes
   * @param messages - Mensajes a analizar
   * @param limit - Número máximo de emotes a retornar (default: 10)
   * @returns Array de emotes con conteo, ordenados por frecuencia descendente
   * @requirements 3.4
   */
  generateTopEmotes(messages: StoredMessage[], limit: number = 10): EmoteCount[] {
    if (messages.length === 0) return [];
    
    const emoteCounts = new Map<string, number>();
    
    // Pattern for Twitch emotes (CamelCase, ALLCAPS with lowercase, pepe variants, etc.)
    const emotePattern = /\b([A-Z][a-z]+[A-Z][a-zA-Z]*|[A-Z]{2,}[a-z]+|pepe\w+|Pog\w*|KEKW|LUL|OMEGALUL|Kappa|PogChamp|HYPERS|Sadge|catJAM|pepeD|widepeepoHappy|peepoHappy|Clap|BibleThump|PepeHands|FeelsBadMan|NotLikeThis|ResidentSleeper|DansGame|WutFace|WeirdChamp|COPIUM|monkaS|monkaW|LULW|KEKL|EZ|4Head|Kreygasm|HeyGuys|VoHiYo)\b/g;
    
    messages.forEach(msg => {
      const emotes = msg.message.match(emotePattern);
      if (emotes) {
        emotes.forEach(emote => {
          emoteCounts.set(emote, (emoteCounts.get(emote) || 0) + 1);
        });
      }
    });

    return Array.from(emoteCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([emote, count]) => ({ emote, count }));
  }

  /**
   * Calcula el engagement score
   * @param messages - Mensajes a analizar
   * @returns Score de engagement (0-100)
   * @requirements 3.4
   * 
   * El engagement se calcula basándose en:
   * - Participación promedio por usuario (avgMsgsPerUser * 15)
   * - Diversidad de usuarios (uniqueUsers * 2)
   * - Nivel de emoción/excitación (excitementScore * 3)
   * - Factor de actividad (activityFactor * 20)
   */
  calculateEngagement(messages: StoredMessage[]): number {
    if (messages.length === 0) return 0;

    const userCounts = new Map<string, number>();
    let excitementScore = 0;

    messages.forEach(msg => {
      const username = msg.username.toLowerCase();
      userCounts.set(username, (userCounts.get(username) || 0) + 1);
      
      EXCITEMENT_PATTERNS.forEach(p => {
        const matches = msg.message.match(p);
        if (matches) excitementScore += matches.length;
      });
    });

    const uniqueUsers = userCounts.size;
    const avgMsgsPerUser = messages.length / Math.max(1, uniqueUsers);
    
    const now = Date.now();
    const startTime = messages[0]?.timestamp || now - 300000;
    const durationMinutes = Math.max(1, (now - startTime) / 60000);
    const messagesPerMinute = messages.length / durationMinutes;
    const activityFactor = Math.min(1, messagesPerMinute / 10);

    return Math.min(100, Math.round(
      (avgMsgsPerUser * 15) +
      (uniqueUsers * 2) +
      (excitementScore * 3) +
      (activityFactor * 20)
    ));
  }

  // ============ AI ANALYSIS ============

  /**
   * Analiza mensajes usando IA
   * @param messages - Mensajes a analizar
   * @returns Métricas del chat (con fallback a análisis local)
   */
  async analyzeWithAI(messages: StoredMessage[]): Promise<ChatMetrics> {
    if (!this.isAIConfigured()) {
      return this.analyzeChat(messages);
    }

    const config = this.fullAIConfig || getDefaultAIConfig();
    const providerInfo = this.getProviderForFunction(config, 'analytics');
    
    if (!providerInfo) {
      return this.analyzeChat(messages);
    }

    const { provider, apiKey } = providerInfo;

    // Prepare chat summary for AI
    const chatSummary = messages
      .slice(-500)
      .map(m => `${m.username}: ${m.message}`)
      .join('\n');

    const prompt = `Analiza este chat de Twitch y proporciona insights en formato JSON:

Chat:
${chatSummary}

Responde SOLO con un JSON válido con esta estructura:
{
  "sentiment": "positive" | "neutral" | "negative",
  "topics": ["tema1", "tema2", "tema3"],
  "engagement": número del 0 al 100,
  "highlights": ["momento destacado 1", "momento destacado 2"],
  "recommendations": ["sugerencia para mejorar engagement"]
}`;

    try {
      if (provider === 'gemini') {
        return await this.analyzeWithGemini(messages, apiKey, prompt);
      } else if (provider === 'openai') {
        return await this.analyzeWithOpenAI(messages, apiKey, prompt);
      } else if (provider === 'anthropic') {
        return await this.analyzeWithAnthropic(messages, apiKey, prompt);
      }
      
      return this.analyzeChat(messages);
    } catch (error) {
      console.error('AI analysis error:', error);
      return this.analyzeChat(messages);
    }
  }

  private async analyzeWithGemini(messages: StoredMessage[], apiKey: string, prompt: string): Promise<ChatMetrics> {
    const savedModel = typeof localStorage !== 'undefined' 
      ? localStorage.getItem('gemini_working_model') 
      : null;
    const modelToUse = savedModel || 'gemini-2.0-flash-exp';
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!response.ok) return this.analyzeChat(messages);

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return this.mergeAIInsights(messages, text);
  }

  private async analyzeWithOpenAI(messages: StoredMessage[], apiKey: string, prompt: string): Promise<ChatMetrics> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) return this.analyzeChat(messages);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    return this.mergeAIInsights(messages, text);
  }

  private async analyzeWithAnthropic(messages: StoredMessage[], apiKey: string, prompt: string): Promise<ChatMetrics> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return this.analyzeChat(messages);

    const data = await response.json();
    const text = data.content?.[0]?.text;
    
    return this.mergeAIInsights(messages, text);
  }

  private mergeAIInsights(messages: StoredMessage[], aiText: string | undefined): ChatMetrics {
    const localAnalysis = this.analyzeChat(messages);
    
    if (!aiText) return localAnalysis;
    
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiInsights = JSON.parse(jsonMatch[0]);
        return {
          ...localAnalysis,
          sentiment: aiInsights.sentiment || localAnalysis.sentiment,
          engagementScore: aiInsights.engagement || localAnalysis.engagementScore,
        };
      }
    } catch {
      // JSON parsing failed, return local analysis
    }
    
    return localAnalysis;
  }


  // ============ SESSION HISTORY ============

  /**
   * Obtiene todas las sesiones guardadas
   * @returns Array de sesiones
   */
  getSessions(): AnalyticsSession[] {
    if (typeof localStorage === 'undefined') return [];
    
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Obtiene sesiones por fecha
   * @param date - Fecha en formato YYYY-MM-DD
   * @returns Sesiones de esa fecha
   */
  getSessionsByDate(date: string): AnalyticsSession[] {
    const sessions = this.getSessions();
    return sessions.filter(s => {
      const sessionDate = new Date(s.startTime).toISOString().split('T')[0];
      return sessionDate === date;
    });
  }

  /**
   * Elimina sesiones antiguas
   * @param keepDays - Días a mantener (default: 7)
   */
  clearOldSessions(keepDays: number = 7): void {
    if (typeof localStorage === 'undefined') return;
    
    const sessions = this.getSessions();
    const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
    const filtered = sessions.filter(s => s.startTime > cutoff);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
  }

  /**
   * Guarda la sesión actual sin finalizarla
   * Útil para guardar snapshots de la sesión en curso
   */
  saveCurrentSession(): void {
    if (this.currentSession) {
      const sessionToSave = {
        ...this.currentSession,
        endTime: Date.now(),
        metrics: this.currentSession.messages.length > 0 
          ? this.analyzeChat(this.currentSession.messages) 
          : undefined,
      };
      this.saveSessionToStorage(sessionToSave);
    }
  }

  /**
   * Guarda una sesión específica
   * @param session - Sesión a guardar
   */
  saveSession(session: AnalyticsSession): void {
    this.saveSessionToStorage(session);
  }

  // ============ PRIVATE HELPERS ============

  private calculateSentimentIntensity(
    positiveScore: number, 
    negativeScore: number, 
    excitementScore: number, 
    totalMessages: number,
    messagesPerMinute: number
  ): number {
    const emotionalDensity = (positiveScore + negativeScore + excitementScore) / Math.max(1, totalMessages);
    const activityFactor = Math.min(1, messagesPerMinute / 10);
    return Math.min(100, Math.round((emotionalDensity * 50) + (activityFactor * 50)));
  }

  private calculateActivityLevel(messagesPerMinute: number): ActivityLevel {
    if (messagesPerMinute > 20) return 'explosive';
    if (messagesPerMinute > 10) return 'high';
    if (messagesPerMinute > 3) return 'moderate';
    if (messagesPerMinute > 0.5) return 'low';
    return 'dead';
  }

  private calculateChatVelocity(messages: StoredMessage[], now: number): number {
    const recentMessages = messages.filter(m => m.timestamp && (now - m.timestamp) < 60000);
    return Math.round((recentMessages.length / 60) * 100) / 100;
  }

  private calculateUserRetention(userCounts: Map<string, number>, uniqueUsers: number): number {
    const retainedUsers = Array.from(userCounts.values()).filter(c => c >= 2).length;
    return uniqueUsers > 0 ? Math.round((retainedUsers / uniqueUsers) * 100) : 0;
  }

  private calculateResponseRate(totalMessages: number, uniqueUsers: number): number {
    const avgMsgsPerUser = totalMessages / Math.max(1, uniqueUsers);
    return Math.min(100, Math.round(avgMsgsPerUser * 20));
  }

  private calculatePeakHour(messages: StoredMessage[]): string | null {
    const hourCounts = new Map<number, number>();
    messages.forEach(m => {
      if (m.timestamp) {
        const hour = new Date(m.timestamp).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    });
    const peakHourEntry = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    return peakHourEntry ? `${peakHourEntry[0]}:00` : null;
  }

  private detectDominantLanguage(messages: StoredMessage[]): 'es' | 'en' | 'mixed' {
    const spanishWords = ['que', 'de', 'el', 'la', 'en', 'es', 'no', 'si', 'por', 'con', 'jaja', 'vamos'];
    const englishWords = ['the', 'is', 'are', 'you', 'lol', 'nice', 'good', 'yes', 'no', 'what'];
    let spanishCount = 0, englishCount = 0;
    
    messages.forEach(m => {
      const words = m.message.toLowerCase().split(/\s+/);
      words.forEach(w => {
        if (spanishWords.includes(w)) spanishCount++;
        if (englishWords.includes(w)) englishCount++;
      });
    });
    
    if (spanishCount > englishCount * 1.5) return 'es';
    if (englishCount > spanishCount * 1.5) return 'en';
    return 'mixed';
  }

  private calculateSpamScore(messages: StoredMessage[], topUsers: UserCount[], totalMessages: number): number {
    const messageCounts = new Map<string, number>();
    let shortMessages = 0;
    
    messages.forEach(m => {
      const normalized = m.message.toLowerCase().trim();
      messageCounts.set(normalized, (messageCounts.get(normalized) || 0) + 1);
      if (m.message.length < 5) shortMessages++;
    });
    
    const duplicateRatio = Array.from(messageCounts.values()).filter(c => c > 2).length / Math.max(1, messageCounts.size);
    const shortRatio = shortMessages / Math.max(1, totalMessages);
    const topUserRatio = topUsers[0] ? topUsers[0].count / totalMessages : 0;
    
    return Math.min(100, Math.round((duplicateRatio * 40) + (shortRatio * 30) + (topUserRatio * 30)));
  }

  private getProviderForFunction(config: AIConfig, fn: 'analytics' | 'games'): { provider: AIProvider; apiKey: string } | null {
    const provider = fn === 'analytics' ? config.analyticsProvider : config.gamesProvider;
    const providerConfig = config.providers[provider];
    
    if (providerConfig.apiKey) {
      return { provider, apiKey: providerConfig.apiKey };
    }
    
    // Fallback: find any provider with key
    for (const p of ['gemini', 'openai', 'anthropic'] as AIProvider[]) {
      if (config.providers[p].apiKey) {
        return { provider: p, apiKey: config.providers[p].apiKey };
      }
    }
    
    return null;
  }

  private loadAIConfigFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    // Try new format first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const config = JSON.parse(stored) as AIConfig;
        // Decrypt keys and apply env overrides
        (['gemini', 'openai', 'anthropic'] as AIProvider[]).forEach(provider => {
          const envKey = getEnvApiKey(provider);
          if (envKey) {
            config.providers[provider].apiKey = envKey;
            config.providers[provider].enabled = true;
          } else if (config.providers[provider].apiKey) {
            config.providers[provider].apiKey = decryptKey(config.providers[provider].apiKey);
          }
        });
        this.fullAIConfig = config;
        
        // Set simple config from active provider
        const activeProvider = config.analyticsProvider;
        const providerConfig = config.providers[activeProvider];
        if (providerConfig.apiKey) {
          this.aiConfig = {
            provider: activeProvider,
            apiKey: providerConfig.apiKey,
          };
        }
        return;
      } catch {
        // Invalid stored config, try legacy
      }
    }
    
    // Try legacy format and migrate
    const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyStored) {
      try {
        const legacy = JSON.parse(legacyStored) as LegacyAIConfig;
        const config = getDefaultAIConfig();
        const provider = legacy.provider || 'gemini';
        config.providers[provider] = {
          apiKey: legacy.apiKey ? decryptKey(legacy.apiKey) : '',
          enabled: legacy.enabled,
        };
        config.analyticsProvider = provider;
        config.gamesProvider = provider;
        
        this.fullAIConfig = config;
        
        // Set simple config
        if (legacy.apiKey) {
          this.aiConfig = {
            provider,
            apiKey: decryptKey(legacy.apiKey),
          };
        }
        
        // Save in new format for future use
        this.saveAIConfigToStorage();
        return;
      } catch {
        // Invalid legacy config
      }
    }
    
    // Check env keys as fallback
    const config = getDefaultAIConfig();
    (['gemini', 'openai', 'anthropic'] as AIProvider[]).forEach(provider => {
      const envKey = getEnvApiKey(provider);
      if (envKey) {
        config.providers[provider].apiKey = envKey;
        config.providers[provider].enabled = true;
      }
    });
    
    // Only set if we found any env keys
    const hasEnvKey = Object.values(config.providers).some(p => p.apiKey);
    if (hasEnvKey) {
      this.fullAIConfig = config;
    }
  }

  private saveAIConfigToStorage(): void {
    if (typeof localStorage === 'undefined' || !this.fullAIConfig) return;
    
    const configToSave = {
      ...this.fullAIConfig,
      providers: {
        gemini: { 
          apiKey: this.fullAIConfig.providers.gemini.apiKey ? encryptKey(this.fullAIConfig.providers.gemini.apiKey) : '',
          enabled: this.fullAIConfig.providers.gemini.enabled 
        },
        openai: { 
          apiKey: this.fullAIConfig.providers.openai.apiKey ? encryptKey(this.fullAIConfig.providers.openai.apiKey) : '',
          enabled: this.fullAIConfig.providers.openai.enabled 
        },
        anthropic: { 
          apiKey: this.fullAIConfig.providers.anthropic.apiKey ? encryptKey(this.fullAIConfig.providers.anthropic.apiKey) : '',
          enabled: this.fullAIConfig.providers.anthropic.enabled 
        },
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
  }

  private saveSessionToStorage(session: AnalyticsSession): void {
    if (typeof localStorage === 'undefined') return;
    
    const sessions = this.getSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    // Keep only last 30 sessions
    const trimmed = sessions.slice(-30);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
  }
}

// ============ SINGLETON INSTANCE ============

let analyticsServiceInstance: AnalyticsService | null = null;

/**
 * Obtiene la instancia singleton del AnalyticsService
 * @returns Instancia del servicio
 */
export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}

/**
 * Resetea la instancia singleton (útil para tests)
 */
export function resetAnalyticsService(): void {
  analyticsServiceInstance = null;
}

// ============ STANDALONE UTILITY FUNCTIONS ============
// These are exported for backward compatibility with components that use them directly

/**
 * Time slot data for charts
 */
export interface TimeSlotData {
  timestamp: number;
  time: string;
  messages: number;
  sentiment: number;
  users: number;
}

/**
 * Analyze chat messages (standalone function for backward compatibility)
 * @param messages - Messages to analyze
 * @param sessionStartTime - Session start time (optional)
 * @returns Chat metrics
 */
export function analyzeChat(
  messages: StoredMessage[] | { username: string; message: string; timestamp?: number }[],
  sessionStartTime?: number
): ChatMetrics {
  const service = getAnalyticsService();
  return service.analyzeChat(messages as StoredMessage[], sessionStartTime);
}

/**
 * Generate time series data for charts
 * @param messages - Messages to analyze
 * @param slotDurationMs - Duration of each time slot in milliseconds (default: 60000)
 * @returns Array of time slot data
 */
export function generateTimeSeries(
  messages: { message: string; timestamp: number; username: string }[],
  slotDurationMs: number = 60000
): TimeSlotData[] {
  if (messages.length === 0) return [];

  const slots = new Map<number, { messages: number; sentiment: number; users: Set<string> }>();

  messages.forEach(msg => {
    const slot = Math.floor(msg.timestamp / slotDurationMs) * slotDurationMs;
    const existing = slots.get(slot) || { messages: 0, sentiment: 0, users: new Set<string>() };
    
    existing.messages++;
    existing.users.add(msg.username);
    
    // Quick sentiment check
    let msgSentiment = 0;
    const positivePatterns = [
      /\b(pog|poggers|pogchamp|hype|gg|nice|amazing|love|great|awesome|lol|lmao|goat|based)\b/gi,
      /(❤️|💜|💕|🎉|👏|🔥|💪|🙌|😍|🥳|✨|⭐|💯|👍|😂|🤣|😊|😄|💖|🫶)+/g,
    ];
    const negativePatterns = [
      /\b(bad|terrible|hate|worst|boring|sad|rip|fail|trash|cringe)\b/gi,
      /(😢|😭|💔|👎|😡|🤬|😤|😠|💀|☠️|🗑️|😴|😒|🙄)+/g,
    ];
    positivePatterns.forEach(p => { if (msg.message.match(p)) msgSentiment += 1; });
    negativePatterns.forEach(p => { if (msg.message.match(p)) msgSentiment -= 1; });
    existing.sentiment += msgSentiment;
    
    slots.set(slot, existing);
  });

  return Array.from(slots.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(-60) // Last 60 slots
    .map(([timestamp, data]) => ({
      timestamp,
      time: new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      messages: data.messages,
      sentiment: Math.max(-1, Math.min(1, data.sentiment / Math.max(1, data.messages))),
      users: data.users.size,
    }));
}

/**
 * Get activity level label in Spanish
 * @param level - Activity level
 * @returns Localized label
 */
export function getActivityLabel(level: ActivityLevel): string {
  const labels: Record<ActivityLevel, string> = {
    dead: '💤 Sin actividad',
    low: '🐢 Baja',
    moderate: '👍 Moderada',
    high: '🔥 Alta',
    explosive: '🚀 Explosiva',
  };
  return labels[level];
}

/**
 * Get sentiment emoji
 * @param sentiment - Sentiment value
 * @returns Emoji representing the sentiment
 */
export function getSentimentEmoji(sentiment: Sentiment): string {
  const emojis: Record<Sentiment, string> = {
    positive: '😊',
    neutral: '😐',
    negative: '😔',
  };
  return emojis[sentiment];
}

/**
 * Calculate health score for the chat (0-100)
 * @param metrics - Chat metrics
 * @returns Health score
 */
export function calculateHealthScore(metrics: ChatMetrics): number {
  let score = 50; // Base score
  
  // Activity contribution (0-20)
  const activityScores: Record<ActivityLevel, number> = { dead: 0, low: 5, moderate: 10, high: 15, explosive: 20 };
  score += activityScores[metrics.activityLevel];
  
  // Engagement contribution (0-20)
  score += Math.min(20, metrics.engagementScore / 5);
  
  // Sentiment contribution (-10 to +10)
  score += metrics.sentimentScore * 10;
  
  // Diversity bonus (0-10)
  score += metrics.diversityIndex * 10;
  
  // Spam penalty (0 to -20)
  score -= metrics.spamScore / 5;
  
  // Retention bonus (0-10)
  score += metrics.userRetention / 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get insights and recommendations
 * @param metrics - Chat metrics
 * @returns Array of insights
 */
export function getInsights(metrics: ChatMetrics): { type: 'success' | 'warning' | 'info'; message: string }[] {
  const insights: { type: 'success' | 'warning' | 'info'; message: string }[] = [];
  
  // Positive insights
  if (metrics.engagementScore > 70) {
    insights.push({ type: 'success', message: '¡Excelente engagement! La audiencia está muy participativa.' });
  }
  if (metrics.userRetention > 60) {
    insights.push({ type: 'success', message: 'Alta retención: los usuarios vuelven a participar.' });
  }
  if (metrics.diversityIndex > 0.3) {
    insights.push({ type: 'success', message: 'Conversaciones variadas y ricas en vocabulario.' });
  }
  if (metrics.growthRate > 30) {
    insights.push({ type: 'success', message: '¡El chat está creciendo rápidamente!' });
  }
  
  // Warnings
  if (metrics.spamScore > 40) {
    insights.push({ type: 'warning', message: 'Detectado contenido repetitivo. Considera moderar.' });
  }
  if (metrics.sentiment === 'negative' && metrics.sentimentIntensity > 50) {
    insights.push({ type: 'warning', message: 'Ambiente negativo detectado. Atención a la moderación.' });
  }
  if (metrics.userRetention < 20 && metrics.uniqueUsers > 10) {
    insights.push({ type: 'warning', message: 'Baja retención: usuarios no vuelven a participar.' });
  }
  
  // Info/Tips
  if (metrics.activityLevel === 'low' || metrics.activityLevel === 'dead') {
    insights.push({ type: 'info', message: 'Tip: Haz preguntas al chat para aumentar participación.' });
  }
  if (metrics.avgWordsPerMessage < 3) {
    insights.push({ type: 'info', message: 'Mensajes muy cortos. Fomenta conversaciones más largas.' });
  }
  
  return insights.slice(0, 4); // Max 4 insights
}

/**
 * Generate executive summary for a session
 * @param metrics - Chat metrics
 * @returns Summary text
 */
export function generateSummary(metrics: ChatMetrics): string {
  const lines: string[] = [];
  
  // Activity summary
  if (metrics.activityLevel === 'explosive') {
    lines.push('🚀 Sesión EXPLOSIVA con altísima actividad');
  } else if (metrics.activityLevel === 'high') {
    lines.push('🔥 Sesión muy activa con gran participación');
  } else if (metrics.activityLevel === 'moderate') {
    lines.push('👍 Sesión con actividad moderada');
  } else if (metrics.activityLevel === 'low') {
    lines.push('🐢 Sesión tranquila con poca actividad');
  } else {
    lines.push('💤 Sesión con muy poca actividad');
  }
  
  // Engagement
  if (metrics.engagementScore > 70) {
    lines.push(`💜 Engagement excepcional (${metrics.engagementScore}%)`);
  } else if (metrics.engagementScore > 40) {
    lines.push(`👏 Buen nivel de engagement (${metrics.engagementScore}%)`);
  }
  
  // Sentiment
  if (metrics.sentiment === 'positive') {
    lines.push(`😊 Ambiente positivo (score: ${metrics.sentimentScore.toFixed(2)})`);
  } else if (metrics.sentiment === 'negative') {
    lines.push(`😔 Ambiente tenso (score: ${metrics.sentimentScore.toFixed(2)})`);
  }
  
  // Growth
  if (metrics.growthRate > 20) {
    lines.push(`📈 Crecimiento notable (+${metrics.growthRate}%)`);
  } else if (metrics.growthRate < -20) {
    lines.push(`📉 Descenso de actividad (${metrics.growthRate}%)`);
  }
  
  // Retention
  if (metrics.userRetention > 50) {
    lines.push(`🎯 Alta retención de usuarios (${metrics.userRetention}%)`);
  }
  
  // Spam warning
  if (metrics.spamScore > 50) {
    lines.push(`⚠️ Alto nivel de spam detectado (${metrics.spamScore})`);
  }
  
  return lines.join('\n');
}

/**
 * Compare two sessions
 * @param current - Current session metrics
 * @param previous - Previous session metrics
 * @returns Comparison data
 */
export function compareSessions(current: ChatMetrics, previous: ChatMetrics): {
  metric: string;
  current: number;
  previous: number;
  change: number;
  improved: boolean;
}[] {
  return [
    {
      metric: 'Mensajes/min',
      current: current.messagesPerMinute,
      previous: previous.messagesPerMinute,
      change: previous.messagesPerMinute > 0 
        ? Math.round(((current.messagesPerMinute - previous.messagesPerMinute) / previous.messagesPerMinute) * 100)
        : 0,
      improved: current.messagesPerMinute > previous.messagesPerMinute,
    },
    {
      metric: 'Engagement',
      current: current.engagementScore,
      previous: previous.engagementScore,
      change: previous.engagementScore > 0
        ? Math.round(((current.engagementScore - previous.engagementScore) / previous.engagementScore) * 100)
        : 0,
      improved: current.engagementScore > previous.engagementScore,
    },
    {
      metric: 'Usuarios',
      current: current.uniqueUsers,
      previous: previous.uniqueUsers,
      change: previous.uniqueUsers > 0
        ? Math.round(((current.uniqueUsers - previous.uniqueUsers) / previous.uniqueUsers) * 100)
        : 0,
      improved: current.uniqueUsers > previous.uniqueUsers,
    },
    {
      metric: 'Sentimiento',
      current: Math.round(current.sentimentScore * 100),
      previous: Math.round(previous.sentimentScore * 100),
      change: Math.round((current.sentimentScore - previous.sentimentScore) * 100),
      improved: current.sentimentScore > previous.sentimentScore,
    },
  ];
}

// Re-export ChatMetrics type for backward compatibility
export type { ChatMetrics, ActivityLevel, Sentiment, SpecialMood } from '../../domain/entities/ChatMetrics';

// ============ STANDALONE AI CONFIG FUNCTIONS ============
// These are exported for backward compatibility with game components

/**
 * Load AI configuration from storage (standalone function)
 * @returns AI configuration or null
 */
export function loadAIConfig(): AIConfig | null {
  const service = getAnalyticsService();
  const config = service.getFullAIConfig();
  // Check if any provider has a key configured
  const hasKey = Object.values(config.providers).some(p => p.apiKey);
  return hasKey ? config : null;
}

/**
 * Get provider info for a specific function (standalone function)
 * @param config - AI configuration
 * @param fn - Function type ('analytics' or 'games')
 * @returns Provider info or null
 */
export function getProviderForFunction(
  config: AIConfig, 
  fn: 'analytics' | 'games'
): { provider: AIProvider; apiKey: string } | null {
  const provider = fn === 'analytics' ? config.analyticsProvider : config.gamesProvider;
  const providerConfig = config.providers[provider];
  
  if (providerConfig.apiKey) {
    return { provider, apiKey: providerConfig.apiKey };
  }
  
  // Fallback: find any provider with key
  for (const p of ['gemini', 'openai', 'anthropic'] as AIProvider[]) {
    if (config.providers[p].apiKey) {
      return { provider: p, apiKey: config.providers[p].apiKey };
    }
  }
  
  return null;
}
