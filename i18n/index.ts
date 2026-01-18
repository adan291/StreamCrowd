export { I18nProvider, useI18n, useTranslationModule, interpolate } from './context';
export type { Locale, Translations, LazyTranslationModule, I18nContextValue } from './types';

// Export utility functions from utils.ts
export {
  // Interpolation utilities (uses {{variable}} syntax)
  interpolate as interpolateTemplate,
  extractVariables,
  validateInterpolation,
  // Number formatting
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompactNumber,
  // Date formatting
  formatDate,
  formatRelativeTime,
  formatDuration,
  // Pluralization
  pluralize,
  pluralizeWithCount,
  pluralizeAdvanced,
  // String utilities
  capitalize,
  truncate,
  // List formatting
  formatList,
  formatOrdinal,
} from './utils';

export type { DateFormatPreset } from './utils';

// Re-export translations for backward compatibility
export { translations } from './locales';
