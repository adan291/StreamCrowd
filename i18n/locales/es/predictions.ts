/**
 * Spanish translations for Predictions feature (Twitch Predictions)
 * 
 * Contains all translations related to Twitch predictions functionality.
 * Includes: prediction creation, outcomes, betting, results, status management,
 * broadcaster authorization, and error handling.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 */

import type { PredictionsTranslations } from '../../types';

export const predictions: PredictionsTranslations = {
  // Main titles
  title: 'Predicciones',
  createTitle: 'Crear Predicción',
  activeTitle: 'Predicción Activa',
  historyTitle: 'Historial de Predicciones',
  
  // Form fields
  predictionTitle: 'Título',
  predictionTitlePlaceholder: '¿Quién ganará?',
  outcomes: 'Opciones',
  outcomePlaceholder: 'Opción',
  addOutcome: 'Añadir opción',
  removeOutcome: 'Eliminar opción',
  duration: 'Duración',
  durationSeconds: 'segundos',
  minOutcomes: 'Mínimo 2 opciones',
  maxOutcomes: 'Máximo 10 opciones',
  
  // Action buttons
  create: 'Crear Predicción',
  lock: 'Bloquear',
  resolve: 'Resolver',
  cancel: 'Cancelar',
  
  // Loading states
  creating: 'Creando...',
  locking: 'Bloqueando...',
  resolving: 'Resolviendo...',
  canceling: 'Cancelando...',
  
  // Prediction status
  statusActive: 'Activa',
  statusLocked: 'Bloqueada',
  statusResolved: 'Resuelta',
  statusCanceled: 'Cancelada',
  
  // Display information
  voters: 'votantes',
  points: 'puntos',
  totalPoints: 'Puntos totales',
  totalVoters: 'Votantes totales',
  topPredictors: 'Top Predictores',
  selectWinner: 'Seleccionar ganador',
  winningOutcome: 'Opción ganadora',
  
  // History section
  noHistory: 'No hay predicciones anteriores',
  viewDetails: 'Ver detalles',
  participants: 'participantes',
  
  // User messages
  noPrediction: 'No hay predicción activa',
  createHint: 'Crea una predicción para involucrar a tu audiencia',
  partnerRequired: 'Partner/Affiliate requerido',
  partnerRequiredDesc: 'Las predicciones solo están disponibles para Partners y Affiliates de Twitch',
  scopeRequired: 'Permisos requeridos',
  scopeRequiredDesc: 'Necesitas reconectar tu cuenta con permisos de predicciones',
  
  // Success messages
  predictionCreated: 'Predicción creada',
  predictionLocked: 'Predicción bloqueada',
  predictionResolved: 'Predicción resuelta',
  predictionCanceled: 'Predicción cancelada',
  
  // Error messages
  errorCreating: 'Error al crear predicción',
  errorLocking: 'Error al bloquear predicción',
  errorResolving: 'Error al resolver predicción',
  errorCanceling: 'Error al cancelar predicción',
  errorLoading: 'Error al cargar predicciones',
  
  // Validation messages
  titleRequired: 'El título es requerido',
  outcomesRequired: 'Se requieren al menos 2 opciones',
  durationRange: 'La duración debe ser entre 30 y 1800 segundos',
  uniqueOutcomes: 'Las opciones deben ser únicas',
  
  // Broadcaster authorization (for moderators)
  broadcasterAuthRequired: 'Autorización del streamer requerida',
  broadcasterAuthRequiredDesc: 'Para crear predicciones, el streamer debe autorizar la app primero',
  broadcasterAuthSuccess: 'El streamer ha autorizado la app',
  moderatorCanCreate: 'Puedes crear predicciones en este canal',
  moderatorCannotCreate: 'Pídele al streamer que autorice la app para crear predicciones',
};