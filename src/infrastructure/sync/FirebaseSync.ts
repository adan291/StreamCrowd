/**
 * Firebase Sync - Real-time synchronization for overlays
 * 
 * This module provides real-time synchronization between the main app
 * and overlay windows using Firebase Realtime Database.
 * 
 * @module infrastructure/sync/FirebaseSync
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, off, DatabaseReference } from 'firebase/database';

const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_API_KEY",
  authDomain: "twtich-vote-live.firebaseapp.com",
  databaseURL: "https://twtich-vote-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "twtich-vote-live",
  storageBucket: "twtich-vote-live.firebasestorage.app",
  messagingSenderId: "779005710594",
  appId: "1:779005710594:web:8df44b0c02a57fc262b21b",
  measurementId: "G-TJZ968LQPC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============ TYPES ============

/**
 * Synced overlay state types
 */
export interface SyncedOverlayState {
  poll?: {
    question: string;
    options: Array<{ text: string; votes: number; color: string }>;
    isActive: boolean;
    showResults: boolean;
    totalVotes: number;
    updatedAt: number;
  };
  countdown?: {
    endTime: number;
    label: string;
    isActive: boolean;
    updatedAt: number;
  };
  giveaway?: {
    winner: string | null;
    isSpinning: boolean;
    displayName: string;
    participants: string[];
    updatedAt: number;
  };
  judgePanel?: {
    title: string;
    contestants: Array<{ id: string; name: string; color: string; image?: string | null; voteKey?: string | null }>;
    judges: Array<{ id: string; username: string; color: string }>;
    criteria: Array<{ id: string; name: string; minScore: number; maxScore: number; weight: number }>;
    scores: Array<{ judgeId: string; contestantId: string; criterionId: string; score: number }>;
    publicVotes: Array<{ oderId: string; contestantId: string }>;
    publicVotingActive: boolean;
    publicVotingTimeLeft?: number | null;
    publicVotingEnabled: boolean;
    publicVoteWeight: number;
    revealScoresLive: boolean;
    showJudgeNames: boolean;
    revealedContestants: string[];
    isActive: boolean;
    isFinished: boolean;
    winnerId: string | null;
    updatedAt: number;
  };
  game?: {
    type: string;
    state: any;
    updatedAt: number;
  };
}

// ============ CORE FUNCTIONS ============

/**
 * Write state to Firebase
 * @param path - Database path
 * @param data - Data to sync
 */
export async function syncState(path: string, data: any): Promise<void> {
  try {
    const dbRef = ref(database, `overlays/${path}`);
    await set(dbRef, {
      ...data,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error syncing to Firebase:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time changes
 * @param path - Database path
 * @param callback - Callback for data changes
 * @returns Unsubscribe function
 */
export function subscribeToState<T>(
  path: string, 
  callback: (data: T | null) => void
): () => void {
  const dbRef = ref(database, `overlays/${path}`);
  
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    callback(data as T | null);
  }, (error) => {
    console.error(`Firebase subscription error for ${path}:`, error);
  });

  // Return unsubscribe function
  return () => off(dbRef);
}

// ============ OVERLAY-SPECIFIC HELPERS ============

/**
 * Poll sync helpers
 */
export const pollSync = {
  update: (data: SyncedOverlayState['poll']) => syncState('poll', data),
  subscribe: (callback: (data: SyncedOverlayState['poll'] | null) => void) => 
    subscribeToState<SyncedOverlayState['poll']>('poll', callback)
};

/**
 * Countdown sync helpers
 */
export const countdownSync = {
  update: (data: Omit<NonNullable<SyncedOverlayState['countdown']>, 'updatedAt'>) => syncState('countdown', data),
  subscribe: (callback: (data: SyncedOverlayState['countdown'] | null) => void) => 
    subscribeToState<SyncedOverlayState['countdown']>('countdown', callback)
};

/**
 * Giveaway sync helpers
 */
export const giveawaySync = {
  update: (data: SyncedOverlayState['giveaway']) => syncState('giveaway', data),
  subscribe: (callback: (data: SyncedOverlayState['giveaway'] | null) => void) => 
    subscribeToState<SyncedOverlayState['giveaway']>('giveaway', callback)
};

/**
 * Judge panel sync helpers
 */
export const judgePanelSync = {
  update: (data: SyncedOverlayState['judgePanel']) => syncState('judgePanel', data),
  subscribe: (callback: (data: SyncedOverlayState['judgePanel'] | null) => void) => 
    subscribeToState<SyncedOverlayState['judgePanel']>('judgePanel', callback)
};

/**
 * Game sync helpers
 */
export const gameSync = {
  update: (type: string, state: any) => syncState('game', { type, state }),
  subscribe: (callback: (data: SyncedOverlayState['game'] | null) => void) => 
    subscribeToState<SyncedOverlayState['game']>('game', callback)
};

export { database };
