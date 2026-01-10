/**
 * SubsConfigModal Component
 * Modal for configuring subscriber giveaway settings with presets
 */

import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Star, 
  RefreshCw, 
  Gift, 
  Coins, 
  DollarSign, 
  Zap,
  Sparkles,
  Check,
  Sliders
} from 'lucide-react';
import { AnimatedModal, ModalFooter, ModalButton } from '../AnimatedModal';
import type { SubsGiveawayConfig } from '../types';
import { DEFAULT_SUBS_CONFIG } from '../types';
import { SUBS_PRESETS, matchesPreset } from '../constants/presets';
import type { SubsPreset } from '../types';

// ============================================
// TYPES
// ============================================

export interface SubsConfigModalProps {
  config: SubsGiveawayConfig;
  onChange: (config: SubsGiveawayConfig) => void;
  onClose: () => void;
}

type TabType = 'presets' | 'custom';

// ============================================
// TOGGLE COMPONENT
// ============================================

const Toggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  color?: string;
}> = ({ enabled, onChange, color = 'bg-purple-500' }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? color : 'bg-zinc-300 dark:bg-zinc-600'}`}
  >
    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
);

// ============================================
// INPUT COMPONENT
// ============================================

const NumberInput: React.FC<{
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}> = ({ id, label, value, onChange, min = 0, step = 1 }) => (
  <div>
    <label htmlFor={id} className="text-xs text-zinc-500 dark:text-zinc-400">
      {label}
    </label>
    <input
      id={id}
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={(e) => onChange(Math.max(min, step < 1 ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0))}
      className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
    />
  </div>
);

// ============================================
// SECTION COMPONENT
// ============================================

const ConfigSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  children: React.ReactNode;
}> = ({ title, icon, color, enabled, onToggle, children }) => (
  <div className={`p-3 ${color} rounded-xl space-y-3`}>
    <div className="flex items-center justify-between">
      <h4 className="font-bold text-sm flex items-center gap-2">
        {icon}
        {title}
      </h4>
      {onToggle !== undefined && (
        <Toggle 
          enabled={enabled ?? false} 
          onChange={onToggle}
        />
      )}
    </div>
    {(enabled === undefined || enabled) && children}
  </div>
);

// ============================================
// PRESET CARD COMPONENT
// ============================================

const PresetCard: React.FC<{
  preset: SubsPreset;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ preset, isSelected, onSelect }) => {
  const getIcon = () => {
    switch (preset.id) {
      case 'simple': return <Star size={20} />;
      case 'weighted': return <Sliders size={20} />;
      case 'vip': return <Sparkles size={20} />;
      case 'monetization': return <Coins size={20} />;
      default: return <Settings size={20} />;
    }
  };

  const getGradient = () => {
    switch (preset.id) {
      case 'simple': return 'from-blue-500 to-cyan-500';
      case 'weighted': return 'from-purple-500 to-pink-500';
      case 'vip': return 'from-yellow-500 to-orange-500';
      case 'monetization': return 'from-green-500 to-emerald-500';
      default: return 'from-zinc-500 to-zinc-600';
    }
  };

  return (
    <button
      onClick={onSelect}
      className={`
        relative w-full p-4 rounded-xl text-left transition-all
        ${isSelected 
          ? `bg-gradient-to-br ${getGradient()} text-white shadow-lg scale-[1.02]` 
          : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
        }
      `}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
          <Check size={14} className="text-green-500" />
        </div>
      )}
      
      <div className={`mb-2 ${isSelected ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
        {getIcon()}
      </div>
      
      <h3 className={`font-bold ${isSelected ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>
        {preset.name}
      </h3>
      
      <p className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
        {preset.description}
      </p>

      {/* Quick stats */}
      <div className={`mt-3 flex gap-2 text-xs ${isSelected ? 'text-white/70' : 'text-zinc-400'}`}>
        <span>T1:{preset.config.tier1Value}</span>
        <span>T2:{preset.config.tier2Value}</span>
        <span>T3:{preset.config.tier3Value}</span>
        {preset.config.giftSubEnabled && <span>🎁</span>}
        {preset.config.bitsEnabled && <span>💎</span>}
      </div>
    </button>
  );
};

// ============================================
// COMPONENT
// ============================================

export const SubsConfigModal: React.FC<SubsConfigModalProps> = ({
  config,
  onChange,
  onClose,
}) => {
  const [localConfig, setLocalConfig] = useState<SubsGiveawayConfig>(config);
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(() => {
    const matched = matchesPreset(config);
    return matched?.id || null;
  });

  const currentPreset = useMemo(() => matchesPreset(localConfig), [localConfig]);

  const updateConfig = <K extends keyof SubsGiveawayConfig>(
    key: K,
    value: SubsGiveawayConfig[K]
  ) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setSelectedPresetId(null); // Clear preset selection when manually editing
  };

  const applyPreset = (preset: SubsPreset) => {
    setLocalConfig(preset.config);
    setSelectedPresetId(preset.id);
  };

  const handleSave = () => {
    onChange(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_SUBS_CONFIG);
    setSelectedPresetId(null);
  };

  return (
    <AnimatedModal
      isOpen={true}
      onClose={onClose}
      title="Configurar Sorteo de Subs"
      subtitle={currentPreset ? `Usando preset: ${currentPreset.name}` : undefined}
      icon={<Settings size={20} />}
      size="lg"
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'presets'
              ? 'bg-pink-500 text-white'
              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Sparkles size={14} className="inline mr-2" />
          Presets
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'custom'
              ? 'bg-pink-500 text-white'
              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Sliders size={14} className="inline mr-2" />
          Personalizado
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[50vh] overflow-y-auto pr-2">
        {activeTab === 'presets' ? (
          <div className="grid grid-cols-2 gap-3">
            {SUBS_PRESETS.map(preset => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isSelected={selectedPresetId === preset.id}
                onSelect={() => applyPreset(preset)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Subs por Tier */}
            <ConfigSection
              title="Suscripciones"
              icon={<Star size={16} className="text-purple-500" />}
              color="bg-purple-500/10"
            >
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  id="tier1-value"
                  label="Tier 1"
                  value={localConfig.tier1Value}
                  onChange={(v) => updateConfig('tier1Value', v)}
                />
                <NumberInput
                  id="tier2-value"
                  label="Tier 2"
                  value={localConfig.tier2Value}
                  onChange={(v) => updateConfig('tier2Value', v)}
                />
                <NumberInput
                  id="tier3-value"
                  label="Tier 3"
                  value={localConfig.tier3Value}
                  onChange={(v) => updateConfig('tier3Value', v)}
                />
                <NumberInput
                  id="prime-value"
                  label="Prime"
                  value={localConfig.primeValue}
                  onChange={(v) => updateConfig('primeValue', v)}
                />
              </div>
            </ConfigSection>

            {/* Resubs */}
            <ConfigSection
              title="Resubs"
              icon={<RefreshCw size={16} className="text-cyan-500" />}
              color="bg-cyan-500/10"
              enabled={localConfig.resubEnabled}
              onToggle={(v) => updateConfig('resubEnabled', v)}
            >
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  id="resub-value"
                  label="Entradas por resub"
                  value={localConfig.resubValue}
                  onChange={(v) => updateConfig('resubValue', v)}
                />
                <NumberInput
                  id="resub-bonus"
                  label="Bonus por mes"
                  value={localConfig.resubBonusPerMonth}
                  onChange={(v) => updateConfig('resubBonusPerMonth', v)}
                  step={0.1}
                />
              </div>
            </ConfigSection>

            {/* Gift Subs */}
            <ConfigSection
              title="Gift Subs"
              icon={<Gift size={16} className="text-pink-500" />}
              color="bg-pink-500/10"
              enabled={localConfig.giftSubEnabled}
              onToggle={(v) => updateConfig('giftSubEnabled', v)}
            >
              <NumberInput
                id="giftsub-value"
                label="Entradas por sub regalada"
                value={localConfig.giftSubValue}
                onChange={(v) => updateConfig('giftSubValue', v)}
              />
            </ConfigSection>

            {/* Bits */}
            <ConfigSection
              title="Bits"
              icon={<Coins size={16} className="text-yellow-500" />}
              color="bg-yellow-500/10"
              enabled={localConfig.bitsEnabled}
              onToggle={(v) => updateConfig('bitsEnabled', v)}
            >
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  id="bits-per-entry"
                  label="Bits por entrada"
                  value={localConfig.bitsPerEntry}
                  onChange={(v) => updateConfig('bitsPerEntry', Math.max(1, v))}
                  min={1}
                />
                <NumberInput
                  id="bits-minimum"
                  label="Mínimo bits"
                  value={localConfig.bitsMinimum}
                  onChange={(v) => updateConfig('bitsMinimum', v)}
                />
              </div>
            </ConfigSection>

            {/* Donaciones */}
            <ConfigSection
              title="Donaciones"
              icon={<DollarSign size={16} className="text-green-500" />}
              color="bg-green-500/10"
              enabled={localConfig.donationsEnabled}
              onToggle={(v) => updateConfig('donationsEnabled', v)}
            >
              <div className="grid grid-cols-3 gap-3">
                <NumberInput
                  id="donation-per-entry"
                  label="€ por entrada"
                  value={localConfig.donationPerEntry}
                  onChange={(v) => updateConfig('donationPerEntry', Math.max(0.01, v))}
                  min={0.01}
                  step={0.01}
                />
                <NumberInput
                  id="donation-minimum"
                  label="Mínimo"
                  value={localConfig.donationMinimum}
                  onChange={(v) => updateConfig('donationMinimum', v)}
                  step={0.01}
                />
                <div>
                  <label htmlFor="donation-currency" className="text-xs text-zinc-500 dark:text-zinc-400">
                    Moneda
                  </label>
                  <select
                    id="donation-currency"
                    value={localConfig.donationCurrency}
                    onChange={(e) => updateConfig('donationCurrency', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </ConfigSection>

            {/* Regalos de canal */}
            <ConfigSection
              title="Regalos de Canal"
              icon={<Zap size={16} className="text-orange-500" />}
              color="bg-orange-500/10"
              enabled={localConfig.channelGiftsEnabled}
              onToggle={(v) => updateConfig('channelGiftsEnabled', v)}
            >
              <NumberInput
                id="channel-gift-value"
                label="Entradas por regalo"
                value={localConfig.channelGiftValue}
                onChange={(v) => updateConfig('channelGiftValue', v)}
              />
            </ConfigSection>
          </div>
        )}
      </div>

      {/* Footer */}
      <ModalFooter>
        <ModalButton onClick={handleReset} variant="secondary">
          Restaurar
        </ModalButton>
        <ModalButton onClick={handleSave} variant="primary">
          Guardar
        </ModalButton>
      </ModalFooter>
    </AnimatedModal>
  );
};

export default SubsConfigModal;
