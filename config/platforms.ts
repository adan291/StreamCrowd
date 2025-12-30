/**
 * Platform and Tool Configuration
 * 
 * Configuration-driven approach for platforms and their tools.
 * Designed for easy expansion to support multiple streaming platforms.
 * 
 * @requirements 2.1, 3.2, 6.1, 6.2
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Configuration for a streaming platform card
 */
export interface PlatformConfig {
  id: string;
  icon: string; // Icon name from lucide-react
  title: string;
  description: string;
  color: string;
  enabled: boolean;
  comingSoon?: boolean;
}

/**
 * Configuration for a tool card within a platform
 */
export interface ToolConfig {
  id: string;
  icon: string; // Icon name from lucide-react
  title: string;
  description: string;
  color: string;
  enabled: boolean;
  comingSoon?: boolean;
}

// ============================================
// PLATFORM CONFIGURATIONS
// ============================================

/**
 * Available streaming platforms
 * Currently only Twitch is enabled, prepared for future expansion
 * 
 * @requirements 2.1 - Twitch as initial platform
 * @requirements 4.1 - YouTube platform support
 * @requirements 5.1 - Kick platform support
 * @requirements 6.1 - Dynamic list of platforms
 */
export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'twitch',
    icon: 'Twitch',
    title: 'Twitch',
    description: 'Comandos, predicciones y más',
    color: '#9146FF',
    enabled: true,
  },
  {
    id: 'youtube',
    icon: 'Youtube',
    title: 'YouTube',
    description: 'Herramientas de YouTube Live',
    color: '#FF0000',
    enabled: false,
    comingSoon: true,
  },
  {
    id: 'kick',
    icon: 'Zap',
    title: 'Kick',
    description: 'Herramientas de Kick',
    color: '#53FC18',
    enabled: false,
    comingSoon: true,
  },
];

// ============================================
// TWITCH TOOL CONFIGURATIONS
// ============================================

/**
 * Available tools for Twitch platform
 * 
 * @requirements 3.2 - Tool list with Comandos, Predicciones, Channel Points
 * @requirements 6.2 - Dynamic list of tools per platform
 */
export const TWITCH_TOOLS: ToolConfig[] = [
  {
    id: 'commands',
    icon: 'Terminal',
    title: 'Comandos',
    description: 'Comandos personalizados de chat',
    color: '#a970ff',
    enabled: true,
  },
  {
    id: 'predictions',
    icon: 'TrendingUp',
    title: 'Predicciones',
    description: 'Predicciones de Twitch',
    color: '#00f0f0',
    enabled: true,
  },
  {
    id: 'channelpoints',
    icon: 'Coins',
    title: 'Channel Points',
    description: 'Recompensas de puntos',
    color: '#fbbf24',
    enabled: true,
  },
  {
    id: 'timers',
    icon: 'Timer',
    title: 'Timers',
    description: 'Mensajes automáticos',
    color: '#10b981',
    enabled: true,
  },
];

/**
 * Available tools for YouTube platform
 * 
 * @requirements 4.1 - YouTube platform support
 * @requirements 6.2 - Dynamic list of tools per platform
 */
export const YOUTUBE_TOOLS: ToolConfig[] = [
  {
    id: 'commands',
    icon: 'Terminal',
    title: 'Comandos',
    description: 'Comandos personalizados de chat',
    color: '#FF4444',
    enabled: true,
  },
  {
    id: 'polls',
    icon: 'BarChart2',
    title: 'Encuestas',
    description: 'Encuestas en el chat',
    color: '#FF6666',
    enabled: true,
  },
  {
    id: 'timers',
    icon: 'Timer',
    title: 'Timers',
    description: 'Mensajes automáticos',
    color: '#FF8888',
    enabled: true,
  },
];

/**
 * Available tools for Kick platform
 * 
 * @requirements 5.1 - Kick platform support
 * @requirements 6.2 - Dynamic list of tools per platform
 */
export const KICK_TOOLS: ToolConfig[] = [
  {
    id: 'commands',
    icon: 'Terminal',
    title: 'Comandos',
    description: 'Comandos personalizados de chat',
    color: '#45E614',
    enabled: true,
  },
  {
    id: 'polls',
    icon: 'BarChart2',
    title: 'Encuestas',
    description: 'Encuestas en el chat',
    color: '#5BF02A',
    enabled: true,
  },
  {
    id: 'timers',
    icon: 'Timer',
    title: 'Timers',
    description: 'Mensajes automáticos',
    color: '#71FA40',
    enabled: true,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a platform by its ID
 */
export function getPlatformById(id: string): PlatformConfig | undefined {
  return PLATFORMS.find(p => p.id === id);
}

/**
 * Get tools for a specific platform
 * Returns tools for Twitch, YouTube, or Kick
 * 
 * @requirements 4.1 - YouTube platform support
 * @requirements 5.1 - Kick platform support
 */
export function getToolsForPlatform(platformId: string): ToolConfig[] {
  switch (platformId) {
    case 'twitch':
      return TWITCH_TOOLS;
    case 'youtube':
      return YOUTUBE_TOOLS;
    case 'kick':
      return KICK_TOOLS;
    default:
      return [];
  }
}

/**
 * Get a tool by its ID within a platform
 */
export function getToolById(platformId: string, toolId: string): ToolConfig | undefined {
  const tools = getToolsForPlatform(platformId);
  return tools.find(t => t.id === toolId);
}

/**
 * Get only enabled platforms
 */
export function getEnabledPlatforms(): PlatformConfig[] {
  return PLATFORMS.filter(p => p.enabled);
}

/**
 * Get only enabled tools for a platform
 */
export function getEnabledTools(platformId: string): ToolConfig[] {
  return getToolsForPlatform(platformId).filter(t => t.enabled);
}
