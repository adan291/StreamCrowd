/**
 * Spanish (ES) Common Translations
 * 
 * Common translations used across the entire application.
 * These are loaded at startup and always available.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.1: Traducciones comunes cargadas al inicio (~20% del total)
 */

import type { CommonTranslations } from '../../types';

/**
 * Common Spanish translations
 * Includes: loading states, basic actions, UI labels
 */
export const common: CommonTranslations = {
  // Loading states
  loading: 'Cargando...',
  
  // Basic actions
  save: 'Guardar',
  cancel: 'Cancelar',
  delete: 'Eliminar',
  edit: 'Editar',
  close: 'Cerrar',
  confirm: 'Confirmar',
  search: 'Buscar',
  
  // Settings and preferences
  settings: 'Configuración',
  theme: 'Tema',
  language: 'Idioma',
  exit: 'Salir',
  
  // Chat (moved from misc for core component usage)
  chat: {
    liveChat: 'Chat en vivo',
    waitingMessages: 'Esperando mensajes...',
    newMessages: 'mensajes nuevos',
    alreadyRegistered: 'Ya registrado',
    votedFor: 'Votó por',
  },
};
