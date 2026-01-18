import { useState, useCallback, useRef, useEffect } from 'react';

export interface VoiceConfig {
  rate?: number; // 0.1 - 10
  pitch?: number; // 0 - 2
  volume?: number; // 0 - 1
  voice?: SpeechSynthesisVoice | null;
  lang?: string;
}

interface UseVoiceSynthesisReturn {
  speak: (text: string, config?: VoiceConfig) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  error: string | null;
}

/**
 * Narrador Local - Para evitar latencia y costes de servidores de audio
 * 
 * Misión: Recibir el speech procesado por el Agente de Kiro
 * Acción: Ejecutar window.speechSynthesis.speak() para que el PC del streamer hable
 */
export function useVoiceSynthesis(): UseVoiceSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

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

  const speak = useCallback(async (text: string, config: VoiceConfig = {}) => {
    if (!isSupported) {
      setError('Speech synthesis not supported');
      return Promise.reject(new Error('Speech synthesis not supported'));
    }

    if (!text.trim()) {
      setError('No text provided');
      return Promise.reject(new Error('No text provided'));
    }

    return new Promise<void>((resolve, reject) => {
      try {
        // Detener cualquier speech anterior
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        // Configuración de voz
        utterance.rate = config.rate ?? 1;
        utterance.pitch = config.pitch ?? 1;
        utterance.volume = config.volume ?? 1;
        utterance.lang = config.lang ?? 'es-ES';

        // Seleccionar voz específica si se proporciona
        if (config.voice) {
          utterance.voice = config.voice;
        } else {
          // Buscar voz en español por defecto
          const spanishVoice = voices.find(voice => 
            voice.lang.startsWith('es') || voice.name.includes('Spanish')
          );
          if (spanishVoice) {
            utterance.voice = spanishVoice;
          }
        }

        // Event listeners
        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
          setError(null);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          utteranceRef.current = null;
          resolve();
        };

        utterance.onerror = (event) => {
          setIsSpeaking(false);
          setIsPaused(false);
          setError(`Speech error: ${event.error}`);
          utteranceRef.current = null;
          reject(new Error(`Speech error: ${event.error}`));
        };

        utterance.onpause = () => {
          setIsPaused(true);
        };

        utterance.onresume = () => {
          setIsPaused(false);
        };

        // Iniciar speech
        speechSynthesis.speak(utterance);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }, [isSupported, voices]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return;
    
    speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;
    
    speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported, isPaused]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    error
  };
}