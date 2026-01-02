/**
 * useOnboarding Hook
 * 
 * Manages the interactive onboarding tutorial system.
 * Handles first visit detection, step progression, progress persistence,
 * skip/reset functionality, and contextual tips.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  OnboardingStep,
  OnboardingProgress,
  OnboardingStorage,
  ContextualTip,
  UseOnboardingReturn,
  DEFAULT_ONBOARDING_STORAGE,
  DEFAULT_ONBOARDING_PROGRESS,
  ONBOARDING_STORAGE_KEY,
} from '../types/onboarding';

/**
 * Tutorial steps definition - bilingual support
 */
const ONBOARDING_STEPS: Record<'es' | 'en', OnboardingStep[]> = {
  es: [
    {
      id: 'welcome',
      target: 'body',
      title: '¡Bienvenido a StreamCrowd! 👋',
      message: 'Soy tu asistente AI Vision. Te guiaré paso a paso por todas las funciones de la app. ¡Puedes interactuar con los elementos destacados!',
      position: 'center',
      mascotEmotion: 'waving',
    },
    {
      id: 'connection',
      target: '[data-tour="connection"]',
      title: 'Conectar tu Canal 🔗',
      message: 'Primero, conecta tu canal de Twitch. Puedes usar OAuth (recomendado) o un token manual.',
      position: 'bottom',
      mascotEmotion: 'happy',
      requiresInteraction: false,
    },
    {
      id: 'poll-creator',
      target: '[data-tour="poll-creator"]',
      title: 'Crear Encuestas 📊',
      message: 'Diseña encuestas con colores, iconos e imágenes. Usa presets rápidos o crea opciones personalizadas.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'live-poll',
      target: '[data-tour="live-poll"]',
      title: 'Encuesta en Vivo 🎯',
      message: 'Los viewers votan con +1, +2 o claves personalizadas. ¡Los votos se actualizan en tiempo real!',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', createDemoPoll: true },
    },
    {
      id: 'moderation',
      target: '[data-tour="moderation"]',
      title: 'Moderación Anti-Spam 🛡️',
      message: 'Configura cooldowns, pesos de voto para subs/followers, y revisa logs detallados.',
      position: 'top',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', showModeration: true },
    },
    {
      id: 'overlay',
      target: '[data-tour="overlay"]',
      title: 'Overlay para OBS 🎬',
      message: 'Captura la encuesta en OBS. Personaliza colores, fuentes y usa Chroma Key.',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'games',
      target: '[data-tour="games"]',
      title: 'Juegos Interactivos 🎮',
      message: 'Minijuegos para tu stream: Pium Ball, Ruleta Casino, Pesca, Trivia y más.',
      position: 'right',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'games' },
    },
    {
      id: 'chat',
      target: '[data-tour="chat"]',
      title: 'Chat en Vivo 💬',
      message: 'Monitorea el chat de Twitch. Los votos se resaltan automáticamente.',
      position: 'left',
      mascotEmotion: 'happy',
      action: { type: 'navigate', rightTab: 'chat' },
    },
    {
      id: 'analytics',
      target: '[data-tour="analytics"]',
      title: 'Analytics con IA 📈',
      message: 'Análisis de sentimiento, palabras frecuentes y engagement. Conecta OpenAI o Gemini para insights avanzados.',
      position: 'left',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'data', dataSubTab: 'analytics' },
    },
    {
      id: 'finish',
      target: 'body',
      title: '¡Todo listo! 🚀',
      message: '¡Ya conoces StreamCrowd! Conecta tu canal y empieza a crear encuestas interactivas. Puedes reiniciar este tutorial desde la configuración.',
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
      message: "I'm your AI Vision assistant. I'll guide you step by step through all the app features. You can interact with highlighted elements!",
      position: 'center',
      mascotEmotion: 'waving',
    },
    {
      id: 'connection',
      target: '[data-tour="connection"]',
      title: 'Connect Your Channel 🔗',
      message: 'First, connect your Twitch channel. You can use OAuth (recommended) or a manual token.',
      position: 'bottom',
      mascotEmotion: 'happy',
      requiresInteraction: false,
    },
    {
      id: 'poll-creator',
      target: '[data-tour="poll-creator"]',
      title: 'Create Polls 📊',
      message: 'Design polls with colors, icons and images. Use quick presets or create custom options.',
      position: 'bottom',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'live-poll',
      target: '[data-tour="live-poll"]',
      title: 'Live Poll 🎯',
      message: 'Viewers vote with +1, +2 or custom keys. Votes update in real-time!',
      position: 'bottom',
      mascotEmotion: 'happy',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', createDemoPoll: true },
    },
    {
      id: 'moderation',
      target: '[data-tour="moderation"]',
      title: 'Anti-Spam Moderation 🛡️',
      message: 'Configure cooldowns, vote weights for subs/followers, and review detailed logs.',
      position: 'top',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll', showModeration: true },
    },
    {
      id: 'overlay',
      target: '[data-tour="overlay"]',
      title: 'OBS Overlay 🎬',
      message: 'Capture the poll in OBS. Customize colors, fonts and use Chroma Key.',
      position: 'top',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
    {
      id: 'games',
      target: '[data-tour="games"]',
      title: 'Interactive Games 🎮',
      message: 'Mini-games for your stream: Pium Ball, Casino Roulette, Fishing, Trivia and more.',
      position: 'right',
      mascotEmotion: 'excited',
      action: { type: 'navigate', leftTab: 'games' },
    },
    {
      id: 'chat',
      target: '[data-tour="chat"]',
      title: 'Live Chat 💬',
      message: 'Monitor Twitch chat. Votes are highlighted automatically.',
      position: 'left',
      mascotEmotion: 'happy',
      action: { type: 'navigate', rightTab: 'chat' },
    },
    {
      id: 'analytics',
      target: '[data-tour="analytics"]',
      title: 'AI Analytics 📈',
      message: 'Sentiment analysis, frequent words and engagement. Connect OpenAI or Gemini for advanced insights.',
      position: 'left',
      mascotEmotion: 'thinking',
      action: { type: 'navigate', leftTab: 'data', dataSubTab: 'analytics' },
    },
    {
      id: 'finish',
      target: 'body',
      title: 'All set! 🚀',
      message: "You now know StreamCrowd! Connect your channel and start creating interactive polls. You can restart this tutorial from settings.",
      position: 'center',
      mascotEmotion: 'waving',
      action: { type: 'navigate', leftTab: 'dynamics', dynamicsView: 'poll' },
    },
  ],
};

/**
 * Contextual tips definition - bilingual support
 */
const CONTEXTUAL_TIPS: Record<'es' | 'en', ContextualTip[]> = {
  es: [
    {
      id: 'first-poll',
      context: 'poll-created',
      title: '¡Primera encuesta! 🎉',
      message: 'Recuerda que puedes guardarla como plantilla para usarla después.',
      dismissable: true,
    },
    {
      id: 'moderation-tip',
      context: 'high-vote-volume',
      title: 'Muchos votos entrando 📊',
      message: 'Considera activar el cooldown de moderación para evitar spam.',
      target: '[data-tour="moderation"]',
      position: 'top',
      dismissable: true,
    },
    {
      id: 'overlay-tip',
      context: 'poll-active',
      title: 'Encuesta activa 🎬',
      message: '¿Sabías que puedes mostrar la encuesta en OBS? Abre el overlay.',
      target: '[data-tour="overlay"]',
      position: 'top',
      dismissable: true,
    },
    {
      id: 'keyboard-shortcuts',
      context: 'repeated-action',
      title: 'Atajos de teclado ⌨️',
      message: 'Usa Ctrl+P para crear encuestas rápidas y Ctrl+S para guardar.',
      dismissable: true,
    },
  ],
  en: [
    {
      id: 'first-poll',
      context: 'poll-created',
      title: 'First poll! 🎉',
      message: 'Remember you can save it as a template for later use.',
      dismissable: true,
    },
    {
      id: 'moderation-tip',
      context: 'high-vote-volume',
      title: 'High vote volume 📊',
      message: 'Consider enabling moderation cooldown to prevent spam.',
      target: '[data-tour="moderation"]',
      position: 'top',
      dismissable: true,
    },
    {
      id: 'overlay-tip',
      context: 'poll-active',
      title: 'Poll active 🎬',
      message: 'Did you know you can show the poll in OBS? Open the overlay.',
      target: '[data-tour="overlay"]',
      position: 'top',
      dismissable: true,
    },
    {
      id: 'keyboard-shortcuts',
      context: 'repeated-action',
      title: 'Keyboard shortcuts ⌨️',
      message: 'Use Ctrl+P for quick polls and Ctrl+S to save.',
      dismissable: true,
    },
  ],
};

export interface UseOnboardingOptions {
  locale?: 'es' | 'en';
  onStepChange?: (step: OnboardingStep) => void;
  onComplete?: () => void;
  onSkip?: () => void;
}

/**
 * Load onboarding storage from localStorage
 */
function loadStorage(): OnboardingStorage {
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate version and structure
      if (parsed.version === 1 && parsed.progress) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_ONBOARDING_STORAGE;
}

/**
 * Save onboarding storage to localStorage
 */
function saveStorage(storage: OnboardingStorage): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // Ignore storage errors
  }
}

export function useOnboarding(options: UseOnboardingOptions = {}): UseOnboardingReturn {
  const { locale = 'es', onStepChange, onComplete, onSkip } = options;
  
  const [storage, setStorage] = useState<OnboardingStorage>(() => loadStorage());
  const [isActive, setIsActive] = useState(false);
  
  const steps = useMemo(() => ONBOARDING_STEPS[locale], [locale]);
  const tips = useMemo(() => CONTEXTUAL_TIPS[locale], [locale]);
  
  // Persist storage changes
  useEffect(() => {
    saveStorage(storage);
  }, [storage]);
  
  // Check if first visit
  const isFirstVisit = !storage.hasSeenWelcome;
  
  // Get current step data
  const currentStep = useMemo(() => {
    if (!isActive) return null;
    const stepIndex = storage.progress.currentStep;
    return steps[stepIndex] || null;
  }, [isActive, storage.progress.currentStep, steps]);
  
  // Start the tutorial
  const startTutorial = useCallback(() => {
    const now = Date.now();
    setStorage(prev => ({
      ...prev,
      hasSeenWelcome: true,
      progress: {
        ...DEFAULT_ONBOARDING_PROGRESS,
        startedAt: now,
        lastActiveAt: now,
      },
    }));
    setIsActive(true);
    
    // Trigger step change for first step
    if (steps[0]?.action) {
      onStepChange?.(steps[0]);
    }
  }, [steps, onStepChange]);
  
  // Complete current step and advance
  const completeStep = useCallback((stepId: string) => {
    if (!isActive) return;
    
    const currentIndex = storage.progress.currentStep;
    const currentStepData = steps[currentIndex];
    
    // Verify step ID matches
    if (currentStepData?.id !== stepId) return;
    
    const now = Date.now();
    const nextIndex = currentIndex + 1;
    const isLastStep = nextIndex >= steps.length;
    
    setStorage(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        currentStep: isLastStep ? currentIndex : nextIndex,
        completedSteps: [...prev.progress.completedSteps, stepId],
        lastActiveAt: now,
        isCompleted: isLastStep,
      },
    }));
    
    if (isLastStep) {
      setIsActive(false);
      onComplete?.();
    } else {
      // Trigger step change for next step
      const nextStep = steps[nextIndex];
      if (nextStep?.action) {
        onStepChange?.(nextStep);
      }
    }
  }, [isActive, storage.progress.currentStep, steps, onStepChange, onComplete]);
  
  // Skip the tutorial
  const skipTutorial = useCallback(() => {
    const now = Date.now();
    setStorage(prev => ({
      ...prev,
      hasSeenWelcome: true,
      progress: {
        ...prev.progress,
        lastActiveAt: now,
        wasSkipped: true,
      },
    }));
    setIsActive(false);
    onSkip?.();
  }, [onSkip]);
  
  // Reset the tutorial
  const resetTutorial = useCallback(() => {
    setStorage(prev => ({
      ...prev,
      hasSeenWelcome: false,
      progress: DEFAULT_ONBOARDING_PROGRESS,
    }));
    setIsActive(false);
  }, []);
  
  // Resume from last active step
  const resumeTutorial = useCallback(() => {
    if (storage.progress.isCompleted || storage.progress.wasSkipped) {
      // If completed or skipped, start fresh
      startTutorial();
      return;
    }
    
    const now = Date.now();
    setStorage(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        lastActiveAt: now,
      },
    }));
    setIsActive(true);
    
    // Trigger step change for current step
    const currentStepData = steps[storage.progress.currentStep];
    if (currentStepData?.action) {
      onStepChange?.(currentStepData);
    }
  }, [storage.progress, steps, onStepChange, startTutorial]);
  
  // Show contextual tip by context
  const showContextualTip = useCallback((context: string): ContextualTip | null => {
    if (!storage.preferences.showContextualTips) return null;
    
    const tip = tips.find(t => t.context === context);
    if (!tip) return null;
    
    // Check if already dismissed
    if (storage.dismissedTips.includes(tip.id)) return null;
    
    return tip;
  }, [tips, storage.preferences.showContextualTips, storage.dismissedTips]);
  
  // Dismiss a tip permanently
  const dismissTip = useCallback((tipId: string) => {
    setStorage(prev => ({
      ...prev,
      dismissedTips: [...prev.dismissedTips, tipId],
    }));
  }, []);
  
  // Check if tip is dismissed
  const isTipDismissed = useCallback((tipId: string): boolean => {
    return storage.dismissedTips.includes(tipId);
  }, [storage.dismissedTips]);
  
  // Toggle contextual tips preference
  const setShowContextualTips = useCallback((show: boolean) => {
    setStorage(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        showContextualTips: show,
      },
    }));
  }, []);
  
  return {
    isFirstVisit,
    isActive,
    currentStep,
    currentStepIndex: storage.progress.currentStep,
    totalSteps: steps.length,
    progress: storage.progress,
    startTutorial,
    completeStep,
    skipTutorial,
    resetTutorial,
    resumeTutorial,
    showContextualTip,
    dismissTip,
    isTipDismissed,
    setShowContextualTips,
  };
}
