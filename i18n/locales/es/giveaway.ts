/**
 * Spanish translations for Giveaway/Raffle feature
 * 
 * Contains all translations related to giveaways, raffles, and random winner functionality.
 * Includes: participant management, winner selection, keyword-based raffles,
 * subscriber-only giveaways, and various raffle presets.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 */

import type { GiveawayTranslations } from '../../types';

export const giveaway: GiveawayTranslations = {
  // Basic giveaway UI
  title: 'Random Winner',
  subtitle: 'Selecciona un ganador aleatorio del chat',
  openOverlay: 'Abrir Overlay para OBS',
  
  // Participant sources
  viewers: 'Viewers',
  keyword: 'Palabra Clave',
  subsOnly: 'Solo Suscriptores',
  
  // Form labels and inputs
  keywordLabel: 'Palabra Clave',
  keywordPlaceholder: 'Ej: participar, sorteo, yo...',
  timeLimit: 'Tiempo límite (segundos)',
  
  // Participant display
  availableParticipants: 'Participantes disponibles',
  subsInChat: 'suscriptores en el chat',
  usersInChat: 'usuarios en el chat',
  
  // Status and results
  time: 'Tiempo',
  participants: 'Participantes',
  winner: '¡GANADOR!',
  
  // Actions
  selectWinner: 'Seleccionar Ganador',
  selecting: 'Seleccionando...',
  chooseWinner: 'Elegir Ganador',
  startCollection: 'Iniciar Recolección',
  finishAndChoose: 'Terminar y Elegir',
  newRaffle: 'Nuevo Sorteo',
  resetRaffle: 'Reiniciar sorteo',
  clearAll: 'Limpiar Todo (Resetear Participantes)',
  clearAllHint: 'Resetea participantes y configuración',
  
  // Help text
  viewersHint: 'Selecciona un ganador de los usuarios que han escrito en el chat',
  keywordHint: 'Los usuarios deben escribir la palabra clave para participar',
  waitingRaffle: 'Esperando sorteo...',
  
  // Tooltips
  subsOnlyTooltip: 'Solo usuarios suscritos al canal pueden participar en el sorteo',
  useTimerTooltip: 'Limita el tiempo de participación. Sin timer, el sorteo permanece abierto indefinidamente',
  keywordTooltip: 'Los usuarios deben escribir esta palabra en el chat para participar',
  timeLimitTooltip: 'Duración en segundos del período de participación',
  
  // Error messages
  errors: {
    noValidParticipants: 'No hay participantes válidos (todos están en la lista de prohibidos)',
    userAlreadyParticipating: 'Este usuario ya está participando',
    userAlreadyInChat: 'Este usuario ya está en el chat',
    usersAddedToBlacklist: '{count} usuarios añadidos a la lista de prohibidos',
    participantsAdded: 'Añadidos: {added}{duplicates}',
    needOAuthChatters: 'Necesitas conectarte con OAuth y el permiso moderator:read:chatters',
    needOAuthConnection: 'Necesitas estar conectado con un token OAuth',
    couldNotGetChannelId: 'No se pudo obtener el ID del canal',
    tokenMissingChattersScope: 'Token sin permiso. Genera uno nuevo con scope: moderator:read:chatters',
    errorLoadingChatters: 'Error al cargar chatters',
    needOAuthSubscribers: 'Necesitas conectarte con OAuth y el permiso channel:read:subscriptions',
    tokenMissingSubsScope: 'Token sin permiso. Genera uno nuevo con scope: channel:read:subscriptions',
    errorLoadingSubscribers: 'Error al cargar suscriptores',
    incompatibleFileVersion: 'Versión de archivo no compatible',
  },
  
  // Presets
  presets: {
    quick: 'Sorteo Rápido',
    quickDescription: 'Viewers del chat, sin timer',
    keyword: 'Sorteo por Keyword',
    keywordDescription: 'Palabra clave, 60 segundos',
    subs: 'Sorteo de Subs',
    subsDescription: 'Solo suscriptores',
  },
};