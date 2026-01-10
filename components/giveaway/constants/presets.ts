/**
 * Subs Giveaway Presets
 * Pre-configured settings for common giveaway scenarios
 */

import type { SubsGiveawayConfig, SubsPreset } from '../types';

// ============================================
// PRESET DEFINITIONS
// ============================================

/**
 * Simple Preset
 * Basic configuration where all subs have equal weight
 * Good for: Quick giveaways, fairness-focused streams
 */
export const PRESET_SIMPLE: SubsPreset = {
  id: 'simple',
  name: 'Simple',
  description: 'Todos los subs tienen el mismo peso. Ideal para sorteos rápidos y justos.',
  config: {
    tier1Value: 1,
    tier2Value: 1,
    tier3Value: 1,
    primeValue: 1,
    resubEnabled: false,
    resubValue: 0,
    resubBonusPerMonth: 0,
    giftSubEnabled: false,
    giftSubValue: 0,
    bitsEnabled: false,
    bitsPerEntry: 100,
    bitsMinimum: 0,
    donationsEnabled: false,
    donationPerEntry: 1,
    donationMinimum: 0,
    donationCurrency: 'EUR',
    channelGiftsEnabled: false,
    channelGiftValue: 0,
  },
};

/**
 * Weighted Preset
 * Higher tiers get more entries, rewards loyalty
 * Good for: Rewarding higher tier subscribers
 */
export const PRESET_WEIGHTED: SubsPreset = {
  id: 'weighted',
  name: 'Ponderado',
  description: 'Tiers más altos tienen más entradas. Premia a los subs de mayor nivel.',
  config: {
    tier1Value: 1,
    tier2Value: 2,
    tier3Value: 5,
    primeValue: 1,
    resubEnabled: true,
    resubValue: 1,
    resubBonusPerMonth: 0.1,
    giftSubEnabled: true,
    giftSubValue: 1,
    bitsEnabled: false,
    bitsPerEntry: 100,
    bitsMinimum: 0,
    donationsEnabled: false,
    donationPerEntry: 1,
    donationMinimum: 0,
    donationCurrency: 'EUR',
    channelGiftsEnabled: false,
    channelGiftValue: 0,
  },
};

/**
 * VIP Preset
 * Maximum rewards for high-tier subs and gifters
 * Good for: Special events, rewarding top supporters
 */
export const PRESET_VIP: SubsPreset = {
  id: 'vip',
  name: 'VIP',
  description: 'Máximas recompensas para subs de alto nivel y gifters. Ideal para eventos especiales.',
  config: {
    tier1Value: 1,
    tier2Value: 3,
    tier3Value: 10,
    primeValue: 1,
    resubEnabled: true,
    resubValue: 2,
    resubBonusPerMonth: 0.2,
    giftSubEnabled: true,
    giftSubValue: 3,
    bitsEnabled: true,
    bitsPerEntry: 100,
    bitsMinimum: 100,
    donationsEnabled: false,
    donationPerEntry: 1,
    donationMinimum: 0,
    donationCurrency: 'EUR',
    channelGiftsEnabled: true,
    channelGiftValue: 2,
  },
};

/**
 * Bits & Donations Preset
 * Includes bits and donations for monetization-focused giveaways
 * Good for: Charity streams, monetization events
 */
export const PRESET_MONETIZATION: SubsPreset = {
  id: 'monetization',
  name: 'Monetización',
  description: 'Incluye bits y donaciones. Perfecto para eventos de caridad o monetización.',
  config: {
    tier1Value: 1,
    tier2Value: 2,
    tier3Value: 5,
    primeValue: 1,
    resubEnabled: true,
    resubValue: 1,
    resubBonusPerMonth: 0.1,
    giftSubEnabled: true,
    giftSubValue: 2,
    bitsEnabled: true,
    bitsPerEntry: 100,
    bitsMinimum: 100,
    donationsEnabled: true,
    donationPerEntry: 1,
    donationMinimum: 1,
    donationCurrency: 'EUR',
    channelGiftsEnabled: true,
    channelGiftValue: 1,
  },
};

// ============================================
// EXPORTS
// ============================================

/**
 * All available presets
 */
export const SUBS_PRESETS: SubsPreset[] = [
  PRESET_SIMPLE,
  PRESET_WEIGHTED,
  PRESET_VIP,
  PRESET_MONETIZATION,
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string): SubsPreset | undefined {
  return SUBS_PRESETS.find(p => p.id === id);
}

/**
 * Check if a config matches a preset
 */
export function matchesPreset(config: SubsGiveawayConfig): SubsPreset | null {
  for (const preset of SUBS_PRESETS) {
    const matches = Object.keys(preset.config).every(key => {
      const k = key as keyof SubsGiveawayConfig;
      return config[k] === preset.config[k];
    });
    if (matches) return preset;
  }
  return null;
}

export default SUBS_PRESETS;
