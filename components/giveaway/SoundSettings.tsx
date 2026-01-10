/**
 * SoundSettings Component
 * Dropdown for configuring giveaway sound settings
 * Uses sounds from SoundBoard panel
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, Volume1, Play, ChevronDown, Music } from 'lucide-react';
import type { SoundConfig, SoundFile, SoundboardCustomSound } from './hooks/useGiveawaySound';
import { SOUND_OPTIONS, DEFAULT_SOUND_CONFIG } from './hooks/useGiveawaySound';

interface SoundSettingsProps {
  isEnabled: boolean;
  volume: number;
  onEnabledChange: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
  onTestSound?: () => void;
  soundConfig?: SoundConfig;
  onSoundConfigChange?: (config: Partial<SoundConfig>) => void;
  onTestSoundFile?: (file: SoundFile) => void;
  customSounds?: SoundboardCustomSound[];
}

const SOUND_EVENTS: { key: keyof SoundConfig; label: string; icon: string }[] = [
  { key: 'winner', label: 'Ganador', icon: '🏆' },
  { key: 'drumroll', label: 'Redoble', icon: '🥁' },
  { key: 'start', label: 'Inicio', icon: '▶️' },
  { key: 'countdown', label: 'Cuenta atrás', icon: '⏱️' },
];

export const SoundSettings: React.FC<SoundSettingsProps> = ({
  isEnabled,
  volume,
  onEnabledChange,
  onVolumeChange,
  onTestSound,
  soundConfig = DEFAULT_SOUND_CONFIG,
  onSoundConfigChange,
  onTestSoundFile,
  customSounds = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const VolumeIcon = !isEnabled ? VolumeX : volume > 0.5 ? Volume2 : Volume1;

  // Build options including custom sounds from SoundBoard
  const allOptions = [
    ...SOUND_OPTIONS,
    ...customSounds.map(s => ({ value: `custom_${s.id}` as SoundFile, label: `🎧 ${s.name}` })),
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg transition-colors ${
          isEnabled 
            ? 'text-purple-500 hover:bg-purple-500/10' 
            : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
        title={isEnabled ? 'Sonido activado' : 'Sonido desactivado'}
      >
        <VolumeIcon size={16} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-3 space-y-3 max-h-[70vh] overflow-y-auto">
            {/* Enable/Disable toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Sonidos</span>
              <button
                onClick={() => onEnabledChange(!isEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  isEnabled ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  isEnabled ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </div>

            {/* Volume slider */}
            {isEnabled && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Volumen</span>
                  <span className="text-xs text-zinc-500">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume * 100}
                  onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            )}

            {/* Sound selectors */}
            {isEnabled && onSoundConfigChange && (
              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <span className="text-xs font-medium text-zinc-500 uppercase">Sonidos por evento</span>
                {SOUND_EVENTS.map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-sm w-6">{icon}</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 w-20">{label}</span>
                    <div className="flex-1 relative">
                      <select
                        value={soundConfig[key]}
                        onChange={(e) => onSoundConfigChange({ [key]: e.target.value })}
                        className="w-full text-xs py-1 pl-2 pr-6 rounded-lg bg-zinc-100 dark:bg-zinc-700 border-0 appearance-none cursor-pointer text-zinc-700 dark:text-zinc-300"
                      >
                        {allOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                    {onTestSoundFile && (
                      <button
                        onClick={() => onTestSoundFile(soundConfig[key])}
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-500"
                        title="Probar"
                      >
                        <Play size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Custom sounds hint */}
            {isEnabled && customSounds.length > 0 && (
              <p className="text-[10px] text-zinc-400 text-center pt-1 border-t border-zinc-200 dark:border-zinc-700">
                🎧 {customSounds.length} sonido{customSounds.length !== 1 ? 's' : ''} del Panel de Sonidos
              </p>
            )}

            {isEnabled && customSounds.length === 0 && (
              <p className="text-[10px] text-zinc-400 text-center pt-1 border-t border-zinc-200 dark:border-zinc-700">
                💡 Sube sonidos en el Panel de Sonidos del sidebar
              </p>
            )}

            {/* Test sound button (fallback) */}
            {isEnabled && onTestSound && !onSoundConfigChange && (
              <button
                onClick={onTestSound}
                className="w-full py-1.5 text-xs bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                Probar sonido
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SoundSettings;