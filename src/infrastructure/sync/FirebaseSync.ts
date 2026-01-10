/**
 * Firebase Sync - Real-time synchronization for overlays
 * 
 * This module provides real-time synchronization between the main app
 * and overlay windows using Firebase Realtime Database.
 * 
 * @module infrastructure/sync/FirebaseSync
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "REDACTED_FIREBASE_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "twtich-vote-live.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://twtich-vote-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "twtich-vote-live",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "twtich-vote-live.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "779005710594",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:779005710594:web:8df44b0c02a57fc262b21b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TJZ968LQPC"
};

// Initialize Firebase - reuse existing app if available
const apps = getApps();
const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Wait for auth to be ready before allowing writes
let authReady = false;
let authReadyPromise: Promise<void> | null = null;

function waitForAuth(): Promise<void> {
  if (authReady) return Promise.resolve();
  
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      // Check if already authenticated
      if (auth.currentUser) {
        authReady = true;
        resolve();
        return;
      }
      
      // Wait for auth state change
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          authReady = true;
          unsubscribe();
          resolve();
        }
      });
      
      // Timeout after 5 seconds - allow operations without auth (will fail gracefully)
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 5000);
    });
  }
  
  return authReadyPromise;
}

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
    // Extended data for overlay
    activeThreads?: Array<{
      id: string;
      name: string;
      keyword: string;
      mode: string;
      participantCount: number;
      endsAt?: number;
      isPaused?: boolean;
      winner?: string;
    }>;
    scheduledThreads?: Array<{
      id: string;
      name: string;
      startsAt: number;
    }>;
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

// Track if Firebase sync is available (auth succeeded)
let firebaseSyncEnabled = true;
let permissionErrorLogged = false;

/**
 * Recursively remove undefined values from an object
 * Firebase doesn't accept undefined values
 */
function removeUndefinedDeep(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedDeep(item));
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value !== undefined) {
          result[key] = removeUndefinedDeep(value);
        }
      }
    }
    return result;
  }
  
  return obj;
}

/**
 * Disable Firebase sync (called when auth fails)
 */
export function disableFirebaseSync(): void {
  firebaseSyncEnabled = false;
  console.warn('[FirebaseSync] Sync disabled - Firebase features will not work');
}

/**
 * Check if Firebase sync is enabled
 */
export function isFirebaseSyncEnabled(): boolean {
  return firebaseSyncEnabled;
}

/**
 * Write state to Firebase
 * @param path - Database path
 * @param data - Data to sync
 */
export async function syncState(path: string, data: any): Promise<void> {
  // Skip if sync is disabled
  if (!firebaseSyncEnabled) {
    return;
  }

  // Wait for auth to be ready
  await waitForAuth();

  try {
    const dbRef = ref(database, `overlays/${path}`);
    // Remove undefined values before sending to Firebase
    const cleanData = removeUndefinedDeep({
      ...data,
      updatedAt: Date.now()
    });
    await set(dbRef, cleanData);
  } catch (error: unknown) {
    const err = error as { message?: string };
    
    // Handle permission denied errors gracefully
    if (err.message?.includes('PERMISSION_DENIED')) {
      if (!permissionErrorLogged) {
        console.warn('[FirebaseSync] Permission denied - check Firebase rules and authentication.');
        permissionErrorLogged = true;
      }
      // Disable further sync attempts to avoid spam
      firebaseSyncEnabled = false;
      return;
    }
    
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
  // Skip if sync is disabled
  if (!firebaseSyncEnabled) {
    // Return a no-op unsubscribe function
    return () => {};
  }

  const dbRef = ref(database, `overlays/${path}`);
  
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    callback(data as T | null);
  }, (error: unknown) => {
    const err = error as { message?: string };
    
    // Handle permission denied errors gracefully
    if (err.message?.includes('PERMISSION_DENIED')) {
      if (!permissionErrorLogged) {
        console.warn(`[FirebaseSync] Permission denied for ${path} - Anonymous auth may not be enabled.`);
        permissionErrorLogged = true;
      }
      firebaseSyncEnabled = false;
      return;
    }
    
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
