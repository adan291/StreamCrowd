/**
 * SoundSettingsPopover Component
 * Reusable sound settings popover for all activities
 * Now includes sound selection from SoundBoard
 */

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, ChevronDown } from 'lucide-react';
import type { ActivitySoundConfig } from '../../hooks/useActivitySound';

// Sound options from SoundBoard
const BIT_SOUND_OPTIONS = [
  { value: 'tada', label: '✨ Ta-dá!' },
  { value: 'party', label: '🎉 Fiesta' },
  { value: 'bell', label: '🔔 Campana' },
  { value: 'drumroll', label: '🥁 Redoble' },
  { value: 'correct', label: '👍 Correcto' },
  { value: 'wrong', label: '👎 Incorrecto' },
  { value: 'alert', label: '⚠️ Alerta' },
  { value: 'suspense', label: '🎵 Suspenso' },
  { value: 'timer', label: '⏰ Tiempo' },
  { value: 'buzzer', label: '⚡ Buzzer' },
  { value: 'laugh', label: '😂 Risa' },
  { value: 'heart', label: '❤️ Corazón' },
  { value: 'fail', label: '💀 Fail' },
  { value: 'fart', label: '💨 Pedorreta' },
];

const SOUND_OPTIONS = [
  { value: 'synth', label: '🎵 Sintético (default)' },
  ...BIT_SOUND_OPTIONS,
];

interface CustomSound {
  id: string;
  name: string;
  file: string;
  color: string;
}

const loadCustomSounds = (): CustomSound[] => {
  try {
    const saved = localStorage.getItem('soundboard_custom_sounds');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

interface SoundSettingsPopoverProps {
  config: ActivitySoundConfig;
  onConfigChange: (config: Partial<ActivitySoundConfig>) => void;
  onTestSound?: (soundId: string) => void;
  activityType?: 'poll' | 'prediction' | 'game' | 'giveaway' | 'judge';
  showVoteOption?: boolean;
  showMilestoneOption?: boolean;
}

// Sound selector component
const SoundSelector: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  onTest?: (value: string) => void;
  disabled?: boolean;
  customSounds: CustomSound[];
}> = ({ label, value, onChange, onTest, disabled, customSounds }) => {
  const allOptions = [
    ...SOUND_OPTIONS,
    ...customSounds.map(s => ({ value: `custom_${s.id}`, label: `🎤 ${s.name}` })),
  ];
  
  const selectedLabel = allOptions.find(o => o.value === value)?.label || 'Sintético';

  return (
    <div className="space-y-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex gap-1">
        <div className="relative flex-1">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full appearance-none bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs pr-6 disabled:opacity-50"
          >
            <optgroup label="Sintéticos">
              {SOUND_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
            {customSounds.length > 0 && (
              <optgroup label="Personalizados">
                {customSounds.map(s => (
                  <option key={s.id} value={`custom_${s.id}`}>🎤 {s.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
        {onTest && (
          <button
            onClick={() => onTest(value)}
            disabled={disabled}
            className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
            title="Probar"
          >
            <Play size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export const SoundSettingsPopover: React.FC<SoundSettingsPopoverProps> = ({
  config,
  onConfigChange,
  onTestSound,
  activityType = 'poll',
  showVoteOption = false,
  showMilestoneOption = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>(loadCustomSounds);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Reload custom sounds when storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'soundboard_custom_sounds') {
        setCustomSounds(loadCustomSounds());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Get sound config labels based on activity type
  const getSoundLabels = () => {
    switch (activityType) {
      case 'poll':
        return { winner: 'Ganador', countdown: 'Cuenta atrás', start: 'Inicio' };
      case 'prediction':
        return { winner: 'Resolución', countdown: 'Bloqueo', start: 'Creación' };
      case 'judge':
        return { winner: 'Ganador', countdown: 'Siguiente', start: 'Inicio' };
      case 'game':
        return { winner: 'Ganador', countdown: 'Cuenta atrás', start: 'Inicio' };
      default:
        return { winner: 'Ganador', countdown: 'Cuenta atrás', start: 'Inicio' };
    }
  };

  const labels = getSoundLabels();

  return (
    <div className="relative" ref={popoverRef}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg transition-colors ${
          config.enabled
            ? 'text-blue-500 hover:bg-blue-500/10'
            : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
        title={config.enabled ? 'Sonido activado' : 'Sonido desactivado'}
      >
        {config.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-3 z-50 animate-fade-in-down">
          <div className="space-y-3">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">🔊 Sonido</span>
              <button
                onClick={() => onConfigChange({ enabled: !config.enabled })}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  config.enabled ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                  config.enabled ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </div>

            {config.enabled && (
              <>
                {/* Volume slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Volumen</span>
                    <span className="text-xs font-mono text-zinc-500">{Math.round(config.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.volume * 100}
                    onChange={(e) => onConfigChange({ volume: parseInt(e.target.value) / 100 })}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Sound selectors */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Elegir sonidos</span>
                  
                  <SoundSelector
                    label={labels.winner}
                    value={config.winnerSound || 'synth'}
                    onChange={(v) => onConfigChange({ winnerSound: v })}
                    onTest={onTestSound}
                    customSounds={customSounds}
                  />
                  
                  <SoundSelector
                    label={labels.countdown}
                    value={config.countdownSound || 'synth'}
                    onChange={(v) => onConfigChange({ countdownSound: v })}
                    onTest={onTestSound}
                    customSounds={customSounds}
                  />
                  
                  <SoundSelector
                    label={labels.start}
                    value={config.startSound || 'synth'}
                    onChange={(v) => onConfigChange({ startSound: v })}
                    onTest={onTestSound}
                    customSounds={customSounds}
                  />
                </div>

                {/* Toggle options */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                  {/* Countdown toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Cuenta atrás</span>
                    <button
                      onClick={() => onConfigChange({ countdownEnabled: !config.countdownEnabled })}
                      className={`relative w-8 h-4 rounded-full transition-colors ${
                        config.countdownEnabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                        config.countdownEnabled ? 'left-4' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Vote sound toggle */}
                  {showVoteOption && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Sonido por voto</span>
                      <button
                        onClick={() => onConfigChange({ voteSound: !config.voteSound })}
                        className={`relative w-8 h-4 rounded-full transition-colors ${
                          config.voteSound ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                          config.voteSound ? 'left-4' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  )}

                  {/* Milestone sound toggle */}
                  {showMilestoneOption && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Hitos (100 votos, etc.)</span>
                      <button
                        onClick={() => onConfigChange({ milestoneSound: !config.milestoneSound })}
                        className={`relative w-8 h-4 rounded-full transition-colors ${
                          config.milestoneSound ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                          config.milestoneSound ? 'left-4' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundSettingsPopover;
