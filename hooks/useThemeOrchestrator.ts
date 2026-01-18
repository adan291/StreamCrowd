import { useEffect, useCallback, useState } from 'react';
// Temporarily commented out due to build issue - will be fixed in follow-up
// import { useOverlaySync } from './useOverlaySync';

export type MoodType = 'hype' | 'calm' | 'toxic' | 'confused' | 'neutral';

export interface ThemeConfig {
  mood: MoodType;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    border: string;
  };
  effects: {
    animation: string;
    intensity: number;
    duration: number;
  };
  filters: {
    blur?: number;
    brightness?: number;
    contrast?: number;
    saturate?: number;
    hue?: number;
  };
}

interface UseThemeOrchestratorReturn {
  currentMood: MoodType;
  currentTheme: ThemeConfig;
  setMood: (mood: MoodType, duration?: number) => void;
  resetTheme: () => void;
  applyCustomTheme: (theme: Partial<ThemeConfig>) => void;
  isTransitioning: boolean;
}

/**
 * Cambio de UI dinámico - Recibe el mood detectado por el Agente chat-brain
 * 
 * Misión: Recibir el mood detectado por el Agente chat-brain
 * Acción: Cambiar las variables de CSS de Tailwind o activar filtros de color 
 *         en el Overlay (ej: poner el borde de la cámara en rojo si hay tensión)
 */
export function useThemeOrchestrator(channelId?: string): UseThemeOrchestratorReturn {
  const { state, updateState } = useOverlaySync(channelId);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentMood, setCurrentMood] = useState<MoodType>('neutral');

  // Configuraciones de tema por mood
  const themeConfigs: Record<MoodType, ThemeConfig> = {
    hype: {
      mood: 'hype',
      colors: {
        primary: '#ff6b35',
        secondary: '#f7931e',
        accent: '#ffcc02',
        background: 'rgba(255, 107, 53, 0.1)',
        border: '#ff6b35'
      },
      effects: {
        animation: 'pulse',
        intensity: 1.2,
        duration: 500
      },
      filters: {
        brightness: 1.1,
        contrast: 1.2,
        saturate: 1.3
      }
    },
    calm: {
      mood: 'calm',
      colors: {
        primary: '#4a90e2',
        secondary: '#7bb3f0',
        accent: '#a8d0f0',
        background: 'rgba(74, 144, 226, 0.05)',
        border: '#4a90e2'
      },
      effects: {
        animation: 'fade',
        intensity: 0.8,
        duration: 1000
      },
      filters: {
        brightness: 0.95,
        contrast: 0.9,
        saturate: 0.8
      }
    },
    toxic: {
      mood: 'toxic',
      colors: {
        primary: '#e74c3c',
        secondary: '#c0392b',
        accent: '#ff4757',
        background: 'rgba(231, 76, 60, 0.15)',
        border: '#e74c3c'
      },
      effects: {
        animation: 'shake',
        intensity: 1.5,
        duration: 300
      },
      filters: {
        brightness: 0.9,
        contrast: 1.3,
        saturate: 1.4,
        hue: 10
      }
    },
    confused: {
      mood: 'confused',
      colors: {
        primary: '#9b59b6',
        secondary: '#8e44ad',
        accent: '#bb6bd9',
        background: 'rgba(155, 89, 182, 0.08)',
        border: '#9b59b6'
      },
      effects: {
        animation: 'wobble',
        intensity: 1.0,
        duration: 800
      },
      filters: {
        brightness: 1.0,
        contrast: 1.1,
        saturate: 1.1,
        hue: -10
      }
    },
    neutral: {
      mood: 'neutral',
      colors: {
        primary: '#6c757d',
        secondary: '#495057',
        accent: '#adb5bd',
        background: 'rgba(108, 117, 125, 0.03)',
        border: '#6c757d'
      },
      effects: {
        animation: 'none',
        intensity: 1.0,
        duration: 500
      },
      filters: {
        brightness: 1.0,
        contrast: 1.0,
        saturate: 1.0
      }
    }
  };

  const currentTheme = themeConfigs[currentMood];

  // Aplicar tema al DOM
  const applyThemeToDOM = useCallback((theme: ThemeConfig) => {
    const root = document.documentElement;
    
    // Aplicar variables CSS
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-border', theme.colors.border);
    
    // Aplicar filtros CSS
    const filterString = Object.entries(theme.filters)
      .map(([key, value]) => {
        if (value === undefined) return '';
        switch (key) {
          case 'blur': return `blur(${value}px)`;
          case 'brightness': return `brightness(${value})`;
          case 'contrast': return `contrast(${value})`;
          case 'saturate': return `saturate(${value})`;
          case 'hue': return `hue-rotate(${value}deg)`;
          default: return '';
        }
      })
      .filter(Boolean)
      .join(' ');
    
    // Aplicar filtros a overlays específicos
    const overlayElements = document.querySelectorAll('[data-overlay]');
    overlayElements.forEach(element => {
      (element as HTMLElement).style.filter = filterString;
    });

    // Aplicar animaciones
    if (theme.effects.animation !== 'none') {
      root.style.setProperty('--animation-name', theme.effects.animation);
      root.style.setProperty('--animation-duration', `${theme.effects.duration}ms`);
      root.style.setProperty('--animation-intensity', theme.effects.intensity.toString());
    }
  }, []);

  const setMood = useCallback(async (mood: MoodType, duration = 5000) => {
    if (mood === currentMood) return;

    setIsTransitioning(true);
    setCurrentMood(mood);

    try {
      // Actualizar estado en Firebase para sincronización
      await updateState({
        mood,
        theme: themeConfigs[mood].colors.primary
      });

      // Aplicar tema inmediatamente
      applyThemeToDOM(themeConfigs[mood]);

      // Auto-reset después de la duración especificada (excepto para neutral)
      if (mood !== 'neutral' && duration > 0) {
        setTimeout(() => {
          setMood('neutral', 0);
        }, duration);
      }

    } catch (error) {
      console.error('Failed to update mood:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [currentMood, updateState, applyThemeToDOM, themeConfigs]);

  const resetTheme = useCallback(() => {
    setMood('neutral', 0);
  }, [setMood]);

  const applyCustomTheme = useCallback((customTheme: Partial<ThemeConfig>) => {
    const mergedTheme = {
      ...currentTheme,
      ...customTheme,
      colors: {
        ...currentTheme.colors,
        ...customTheme.colors
      },
      effects: {
        ...currentTheme.effects,
        ...customTheme.effects
      },
      filters: {
        ...currentTheme.filters,
        ...customTheme.filters
      }
    };

    applyThemeToDOM(mergedTheme);
  }, [currentTheme, applyThemeToDOM]);

  // Escuchar cambios de mood desde Firebase (otros dispositivos)
  useEffect(() => {
    if (state.mood && state.mood !== currentMood) {
      setCurrentMood(state.mood);
      applyThemeToDOM(themeConfigs[state.mood]);
    }
  }, [state.mood, currentMood, applyThemeToDOM, themeConfigs]);

  // Aplicar tema inicial
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, []);

  return {
    currentMood,
    currentTheme,
    setMood,
    resetTheme,
    applyCustomTheme,
    isTransitioning
  };
}