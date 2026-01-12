/**
 * RaffleTimingConfig Component
 * Configuración de tiempo del sorteo separando:
 * - Programación: cuándo empieza el sorteo (ahora o fecha/hora específica)
 * - Duración: cuánto tiempo dura la participación
 * 
 * Un sorteo puede:
 * - Empezar ahora y durar 5 minutos
 * - Empezar el día X a las Y y durar 5 minutos
 * - Empezar el día X a las Y y terminar el día Z a las W
 */

import React, { useState, useMemo } from 'react';
import { Clock, Calendar, Play, Timer, CalendarClock, ChevronDown, ChevronUp, Info } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type TimingMode = 'instant' | 'scheduled';
export type DurationMode = 'fixed' | 'until' | 'manual';

export interface RaffleTimingConfig {
  // Cuándo empieza
  timingMode: TimingMode;
  scheduledStartDate?: string;
  scheduledStartTime?: string;
  
  // Cuánto dura
  durationMode: DurationMode;
  fixedDuration: number; // en segundos (0 = sin límite)
  endDate?: string;
  endTime?: string;
}

export interface RaffleTimingConfigProps {
  config: RaffleTimingConfig;
  onChange: (config: RaffleTimingConfig) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// HELPERS
// ============================================

const secondsToHMS = (totalSeconds: number): { hours: number; minutes: number; seconds: number } => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
};

const hmsToSeconds = (hours: number, minutes: number, seconds: number): number => {
  return hours * 3600 + minutes * 60 + seconds;
};

const formatDuration = (seconds: number): string => {
  const { hours, minutes, seconds: secs } = secondsToHMS(seconds);
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

// ============================================
// DURATION PRESETS
// ============================================

const DURATION_PRESETS = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
];

// ============================================
// COMPONENT
// ============================================

export const RaffleTimingConfigComponent: React.FC<RaffleTimingConfigProps> = ({
  config,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  
  const { hours, minutes, seconds } = secondsToHMS(config.fixedDuration);
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  // Calcular duración si se usa modo "hasta fecha"
  const calculatedDuration = useMemo(() => {
    if (config.durationMode !== 'until' || !config.endDate || !config.endTime) {
      return null;
    }
    
    const endDateTime = new Date(`${config.endDate}T${config.endTime}`);
    let startDateTime: Date;
    
    if (config.timingMode === 'instant') {
      startDateTime = new Date();
    } else if (config.scheduledStartDate && config.scheduledStartTime) {
      startDateTime = new Date(`${config.scheduledStartDate}T${config.scheduledStartTime}`);
    } else {
      startDateTime = new Date();
    }
    
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    return diffMs > 0 ? Math.floor(diffMs / 1000) : null;
  }, [config]);

  // Handlers
  const updateConfig = (partial: Partial<RaffleTimingConfig>) => {
    onChange({ ...config, ...partial });
  };

  const handleHoursChange = (newHours: number) => {
    const clamped = Math.max(0, Math.min(23, newHours));
    updateConfig({ fixedDuration: hmsToSeconds(clamped, minutes, seconds) });
  };

  const handleMinutesChange = (newMinutes: number) => {
    const clamped = Math.max(0, Math.min(59, newMinutes));
    updateConfig({ fixedDuration: hmsToSeconds(hours, clamped, seconds) });
  };

  const handleSecondsChange = (newSeconds: number) => {
    const clamped = Math.max(0, Math.min(59, newSeconds));
    updateConfig({ fixedDuration: hmsToSeconds(hours, minutes, clamped) });
  };

  // Resumen de configuración
  const getSummary = (): string => {
    const parts: string[] = [];
    
    if (config.timingMode === 'instant') {
      parts.push('Empieza ahora');
    } else if (config.scheduledStartDate) {
      const startTime = config.scheduledStartTime || '00:00';
      parts.push(`Empieza ${formatDateTime(config.scheduledStartDate, startTime)}`);
    }
    
    if (config.durationMode === 'fixed') {
      parts.push(`dura ${formatDuration(config.fixedDuration)}`);
    } else if (config.durationMode === 'until' && config.endDate) {
      const endTime = config.endTime || '23:59';
      parts.push(`hasta ${formatDateTime(config.endDate, endTime)}`);
    } else if (config.durationMode === 'manual') {
      parts.push('finalización manual');
    }
    
    return parts.join(', ');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ============================================ */}
      {/* SECCIÓN 1: CUÁNDO EMPIEZA */}
      {/* ============================================ */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
          <CalendarClock size={12} />
          ¿Cuándo empieza?
        </label>
        
        {/* Toggle instant/scheduled */}
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <button
            onClick={() => updateConfig({ timingMode: 'instant' })}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              config.timingMode === 'instant'
                ? 'bg-white dark:bg-zinc-700 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            } disabled:opacity-50`}
          >
            <Play size={14} />
            Ahora
          </button>
          <button
            onClick={() => {
              // Set default date to tomorrow and time to current time when switching to scheduled
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const defaultDate = tomorrow.toISOString().split('T')[0];
              const defaultTime = new Date().toTimeString().slice(0, 5);
              updateConfig({ 
                timingMode: 'scheduled',
                scheduledStartDate: config.scheduledStartDate || defaultDate,
                scheduledStartTime: config.scheduledStartTime || defaultTime,
              });
            }}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              config.timingMode === 'scheduled'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            } disabled:opacity-50`}
          >
            <Calendar size={14} />
            Programar inicio
          </button>
        </div>

        {/* Scheduled start inputs */}
        {config.timingMode === 'scheduled' && (
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Fecha</label>
                <input
                  type="date"
                  value={config.scheduledStartDate || ''}
                  min={today}
                  onChange={(e) => updateConfig({ scheduledStartDate: e.target.value })}
                  disabled={disabled}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Hora</label>
                <input
                  type="time"
                  value={config.scheduledStartTime || ''}
                  onChange={(e) => updateConfig({ scheduledStartTime: e.target.value })}
                  disabled={disabled}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {config.scheduledStartDate && config.scheduledStartTime && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Calendar size={10} />
                {formatDateTime(config.scheduledStartDate, config.scheduledStartTime)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* SECCIÓN 2: CUÁNTO DURA */}
      {/* ============================================ */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
          <Timer size={12} />
          ¿Cuánto dura?
        </label>
        
        {/* Toggle fixed/until */}
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <button
            onClick={() => updateConfig({ durationMode: 'fixed' })}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              config.durationMode === 'fixed'
                ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            } disabled:opacity-50`}
          >
            <Clock size={14} />
            Duración fija
          </button>
          <button
            onClick={() => {
              // Set default end date to today and time to 23:59 when switching to until mode
              const defaultEndDate = config.scheduledStartDate || today;
              updateConfig({ 
                durationMode: 'until',
                endDate: config.endDate || defaultEndDate,
                endTime: config.endTime || '23:59',
              });
            }}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              config.durationMode === 'until'
                ? 'bg-white dark:bg-zinc-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            } disabled:opacity-50`}
          >
            <Calendar size={14} />
            Hasta fecha
          </button>
          <button
            onClick={() => updateConfig({ durationMode: 'manual', fixedDuration: 0 })}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              config.durationMode === 'manual'
                ? 'bg-white dark:bg-zinc-700 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            } disabled:opacity-50`}
          >
            <Play size={14} />
            Manual
          </button>
        </div>

        {/* Manual mode info */}
        {config.durationMode === 'manual' && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-green-600 dark:text-green-400">
              El sorteo permanecerá activo hasta que lo finalices manualmente.
            </p>
          </div>
        )}

        {/* Fixed duration */}
        {config.durationMode === 'fixed' && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Quick presets */}
            <div className="flex gap-1.5 flex-wrap">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => updateConfig({ fixedDuration: preset.value })}
                  disabled={disabled}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    config.fixedDuration === preset.value
                      ? 'bg-purple-500 text-white shadow-sm scale-105'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  } disabled:opacity-50`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom duration toggle */}
            <button
              onClick={() => setShowDurationPicker(!showDurationPicker)}
              className="w-full flex items-center justify-between p-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <span>Duración personalizada: {formatDuration(config.fixedDuration)}</span>
              {showDurationPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* HH:MM:SS picker */}
            {showDurationPicker && (
              <div className="flex items-center justify-center gap-1 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                {/* Hours */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => handleHoursChange(hours + 1)}
                    disabled={disabled || hours >= 23}
                    className="p-1 text-zinc-400 hover:text-purple-500 disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={hours.toString().padStart(2, '0')}
                    onChange={(e) => handleHoursChange(parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-10 h-9 text-center text-lg font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleHoursChange(hours - 1)}
                    disabled={disabled || hours <= 0}
                    className="p-1 text-zinc-400 hover:text-purple-500 disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <span className="text-[10px] text-zinc-400">h</span>
                </div>

                <span className="text-lg font-bold text-zinc-400 mx-0.5">:</span>

                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => handleMinutesChange(minutes + 1)}
                    disabled={disabled || minutes >= 59}
                    className="p-1 text-zinc-400 hover:text-purple-500 disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minutes.toString().padStart(2, '0')}
                    onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-10 h-9 text-center text-lg font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleMinutesChange(minutes - 1)}
                    disabled={disabled || minutes <= 0}
                    className="p-1 text-zinc-400 hover:text-purple-500 disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <span className="text-[10px] text-zinc-400">m</span>
                </div>

                <span className="text-lg font-bold text-zinc-400 mx-0.5">:</span>

                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => handleSecondsChange(seconds + 1)}
                    disabled={disabled || seconds >= 59}
                    className="p-1 text-zinc-400 hover:text-purple-500 disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={seconds.toString().padStart(2, '0')}
                    onChange={(e) => handleSecondsChange(parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-10 h-9 text-center text-lg font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSecondsChange(seconds - 1)}
                    disabled={disabled || seconds <= 0}
                    className="p-1 text-zinc-400 hover:text-purple-500 disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <span className="text-[10px] text-zinc-400">s</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Until date/time */}
        {config.durationMode === 'until' && (
          <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Fecha fin</label>
                <input
                  type="date"
                  value={config.endDate || ''}
                  min={config.scheduledStartDate || today}
                  onChange={(e) => updateConfig({ endDate: e.target.value })}
                  disabled={disabled}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm disabled:opacity-50 focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Hora fin</label>
                <input
                  type="time"
                  value={config.endTime || ''}
                  onChange={(e) => updateConfig({ endTime: e.target.value })}
                  disabled={disabled}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm disabled:opacity-50 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            {/* Calculated duration */}
            {calculatedDuration !== null && (
              <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg">
                <Timer size={12} className="text-purple-500" />
                <span className="text-xs text-purple-600 dark:text-purple-400">
                  Duración: <span className="font-bold">{formatDuration(calculatedDuration)}</span>
                </span>
              </div>
            )}
            
            {calculatedDuration !== null && calculatedDuration < 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <Info size={12} />
                La fecha de fin debe ser posterior al inicio
              </p>
            )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* RESUMEN */}
      {/* ============================================ */}
      <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {getSummary()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RaffleTimingConfigComponent;
