/**
 * MultiWinnerConfig Component
 * Configuration for selecting multiple winners
 */

import React from 'react';
import { Trophy, Users, Gift, Plus, X } from 'lucide-react';

interface MultiWinnerConfigProps {
  winnersCount: number;
  onWinnersCountChange: (count: number) => void;
  allowRepeatWinners: boolean;
  onAllowRepeatChange: (allow: boolean) => void;
  prizes: string[];
  onPrizesChange: (prizes: string[]) => void;
  disabled?: boolean;
  participantCount?: number;
}

export const MultiWinnerConfig: React.FC<MultiWinnerConfigProps> = ({
  winnersCount,
  onWinnersCountChange,
  allowRepeatWinners,
  onAllowRepeatChange,
  prizes,
  onPrizesChange,
  disabled = false,
  participantCount = 0,
}) => {
  const maxWinners = allowRepeatWinners ? 10 : Math.min(10, participantCount || 10);

  const handleCountChange = (value: string) => {
    const num = parseInt(value) || 1;
    onWinnersCountChange(Math.max(1, Math.min(maxWinners, num)));
  };

  const handlePrizeChange = (index: number, value: string) => {
    const newPrizes = [...prizes];
    newPrizes[index] = value;
    onPrizesChange(newPrizes);
  };

  const addPrize = () => {
    if (prizes.length < winnersCount) {
      onPrizesChange([...prizes, '']);
    }
  };

  const removePrize = (index: number) => {
    onPrizesChange(prizes.filter((_, i) => i !== index));
  };

  const getPositionLabel = (pos: number): string => {
    if (pos === 1) return '1º';
    if (pos === 2) return '2º';
    if (pos === 3) return '3º';
    return `${pos}º`;
  };

  const getPositionColor = (pos: number): string => {
    if (pos === 1) return 'text-yellow-500';
    if (pos === 2) return 'text-zinc-400';
    if (pos === 3) return 'text-amber-600';
    return 'text-zinc-500';
  };

  return (
    <div className="space-y-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <div className="flex items-center gap-2">
        <Trophy size={16} className="text-amber-500" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Múltiples ganadores
        </span>
      </div>

      {/* Winners count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Número de ganadores
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onWinnersCountChange(Math.max(1, winnersCount - 1))}
            disabled={disabled || winnersCount <= 1}
            className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 flex items-center justify-center"
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={winnersCount}
            onChange={(e) => handleCountChange(e.target.value)}
            disabled={disabled}
            className="w-12 text-center py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-50"
          />
          <button
            onClick={() => onWinnersCountChange(Math.min(maxWinners, winnersCount + 1))}
            disabled={disabled || winnersCount >= maxWinners}
            className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {/* Allow repeat winners toggle */}
      {winnersCount > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-zinc-400" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Permitir repetir ganador
            </span>
          </div>
          <button
            onClick={() => onAllowRepeatChange(!allowRepeatWinners)}
            disabled={disabled}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              allowRepeatWinners ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'
            } disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              allowRepeatWinners ? 'left-5' : 'left-0.5'
            }`} />
          </button>
        </div>
      )}

      {/* Prizes per position */}
      {winnersCount > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift size={14} className="text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Premios por posición
              </span>
            </div>
            {prizes.length < winnersCount && (
              <button
                onClick={addPrize}
                disabled={disabled}
                className="p-1 rounded hover:bg-amber-500/20 text-amber-500 disabled:opacity-50"
                title="Añadir premio"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {prizes.length > 0 && (
            <div className="space-y-1.5">
              {prizes.map((prize, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={`text-sm font-medium w-6 ${getPositionColor(index + 1)}`}>
                    {getPositionLabel(index + 1)}
                  </span>
                  <input
                    type="text"
                    value={prize}
                    onChange={(e) => handlePrizeChange(index, e.target.value)}
                    disabled={disabled}
                    placeholder={`Premio ${index + 1}º puesto`}
                    className="flex-1 px-2 py-1 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 disabled:opacity-50"
                  />
                  <button
                    onClick={() => removePrize(index)}
                    disabled={disabled}
                    className="p-1 rounded hover:bg-red-500/20 text-red-500 disabled:opacity-50"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {prizes.length === 0 && (
            <p className="text-xs text-zinc-500 italic">
              Sin premios configurados (opcional)
            </p>
          )}
        </div>
      )}

      {/* Info text */}
      {winnersCount > 1 && !allowRepeatWinners && participantCount > 0 && participantCount < winnersCount && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️ Solo hay {participantCount} participantes, se seleccionarán máximo {participantCount} ganadores
        </p>
      )}
    </div>
  );
};

export default MultiWinnerConfig;
