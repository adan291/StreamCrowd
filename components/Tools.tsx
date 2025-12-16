import React, { useState } from 'react';
import { X, Wrench, Keyboard, ChevronRight, Globe, Sun, Moon, Check } from 'lucide-react';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { useI18n, Locale } from '../i18n';

interface ToolsProps {
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type ToolSection = 'main' | 'shortcuts';

const languages: { code: Locale; name: string; flag: string }[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export const Tools: React.FC<ToolsProps> = ({ onClose, theme, onToggleTheme }) => {
  const { t, locale, setLocale } = useI18n();
  const currentLang = languages.find((l) => l.code === locale);
  const [activeSection, setActiveSection] = useState<ToolSection>('main');

  // If showing shortcuts, render that component
  if (activeSection === 'shortcuts') {
    return <KeyboardShortcuts onClose={() => setActiveSection('main')} />;
  }

  // Main tools menu
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-twitch-brand/20 rounded-lg">
              <Wrench className="text-twitch-brand" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{t.tools.title}</h2>
              <p className="text-zinc-500 text-xs">{t.tools.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tools List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Language Selection */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Globe className="text-blue-500" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-zinc-900 dark:text-white">{t.common.language}</h3>
                <p className="text-xs text-zinc-500">{t.tools.selectLanguage}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLocale(lang.code)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all ${
                    locale === lang.code
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="font-medium text-sm">{lang.name}</span>
                  {locale === lang.code && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
            <div className="flex items-center gap-4 mb-3">
              <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-indigo-500/20'}`}>
                {theme === 'dark' ? <Sun className="text-yellow-500" size={24} /> : <Moon className="text-indigo-500" size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-zinc-900 dark:text-white">{t.common.theme}</h3>
                <p className="text-xs text-zinc-500">{t.tools.switchTheme}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => theme === 'dark' && onToggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all ${
                  theme === 'light'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                <Sun size={18} />
                <span className="font-medium text-sm">{t.overlay.light}</span>
                {theme === 'light' && <Check size={16} />}
              </button>
              <button
                onClick={() => theme === 'light' && onToggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all ${
                  theme === 'dark'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                <Moon size={18} />
                <span className="font-medium text-sm">{t.overlay.dark}</span>
                {theme === 'dark' && <Check size={16} />}
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <button
            onClick={() => setActiveSection('shortcuts')}
            className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex items-center gap-4 group"
          >
            <div className="p-3 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-colors">
              <Keyboard className="text-purple-500" size={24} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-zinc-900 dark:text-white">{t.tools.keyboardShortcuts}</h3>
              <p className="text-xs text-zinc-500">{t.tools.keyboardShortcutsDesc}</p>
            </div>
            <ChevronRight size={20} className="text-zinc-400 group-hover:text-purple-500 transition-colors" />
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-2xl shrink-0">
          <p className="text-xs text-zinc-500 text-center">
            {t.tools.quickAccess} <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-[10px] font-mono">Ctrl+,</kbd>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Tools;
