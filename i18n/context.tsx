import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Locale, Translations, translations } from './locales';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'twitch_vote_locale';

// Detect browser language
const detectBrowserLocale = (): Locale => {
  const browserLang = navigator.language.split('-')[0];
  if (browserLang === 'es' || browserLang === 'en') {
    return browserLang as Locale;
  }
  return 'es'; // Default to Spanish
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && (saved === 'es' || saved === 'en')) {
      return saved as Locale;
    }
    return 'es'; // Default to Spanish
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value: I18nContextType = {
    locale,
    setLocale,
    t: translations[locale],
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Helper to interpolate values in strings like "hace {n}s"
export const interpolate = (str: string, values: Record<string, string | number>): string => {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
};
