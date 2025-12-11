/**
 * DemoTourOverlay Component
 * 
 * Displays a guided tour overlay with AI Vision mascot
 * highlighting different sections of the app.
 * Auto-advances through steps with a timer.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { X, Pause, Play, SkipForward } from 'lucide-react';
import { TourStep } from '../hooks/useDemoTour';
import { MascotFace } from './mascot/MascotFace';

interface DemoTourOverlayProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  autoAdvanceDelay?: number; // ms between steps
  isConnected?: boolean; // When connected, don't show dark backdrop
}

const DEFAULT_AUTO_DELAY = 6000; // 6 seconds per step

export const DemoTourOverlay: React.FC<DemoTourOverlayProps> = ({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev: _onPrev, // Reserved for manual navigation if needed
  onClose,
  autoAdvanceDelay = DEFAULT_AUTO_DELAY,
  isConnected = false,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const isLastStep = currentStep === totalSteps - 1;
  const isCentered = step.position === 'center';

  // Auto-advance timer
  useEffect(() => {
    if (isPaused) return;
    
    setProgress(0);
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / autoAdvanceDelay) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressInterval);
        if (!isLastStep) {
          onNext();
        } else {
          onClose();
        }
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentStep, isPaused, autoAdvanceDelay, isLastStep, onNext, onClose]);

  // Find and highlight target element
  useEffect(() => {
    if (step.target === 'body' || isCentered) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTargetRect(null);
    }
  }, [step.target, isCentered]);

  const getMascotEmotion = () => {
    switch (step.mascotEmotion) {
      case 'excited': return 'celebrating';
      case 'thinking': return 'thinking';
      case 'waving': return 'happy';
      default: return 'happy';
    }
  };

  const togglePause = useCallback(() => {
    setIsPaused((prev: boolean) => !prev);
  }, []);

  // Calculate tooltip position - responsive
  const getTooltipStyle = (): React.CSSProperties => {
    const isMobile = window.innerWidth < 640;
    
    // On mobile, always show at bottom of screen
    if (isMobile) {
      return {
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        top: 'auto',
        transform: 'none',
      };
    }

    if (isCentered || !targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 20;
    const tooltipWidth = Math.min(380, window.innerWidth - 40);
    const tooltipHeight = 220;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + padding;
        break;
    }

    // Keep within viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

    return {
      position: 'fixed',
      top,
      left,
      width: tooltipWidth,
    };
  };

  return (
    <div className={`fixed inset-0 z-[9999] ${isConnected ? 'pointer-events-none' : ''}`}>
      {/* Backdrop - only show when not connected */}
      {!isConnected && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={togglePause} />
      )}
      
      {/* Floating close button - top right corner */}
      <button
        onClick={onClose}
        className="pointer-events-auto fixed top-4 right-4 z-[10000] p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Cancelar tour"
        title="Cancelar Demo"
      >
        <X size={20} />
      </button>
      
      {/* Highlight box around target */}
      {targetRect && !isCentered && !isConnected && (
        <div
          className="absolute border-2 border-twitch-brand rounded-lg pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 20px rgba(169, 112, 255, 0.5), 0 0 0 9999px rgba(0,0,0,0.7)',
            animation: 'pulse 2s infinite',
          }}
        />
      )}
      
      {/* Subtle highlight when connected */}
      {targetRect && !isCentered && isConnected && (
        <div
          className="absolute border-3 border-twitch-brand rounded-lg pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 30px rgba(169, 112, 255, 0.6)',
          }}
        />
      )}

      {/* Tour tooltip - responsive */}
      <div
        className="pointer-events-auto w-full sm:w-auto max-w-[calc(100vw-32px)] sm:max-w-[380px] bg-zinc-900 border border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden animate-scale-up"
        style={getTooltipStyle()}
      >
        {/* Auto-progress bar at top */}
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-twitch-brand transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header with mascot */}
        <div className="bg-gradient-to-r from-purple-600/20 to-twitch-brand/20 p-3 sm:p-4 flex items-start gap-3">
          <div className="shrink-0">
            <MascotFace emotion={getMascotEmotion()} size={48} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm sm:text-base leading-tight break-words">
              {step.title}
            </h3>
            <p className="text-[10px] sm:text-xs text-purple-300 mt-0.5">
              {currentStep + 1} / {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
            aria-label="Cerrar tour"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed break-words">
            {step.message}
          </p>
        </div>

        {/* Step indicators */}
        <div className="px-3 sm:px-4 pb-2 flex justify-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep 
                  ? 'w-4 bg-twitch-brand' 
                  : i < currentStep 
                    ? 'w-1.5 bg-purple-500' 
                    : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="p-2 sm:p-3 bg-zinc-800/50 flex items-center justify-between gap-2">
          <button
            onClick={togglePause}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span className="hidden xs:inline">{isPaused ? 'Continuar' : 'Pausar'}</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <SkipForward size={12} />
              <span className="hidden sm:inline">Saltar</span>
            </button>

            <button
              onClick={isLastStep ? onClose : onNext}
              className="flex items-center gap-1 px-3 sm:px-4 py-1.5 text-xs font-bold bg-twitch-brand hover:bg-twitch-light text-white rounded-lg transition-colors"
            >
              {isLastStep ? '¡Listo!' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>

      {/* Paused indicator */}
      {isPaused && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-zinc-700 flex items-center gap-2 animate-fade-in">
          <Pause size={12} />
          Pausado - Toca para continuar
        </div>
      )}
    </div>
  );
};
