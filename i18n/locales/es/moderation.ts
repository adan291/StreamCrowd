/**
 * Spanish (ES) Moderation Translations
 * 
 * Moderation system translations including vote moderation, chat filters,
 * user management, and moderation tools.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-4.1: Módulos de features cargados bajo demanda
 */

import type { ModerationTranslations } from '../../types';

/**
 * Spanish moderation translations
 * Includes: vote moderation, user filtering, account restrictions,
 * whitelist/blacklist management, moderation presets, and rejection reasons
 */
export const moderation: ModerationTranslations = {
  title: 'Moderación de Votos',
  config: 'Configuración',
  stats: 'Estadísticas',
  log: 'Registro',
  accepted: 'Aceptados',
  rejected: 'Rechazados',
  voteChanged: 'Cambios de voto',
  acceptanceRate: 'Tasa de aceptación',
  reset: 'Restablecer',
  
  // Account restrictions
  minAccountAge: 'Edad Mín. Cuenta (días)',
  minAccountAgeTooltip: 'Cuentas más nuevas serán rechazadas. Pon 0 para permitir todas.',
  
  // Vote change settings
  allowVoteChanges: 'Permitir Cambio de Voto',
  allowVoteChangesTooltip: 'Si está desactivado, los usuarios no pueden cambiar su voto.',
  
  // Status
  enabled: 'Activado',
  disabled: 'Desactivado',
  
  // Cooldown settings
  cooldown: 'Cooldown (segundos)',
  cooldownTooltip: 'Tiempo que deben esperar para cambiar su voto.',
  
  // Vote weights
  voteWeights: 'Pesos de Voto (1-5)',
  voteWeightsTooltip: 'Mayor peso da más poder de voto a suscriptores/seguidores.',
  subscriber: 'Suscriptor',
  follower: 'Seguidor',
  regularUsers: 'Usuarios regulares siempre tienen peso 1x',
  
  // Presets management
  presets: 'Presets',
  presetName: 'Nombre del preset...',
  loadPreset: 'Cargar Preset',
  noPresets: 'No hay presets guardados',
  presetSaved: 'Preset "{name}" guardado',
  presetLoaded: 'Preset "{name}" cargado',
  presetDeleted: 'Preset "{name}" eliminado',
  enterPresetName: 'Ingresa un nombre para el preset',
  resetDefaults: 'Configuración restablecida',
  
  // Whitelist management
  whitelist: 'Lista de Votantes Permitidos',
  whitelistTooltip: 'Solo estos usuarios podrán votar. Un nombre por línea.',
  whitelistEnabled: 'Activar lista permitidos',
  whitelistPlaceholder: 'usuario1\nusuario2\nusuario3',
  whitelistCount: '{count} usuarios',
  
  // Blacklist management
  blacklist: 'Lista de Votantes Exclusiones',
  blacklistTooltip: 'Estos usuarios NO podrán votar. Un nombre por línea.',
  blacklistEnabled: 'Activar lista exclusiones',
  blacklistPlaceholder: 'troll1\nspammer2\nbot3',
  blacklistCount: '{count} bloqueados',
  
  // Rejection reasons
  reasons: {
    accountTooNew: 'Cuenta muy nueva',
    cooldownActive: 'Cooldown activo',
    alreadyVoted: 'Ya votó',
    invalidOption: 'Opción inválida',
    voteChangeCooldown: 'Cooldown de cambio',
    notWhitelisted: 'No en lista blanca',
    blacklisted: 'Usuario bloqueado',
  },
};

export default moderation;