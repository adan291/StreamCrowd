import React, { useState, useRef, useEffect } from 'react';
import { useI18n, Locale } from '../i18n';
import { Globe, Check } from 'lucide-react';

const languages: { code: Locale; name: string; flag: string }[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

interface LanguageSelectorProps {
  variant?: 'icon' | 'full' | 'compact';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'icon',
  className = '',
}) => {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languages.find((l) => l.code === locale) || languages[0];

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelectLanguage = (code: Locale) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocale(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
        title={currentLang.name}
        aria-label={`Change language. Current: ${currentLang.name}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {variant === 'icon' ? (
          <Globe size={20} aria-hidden="true" />
        ) : (
          <div className="flex items-center gap-2">
            <span aria-hidden="true">{currentLang.flag}</span>
            {variant === 'full' && <span className="font-medium">{currentLang.name}</span>}
            {variant === 'compact' && (
              <span className="font-medium">{currentLang.code.toUpperCase()}</span>
            )}
          </div>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-44 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-[9999] animate-scale-up"
          role="listbox"
          aria-label="Select language"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={locale === lang.code}
              onClick={handleSelectLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                locale === lang.code
                  ? 'bg-twitch-brand/10 text-twitch-brand font-semibold'
                  : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              <span className="text-xl" aria-hidden="true">{lang.flag}</span>
              <span className="flex-1 font-medium">{lang.name}</span>
              {locale === lang.code && <Check size={18} className="text-twitch-brand" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
