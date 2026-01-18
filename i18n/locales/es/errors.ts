/**
 * Spanish (ES) Error Translations
 * 
 * Error message translations for the entire application.
 * Loaded at startup for error handling.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.1: Traducciones comunes cargadas al inicio (~20% del total)
 */

import type { ErrorTranslations } from '../../types';

/**
 * Spanish error translations
 * Includes: general errors, error types, feature-specific errors,
 * recovery messages, retry messages, network errors, validation errors
 */
export const errors: ErrorTranslations = {
  // General error messages
  componentError: 'Error en {{feature}}',
  componentErrorDescription: 'Algo salió mal. Por favor, intenta de nuevo o contacta con soporte si el problema persiste.',
  retry: 'Reintentar',
  details: 'Detalles',
  copy: 'Copiar error',
  unknown: 'desconocido',

  // Error type messages
  types: {
    validation: 'Error de validación',
    validationDescription: 'Los datos ingresados no son válidos. Por favor, revisa los campos marcados.',
    authentication: 'Error de autenticación',
    authenticationDescription: 'Tu sesión ha expirado o no tienes permisos. Por favor, inicia sesión nuevamente.',
    network: 'Error de conexión',
    networkDescription: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
    unexpected: 'Error inesperado',
    unexpectedDescription: 'Ocurrió un error inesperado. Por favor, contacta con soporte si el problema persiste.',
  },

  // Error codes
  codes: {
    VALIDATION_ERROR: 'Error de validación',
    AUTH_ERROR: 'Error de autenticación',
    NETWORK_ERROR: 'Error de red',
    UNEXPECTED_ERROR: 'Error inesperado',
  },

  // Feature-specific errors
  features: {
    poll: 'Error en Encuesta',
    pollDescription: 'Ocurrió un error en la encuesta. Tus votos están seguros.',
    pollClearData: 'Limpiar datos',
    giveaway: 'Error en Sorteo',
    giveawayDescription: 'Ocurrió un error en el sorteo. Los participantes están seguros.',
    giveawayPreserveParticipants: 'Mantener participantes',
    giveawayParticipantsCount: '{{count}} participantes registrados',
    giveawayParticipantsSingular: '1 participante registrado',
    game: 'Error en Juego',
    gameDescription: 'Ocurrió un error en el juego. Puedes reiniciar o volver al selector.',
    gameBackToSelector: 'Volver a juegos',
    gameResetState: 'Reiniciar juego',
    overlay: 'Error en Overlay',
    overlayDescription: 'Ocurrió un error en el overlay. La aplicación principal sigue funcionando.',
  },

  // Recovery messages
  recovery: {
    tryAgain: 'Intenta de nuevo',
    contactSupport: 'Contacta con soporte si el problema persiste',
    refreshPage: 'Recarga la página',
    checkConnection: 'Verifica tu conexión a internet',
    loginAgain: 'Inicia sesión nuevamente',
  },

  // Retry messages
  retrying: {
    attempt: 'Intento {{current}} de {{max}}',
    maxAttemptsReached: 'Se alcanzó el máximo de intentos',
    retryingIn: 'Reintentando en {{seconds}} segundos...',
  },

  // Network specific errors
  network: {
    connectionLost: 'Se perdió la conexión',
    timeout: 'La solicitud tardó demasiado',
    serverError: 'Error del servidor',
    notFound: 'Recurso no encontrado',
    unauthorized: 'No autorizado',
    forbidden: 'Acceso denegado',
    rateLimited: 'Demasiadas solicitudes. Espera un momento.',
  },

  // Validation specific errors
  validation: {
    required: 'Este campo es requerido',
    invalidFormat: 'Formato inválido',
    tooShort: 'Demasiado corto',
    tooLong: 'Demasiado largo',
    invalidValue: 'Valor inválido',
  },

  // No stack trace message
  noStackTrace: 'Sin traza de error disponible',
};
