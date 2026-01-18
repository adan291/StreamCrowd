/**
 * English (EN) Common Translations
 * 
 * Common translations used across the entire application.
 * These are loaded at startup and always available.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-2.1: Traducciones core cargadas al inicio
 */

import type { CommonTranslations } from '../../types';

/**
 * Common English translations
 * Essential UI elements and actions used throughout the app
 */
export const common: CommonTranslations = {
  loading: 'Loading...',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  close: 'Close',
  confirm: 'Confirm',
  search: 'Search',
  settings: 'Settings',
  theme: 'Theme',
  language: 'Language',
  exit: 'Exit',
  
  // Chat (moved from misc for core component usage)
  chat: {
    liveChat: 'Live chat',
    waitingMessages: 'Waiting for messages...',
    newMessages: 'new messages',
    alreadyRegistered: 'Already registered',
    votedFor: 'Voted for',
  },
};

export default common;