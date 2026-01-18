/**
 * English (EN) Giveaway Translations
 * 
 * Giveaway/raffle translations for community engagement.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { GiveawayTranslations } from '../../types';

/**
 * Giveaway English translations
 * Giveaways, raffles, and random winner selection
 */
export const giveaway: GiveawayTranslations = {
  title: 'Giveaways',
  subtitle: 'Raffles and giveaways for your community',
  openOverlay: 'Open Overlay',
  viewers: 'Viewers',
  keyword: 'Keyword',
  subsOnly: 'Subs Only',
  keywordLabel: 'Keyword',
  keywordPlaceholder: 'Enter keyword...',
  timeLimit: 'Time Limit',
  availableParticipants: 'Available Participants',
  subsInChat: 'Subs in chat',
  usersInChat: 'Users in chat',
  time: 'Time',
  participants: 'Participants',
  winner: 'Winner',
  selectWinner: 'Select Winner',
  selecting: 'Selecting',
  chooseWinner: 'Choose Winner',
  startCollection: 'Start Collection',
  finishAndChoose: 'Finish and Choose',
  newRaffle: 'New Raffle',
  resetRaffle: 'Reset Raffle',
  clearAll: 'Clear All',
  clearAllHint: 'Remove all participants',
  viewersHint: 'Add viewers from chat',
  keywordHint: 'Users type keyword to participate',
  waitingRaffle: 'Waiting for raffle...',
  
  // Tooltips
  subsOnlyTooltip: 'Only subscribers can participate',
  useTimerTooltip: 'Set a time limit for participation',
  keywordTooltip: 'Keyword users must type to enter',
  timeLimitTooltip: 'How long users have to participate',
  
  // Error messages
  errors: {
    noValidParticipants: 'No valid participants found',
    userAlreadyParticipating: 'User is already participating',
    userAlreadyInChat: 'User is already in chat list',
    usersAddedToBlacklist: 'Users added to blacklist',
    participantsAdded: 'Participants added',
    needOAuthChatters: 'OAuth connection needed to load chatters',
    needOAuthConnection: 'OAuth connection required',
    couldNotGetChannelId: 'Could not get channel ID',
    tokenMissingChattersScope: 'Token missing chatters scope',
    errorLoadingChatters: 'Error loading chatters',
    needOAuthSubscribers: 'OAuth connection needed to load subscribers',
    tokenMissingSubsScope: 'Token missing subscribers scope',
    errorLoadingSubscribers: 'Error loading subscribers',
    incompatibleFileVersion: 'Incompatible file version',
  },
  
  // Presets
  presets: {
    quick: 'Quick Raffle',
    quickDescription: 'Simple raffle with current viewers',
    keyword: 'Keyword Raffle',
    keywordDescription: 'Users type keyword to participate',
    subs: 'Subscribers Only',
    subsDescription: 'Only subscribers can participate',
  },
};

export default giveaway;