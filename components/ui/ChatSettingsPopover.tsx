/**
 * ChatSettingsPopover Component
 * Compact popover for chat command settings
 */

import React, { useState } from 'react';
import { MessageSquare, X, Settings, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { ChatSettingsPanel, type ChatSettingsConfig, getDefaultChatSettings } from './ChatSettingsPanel';

// ============================================
// TYPES
// ============================================

export interface ChatSettingsPopoverProps {
  config: ChatSettingsConfig;
  onConfigChange: (config: ChatSettingsConfig) => void;
  activityType: 'poll' | 'prediction' | 'game' | 'giveaway' | 'judge';
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const ChatSettingsPopover: React.FC<ChatSettingsPopoverProps> = ({
  config,
  onConfigChange,
  activityType,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg transition-colors ${
          config.enabled 
            ? 'text-blue-500 hover:bg-blue-500/10' 
            : 'text-zinc-400 hover:bg-zinc-500/10'
        }`}
        title="Configuración de comandos de chat"
      >
        <MessageSquare size={16} />
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Content */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Comandos de Chat
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                <X size={14} className="text-zinc-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              <ChatSettingsPanel
                config={config}
                onConfigChange={onConfigChange}
                activityType={activityType}
                compact={true}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatSettingsPopover;
