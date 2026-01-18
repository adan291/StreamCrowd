/**
 * English (EN) Error Translations
 * 
 * Error message translations for comprehensive error handling.
 * Loaded at startup for immediate error display.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-2.1: Traducciones core cargadas al inicio
 */

import type { ErrorTranslations } from '../../types';

/**
 * Error English translations
 * Comprehensive error messages for all error scenarios
 */
export const errors: ErrorTranslations = {
  // General error messages
  componentError: 'Error in {{feature}}',
  componentErrorDescription: 'Something went wrong. Please try again or contact support if the problem persists.',
  retry: 'Retry',
  details: 'Details',
  copy: 'Copy error',
  unknown: 'unknown',
  
  // Error type messages
  types: {
    validation: 'Validation Error',
    validationDescription: 'The entered data is not valid. Please check the marked fields.',
    authentication: 'Authentication Error',
    authenticationDescription: 'Your session has expired or you don\'t have permissions. Please log in again.',
    network: 'Connection Error',
    networkDescription: 'Could not connect to the server. Check your internet connection.',
    unexpected: 'Unexpected Error',
    unexpectedDescription: 'An unexpected error occurred. Please contact support if the problem persists.',
  },
  
  // Error codes
  codes: {
    VALIDATION_ERROR: 'Validation Error',
    AUTH_ERROR: 'Authentication Error',
    NETWORK_ERROR: 'Network Error',
    UNEXPECTED_ERROR: 'Unexpected Error',
  },
  
  // Feature-specific errors
  features: {
    poll: 'Poll Error',
    pollDescription: 'An error occurred in the poll. Your votes are safe.',
    pollClearData: 'Clear data',
    giveaway: 'Giveaway Error',
    giveawayDescription: 'An error occurred in the giveaway. Participants are safe.',
    giveawayPreserveParticipants: 'Keep participants',
    giveawayParticipantsCount: '{{count}} participants registered',
    giveawayParticipantsSingular: '1 participant registered',
    game: 'Game Error',
    gameDescription: 'An error occurred in the game. You can restart or go back to the selector.',
    gameBackToSelector: 'Back to games',
    gameResetState: 'Reset game',
    overlay: 'Overlay Error',
    overlayDescription: 'An error occurred in the overlay. The main application continues working.',
  },
  
  // Recovery messages
  recovery: {
    tryAgain: 'Try again',
    contactSupport: 'Contact support if the problem persists',
    refreshPage: 'Refresh the page',
    checkConnection: 'Check your internet connection',
    loginAgain: 'Log in again',
  },
  
  // Retry messages
  retrying: {
    attempt: 'Attempt {{current}} of {{max}}',
    maxAttemptsReached: 'Maximum attempts reached',
    retryingIn: 'Retrying in {{seconds}} seconds...',
  },
  
  // Network specific
  network: {
    connectionLost: 'Connection lost',
    timeout: 'Request timed out',
    serverError: 'Server error',
    notFound: 'Resource not found',
    unauthorized: 'Unauthorized',
    forbidden: 'Access denied',
    rateLimited: 'Too many requests. Please wait a moment.',
  },
  
  // Validation specific
  validation: {
    required: 'This field is required',
    invalidFormat: 'Invalid format',
    tooShort: 'Too short',
    tooLong: 'Too long',
    invalidValue: 'Invalid value',
  },
  
  // No stack trace message
  noStackTrace: 'No stack trace available',
};

export default errors;