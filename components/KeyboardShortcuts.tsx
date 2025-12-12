import React, { useState, useEffect, useCallback } from 'react';
import { X, Keyboard, AlertTriangle, Check, RotateCcw, Search } from 'lucide-react';
import { Button } from './Button';

// Default shortcuts configuration
export interface ShortcutConfig {
  id: string;
  name: string;
  description: string;
  keys: string[]; // e.g., ['Ctrl', 'Enter']
  category: 'poll' | 'navigation' | 'general';
  action: string; // Action identifier
  enabled: boolean;
}

const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // Poll shortcuts
  { id: 'create-poll', name: 'Crear Encuesta', description: 'Lanza la encuesta actual', keys: ['Ctrl', 'Enter'], category: 'poll', action: 'createPoll', enabled: true },
  { id: 'stop-poll', name: 'Detener Encuesta', description: 'Detiene la encuesta activa', keys: ['Ctrl', 'S'], category: 'poll', action: 'stopPoll', enabled: true },
  { id: 'reset-poll', name: 'Nueva Encuesta', description: 'Reinicia para crear nueva encuesta', keys: ['Ctrl', 'N'], category: 'poll', action: 'resetPoll', enabled: true },
  
  // Navigation shortcuts
  { id: 'nav-panel', name: 'Ir a Panel', description: 'Navega al panel de encuestas', keys: ['Alt', '1'], category: 'navigation', action: 'navPanel', enabled: true },
  { id: 'nav-gallery', name: 'Ir a Galería', description: 'Navega a la galería de assets', keys: ['Alt', '2'], category: 'navigation', action: 'navGallery', enabled: true },
  { id: 'nav-data', name: 'Ir a Data', description: 'Navega a analytics', keys: ['Alt', '3'], category: 'navigation', action: 'navData', enabled: true },
  
  // General shortcuts
  { id: 'close-modal', name: 'Cerrar Modal', description: 'Cierra cualquier modal abierto', keys: ['Escape'], category: 'general', action: 'closeModal', enabled: true },
  { id: 'toggle-theme', name: 'Cambiar Tema', description: 'Alterna entre tema claro/oscuro', keys: ['Ctrl', 'T'], category: 'general', action: 'toggleTheme', enabled: true },
  { id: 'show-history', name: 'Ver Historial', description: 'Muestra el historial de encuestas', keys: ['Ctrl', 'H'], category: 'general', action: 'showHistory', enabled: true },
  { id: 'toggle-sidebar', name: 'Colapsar Menú', description: 'Colapsa/expande el menú lateral', keys: ['Ctrl', 'B'], category: 'general', action: 'toggleSidebar', enabled: true },
];

const STORAGE_KEY = 'twitch_vote_shortcuts';

// Helper to format keys for display
const formatKeys = (keys: string[]): string => keys.join(' + ');

// Helper to check if two shortcuts conflict
const checkConflict = (keys1: string[], keys2: string[]): boolean => {
  if (keys1.length !== keys2.length) return false;
  return keys1.every((key, i) => key.toLowerCase() === keys2[i].toLowerCase());
};

interface KeyboardShortcutsProps {
  onClose: () => void;
  onShortcutsChange?: (shortcuts: ShortcutConfig[]) => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ onClose, onShortcutsChange }) => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [conflicts, setConflicts] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'poll' | 'navigation' | 'general'>('all');

  // Load shortcuts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new shortcuts
        const merged = DEFAULT_SHORTCUTS.map(def => {
          const saved = parsed.find((s: ShortcutConfig) => s.id === def.id);
          return saved ? { ...def, ...saved } : def;
        });
        setShortcuts(merged);
      } catch {
        setShortcuts(DEFAULT_SHORTCUTS);
      }
    } else {
      setShortcuts(DEFAULT_SHORTCUTS);
    }
  }, []);

  // Save shortcuts to localStorage
  const saveShortcuts = useCallback((newShortcuts: ShortcutConfig[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newShortcuts));
    setShortcuts(newShortcuts);
    onShortcutsChange?.(newShortcuts);
  }, [onShortcutsChange]);

  // Check for conflicts when shortcuts change
  useEffect(() => {
    const newConflicts = new Map<string, string>();
    shortcuts.forEach((s1, i) => {
      if (!s1.enabled) return;
      shortcuts.forEach((s2, j) => {
        if (i >= j || !s2.enabled) return;
        if (checkConflict(s1.keys, s2.keys)) {
          newConflicts.set(s1.id, s2.name);
          newConflicts.set(s2.id, s1.name);
        }
      });
    });
    setConflicts(newConflicts);
  }, [shortcuts]);

  // Handle key recording
  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (e.metaKey) keys.push('Meta');

      // Add the actual key if it's not a modifier
      const key = e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        keys.push(key.length === 1 ? key.toUpperCase() : key);
      }

      if (keys.length > 0) {
        setRecordingKeys(keys);
      }
    };

    const handleKeyUp = () => {
      if (recordingKeys.length > 0 && editingId) {
        // Check for conflicts before saving
        const hasConflict = shortcuts.some(s => 
          s.id !== editingId && s.enabled && checkConflict(s.keys, recordingKeys)
        );

        if (!hasConflict || window.confirm('Este atajo ya está en uso. ¿Deseas sobrescribirlo?')) {
          const newShortcuts = shortcuts.map(s =>
            s.id === editingId ? { ...s, keys: recordingKeys } : s
          );
          saveShortcuts(newShortcuts);
        }

        setIsRecording(false);
        setEditingId(null);
        setRecordingKeys([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording, recordingKeys, editingId, shortcuts, saveShortcuts]);

  const startRecording = (id: string) => {
    setEditingId(id);
    setIsRecording(true);
    setRecordingKeys([]);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setEditingId(null);
    setRecordingKeys([]);
  };

  const toggleShortcut = (id: string) => {
    const newShortcuts = shortcuts.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    saveShortcuts(newShortcuts);
  };

  const resetToDefaults = () => {
    if (window.confirm('¿Restaurar todos los atajos a sus valores por defecto?')) {
      saveShortcuts(DEFAULT_SHORTCUTS);
    }
  };

  // Filter shortcuts
  const filteredShortcuts = shortcuts.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all' as const, name: 'Todos', count: shortcuts.length },
    { id: 'poll' as const, name: 'Encuestas', count: shortcuts.filter(s => s.category === 'poll').length },
    { id: 'navigation' as const, name: 'Navegación', count: shortcuts.filter(s => s.category === 'navigation').length },
    { id: 'general' as const, name: 'General', count: shortcuts.filter(s => s.category === 'general').length },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Keyboard className="text-purple-500" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Atajos de Teclado</h2>
              <p className="text-zinc-500 text-xs">Personaliza los atajos de la aplicación</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefaults}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Restaurar valores por defecto"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search and Categories */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar atajos..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              No se encontraron atajos
            </div>
          ) : (
            filteredShortcuts.map(shortcut => {
              const hasConflict = conflicts.has(shortcut.id);
              const isEditing = editingId === shortcut.id;

              return (
                <div
                  key={shortcut.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isEditing
                      ? 'border-purple-500 bg-purple-500/10'
                      : hasConflict && shortcut.enabled
                        ? 'border-yellow-500/50 bg-yellow-500/5'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${shortcut.enabled ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                          {shortcut.name}
                        </span>
                        {hasConflict && shortcut.enabled && (
                          <span className="flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded">
                            <AlertTriangle size={10} />
                            Conflicto
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{shortcut.description}</p>
                      {hasConflict && shortcut.enabled && (
                        <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1">
                          Conflicto con: {conflicts.get(shortcut.id)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Shortcut keys display/edit */}
                      <button
                        onClick={() => isEditing ? cancelRecording() : startRecording(shortcut.id)}
                        disabled={!shortcut.enabled}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all min-w-[100px] text-center ${
                          isEditing
                            ? 'bg-purple-500 text-white animate-pulse'
                            : shortcut.enabled
                              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 cursor-not-allowed'
                        }`}
                      >
                        {isEditing
                          ? recordingKeys.length > 0
                            ? formatKeys(recordingKeys)
                            : 'Presiona teclas...'
                          : formatKeys(shortcut.keys)
                        }
                      </button>

                      {/* Enable/Disable toggle */}
                      <button
                        onClick={() => toggleShortcut(shortcut.id)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          shortcut.enabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            shortcut.enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-2xl shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Haz clic en un atajo para editarlo
            </p>
            <Button onClick={onClose}>
              <Check size={16} /> Listo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to use shortcuts in the app
export const useKeyboardShortcuts = (actions: Record<string, () => void>) => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setShortcuts(JSON.parse(saved));
      } catch {
        setShortcuts(DEFAULT_SHORTCUTS);
      }
    } else {
      setShortcuts(DEFAULT_SHORTCUTS);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow Escape in inputs
        if (e.key !== 'Escape') return;
      }

      const pressedKeys: string[] = [];
      if (e.ctrlKey) pressedKeys.push('Ctrl');
      if (e.altKey) pressedKeys.push('Alt');
      if (e.shiftKey) pressedKeys.push('Shift');
      if (e.metaKey) pressedKeys.push('Meta');

      const key = e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        pressedKeys.push(key.length === 1 ? key.toUpperCase() : key);
      }

      // Find matching shortcut
      const matchedShortcut = shortcuts.find(s => 
        s.enabled && checkConflict(s.keys, pressedKeys)
      );

      if (matchedShortcut && actions[matchedShortcut.action]) {
        e.preventDefault();
        actions[matchedShortcut.action]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, actions]);

  return { shortcuts, setShortcuts };
};

export default KeyboardShortcuts;
