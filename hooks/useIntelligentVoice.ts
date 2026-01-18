import { useState, useCallback, useRef, useEffect } from 'react';
import { useOfflineAI } from './useOfflineAI';

interface VoicePersonality {
  id: string;
  name: string;
  baseRate: number;
  basePitch: number;
  baseVolume: number;
  emotionMultipliers: {
    hype: { rate: number; pitch: number; volume: number };
    calm: { rate: number; pitch: number; volume: number };
    dramatic: { rate: number; pitch: number; volume: number };
    funny: { rate: number; pitch: number; volume: number };
  };
  preferredVoice?: string;
  pauseBetweenSentences: number;
}

interface SpeechRequest {
  text: string;
  mood?: 'hype' | 'calm' | 'toxic' | 'confused';
  tone?: 'western' | 'epic' | 'funny' | 'dramatic';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  personality?: string;
  interrupt?: boolean;
}

interface SpeechQueueItem extends SpeechRequest {
  id: string;
  timestamp: number;
  estimatedDuration: number;
}

interface UseIntelligentVoiceReturn {
  speak: (request: SpeechRequest) => Promise<void>;
  speakImmediate: (text: string, options?: Partial<SpeechRequest>) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  clearQueue: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  currentPersonality: VoicePersonality;
  setPersonality: (personalityId: string) => void;
  queue: SpeechQueueItem[];
  voices: SpeechSynthesisVoice[];
  error: string | null;
  stats: {
    totalSpoken: number;
    averageDuration: number;
    queueProcessed: number;
    interruptionsHandled: number;
  };
}

/**
 * Hook de síntesis de voz inteligente y autosuficiente
 * 
 * Características:
 * - Múltiples personalidades de voz
 * - Cola de prioridades para mensajes
 * - Adaptación automática según mood/tone
 * - Estimación inteligente de duración
 * - Manejo de interrupciones
 * - Análisis de texto para mejor pronunciación
 * - Estadísticas de uso
 * - Funciona completamente offline
 */
export function useIntelligentVoice(): UseIntelligentVoiceReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<SpeechQueueItem[]>([]);
  const [currentPersonality, setCurrentPersonalityState] = useState<VoicePersonality>('narrator');
  const [stats, setStats] = useState({
    totalSpoken: 0,
    averageDuration: 0,
    queueProcessed: 0,
    interruptionsHandled: 0
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isProcessingQueue = useRef(false);
  const durationHistory = useRef<number[]>([]);
  const { analyzeSentiment } = useOfflineAI();

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Personalidades de voz predefinidas
  const personalities: Record<string, VoicePersonality> = {
    narrator: {
      id: 'narrator',
      name: 'Narrador Épico',
      baseRate: 1.0,
      basePitch: 1.0,
      baseVolume: 0.9,
      emotionMultipliers: {
        hype: { rate: 1.3, pitch: 1.2, volume: 1.0 },
        calm: { rate: 0.8, pitch: 0.9, volume: 0.8 },
        dramatic: { rate: 0.9, pitch: 0.8, volume: 1.0 },
        funny: { rate: 1.2, pitch: 1.3, volume: 0.9 }
      },
      pauseBetweenSentences: 300
    },
    commentator: {
      id: 'commentator',
      name: 'Comentarista Deportivo',
      baseRate: 1.4,
      basePitch: 1.1,
      baseVolume: 1.0,
      emotionMultipliers: {
        hype: { rate: 1.6, pitch: 1.4, volume: 1.0 },
        calm: { rate: 1.0, pitch: 1.0, volume: 0.8 },
        dramatic: { rate: 1.2, pitch: 0.9, volume: 1.0 },
        funny: { rate: 1.5, pitch: 1.3, volume: 0.9 }
      },
      pauseBetweenSentences: 200
    },
    storyteller: {
      id: 'storyteller',
      name: 'Contador de Historias',
      baseRate: 0.9,
      basePitch: 0.9,
      baseVolume: 0.8,
      emotionMultipliers: {
        hype: { rate: 1.1, pitch: 1.1, volume: 0.9 },
        calm: { rate: 0.7, pitch: 0.8, volume: 0.7 },
        dramatic: { rate: 0.8, pitch: 0.7, volume: 0.9 },
        funny: { rate: 1.0, pitch: 1.2, volume: 0.8 }
      },
      pauseBetweenSentences: 500
    },
    robot: {
      id: 'robot',
      name: 'Robot Futurista',
      baseRate: 1.1,
      basePitch: 0.7,
      baseVolume: 0.9,
      emotionMultipliers: {
        hype: { rate: 1.3, pitch: 0.8, volume: 1.0 },
        calm: { rate: 0.9, pitch: 0.6, volume: 0.8 },
        dramatic: { rate: 1.0, pitch: 0.5, volume: 0.9 },
        funny: { rate: 1.2, pitch: 0.9, volume: 0.9 }
      },
      pauseBetweenSentences: 100
    }
  };

  // Cargar voces disponibles
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  // Estimar duración del texto
  const estimateDuration = useCallback((text: string, rate: number = 1): number => {
    // Estimación basada en caracteres, palabras y puntuación
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;
    const punctuationCount = (text.match(/[.!?;,]/g) || []).length;
    
    // Fórmula mejorada considerando velocidad de habla
    const baseTime = (wordCount * 0.6 + charCount * 0.05 + punctuationCount * 0.3) / rate;
    
    return Math.max(1, Math.ceil(baseTime));
  }, []);

  // Mejorar texto para pronunciación
  const improveTextForSpeech = useCallback((text: string): string => {
    let improvedText = text;

    // Reemplazar abreviaciones comunes
    const abbreviations: Record<string, string> = {
      'gg': 'good game',
      'wp': 'well played',
      'omg': 'oh my god',
      'lol': 'laugh out loud',
      'wtf': 'what the f',
      'pog': 'poggers',
      'kappa': 'kappa',
      'ez': 'easy',
      'nt': 'nice try',
      'gl': 'good luck',
      'hf': 'have fun'
    };

    Object.entries(abbreviations).forEach(([abbr, full]) => {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      improvedText = improvedText.replace(regex, full);
    });

    // Mejorar números
    improvedText = improvedText.replace(/\b(\d+)\b/g, (match, num) => {
      const number = parseInt(num);
      if (number < 100) return match;
      // Convertir números grandes a formato más natural
      if (number >= 1000000) return `${(number / 1000000).toFixed(1)} millones`;
      if (number >= 1000) return `${(number / 1000).toFixed(1)} mil`;
      return match;
    });

    // Añadir pausas naturales
    improvedText = improvedText.replace(/([.!?])\s+/g, '$1... ');
    improvedText = improvedText.replace(/,\s+/g, ', ');

    return improvedText;
  }, []);

  // Configurar utterance con personalidad
  const configureUtterance = useCallback((
    text: string, 
    personality: VoicePersonality, 
    mood?: SpeechRequest['mood'],
    tone?: SpeechRequest['tone']
  ): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(improveTextForSpeech(text));
    
    // Configuración base
    utterance.rate = personality.baseRate;
    utterance.pitch = personality.basePitch;
    utterance.volume = personality.baseVolume;
    utterance.lang = 'es-ES';

    // Aplicar modificadores emocionales
    if (mood && personality.emotionMultipliers[mood]) {
      const multipliers = personality.emotionMultipliers[mood];
      utterance.rate *= multipliers.rate;
      utterance.pitch *= multipliers.pitch;
      utterance.volume *= multipliers.volume;
    }

    // Aplicar modificadores de tono
    if (tone) {
      switch (tone) {
        case 'western':
          utterance.rate *= 0.9;
          utterance.pitch *= 0.8;
          break;
        case 'epic':
          utterance.rate *= 0.8;
          utterance.pitch *= 0.9;
          utterance.volume *= 1.1;
          break;
        case 'funny':
          utterance.rate *= 1.3;
          utterance.pitch *= 1.4;
          break;
        case 'dramatic':
          utterance.rate *= 0.7;
          utterance.pitch *= 0.7;
          utterance.volume *= 1.2;
          break;
      }
    }

    // Seleccionar voz apropiada
    if (personality.preferredVoice) {
      const preferredVoice = voices.find(v => v.name.includes(personality.preferredVoice!));
      if (preferredVoice) utterance.voice = preferredVoice;
    } else {
      // Seleccionar voz en español por defecto
      const spanishVoice = voices.find(voice => 
        voice.lang.startsWith('es') || voice.name.includes('Spanish')
      );
      if (spanishVoice) utterance.voice = spanishVoice;
    }

    // Limitar valores a rangos válidos
    utterance.rate = Math.max(0.1, Math.min(10, utterance.rate));
    utterance.pitch = Math.max(0, Math.min(2, utterance.pitch));
    utterance.volume = Math.max(0, Math.min(1, utterance.volume));

    return utterance;
  }, [voices, improveTextForSpeech]);

  // Procesar cola de speech
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current || queue.length === 0 || isSpeaking) return;

    isProcessingQueue.current = true;

    try {
      // Ordenar por prioridad
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const sortedQueue = [...queue].sort((a, b) => {
        const aPriority = priorityOrder[a.priority || 'normal'];
        const bPriority = priorityOrder[b.priority || 'normal'];
        if (aPriority !== bPriority) return bPriority - aPriority;
        return a.timestamp - b.timestamp; // FIFO para misma prioridad
      });

      const nextItem = sortedQueue[0];
      if (!nextItem) return;

      // Remover de la cola
      setQueue(prev => prev.filter(item => item.id !== nextItem.id));

      // Configurar y hablar
      const personality = personalities[nextItem.personality || currentPersonality];
      const utterance = configureUtterance(nextItem.text, personality, nextItem.mood, nextItem.tone);
      
      const startTime = Date.now();
      
      return new Promise<void>((resolve, reject) => {
        utterance.onstart = () => {
          setIsSpeaking(true);
          setError(null);
        };

        utterance.onend = () => {
          const duration = Date.now() - startTime;
          durationHistory.current.push(duration);
          if (durationHistory.current.length > 20) {
            durationHistory.current = durationHistory.current.slice(-20);
          }

          setStats(prev => ({
            totalSpoken: prev.totalSpoken + 1,
            averageDuration: durationHistory.current.reduce((a, b) => a + b, 0) / durationHistory.current.length,
            queueProcessed: prev.queueProcessed + 1,
            interruptionsHandled: prev.interruptionsHandled
          }));

          setIsSpeaking(false);
          utteranceRef.current = null;
          
          // Pausa entre oraciones si es necesario
          if (personality.pauseBetweenSentences > 0) {
            setTimeout(() => {
              resolve();
              isProcessingQueue.current = false;
              processQueue(); // Procesar siguiente
            }, personality.pauseBetweenSentences);
          } else {
            resolve();
            isProcessingQueue.current = false;
            processQueue(); // Procesar siguiente
          }
        };

        utterance.onerror = (event) => {
          setError(`Speech error: ${event.error}`);
          setIsSpeaking(false);
          utteranceRef.current = null;
          isProcessingQueue.current = false;
          reject(new Error(`Speech error: ${event.error}`));
        };

        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
      });

    } catch (err) {
      console.error('Error processing speech queue:', err);
      isProcessingQueue.current = false;
    }
  }, [queue, isSpeaking, currentPersonality, configureUtterance]);

  // Añadir a la cola
  const speak = useCallback(async (request: SpeechRequest) => {
    if (!isSupported) {
      setError('Speech synthesis not supported');
      return;
    }

    if (!request.text.trim()) {
      setError('No text provided');
      return;
    }

    // Analizar sentimiento si no se proporciona mood
    let mood = request.mood;
    if (!mood) {
      const sentiment = analyzeSentiment(request.text);
      mood = sentiment.mood;
    }

    const personality = personalities[request.personality || currentPersonality];
    const estimatedDuration = estimateDuration(request.text, personality.baseRate);

    const queueItem: SpeechQueueItem = {
      ...request,
      mood,
      id: `speech-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      estimatedDuration,
      priority: request.priority || 'normal'
    };

    // Si es interrupción, limpiar cola y detener speech actual
    if (request.interrupt) {
      speechSynthesis.cancel();
      setQueue([]);
      setStats(prev => ({ ...prev, interruptionsHandled: prev.interruptionsHandled + 1 }));
      setIsSpeaking(false);
      isProcessingQueue.current = false;
    }

    setQueue(prev => [...prev, queueItem]);
    
    // Iniciar procesamiento si no está en curso
    if (!isProcessingQueue.current) {
      setTimeout(processQueue, 100);
    }
  }, [isSupported, analyzeSentiment, currentPersonality, estimateDuration, processQueue]);

  // Hablar inmediatamente (alta prioridad)
  const speakImmediate = useCallback(async (text: string, options: Partial<SpeechRequest> = {}) => {
    await speak({
      text,
      priority: 'urgent',
      interrupt: true,
      ...options
    });
  }, [speak]);

  // Controles de reproducción
  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setQueue([]);
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
    isProcessingQueue.current = false;
  }, []);

  const pause = useCallback(() => {
    if (isSpeaking) {
      speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  // Cambiar personalidad
  const setPersonality = useCallback((personalityId: string) => {
    if (personalities[personalityId]) {
      setCurrentPersonalityState(personalityId);
    }
  }, []);

  return {
    speak,
    speakImmediate,
    stop,
    pause,
    resume,
    clearQueue,
    isSpeaking,
    isPaused,
    isSupported,
    currentPersonality: personalities[currentPersonality],
    setPersonality,
    queue,
    voices,
    error,
    stats
  };
}