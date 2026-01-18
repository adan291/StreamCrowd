/**
 * English (EN) Navigation Translations
 * 
 * Navigation and menu translations for app navigation.
 * Loaded at startup for immediate UI display.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-2.1: Traducciones core cargadas al inicio
 */

import type { NavigationTranslations } from '../../types';

/**
 * Navigation English translations
 * Menu items, navigation elements, and app structure
 */
export const navigation: NavigationTranslations = {
  panel: 'Panel',
  poll: 'Poll',
  pollDescription: 'Create interactive polls for your audience',
  judge: 'Judge',
  judgeDescription: 'Live scoring panel',
  giveaway: 'Giveaways',
  giveawayDescription: 'Giveaways and raffles for your community',
  countdown: 'Countdown',
  countdownDescription: 'Countdown timer for events',
  spinner: 'Spinner',
  spinnerDescription: 'Wheel of fortune for random decisions',
  dynamics: 'Dynamics',
  dynamicsSelector: 'Dynamics selector',
  dynamicsDescription: 'Select an interactive activity for your stream',
  availableActivities: 'Available activities',
  backToSelector: 'Back',
  gallery: 'Gallery',
  data: 'Data',
  history: 'History',
  activity: 'Activity',
  analytics: 'Analytics',
  chat: 'Chat',
  stream: 'Stream',
  notConnected: 'Not connected',
  connectToChannel: 'Connect to a Twitch channel to view the stream.',
  invalidChannel: 'Invalid channel',
  invalidChannelName: 'The channel name is not valid.',
  twitchStream: 'Twitch Stream',
  loadStream: 'Load Stream',
  openInTwitch: 'Open in Twitch',
  copyLink: 'Copy link',
  closeStream: 'Close stream',
  sounds: 'Sounds',
  games: 'Games',
  platforms: 'Platforms',
  platformsSelector: 'Platform selector',
  platformsDescription: 'Select a platform to access its tools',
  availablePlatforms: 'Available platforms',
};

export default navigation;