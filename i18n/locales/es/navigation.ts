/**
 * Spanish (ES) Navigation Translations
 * 
 * Navigation and menu translations for the application.
 * Loaded at startup for app navigation.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.1: Traducciones comunes cargadas al inicio (~20% del total)
 */

import type { NavigationTranslations } from '../../types';

/**
 * Spanish navigation translations
 * Includes: panel names, descriptions, navigation actions,
 * stream-related, section names
 */
export const navigation: NavigationTranslations = {
  // Panel names
  panel: 'Panel',
  poll: 'Encuesta',
  pollDescription: 'Crea votaciones interactivas para tu audiencia',
  judge: 'Jurado',
  judgeDescription: 'Panel de puntuación en vivo',
  giveaway: 'Sorteos',
  giveawayDescription: 'Sorteos y giveaways para tu comunidad',
  countdown: 'Countdown',
  countdownDescription: 'Temporizador con cuenta atrás para eventos',
  spinner: 'Ruleta',
  spinnerDescription: 'Ruleta de la fortuna para decisiones aleatorias',
  
  // Dynamics
  dynamics: 'Dinámicas',
  dynamicsSelector: 'Selector de dinámicas',
  dynamicsDescription: 'Selecciona una actividad interactiva para tu stream',
  availableActivities: 'Actividades disponibles',
  
  // Navigation actions
  backToSelector: 'Volver',
  
  // Section names
  gallery: 'Galería',
  data: 'Data',
  history: 'Historial',
  activity: 'Actividad',
  analytics: 'Analytics',
  chat: 'Chat',
  stream: 'Stream',
  sounds: 'Sonidos',
  games: 'Juegos',
  
  // Stream-related
  notConnected: 'No conectado',
  connectToChannel: 'Conéctate a un canal de Twitch para ver el stream.',
  invalidChannel: 'Canal inválido',
  invalidChannelName: 'El nombre del canal no es válido.',
  twitchStream: 'Stream de Twitch',
  loadStream: 'Cargar Stream',
  openInTwitch: 'Abrir en Twitch',
  copyLink: 'Copiar enlace',
  closeStream: 'Cerrar stream',
  
  // Platforms
  platforms: 'Plataformas',
  platformsSelector: 'Selector de plataformas',
  platformsDescription: 'Selecciona una plataforma para acceder a sus herramientas',
  availablePlatforms: 'Plataformas disponibles',
};
