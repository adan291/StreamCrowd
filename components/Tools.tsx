import React, { useState } from 'react';
import { X, Wrench, Keyboard, ChevronRight } from 'lucide-react';
import { KeyboardShortcuts } from './KeyboardShortcuts';

interface ToolsProps {
  onClose: () => void;
}

type ToolSection = 'main' | 'shortcuts';

export const Tools: React.FC<ToolsProps> = ({ onClose }) => {
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
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Tools</h2>
              <p className="text-zinc-500 text-xs">Herramientas y configuración</p>
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
          {/* Keyboard Shortcuts */}
          <button
            onClick={() => setActiveSection('shortcuts')}
            className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex items-center gap-4 group"
          >
            <div className="p-3 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-colors">
              <Keyboard className="text-purple-500" size={24} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-zinc-900 dark:text-white">Atajos de Teclado</h3>
              <p className="text-xs text-zinc-500">Personaliza los atajos de la aplicación</p>
            </div>
            <ChevronRight size={20} className="text-zinc-400 group-hover:text-purple-500 transition-colors" />
          </button>

          {/* Placeholder for future tools */}
          <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-900/50">
            <p className="text-center text-xs text-zinc-400">
              Más herramientas próximamente...
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-2xl shrink-0">
          <p className="text-xs text-zinc-500 text-center">
            Accede rápidamente con <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-[10px] font-mono">Ctrl+,</kbd>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Tools;
