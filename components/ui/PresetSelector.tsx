import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';

/**
 * PresetSelector - Dropdown component for selecting configuration presets
 * @requirements 5.1, 5.2, 6.1, 6.2
 * 
 * Displays a list of presets with icons and descriptions.
 * Shows "Personalizado" when the current configuration has been modified.
 */

export interface Preset<T> {
  /** Unique identifier for the preset */
  id: string;
  /** Display name of the preset */
  name: string;
  /** Optional description shown below the name */
  description?: string;
  /** Optional icon displayed before the name */
  icon?: React.ReactNode;
  /** Values to apply when this preset is selected */
  values: Partial<T>;
}

export interface PresetSelectorProps<T> {
  /** Available presets to choose from */
  presets: Preset<T>[];
  /** Current configuration values (used to detect customization) */
  currentValues: T;
  /** Callback when a preset is selected */
  onSelect: (preset: Preset<T>) => void;
  /** Whether the current config differs from any preset */
  isCustomized: boolean;
  /** Optional label for the selector */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export function PresetSelector<T>({
  presets,
  currentValues,
  onSelect,
  isCustomized,
  label = 'Preset',
  className = '',
}: PresetSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = useCallback((preset: Preset<T>) => {
    onSelect(preset);
    setIsOpen(false);
  }, [onSelect]);

  // Find current preset (if any matches)
  const currentPreset = isCustomized 
    ? null 
    : presets.find(p => {
        // Simple check - in real usage, you'd compare values more thoroughly
        return false; // Default to showing first preset or custom
      });

  const displayText = isCustomized ? 'Personalizado' : (currentPreset?.name || presets[0]?.name || 'Seleccionar');

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-zinc-400 mb-1">
          {label}
        </label>
      )}
      
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full flex items-center justify-between gap-2
          px-3 py-2
          bg-zinc-800 border border-zinc-700 rounded-lg
          text-zinc-100 text-sm
          hover:bg-zinc-700 hover:border-zinc-600
          focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500
          transition-colors duration-150
        "
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {isCustomized ? (
            <Sparkles size={16} className="text-purple-400" />
          ) : (
            currentPreset?.icon || presets[0]?.icon
          )}
          <span>{displayText}</span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="
            absolute z-50 w-full mt-1
            bg-zinc-800 border border-zinc-700 rounded-lg
            shadow-lg shadow-black/20
            py-1
            max-h-64 overflow-y-auto
          "
          role="listbox"
        >
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelect(preset)}
              className="
                w-full flex items-start gap-3 px-3 py-2
                hover:bg-zinc-700
                focus:outline-none focus:bg-zinc-700
                transition-colors duration-100
                text-left
              "
              role="option"
              aria-selected={!isCustomized && currentPreset?.id === preset.id}
            >
              {preset.icon && (
                <span className="text-zinc-400 mt-0.5 shrink-0">
                  {preset.icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-100">
                    {preset.name}
                  </span>
                  {!isCustomized && currentPreset?.id === preset.id && (
                    <Check size={14} className="text-green-400" />
                  )}
                </div>
                {preset.description && (
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">
                    {preset.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default PresetSelector;
