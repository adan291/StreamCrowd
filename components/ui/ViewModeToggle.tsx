import React, { useState, useEffect, useCallback } from 'react';
import { Minimize2, Maximize2 } from 'lucide-react';

/**
 * ViewModeToggle - Toggle between compact and expanded view modes
 * @requirements 7.1, 7.4
 * 
 * Provides a toggle button to switch between compact and expanded views.
 * Persists the user's preference to localStorage.
 */

export type ViewMode = 'compact' | 'expanded';

export interface ViewModeToggleProps {
  /** Current view mode */
  mode: ViewMode;
  /** Callback when mode changes */
  onChange: (mode: ViewMode) => void;
  /** localStorage key for persistence (optional) */
  storageKey?: string;
  /** Additional CSS classes */
  className?: string;
  /** Labels for the modes */
  labels?: {
    compact?: string;
    expanded?: string;
  };
  /** Disable the toggle */
  disabled?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  mode,
  onChange,
  storageKey,
  className = '',
  labels = {
    compact: 'Compacto',
    expanded: 'Expandido',
  },
  disabled = false,
}) => {
  // Load from localStorage on mount if storageKey is provided
  useEffect(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored === 'compact' || stored === 'expanded') {
          onChange(stored);
        }
      } catch (e) {
        // localStorage not available, ignore
        console.warn('localStorage not available for ViewModeToggle');
      }
    }
  }, [storageKey]); // Only run on mount

  // Persist to localStorage when mode changes
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, mode);
      } catch (e) {
        // localStorage not available, ignore
      }
    }
  }, [mode, storageKey]);

  const handleToggle = useCallback(() => {
    const newMode: ViewMode = mode === 'compact' ? 'expanded' : 'compact';
    onChange(newMode);
  }, [mode, onChange]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5
          rounded-lg text-sm font-medium
          transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${mode === 'compact' 
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
          }
        `}
        aria-pressed={mode === 'compact'}
        title={disabled ? 'Desactiva el asistente para cambiar la vista' : (mode === 'compact' ? 'Cambiar a vista expandida' : 'Cambiar a vista compacta')}
      >
        {mode === 'compact' ? (
          <>
            <Minimize2 size={14} />
            <span>{labels.compact}</span>
          </>
        ) : (
          <>
            <Maximize2 size={14} />
            <span>{labels.expanded}</span>
          </>
        )}
      </button>
    </div>
  );
};

/**
 * Hook for managing view mode state with localStorage persistence
 */
export function useViewMode(
  storageKey: string,
  defaultMode: ViewMode = 'expanded'
): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return defaultMode;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'compact' || stored === 'expanded') {
        return stored;
      }
    } catch (e) {
      // localStorage not available
    }
    return defaultMode;
  });

  const setModeWithPersistence = useCallback((newMode: ViewMode) => {
    setMode(newMode);
    try {
      localStorage.setItem(storageKey, newMode);
    } catch (e) {
      // localStorage not available
    }
  }, [storageKey]);

  return [mode, setModeWithPersistence];
}

export default ViewModeToggle;
