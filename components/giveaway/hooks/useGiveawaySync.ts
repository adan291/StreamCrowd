/**
 * useGiveawaySync Hook
 * Handles synchronization between tabs (BroadcastChannel) and OBS overlay (Firebase)
 */

import { useEffect, useCallback, useRef } from 'react';
import { giveawaySync } from '../../../src/infrastructure/sync/FirebaseSync';
import type { SyncedOverlayState } from '../../../src/infrastructure/sync/FirebaseSync';
import type { GiveawayThread } from '../types';

// ============================================
// TYPES
// ============================================

export interface ThreadSyncData {
  id: string;
  name: string;
  keyword: string;
  mode: string;
  participantCount: number;
  endsAt?: number;
  isPaused?: boolean;
  winner?: string;
  prizeImages?: string[];
}

export interface ScheduledThreadSyncData {
  id: string;
  name: string;
  startsAt: number;
}

export interface GiveawaySyncState {
  winner: string | null;
  isSpinning: boolean;
  displayName: string;
  participants: string[];
  activeThreads?: ThreadSyncData[];
  scheduledThreads?: ScheduledThreadSyncData[];
}

export interface UseGiveawaySyncOptions {
  /** Enable BroadcastChannel sync between tabs */
  enableBroadcast?: boolean;
  /** Enable Firebase sync for OBS overlay */
  enableFirebase?: boolean;
  /** Channel name for BroadcastChannel */
  channelName?: string;
  /** Callback when receiving sync from another tab */
  onBroadcastReceive?: (state: GiveawaySyncState) => void;
  /** Callback when receiving sync from Firebase */
  onFirebaseReceive?: (state: GiveawaySyncState) => void;
}

export interface UseGiveawaySyncReturn {
  /** Sync state to all channels */
  sync: (state: GiveawaySyncState) => void;
  /** Sync only to BroadcastChannel (local tabs) */
  syncLocal: (state: GiveawaySyncState) => void;
  /** Sync only to Firebase (OBS overlay) */
  syncRemote: (state: GiveawaySyncState) => void;
  /** Sync threads data */
  syncThreads: (activeThreads: GiveawayThread[], scheduledThreads: GiveawayThread[]) => void;
  /** Clear all synced state */
  clear: () => void;
  /** Check if BroadcastChannel is supported */
  isBroadcastSupported: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_CHANNEL_NAME = 'giveaway_sync';

// ============================================
// HELPERS
// ============================================

// Remove undefined values from object (Firebase doesn't accept undefined)
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

function threadToSyncData(thread: GiveawayThread): ThreadSyncData {
  return removeUndefined({
    id: thread.id,
    name: thread.name,
    keyword: thread.keyword || '',
    mode: thread.mode,
    participantCount: thread.participants.length,
    endsAt: thread.endsAt,
    isPaused: thread.isPaused,
    winner: thread.winner?.username,
    prizeImages: thread.prizeImages,
  });
}

function scheduledToSyncData(thread: GiveawayThread): ScheduledThreadSyncData {
  return {
    id: thread.id,
    name: thread.name,
    startsAt: thread.startsAt || 0,
  };
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useGiveawaySync(options: UseGiveawaySyncOptions = {}): UseGiveawaySyncReturn {
  const {
    enableBroadcast = true,
    enableFirebase = true,
    channelName = DEFAULT_CHANNEL_NAME,
    onBroadcastReceive,
    onFirebaseReceive,
  } = options;

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastSyncRef = useRef<GiveawaySyncState | null>(null);
  const isBroadcastSupported = typeof BroadcastChannel !== 'undefined';

  // Initialize BroadcastChannel
  useEffect(() => {
    if (!enableBroadcast || !isBroadcastSupported) return;

    try {
      broadcastChannelRef.current = new BroadcastChannel(channelName);

      broadcastChannelRef.current.onmessage = (event: MessageEvent<GiveawaySyncState>) => {
        if (onBroadcastReceive && event.data) {
          onBroadcastReceive(event.data);
        }
      };
    } catch (error) {
      console.warn('[useGiveawaySync] Failed to create BroadcastChannel:', error);
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [enableBroadcast, channelName, onBroadcastReceive, isBroadcastSupported]);

  // Subscribe to Firebase changes
  useEffect(() => {
    if (!enableFirebase || !onFirebaseReceive) return;

    const unsubscribe = giveawaySync.subscribe((data: SyncedOverlayState['giveaway'] | null) => {
      if (data) {
        onFirebaseReceive({
          winner: data.winner,
          isSpinning: data.isSpinning,
          displayName: data.displayName,
          participants: data.participants || [],
          activeThreads: data.activeThreads,
          scheduledThreads: data.scheduledThreads,
        });
      }
    });

    return unsubscribe;
  }, [enableFirebase, onFirebaseReceive]);

  // ============================================
  // SYNC FUNCTIONS
  // ============================================

  const syncLocal = useCallback((state: GiveawaySyncState): void => {
    if (!enableBroadcast || !broadcastChannelRef.current) return;

    try {
      broadcastChannelRef.current.postMessage(state);
    } catch (error) {
      console.warn('[useGiveawaySync] Failed to post to BroadcastChannel:', error);
    }
  }, [enableBroadcast]);

  const syncRemote = useCallback((state: GiveawaySyncState): void => {
    if (!enableFirebase) return;

    giveawaySync.update({
      winner: state.winner,
      isSpinning: state.isSpinning,
      displayName: state.displayName,
      participants: state.participants,
      activeThreads: state.activeThreads,
      scheduledThreads: state.scheduledThreads,
      updatedAt: Date.now(),
    });
  }, [enableFirebase]);

  const sync = useCallback((state: GiveawaySyncState): void => {
    // Merge with last sync to preserve threads data
    const mergedState = {
      ...lastSyncRef.current,
      ...state,
    };
    lastSyncRef.current = mergedState;
    syncLocal(mergedState);
    syncRemote(mergedState);
  }, [syncLocal, syncRemote]);

  const syncThreads = useCallback((activeThreads: GiveawayThread[], scheduledThreads: GiveawayThread[]): void => {
    const threadsData = {
      activeThreads: activeThreads.map(threadToSyncData),
      scheduledThreads: scheduledThreads.map(scheduledToSyncData),
    };
    
    const state: GiveawaySyncState = {
      winner: lastSyncRef.current?.winner || null,
      isSpinning: lastSyncRef.current?.isSpinning || false,
      displayName: lastSyncRef.current?.displayName || '',
      participants: lastSyncRef.current?.participants || [],
      ...threadsData,
    };
    
    lastSyncRef.current = state;
    syncLocal(state);
    syncRemote(state);
  }, [syncLocal, syncRemote]);

  const clear = useCallback((): void => {
    const emptyState: GiveawaySyncState = {
      winner: null,
      isSpinning: false,
      displayName: '',
      participants: [],
      activeThreads: [],
      scheduledThreads: [],
    };
    lastSyncRef.current = emptyState;
    sync(emptyState);
  }, [sync]);

  return {
    sync,
    syncLocal,
    syncRemote,
    syncThreads,
    clear,
    isBroadcastSupported,
  };
}

export default useGiveawaySync;
