import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Clock, Users, Shield, Sliders } from 'lucide-react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import {
  ModerationConfig,
  ModerationPreset,
  DEFAULT_MODERATION_CONFIG,
  savePreset,
  loadPreset,
  deletePreset,
  getAllPresets,
  isValidWeight,
} from '../services/voteModerationService';

interface ModerationConfigFormProps {
  config: ModerationConfig;
  onChange: (config: ModerationConfig) => void;
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const ModerationConfigForm: React.FC<ModerationConfigFormProps> = ({
  config,
  onChange,
  onNotification,
}) => {
  const [presets, setPresets] = useState<ModerationPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showPresetList, setShowPresetList] = useState(false);

  useEffect(() => {
    setPresets(getAllPresets());
  }, []);

  const handleMinAgeChange = (value: string) => {
    const numValue = parseInt(value, 10);
    onChange({
      ...config,
      minAccountAgeDays: isNaN(numValue) ? 0 : Math.max(0, numValue),
    });
  };

  const handleVoteChangeToggle = () => {
    onChange({
      ...config,
      voteChangeEnabled: !config.voteChangeEnabled,
    });
  };

  const handleCooldownChange = (value: string) => {
    const numValue = parseInt(value, 10);
    onChange({
      ...config,
      voteChangeCooldownSeconds: isNaN(numValue) ? 0 : Math.max(0, numValue),
    });
  };


  const handleWeightChange = (type: 'subscriber' | 'follower', value: string) => {
    const numValue = parseInt(value, 10);
    // Clamp to valid range 1-5
    const clampedValue = isNaN(numValue) ? 1 : Math.min(5, Math.max(1, numValue));
    onChange({
      ...config,
      weights: {
        ...config.weights,
        [type]: clampedValue,
      },
    });
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      onNotification?.('error', 'Enter a preset name');
      return;
    }
    const newPreset = savePreset(presetName.trim(), config);
    setPresets(getAllPresets());
    setPresetName('');
    onNotification?.('success', `Preset "${newPreset.name}" saved`);
  };

  const handleLoadPreset = (id: string) => {
    const preset = loadPreset(id);
    if (preset) {
      onChange(preset.config);
      setShowPresetList(false);
      onNotification?.('info', `Preset "${preset.name}" loaded`);
    }
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const preset = presets.find(p => p.id === id);
    if (deletePreset(id)) {
      setPresets(getAllPresets());
      onNotification?.('info', `Preset "${preset?.name}" deleted`);
    }
  };

  const handleReset = () => {
    onChange(DEFAULT_MODERATION_CONFIG);
    onNotification?.('info', 'Settings reset to defaults');
  };

  return (
    <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <Shield size={16} className="text-twitch-brand" />
          Vote Moderation
        </h4>
        <button
          onClick={handleReset}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Reset
        </button>
      </div>

      {/* Account Age Filter */}
      <div className="space-y-1">
        <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase flex items-center">
          Min Account Age (days)
          <Tooltip text="Accounts younger than this will be rejected. Set to 0 to allow all." />
        </label>
        <div className="relative">
          <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="number"
            min="0"
            value={config.minAccountAgeDays}
            onChange={(e) => handleMinAgeChange(e.target.value)}
            placeholder="0 = No filter"
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-twitch-brand focus:ring-1 focus:ring-twitch-brand"
          />
        </div>
      </div>


      {/* Vote Change Toggle */}
      <div className="space-y-1">
        <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase flex items-center">
          Allow Vote Changes
          <Tooltip text="When disabled, users cannot change their vote after voting." />
        </label>
        <button
          onClick={handleVoteChangeToggle}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
            config.voteChangeEnabled
              ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500'
          }`}
        >
          <span className="text-sm font-medium">
            {config.voteChangeEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <div
            className={`w-10 h-5 rounded-full relative transition-colors ${
              config.voteChangeEnabled ? 'bg-green-500' : 'bg-zinc-400'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                config.voteChangeEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>
      </div>

      {/* Cooldown Period */}
      {config.voteChangeEnabled && (
        <div className="space-y-1 animate-fade-in">
          <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase flex items-center">
            Cooldown (seconds)
            <Tooltip text="Time users must wait before changing their vote." />
          </label>
          <div className="relative">
            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="number"
              min="0"
              value={config.voteChangeCooldownSeconds}
              onChange={(e) => handleCooldownChange(e.target.value)}
              placeholder="0 = No cooldown"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-twitch-brand focus:ring-1 focus:ring-twitch-brand"
            />
          </div>
        </div>
      )}

      {/* Weight Sliders */}
      <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase flex items-center">
          <Sliders size={14} className="mr-1" />
          Vote Weights (1-5)
          <Tooltip text="Higher weights give more voting power to subscribers/followers." />
        </label>

        {/* Subscriber Weight */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">Subscriber</span>
            <span className="font-bold text-twitch-brand">{config.weights.subscriber}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={config.weights.subscriber}
            onChange={(e) => handleWeightChange('subscriber', e.target.value)}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-twitch-brand"
          />
        </div>

        {/* Follower Weight */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">Follower</span>
            <span className="font-bold text-blue-500">{config.weights.follower}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={config.weights.follower}
            onChange={(e) => handleWeightChange('follower', e.target.value)}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-500">
          Regular users always have weight 1x
        </div>
      </div>


      {/* Preset Management */}
      <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase">
          Presets
        </label>

        {/* Save Preset */}
        <div className="flex gap-2">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name..."
            className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-twitch-brand focus:ring-1 focus:ring-twitch-brand"
          />
          <Button variant="secondary" onClick={handleSavePreset} className="shrink-0">
            <Save size={14} />
          </Button>
        </div>

        {/* Load Preset */}
        <div className="relative">
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setShowPresetList(!showPresetList)}
            className="justify-between text-sm"
          >
            <span className="flex items-center gap-2">
              <FolderOpen size={14} />
              Load Preset
            </span>
            <span className="text-xs text-zinc-500">({presets.length})</span>
          </Button>

          {showPresetList && presets.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset.id)}
                  className="flex items-center justify-between px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {preset.name}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      Age: {preset.config.minAccountAgeDays}d | 
                      Change: {preset.config.voteChangeEnabled ? 'On' : 'Off'} | 
                      Sub: {preset.config.weights.subscriber}x
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    className="ml-2 p-1 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showPresetList && presets.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 p-4 text-center text-sm text-zinc-500">
              No presets saved yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
