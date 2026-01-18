import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { 
  Locale, 
  Translations, 
  LazyTranslationModule, 
  LoadedModulesState,
  I18nContextValue,
  PartialTranslations
} from './types';
import { interpolate } from './utils';

// Core modules are loaded dynamically to enable true lazy loading

// Create lazy module loaders for dynamic imports
export const createLazyModuleLoaders = () => ({
  poll: {
    es: () => import('./locales/es/poll').then(m => ({ default: m.poll })),
    en: () => import('./locales/en/poll').then(m => ({ default: m.poll })),
  },
  games: {
    es: () => import('./locales/es/games').then(m => ({ default: m.games })),
    en: () => import('./locales/en/games').then(m => ({ default: m.games })),
  },
  giveaway: {
    es: () => import('./locales/es/giveaway').then(m => ({ default: m.giveaway })),
    en: () => import('./locales/en/giveaway').then(m => ({ default: m.giveaway })),
  },
  macros: {
    es: () => import('./locales/es/macros').then(m => ({ default: m.macros })),
    en: () => import('./locales/en/macros').then(m => ({ default: m.macros })),
  },
  commands: {
    es: () => import('./locales/es/commands').then(m => ({ default: m.commands })),
    en: () => import('./locales/en/commands').then(m => ({ default: m.commands })),
  },
  predictions: {
    es: () => import('./locales/es/predictions').then(m => ({ default: m.predictions })),
    en: () => import('./locales/en/predictions').then(m => ({ default: m.predictions })),
  },
  rewards: {
    es: () => import('./locales/es/rewards').then(m => ({ default: m.rewards })),
    en: () => import('./locales/en/rewards').then(m => ({ default: m.rewards })),
  },
  moderation: {
    es: () => import('./locales/es/moderation').then(m => ({ default: m.moderation })),
    en: () => import('./locales/en/moderation').then(m => ({ default: m.moderation })),
  },
  analytics: {
    es: () => import('./locales/es/analytics').then(m => ({ default: m.analytics })),
    en: () => import('./locales/en/analytics').then(m => ({ default: m.analytics })),
  },
  overlay: {
    es: () => import('./locales/es/overlay').then(m => ({ default: m.overlay })),
    en: () => import('./locales/en/overlay').then(m => ({ default: m.overlay })),
  },
  platforms: {
    es: () => import('./locales/es/platforms').then(m => ({ default: m.platforms })),
    en: () => import('./locales/en/platforms').then(m => ({ default: m.platforms })),
  },
  misc: {
    es: () => import('./locales/es/misc').then(m => ({ default: m.misc })),
    en: () => import('./locales/en/misc').then(m => ({ default: m.misc })),
  },
});

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'twitch_vote_locale';

// Import core translations statically for better reliability
import { common as commonEs } from './locales/es/common';
import { errors as errorsEs } from './locales/es/errors';
import { navigation as navigationEs } from './locales/es/navigation';
import { common as commonEn } from './locales/en/common';
import { errors as errorsEn } from './locales/en/errors';
import { navigation as navigationEn } from './locales/en/navigation';

// Create core translations with only essential modules
const createCoreTranslations = async (locale: Locale): Promise<PartialTranslations> => {
  try {
    // Use static imports for core modules to avoid dynamic import issues in tests
    if (locale === 'es') {
      return {
        common: commonEs,
        errors: errorsEs,
        nav: navigationEs,
      };
    } else {
      return {
        common: commonEn,
        errors: errorsEn,
        nav: navigationEn,
      };
    }
  } catch (error) {
    console.error(`Failed to load core translations for locale ${locale}:`, error);
    // Return empty object to prevent crashes, but log the error
    return {};
  }
};

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
    return detectBrowserLocale();
  });

  // Track which lazy modules have been loaded
  const [loadedModules, setLoadedModules] = useState<LoadedModulesState>({});
  
  // Track loading state for lazy modules only
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize core translations synchronously
  const [translations, setTranslations] = useState<PartialTranslations>(() => {
    // Load core translations synchronously on initialization
    if (locale === 'es') {
      return {
        common: commonEs,
        errors: errorsEs,
        nav: navigationEs,
      };
    } else {
      return {
        common: commonEn,
        errors: errorsEn,
        nav: navigationEn,
      };
    }
  });

  // Lazy module loaders
  const lazyLoaders = createLazyModuleLoaders();

  // Update core translations when locale changes
  useEffect(() => {
    const newCoreTranslations = locale === 'es' 
      ? { common: commonEs, errors: errorsEs, nav: navigationEs }
      : { common: commonEn, errors: errorsEn, nav: navigationEn };
    
    setTranslations(prev => ({
      ...newCoreTranslations,
      // Keep any loaded lazy modules
      ...Object.fromEntries(
        Object.entries(prev).filter(([key]) => !['common', 'errors', 'nav'].includes(key))
      )
    }));
    
    // Reload any previously loaded modules for the new locale
    const currentlyLoaded = Object.keys(loadedModules).filter(
      module => loadedModules[module as LazyTranslationModule]
    ) as LazyTranslationModule[];
    
    if (currentlyLoaded.length > 0) {
      // Reload all previously loaded modules for the new locale
      Promise.all(
        currentlyLoaded.map(module => loadModuleInternal(module, locale))
      ).catch(console.error);
    }
  }, [locale, loadedModules]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
    
    // Core translations will be updated by the useEffect above
  }, []);

  // Internal function to load a module for a specific locale
  const loadModuleInternal = useCallback(async (
    module: LazyTranslationModule, 
    targetLocale: Locale = locale
  ) => {
    try {
      const loader = lazyLoaders[module][targetLocale];
      const moduleData = await loader();
      
      setTranslations(prev => ({
        ...prev,
        [module]: moduleData.default,
      }));
      
      return moduleData.default;
    } catch (error) {
      console.error(`Failed to load translation module '${module}' for locale '${targetLocale}':`, error);
      throw error;
    }
  }, [locale, lazyLoaders]);

  // Public function to load a lazy module
  const loadModule = useCallback(async (module: LazyTranslationModule): Promise<void> => {
    // Check if module is already loaded
    if (loadedModules[module]) {
      return;
    }

    setIsLoading(true);
    
    try {
      await loadModuleInternal(module);
      
      setLoadedModules(prev => ({
        ...prev,
        [module]: true,
      }));
    } catch (error) {
      console.error(`Failed to load module '${module}':`, error);
      // Don't throw here to prevent breaking the UI
    } finally {
      setIsLoading(false);
    }
  }, [loadedModules, loadModuleInternal]);

  // Check if a module is loaded
  const isModuleLoaded = useCallback((module: LazyTranslationModule): boolean => {
    return Boolean(loadedModules[module]);
  }, [loadedModules]);

  // Update document language when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t: translations as Translations, // Type assertion since we ensure core modules are always present
    loadModule,
    isModuleLoaded,
    isLoading,
  };

  // Don't render children until core modules are loaded
  // Since core translations are loaded synchronously, we only need to check for lazy loading
  if (isLoading) {
    return (
      <I18nContext.Provider value={value}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-twitch-brand mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading translations...</p>
          </div>
        </div>
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

/**
 * Hook for requesting a specific translation module to be loaded
 * This hook ensures the module is loaded when the component mounts
 * and provides loading state information
 * 
 * @param module - The lazy translation module to load
 * @returns Object with loading state and error information
 */
export const useTranslationModule = (module: LazyTranslationModule) => {
  const { loadModule, isModuleLoaded, isLoading } = useI18n();
  const [moduleLoading, setModuleLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isModuleLoaded(module)) {
      setModuleLoading(true);
      setError(null);
      
      loadModule(module)
        .then(() => {
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          setModuleLoading(false);
        });
    }
  }, [module, loadModule, isModuleLoaded]);

  return {
    isLoaded: isModuleLoaded(module),
    isLoading: moduleLoading || isLoading,
    error,
  };
};

// Re-export interpolate function for backward compatibility
export { interpolate };
