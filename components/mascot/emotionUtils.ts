// Emotion analysis utilities for AI Vision Mascot
import { TwitchMessage } from '../../types';
import { MascotEmotion, ChatSentiment, EmotionResult } from './types';

import { analyzeChat, ChatMetrics } from '../../services/chatAnalysisService';

// Mensajes variados para cada estado - se elige uno aleatorio
const MESSAGES = {
  celebrating: [
    '🔥 ¡El chat está ON FIRE!',
    '🎉 ¡Esto está que arde!',
    '🚀 ¡Increíble energía!',
    '⚡ ¡Momento épico!',
    '💥 ¡BOOM! ¡Qué locura!',
  ],
  love: [
    '💜 ¡Mucho amor en el chat!',
    '💕 ¡Qué bonito ambiente!',
    '🥰 ¡Se siente el cariño!',
    '💖 ¡Comunidad increíble!',
  ],
  surprised: [
    '😱 ¡No me lo esperaba!',
    '🤯 ¡Momento inesperado!',
    '😲 ¡Vaya sorpresa!',
    '👀 ¡Eso no lo vi venir!',
  ],
  excited: [
    '🔥 ¡Chat muy activo!',
    '⚡ ¡Buena energía!',
    '🎯 ¡Gran participación!',
    '💪 ¡Vamos con todo!',
    '✨ ¡Esto está genial!',
  ],
  happy: [
    '😊 Buen ambiente',
    '👍 Todo fluye bien',
    '🌟 Chat saludable',
    '😄 ¡Me gusta esto!',
    '🎵 Buen ritmo de chat',
  ],
  neutral: [
    '👁️ Observando...',
    '📡 Monitorizando',
    '🔍 Analizando chat',
    '📊 Recopilando datos',
    '🎧 Escuchando...',
  ],
  thinking: [
    '🤔 Hmm, interesante...',
    '💭 Procesando...',
    '🧠 Analizando patrones',
    '📈 Evaluando tendencias',
  ],
  concerned: [
    '🤨 Algo pasa aquí...',
    '⚠️ Detectando tensión',
    '😐 Ambiente mixto',
    '🔔 Atención al chat',
  ],
  sad: [
    '😔 Ambiente bajo',
    '💙 Momento tranquilo',
    '🌧️ Chat apagado',
  ],
  sleepy: [
    '😴 Zzz... tranquilo',
    '💤 Poca actividad',
    '🌙 Chat dormido',
    '😪 Esperando acción...',
  ],
  helpful: [
    '💡 ¿Puedo ayudar?',
    '🤝 Aquí estoy',
    '📋 Listo para asistir',
    '🎯 A tu servicio',
  ],
  confused: [
    '🤖 Detectando spam...',
    '❓ Patrones extraños',
    '🔄 Mensajes repetidos',
  ],
};

// Función para obtener mensaje aleatorio
const getRandomMessage = (emotion: MascotEmotion, fallback: string): string => {
  const messages = MESSAGES[emotion];
  if (!messages || messages.length === 0) return fallback;
  return messages[Math.floor(Math.random() * messages.length)];
};

// Cache para evitar cambios muy frecuentes
let lastEmotionTime = 0;
let lastEmotion: EmotionResult | null = null;
const MIN_EMOTION_CHANGE_INTERVAL = 5000; // 5 segundos mínimo entre cambios

/**
 * Analyzes chat messages to determine overall sentiment
 * Uses the centralized chat analysis service
 */
export const analyzeChatSentiment = (messages: TwitchMessage[]): ChatSentiment => {
  if (messages.length === 0) return { sentiment: 'neutral', intensity: 0 };

  // Use centralized analysis
  const metrics: ChatMetrics = analyzeChat(messages);
  
  return {
    sentiment: metrics.sentiment,
    intensity: metrics.sentimentIntensity,
  };
};

/**
 * Detects special emotion patterns in chat messages
 * Uses centralized analysis for special mood detection
 */
export const detectSpecialEmotions = (messages: TwitchMessage[]): MascotEmotion | null => {
  if (messages.length === 0) return null;
  
  const metrics = analyzeChat(messages.slice(-30));
  
  // Solo detectar moods especiales si hay suficiente intensidad
  if (metrics.specialMood && metrics.sentimentIntensity > 40) {
    switch (metrics.specialMood) {
      case 'love': return 'love';
      case 'hype': return 'celebrating';
      case 'angry': return 'concerned'; // Usar concerned en vez de angry
      case 'sad': return 'sad';
      case 'surprised': return 'surprised';
    }
  }
  
  return null;
};

interface DetermineEmotionParams {
  chatSentiment: ChatSentiment;
  t: any;
  difficulty?: { type: string; context?: string };
  isConnected: boolean;
  hasPoll: boolean;
  pollVotes: number;
  messages: TwitchMessage[];
  idleTime: number;
}

/**
 * Determines the mascot's emotion based on various factors
 * Enhanced with more intelligent state transitions and varied messages
 */
export const determineEmotion = ({
  chatSentiment,
  t,
  difficulty,
  isConnected,
  hasPoll,
  pollVotes,
  messages,
  idleTime,
}: DetermineEmotionParams): EmotionResult => {
  const now = Date.now();
  
  // Get advanced metrics for smarter decisions
  const metrics = messages.length > 0 ? analyzeChat(messages) : null;
  
  let result: EmotionResult;

  // Priority 0: User difficulties (help mode) - siempre mostrar
  if (difficulty) {
    switch (difficulty.type) {
      case 'connection_failed':
        result = { 
          emotion: 'helpful', 
          message: '🔌 Problemas de conexión', 
          helpTip: t.mascot.helpConnectionFailed 
        };
        break;
      case 'poll_empty':
        result = { 
          emotion: 'confused', 
          message: '🤔 La encuesta está vacía', 
          helpTip: t.mascot.helpPollEmpty 
        };
        break;
      case 'no_votes':
        result = { 
          emotion: 'concerned', 
          message: '📊 Sin votos aún...', 
          helpTip: t.mascot.helpNoVotes 
        };
        break;
      case 'repeated_action':
        result = { 
          emotion: 'helpful', 
          message: '💡 ¿Necesitas ayuda?', 
          helpTip: difficulty.context || t.mascot.helpRepeatedAction 
        };
        break;
      case 'idle':
        result = { 
          emotion: 'sleepy', 
          message: getRandomMessage('sleepy', '😴 Zzz... Todo tranquilo')
        };
        break;
      default:
        result = { emotion: 'neutral', message: getRandomMessage('neutral', '👁️ Observando...') };
    }
    lastEmotion = result;
    lastEmotionTime = now;
    return result;
  }

  // Priority 1: Special emotions from chat (solo si intensidad alta)
  if (messages.length > 10 && metrics && metrics.sentimentIntensity > 60) {
    const specialEmotion = detectSpecialEmotions(messages);
    
    if (specialEmotion === 'celebrating' && metrics.activityLevel === 'explosive') {
      result = { 
        emotion: 'celebrating', 
        message: getRandomMessage('celebrating', '🔥 ¡El chat está ON FIRE!')
      };
      lastEmotion = result;
      lastEmotionTime = now;
      return result;
    }
    
    if (specialEmotion === 'love' && metrics.sentimentIntensity > 70) {
      result = { 
        emotion: 'love', 
        message: getRandomMessage('love', '💜 ¡Mucho amor en el chat!')
      };
      lastEmotion = result;
      lastEmotionTime = now;
      return result;
    }
    
    // Surprised solo en momentos muy específicos
    if (specialEmotion === 'surprised' && metrics.sentimentIntensity > 80) {
      result = { 
        emotion: 'surprised', 
        message: getRandomMessage('surprised', '😱 ¡Momento inesperado!')
      };
      lastEmotion = result;
      lastEmotionTime = now;
      return result;
    }
  }

  // Priority 2: Connection state
  if (!isConnected) {
    result = { 
      emotion: 'neutral', 
      message: '🔌 Esperando conexión...' 
    };
    lastEmotion = result;
    lastEmotionTime = now;
    return result;
  }

  // Priority 3: Poll states
  if (hasPoll) {
    if (pollVotes > 100) {
      result = { 
        emotion: 'celebrating', 
        message: `🎉 ¡${pollVotes} votos! ¡Increíble!` 
      };
    } else if (pollVotes > 50) {
      result = { 
        emotion: 'excited', 
        message: `🔥 ¡${pollVotes} votos! ¡Sigue así!` 
      };
    } else if (pollVotes > 20) {
      result = { 
        emotion: 'happy', 
        message: `📊 ${pollVotes} votos y subiendo` 
      };
    } else if (pollVotes > 5) {
      result = { 
        emotion: 'happy', 
        message: `👍 ${pollVotes} votos registrados` 
      };
    } else if (pollVotes === 0) {
      result = { 
        emotion: 'thinking', 
        message: '🤔 Esperando primeros votos...' 
      };
    } else {
      result = { 
        emotion: 'happy', 
        message: `✨ ¡${pollVotes} votos!` 
      };
    }
    lastEmotion = result;
    lastEmotionTime = now;
    return result;
  }

  // Priority 4: Chat activity and sentiment analysis
  if (metrics && messages.length > 5) {
    // Explosive activity
    if (metrics.activityLevel === 'explosive') {
      result = { 
        emotion: 'celebrating', 
        message: `🚀 ¡${metrics.messagesPerMinute} msgs/min!` 
      };
      lastEmotion = result;
      lastEmotionTime = now;
      return result;
    }
    
    // High activity
    if (metrics.activityLevel === 'high') {
      result = { 
        emotion: chatSentiment.sentiment === 'positive' ? 'excited' : 'happy', 
        message: `📈 ${metrics.uniqueUsers} usuarios activos` 
      };
      lastEmotion = result;
      lastEmotionTime = now;
      return result;
    }
    
    // Moderate activity - estados más variados
    if (metrics.activityLevel === 'moderate') {
      // Variar entre diferentes estados según métricas
      if (metrics.engagementScore > 60) {
        result = { 
          emotion: 'happy', 
          message: `💪 Engagement: ${metrics.engagementScore}%` 
        };
      } else if (metrics.isGrowing) {
        result = { 
          emotion: 'excited', 
          message: `📈 Chat creciendo` 
        };
      } else if (chatSentiment.sentiment === 'positive') {
        result = { 
          emotion: 'happy', 
          message: getRandomMessage('happy', '😊 Buen ambiente')
        };
      } else {
        result = { 
          emotion: 'neutral', 
          message: `👥 ${metrics.uniqueUsers} en el chat` 
        };
      }
      lastEmotion = result;
      lastEmotionTime = now;
      return result;
    }
    
    // Low activity
    if (metrics.activityLevel === 'low') {
      result = { 
        emotion: 'thinking', 
        message: getRandomMessage('thinking', '🤔 Chat tranquilo...')
      };
      lastEmotion = result;
      lastEmotionTime = now;
      return result;
    }
    
    // Spam warning (solo si es muy alto)
    if (metrics.spamScore > 70) {
      result = { 
        emotion: 'confused', 
        message: getRandomMessage('confused', '🤖 Detectando spam...'),
        helpTip: 'Considera activar moderación'
      };
      lastEmotion = result;
      lastEmotionTime = now;
      return result;
    }
    
    // Negative sentiment (solo si es muy intenso)
    if (chatSentiment.sentiment === 'negative' && chatSentiment.intensity > 60) {
      result = { 
        emotion: 'concerned', 
        message: getRandomMessage('concerned', '🤨 Ambiente mixto'),
        helpTip: 'Intenta animar al chat'
      };
      lastEmotion = result;
      lastEmotionTime = now;
      return result;
    }
  }

  // Priority 5: Idle states (gradual)
  if (idleTime > 180000) { // 3 min
    result = { 
      emotion: 'sleepy', 
      message: getRandomMessage('sleepy', '😴 Zzz... muy tranquilo')
    };
    lastEmotion = result;
    lastEmotionTime = now;
    return result;
  }
  
  if (idleTime > 60000) { // 1 min
    result = { 
      emotion: 'thinking', 
      message: getRandomMessage('thinking', '🤔 Todo calmado...')
    };
    lastEmotion = result;
    lastEmotionTime = now;
    return result;
  }

  // Priority 6: Active but neutral - mostrar info útil
  if (messages.length > 0 && metrics) {
    // Evitar cambios muy frecuentes - mantener último estado si es reciente
    if (lastEmotion && (now - lastEmotionTime) < MIN_EMOTION_CHANGE_INTERVAL) {
      return lastEmotion;
    }
    
    result = { 
      emotion: 'helpful', 
      message: `👀 ${metrics.uniqueUsers} usuarios | ${metrics.totalMessages} msgs` 
    };
    lastEmotion = result;
    lastEmotionTime = now;
    return result;
  }

  // Default: watching state
  result = { 
    emotion: 'neutral', 
    message: getRandomMessage('neutral', '👁️ Observando el chat...')
  };
  lastEmotion = result;
  lastEmotionTime = now;
  return result;
};
