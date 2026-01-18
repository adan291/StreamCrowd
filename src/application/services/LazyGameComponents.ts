/**
 * LazyGameComponents - Lazy-loaded game components
 * Implements Phase 3.4: Game Components Migration
 * Handles all 13+ mini-games for optimal performance
 */

import React, { ComponentType } from 'react';
import { lazyComponentManager } from './LazyComponentManager';

// Fallback component for games
const GameFallback: ComponentType = () => {
  return React.createElement('div', { className: 'p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg' },
    React.createElement('p', { className: 'text-purple-800 font-medium' }, 'Game is loading...'),
    React.createElement('p', { className: 'text-sm text-purple-600 mt-1' }, 
      'Preparing interactive experience...'
    )
  );
};

// Task 3.4.1: Casino and Gambling Games
export const LazyCasinoRoulette = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/CasinoRoulette').then(module => ({ default: module.CasinoRoulette })),
  {
    name: 'CasinoRoulette',
    priority: 'high',
    preload: true,
    fallbackComponent: GameFallback
  }
);

export const LazyRouletteOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/RouletteOverlay').then(module => ({ default: module.RouletteOverlay })),
  {
    name: 'RouletteOverlay',
    priority: 'high',
    fallbackComponent: GameFallback
  }
);

// Task 3.4.2: Action Games
export const LazyDuckHunt = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/DuckHunt').then(module => ({ default: module.DuckHunt })),
  {
    name: 'DuckHunt',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyDuckHuntOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/DuckHuntOverlay').then(module => ({ default: module.DuckHuntOverlay })),
  {
    name: 'DuckHuntOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyPiumGame = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/PiumGame').then(module => ({ default: module.PiumGame })),
  {
    name: 'PiumGame',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyPiumOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/PiumOverlay').then(module => ({ default: module.PiumOverlay })),
  {
    name: 'PiumOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

// Task 3.4.3: Strategy Games
export const LazyBattleshipGame = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/BattleshipGame').then(module => ({ default: module.BattleshipGame })),
  {
    name: 'BattleshipGame',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyBattleshipOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/BattleshipOverlay').then(module => ({ default: module.BattleshipOverlay })),
  {
    name: 'BattleshipOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyTriviaBattle = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/TriviaBattle').then(module => ({ default: module.TriviaBattle })),
  {
    name: 'TriviaBattle',
    priority: 'high',
    fallbackComponent: GameFallback
  }
);

export const LazyTriviaOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/TriviaOverlay').then(module => ({ default: module.TriviaOverlay })),
  {
    name: 'TriviaOverlay',
    priority: 'high',
    fallbackComponent: GameFallback
  }
);

// Task 3.4.4: Word and Memory Games
export const LazyAhorcado = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/Ahorcado').then(module => ({ default: module.Ahorcado })),
  {
    name: 'Ahorcado',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyAhorcadoOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/AhorcadoOverlay').then(module => ({ default: module.AhorcadoOverlay })),
  {
    name: 'AhorcadoOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyMemoriaIRL = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/MemoriaIRL').then(module => ({ default: module.MemoriaIRL })),
  {
    name: 'MemoriaIRL',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyMemoriaOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/MemoriaOverlay').then(module => ({ default: module.MemoriaOverlay })),
  {
    name: 'MemoriaOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyVeoVeo = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/VeoVeo').then(module => ({ default: module.VeoVeo })),
  {
    name: 'VeoVeo',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyVeoVeoOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/VeoVeoOverlay').then(module => ({ default: module.VeoVeoOverlay })),
  {
    name: 'VeoVeoOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

// Task 3.4.5: Social and Party Games
export const LazyHotPotato = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/HotPotato').then(module => ({ default: module.HotPotato })),
  {
    name: 'HotPotato',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyPotatoOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/PotatoOverlay').then(module => ({ default: module.PotatoOverlay })),
  {
    name: 'PotatoOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyPiedraPapelTijera = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/PiedraPapelTijera').then(module => ({ default: module.PiedraPapelTijera })),
  {
    name: 'PiedraPapelTijera',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyPPTOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/PPTOverlay').then(module => ({ default: module.PPTOverlay })),
  {
    name: 'PPTOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyPartyCo = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/PartyCo').then(module => ({ default: module.PartyCo })),
  {
    name: 'PartyCo',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyPartyCoOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/PartyCoOverlay').then(module => ({ default: module.PartyCoOverlay })),
  {
    name: 'PartyCoOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

// Task 3.4.6: Racing and Competition Games
export const LazyCarreraEmotes = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/CarreraEmotes').then(module => ({ default: module.CarreraEmotes })),
  {
    name: 'CarreraEmotes',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyCarreraOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/CarreraOverlay').then(module => ({ default: module.CarreraOverlay })),
  {
    name: 'CarreraOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyChatFishing = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/ChatFishing').then(module => ({ default: module.ChatFishing })),
  {
    name: 'ChatFishing',
    priority: 'high',
    fallbackComponent: GameFallback
  }
);

export const LazyFishingOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/FishingOverlay').then(module => ({ default: module.FishingOverlay })),
  {
    name: 'FishingOverlay',
    priority: 'high',
    fallbackComponent: GameFallback
  }
);

// Task 3.4.7: Game Management Components
export const LazyGameHistoryPanel = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/GameHistoryPanel').then(module => ({ default: module.GameHistoryPanel })),
  {
    name: 'GameHistoryPanel',
    priority: 'low',
    fallbackComponent: GameFallback
  }
);

export const LazyGameOverlayWrapper = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/GameOverlayWrapper').then(module => ({ default: module.GameOverlayWrapper })),
  {
    name: 'GameOverlayWrapper',
    priority: 'high',
    preload: true,
    fallbackComponent: GameFallback
  }
);

export const LazyGameQuickSettings = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/GameQuickSettings').then(module => ({ default: module.GameQuickSettings })),
  {
    name: 'GameQuickSettings',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyGameResultsOverlay = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/GameResultsOverlay').then(module => ({ default: module.GameResultsOverlay })),
  {
    name: 'GameResultsOverlay',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

export const LazyOverlayChromaKey = lazyComponentManager.createLazyComponent(
  () => import('../../../components/games/OverlayChromaKey').then(module => ({ default: module.OverlayChromaKey })),
  {
    name: 'OverlayChromaKey',
    priority: 'medium',
    fallbackComponent: GameFallback
  }
);

// Preloading strategy for popular games
export const preloadPopularGames = async (): Promise<void> => {
  const popularGames = [
    () => import('../../../components/games/CasinoRoulette').then(module => ({ default: module.CasinoRoulette })),
    () => import('../../../components/games/ChatFishing').then(module => ({ default: module.ChatFishing })),
    () => import('../../../components/games/TriviaBattle').then(module => ({ default: module.TriviaBattle })),
    () => import('../../../components/games/GameOverlayWrapper').then(module => ({ default: module.GameOverlayWrapper })),
  ];

  const preloadPromises = popularGames.map((importFn, index) => 
    lazyComponentManager.preloadComponent(importFn, `popular-game-${index}`)
  );

  try {
    await Promise.allSettled(preloadPromises);
    console.log('Popular games preloaded successfully');
  } catch (error) {
    console.warn('Some popular games failed to preload:', error);
  }
};

// Export all lazy game components for easy importing
export const LazyGames = {
  // Casino Games
  CasinoRoulette: LazyCasinoRoulette,
  RouletteOverlay: LazyRouletteOverlay,

  // Action Games
  DuckHunt: LazyDuckHunt,
  DuckHuntOverlay: LazyDuckHuntOverlay,
  PiumGame: LazyPiumGame,
  PiumOverlay: LazyPiumOverlay,

  // Strategy Games
  BattleshipGame: LazyBattleshipGame,
  BattleshipOverlay: LazyBattleshipOverlay,
  TriviaBattle: LazyTriviaBattle,
  TriviaOverlay: LazyTriviaOverlay,

  // Word and Memory Games
  Ahorcado: LazyAhorcado,
  AhorcadoOverlay: LazyAhorcadoOverlay,
  MemoriaIRL: LazyMemoriaIRL,
  MemoriaOverlay: LazyMemoriaOverlay,
  VeoVeo: LazyVeoVeo,
  VeoVeoOverlay: LazyVeoVeoOverlay,

  // Social and Party Games
  HotPotato: LazyHotPotato,
  PotatoOverlay: LazyPotatoOverlay,
  PiedraPapelTijera: LazyPiedraPapelTijera,
  PPTOverlay: LazyPPTOverlay,
  PartyCo: LazyPartyCo,
  PartyCoOverlay: LazyPartyCoOverlay,

  // Racing and Competition Games
  CarreraEmotes: LazyCarreraEmotes,
  CarreraOverlay: LazyCarreraOverlay,
  ChatFishing: LazyChatFishing,
  FishingOverlay: LazyFishingOverlay,

  // Game Management
  GameHistoryPanel: LazyGameHistoryPanel,
  GameOverlayWrapper: LazyGameOverlayWrapper,
  GameQuickSettings: LazyGameQuickSettings,
  GameResultsOverlay: LazyGameResultsOverlay,
  OverlayChromaKey: LazyOverlayChromaKey,
};

// Game categories for easier management
export const GameCategories = {
  casino: ['CasinoRoulette', 'RouletteOverlay'],
  action: ['DuckHunt', 'DuckHuntOverlay', 'PiumGame', 'PiumOverlay'],
  strategy: ['BattleshipGame', 'BattleshipOverlay', 'TriviaBattle', 'TriviaOverlay'],
  wordMemory: ['Ahorcado', 'AhorcadoOverlay', 'MemoriaIRL', 'MemoriaOverlay', 'VeoVeo', 'VeoVeoOverlay'],
  social: ['HotPotato', 'PotatoOverlay', 'PiedraPapelTijera', 'PPTOverlay', 'PartyCo', 'PartyCoOverlay'],
  racing: ['CarreraEmotes', 'CarreraOverlay', 'ChatFishing', 'FishingOverlay'],
  management: ['GameHistoryPanel', 'GameOverlayWrapper', 'GameQuickSettings', 'GameResultsOverlay', 'OverlayChromaKey']
} as const;