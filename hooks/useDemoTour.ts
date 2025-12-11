/**
 * useDemoTour Hook
 * 
 * Manages a guided demo tour through the application
 * with AI Vision mascot as the guide.
 */

import { useState, useCallback } from 'react';

export interface TourStepAction {
  type: 'navigate';
  leftTab?: 'panel' | 'gallery' | 'data';
  dataSubTab?: 'activity' | 'analytics';
  rightTab?: 'chat' | 'stream';
  showModeration?: boolean;
  createDemoPoll?: boolean;
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
      message: 'Soy tu asistente AI Vision. Conectando a un canal de demo para mostrarte todas las funciones. ¡Vamos a explorar juntos!',
      position: 'center',
      mascotEmotion: 'waving',
    },
    {
      id: 'poll-creator',
      target: '[data-tour="poll-creator"]',
      title: 'Crear Encuestas 📊',
      message: 'Diseña encuestas personalizadas con múltiples opciones, colores, iconos e imágenes. Usa los presets rápidos o crea las tuyas desde cero.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'panel' },
    },
    {
      id: 'live-poll',
      target: '[data-tour="live-poll"]',
      title: 'Encuesta en Vivo 🎯',
      message: 'Aquí verás los votos en tiempo real con gráficos animados. Los viewers votan escribiendo +1, +2, etc. en el chat.',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'panel', createDemoPoll: true },
    },
    {
      id: 'moderation',
      target: '[data-tour="moderation"]',
      title: 'Moderación de Votos 🛡️',
      message: 'Configura reglas anti-spam: edad mínima de cuenta, cooldowns, y pesos de voto para subs y followers. ¡Mantén tus encuestas justas!',
      position: 'top',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'panel', showModeration: true },
    },
    {
      id: 'overlay',
      target: '[data-tour="overlay"]',
      title: 'Overlay para OBS 🎬',
      message: 'Abre una ventana especial para capturar en OBS. Usa Chroma Key con el fondo verde para integrarlo en tu stream.',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'panel' },
    },
    {
      id: 'chat',
      target: '[data-tour="chat"]',
      title: 'Chat en Vivo 💬',
      message: 'Observa el chat de Twitch en tiempo real. Los votos se marcan automáticamente y puedes ver quién ya votó.',
      position: 'left',
      mascotEmotion: 'happy',
      action: { type: 'navigate', rightTab: 'chat' },
    },
    {
      id: 'analytics',
      target: '[data-tour="analytics"]',
      title: 'Analytics del Stream 📈',
      message: 'Analiza el sentimiento del chat, palabras frecuentes y engagement. Conecta una API de IA para insights más avanzados.',
      position: 'left',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'data', dataSubTab: 'analytics' },
    },
    {
      id: 'gallery',
      target: '[data-tour="gallery"]',
      title: 'Galería de Medios 🖼️',
      message: 'Guarda imágenes para usar como iconos en tus encuestas. Se almacenan localmente en tu navegador.',
      position: 'right',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'gallery' },
    },
    {
      id: 'finish',
      target: 'body',
      title: '¡Listo para empezar! 🚀',
      message: '¡Ya conoces todas las funciones! Conecta tu canal y crea tu primera encuesta. Estaré aquí si necesitas ayuda.',
      position: 'center',
      mascotEmotion: 'waving',
      action: { type: 'navigate', leftTab: 'panel' },
    },
  ],
  en: [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to TwitchVote! 👋',
      message: "I'm your AI Vision assistant. Connecting to a demo channel to show you all the features. Let's explore together!",
      position: 'center',
      mascotEmotion: 'waving',
    },
    {
      id: 'poll-creator',
      target: '[data-tour="poll-creator"]',
      title: 'Create Polls 📊',
      message: 'Design custom polls with multiple options, colors, icons and images. Use quick presets or create your own from scratch.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'panel' },
    },
    {
      id: 'live-poll',
      target: '[data-tour="live-poll"]',
      title: 'Live Poll 🎯',
      message: 'Watch votes in real-time with animated charts. Viewers vote by typing +1, +2, etc. in chat.',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'panel', createDemoPoll: true },
    },
    {
      id: 'moderation',
      target: '[data-tour="moderation"]',
      title: 'Vote Moderation 🛡️',
      message: 'Configure anti-spam rules: minimum account age, cooldowns, and vote weights for subs and followers. Keep your polls fair!',
      position: 'top',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'panel', showModeration: true },
    },
    {
      id: 'overlay',
      target: '[data-tour="overlay"]',
      title: 'OBS Overlay 🎬',
      message: 'Open a special window to capture in OBS. Use Chroma Key with the green background to integrate it into your stream.',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'panel' },
    },
    {
      id: 'chat',
      target: '[data-tour="chat"]',
      title: 'Live Chat 💬',
      message: 'Watch Twitch chat in real-time. Votes are automatically marked and you can see who already voted.',
      position: 'left',
      mascotEmotion: 'happy',
      action: { type: 'navigate', rightTab: 'chat' },
    },
    {
      id: 'analytics',
      target: '[data-tour="analytics"]',
      title: 'Stream Analytics 📈',
      message: 'Analyze chat sentiment, frequent words and engagement. Connect an AI API for more advanced insights.',
      position: 'left',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'data', dataSubTab: 'analytics' },
    },
    {
      id: 'gallery',
      target: '[data-tour="gallery"]',
      title: 'Media Gallery 🖼️',
      message: 'Save images to use as icons in your polls. They are stored locally in your browser.',
      position: 'right',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'gallery' },
    },
    {
      id: 'finish',
      target: 'body',
      title: 'Ready to start! 🚀',
      message: "You now know all the features! Connect your channel and create your first poll. I'll be here if you need help.",
      position: 'center',
      mascotEmotion: 'waving',
      action: { type: 'navigate', leftTab: 'panel' },
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
