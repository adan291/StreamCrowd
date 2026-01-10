/**
 * WinnerDisplay Component
 * Shows the winner with celebration animation and confetti effect
 * 
 * Mejoras UI/UX:
 * - Confetti mejorado con diferentes formas
 * - Animaciones más fluidas
 * - Efectos de glow y pulso
 * - Mejor accesibilidad (aria-live, roles)
 * - Feedback visual durante selección
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Crown, Sparkles, Trophy, PartyPopper, Star } from 'lucide-react';
import type { AnimationPhase } from './hooks/useWinnerAnimation';

// ============================================
// TYPES
// ============================================

export interface WinnerDisplayProps {
  /** Current name being displayed (during animation or winner) */
  currentName: string;
  /** Animation phase */
  phase: AnimationPhase;
  /** Animation progress (0-1) */
  progress?: number;
  /** Near-miss candidates to show */
  nearMissCandidates?: string[];
  /** Callback when user clicks to skip animation */
  onSkip?: () => void;
  /** Show confetti effect */
  showConfetti?: boolean;
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Prize image to show */
  prizeImage?: string;
}

// ============================================
// CONFETTI COMPONENT - Enhanced
// ============================================

interface ConfettiParticle {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'star';
  rotation: number;
  duration: number;
}

const EnhancedConfetti: React.FC<{ active: boolean }> = ({ active }) => {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (active) {
      const colors = ['#fbbf24', '#f472b6', '#a78bfa', '#34d399', '#60a5fa', '#f87171', '#10b981', '#8b5cf6'];
      const shapes: ConfettiParticle['shape'][] = ['circle', 'square', 'star'];
      
      const newParticles: ConfettiParticle[] = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rotation: Math.random() * 360,
        duration: 2.5 + Math.random() * 1.5,
      }));
      setParticles(newParticles);
      
      // Clear after animation
      const timer = setTimeout(() => setParticles([]), 4000);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.shape !== 'star' ? p.color : 'transparent',
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'square' ? '2px' : '0',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        >
          {p.shape === 'star' && (
            <Star size={p.size} fill={p.color} color={p.color} />
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================
// GLOW RING COMPONENT
// ============================================

const GlowRing: React.FC<{ active: boolean; color: string }> = ({ active, color }) => {
  if (!active) return null;
  
  return (
    <div 
      className="absolute inset-0 rounded-xl animate-ping-slow opacity-30"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
};

// ============================================
// SIZE VARIANTS
// ============================================

const sizeClasses = {
  sm: {
    container: 'px-4 py-3',
    icon: 16,
    text: 'text-lg',
    nearMiss: 'text-xs',
    celebration: 'text-xs',
  },
  md: {
    container: 'px-6 py-4',
    icon: 20,
    text: 'text-xl',
    nearMiss: 'text-sm',
    celebration: 'text-sm',
  },
  lg: {
    container: 'px-8 py-5',
    icon: 28,
    text: 'text-3xl',
    nearMiss: 'text-base',
    celebration: 'text-base',
  },
};

// ============================================
// COMPONENT
// ============================================

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({
  currentName,
  phase,
  progress = 0,
  nearMissCandidates = [],
  onSkip,
  showConfetti = true,
  className = '',
  size = 'md',
  prizeImage,
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const isWinner = phase === 'winner';
  const isAnimating = phase === 'spinning' || phase === 'slowing' || phase === 'nearMiss';
  const isNearMiss = phase === 'nearMiss';
  const isSpinning = phase === 'spinning';
  const isSlowing = phase === 'slowing';
  const sizes = sizeClasses[size];

  // Trigger celebration animation when winner is revealed
  useEffect(() => {
    if (isWinner) {
      setShowCelebration(true);
    } else {
      setShowCelebration(false);
    }
  }, [isWinner]);

  // Handle skip with keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isAnimating && onSkip) {
      e.preventDefault();
      onSkip();
    }
  }, [isAnimating, onSkip]);

  // Background gradient based on phase
  const getBackgroundClass = () => {
    if (isWinner) {
      return 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 animate-gradient-shift';
    }
    if (isNearMiss) {
      return 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600';
    }
    if (isSlowing) {
      return 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500';
    }
    if (isSpinning) {
      return 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-shift';
    }
    return 'bg-zinc-100 dark:bg-zinc-800';
  };

  // Text color based on phase
  const getTextClass = () => {
    if (isWinner || isAnimating) {
      return 'text-white drop-shadow-lg';
    }
    return 'text-purple-500 dark:text-purple-400';
  };

  // Icon to show with enhanced animations
  const renderIcon = () => {
    const iconClass = "mx-auto mb-2";
    
    if (isWinner) {
      return (
        <div className={`${iconClass} animate-bounce-slow`}>
          <Crown className="text-white drop-shadow-glow" size={sizes.icon} />
        </div>
      );
    }
    if (isNearMiss) {
      return (
        <div className={`${iconClass} animate-pulse`}>
          <Sparkles className="text-white/90" size={sizes.icon} />
        </div>
      );
    }
    if (isSlowing) {
      return (
        <div className={`${iconClass} animate-spin-slow`}>
          <Trophy className="text-white/80" size={sizes.icon} />
        </div>
      );
    }
    if (isSpinning) {
      return (
        <div className={`${iconClass} animate-spin`}>
          <Trophy className="text-white/70" size={sizes.icon} />
        </div>
      );
    }
    return null;
  };

  // Get aria-live politeness based on phase
  const getAriaLive = (): 'polite' | 'assertive' | 'off' => {
    if (isWinner) return 'assertive';
    if (isAnimating) return 'polite';
    return 'off';
  };

  return (
    <div 
      className={`relative text-center ${className}`}
      role="status"
      aria-live={getAriaLive()}
      aria-atomic="true"
    >
      {/* Confetti effect */}
      {showConfetti && <EnhancedConfetti active={showCelebration} />}

      {/* Main display */}
      <div
        className={`
          relative inline-block rounded-2xl transition-all duration-500 
          ${isAnimating ? 'cursor-pointer' : ''}
          ${sizes.container}
          ${getBackgroundClass()}
          ${isWinner ? 'shadow-2xl shadow-yellow-500/40 scale-110 ring-4 ring-yellow-300/50' : ''}
          ${isAnimating ? 'shadow-lg shadow-purple-500/30' : ''}
          ${isNearMiss ? 'animate-shake' : ''}
          focus:outline-none focus:ring-4 focus:ring-purple-400/50
        `}
        onClick={isAnimating ? onSkip : undefined}
        onKeyDown={handleKeyDown}
        tabIndex={isAnimating ? 0 : -1}
        role={isAnimating ? 'button' : undefined}
        aria-label={isAnimating ? `Seleccionando... ${currentName}. Presiona para saltar.` : isWinner ? `¡Ganador: ${currentName}!` : currentName}
      >
        {/* Glow effect for winner */}
        <GlowRing active={isWinner} color="#fbbf24" />
        
        {renderIcon()}
        
        {/* Name display with text animation */}
        <span 
          className={`
            font-bold ${sizes.text} ${getTextClass()} block
            ${isSpinning ? 'animate-text-blur' : ''}
            ${isWinner ? 'animate-text-glow' : ''}
          `}
        >
          {currentName || '...'}
        </span>

        {/* Progress bar during animation - enhanced */}
        {isAnimating && (
          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`
                h-full rounded-full transition-all
                ${isSlowing ? 'bg-gradient-to-r from-purple-300 to-pink-300' : 'bg-white/60'}
              `}
              style={{ 
                width: `${progress * 100}%`,
                transition: isSlowing ? 'width 0.3s ease-out' : 'width 0.1s linear'
              }}
            />
          </div>
        )}

        {/* Prize image preview */}
        {isWinner && prizeImage && (
          <div className="mt-3 flex justify-center">
            <img 
              src={prizeImage} 
              alt="Premio" 
              className="w-12 h-12 rounded-lg object-cover ring-2 ring-white/50 animate-bounce-slow"
            />
          </div>
        )}
      </div>

      {/* Near-miss candidates with stagger animation */}
      {isNearMiss && nearMissCandidates.length > 0 && (
        <div className="mt-4 flex justify-center gap-2 flex-wrap" aria-hidden="true">
          {nearMissCandidates.slice(0, 3).map((name, i) => (
            <span
              key={i}
              className={`
                ${sizes.nearMiss} px-3 py-1.5 rounded-lg
                bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300
                animate-fade-in-up backdrop-blur-sm
              `}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Winner celebration text - enhanced */}
      {isWinner && (
        <div className="mt-4 flex items-center justify-center gap-3 animate-fade-in-up">
          <PartyPopper size={18} className="text-yellow-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
          <span className={`${sizes.celebration} font-bold text-yellow-500`}>
            ¡Felicidades!
          </span>
          <PartyPopper size={18} className="text-yellow-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      )}

      {/* Skip hint during animation - improved visibility */}
      {isAnimating && onSkip && (
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500 animate-pulse">
          <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-[10px] mr-1">Click</kbd>
          o
          <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-[10px] mx-1">Enter</kbd>
          para saltar
        </p>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 3s ease-out forwards;
        }
        
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 1.5s ease-out infinite;
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 1s ease-in-out infinite;
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out infinite;
        }
        
        @keyframes text-blur {
          0%, 100% { filter: blur(0px); }
          50% { filter: blur(1px); }
        }
        .animate-text-blur {
          animation: text-blur 0.15s ease-in-out infinite;
        }
        
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 10px rgba(255,255,255,0.5); }
          50% { text-shadow: 0 0 20px rgba(255,255,255,0.8), 0 0 30px rgba(251,191,36,0.5); }
        }
        .animate-text-glow {
          animation: text-glow 1.5s ease-in-out infinite;
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }
        
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px rgba(255,255,255,0.6));
        }
      `}</style>
    </div>
  );
};

export default WinnerDisplay;
