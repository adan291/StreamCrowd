import React, { useState } from 'react';
import type { MobileAppState, MobileMessage, MobileTimerCreateData } from '../../types/mobile';

/**
 * TimersScreen - View and control timers from mobile
 * @requirements Task 10 - Crear TimersScreen
 */

interface TimersScreenProps {
  state: MobileAppState;
  onAction: (action: MobileMessage) => void;
  onBack: () => void;
}

export const TimersScreen: React.FC<TimersScreenProps> = ({
  state,
  onAction,
  onBack,
}) => {
  const { timers } = state;
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('5');
  const [seconds, setSeconds] = useState('0');

  const handleCreate = () => {
    const totalSeconds = (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
    if (totalSeconds <= 0) return;

    const data: MobileTimerCreateData = {
      name: name.trim() || 'Timer',
      duration: totalSeconds,
      autoStart: true,
    };

    onAction({ type: 'TIMER_CREATE', data });
    setShowCreate(false);
    setName('');
    setMinutes('5');
    setSeconds('0');
  };

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeTimers = timers.filter(t => !t.isFinished);
  const finishedTimers = timers.filter(t => t.isFinished);

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="bg-zinc-900 px-4 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Timers</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="p-2 text-purple-400 hover:text-purple-300 rounded-lg hover:bg-zinc-800"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Create Timer Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="w-full bg-zinc-900 rounded-t-3xl p-6 pb-safe animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Nuevo Timer</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Timer"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Duración</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      min="0"
                      max="999"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center text-xl font-mono focus:outline-none focus:border-purple-500"
                    />
                    <span className="block text-center text-xs text-zinc-500 mt-1">minutos</span>
                  </div>
                  <span className="text-2xl text-zinc-500 self-start pt-3">:</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={seconds}
                      onChange={(e) => setSeconds(e.target.value)}
                      min="0"
                      max="59"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center text-xl font-mono focus:outline-none focus:border-purple-500"
                    />
                    <span className="block text-center text-xs text-zinc-500 mt-1">segundos</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full py-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Crear y Empezar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Active Timers */}
        {activeTimers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Activos</h2>
            <div className="space-y-3">
              {activeTimers.map((timer) => (
                <TimerCard
                  key={timer.id}
                  timer={timer}
                  onAction={onAction}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </div>
        )}

        {/* Finished Timers */}
        {finishedTimers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Finalizados</h2>
            <div className="space-y-3">
              {finishedTimers.map((timer) => (
                <TimerCard
                  key={timer.id}
                  timer={timer}
                  onAction={onAction}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {timers.length === 0 && (
          <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
            <div className="text-4xl mb-4">⏱️</div>
            <h2 className="text-white font-medium mb-2">Sin timers</h2>
            <p className="text-zinc-500 text-sm mb-6">Crea un timer para tu stream</p>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              Nuevo Timer
            </button>
          </div>
        )}

        {/* Quick Timers */}
        {timers.length === 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Timers Rápidos</h3>
            <div className="grid grid-cols-3 gap-2">
              {[1, 3, 5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    onAction({
                      type: 'TIMER_CREATE',
                      data: { name: `${mins} min`, duration: mins * 60, autoStart: true }
                    });
                  }}
                  className="py-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <span className="text-white font-medium">{mins} min</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TimerCardProps {
  timer: {
    id: string;
    name: string;
    duration: number;
    remaining: number;
    isRunning: boolean;
    isPaused: boolean;
    isFinished: boolean;
  };
  onAction: (action: MobileMessage) => void;
  formatTime: (seconds: number) => string;
}

const TimerCard: React.FC<TimerCardProps> = ({ timer, onAction, formatTime }) => {
  const progress = timer.duration > 0 ? ((timer.duration - timer.remaining) / timer.duration) * 100 : 0;

  return (
    <div className={`bg-zinc-900 rounded-xl p-4 border ${timer.isFinished ? 'border-green-500/30' : timer.isRunning ? 'border-purple-500/30' : 'border-zinc-800'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-medium">{timer.name}</span>
        {timer.isFinished ? (
          <span className="text-xs font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
            TERMINADO
          </span>
        ) : timer.isRunning ? (
          <span className="text-xs font-medium text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
            EN CURSO
          </span>
        ) : (
          <span className="text-xs font-medium text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded-full">
            PAUSADO
          </span>
        )}
      </div>

      <div className="text-3xl font-mono text-white text-center mb-3">
        {formatTime(timer.remaining)}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${timer.isFinished ? 'bg-green-500' : 'bg-purple-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!timer.isFinished && (
          <>
            {timer.isRunning ? (
              <button
                onClick={() => onAction({ type: 'TIMER_PAUSE', data: { timerId: timer.id } })}
                className="flex-1 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-medium hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pausar
              </button>
            ) : (
              <button
                onClick={() => onAction({ type: 'TIMER_START', data: { timerId: timer.id } })}
                className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Reanudar
              </button>
            )}
          </>
        )}
        <button
          onClick={() => onAction({ type: 'TIMER_RESET', data: { timerId: timer.id } })}
          className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg font-medium hover:bg-zinc-700 transition-colors"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
};

export default TimersScreen;
