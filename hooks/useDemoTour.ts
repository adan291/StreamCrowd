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
  showPredictions?: boolean;
  showRewards?: boolean;
  showMacros?: boolean;
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
      title: '¡Bienvenido a StreamCrowd! 👋',
      message: 'Soy tu asistente AI Vision. Te mostraré todas las herramientas para hacer tu stream más interactivo. ¡Vamos!',
      position: 'center',
      mascotEmotion: 'waving',
    },
    {
      id: 'poll-creator',
      target: '[data-tour="poll-creator"]',
      title: 'Encuestas Interactivas 📊',
      message: 'Crea encuestas con colores, iconos e imágenes. Presets rápidos (Sí/No, Rating) o personaliza todo. El chat vota con +1, +pizza, etc.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'live-poll',
      target: '[data-tour="live-poll"]',
      title: 'Votos en Tiempo Real 🎯',
      message: 'Gráficos animados que se actualizan al instante. Moderación anti-spam, pesos para subs, y logs de cada voto.',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', createDemoPoll: true },
    },
    {
      id: 'giveaway',
      target: '[data-tour="giveaway"]',
      title: 'Centro de Sorteos 🎁',
      message: 'Sorteos por viewers activos, palabra clave o subs. Configura entradas por tier, bits, donaciones. ¡Ruleta animada incluida!',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'giveaway' },
    },
    {
      id: 'judge-panel',
      target: '[data-tour="judge-panel"]',
      title: 'Panel de Jueces ⚖️',
      message: 'Organiza competiciones con múltiples jueces y criterios. Votación pública del chat + puntuaciones de jueces. Perfecto para concursos.',
      position: 'bottom',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'judge' },
    },
    {
      id: 'predictions',
      target: '[data-tour="predictions"]',
      title: 'Predicciones de Twitch 🔮',
      message: 'Crea predicciones nativas de Twitch. Los viewers apuestan puntos de canal. Integración completa con la API oficial.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'platforms', showPredictions: true },
    },
    {
      id: 'rewards',
      target: '[data-tour="rewards"]',
      title: 'Recompensas de Canal 🎖️',
      message: 'Gestiona las recompensas de puntos de canal. Crea nuevas, edita existentes, y ve los canjes en tiempo real.',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'platforms', showRewards: true },
    },
    {
      id: 'games',
      target: '[data-tour="stream-games"]',
      title: 'Juegos de Stream 🎮',
      message: 'Mini-juegos para tu audiencia: trivia, adivinanzas, y más. El chat participa directamente con comandos.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'games' },
    },
    {
      id: 'soundboard',
      target: '[data-tour="soundboard"]',
      title: 'Panel de Sonidos 🔊',
      message: 'Efectos 8-bit instantáneos: redobles, risas, buzzers. Sube tus propios audios o genera nuevos con un clic.',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', showSoundBoard: true },
    },
    {
      id: 'obs',
      target: '[data-tour="obs-control"]',
      title: 'Integración OBS 🎬',
      message: 'Overlays personalizables con Chroma Key. Control de escenas, fuentes y más. Conexión WebSocket automática.',
      position: 'bottom',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'obs' },
    },
    {
      id: 'chat',
      target: '[data-tour="chat"]',
      title: 'Chat en Vivo 💬',
      message: 'Monitorea el chat con votos resaltados. Historial de quién votó qué. Funciona con múltiples canales.',
      position: 'left',
      mascotEmotion: 'happy',
      action: { type: 'navigate', rightTab: 'chat' },
    },
    {
      id: 'analytics',
      target: '[data-tour="analytics"]',
      title: 'Analytics con IA 📈',
      message: 'Análisis de sentimiento, palabras frecuentes, engagement. Conecta OpenAI o Gemini para insights avanzados.',
      position: 'left',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'data', dataSubTab: 'analytics' },
    },
    {
      id: 'finish',
      target: 'body',
      title: '¡Listo para streamear! 🚀',
      message: '¡Ya conoces StreamCrowd! Conecta tu canal y empieza a crear experiencias interactivas. Estaré aquí si necesitas ayuda.',
      position: 'center',
      mascotEmotion: 'waving',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
  ],
  en: [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to StreamCrowd! 👋',
      message: "I'm your AI Vision assistant. Let me show you all the tools to make your stream more interactive. Let's go!",
      position: 'center',
      mascotEmotion: 'waving',
    },
    {
      id: 'poll-creator',
      target: '[data-tour="poll-creator"]',
      title: 'Interactive Polls 📊',
      message: 'Create polls with colors, icons and images. Quick presets (Yes/No, Rating) or customize everything. Chat votes with +1, +pizza, etc.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'live-poll',
      target: '[data-tour="live-poll"]',
      title: 'Real-Time Votes 🎯',
      message: 'Animated charts that update instantly. Anti-spam moderation, sub weights, and logs for every vote.',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', createDemoPoll: true },
    },
    {
      id: 'giveaway',
      target: '[data-tour="giveaway"]',
      title: 'Giveaway Hub 🎁',
      message: 'Raffles by active viewers, keyword or subs. Configure entries by tier, bits, donations. Animated wheel included!',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'giveaway' },
    },
    {
      id: 'judge-panel',
      target: '[data-tour="judge-panel"]',
      title: 'Judge Panel ⚖️',
      message: 'Organize competitions with multiple judges and criteria. Public chat voting + judge scores. Perfect for contests.',
      position: 'bottom',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'judge' },
    },
    {
      id: 'predictions',
      target: '[data-tour="predictions"]',
      title: 'Twitch Predictions 🔮',
      message: 'Create native Twitch predictions. Viewers bet channel points. Full integration with the official API.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'platforms', showPredictions: true },
    },
    {
      id: 'rewards',
      target: '[data-tour="rewards"]',
      title: 'Channel Rewards 🎖️',
      message: 'Manage channel point rewards. Create new ones, edit existing, and see redemptions in real-time.',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'platforms', showRewards: true },
    },
    {
      id: 'games',
      target: '[data-tour="stream-games"]',
      title: 'Stream Games 🎮',
      message: 'Mini-games for your audience: trivia, guessing games, and more. Chat participates directly with commands.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'games' },
    },
    {
      id: 'soundboard',
      target: '[data-tour="soundboard"]',
      title: 'Sound Board 🔊',
      message: 'Instant 8-bit effects: drumrolls, laughs, buzzers. Upload your own audio or generate new ones with a click.',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', showSoundBoard: true },
    },
    {
      id: 'obs',
      target: '[data-tour="obs-control"]',
      title: 'OBS Integration 🎬',
      message: 'Customizable overlays with Chroma Key. Scene control, sources and more. Automatic WebSocket connection.',
      position: 'bottom',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'obs' },
    },
    {
      id: 'chat',
      target: '[data-tour="chat"]',
      title: 'Live Chat 💬',
      message: 'Monitor chat with highlighted votes. History of who voted what. Works with multiple channels.',
      position: 'left',
      mascotEmotion: 'happy',
      action: { type: 'navigate', rightTab: 'chat' },
    },
    {
      id: 'analytics',
      target: '[data-tour="analytics"]',
      title: 'AI Analytics 📈',
      message: 'Sentiment analysis, frequent words, engagement. Connect OpenAI or Gemini for advanced insights.',
      position: 'left',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'data', dataSubTab: 'analytics' },
    },
    {
      id: 'finish',
      target: 'body',
      title: 'Ready to stream! 🚀',
      message: "You now know StreamCrowd! Connect your channel and start creating interactive experiences. I'll be here if you need help.",
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
