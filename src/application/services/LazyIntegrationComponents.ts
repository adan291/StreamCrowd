/**
 * LazyIntegrationComponents - Lazy-loaded integration components
 * Implements Phase 3.3: Integration Components Migration
 */

import React, { ComponentType } from 'react';
import { lazyComponentManager } from './LazyComponentManager';

// Fallback components for critical integrations
const OBSFallback: ComponentType = () => {
  return React.createElement('div', { className: 'p-4 bg-yellow-50 border border-yellow-200 rounded-lg' },
    React.createElement('p', { className: 'text-yellow-800' }, 'OBS integration is loading...'),
    React.createElement('p', { className: 'text-sm text-yellow-600 mt-1' }, 
      'If this persists, check your connection and try refreshing.'
    )
  );
};

const TwitchFallback: ComponentType = () => {
  return React.createElement('div', { className: 'p-4 bg-purple-50 border border-purple-200 rounded-lg' },
    React.createElement('p', { className: 'text-purple-800' }, 'Twitch integration is loading...'),
    React.createElement('p', { className: 'text-sm text-purple-600 mt-1' }, 
      'Connecting to Twitch services...'
    )
  );
};

const WebhookFallback: ComponentType = () => {
  return React.createElement('div', { className: 'p-4 bg-blue-50 border border-blue-200 rounded-lg' },
    React.createElement('p', { className: 'text-blue-800' }, 'Webhook management is loading...')
  );
};

const PluginFallback: ComponentType = () => {
  return React.createElement('div', { className: 'p-4 bg-green-50 border border-green-200 rounded-lg' },
    React.createElement('p', { className: 'text-green-800' }, 'Plugin system is loading...')
  );
};

const MacroFallback: ComponentType = () => {
  return React.createElement('div', { className: 'p-4 bg-indigo-50 border border-indigo-200 rounded-lg' },
    React.createElement('p', { className: 'text-indigo-800' }, 'Macro system is loading...')
  );
};

const CollaborationFallback: ComponentType = () => {
  return React.createElement('div', { className: 'p-4 bg-cyan-50 border border-cyan-200 rounded-lg' },
    React.createElement('p', { className: 'text-cyan-800' }, 'Collaboration features are loading...')
  );
};

// Task 3.3.1: Convert OBS integration components to lazy loading
export const LazyOBSControlPanel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/OBSControlPanel').then(module => ({ default: module.OBSControlPanel })),
  {
    name: 'OBSControlPanel',
    priority: 'high',
    preload: true,
    fallbackComponent: OBSFallback
  }
);

export const LazyOBSAutoDiscovery = lazyComponentManager.createLazyComponent(
  () => import('../../../components/OBSAutoDiscovery').then(module => ({ default: module.OBSAutoDiscovery })),
  {
    name: 'OBSAutoDiscovery',
    priority: 'medium',
    fallbackComponent: OBSFallback
  }
);

export const LazyOBSConnectionWizard = lazyComponentManager.createLazyComponent(
  () => import('../../../components/OBSConnectionWizard').then(module => ({ default: module.OBSConnectionWizard })),
  {
    name: 'OBSConnectionWizard',
    priority: 'medium',
    fallbackComponent: OBSFallback
  }
);

export const LazyOBSDiagnosticTool = lazyComponentManager.createLazyComponent(
  () => import('../../../components/OBSDiagnosticTool').then(module => ({ default: module.OBSDiagnosticTool })),
  {
    name: 'OBSDiagnosticTool',
    priority: 'low',
    fallbackComponent: OBSFallback
  }
);

export const LazyOBSOverlayUrl = lazyComponentManager.createLazyComponent(
  () => import('../../../components/OBSOverlayUrl').then(module => ({ default: module.OBSOverlayUrl })),
  {
    name: 'OBSOverlayUrl',
    priority: 'medium',
    fallbackComponent: OBSFallback
  }
);

// Task 3.3.2: Convert Twitch integration components to lazy loading
export const LazyTwitchPollPanel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/TwitchPollPanel').then(module => ({ default: module.TwitchPollPanel })),
  {
    name: 'TwitchPollPanel',
    priority: 'high',
    preload: true,
    fallbackComponent: TwitchFallback
  }
);

export const LazyTwitchToolSelector = lazyComponentManager.createLazyComponent(
  () => import('../../../components/TwitchToolSelector').then(module => ({ default: module.TwitchToolSelector })),
  {
    name: 'TwitchToolSelector',
    priority: 'medium',
    fallbackComponent: TwitchFallback
  }
);

export const LazyPredictionPanel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/PredictionPanel').then(module => ({ default: module.PredictionPanel })),
  {
    name: 'PredictionPanel',
    priority: 'high',
    fallbackComponent: TwitchFallback
  }
);

export const LazyRewardsPanel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/RewardsPanel').then(module => ({ default: module.RewardsPanel })),
  {
    name: 'RewardsPanel',
    priority: 'high',
    fallbackComponent: TwitchFallback
  }
);

export const LazyRedemptionsList = lazyComponentManager.createLazyComponent(
  () => import('../../../components/RedemptionsList').then(module => ({ default: module.RedemptionsList })),
  {
    name: 'RedemptionsList',
    priority: 'medium',
    fallbackComponent: TwitchFallback
  }
);

// Task 3.3.3: Convert webhook management to lazy loading
export const LazyIncomingWebhookPanel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/webhooks/IncomingWebhookPanel').then(module => ({ default: module.IncomingWebhookPanel })),
  {
    name: 'IncomingWebhookPanel',
    priority: 'low',
    fallbackComponent: WebhookFallback
  }
);

export const LazyWebhookConfigPanel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/webhooks/WebhookConfigPanel').then(module => ({ default: module.WebhookConfigPanel })),
  {
    name: 'WebhookConfigPanel',
    priority: 'low',
    fallbackComponent: WebhookFallback
  }
);

export const LazyWebhookLogViewer = lazyComponentManager.createLazyComponent(
  () => import('../../../components/webhooks/WebhookLogViewer').then(module => ({ default: module.WebhookLogViewer })),
  {
    name: 'WebhookLogViewer',
    priority: 'low',
    fallbackComponent: WebhookFallback
  }
);

// Task 3.3.4: Convert plugin system components to lazy loading
export const LazyPluginManager = lazyComponentManager.createLazyComponent(
  () => import('../../../components/plugins/PluginManager').then(module => ({ default: module.PluginManager })),
  {
    name: 'PluginManager',
    priority: 'low',
    fallbackComponent: PluginFallback
  }
);

export const LazyPluginMarketplace = lazyComponentManager.createLazyComponent(
  () => import('../../../components/plugins/PluginMarketplace').then(module => ({ default: module.PluginMarketplace })),
  {
    name: 'PluginMarketplace',
    priority: 'low',
    fallbackComponent: PluginFallback
  }
);

export const LazyPluginConfigModal = lazyComponentManager.createLazyComponent(
  () => import('../../../components/plugins/PluginConfigModal').then(module => ({ default: module.PluginConfigModal })),
  {
    name: 'PluginConfigModal',
    priority: 'low',
    fallbackComponent: PluginFallback
  }
);

// Task 3.3.5: Convert macro system to lazy loading
export const LazyMacroManager = lazyComponentManager.createLazyComponent(
  () => import('../../../components/macros/MacroManager').then(module => ({ default: module.MacroManager })),
  {
    name: 'MacroManager',
    priority: 'medium',
    fallbackComponent: MacroFallback
  }
);

export const LazyMacroEditor = lazyComponentManager.createLazyComponent(
  () => import('../../../components/macros/MacroEditor').then(module => ({ default: module.MacroEditor })),
  {
    name: 'MacroEditor',
    priority: 'medium',
    fallbackComponent: MacroFallback
  }
);

export const LazyQuickCommands = lazyComponentManager.createLazyComponent(
  () => import('../../../components/macros/QuickCommands').then(module => ({ default: module.QuickCommands })),
  {
    name: 'QuickCommands',
    priority: 'high',
    preload: true,
    fallbackComponent: MacroFallback
  }
);

export const LazyMacroPresets = lazyComponentManager.createLazyComponent(
  () => import('../../../components/macros/MacroPresets').then(module => ({ default: module.MacroPresets })),
  {
    name: 'MacroPresets',
    priority: 'medium',
    fallbackComponent: MacroFallback
  }
);

// Task 3.3.6: Convert collaboration features to lazy loading
export const LazyCollaborationPanel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/collaboration/CollaborationPanel').then(module => ({ default: module.CollaborationPanel })),
  {
    name: 'CollaborationPanel',
    priority: 'high',
    preload: true,
    fallbackComponent: CollaborationFallback
  }
);

export const LazyCollaboratorsList = lazyComponentManager.createLazyComponent(
  () => import('../../../components/collaboration/CollaboratorsList').then(module => ({ default: module.CollaboratorsList })),
  {
    name: 'CollaboratorsList',
    priority: 'medium',
    fallbackComponent: CollaborationFallback
  }
);

export const LazyInviteModal = lazyComponentManager.createLazyComponent(
  () => import('../../../components/collaboration/InviteModal').then(module => ({ default: module.InviteModal })),
  {
    name: 'InviteModal',
    priority: 'medium',
    fallbackComponent: CollaborationFallback
  }
);

export const LazyJoinSessionModal = lazyComponentManager.createLazyComponent(
  () => import('../../../components/collaboration/JoinSessionModal').then(module => ({ default: module.JoinSessionModal })),
  {
    name: 'JoinSessionModal',
    priority: 'medium',
    fallbackComponent: CollaborationFallback
  }
);

export const LazyModeratorChat = lazyComponentManager.createLazyComponent(
  () => import('../../../components/collaboration/ModeratorChat').then(module => ({ default: module.ModeratorChat })),
  {
    name: 'ModeratorChat',
    priority: 'high',
    fallbackComponent: CollaborationFallback
  }
);

export const LazyRoleManager = lazyComponentManager.createLazyComponent(
  () => import('../../../components/collaboration/RoleManager').then(module => ({ default: module.RoleManager })),
  {
    name: 'RoleManager',
    priority: 'low',
    fallbackComponent: CollaborationFallback
  }
);

// Preloading strategy for high-priority components
export const preloadCriticalIntegrations = async (): Promise<void> => {
  const criticalComponents = [
    () => import('../../../components/OBSControlPanel').then(module => ({ default: module.OBSControlPanel })),
    () => import('../../../components/TwitchPollPanel').then(module => ({ default: module.TwitchPollPanel })),
    () => import('../../../components/PredictionPanel').then(module => ({ default: module.PredictionPanel })),
    () => import('../../../components/RewardsPanel').then(module => ({ default: module.RewardsPanel })),
    () => import('../../../components/macros/QuickCommands').then(module => ({ default: module.QuickCommands })),
    () => import('../../../components/collaboration/CollaborationPanel').then(module => ({ default: module.CollaborationPanel })),
  ];

  const preloadPromises = criticalComponents.map((importFn, index) => 
    lazyComponentManager.preloadComponent(importFn, `critical-${index}`)
  );

  try {
    await Promise.allSettled(preloadPromises);
    console.log('Critical integration components preloaded successfully');
  } catch (error) {
    console.warn('Some critical components failed to preload:', error);
  }
};

// Export all lazy components for easy importing
export const LazyIntegrations = {
  // OBS Components
  OBSControlPanel: LazyOBSControlPanel,
  OBSAutoDiscovery: LazyOBSAutoDiscovery,
  OBSConnectionWizard: LazyOBSConnectionWizard,
  OBSDiagnosticTool: LazyOBSDiagnosticTool,
  OBSOverlayUrl: LazyOBSOverlayUrl,

  // Twitch Components
  TwitchPollPanel: LazyTwitchPollPanel,
  TwitchToolSelector: LazyTwitchToolSelector,
  PredictionPanel: LazyPredictionPanel,
  RewardsPanel: LazyRewardsPanel,
  RedemptionsList: LazyRedemptionsList,

  // Webhook Components
  IncomingWebhookPanel: LazyIncomingWebhookPanel,
  WebhookConfigPanel: LazyWebhookConfigPanel,
  WebhookLogViewer: LazyWebhookLogViewer,

  // Plugin Components
  PluginManager: LazyPluginManager,
  PluginMarketplace: LazyPluginMarketplace,
  PluginConfigModal: LazyPluginConfigModal,

  // Macro Components
  MacroManager: LazyMacroManager,
  MacroEditor: LazyMacroEditor,
  QuickCommands: LazyQuickCommands,
  MacroPresets: LazyMacroPresets,

  // Collaboration Components
  CollaborationPanel: LazyCollaborationPanel,
  CollaboratorsList: LazyCollaboratorsList,
  InviteModal: LazyInviteModal,
  JoinSessionModal: LazyJoinSessionModal,
  ModeratorChat: LazyModeratorChat,
  RoleManager: LazyRoleManager,
};