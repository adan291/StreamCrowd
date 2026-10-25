/**
 * Firebase Sync - Real-time synchronization for overlays
 * 
 * This module provides real-time synchronization between the main app
 * and overlay windows using Firebase Realtime Database.
 * 
 * @module infrastructure/sync/FirebaseSync
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, onValue, Database } from 'firebase/database';
import { FirebaseAuthService } from '../auth/FirebaseAuthService';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase - reuse existing app if available
let database: Database | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Owner of the overlay data to display, from the overlay URL (?owner=<uid>).
 *
 * The OBS browser source is a different browser profile with its own
 * anonymous uid. Without the owner in the URL it read overlays/<its own uid>,
 * where nothing is ever written, so Firebase sync never worked in OBS.
 */
export function getOverlayOwnerFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const owner = new URLSearchParams(window.location.search).get('owner');
  // Firebase keys cannot contain . # $ [ ] or /
  return owner && /^[^.#$[\]/]{1,128}$/.test(owner) ? owner : null;
}

async function ensureInitialized(): Promise<void> {
  if (database) return;
  if (initPromise) return initPromise;
  
  initPromise = doInitialize();
  return initPromise;
}

async function doInitialize(): Promise<void> {
  try {
    // Initialize Firebase Auth first
    await FirebaseAuthService.initialize();
    
    // Ensure we're authenticated
    if (!FirebaseAuthService.isAuthenticated()) {
      await FirebaseAuthService.signInAnonymously();
    }
    
    // Get or create Firebase app
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    database = getDatabase(app);
    
    console.log('[FirebaseSync] Initialized with Auth, UID:', FirebaseAuthService.getUid());
  } catch (error) {
    console.error('[FirebaseSync] Initialization error:', error);
    throw error;
  }
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
    judges: Array<{ id: string; username: string; color: string; channelName?: string; isHost?: boolean }>;
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
    dataUrl?: string; // For drawing sync (partyco_drawing)
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
 * @param path - Database path (e.g., 'poll', 'countdown')
 * @param data - Data to sync
 */
export async function syncState(path: string, data: any): Promise<void> {
  // Skip if sync is disabled
  if (!firebaseSyncEnabled) {
    return;
  }

  // Ensure initialized and authenticated
  await ensureInitialized();
  
  if (!database) {
    console.warn('[FirebaseSync] Database not initialized');
    return;
  }
  
  const uid = FirebaseAuthService.getUid();
  if (!uid) {
    console.warn('[FirebaseSync] No authenticated user, skipping sync');
    return;
  }

  try {
    // Write to user-specific path: overlays/{uid}/{type}
    const dbRef = ref(database, `overlays/${uid}/${path}`);
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
 * @param path - Database path (e.g., 'poll', 'countdown')
 * @param callback - Callback for data changes
 * @param customUid - Optional custom UID to subscribe to (for overlay viewers)
 * @returns Unsubscribe function
 */
export function subscribeToState<T>(
  path: string, 
  callback: (data: T | null) => void,
  customUid?: string
): () => void {
  // Skip if sync is disabled
  if (!firebaseSyncEnabled) {
    // Return a no-op unsubscribe function
    return () => {};
  }

  let unsubscribed = false;
  let detach: (() => void) | null = null;

  // Initialize and subscribe
  ensureInitialized().then(() => {
    if (unsubscribed || !database) return;
    
    // Overlay pages read the owner's data (?owner=); the control panel reads its own
    const uid = customUid || getOverlayOwnerFromUrl() || FirebaseAuthService.getUid();
    if (!uid) {
      console.warn('[FirebaseSync] No UID for subscription');
      return;
    }
    
    const dbRef = ref(database, `overlays/${uid}/${path}`);
    
    // Keep this listener's own unsubscribe: off(ref) would also remove every
    // other component's listener on the same path.
    detach = onValue(dbRef, (snapshot) => {
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
  }).catch(err => {
    console.error('[FirebaseSync] Subscribe initialization error:', err);
  });

  // Return unsubscribe function
  return () => {
    unsubscribed = true;
    if (detach) detach();
  };
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

/**
 * Get current user UID for overlay URL generation
 */
export function getCurrentUid(): string | null {
  return FirebaseAuthService.getUid();
}

/**
 * Subscribe to a specific user's overlay (for overlay viewers)
 */
export function subscribeToUserOverlay<T>(
  uid: string,
  path: string,
  callback: (data: T | null) => void
): () => void {
  return subscribeToState<T>(path, callback, uid);
}

export { database };
