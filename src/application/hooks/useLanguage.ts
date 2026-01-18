/**
 * useLanguage Hook (Compatibility Layer)
 * 
 * Custom hook that provides backward compatibility with the old monolithic translation system
 * while gradually transitioning to the new lazy-loading system.
 * 
 * @requirements 6.2, 9.3
 * @deprecated Use useI18n() instead for better performance
 */

import { useCallback, useEffect, useState } from 'react';
import { useUI } from './useUI';
import { loadCompleteTranslations, type Locale, type Translations } from '../../../i18n/locales';

export interface UseLanguageReturn {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

/**
 * Custom hook for language management using Redux
 * 
 * Provides backward compatibility with the old monolithic translation API
 * while using Redux under the hood.
 * 
 * @example
 * ```tsx
 * const { locale, setLocale, t } = useLanguage();
 * 
 * // Change language
 * setLocale('en');
 * 
 * // Use translations
 * console.log(t.connection.title);
 * ```
 * 
 * @requirements 6.2 - Language management
 * @requirements 9.3 - Encapsulate Redux logic
 * @deprecated Use useI18n() instead for better performance
 */
export function useLanguage(): UseLanguageReturn {
  const { language, setLanguage } = useUI();
  const [translations, setTranslations] = useState<Translations | null>(null);

  // Load translations when language changes
  useEffect(() => {
    loadCompleteTranslations(language).then(setTranslations);
  }, [language]);

  // Update document language attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleSetLocale = useCallback(
    (newLocale: Locale) => {
      setLanguage(newLocale);
    },
    [setLanguage]
  );

  // Return empty translations object while loading to prevent crashes
  const fallbackTranslations: Translations = {
    common: {} as any,
    errors: {} as any,
    nav: {} as any,
    poll: {} as any,
    games: {} as any,
    giveaway: {} as any,
    macros: {} as any,
    commands: {} as any,
    predictions: {} as any,
    rewards: {} as any,
    moderation: {} as any,
    analytics: {} as any,
    overlay: {} as any,
    platforms: {} as any,
    misc: {} as any,
  };

  return {
    locale: language,
    setLocale: handleSetLocale,
    t: translations || fallbackTranslations,
  };
}

export default useLanguage;
