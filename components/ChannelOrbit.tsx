/**
 * ChannelOrbit Component
 * 
 * Displays the main user's avatar in the center with moderated channels
 * orbiting around it as small clickable bubbles.
 * 
 * Visual design:
 * - Center: ALWAYS the logged-in user's avatar (never changes)
 * - Orbit: Moderated channels (smaller avatars positioned around)
 * - Selected channel has a green check indicator
 * - Click to switch channel context
 */

import React, { useMemo } from 'react';
import { Check, Crown, Shield } from 'lucide-react';
import type { ChannelContext } from '../src/application/services/ModeratedChannelsService';

// ============================================
// Types
// ============================================

export interface ChannelOrbitProps {
  /** All available channels (own + moderated) */
  channels: ChannelContext[];
  /** Currently selected/active channel */
  selectedChannel: ChannelContext | null;
  /** Callback when a channel is selected */
  onSelectChannel: (channelId: string) => void;
  /** Avatar URL for the logged-in user (always shown in center) */
  userAvatar?: string;
  /** Display name of the logged-in user */
  userName?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate position for orbit items around a center point
 */
const getOrbitPosition = (index: number, total: number, radius: number) => {
  // Start from top (-90 degrees) and go clockwise
  const angleStep = (2 * Math.PI) / total;
  const angle = -Math.PI / 2 + index * angleStep;
  
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
};

// ============================================
// Main Component
// ============================================

export const ChannelOrbit: React.FC<ChannelOrbitProps> = ({
  channels,
  selectedChannel,
  onSelectChannel,
  userAvatar,
  userName = '',
  size = 'md',
}) => {
  // Size configurations - larger for visibility
  const sizeConfig = {
    sm: { main: 44, orbit: 24, radius: 32, container: 80 },
    md: { main: 52, orbit: 28, radius: 38, container: 92 },
    lg: { main: 60, orbit: 32, radius: 44, container: 104 },
  }[size];

  // Separate own channel from moderated channels
  const { ownChannel, moderatedChannels } = useMemo(() => {
    const own = channels.find(c => c.isBroadcaster || c.isOwnChannel);
    const moderated = channels.filter(c => !c.isBroadcaster && !c.isOwnChannel);
    return { ownChannel: own, moderatedChannels: moderated };
  }, [channels]);

  // Check if own channel is selected
  const isOwnChannelSelected = selectedChannel?.isOwnChannel || selectedChannel?.isBroadcaster;

  // If no channels or only own channel, render simple avatar
  if (moderatedChannels.length === 0) {
    const borderColor = 'border-twitch-brand';
    return (
      <div className="relative" style={{ width: sizeConfig.main, height: sizeConfig.main }}>
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={userName}
            className={`rounded-full border-2 ${borderColor}`}
            style={{ width: sizeConfig.main, height: sizeConfig.main }}
          />
        ) : (
          <div
            className={`rounded-full border-2 ${borderColor} bg-twitch-brand flex items-center justify-center text-white font-bold`}
            style={{ width: sizeConfig.main, height: sizeConfig.main, fontSize: sizeConfig.main * 0.4 }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative overflow-visible shrink-0 flex-none"
      style={{ 
        width: sizeConfig.container, 
        height: sizeConfig.container,
        minWidth: sizeConfig.container,
        minHeight: sizeConfig.container,
      }}
    >
      {/* Center: ALWAYS the logged-in user's avatar */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <button
          onClick={() => ownChannel && onSelectChannel(ownChannel.channelId)}
          className="relative rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-twitch-brand focus:ring-offset-2 focus:ring-offset-zinc-900"
          title={`${userName} (Tu canal)`}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className={`rounded-full border-2 ${isOwnChannelSelected ? 'border-green-500' : 'border-twitch-brand'} bg-zinc-800`}
              style={{ 
                width: `${sizeConfig.main}px`, 
                height: `${sizeConfig.main}px`,
                minWidth: `${sizeConfig.main}px`,
                minHeight: `${sizeConfig.main}px`,
                maxWidth: `${sizeConfig.main}px`,
                maxHeight: `${sizeConfig.main}px`,
              }}
            />
          ) : (
            <div
              className={`rounded-full border-2 ${isOwnChannelSelected ? 'border-green-500' : 'border-twitch-brand'} bg-twitch-brand flex items-center justify-center text-white font-bold`}
              style={{ width: sizeConfig.main, height: sizeConfig.main, fontSize: sizeConfig.main * 0.4 }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Indicator */}
          {isOwnChannelSelected ? (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-zinc-900">
              <Check size={10} className="text-white" strokeWidth={3} />
            </div>
          ) : (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-zinc-900">
              <Crown size={8} className="text-white" />
            </div>
          )}
        </button>
      </div>

      {/* Orbit: Moderated channels */}
      {moderatedChannels.map((channel, index) => {
        const position = getOrbitPosition(index, moderatedChannels.length, sizeConfig.radius);
        const isSelected = selectedChannel?.channelId === channel.channelId;
        
        return (
          <button
            key={channel.channelId}
            onClick={() => onSelectChannel(channel.channelId)}
            className="absolute rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-twitch-brand focus:ring-offset-1 focus:ring-offset-zinc-900 z-20"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            }}
            title={`${channel.channelName} (Mod)`}
          >
            {/* Avatar - show initial since we don't have profile images for moderated channels */}
            <div
              className={`rounded-full border-2 ${isSelected ? 'border-green-500' : 'border-zinc-600'} bg-zinc-700 flex items-center justify-center text-white font-bold`}
              style={{ width: sizeConfig.orbit, height: sizeConfig.orbit, fontSize: sizeConfig.orbit * 0.45 }}
            >
              {channel.channelName.charAt(0).toUpperCase()}
            </div>
            
            {/* Indicator */}
            {isSelected ? (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center border border-zinc-900">
                <Check size={8} className="text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-600 rounded-full flex items-center justify-center border border-zinc-900">
                <Shield size={7} className="text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ChannelOrbit;
