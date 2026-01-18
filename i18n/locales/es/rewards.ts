/**
 * Spanish translations for Channel Points/Rewards feature
 * 
 * Contains all translations related to Twitch Channel Points rewards functionality.
 * Includes: reward creation, management, redemptions, status handling, and error messages.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 */

import type { RewardsTranslations } from '../../types';

export const rewards: RewardsTranslations = {
  // Main titles
  title: 'Channel Points',
  createTitle: 'Crear Recompensa',
  editTitle: 'Editar Recompensa',
  redemptionsTitle: 'Redenciones',
  
  // Form fields
  rewardTitle: 'Título',
  rewardTitlePlaceholder: 'Nombre de la recompensa',
  cost: 'Costo',
  costPlaceholder: '100',
  description: 'Descripción',
  descriptionPlaceholder: 'Descripción de la recompensa...',
  backgroundColor: 'Color de fondo',
  
  // Limits configuration
  maxPerStream: 'Máximo por stream',
  maxPerStreamEnabled: 'Limitar por stream',
  maxPerUser: 'Máximo por usuario',
  maxPerUserEnabled: 'Limitar por usuario',
  globalCooldown: 'Cooldown global',
  globalCooldownEnabled: 'Activar cooldown',
  cooldownSeconds: 'segundos',
  
  // Reward options
  userInputRequired: 'Requiere texto del usuario',
  skipQueue: 'Saltar cola de aprobación',
  enabled: 'Habilitada',
  paused: 'Pausada',
  
  // Action buttons
  create: 'Crear Recompensa',
  update: 'Actualizar',
  delete: 'Eliminar',
  enable: 'Habilitar',
  disable: 'Deshabilitar',
  
  // Loading states
  creating: 'Creando...',
  updating: 'Actualizando...',
  deleting: 'Eliminando...',
  
  // Redemptions section
  redemptions: 'Redenciones',
  pendingRedemptions: 'Redenciones pendientes',
  noRedemptions: 'No hay redenciones pendientes',
  fulfill: 'Completar',
  reject: 'Rechazar',
  fulfilling: 'Completando...',
  rejecting: 'Rechazando...',
  filterByReward: 'Filtrar por recompensa',
  allRewards: 'Todas las recompensas',
  redeemedBy: 'Canjeado por',
  redeemedAt: 'Canjeado el',
  userInput: 'Mensaje del usuario',
  
  // Redemption status
  statusUnfulfilled: 'Pendiente',
  statusFulfilled: 'Completada',
  statusCanceled: 'Rechazada',
  
  // User messages
  noRewards: 'No hay recompensas configuradas',
  createHint: 'Crea recompensas personalizadas para tu canal',
  scopeRequired: 'Permisos requeridos',
  scopeRequiredDesc: 'Necesitas reconectar tu cuenta con permisos de Channel Points',
  
  // Success messages
  rewardCreated: 'Recompensa creada',
  rewardUpdated: 'Recompensa actualizada',
  rewardDeleted: 'Recompensa eliminada',
  rewardEnabled: 'Recompensa habilitada',
  rewardDisabled: 'Recompensa deshabilitada',
  redemptionFulfilled: 'Redención completada',
  redemptionRejected: 'Redención rechazada',
  
  // Error messages
  errorCreating: 'Error al crear recompensa',
  errorUpdating: 'Error al actualizar recompensa',
  errorDeleting: 'Error al eliminar recompensa',
  errorLoading: 'Error al cargar recompensas',
  errorFulfilling: 'Error al completar redención',
  errorRejecting: 'Error al rechazar redención',
  
  // Validation messages
  titleRequired: 'El título es requerido',
  costRequired: 'El costo es requerido',
  costMin: 'El costo mínimo es 1',
};