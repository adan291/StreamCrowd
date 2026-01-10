/**
 * ModeSelector Component
 * Visual card-based selector for giveaway modes with animations
 * 
 * Mejoras UI/UX:
 * - Animaciones de hover más suaves
 * - Mejor feedback de selección
 * - Accesibilidad mejorada (keyboard nav, aria)
 * - Indicadores visuales claros
 */

import React, { useCallback } from 'react';
import { Users, MessageSquare, Heart, LucideIcon } from 'lucide-react';
import type { RaffleMode } from './types';

// ============================================
// TYPES
// ============================================

export interface ModeSelectorProps {
  /** Currently selected mode */
  value: RaffleMode;
  /** Callback when mode changes */
  onChange: (mode: RaffleMode) => void;
  /** Disable mode selection */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Show detailed descriptions */
  showDescriptions?: boolean;
}

interface ModeConfig {
  id: RaffleMode;
  icon: LucideIcon;
  title: string;
  shortDescription: string;
  longDescription: string;
  gradient: {
    from: string;
    to: string;
    ring: string;
    shadow: string;
    bg: string;
  };
  emoji: string;
}

// ============================================
// MODE CONFIGURATIONS
// ============================================

const MODES: ModeConfig[] = [
  {
    id: 'viewers',
    icon: Users,
    title: 'Viewers',
    shortDescription: 'Todos los viewers del chat',
    longDescription: 'Sorteo entre todos los usuarios que escriban en el chat durante el tiempo del sorteo.',
    gradient: {
      from: 'from-purple-500',
      to: 'to-indigo-600',
      ring: 'ring-purple-400',
      shadow: 'shadow-purple-500/30',
      bg: 'bg-purple-500',
    },
    emoji: '👥',
  },
  {
    id: 'keyword',
    icon: MessageSquare,
    title: 'Keyword',
    shortDescription: 'Por palabra clave',
    longDescription: 'Los usuarios participan escribiendo una palabra clave específica.',
    gradient: {
      from: 'from-cyan-500',
      to: 'to-blue-600',
      ring: 'ring-cyan-400',
      shadow: 'shadow-cyan-500/30',
      bg: 'bg-cyan-500',
    },
    emoji: '💬',
  },
  {
    id: 'subs',
    icon: Heart,
    title: 'Subs',
    shortDescription: 'Solo suscriptores',
    longDescription: 'Sorteo exclusivo para suscriptores con pesos por tier.',
    gradient: {
      from: 'from-pink-500',
      to: 'to-rose-600',
      ring: 'ring-pink-400',
      shadow: 'shadow-pink-500/30',
      bg: 'bg-pink-500',
    },
    emoji: '💖',
  },
];

// ============================================
// SIZE VARIANTS
// ============================================

const sizeClasses = {
  sm: {
    card: 'p-2.5',
    iconContainer: 'p-2',
    icon: 18,
    title: 'text-sm',
    description: 'text-xs',
    gap: 'gap-2',
    gridGap: 'gap-2',
  },
  md: {
    card: 'p-3',
    iconContainer: 'p-2.5',
    icon: 22,
    title: 'text-base',
    description: 'text-sm',
    gap: 'gap-3',
    gridGap: 'gap-3',
  },
  lg: {
    card: 'p-4',
    iconContainer: 'p-3',
    icon: 26,
    title: 'text-lg',
    description: 'text-base',
    gap: 'gap-4',
    gridGap: 'gap-4',
  },
};

// ============================================
// COMPONENT
// ============================================

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  size = 'md',
  direction = 'vertical',
  showDescriptions = true,
}) => {
  const sizes = sizeClasses[size];
  const isHorizontal = direction === 'horizontal';

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, mode: RaffleMode) => {
    if (disabled) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(mode);
    }
  }, [disabled, onChange]);

  return (
    <div
      className={`
        grid ${sizes.gridGap}
        ${isHorizontal ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}
        ${className}
      `}
      role="radiogroup"
      aria-label="Tipo de sorteo"
    >
      {MODES.map((mode) => {
        const isSelected = value === mode.id;
        const Icon = mode.icon;

        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${mode.title}: ${mode.shortDescription}`}
            onClick={() => !disabled && onChange(mode.id)}
            onKeyDown={(e) => handleKeyDown(e, mode.id)}
            disabled={disabled}
            className={`
              group relative overflow-hidden
              ${sizes.card} rounded-xl font-medium
              transition-all duration-300 ease-out
              ${isSelected
                ? `bg-gradient-to-br ${mode.gradient.from} ${mode.gradient.to} text-white ring-2 ${mode.gradient.ring} ${mode.gradient.shadow} shadow-lg`
                : `bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 
                   hover:bg-zinc-50 dark:hover:bg-zinc-750 hover:shadow-md`
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isHorizontal ? 'flex flex-col items-center text-center' : 'flex items-center gap-3'}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500
            `}
          >
            {/* Background shimmer effect on hover */}
            {!isSelected && !disabled && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                           translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
                aria-hidden="true"
              />
            )}

            {/* Icon container */}
            <div className={`
              relative z-10 flex-shrink-0
              ${isHorizontal ? 'mb-1' : ''}
            `}>
              <div className={`
                ${sizes.iconContainer} rounded-xl transition-all duration-300
                ${isSelected 
                  ? 'bg-white/20' 
                  : 'bg-zinc-200 dark:bg-zinc-700 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600'
                }
              `}>
                <Icon
                  size={sizes.icon}
                  className={`
                    transition-all duration-300
                    ${isSelected ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}
                    ${!isSelected && !disabled ? 'group-hover:scale-110' : ''}
                  `}
                />
              </div>
            </div>

            {/* Content */}
            <div className={`relative z-10 ${isHorizontal ? '' : 'flex-1 text-left'}`}>
              {/* Title with emoji */}
              <div className={`font-bold ${sizes.title} flex items-center ${isHorizontal ? 'justify-center' : ''} gap-1.5`}>
                <span>{mode.title}</span>
                <span className="text-base" aria-hidden="true">{mode.emoji}</span>
              </div>
              
              {/* Description */}
              {showDescriptions && (
                <p className={`
                  ${sizes.description} mt-0.5 leading-tight
                  ${isSelected 
                    ? 'text-white/80' 
                    : 'text-zinc-500 dark:text-zinc-500'
                  }
                  ${isHorizontal ? 'hidden sm:block' : ''}
                `}>
                  {size === 'lg' ? mode.longDescription : mode.shortDescription}
                </p>
              )}
            </div>

            {/* Selected indicator - checkmark */}
            {isSelected && (
              <div 
                className={`
                  absolute ${isHorizontal ? 'top-2 right-2' : 'top-1/2 right-3 -translate-y-1/2'}
                  w-5 h-5 rounded-full bg-white/30 flex items-center justify-center
                  animate-scale-in
                `}
                aria-hidden="true"
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Pulse indicator for selected */}
            {isSelected && (
              <div 
                className={`
                  absolute ${isHorizontal ? 'bottom-1 left-1/2 -translate-x-1/2' : 'left-3 top-1/2 -translate-y-1/2'}
                  w-1.5 h-1.5 rounded-full bg-white animate-pulse
                `}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}

      {/* Animation keyframes */}
      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ModeSelector;
