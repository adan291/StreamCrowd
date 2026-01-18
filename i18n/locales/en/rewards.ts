/**
 * English (EN) Rewards Translations
 * 
 * Channel Points/Rewards translations for Twitch integration.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { RewardsTranslations } from '../../types';

/**
 * Rewards English translations
 * Twitch Channel Points and custom rewards management
 */
export const rewards: RewardsTranslations = {
  title: 'Channel Points',
  createTitle: 'Create Reward',
  editTitle: 'Edit Reward',
  redemptionsTitle: 'Redemptions',
  
  // Form
  rewardTitle: 'Title',
  rewardTitlePlaceholder: 'Reward name',
  cost: 'Cost',
  costPlaceholder: '100',
  description: 'Description',
  descriptionPlaceholder: 'Reward description...',
  backgroundColor: 'Background color',
  
  // Limits
  maxPerStream: 'Max per stream',
  maxPerStreamEnabled: 'Limit per stream',
  maxPerUser: 'Max per user',
  maxPerUserEnabled: 'Limit per user',
  globalCooldown: 'Global cooldown',
  globalCooldownEnabled: 'Enable cooldown',
  cooldownSeconds: 'seconds',
  
  // Options
  userInputRequired: 'Require user input',
  skipQueue: 'Skip approval queue',
  enabled: 'Enabled',
  paused: 'Paused',
  
  // Actions
  create: 'Create Reward',
  update: 'Update',
  delete: 'Delete',
  enable: 'Enable',
  disable: 'Disable',
  creating: 'Creating...',
  updating: 'Updating...',
  deleting: 'Deleting...',
  
  // Redemptions
  redemptions: 'Redemptions',
  pendingRedemptions: 'Pending redemptions',
  noRedemptions: 'No pending redemptions',
  fulfill: 'Fulfill',
  reject: 'Reject',
  fulfilling: 'Fulfilling...',
  rejecting: 'Rejecting...',
  filterByReward: 'Filter by reward',
  allRewards: 'All rewards',
  redeemedBy: 'Redeemed by',
  redeemedAt: 'Redeemed at',
  userInput: 'User message',
  
  // Status
  statusUnfulfilled: 'Pending',
  statusFulfilled: 'Fulfilled',
  statusCanceled: 'Rejected',
  
  // Messages
  noRewards: 'No rewards configured',
  createHint: 'Create custom rewards for your channel',
  scopeRequired: 'Permissions required',
  scopeRequiredDesc: 'You need to reconnect your account with Channel Points permissions',
  rewardCreated: 'Reward created',
  rewardUpdated: 'Reward updated',
  rewardDeleted: 'Reward deleted',
  rewardEnabled: 'Reward enabled',
  rewardDisabled: 'Reward disabled',
  redemptionFulfilled: 'Redemption fulfilled',
  redemptionRejected: 'Redemption rejected',
  
  // Errors
  errorCreating: 'Error creating reward',
  errorUpdating: 'Error updating reward',
  errorDeleting: 'Error deleting reward',
  errorLoading: 'Error loading rewards',
  errorFulfilling: 'Error fulfilling redemption',
  errorRejecting: 'Error rejecting redemption',
  
  // Validation
  titleRequired: 'Title is required',
  costRequired: 'Cost is required',
  costMin: 'Minimum cost is 1',
};

export default rewards;