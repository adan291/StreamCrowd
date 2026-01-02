/**
 * ChannelSelector - Component for switching between own channel and moderated channels
 * 
 * Displays a dropdown to select which channel context to use.
 * Shows badges for own channel vs moderated channels.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, User, Shield, Crown, RefreshCw } from 'lucide-react';
import type { ChannelContext } from '../src/application/services/ModeratedChannelsService';

// ============================================
// Types
// ============================================

export interface ChannelSelectorProps {
  /** Available channel contexts */
  channels: ChannelContext[];
  /** Currently selected channel */
  selectedChannel: ChannelContext | null;
  /** Callback when channel is selected */
  onSelectChannel: (channelId: string) => void;
  /** Whether channels are loading */
  isLoading?: boolean;
  /** Callback to refresh channels */
  onRefresh?: () => void;
  /** Compact mode for header */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  channels,
  selectedChannel,
  onSelectChannel,
  isLoading = false,
  onRefresh,
  compact = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if no channels or only own channel
  if (channels.length <= 1) {
    return null;
  }

  const handleSelect = (channelId: string) => {
    onSelectChannel(channelId);
    setIsOpen(false);
  };

  const getRoleBadge = (channel: ChannelContext) => {
    if (channel.isBroadcaster) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
          <Crown size={10} />
          Tu canal
        </span>
      );
    }
    if (channel.isModerator) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-600 dark:text-green-400">
          <Shield size={10} />
          Mod
        </span>
      );
    }
    return null;
  };

  // Compact version for header
  if (compact) {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
        >
          {selectedChannel?.isOwnChannel ? (
            <Crown size={14} className="text-yellow-500" />
          ) : (
            <Shield size={14} className="text-green-500" />
          )}
          <span className="max-w-[100px] truncate text-zinc-700 dark:text-zinc-300">
            {selectedChannel?.channelName || 'Seleccionar'}
          </span>
          <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 py-1">
            {channels.map((channel) => (
              <button
                key={channel.channelId}
                onClick={() => handleSelect(channel.channelId)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                  selectedChannel?.channelId === channel.channelId ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-twitch-brand/20 flex items-center justify-center text-twitch-brand text-xs font-bold">
                  {channel.channelName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {channel.channelName}
                    </span>
                    {getRoleBadge(channel)}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    @{channel.channelLogin}
                  </span>
                </div>
                {selectedChannel?.channelId === channel.channelId && (
                  <Check size={16} className="text-twitch-brand shrink-0" />
                )}
              </button>
            ))}
            
            {onRefresh && (
              <>
                <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                <button
                  onClick={() => {
                    onRefresh();
                    setIsOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm"
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                  Actualizar canales
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
        Canal activo
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-twitch-brand/20 flex items-center justify-center text-twitch-brand font-bold">
          {selectedChannel?.channelName.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-white truncate">
              {selectedChannel?.channelName || 'Seleccionar canal'}
            </span>
            {selectedChannel && getRoleBadge(selectedChannel)}
          </div>
          {selectedChannel && (
            <span className="text-xs text-zinc-500">
              @{selectedChannel.channelLogin}
            </span>
          )}
        </div>
        <ChevronDown size={18} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
          {channels.map((channel) => (
            <button
              key={channel.channelId}
              onClick={() => handleSelect(channel.channelId)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                selectedChannel?.channelId === channel.channelId ? 'bg-twitch-brand/5' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-twitch-brand/20 flex items-center justify-center text-twitch-brand font-bold">
                {channel.channelName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-white truncate">
                    {channel.channelName}
                  </span>
                  {getRoleBadge(channel)}
                </div>
                <span className="text-xs text-zinc-500">
                  @{channel.channelLogin}
                </span>
              </div>
              {selectedChannel?.channelId === channel.channelId && (
                <Check size={18} className="text-twitch-brand shrink-0" />
              )}
            </button>
          ))}

          {onRefresh && (
            <>
              <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
              <button
                onClick={() => {
                  onRefresh();
                  setIsOpen(false);
                }}
                disabled={isLoading}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Actualizar lista de canales
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChannelSelector;
