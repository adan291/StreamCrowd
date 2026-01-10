/**
 * TooltipSettings Component
 * Settings panel for tooltip preferences
 */

import React from 'react';
import { HelpCircle, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTooltipPreference } from '../../hooks/useTooltipPreference';

// ============================================
// TYPES
// ============================================

export interface TooltipSettingsProps {
  className?: string;
  compact?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const TooltipSettings: React.FC<TooltipSettingsProps> = ({
  className = '',
  compact = false,
}) => {
  const { preference, setEnabled, setDelay } = useTooltipPreference();

  return (
    <div className={`space-y-3 ${className}`}>
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tooltips
          </span>
        </div>
      )}

      {/* Enable/Disable toggle */}
      <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
        <div className="flex items-center gap-2">
          {preference.enabled ? (
            <ToggleRight size={16} className="text-green-500" />
          ) : (
            <ToggleLeft size={16} className="text-zinc-400" />
          )}
          <div>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Mostrar tooltips
            </span>
            <p className="text-xs text-zinc-500">
              Ayuda contextual al pasar el cursor
            </p>
          </div>
        </div>
        <button
          onClick={() => setEnabled(!preference.enabled)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            preference.enabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
            preference.enabled ? 'left-5' : 'left-0.5'
          }`} />
        </button>
      </div>

      {/* Delay setting */}
      {preference.enabled && (
        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            <div>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Retraso
              </span>
              <p className="text-xs text-zinc-500">
                {preference.delay}ms antes de mostrar
              </p>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={1500}
            step={100}
            value={preference.delay}
            onChange={(e) => setDelay(parseInt(e.target.value))}
            className="w-24 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-zinc-500 px-1">
        Los tooltips muestran información útil sobre botones y controles.
      </p>
    </div>
  );
};

export default TooltipSettings;
