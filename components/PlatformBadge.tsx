/**
 * PlatformBadge Component
 * 
 * Displays platform-specific badges for users in chat.
 * Supports badges from Twitch, YouTube, and Kick.
 * 
 * @requirements 4.6 - Display YouTube-specific user badges (member, moderator)
 * @requirements 5.6 - Display Kick-specific user badges (subscriber, moderator, VIP)
 */

import React from 'react';
import {
  Crown,
  Shield,
  Star,
  Gem,
  Award,
  CheckCircle,
  Sparkles,
  Zap,
  Youtube,
  Twitch,
} from 'lucide-react';
import type { Badge, Platform, BadgeType } from '../types/platform';

// ============================================
// BADGE ICON MAPPING
// ============================================

interface BadgeIconConfig {
  icon: React.ReactNode;
  color: string;
  label: string;
}

/**
 * Get badge configuration based on type and platform
 * @requirements 4.6 - YouTube badges (member, moderator)
 * @requirements 5.6 - Kick badges (subscriber, moderator, VIP)
 */
function getBadgeConfig(badge: Badge): BadgeIconConfig {
  const { type, platform, tier } = badge;
  
  // Platform-specific colors
  const platformColors: Record<Platform, string> = {
    twitch: '#9146FF',
    youtube: '#FF0000',
    kick: '#53FC18',
  };
  
  const baseColor = platformColors[platform];
  
  switch (type) {
    case 'broadcaster':
    case 'owner':
      return {
        icon: <Crown size={14} />,
        color: '#FFD700',
        label: badge.label || 'Broadcaster',
      };
      
    case 'moderator':
      return {
        icon: <Shield size={14} />,
        color: platform === 'twitch' ? '#00AD03' : baseColor,
        label: badge.label || 'Moderator',
      };
      
    case 'vip':
      return {
        icon: <Gem size={14} />,
        color: platform === 'twitch' ? '#E005B9' : baseColor,
        label: badge.label || 'VIP',
      };
      
    case 'subscriber':
      return {
        icon: <Star size={14} />,
        color: baseColor,
        label: badge.label || (tier ? `Sub T${tier}` : 'Subscriber'),
      };
      
    case 'member':
      // YouTube membership
      return {
        icon: <Award size={14} />,
        color: '#2BA640',
        label: badge.label || 'Member',
      };
      
    case 'verified':
      return {
        icon: <CheckCircle size={14} />,
        color: platform === 'youtube' ? '#606060' : baseColor,
        label: badge.label || 'Verified',
      };
      
    case 'founder':
      return {
        icon: <Sparkles size={14} />,
        color: '#9146FF',
        label: badge.label || 'Founder',
      };
      
    case 'prime':
      return {
        icon: <Zap size={14} />,
        color: '#00A8E1',
        label: badge.label || 'Prime',
      };
      
    default:
      return {
        icon: <Star size={14} />,
        color: baseColor,
        label: badge.label || type,
      };
  }
}

/**
 * Get platform icon
 */
function getPlatformIcon(platform: Platform): React.ReactNode {
  switch (platform) {
    case 'twitch':
      return <Twitch size={12} />;
    case 'youtube':
      return <Youtube size={12} />;
    case 'kick':
      return <Zap size={12} />;
    default:
      return null;
  }
}

// ============================================
// COMPONENT PROPS
// ============================================

interface PlatformBadgeProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPlatformIcon?: boolean;
  className?: string;
}

interface BadgeListProps {
  badges: Badge[];
  size?: 'sm' | 'md' | 'lg';
  maxBadges?: number;
  showLabels?: boolean;
  showPlatformIcons?: boolean;
  className?: string;
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Single badge component
 */
export const PlatformBadge: React.FC<PlatformBadgeProps> = ({
  badge,
  size = 'md',
  showLabel = false,
  showPlatformIcon = false,
  className = '',
}) => {
  const config = getBadgeConfig(badge);
  
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };
  
  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      title={config.label}
      role="img"
      aria-label={`${badge.platform} ${config.label} badge`}
    >
      <span
        className={`inline-flex items-center justify-center rounded ${sizeClasses[size]}`}
        style={{ color: config.color }}
      >
        {config.icon}
      </span>
      {showPlatformIcon && (
        <span
          className="opacity-60"
          style={{ color: config.color }}
        >
          {getPlatformIcon(badge.platform)}
        </span>
      )}
      {showLabel && (
        <span
          className="text-xs font-medium"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
};

/**
 * Badge list component - displays multiple badges
 */
export const BadgeList: React.FC<BadgeListProps> = ({
  badges,
  size = 'md',
  maxBadges = 5,
  showLabels = false,
  showPlatformIcons = false,
  className = '',
}) => {
  const displayBadges = badges.slice(0, maxBadges);
  const remainingCount = badges.length - maxBadges;
  
  if (badges.length === 0) {
    return null;
  }
  
  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role="list"
      aria-label="User badges"
    >
      {displayBadges.map((badge, index) => (
        <PlatformBadge
          key={`${badge.platform}-${badge.type}-${index}`}
          badge={badge}
          size={size}
          showLabel={showLabels}
          showPlatformIcon={showPlatformIcons}
        />
      ))}
      {remainingCount > 0 && (
        <span
          className="text-xs text-zinc-500 dark:text-zinc-400"
          title={`${remainingCount} more badge(s)`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

/**
 * Platform indicator component - shows which platform a message is from
 */
export const PlatformIndicator: React.FC<{
  platform: Platform;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}> = ({
  platform,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const platformColors: Record<Platform, string> = {
    twitch: '#9146FF',
    youtube: '#FF0000',
    kick: '#53FC18',
  };
  
  const platformNames: Record<Platform, string> = {
    twitch: 'Twitch',
    youtube: 'YouTube',
    kick: 'Kick',
  };
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      title={platformNames[platform]}
      role="img"
      aria-label={`From ${platformNames[platform]}`}
    >
      <span
        className={`inline-flex items-center justify-center ${sizeClasses[size]}`}
        style={{ color: platformColors[platform] }}
      >
        {getPlatformIcon(platform)}
      </span>
      {showLabel && (
        <span
          className="text-xs font-medium"
          style={{ color: platformColors[platform] }}
        >
          {platformNames[platform]}
        </span>
      )}
    </div>
  );
};

export default PlatformBadge;
