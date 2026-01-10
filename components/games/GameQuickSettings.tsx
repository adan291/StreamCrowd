/**
 * GameQuickSettings Component
 * Quick settings popover for individual games
 * Shows on hover over game cards
 */

import React, { useState } from 'react';
import { Settings, Volume2, VolumeX, Clock, Users, Zap } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface GameSettings {
  soundEnabled: boolean;
  duration: number; // seconds
  maxPlayers: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GameQuickSettingsProps {
  gameId: string;
  gameName: string;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  duration: 60,
  maxPlayers: 100,
  difficulty: 'medium',
};

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Fácil', color: 'green' },
  { value: 'medium', label: 'Normal', color: 'yellow' },
  { value: 'hard', label: 'Difícil', color: 'red' },
] as const;

// ============================================
// COMPONENT
// ============================================

export const GameQuickSettings: React.FC<GameQuickSettingsProps> = ({
  gameId,
  gameName,
  settings,
  onSettingsChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        title="Configuración rápida"
      >
        <Settings size={14} className="text-zinc-500" />
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Content */}
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {gameName}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                ×
              </button>
            </div>

            {/* Sound toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.soundEnabled ? (
                  <Volume2 size={14} className="text-green-500" />
                ) : (
                  <VolumeX size={14} className="text-zinc-400" />
                )}
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Sonido</span>
              </div>
              <button
                onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                  settings.soundEnabled ? 'left-4' : 'left-0.5'
                }`} />
              </button>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Duración</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={settings.duration}
                  onChange={(e) => updateSetting('duration', Math.max(10, parseInt(e.target.value) || 60))}
                  min={10}
                  max={600}
                  className="w-14 px-2 py-1 text-xs text-center rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
                <span className="text-xs text-zinc-500">seg</span>
              </div>
            </div>

            {/* Max players */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-purple-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Máx. jugadores</span>
              </div>
              <input
                type="number"
                value={settings.maxPlayers}
                onChange={(e) => updateSetting('maxPlayers', Math.max(1, parseInt(e.target.value) || 100))}
                min={1}
                max={1000}
                className="w-14 px-2 py-1 text-xs text-center rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              />
            </div>

            {/* Difficulty */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-amber-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Dificultad</span>
              </div>
              <div className="flex gap-1">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSetting('difficulty', opt.value)}
                    className={`flex-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                      settings.difficulty === opt.value
                        ? `bg-${opt.color}-500/20 text-${opt.color}-600 dark:text-${opt.color}-400 border border-${opt.color}-500/30`
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get default settings for a game
 */
export function getDefaultGameSettings(): GameSettings {
  return { ...DEFAULT_SETTINGS };
}

/**
 * Load game settings from localStorage
 */
export function loadGameSettings(gameId: string): GameSettings {
  try {
    const stored = localStorage.getItem(`game_settings_${gameId}`);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save game settings to localStorage
 */
export function saveGameSettings(gameId: string, settings: GameSettings): void {
  try {
    localStorage.setItem(`game_settings_${gameId}`, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export default GameQuickSettings;
