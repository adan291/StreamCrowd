/**
 * English (EN) Predictions Translations
 * 
 * Twitch Predictions translations for interactive predictions.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { PredictionsTranslations } from '../../types';

/**
 * Predictions English translations
 * Twitch Predictions API integration
 */
export const predictions: PredictionsTranslations = {
  title: 'Predictions',
  createTitle: 'Create Prediction',
  activeTitle: 'Active Prediction',
  historyTitle: 'Prediction History',
  
  // Form
  predictionTitle: 'Title',
  predictionTitlePlaceholder: 'Who will win?',
  outcomes: 'Outcomes',
  outcomePlaceholder: 'Outcome',
  addOutcome: 'Add outcome',
  removeOutcome: 'Remove outcome',
  duration: 'Duration',
  durationSeconds: 'seconds',
  minOutcomes: 'Minimum 2 outcomes',
  maxOutcomes: 'Maximum 10 outcomes',
  
  // Actions
  create: 'Create Prediction',
  lock: 'Lock',
  resolve: 'Resolve',
  cancel: 'Cancel',
  creating: 'Creating...',
  locking: 'Locking...',
  resolving: 'Resolving...',
  canceling: 'Canceling...',
  
  // Status
  statusActive: 'Active',
  statusLocked: 'Locked',
  statusResolved: 'Resolved',
  statusCanceled: 'Canceled',
  
  // Display
  voters: 'voters',
  points: 'points',
  totalPoints: 'Total points',
  totalVoters: 'Total voters',
  topPredictors: 'Top Predictors',
  selectWinner: 'Select winner',
  winningOutcome: 'Winning outcome',
  
  // History
  noHistory: 'No previous predictions',
  viewDetails: 'View details',
  participants: 'participants',
  
  // Messages
  noPrediction: 'No active prediction',
  createHint: 'Create a prediction to engage your audience',
  partnerRequired: 'Partner/Affiliate required',
  partnerRequiredDesc: 'Predictions are only available for Twitch Partners and Affiliates',
  scopeRequired: 'Permissions required',
  scopeRequiredDesc: 'You need to reconnect your account with prediction permissions',
  predictionCreated: 'Prediction created',
  predictionLocked: 'Prediction locked',
  predictionResolved: 'Prediction resolved',
  predictionCanceled: 'Prediction canceled',
  
  // Errors
  errorCreating: 'Error creating prediction',
  errorLocking: 'Error locking prediction',
  errorResolving: 'Error resolving prediction',
  errorCanceling: 'Error canceling prediction',
  errorLoading: 'Error loading predictions',
  
  // Validation
  titleRequired: 'Title is required',
  outcomesRequired: 'At least 2 outcomes are required',
  durationRange: 'Duration must be between 30 and 1800 seconds',
  uniqueOutcomes: 'Outcomes must be unique',
  
  // Broadcaster Auth
  broadcasterAuthRequired: 'Broadcaster authorization required',
  broadcasterAuthRequiredDesc: 'To create predictions, the broadcaster must authorize the app first',
  broadcasterAuthSuccess: 'Broadcaster has authorized the app',
  moderatorCanCreate: 'You can create predictions in this channel',
  moderatorCannotCreate: 'Ask the broadcaster to authorize the app to create predictions',
};

export default predictions;