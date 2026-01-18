/**
 * LazyOverlayComponents - Lazy-loaded overlay components
 * Implements Phase 3.5: Overlay Components Migration
 * Critical for OBS performance optimization
 */

import React, { ComponentType } from 'react';
import { lazyComponentManager } from './LazyComponentManager';

// Fallback component for overlays (minimal design for OBS)
const OverlayFallback: ComponentType = () => {
  return React.createElement('div', { 
    className: 'flex items-center justify-center min-h-screen bg-transparent',
    style: { fontFamily: 'system-ui, sans-serif' }
  },
    React.createElement('div', { 
      className: 'bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm',
      style: { backdropFilter: 'blur(4px)' }
    }, 'Loading overlay...')
  );
};

// Task 3.5.1: Core Interactive Overlays
export const LazyPollOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/PollOverlay').then(module => ({ default: module.PollOverlay })),
  {
    name: 'PollOverlay',
    priority: 'high',
    preload: true,
    fallbackComponent: OverlayFallback
  }
);

export const LazyRandomWinnerOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/RandomWinnerOverlay').then(module => ({ default: module.RandomWinnerOverlay })),
  {
    name: 'RandomWinnerOverlay',
    priority: 'high',
    preload: true,
    fallbackComponent: OverlayFallback
  }
);

export const LazySpinnerWheel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/SpinnerWheel').then(module => ({ default: module.SpinnerWheel })),
  {
    name: 'SpinnerWheel',
    priority: 'high',
    fallbackComponent: OverlayFallback
  }
);

export const LazyCountdown = lazyComponentManager.createLazyComponent(
  () => import('../../../components/Countdown').then(module => ({ default: module.Countdown })),
  {
    name: 'Countdown',
    priority: 'high',
    fallbackComponent: OverlayFallback
  }
);

// Task 3.5.2: Giveaway Overlays
export const LazyActiveGiveawayCard = lazyComponentManager.createLazyComponent(
  () => import('../../../components/giveaway/ActiveGiveawayCard').then(module => ({ default: module.ActiveGiveawayCard })),
  {
    name: 'ActiveGiveawayCard',
    priority: 'high',
    fallbackComponent: OverlayFallback
  }
);

export const LazyWinnerDisplay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/giveaway/WinnerDisplay').then(module => ({ default: module.WinnerDisplay })),
  {
    name: 'WinnerDisplay',
    priority: 'high',
    fallbackComponent: OverlayFallback
  }
);

export const LazyMultiWinnerDisplay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/giveaway/MultiWinnerDisplay').then(module => ({ default: module.MultiWinnerDisplay })),
  {
    name: 'MultiWinnerDisplay',
    priority: 'medium',
    fallbackComponent: OverlayFallback
  }
);

export const LazySpinWheel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/giveaway/SpinWheel').then(module => ({ default: module.SpinWheel })),
  {
    name: 'SpinWheel',
    priority: 'high',
    fallbackComponent: OverlayFallback
  }
);

export const LazyRafflePreview = lazyComponentManager.createLazyComponent(
  () => import('../../../components/giveaway/RafflePreview').then(module => ({ default: module.RafflePreview })),
  {
    name: 'RafflePreview',
    priority: 'medium',
    fallbackComponent: OverlayFallback
  }
);

// Task 3.5.3: Game Overlays (from LazyGameComponents)
export const LazyGameOverlayWrapper = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/GameOverlayWrapper').then(module => ({ default: module.GameOverlayWrapper })),
  {
    name: 'GameOverlayWrapper',
    priority: 'high',
    preload: true,
    fallbackComponent: OverlayFallback
  }
);

export const LazyGameResultsOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/GameResultsOverlay').then(module => ({ default: module.GameResultsOverlay })),
  {
    name: 'GameResultsOverlay',
    priority: 'medium',
    fallbackComponent: OverlayFallback
  }
);

export const LazyOverlayChromaKey = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/OverlayChromaKey').then(module => ({ default: module.OverlayChromaKey })),
  {
    name: 'OverlayChromaKey',
    priority: 'medium',
    fallbackComponent: OverlayFallback
  }
);

// Task 3.5.4: Notification and Alert Overlays
export const LazyAlertOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/AlertOverlay').then(module => ({ default: module.AlertOverlay })),
  {
    name: 'AlertOverlay',
    priority: 'high',
    fallbackComponent: OverlayFallback
  }
);

export const LazyNotification = lazyComponentManager.createLazyComponent(
  () => import('../../../components/Notification').then(module => ({ default: module.NotificationContainer })),
  {
    name: 'NotificationContainer',
    priority: 'medium',
    fallbackComponent: OverlayFallback
  }
);

// Task 3.5.5: Activity and Stream Overlays
export const LazyStreamActivity = lazyComponentManager.createLazyComponent(
  () => import('../../../components/StreamActivity').then(module => ({ default: module.StreamActivity })),
  {
    name: 'StreamActivity',
    priority: 'medium',
    fallbackComponent: OverlayFallback
  }
);

export const LazyRecentVotes = lazyComponentManager.createLazyComponent(
  () => import('../../../components/RecentVotes').then(module => ({ default: module.RecentVotes })),
  {
    name: 'RecentVotes',
    priority: 'medium',
    fallbackComponent: OverlayFallback
  }
);

export const LazyLivePoll = lazyComponentManager.createLazyComponent(
  () => import('../../../components/LivePoll').then(module => ({ default: module.LivePoll })),
  {
    name: 'LivePoll',
    priority: 'high',
    fallbackComponent: OverlayFallback
  }
);

// Task 3.5.6: Prediction and Betting Overlays
export const LazyActivePrediction = lazyComponentManager.createLazyComponent(
  () => import('../../../components/ActivePrediction').then(module => ({ default: module.ActivePrediction })),
  {
    name: 'ActivePrediction',
    priority: 'high',
    fallbackComponent: OverlayFallback
  }
);

// Task 3.5.7: Background and Visual Effects
export const LazyAnimatedBackground = lazyComponentManager.createLazyComponent(
  () => import('../../../components/AnimatedBackground').then(module => ({ default: module.AnimatedBackground })),
  {
    name: 'AnimatedBackground',
    priority: 'low',
    fallbackComponent: OverlayFallback
  }
);

export const LazyChannelOrbit = lazyComponentManager.createLazyComponent(
  () => import('../../../components/ChannelOrbit').then(module => ({ default: module.ChannelOrbit })),
  {
    name: 'ChannelOrbit',
    priority: 'low',
    fallbackComponent: OverlayFallback
  }
);

// Task 3.5.8: Mascot and AI Overlays
export const LazyAIVisionMascot = lazyComponentManager.createLazyComponent(
  () => import('../../../components/AIVisionMascot').then(module => ({ default: module.AIVisionMascot })),
  {
    name: 'AIVisionMascot',
    priority: 'medium',
    fallbackComponent: OverlayFallback
  }
);

// Preloading strategy for critical overlays
export const preloadCriticalOverlays = async (): Promise<void> => {
  const criticalOverlays = [
    () => import('../../../components/PollOverlay').then(module => ({ default: module.PollOverlay })),
    () => import('../../../components/RandomWinnerOverlay').then(module => ({ default: module.RandomWinnerOverlay })),
    () => import('../../../components/games/GameOverlayWrapper').then(module => ({ default: module.GameOverlayWrapper })),
    () => import('../../../components/giveaway/ActiveGiveawayCard').then(module => ({ default: module.ActiveGiveawayCard })),
    () => import('../../../components/ActivePrediction').then(module => ({ default: module.ActivePrediction })),
  ];

  const preloadPromises = criticalOverlays.map((importFn, index) => 
    lazyComponentManager.preloadComponent(importFn, `critical-overlay-${index}`)
  );

  try {
    await Promise.allSettled(preloadPromises);
    console.log('Critical overlays preloaded successfully');
  } catch (error) {
    console.warn('Some critical overlays failed to preload:', error);
  }
};

// Overlay router for dynamic loading based on URL parameters
export const createOverlayRouter = () => {
  const overlayMap = new Map([
    ['poll', LazyPollOverlay],
    ['winner', LazyRandomWinnerOverlay],
    ['spinner', LazySpinnerWheel],
    ['countdown', LazyCountdown],
    ['giveaway', LazyActiveGiveawayCard],
    ['winnerDisplay', LazyWinnerDisplay],
    ['multiWinner', LazyMultiWinnerDisplay],
    ['spinWheel', LazySpinWheel],
    ['game', LazyGameOverlayWrapper],
    ['gameResults', LazyGameResultsOverlay],
    ['alert', LazyAlertOverlay],
    ['notification', LazyNotification],
    ['activity', LazyStreamActivity],
    ['votes', LazyRecentVotes],
    ['livePoll', LazyLivePoll],
    ['prediction', LazyActivePrediction],
    ['background', LazyAnimatedBackground],
    ['orbit', LazyChannelOrbit],
    ['mascot', LazyAIVisionMascot],
  ]);

  return {
    getOverlay: (overlayType: string) => overlayMap.get(overlayType),
    getAllOverlays: () => Array.from(overlayMap.keys()),
    hasOverlay: (overlayType: string) => overlayMap.has(overlayType)
  };
};

// Export all lazy overlay components for easy importing
export const LazyOverlays = {
  // Core Interactive
  PollOverlay: LazyPollOverlay,
  RandomWinnerOverlay: LazyRandomWinnerOverlay,
  SpinnerWheel: LazySpinnerWheel,
  Countdown: LazyCountdown,

  // Giveaway
  ActiveGiveawayCard: LazyActiveGiveawayCard,
  WinnerDisplay: LazyWinnerDisplay,
  MultiWinnerDisplay: LazyMultiWinnerDisplay,
  SpinWheel: LazySpinWheel,
  RafflePreview: LazyRafflePreview,

  // Games
  GameOverlayWrapper: LazyGameOverlayWrapper,
  GameResultsOverlay: LazyGameResultsOverlay,
  OverlayChromaKey: LazyOverlayChromaKey,

  // Notifications
  AlertOverlay: LazyAlertOverlay,
  Notification: LazyNotification,

  // Activity
  StreamActivity: LazyStreamActivity,
  RecentVotes: LazyRecentVotes,
  LivePoll: LazyLivePoll,

  // Predictions
  ActivePrediction: LazyActivePrediction,

  // Visual Effects
  AnimatedBackground: LazyAnimatedBackground,
  ChannelOrbit: LazyChannelOrbit,

  // AI/Mascot
  AIVisionMascot: LazyAIVisionMascot,
};

// Overlay categories for performance optimization
export const OverlayCategories = {
  critical: ['PollOverlay', 'RandomWinnerOverlay', 'GameOverlayWrapper', 'ActiveGiveawayCard', 'ActivePrediction'],
  interactive: ['SpinnerWheel', 'Countdown', 'WinnerDisplay', 'SpinWheel', 'LivePoll'],
  notifications: ['AlertOverlay', 'Notification', 'StreamActivity', 'RecentVotes'],
  visual: ['AnimatedBackground', 'ChannelOrbit', 'AIVisionMascot', 'OverlayChromaKey'],
  games: ['GameOverlayWrapper', 'GameResultsOverlay'],
  giveaways: ['ActiveGiveawayCard', 'WinnerDisplay', 'MultiWinnerDisplay', 'SpinWheel', 'RafflePreview']
} as const;

// Performance monitoring for overlays
export const getOverlayPerformanceMetrics = () => {
  const manager = lazyComponentManager;
  const stats = manager.getStats();
  
  return {
    loadedOverlays: stats.loadedComponents,
    currentlyLoading: stats.currentlyLoading,
    loadedComponents: stats.componentNames.filter(name => 
      Object.values(LazyOverlays).some(component => 
        component.displayName?.includes(name) || name.includes('Overlay')
      )
    ),
    memoryUsage: performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null
  };
};