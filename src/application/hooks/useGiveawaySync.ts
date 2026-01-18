/**
 * useGiveawaySync - Application layer hook for giveaway synchronization
 * 
 * This hook provides a clean interface for React components to interact with
 * giveaway synchronization without directly importing Firebase or infrastructure code.
 * It follows hexagonal architecture principles by using dependency injection
 * to access the OverlaySyncService.
 */

import { useState, useEffect, useCallback } from 'react';
import type { OverlayState } from '../../domain/entities/OverlayState';
import { DependencyFactory } from '../../infrastructure/factories/DependencyFactory';

/**
 * Giveaway entry structure
 */
export interface GiveawayEntry {
  id: string;
  username: string;
  displayName?: string;
  entryTime: number;
  entryMethod: 'chat' | 'follow' | 'subscribe' | 'manual';
  weight: number;
  isEligible: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Giveaway configuration
 */
export interface GiveawayConfig {
  /** Giveaway title */
  title: string;
  
  /** Description of the prize */
  description?: string;
  
  /** Entry methods allowed */
  entryMethods: Array<'chat' | 'follow' | 'subscribe' | 'manual'>;
  
  /** Keywords required for chat entry */
  keywords: string[];
  
  /** Minimum follow time in minutes */
  minFollowTime?: number;
  
  /** Subscriber multiplier */
  subscriberMultiplier: number;
  
  /** VIP multiplier */
  vipMultiplier: number;
  
  /** Moderator multiplier */
  moderatorMultiplier: number;
  
  /** Maximum entries per user */
  maxEntriesPerUser: number;
  
  /** Duration in seconds (0 = manual end) */
  duration: number;
  
  /** Whether to allow duplicate entries */
  allowDuplicates: boolean;
  
  /** Whether to require subscription */
  requireSubscription: boolean;
}

/**
 * Giveaway winner information
 */
export interface GiveawayWinner {
  entry: GiveawayEntry;
  winTime: number;
  prizeDescription?: string;
  claimed: boolean;
  claimTime?: number;
}

/**
 * Giveaway state structure for synchronization
 */
export interface GiveawayState {
  /** Unique giveaway ID */
  id: string;
  
  /** Giveaway configuration */
  config: GiveawayConfig;
  
  /** Current status */
  status: 'preparing' | 'active' | 'drawing' | 'completed' | 'cancelled';
  
  /** All entries */
  entries: GiveawayEntry[];
  
  /** Selected winners */
  winners: GiveawayWinner[];
  
  /** Start time */
  startTime?: number;
  
  /** End time */
  endTime?: number;
  
  /** Statistics */
  stats: {
    totalEntries: number;
    uniqueParticipants: number;
    entriesPerMinute: number;
    entryMethodBreakdown: Record<string, number>;
  };
  
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Return type for useGiveawaySync hook
 */
export interface UseGiveawaySyncReturn {
  /** Current giveaway state, null if no active giveaway */
  giveawayState: GiveawayState | null;
  
  /** Publish new giveaway state to all connected clients */
  publishGiveawayState: (state: GiveawayState) => Promise<void>;
  
  /** Clear current giveaway state */
  clearGiveawayState: () => Promise<void>;
  
  /** Start a new giveaway */
  startGiveaway: (config: GiveawayConfig) => Promise<void>;
  
  /** End the current giveaway */
  endGiveaway: () => Promise<void>;
  
  /** Add an entry to the current giveaway */
  addEntry: (entry: Omit<GiveawayEntry, 'id' | 'entryTime'>) => Promise<void>;
  
  /** Remove an entry from the current giveaway */
  removeEntry: (entryId: string) => Promise<void>;
  
  /** Draw winners from the current giveaway */
  drawWinners: (count: number) => Promise<GiveawayWinner[]>;
  
  /** Whether the sync connection is active */
  isConnected: boolean;
  
  /** Any error that occurred during sync operations */
  error: string | null;
  
  /** Manually trigger reconnection */
  reconnect: () => void;
}

/**
 * Hook for giveaway synchronization using application layer services
 * 
 * @returns Object with giveaway state and sync methods
 */
export function useGiveawaySync(): UseGiveawaySyncReturn {
  const [giveawayState, setGiveawayState] = useState<GiveawayState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get overlay sync service through dependency injection
  const overlaySync = DependencyFactory.getInstance().getOverlaySyncService();

  const publishGiveawayState = useCallback(async (state: GiveawayState): Promise<void> => {
    try {
      setError(null);
      const overlayState: OverlayState<GiveawayState> = {
        type: 'giveaway',
        data: state,
        updatedAt: Date.now(),
        isActive: state.status === 'active' || state.status === 'drawing',
        metadata: {
          version: '1.0',
          source: 'useGiveawaySync',
        }
      };
      
      const result = await overlaySync.publish(overlayState);
      if (!result.success && result.error) {
        throw result.error;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish giveaway state';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [overlaySync]);

  const clearGiveawayState = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const result = await overlaySync.clear('giveaway');
      if (!result.success && result.error) {
        throw result.error;
      }
      setGiveawayState(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear giveaway state';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [overlaySync]);

  const startGiveaway = useCallback(async (config: GiveawayConfig): Promise<void> => {
    const giveawayId = `giveaway_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const newGiveawayState: GiveawayState = {
      id: giveawayId,
      config,
      status: 'active',
      entries: [],
      winners: [],
      startTime: Date.now(),
      stats: {
        totalEntries: 0,
        uniqueParticipants: 0,
        entriesPerMinute: 0,
        entryMethodBreakdown: {},
      },
      lastUpdate: Date.now(),
    };
    
    await publishGiveawayState(newGiveawayState);
  }, [publishGiveawayState]);

  const endGiveaway = useCallback(async (): Promise<void> => {
    if (!giveawayState) return;
    
    const updatedState: GiveawayState = {
      ...giveawayState,
      status: 'completed',
      endTime: Date.now(),
      lastUpdate: Date.now(),
    };
    
    await publishGiveawayState(updatedState);
  }, [giveawayState, publishGiveawayState]);

  const addEntry = useCallback(async (entryData: Omit<GiveawayEntry, 'id' | 'entryTime'>): Promise<void> => {
    if (!giveawayState || giveawayState.status !== 'active') {
      throw new Error('No active giveaway to enter');
    }
    
    // Check if user already has entries and if duplicates are allowed
    const existingEntries = giveawayState.entries.filter(e => e.username === entryData.username);
    if (!giveawayState.config.allowDuplicates && existingEntries.length > 0) {
      throw new Error('User already entered this giveaway');
    }
    
    // Check max entries per user
    if (existingEntries.length >= giveawayState.config.maxEntriesPerUser) {
      throw new Error('User has reached maximum entries');
    }
    
    const newEntry: GiveawayEntry = {
      ...entryData,
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      entryTime: Date.now(),
    };
    
    const updatedEntries = [...giveawayState.entries, newEntry];
    const uniqueParticipants = new Set(updatedEntries.map(e => e.username)).size;
    
    // Calculate entries per minute
    const giveawayDuration = (Date.now() - (giveawayState.startTime || Date.now())) / (1000 * 60);
    const entriesPerMinute = giveawayDuration > 0 ? updatedEntries.length / giveawayDuration : 0;
    
    // Update entry method breakdown
    const entryMethodBreakdown = updatedEntries.reduce((acc, entry) => {
      acc[entry.entryMethod] = (acc[entry.entryMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const updatedState: GiveawayState = {
      ...giveawayState,
      entries: updatedEntries,
      stats: {
        totalEntries: updatedEntries.length,
        uniqueParticipants,
        entriesPerMinute,
        entryMethodBreakdown,
      },
      lastUpdate: Date.now(),
    };
    
    await publishGiveawayState(updatedState);
  }, [giveawayState, publishGiveawayState]);

  const removeEntry = useCallback(async (entryId: string): Promise<void> => {
    if (!giveawayState) return;
    
    const updatedEntries = giveawayState.entries.filter(e => e.id !== entryId);
    const uniqueParticipants = new Set(updatedEntries.map(e => e.username)).size;
    
    // Recalculate stats
    const giveawayDuration = (Date.now() - (giveawayState.startTime || Date.now())) / (1000 * 60);
    const entriesPerMinute = giveawayDuration > 0 ? updatedEntries.length / giveawayDuration : 0;
    
    const entryMethodBreakdown = updatedEntries.reduce((acc, entry) => {
      acc[entry.entryMethod] = (acc[entry.entryMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const updatedState: GiveawayState = {
      ...giveawayState,
      entries: updatedEntries,
      stats: {
        totalEntries: updatedEntries.length,
        uniqueParticipants,
        entriesPerMinute,
        entryMethodBreakdown,
      },
      lastUpdate: Date.now(),
    };
    
    await publishGiveawayState(updatedState);
  }, [giveawayState, publishGiveawayState]);

  const drawWinners = useCallback(async (count: number): Promise<GiveawayWinner[]> => {
    if (!giveawayState || giveawayState.entries.length === 0) {
      throw new Error('No entries available for drawing');
    }
    
    // Filter eligible entries
    const eligibleEntries = giveawayState.entries.filter(e => e.isEligible);
    if (eligibleEntries.length === 0) {
      throw new Error('No eligible entries for drawing');
    }
    
    // Create weighted pool
    const weightedPool: GiveawayEntry[] = [];
    eligibleEntries.forEach(entry => {
      for (let i = 0; i < entry.weight; i++) {
        weightedPool.push(entry);
      }
    });
    
    // Draw winners
    const winners: GiveawayWinner[] = [];
    const usedEntries = new Set<string>();
    
    for (let i = 0; i < Math.min(count, eligibleEntries.length); i++) {
      let attempts = 0;
      let winner: GiveawayEntry | null = null;
      
      // Try to find a unique winner (max 100 attempts to avoid infinite loop)
      while (attempts < 100 && !winner) {
        const randomIndex = Math.floor(Math.random() * weightedPool.length);
        const candidate = weightedPool[randomIndex];
        
        if (!usedEntries.has(candidate.id)) {
          winner = candidate;
          usedEntries.add(candidate.id);
        }
        attempts++;
      }
      
      if (winner) {
        winners.push({
          entry: winner,
          winTime: Date.now(),
          claimed: false,
        });
      }
    }
    
    const updatedState: GiveawayState = {
      ...giveawayState,
      status: 'drawing',
      winners: [...giveawayState.winners, ...winners],
      lastUpdate: Date.now(),
    };
    
    await publishGiveawayState(updatedState);
    return winners;
  }, [giveawayState, publishGiveawayState]);

  const reconnect = useCallback(() => {
    setError(null);
    setIsConnected(false);
    // Trigger reconnection through overlay sync service
    overlaySync.reconnect().catch(err => {
      setError(err instanceof Error ? err.message : 'Reconnection failed');
    });
  }, [overlaySync]);

  useEffect(() => {
    // Subscribe to giveaway state changes
    const subscription = overlaySync.subscribe<OverlayState<GiveawayState>>('giveaway', (state) => {
      if (state?.data) {
        setGiveawayState(state.data);
        setIsConnected(true);
        setError(null);
      } else {
        setGiveawayState(null);
      }
    });

    // Monitor connection status
    const checkConnection = () => {
      setIsConnected(overlaySync.isConnected());
    };

    // Check connection status periodically
    const connectionInterval = setInterval(checkConnection, 5000);
    checkConnection(); // Initial check

    return () => {
      subscription.unsubscribe();
      clearInterval(connectionInterval);
    };
  }, [overlaySync]);

  return {
    giveawayState,
    publishGiveawayState,
    clearGiveawayState,
    startGiveaway,
    endGiveaway,
    addEntry,
    removeEntry,
    drawWinners,
    isConnected,
    error,
    reconnect
  };
}