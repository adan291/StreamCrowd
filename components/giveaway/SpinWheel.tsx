/**
 * SpinWheel Component
 * Animated wheel of fortune for giveaway winner selection
 * 
 * Mejoras UI/UX:
 * - Sonido de tick mientras gira
 * - Efectos visuales mejorados
 * - Mejor accesibilidad
 * - Animaciones más fluidas
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { RotateCw, Play, SkipForward, Volume2, VolumeX } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface SpinWheelProps {
  participants: string[];
  onWinnerSelected: (winner: string) => void;
  disabled?: boolean;
  soundEnabled?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
}

export type SpinPhase = 'idle' | 'spinning' | 'slowing' | 'stopped';

// ============================================
// CONSTANTS
// ============================================

const MAX_PARTICIPANTS = 20;
const SPIN_DURATION = 5000;
const MIN_ROTATIONS = 5;
const MAX_ROTATIONS = 8;

const SEGMENT_COLORS = [
  '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B',
  '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
  '#A855F7', '#F472B6', '#22D3EE', '#34D399', '#FBBF24',
  '#FB7185', '#818CF8', '#2DD4BF', '#FB923C', '#A3E635',
];

// ============================================
// SOUND HOOK
// ============================================

const useWheelSound = (enabled: boolean) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef<number>(0);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTick = useCallback(() => {
    if (!enabled) return;
    
    const now = Date.now();
    if (now - lastTickRef.current < 50) return; // Throttle
    lastTickRef.current = now;

    try {
      const ctx = initAudio();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800 + Math.random() * 200;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Audio not supported
    }
  }, [enabled, initAudio]);

  const playWinner = useCallback(() => {
    if (!enabled) return;

    try {
      const ctx = initAudio();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = ctx.currentTime + i * 0.15;
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      });
    } catch (e) {
      // Audio not supported
    }
  }, [enabled, initAudio]);

  return { playTick, playWinner };
};

// ============================================
// HELPERS
// ============================================

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ============================================
// COMPONENT
// ============================================

export function SpinWheel({
  participants,
  onWinnerSelected,
  disabled = false,
  soundEnabled = true,
  onSoundToggle,
}: SpinWheelProps) {
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [localSoundEnabled, setLocalSoundEnabled] = useState(soundEnabled);
  
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const startRotationRef = useRef<number>(0);
  const lastSegmentRef = useRef<number>(-1);

  const { playTick, playWinner } = useWheelSound(localSoundEnabled);

  const canSpin = participants.length > 0 && 
                  participants.length <= MAX_PARTICIPANTS && 
                  !disabled && 
                  phase === 'idle';

  const segmentAngle = useMemo(() => 360 / participants.length, [participants.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ============================================
  // ANIMATION
  // ============================================

  const animate = useCallback((timestamp: number) => {
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / SPIN_DURATION, 1);
    const easedProgress = easeOutCubic(progress);

    const currentRotation = startRotationRef.current + 
      (targetRotationRef.current - startRotationRef.current) * easedProgress;
    
    setRotation(currentRotation);

    // Play tick sound when crossing segment boundary
    const normalizedRotation = ((currentRotation % 360) + 360) % 360;
    const currentSegment = Math.floor(normalizedRotation / segmentAngle);
    if (currentSegment !== lastSegmentRef.current) {
      lastSegmentRef.current = currentSegment;
      playTick();
    }

    // Update phase based on progress
    if (progress < 0.7) {
      setPhase('spinning');
    } else if (progress < 1) {
      setPhase('slowing');
    }

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete
      setPhase('stopped');
      
      const winningIndex = Math.floor((360 - normalizedRotation + segmentAngle / 2) / segmentAngle) % participants.length;
      
      setWinnerIndex(winningIndex);
      setWinner(participants[winningIndex]);
      playWinner();
      onWinnerSelected(participants[winningIndex]);
    }
  }, [participants, onWinnerSelected, segmentAngle, playTick, playWinner]);

  // ============================================
  // ACTIONS
  // ============================================

  const spin = useCallback(() => {
    if (!canSpin) return;

    setWinner(null);
    setWinnerIndex(null);
    lastSegmentRef.current = -1;

    const rotations = MIN_ROTATIONS + Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS);
    const extraAngle = Math.random() * 360;
    const targetRotation = rotation + (rotations * 360) + extraAngle;

    startRotationRef.current = rotation;
    targetRotationRef.current = targetRotation;
    startTimeRef.current = performance.now();

    setPhase('spinning');
    animationRef.current = requestAnimationFrame(animate);
  }, [canSpin, rotation, animate]);

  const skip = useCallback(() => {
    if (phase !== 'spinning' && phase !== 'slowing') return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setRotation(targetRotationRef.current);
    setPhase('stopped');

    const normalizedRotation = ((targetRotationRef.current % 360) + 360) % 360;
    const winningIndex = Math.floor((360 - normalizedRotation + segmentAngle / 2) / segmentAngle) % participants.length;
    
    setWinnerIndex(winningIndex);
    setWinner(participants[winningIndex]);
    playWinner();
    onWinnerSelected(participants[winningIndex]);
  }, [phase, participants, onWinnerSelected, segmentAngle, playWinner]);

  const reset = useCallback(() => {
    setPhase('idle');
    setWinner(null);
    setWinnerIndex(null);
  }, []);

  const toggleSound = useCallback(() => {
    const newValue = !localSoundEnabled;
    setLocalSoundEnabled(newValue);
    onSoundToggle?.(newValue);
  }, [localSoundEnabled, onSoundToggle]);

  // ============================================
  // RENDER
  // ============================================

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-zinc-400" role="status">
        <RotateCw className="w-16 h-16 mb-4 opacity-30" aria-hidden="true" />
        <p>No hay participantes</p>
      </div>
    );
  }

  if (participants.length > MAX_PARTICIPANTS) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-zinc-400" role="status">
        <RotateCw className="w-16 h-16 mb-4 opacity-30" aria-hidden="true" />
        <p>La rueda solo está disponible con {MAX_PARTICIPANTS} participantes o menos</p>
        <p className="text-sm mt-2">Actualmente: {participants.length} participantes</p>
      </div>
    );
  }

  const radius = 140;
  const centerX = 150;
  const centerY = 150;

  return (
    <div className="flex flex-col items-center gap-4" role="application" aria-label="Rueda de la fortuna">
      {/* Sound toggle */}
      <button
        onClick={toggleSound}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label={localSoundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
      >
        {localSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10" aria-hidden="true">
          <div 
            className={`
              w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] 
              border-l-transparent border-r-transparent border-t-yellow-400
              drop-shadow-lg transition-transform
              ${phase === 'spinning' || phase === 'slowing' ? 'animate-bounce-subtle' : ''}
            `}
          />
        </div>

        {/* Glow effect when spinning */}
        {(phase === 'spinning' || phase === 'slowing') && (
          <div 
            className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl animate-pulse"
            style={{ transform: 'scale(1.1)' }}
            aria-hidden="true"
          />
        )}

        {/* SVG Wheel */}
        <svg 
          width="300" 
          height="300" 
          className={`
            drop-shadow-2xl transition-transform
            ${phase === 'stopped' && winner ? 'scale-105' : ''}
          `}
          style={{ transform: `rotate(${rotation}deg)` }}
          role="img"
          aria-label={`Rueda con ${participants.length} participantes`}
        >
          {/* Segments */}
          {participants.map((participant, index) => {
            const startAngle = index * segmentAngle - 90;
            const endAngle = startAngle + segmentAngle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = centerX + radius * Math.cos(startRad);
            const y1 = centerY + radius * Math.sin(startRad);
            const x2 = centerX + radius * Math.cos(endRad);
            const y2 = centerY + radius * Math.sin(endRad);
            
            const largeArc = segmentAngle > 180 ? 1 : 0;
            
            const pathD = `
              M ${centerX} ${centerY}
              L ${x1} ${y1}
              A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
              Z
            `;

            const textAngle = startAngle + segmentAngle / 2;
            const textRad = (textAngle * Math.PI) / 180;
            const textRadius = radius * 0.65;
            const textX = centerX + textRadius * Math.cos(textRad);
            const textY = centerY + textRadius * Math.sin(textRad);

            const isWinner = winnerIndex === index && phase === 'stopped';
            const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];

            return (
              <g key={index}>
                <path
                  d={pathD}
                  fill={color}
                  stroke={isWinner ? '#FFD700' : '#1a1a2e'}
                  strokeWidth={isWinner ? 4 : 1.5}
                  className={isWinner ? 'animate-pulse' : ''}
                />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize={participants.length > 12 ? 9 : participants.length > 8 ? 10 : 11}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                  className="pointer-events-none select-none"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {participant.length > 8 ? participant.slice(0, 7) + '…' : participant}
                </text>
              </g>
            );
          })}

          {/* Center circle */}
          <circle cx={centerX} cy={centerY} r={28} fill="#1a1a2e" stroke="#FFD700" strokeWidth={3} />
          <circle cx={centerX} cy={centerY} r={18} fill="#FFD700" />
          <circle cx={centerX} cy={centerY} r={8} fill="#1a1a2e" />
        </svg>
      </div>

      {/* Winner Display */}
      {winner && phase === 'stopped' && (
        <div 
          className="text-center animate-fade-in-up"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm text-zinc-400 mb-1">🎉 ¡Ganador!</p>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
            {winner}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {phase === 'idle' && (
          <button
            onClick={spin}
            disabled={!canSpin}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                       text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all
                       hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/30
                       focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
            aria-label="Girar la rueda"
          >
            <Play className="w-5 h-5" />
            Girar Rueda
          </button>
        )}

        {(phase === 'spinning' || phase === 'slowing') && (
          <button
            onClick={skip}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-600 text-white 
                       font-semibold rounded-xl hover:bg-zinc-500 transition-all
                       focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
            aria-label="Saltar animación"
          >
            <SkipForward className="w-5 h-5" />
            Saltar
          </button>
        )}

        {phase === 'stopped' && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-600 text-white 
                       font-semibold rounded-xl hover:bg-zinc-500 transition-all
                       focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
            aria-label="Nueva tirada"
          >
            <RotateCw className="w-5 h-5" />
            Nueva Tirada
          </button>
        )}
      </div>

      {/* Participant count */}
      <p className="text-sm text-zinc-500">
        {participants.length} participante{participants.length !== 1 ? 's' : ''} en la rueda
      </p>

      {/* CSS Animations */}
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 0.15s ease-in-out infinite;
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
      `}</style>
    </div>
  );
}

export default SpinWheel;
