/**
 * ChatControlPopover Component
 * 
 * Popover button that opens chat control settings panel.
 * Shows a terminal icon and opens configuration for remote control commands.
 * 
 * @module components/ui/ChatControlPopover
 */

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X } from 'lucide-react';
import { ChatControlSettingsPanel, getDefaultChatControlSettings } from './ChatControlSettingsPanel';
import { useActivityConfig } from '../../hooks/useActivityConfig';
import type { ChatControlConfig } from '../../src/application/services/ChatControlCommandsService';

// ============================================
// TYPES
// ============================================

export interface ChatControlPopoverProps {
  /** Custom class name */
  className?: string;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Position of the popover */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// ============================================
// COMPONENT
// ============================================

export const ChatControlPopover: React.FC<ChatControlPopoverProps> = ({
  className = '',
  size = 'sm',
  position = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Use activity config hook for persistence
  const { config, updateConfig } = useActivityConfig<ChatControlConfig>({
    storageKey: 'chat_control_config',
    defaultConfig: getDefaultChatControlSettings(),
  });

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
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

  // Close on escape
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

  // Size classes
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  // Position classes for popover
  const positionClasses = {
    top: 'bottom-full mb-2 right-0',
    bottom: 'top-full mt-2 right-0',
    left: 'right-full mr-2 top-0',
    right: 'left-full ml-2 top-0',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`${sizeClasses[size]} rounded-lg transition-colors ${
          isOpen || config.enabled
            ? 'text-green-500 hover:bg-green-500/10'
            : 'text-zinc-400 hover:bg-zinc-500/10 hover:text-zinc-600 dark:hover:text-zinc-300'
        }`}
        title="Comandos de control remoto"
        aria-label="Configurar comandos de control"
        aria-expanded={isOpen}
      >
        <Terminal size={iconSizes[size]} aria-hidden="true" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute ${positionClasses[position]} z-50 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-green-500" />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Comandos de Control
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 max-h-[60vh] overflow-y-auto">
            <ChatControlSettingsPanel
              config={config}
              onConfigChange={updateConfig}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatControlPopover;
