/**
 * DurationPicker Component
 * Selector de duración con formato hh:mm:ss
 * 
 * Separación clara de conceptos:
 * - DURACIÓN: Cuánto tiempo dura el sorteo (ej: 5 minutos)
 * - PROGRAMAR: Cuándo empieza (ej: mañana a las 18:00)
 * 
 * Ambos son INDEPENDIENTES: puedes programar un sorteo para mañana
 * que dure solo 5 minutos.
 */

import React, { useState, useMemo } from 'react';
import { Clock, Calendar, ChevronDown, ChevronUp, Timer, CalendarClock, Info } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface DurationPickerProps {
  /** Duration in seconds */
  value: number;
  /** Callback when duration changes */
  onChange: (seconds: number) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Show scheduled mode (date/time range) */
  showScheduled?: boolean;
  /** Scheduled start date */
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  /** Scheduled start time */
  startTime?: string;
  onStartTimeChange?: (time: string) => void;
  /** Scheduled end date - DEPRECATED: use duration instead */
  endDate?: string;
  onEndDateChange?: (date: string) => void;
  /** Scheduled end time - DEPRECATED: use duration instead */
  endTime?: string;
  onEndTimeChange?: (time: string) => void;
  /** Start now toggle */
  startNow?: boolean;
  onStartNowChange?: (startNow: boolean) => void;
  /** Custom class */
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

const formatDuration = (totalSeconds: number): string => {
  const { hours, minutes, seconds } = secondsToHMS(totalSeconds);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
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

export const DurationPicker: React.FC<DurationPickerProps> = ({
  value,
  onChange,
  disabled = false,
  showScheduled = false,
  startDate = '',
  onStartDateChange,
  startTime = '',
  onStartTimeChange,
  startNow = true,
  onStartNowChange,
  className = '',
}) => {
  // Auto-expand custom duration when value is 0 (expired timer)
  const [showCustomDuration, setShowCustomDuration] = useState(value === 0);
  const { hours, minutes, seconds } = secondsToHMS(value);

  // Get today's date for min attribute
  const today = new Date().toISOString().split('T')[0];

  // Handlers
  const handleHoursChange = (newHours: number) => {
    const clamped = Math.max(0, Math.min(23, newHours));
    onChange(hmsToSeconds(clamped, minutes, seconds));
  };

  const handleMinutesChange = (newMinutes: number) => {
    const clamped = Math.max(0, Math.min(59, newMinutes));
    onChange(hmsToSeconds(hours, clamped, seconds));
  };

  const handleSecondsChange = (newSeconds: number) => {
    const clamped = Math.max(0, Math.min(59, newSeconds));
    onChange(hmsToSeconds(hours, minutes, clamped));
  };

  // Summary text
  const summary = useMemo(() => {
    const parts: string[] = [];
    
    if (startNow) {
      parts.push('Empieza ahora');
    } else if (startDate && startTime) {
      parts.push(`Empieza ${formatDateTime(startDate, startTime)}`);
    } else {
      parts.push('Empieza ahora');
    }
    
    parts.push(`dura ${formatDuration(value)}`);
    
    return parts.join(', ');
  }, [startNow, startDate, startTime, value]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ============================================ */}
      {/* SECCIÓN 1: DURACIÓN DEL SORTEO */}
      {/* ============================================ */}
      <div className="space-y-3">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
          <Timer size={12} />
          Duración del sorteo
        </label>

        {/* Quick presets */}
        <div className="flex gap-1.5 flex-wrap">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onChange(preset.value)}
              disabled={disabled}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                value === preset.value
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
          onClick={() => setShowCustomDuration(!showCustomDuration)}
          disabled={disabled}
          className="w-full flex items-center justify-between p-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            Personalizar: {value === 0 ? '00:00:00 (finalizado)' : formatDuration(value)}
          </span>
          {showCustomDuration ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* HH:MM:SS picker */}
        {showCustomDuration && (
          <div className="flex items-center justify-center gap-1 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl animate-in slide-in-from-top-2 duration-200">
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


      {/* ============================================ */}
      {/* SECCIÓN 2: PROGRAMAR INICIO (opcional) */}
      {/* ============================================ */}
      {showScheduled && onStartNowChange && (
        <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              <CalendarClock size={12} />
              Programar inicio
            </label>
            <button
              onClick={() => onStartNowChange(!startNow)}
              disabled={disabled}
              className={`
                relative w-10 h-5 rounded-full transition-colors
                ${!startNow ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'}
                disabled:opacity-50
              `}
              aria-label={startNow ? 'Programar inicio' : 'Iniciar ahora'}
            >
              <span
                className={`
                  absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm
                  ${!startNow ? 'left-5' : 'left-0.5'}
                `}
              />
            </button>
          </div>

          {/* Scheduled start inputs */}
          {!startNow && onStartDateChange && onStartTimeChange && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <Calendar size={12} />
                <span>El sorteo comenzará automáticamente en la fecha/hora indicada</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Fecha</label>
                  <input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Hora</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => onStartTimeChange(e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {startDate && startTime && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  📅 {formatDateTime(startDate, startTime)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* RESUMEN */}
      {/* ============================================ */}
      <div className="p-2.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
        <div className="flex items-center gap-2">
          <Info size={12} className="text-purple-500 flex-shrink-0" />
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DurationPicker;
