// Quick test to verify rewards module
import { rewards } from './i18n/locales/es/rewards';
import type { RewardsTranslations } from './i18n/types';

// Type check
const testRewards: RewardsTranslations = rewards;

// Test some key translations
console.log('Title:', testRewards.title);
console.log('Create Title:', testRewards.createTitle);
console.log('Redemptions:', testRewards.redemptions);
console.log('Success! Rewards module is working correctly.');