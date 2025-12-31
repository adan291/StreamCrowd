/**
 * useDemoTour Hook
 * 
 * Manages a guided demo tour through the application
 * with AI Vision mascot as the guide.
 */

import { useState, useCallback } from 'react';

export interface TourStepAction {
  type: 'navigate';
  leftTab?: 'dynamics' | 'games' | 'platforms' | 'obs' | 'gallery' | 'data';
  dynamicsView?: 'selector' | 'poll' | 'judge' | 'giveaway';
  dataSubTab?: 'activity' | 'analytics';
  rightTab?: 'chat' | 'stream';
  showModeration?: boolean;
  createDemoPoll?: boolean;
  showSoundBoard?: boolean;
  showSpinner?: boolean;
}

export interface TourStep {
  id: string;
  target: string; // CSS selector or section id
  title: string;
  message: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  mascotEmotion: 'happy' | 'excited' | 'thinking' | 'waving';
  action?: TourStepAction; // Navigation action to perform when this step starts
}

export interface UseDemoTourReturn {
  isActive: boolean;
  currentStep: number;
  currentStepData: TourStep | null;
  totalSteps: number;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
}

// Tour steps will be selected based on locale
const TOUR_STEPS: Record<'es' | 'en', TourStep[]> = {
  es: [
    {
      id: 'welcome',
      target: 'body',
      title: '¡Bienvenido a TwitchVote! 👋',
      message: 'Soy tu asistente AI Vision. Te voy a mostrar todas las funciones de la app. ¡Vamos a explorar juntos!',
      position: 'center',
      mascotEmotion: 'waving',
    },
    {
      id: 'poll-creator',
      target: '[data-tour="poll-creator"]',
      title: 'Crear Encuestas 📊',
      message: 'Diseña encuestas con colores, iconos e imágenes. Usa presets rápidos como "Sí/No" o crea opciones personalizadas con claves de voto únicas.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'spinner',
      target: '[data-tour="poll-creator"]',
      title: 'Ruleta de la Suerte 🎰',
      message: '¡Haz sorteos épicos! Busca el botón de ruleta 🎡 en el creador de encuestas. Usa las opciones para elegir un ganador al azar.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'live-poll',
      target: '[data-tour="live-poll"]',
      title: 'Encuesta en Vivo 🎯',
      message: 'Votos en tiempo real con gráficos animados. Los viewers votan con +1, +2 o claves personalizadas como +pizza. ¡Puedes cambiar tu voto!',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', createDemoPoll: true },
    },
    {
      id: 'moderation',
      target: '[data-tour="moderation"]',
      title: 'Moderación Anti-Spam 🛡️',
      message: 'Protege tus encuestas: cooldowns entre votos, pesos especiales para subs/followers, y logs detallados de cada voto procesado.',
      position: 'top',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', showModeration: true },
    },
    {
      id: 'overlay',
      target: '[data-tour="overlay"]',
      title: 'Overlay para OBS 🎬',
      message: 'Ventana especial para capturar en OBS. Personaliza colores, fuentes y usa Chroma Key. ¡También funciona con comandos del chat!',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'soundboard',
      target: '[data-tour="soundboard"]',
      title: 'Panel de Sonidos 🔊',
      message: 'Efectos de sonido 8-bit generados al instante: redobles, risas, buzzers... ¡También puedes subir tus propios audios!',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', showSoundBoard: true },
    },
    {
      id: 'chat',
      target: '[data-tour="chat"]',
      title: 'Chat en Vivo 💬',
      message: 'Monitorea el chat de Twitch. Los votos se resaltan automáticamente y puedes ver el historial de quién votó qué.',
      position: 'left',
      mascotEmotion: 'happy',
      action: { type: 'navigate', rightTab: 'chat' },
    },
    {
      id: 'analytics',
      target: '[data-tour="analytics"]',
      title: 'Analytics con IA 📈',
      message: 'Análisis de sentimiento, palabras frecuentes y engagement del chat. Conecta OpenAI o Gemini para insights avanzados en tiempo real.',
      position: 'left',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'data', dataSubTab: 'analytics' },
    },
    {
      id: 'gallery',
      target: '[data-tour="gallery"]',
      title: 'Galería de Medios 🖼️',
      message: 'Guarda imágenes para usar como iconos en tus encuestas. Todo se almacena localmente en tu navegador.',
      position: 'right',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'gallery' },
    },
    {
      id: 'finish',
      target: 'body',
      title: '¡Todo listo! 🚀',
      message: '¡Ya conoces TwitchVote! Conecta tu canal de Twitch y empieza a crear encuestas interactivas. Estaré aquí si necesitas ayuda.',
      position: 'center',
      mascotEmotion: 'waving',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
  ],
  en: [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to TwitchVote! 👋',
      message: "I'm your AI Vision assistant. Let me show you all the app features. Let's explore together!",
      position: 'center',
      mascotEmotion: 'waving',
    },
    {
      id: 'poll-creator',
      target: '[data-tour="poll-creator"]',
      title: 'Create Polls 📊',
      message: 'Design polls with colors, icons and images. Use quick presets like "Yes/No" or create custom options with unique vote keys.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'spinner',
      target: '[data-tour="poll-creator"]',
      title: 'Spinner Wheel 🎰',
      message: 'Run epic giveaways! Look for the wheel button 🎡 in the poll creator. Use your options to pick a random winner.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'live-poll',
      target: '[data-tour="live-poll"]',
      title: 'Live Poll 🎯',
      message: 'Real-time votes with animated charts. Viewers vote with +1, +2 or custom keys like +pizza. Vote changes allowed!',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', createDemoPoll: true },
    },
    {
      id: 'moderation',
      target: '[data-tour="moderation"]',
      title: 'Anti-Spam Moderation 🛡️',
      message: 'Protect your polls: vote cooldowns, special weights for subs/followers, and detailed logs of every processed vote.',
      position: 'top',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', showModeration: true },
    },
    {
      id: 'overlay',
      target: '[data-tour="overlay"]',
      title: 'OBS Overlay 🎬',
      message: 'Special window for OBS capture. Customize colors, fonts and use Chroma Key. Also works with chat commands!',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'soundboard',
      target: '[data-tour="soundboard"]',
      title: 'Sound Board 🔊',
      message: 'Instant 8-bit sound effects: drumrolls, laughs, buzzers... You can also upload your own audio files!',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', showSoundBoard: true },
    },
    {
      id: 'chat',
      target: '[data-tour="chat"]',
      title: 'Live Chat 💬',
      message: 'Monitor Twitch chat. Votes are highlighted automatically and you can see the history of who voted what.',
      position: 'left',
      mascotEmotion: 'happy',
      action: { type: 'navigate', rightTab: 'chat' },
    },
    {
      id: 'analytics',
      target: '[data-tour="analytics"]',
      title: 'AI Analytics 📈',
      message: 'Sentiment analysis, frequent words and chat engagement. Connect OpenAI or Gemini for real-time advanced insights.',
      position: 'left',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'data', dataSubTab: 'analytics' },
    },
    {
      id: 'gallery',
      target: '[data-tour="gallery"]',
      title: 'Media Gallery 🖼️',
      message: 'Save images to use as icons in your polls. Everything is stored locally in your browser.',
      position: 'right',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'gallery' },
    },
    {
      id: 'finish',
      target: 'body',
      title: 'All set! 🚀',
      message: "You now know TwitchVote! Connect your Twitch channel and start creating interactive polls. I'll be here if you need help.",
      position: 'center',
      mascotEmotion: 'waving',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
  ],
};

export interface UseDemoTourOptions {
  locale?: 'es' | 'en';
  onStart?: () => void; // Callback when tour starts (e.g., to connect to demo channel)
  onStepChange?: (step: TourStep) => void; // Callback when step changes (for navigation actions)
  onEnd?: () => void; // Callback when tour ends
}

export function useDemoTour(options: UseDemoTourOptions = {}): UseDemoTourReturn {
  const { locale = 'es', onStart, onStepChange, onEnd } = options;
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = TOUR_STEPS[locale];

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
    onStart?.(); // Execute callback (connect to demo channel)
    // Execute first step action after a small delay to let connection happen
    setTimeout(() => {
      if (steps[0]?.action) {
        onStepChange?.(steps[0]);
      }
    }, 500);
  }, [onStart, onStepChange, steps]);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    onEnd?.();
  }, [onEnd]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      // Execute action for the new step
      if (steps[nextStepIndex]?.action) {
        onStepChange?.(steps[nextStepIndex]);
      }
    } else {
      endTour();
    }
  }, [currentStep, steps, endTour, onStepChange]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      if (steps[prevStepIndex]?.action) {
        onStepChange?.(steps[prevStepIndex]);
      }
    }
  }, [currentStep, steps, onStepChange]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
      if (steps[step]?.action) {
        onStepChange?.(steps[step]);
      }
    }
  }, [steps, onStepChange]);

  return {
    isActive,
    currentStep,
    currentStepData: isActive ? steps[currentStep] : null,
    totalSteps: steps.length,
    startTour,
    endTour,
    nextStep,
    prevStep,
    goToStep,
  };
}
