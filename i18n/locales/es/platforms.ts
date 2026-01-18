/**
 * Spanish translations for Platforms feature
 * 
 * Contains all translations related to streaming platforms (Twitch, YouTube, Kick),
 * platform connections, authentication, and platform-specific tools.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 */

import type { PlatformsTranslations } from '../../types';

export const platforms: PlatformsTranslations = {
  // General platform management
  comingSoon: 'Próximamente',
  back: 'Volver',
  backToPlatforms: 'Volver a plataformas',
  availableTools: 'Herramientas disponibles',
  connected: 'Conectado',
  connecting: 'Conectando...',
  disconnected: 'Desconectado',
  error: 'Error de conexión',
  platformConnected: '1 plataforma conectada',
  platformsConnected: '{count} plataformas conectadas',
  platformsDescriptionMulti: 'Conecta múltiples plataformas de streaming',
  selectPlatforms: 'Seleccionar plataformas',
  
  // Broadcaster Authentication
  broadcasterAuthorized: 'Autorizado',
  broadcasterNotAuthorized: 'Streamer no autorizado',
  authorizeApp: 'Autorizar app',
  streamerAuthorized: '{name} autorizado',
  
  // Twitch Platform
  twitchTitle: 'Twitch',
  twitchDescription: 'Comandos, predicciones y más',
  twitchToolsDescription: 'Herramientas y funcionalidades de Twitch',
  backToTwitchTools: 'Volver a herramientas de Twitch',
  
  // YouTube Platform
  youtubeTitle: 'YouTube',
  youtubeDescription: 'Chat en vivo y encuestas',
  youtubeToolsDescription: 'Herramientas y funcionalidades de YouTube',
  backToYoutubeTools: 'Volver a herramientas de YouTube',
  youtubeConnect: 'Conectar con YouTube',
  youtubeDisconnect: 'Desconectar YouTube',
  youtubeLiveChat: 'Chat en vivo',
  youtubePolls: 'Encuestas de YouTube',
  
  // Kick Platform
  kickTitle: 'Kick',
  kickDescription: 'Chat en tiempo real',
  kickToolsDescription: 'Herramientas y funcionalidades de Kick',
  backToKickTools: 'Volver a herramientas de Kick',
  kickConnect: 'Conectar con Kick',
  kickDisconnect: 'Desconectar Kick',
  kickLiveChat: 'Chat en vivo',
  
  // Platform Tools
  commands: 'Comandos',
  commandsDescription: 'Comandos personalizados de chat',
  predictions: 'Predicciones',
  predictionsDescription: 'Predicciones de Twitch',
  channelPoints: 'Channel Points',
  channelPointsDescription: 'Recompensas de puntos',
};

export default platforms;