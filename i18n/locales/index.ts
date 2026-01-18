/**
 * Main Locales Index
 * 
 * Central export point for accessing translation modules.
 * This file provides utilities for dynamic loading of translations
 * to support lazy loading and bundle size optimization.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-2.1: Traducciones core cargadas al inicio
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 * @see REQ-5.1: Tipos TypeScript estrictos con autocompletado de claves
 */

import type { Locale, Translations } from '../types';

/**
 * Dynamic translation loaders for lazy loading
 * These functions return promises that resolve to translation modules
 */
export const translationLoaders = {
  es: {
    common: () => import('./es/common.ts').then(m => m.common),
    errors: () => import('./es/errors.ts').then(m => m.errors),
    nav: () => import('./es/navigation.ts').then(m => m.navigation),
    poll: () => import('./es/poll.ts').then(m => m.poll),
    games: () => import('./es/games.ts').then(m => m.games),
    giveaway: () => import('./es/giveaway.ts').then(m => m.giveaway),
    macros: () => import('./es/macros.ts').then(m => m.macros),
    commands: () => import('./es/commands.ts').then(m => m.commands),
    predictions: () => import('./es/predictions.ts').then(m => m.predictions),
    rewards: () => import('./es/rewards.ts').then(m => m.rewards),
    moderation: () => import('./es/moderation.ts').then(m => m.moderation),
    analytics: () => import('./es/analytics.ts').then(m => m.analytics),
    overlay: () => import('./es/overlay.ts').then(m => m.overlay),
    platforms: () => import('./es/platforms.ts').then(m => m.platforms),
    misc: () => import('./es/misc.ts').then(m => m.misc),
  },
  en: {
    common: () => import('./en/common.ts').then(m => m.common),
    errors: () => import('./en/errors.ts').then(m => m.errors),
    nav: () => import('./en/navigation.ts').then(m => m.navigation),
    poll: () => import('./en/poll.ts').then(m => m.poll),
    games: () => import('./en/games.ts').then(m => m.games),
    giveaway: () => import('./en/giveaway.ts').then(m => m.giveaway),
    macros: () => import('./en/macros.ts').then(m => m.macros),
    commands: () => import('./en/commands.ts').then(m => m.commands),
    predictions: () => import('./en/predictions.ts').then(m => m.predictions),
    rewards: () => import('./en/rewards.ts').then(m => m.rewards),
    moderation: () => import('./en/moderation.ts').then(m => m.moderation),
    analytics: () => import('./en/analytics.ts').then(m => m.analytics),
    overlay: () => import('./en/overlay.ts').then(m => m.overlay),
    platforms: () => import('./en/platforms.ts').then(m => m.platforms),
    misc: () => import('./en/misc.ts').then(m => m.misc),
  },
};

/**
 * Load complete translations for a locale (for backward compatibility)
 * This function loads all modules for a given locale
 * 
 * @param locale - The locale to load translations for
 * @returns Promise that resolves to complete translations
 */
export async function loadCompleteTranslations(locale: Locale): Promise<Translations> {
  const loaders = translationLoaders[locale];
  
  const [
    common, errors, nav, poll, games, giveaway, macros, commands,
    predictions, rewards, moderation, analytics, overlay, platforms, misc
  ] = await Promise.all([
    loaders.common(),
    loaders.errors(),
    loaders.nav(),
    loaders.poll(),
    loaders.games(),
    loaders.giveaway(),
    loaders.macros(),
    loaders.commands(),
    loaders.predictions(),
    loaders.rewards(),
    loaders.moderation(),
    loaders.analytics(),
    loaders.overlay(),
    loaders.platforms(),
    loaders.misc(),
  ]);

  return {
    common,
    errors,
    nav,
    poll,
    games,
    giveaway,
    macros,
    commands,
    predictions,
    rewards,
    moderation,
    analytics,
    overlay,
    platforms,
    misc,
  };
}

/**
 * Load core translations only (common, errors, nav)
 * 
 * @param locale - The locale to load core translations for
 * @returns Promise that resolves to core translations
 */
export async function loadCoreTranslations(locale: Locale) {
  const loaders = translationLoaders[locale];
  
  const [common, errors, nav] = await Promise.all([
    loaders.common(),
    loaders.errors(),
    loaders.nav(),
  ]);

  return { common, errors, nav };
}

/**
 * Type exports for external usage
 */
export type { Locale, Translations } from '../types';

/**
 * Supported locales array for iteration
 */
export const SUPPORTED_LOCALES: Locale[] = ['es', 'en'];

/**
 * Default locale constant
 */
export const DEFAULT_LOCALE: Locale = 'es';

/**
 * Utility function to check if a locale is supported
 * @param locale - The locale to check
 * @returns True if the locale is supported
 */
export function isSupportedLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

/**
 * Utility function to get translations for a specific locale
 * @param locale - The locale to get translations for
 * @returns The translations object for the specified locale
 */
export function getTranslations(locale: Locale): Translations {
  return translations[locale];
}

/**
 * Utility function to get translations with fallback
 * @param locale - The preferred locale
 * @param fallback - The fallback locale (defaults to DEFAULT_LOCALE)
 * @returns The translations object for the specified or fallback locale
 */
export function getTranslationsWithFallback(
  locale: string,
  fallback: Locale = DEFAULT_LOCALE
): Translations {
  if (isSupportedLocale(locale)) {
    return translations[locale];
  }
  return translations[fallback];
}