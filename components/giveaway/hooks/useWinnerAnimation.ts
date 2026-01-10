/**
 * useWinnerAnimation Hook
 * Manages winner selection animation with progressive intervals and near-miss effect
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export type AnimationPhase = 'idle' | 'spinning' | 'slowing' | 'nearMiss' | 'winner';

export interface AnimationState {
  phase: AnimationPhase;
  currentName: string;
  nearMissCandidates: string[];
  progress: number; // 0 to 1
  winner: string | null;
}

export interface UseWinnerAnimationOptions {
  /** Total animation duration in ms (default: 3000) */
  duration?: number;
  /** Minimum interval between name changes in ms (default: 50) */
  minInterval?: number;
  /** Maximum interval between name changes in ms (default: 500) */
  maxInterval?: number;
  /** Progress threshold to trigger near-miss effect (default: 0.8) */
  nearMissThreshold?: number;
  /** Number of near-miss candidates to show (default: 3) */
  nearMissCount?: number;
  /** Callback when animation completes */
  onComplete?: (winner: string) => void;
  /** Callback on each name change during animation */
  onNameChange?: (name: string) => void;
  /** Enable sound effects */
  soundEnabled?: boolean;
}

export interface UseWinnerAnimationReturn {
  // State
  state: AnimationState;
  isAnimating: boolean;
  currentName: string;
  winner: string | null;
  progress: number;
  phase: AnimationPhase;
  nearMissCandidates: string[];
  
  // Actions
  start: (candidates: string[], preselectedWinner?: string) => void;
  skip: () => void;
  reset: () => void;
}

// ============================================
// EASING FUNCTIONS
// ============================================

/**
 * Ease out quart - starts fast, slows down dramatically at the end
 * Perfect for slot machine / wheel of fortune effect
 */
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Ease in out cubic - smooth acceleration and deceleration
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============================================
// HELPERS
// ============================================

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useWinnerAnimation(options: UseWinnerAnimationOptions = {}): UseWinnerAnimationReturn {
  const {
    duration = 3000,
    minInterval = 50,
    maxInterval = 500,
    nearMissThreshold = 0.8,
    nearMissCount = 3,
    onComplete,
    onNameChange,
    soundEnabled = false,
  } = options;

  const [state, setState] = useState<AnimationState>({
    phase: 'idle',
    currentName: '',
    nearMissCandidates: [],
    progress: 0,
    winner: null,
  });

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const candidatesRef = useRef<string[]>([]);
  const winnerRef = useRef<string>('');
  const skippedRef = useRef<boolean>(false);
  const lastUpdateRef = useRef<number>(0);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ============================================
  // ANIMATION LOOP
  // ============================================

  const animate = useCallback((timestamp: number) => {
    if (skippedRef.current) return;

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuart(progress);

    // Calculate current interval based on progress
    // Starts fast (minInterval), slows down to maxInterval
    const currentInterval = minInterval + (maxInterval - minInterval) * easedProgress;

    // Determine phase
    let phase: AnimationPhase = 'spinning';
    if (progress >= nearMissThreshold) {
      phase = 'nearMiss';
    }
    if (progress >= 0.95) {
      phase = 'slowing';
    }

    // Update name if enough time has passed
    const timeSinceLastUpdate = timestamp - lastUpdateRef.current;
    if (timeSinceLastUpdate >= currentInterval) {
      lastUpdateRef.current = timestamp;

      // Select next name to display
      let nextName: string;
      if (phase === 'nearMiss' || phase === 'slowing') {
        // In near-miss phase, occasionally show the winner
        const showWinner = Math.random() < (progress - nearMissThreshold) / (1 - nearMissThreshold);
        if (showWinner) {
          nextName = winnerRef.current;
        } else {
          // Show near-miss candidates
          const nearMissCandidates = candidatesRef.current.filter(c => c !== winnerRef.current);
          nextName = getRandomItem(nearMissCandidates.length > 0 ? nearMissCandidates : candidatesRef.current);
        }
      } else {
        nextName = getRandomItem(candidatesRef.current);
      }

      // Generate near-miss candidates when entering that phase
      let nearMissCandidates: string[] = [];
      if (phase === 'nearMiss') {
        const others = candidatesRef.current.filter((c: string) => c !== winnerRef.current);
        nearMissCandidates = shuffleArray<string>(others).slice(0, nearMissCount);
      }

      setState(prev => ({
        ...prev,
        phase,
        currentName: nextName,
        nearMissCandidates,
        progress,
      }));

      if (onNameChange) {
        onNameChange(nextName);
      }
    }

    // Continue or finish animation
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete - show winner
      setState(prev => ({
        ...prev,
        phase: 'winner',
        currentName: winnerRef.current,
        winner: winnerRef.current,
        progress: 1,
        nearMissCandidates: [],
      }));

      if (onComplete) {
        onComplete(winnerRef.current);
      }
    }
  }, [duration, minInterval, maxInterval, nearMissThreshold, nearMissCount, onComplete, onNameChange]);

  // ============================================
  // ACTIONS
  // ============================================

  const start = useCallback((candidates: string[], preselectedWinner?: string) => {
    if (candidates.length === 0) return;

    // Reset state
    skippedRef.current = false;
    candidatesRef.current = candidates;
    
    // Select winner (random or preselected)
    winnerRef.current = preselectedWinner || getRandomItem(candidates);
    
    // Initialize animation
    startTimeRef.current = performance.now();
    lastUpdateRef.current = 0;

    setState({
      phase: 'spinning',
      currentName: getRandomItem(candidates),
      nearMissCandidates: [],
      progress: 0,
      winner: null,
    });

    // Start animation loop
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const skip = useCallback(() => {
    skippedRef.current = true;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Immediately show winner
    setState(prev => ({
      ...prev,
      phase: 'winner',
      currentName: winnerRef.current,
      winner: winnerRef.current,
      progress: 1,
      nearMissCandidates: [],
    }));

    if (onComplete) {
      onComplete(winnerRef.current);
    }
  }, [onComplete]);

  const reset = useCallback(() => {
    skippedRef.current = false;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    candidatesRef.current = [];
    winnerRef.current = '';

    setState({
      phase: 'idle',
      currentName: '',
      nearMissCandidates: [],
      progress: 0,
      winner: null,
    });
  }, []);

  // ============================================
  // DERIVED STATE
  // ============================================

  const isAnimating = state.phase !== 'idle' && state.phase !== 'winner';

  return {
    // State
    state,
    isAnimating,
    currentName: state.currentName,
    winner: state.winner,
    progress: state.progress,
    phase: state.phase,
    nearMissCandidates: state.nearMissCandidates,
    
    // Actions
    start,
    skip,
    reset,
  };
}

export default useWinnerAnimation;
