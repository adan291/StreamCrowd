/**
 * RafflePreview Component
 * Shows a summary card of the raffle configuration before starting
 * Provides visual feedback that the raffle is ready to start
 */

import React, { useMemo } from 'react';
import { 
  Gift, Users, MessageSquare, Heart, Timer,
  Calendar, CheckCircle2, AlertCircle, Sparkles, Play
} from 'lucide-react';
import type { RaffleMode } from './types';

// ============================================
// TYPES
// ============================================

export interface RaffleTimingConfig {
  timingMode: 'instant' | 'scheduled';
  scheduledStartDate?: string;
  scheduledStartTime?: string;
  durationMode: 'fixed' | 'until' | 'manual';
  fixedDuration: number;
  endDate?: string;
  endTime?: string;
}

export interface RafflePreviewProps {
  mode: RaffleMode;
  keyword?: string;
  useTimer: boolean;
  timerDuration: number;
  subsOnly: boolean;
  participantCount: number;
  isConnected: boolean;
  scheduledStart?: { date: string; time: string };
  winnersCount?: number;
  prizes?: string[];
  prizeImages?: string[];
  timingConfig?: RaffleTimingConfig;
  onStart?: () => void;
  className?: string;
}

// ============================================
// HELPERS
// ============================================

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
};

const formatDateTime = (date: string, time: string): string => {
  if (!date || !time) return '';
  const d = new Date(`${date}T${time}`);
  return d.toLocaleString('es-ES', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const MODE_CONFIG: Record<RaffleMode, { icon: React.ReactNode; label: string; color: string }> = {
  viewers: { 
    icon: <Users size={16} />, 
    label: 'Viewers', 
    color: 'text-purple-500' 
  },
  keyword: { 
    icon: <MessageSquare size={16} />, 
    label: 'Keyword', 
    color: 'text-cyan-500' 
  },
  subs: { 
    icon: <Heart size={16} />, 
    label: 'Subs', 
    color: 'text-pink-500' 
  },
};

// ============================================
// COMPONENT
// ============================================

export const RafflePreview: React.FC<RafflePreviewProps> = ({
  mode,
  keyword,
  useTimer,
  timerDuration,
  subsOnly,
  participantCount,
  isConnected,
  scheduledStart,
  winnersCount = 1,
  prizes = [],
  prizeImages = [],
  timingConfig,
  onStart,
  className = '',
}) => {
  const modeConfig = MODE_CONFIG[mode];
  
  // Determine effective timing from timingConfig or legacy props
  const effectiveScheduledStart = timingConfig?.timingMode === 'scheduled' 
    && timingConfig.scheduledStartDate 
    && timingConfig.scheduledStartTime
    ? { date: timingConfig.scheduledStartDate, time: timingConfig.scheduledStartTime }
    : scheduledStart;
  
  const effectiveDuration = timingConfig?.durationMode === 'fixed' 
    ? timingConfig.fixedDuration 
    : timerDuration;
  
  const hasEndDateTime = timingConfig?.durationMode === 'until' 
    && timingConfig.endDate 
    && timingConfig.endTime;
  
  // Validation checks
  const validations = useMemo(() => {
    const checks: { label: string; valid: boolean; required: boolean }[] = [];
    
    // Connection check
    checks.push({
      label: 'Conectado al chat',
      valid: isConnected,
      required: true,
    });
    
    // Keyword check for keyword mode
    if (mode === 'keyword') {
      checks.push({
        label: `Palabra clave: "${keyword || '...'}"`,
        valid: !!keyword?.trim(),
        required: true,
      });
    }
    
    // Timer check
    if (useTimer) {
      checks.push({
        label: `Duración: ${formatDuration(effectiveDuration)}`,
        valid: effectiveDuration > 0,
        required: true,
      });
    }
    
    // Participants check (optional but informative)
    checks.push({
      label: `${participantCount} participante${participantCount !== 1 ? 's' : ''} previos`,
      valid: true,
      required: false,
    });
    
    return checks;
  }, [mode, keyword, useTimer, effectiveDuration, participantCount, isConnected]);

  const canStart = validations.filter(v => v.required).every(v => v.valid);
  const hasSchedule = effectiveScheduledStart?.date && effectiveScheduledStart?.time;

  return (
    <div 
      className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-blue-500/10
        border-2 transition-all duration-300
        ${canStart 
          ? 'border-green-500/50 shadow-lg shadow-green-500/10' 
          : 'border-zinc-300 dark:border-zinc-700'
        }
        ${className}
      `}
    >
      {/* Ready indicator */}
      {canStart && (
        <div className="absolute top-0 right-0 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-bl-xl flex items-center gap-1">
          <Sparkles size={12} />
          Listo
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500`}>
            <Gift className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-zinc-800 dark:text-white">
              Resumen del sorteo
            </h3>
            <p className="text-xs text-zinc-500">
              Revisa la configuración antes de iniciar
            </p>
          </div>
        </div>

        {/* Mode badge */}
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800 shadow-sm ${modeConfig.color}`}>
            {modeConfig.icon}
            <span className="font-medium text-sm">{modeConfig.label}</span>
          </span>
          {subsOnly && mode !== 'subs' && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/20 text-pink-600 dark:text-pink-400 text-xs">
              <Heart size={12} />
              Solo subs
            </span>
          )}
        </div>

        {/* Configuration details */}
        <div className="space-y-2">
          {validations.map((check, i) => (
            <div 
              key={i}
              className={`
                flex items-center gap-2 text-sm
                ${check.valid 
                  ? 'text-zinc-600 dark:text-zinc-400' 
                  : check.required 
                    ? 'text-red-500' 
                    : 'text-zinc-400'
                }
              `}
            >
              {check.valid ? (
                <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
              ) : check.required ? (
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 flex-shrink-0" />
              )}
              <span>{check.label}</span>
            </div>
          ))}
        </div>

        {/* Schedule info */}
        {hasSchedule && (
          <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg text-sm text-blue-600 dark:text-blue-400">
            <Calendar size={14} />
            <span>Programado: {formatDateTime(effectiveScheduledStart!.date, effectiveScheduledStart!.time)}</span>
          </div>
        )}

        {/* End date/time info */}
        {hasEndDateTime && (
          <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-lg text-sm text-orange-600 dark:text-orange-400">
            <Calendar size={14} />
            <span>Termina: {formatDateTime(timingConfig!.endDate!, timingConfig!.endTime!)}</span>
          </div>
        )}

        {/* Timer info */}
        {useTimer && !hasSchedule && !hasEndDateTime && (
          <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg text-sm text-purple-600 dark:text-purple-400">
            <Timer size={14} />
            <span>Duración: {formatDuration(effectiveDuration)}</span>
          </div>
        )}

        {/* Multiple winners */}
        {winnersCount > 1 && (
          <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg text-sm text-amber-600 dark:text-amber-400">
            <Users size={14} />
            <span>{winnersCount} ganadores</span>
            {prizes.length > 0 && (
              <span className="text-xs opacity-70">
                ({prizes.filter(p => p).length} premios configurados)
              </span>
            )}
          </div>
        )}

        {/* Prize images preview */}
        {prizeImages.length > 0 && (
          <div className="flex gap-2">
            {prizeImages.slice(0, 3).map((img, i) => (
              <img 
                key={i}
                src={img} 
                alt={`Premio ${i + 1}`}
                className="w-12 h-12 rounded-lg object-cover ring-2 ring-white dark:ring-zinc-800 shadow-sm"
              />
            ))}
          </div>
        )}

        {/* Start button */}
        {onStart && (
          <button
            onClick={onStart}
            disabled={!canStart}
            className={`
              w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2
              transition-all duration-300
              ${canStart
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }
            `}
          >
            <Play size={18} />
            {hasSchedule ? 'Programar sorteo' : 'Iniciar sorteo'}
          </button>
        )}

        {/* Help text */}
        {!canStart && (
          <p className="text-xs text-center text-red-500">
            Completa los campos requeridos para iniciar
          </p>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl" aria-hidden="true" />
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl" aria-hidden="true" />
    </div>
  );
};

export default RafflePreview;
