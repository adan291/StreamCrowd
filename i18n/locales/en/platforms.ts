/**
 * English (EN) Platforms Translations
 * 
 * Multi-platform translations for Twitch, YouTube, Kick integration.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { PlatformsTranslations } from '../../types';

/**
 * Platforms English translations
 * Multi-platform streaming service integration
 */
export const platforms: PlatformsTranslations = {
  // General
  comingSoon: 'Coming soon',
  back: 'Back',
  backToPlatforms: 'Back to platforms',
  availableTools: 'Available tools',
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
  error: 'Error',
  platformConnected: '1 platform connected',
  platformsConnected: '{count} platforms connected',
  platformsDescriptionMulti: 'Connect multiple streaming platforms',
  selectPlatforms: 'Select platforms',
  
  // Broadcaster Auth
  broadcasterAuthorized: 'Authorized',
  broadcasterNotAuthorized: 'Broadcaster not authorized',
  authorizeApp: 'Authorize app',
  streamerAuthorized: '{name} authorized',
  
  // Twitch
  twitchTitle: 'Twitch',
  twitchDescription: 'Commands, predictions, and more',
  twitchToolsDescription: 'Twitch tools and features',
  backToTwitchTools: 'Back to Twitch tools',
  
  // YouTube
  youtubeTitle: 'YouTube',
  youtubeDescription: 'Live chat and polls',
  youtubeToolsDescription: 'YouTube tools and features',
  backToYoutubeTools: 'Back to YouTube tools',
  youtubeConnect: 'Connect with YouTube',
  youtubeDisconnect: 'Disconnect YouTube',
  youtubeLiveChat: 'Live chat',
  youtubePolls: 'YouTube polls',
  
  // Kick
  kickTitle: 'Kick',
  kickDescription: 'Real-time chat',
  kickToolsDescription: 'Kick tools and features',
  backToKickTools: 'Back to Kick tools',
  kickConnect: 'Connect with Kick',
  kickDisconnect: 'Disconnect Kick',
  kickLiveChat: 'Live chat',
  
  // Tools
  commands: 'Commands',
  commandsDescription: 'Custom chat commands',
  predictions: 'Predictions',
  predictionsDescription: 'Twitch predictions',
  channelPoints: 'Channel Points',
  channelPointsDescription: 'Point rewards',
};

export default platforms;