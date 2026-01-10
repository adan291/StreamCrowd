/**
 * ScheduleModal Component
 * Modal for scheduling giveaways
 */

import React, { useState } from 'react';
import { Calendar, Clock, Repeat, Play, Trash2 } from 'lucide-react';
import { AnimatedModal, ModalButton } from './AnimatedModal';
import { SchedulerService } from './services/SchedulerService';
import type { RaffleConfig, RepeatType, ScheduledGiveaway } from './types';

interface ScheduleModalProps {
  config: RaffleConfig;
  onClose: () => void;
  onScheduled?: (scheduled: ScheduledGiveaway) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  config,
  onClose,
  onScheduled,
}) => {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return d.toTimeString().slice(0, 5);
  });
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatType, setRepeatType] = useState<RepeatType>('once');
  const [repeatInterval, setRepeatInterval] = useState(30);
  const [maxExecutions, setMaxExecutions] = useState<number | undefined>(undefined);

  const scheduled = SchedulerService.getPending();

  const handleSchedule = () => {
    const scheduledAt = new Date(`${date}T${time}`).getTime();
    
    if (scheduledAt <= Date.now()) {
      alert('La fecha debe ser en el futuro');
      return;
    }

    const repeatConfig = repeatEnabled && repeatType !== 'once' ? {
      type: repeatType,
      interval: repeatInterval,
      maxExecutions,
      executionCount: 0,
    } : undefined;

    const newScheduled = SchedulerService.addScheduled(config, scheduledAt, repeatConfig);
    onScheduled?.(newScheduled);
    onClose();
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este sorteo programado?')) {
      SchedulerService.deleteScheduled(id);
    }
  };

  const handleExecuteNow = (s: ScheduledGiveaway) => {
    SchedulerService.updateScheduled(s.id, { 
      nextExecutionAt: Date.now() - 1000,
      status: 'pending' 
    });
    onClose();
  };

  return (
    <AnimatedModal
      isOpen={true}
      onClose={onClose}
      title="Programar Sorteo"
      icon={<Calendar size={20} />}
      size="md"
    >
      <div className="space-y-4">
        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 border-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Hora</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 border-none text-sm"
            />
          </div>
        </div>

        {/* Repeat toggle */}
        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Repeat size={16} className="text-zinc-500" />
            <span className="text-sm">Repetir</span>
          </div>
          <button
            onClick={() => setRepeatEnabled(!repeatEnabled)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              repeatEnabled ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              repeatEnabled ? 'left-5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {/* Repeat config */}
        {repeatEnabled && (
          <div className="space-y-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Frecuencia</label>
              <div className="flex gap-1">
                {(['minutes', 'hours', 'daily'] as RepeatType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setRepeatType(type)}
                    className={`flex-1 py-1.5 text-xs rounded-lg ${
                      repeatType === type
                        ? 'bg-purple-500 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  >
                    {type === 'minutes' ? 'Minutos' : type === 'hours' ? 'Horas' : 'Diario'}
                  </button>
                ))}
              </div>
            </div>

            {repeatType !== 'daily' && (
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">
                  Cada {repeatType === 'minutes' ? 'X minutos' : 'X horas'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={repeatInterval}
                  onChange={e => setRepeatInterval(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">
                Máx. ejecuciones (vacío = ilimitado)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={maxExecutions || ''}
                onChange={e => setMaxExecutions(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Ilimitado"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm"
              />
            </div>
          </div>
        )}

        {/* Config summary */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-xl text-sm">
          <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">Configuración del sorteo:</p>
          <p className="text-xs text-zinc-500">
            Modo: {config.keyword ? `Keyword "${config.keyword}"` : 'Viewers'}
            {config.useTimer && ` • ${config.timerDuration}s`}
            {config.subsOnly && ' • Solo subs'}
          </p>
        </div>

        {/* Schedule button */}
        <ModalButton onClick={handleSchedule} variant="primary" className="w-full">
          Programar Sorteo
        </ModalButton>

        {/* Scheduled list */}
        {scheduled.length > 0 && (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Sorteos programados ({scheduled.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {scheduled.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{s.config.keyword || 'Viewers'}</p>
                    <p className="text-xs text-zinc-500">
                      <Clock size={10} className="inline mr-1" />
                      {SchedulerService.formatNextExecution(s)}
                      {s.repeatConfig && <Repeat size={10} className="inline ml-2" />}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleExecuteNow(s)}
                      className="p-1 text-green-500 hover:bg-green-500/10 rounded"
                      title="Ejecutar ahora"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnimatedModal>
  );
};

export default ScheduleModal;
