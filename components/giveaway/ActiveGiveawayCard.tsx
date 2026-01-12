/**
 * ActiveGiveawayCard Component
 * Card for displaying an active giveaway with image, timer, and actions
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Trophy, 
  Users, 
  Clock, 
  Edit2,
  ChevronDown,
  ChevronUp,
  Gift,
  X,
  StopCircle,
  AlertTriangle
} from 'lucide-react';
import type { GiveawayThread } from './types';

// ============================================
// TYPES
// ============================================

export interface ActiveGiveawayCardProps {
  /** Thread data */
  thread: GiveawayThread;
  /** Callback to toggle pause state */
  onTogglePause?: (id: string) => void;
  /** Callback to delete thread */
  onDelete?: (id: string) => void;
  /** Callback to pick winner */
  onPickWinner?: (id: string) => void;
  /** Callback to close winner and save to history */
  onCloseWinner?: (id: string) => void;
  /** Callback to edit thread */
  onEdit?: (id: string) => void;
  /** Callback to activate a scheduled thread immediately */
  onActivateNow?: (id: string) => void;
  /** Get unique participant count */
  getUniqueCount?: (thread: GiveawayThread) => number;
  /** Compact mode - horizontal layout */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Is this card currently spinning/selecting winner */
  isSpinning?: boolean;
  /** Current name being displayed during spin animation */
  spinningName?: string;
}

// ============================================
// COUNTDOWN HOOK
// ============================================

interface CountdownResult {
  timeLeft: number;
  isExpired: boolean;
  isWaiting: boolean; // True if waiting for scheduled start
  displayText: string;
}

const useCountdown = (startsAt?: number, endsAt?: number, isPaused?: boolean, timeRemaining?: number): CountdownResult => {
  const [result, setResult] = useState<CountdownResult>({
    timeLeft: 0,
    isExpired: false,
    isWaiting: false,
    displayText: '',
  });

  useEffect(() => {
    if (isPaused && timeRemaining !== undefined) {
      setResult({
        timeLeft: timeRemaining,
        isExpired: false,
        isWaiting: false,
        displayText: formatTime(timeRemaining),
      });
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      
      // Check if waiting for scheduled start
      if (startsAt && startsAt > now) {
        const diff = Math.max(0, Math.floor((startsAt - now) / 1000));
        setResult({
          timeLeft: diff,
          isExpired: false,
          isWaiting: true,
          displayText: `Empieza en ${formatTimeVerbose(diff)}`,
        });
        return;
      }
      
      // Check end time
      if (endsAt) {
        const diff = Math.max(0, Math.floor((endsAt - now) / 1000));
        setResult({
          timeLeft: diff,
          isExpired: diff <= 0,
          isWaiting: false,
          displayText: diff <= 0 ? '¡Finalizado!' : formatTime(diff),
        });
        return;
      }
      
      // No time configured
      setResult({
        timeLeft: 0,
        isExpired: false,
        isWaiting: false,
        displayText: 'Sin límite',
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startsAt, endsAt, isPaused, timeRemaining]);

  return result;
};

// ============================================
// FORMAT TIME
// ============================================

const formatTime = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeVerbose = (seconds: number): string => {
  if (seconds <= 0) return '0s';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  return `${secs}s`;
};

// ============================================
// COMPONENT
// ============================================

export const ActiveGiveawayCard: React.FC<ActiveGiveawayCardProps> = ({
  thread,
  onTogglePause,
  onDelete,
  onPickWinner,
  onCloseWinner,
  onEdit,
  onActivateNow,
  getUniqueCount,
  compact = false,
  className = '',
  isSpinning = false,
  spinningName = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const { timeLeft, isExpired, isWaiting, displayText } = useCountdown(
    thread.startsAt, 
    thread.endsAt, 
    thread.isPaused, 
    thread.timeRemaining
  );
  
  const uniqueCount = getUniqueCount ? getUniqueCount(thread) : thread.participants.length;
  const hasImage = thread.prizeImages && thread.prizeImages.length > 0;
  const isPaused = thread.isPaused || false;
  const isActive = thread.isActive && !isPaused && !isWaiting;
  const hasWinner = !!thread.winner;

  // Progress percentage
  const progress = thread.timerDuration && thread.timerDuration > 0
    ? Math.max(0, Math.min(100, ((thread.timerDuration - timeLeft) / thread.timerDuration) * 100))
    : 0;

  // ============================================
  // COMPACT VIEW
  // ============================================
  if (compact) {
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-xl shadow-md overflow-hidden flex ${hasWinner ? 'ring-2 ring-yellow-500' : isSpinning ? 'ring-2 ring-purple-500 animate-pulse' : ''} ${className}`}>
        {/* Small image */}
        {hasImage && (
          <div className="w-20 h-20 flex-shrink-0">
            <img src={thread.prizeImages![0]} alt={thread.name} className="w-full h-full object-cover" />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 p-3 flex items-center gap-3 min-w-0">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-zinc-800 dark:text-white text-sm truncate">{thread.name}</h3>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                isSpinning ? 'bg-purple-500/20 text-purple-600 animate-pulse' : hasWinner ? 'bg-yellow-500/20 text-yellow-600' : isWaiting ? 'bg-blue-500/20 text-blue-600' : isActive ? 'bg-green-500/20 text-green-600' : isPaused ? 'bg-yellow-500/20 text-yellow-600' : 'bg-zinc-500/20 text-zinc-500'
              }`}>
                {isSpinning ? '🎲 Sorteando...' : hasWinner ? '🏆 Ganador' : isWaiting ? 'Programado' : isActive ? 'Activo' : isPaused ? 'Pausado' : 'Fin'}
              </span>
            </div>
            {isSpinning ? (
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="font-bold text-purple-600 dark:text-purple-400 animate-pulse">
                  {spinningName || '...'}
                </span>
              </div>
            ) : hasWinner ? (
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="font-bold text-yellow-600 dark:text-yellow-400">
                  {thread.winner?.username}
                </span>
                <span className="text-zinc-500">
                  de {uniqueCount} participantes
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {uniqueCount}
                </span>
                {(thread.endsAt || thread.startsAt) && (
                  <span className={`flex items-center gap-1 ${isWaiting ? 'text-blue-500' : isExpired ? 'text-red-500' : ''} ${!isWaiting ? 'font-mono' : ''}`}>
                    <Clock size={12} />
                    {isWaiting ? displayText : formatTime(timeLeft)}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasWinner ? (
              /* Winner actions */
              onCloseWinner && (
                <button onClick={() => onCloseWinner(thread.id)} className="p-1.5 rounded-lg text-green-500 hover:bg-green-500/10" title="Cerrar y guardar">
                  <X size={14} />
                </button>
              )
            ) : (
              /* Normal actions */
              <>
                {/* Iniciar ahora - solo para sorteos programados (isWaiting) */}
                {onActivateNow && isWaiting && (
                  <button 
                    onClick={() => onActivateNow(thread.id)} 
                    className="p-1.5 rounded-lg text-green-500 bg-green-500/20 hover:bg-green-500/30"
                    title="Iniciar ahora"
                  >
                    <Play size={14} />
                  </button>
                )}
                {onTogglePause && !isExpired && !isWaiting && (
                  <button onClick={() => onTogglePause(thread.id)} className={`p-1.5 rounded-lg ${isPaused ? 'text-green-500 hover:bg-green-500/10' : 'text-yellow-500 hover:bg-yellow-500/10'}`}>
                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  </button>
                )}
                {/* Finalizar y sortear - solo si hay participantes y no ha expirado */}
                {onPickWinner && uniqueCount > 0 && !isExpired && !isWaiting && (
                  showFinishConfirm ? (
                    <div className="flex items-center gap-1 bg-orange-500/10 rounded-lg px-1">
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 whitespace-nowrap">¿Sortear?</span>
                      <button 
                        onClick={() => { onPickWinner(thread.id); setShowFinishConfirm(false); }}
                        className="p-1 rounded text-green-500 hover:bg-green-500/20"
                        title="Confirmar"
                      >
                        <Play size={12} />
                      </button>
                      <button 
                        onClick={() => setShowFinishConfirm(false)}
                        className="p-1 rounded text-red-500 hover:bg-red-500/20"
                        title="Cancelar"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowFinishConfirm(true)}
                      className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-500/10"
                      title="Finalizar y sortear"
                    >
                      <StopCircle size={14} />
                    </button>
                  )
                )}
                {onPickWinner && uniqueCount > 0 && isExpired && (
                  <button 
                    onClick={() => onPickWinner(thread.id)} 
                    className="p-1.5 rounded-lg text-purple-500 bg-purple-500/20 hover:bg-purple-500/30"
                    title="Sortear"
                  >
                    <Trophy size={14} />
                  </button>
                )}
                {onEdit && (
                  <button onClick={() => onEdit(thread.id)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Edit2 size={14} />
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(thread.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        {thread.timerDuration && thread.timerDuration > 0 && !hasWinner && (
          <div className="w-1 bg-zinc-200 dark:bg-zinc-800 self-stretch">
            <div 
              className={`w-full transition-all ${isExpired ? 'bg-red-500' : isPaused ? 'bg-yellow-500' : 'bg-purple-500'}`}
              style={{ height: `${100 - progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // EXPANDED VIEW (default)
  // ============================================
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden ${hasWinner ? 'ring-2 ring-yellow-500' : ''} ${className}`}>
      {/* Image section */}
      {hasImage ? (
        <div className="relative h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          {/* Show all images in a row */}
          <div className="w-full h-full flex">
            {thread.prizeImages!.slice(0, 3).map((img, idx) => (
              <div 
                key={idx} 
                className="flex-1 h-full overflow-hidden"
                style={{ 
                  borderRight: idx < thread.prizeImages!.length - 1 && idx < 2 ? '2px solid rgba(255,255,255,0.2)' : 'none' 
                }}
              >
                <img
                  src={img}
                  alt={`Premio ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          {/* Overlay with status */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <h3 className="font-bold text-white text-lg truncate">{thread.name}</h3>
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              hasWinner ? 'bg-yellow-500 text-black' : isWaiting ? 'bg-blue-500 text-white' : isActive ? 'bg-green-500 text-white' : isPaused ? 'bg-yellow-500 text-black' : 'bg-zinc-500 text-white'
            }`}>
              {hasWinner ? '🏆 Ganador' : isWaiting ? 'Programado' : isActive ? 'Activo' : isPaused ? 'Pausado' : 'Finalizado'}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-24 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Gift size={40} className="text-white/30" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <h3 className="font-bold text-white text-lg truncate">{thread.name}</h3>
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              hasWinner ? 'bg-yellow-500 text-black' : isWaiting ? 'bg-blue-500 text-white' : isActive ? 'bg-green-500 text-white' : isPaused ? 'bg-yellow-500 text-black' : 'bg-zinc-500 text-white'
            }`}>
              {hasWinner ? '🏆 Ganador' : isWaiting ? 'Programado' : isActive ? 'Activo' : isPaused ? 'Pausado' : 'Finalizado'}
            </div>
          </div>
        </div>
      )}

      {/* Timer bar */}
      {thread.timerDuration && thread.timerDuration > 0 && !hasWinner && (
        <div className="h-1 bg-zinc-200 dark:bg-zinc-800">
          <div 
            className={`h-full transition-all duration-1000 ${
              isExpired ? 'bg-red-500' : isPaused ? 'bg-yellow-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            style={{ width: `${100 - progress}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Spinning animation */}
        {isSpinning && !hasWinner && (
          <div className="space-y-4">
            <div className="text-center py-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl animate-pulse">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Gift className="text-purple-500 animate-bounce" size={24} />
                <span className="text-sm text-purple-500 font-medium">Seleccionando...</span>
              </div>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 animate-pulse">
                {spinningName || '...'}
              </p>
              <p className="text-sm text-zinc-500 mt-2">
                {uniqueCount} participantes
              </p>
            </div>
          </div>
        )}

        {/* Winner display */}
        {hasWinner && !isSpinning ? (
          <div className="space-y-4">
            <div className="text-center py-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl">
              <Trophy className="mx-auto text-yellow-500 mb-2" size={32} />
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {thread.winner?.username}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                de {uniqueCount} participantes
              </p>
            </div>
            
            {/* Close button */}
            {onCloseWinner && (
              <button
                onClick={() => onCloseWinner(thread.id)}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <X size={16} />
                Cerrar y guardar en historial
              </button>
            )}
          </div>
        ) : !isSpinning ? (
          <>
            {/* Stats row */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Participants */}
                <div className="flex items-center gap-1">
                  <Users size={14} className="text-purple-500" />
                  <span className="font-bold text-zinc-800 dark:text-white text-sm">{uniqueCount}</span>
                </div>

                {/* Timer */}
                {(thread.endsAt || thread.startsAt) && (
                  <div className="flex items-center gap-1">
                    <Clock size={14} className={isWaiting ? 'text-blue-500' : isExpired ? 'text-red-500' : isPaused ? 'text-yellow-500' : 'text-green-500'} />
                    <span className={`font-bold text-sm ${
                      isWaiting ? 'text-blue-500' : isExpired ? 'text-red-500 font-mono' : isPaused ? 'text-yellow-500 font-mono' : 'text-zinc-800 dark:text-white font-mono'
                    }`}>
                      {isWaiting ? displayText : formatTime(timeLeft)}
                    </span>
                  </div>
                )}
              </div>

              {/* Expand button */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Iniciar ahora - solo para sorteos programados (isWaiting) */}
              {onActivateNow && isWaiting && (
                <button
                  onClick={() => onActivateNow(thread.id)}
                  className="flex-1 min-w-[100px] py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white transition-colors"
                >
                  <Play size={14} />
                  Iniciar ahora
                </button>
              )}

              {onTogglePause && !isExpired && !isWaiting && (
                <button
                  onClick={() => onTogglePause(thread.id)}
                  className={`flex-1 min-w-[80px] py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-colors ${
                    isPaused
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                  }`}
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  <span className="hidden xs:inline">{isPaused ? 'Reanudar' : 'Pausar'}</span>
                </button>
              )}

              {/* Finalizar y sortear - solo si hay participantes y no ha expirado y no está esperando */}
              {onPickWinner && uniqueCount > 0 && !isExpired && !isWaiting && (
                showFinishConfirm ? (
                  <div className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-orange-500/10 flex items-center justify-center gap-2">
                    <AlertTriangle size={14} className="text-orange-500" />
                    <span className="text-xs text-orange-600 dark:text-orange-400">¿Finalizar y sortear?</span>
                    <button 
                      onClick={() => { onPickWinner(thread.id); setShowFinishConfirm(false); }}
                      className="p-1 rounded-lg bg-green-500 text-white hover:bg-green-600"
                      title="Confirmar"
                    >
                      <Play size={12} />
                    </button>
                    <button 
                      onClick={() => setShowFinishConfirm(false)}
                      className="p-1 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                      title="Cancelar"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowFinishConfirm(true)}
                    className="flex-1 min-w-[80px] py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                    title="Finalizar tiempo y sortear"
                  >
                    <StopCircle size={14} />
                    <span className="hidden xs:inline">Finalizar</span>
                  </button>
                )
              )}

              {/* Sortear - solo cuando ha expirado */}
              {onPickWinner && uniqueCount > 0 && isExpired && (
                <button
                  onClick={() => onPickWinner(thread.id)}
                  className="flex-1 min-w-[100px] py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-opacity bg-gradient-to-r from-purple-600 to-pink-600 text-white ring-2 ring-purple-400 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
                >
                  <Trophy size={14} />
                  <span className="hidden xs:inline">Sortear</span>
                </button>
              )}

              <div className="flex gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(thread.id)}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => onDelete(thread.id)}
                    className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                {/* Prize description */}
                {thread.prizeDescription && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-medium mb-1">Premio</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{thread.prizeDescription}</p>
                  </div>
                )}

                {/* Keyword */}
                {thread.keyword && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-medium mb-1">Palabra clave</p>
                    <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-purple-600 dark:text-purple-400">
                      {thread.keyword}
                    </code>
                  </div>
                )}

                {/* Recent participants */}
                {thread.participants.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-medium mb-1">Últimos participantes</p>
                    <div className="flex flex-wrap gap-1">
                      {thread.participants.slice(-8).map((p, i) => (
                        <span
                          key={`${p.oderId}-${i}`}
                          className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400"
                        >
                          {p.username}
                        </span>
                      ))}
                      {thread.participants.length > 8 && (
                        <span className="text-xs px-2 py-0.5 text-zinc-400">
                          +{thread.participants.length - 8} más
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Created at */}
                <p className="text-xs text-zinc-400">
                  Creado: {new Date(thread.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ActiveGiveawayCard;
