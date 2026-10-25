/**
 * FirebaseAuthService - Firebase Authentication for secure database access
 * 
 * This service manages Firebase Authentication to secure database operations.
 * Uses anonymous authentication by default, with the option to link to
 * platform accounts (Twitch, YouTube, etc.) for identity verification.
 * 
 * SECURITY:
 * - Anonymous auth provides a unique UID per device/browser
 * - UIDs are used in Firebase rules to restrict data access
 * - Platform linking allows verification of broadcaster identity
 * 
 * @module src/infrastructure/auth/FirebaseAuthService
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged,
  Auth,
  User,
  signOut
} from 'firebase/auth';

/** Serverless endpoint that turns a Twitch token into a Firebase custom token (api/firebase-token.ts) */
const FIREBASE_TOKEN_ENDPOINT = '/api/firebase-token';
/** uid prefix used by the endpoint: "twitch:<user_id>" */
const TWITCH_UID_PREFIX = 'twitch:';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ============================================
// Types
// ============================================

export interface FirebaseAuthState {
  isAuthenticated: boolean;
  uid: string | null;
  isAnonymous: boolean;
  linkedPlatformId?: string;
}

export type AuthStateCallback = (state: FirebaseAuthState) => void;

// ============================================
// Service Implementation
// ============================================

class FirebaseAuthServiceImpl {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private currentUser: User | null = null;
  private listeners: Set<AuthStateCallback> = new Set();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  
  // Store linked platform ID (e.g., Twitch broadcaster ID)
  private linkedPlatformId: string | null = null;

  /**
   * Initialize Firebase Auth
   * Automatically signs in anonymously if not already authenticated
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Get or create Firebase app
      const apps = getApps();
      this.app = apps.length > 0 ? apps[0] : initializeApp(FIREBASE_CONFIG, 'firebase-auth');
      this.auth = getAuth(this.app);

      // Listen for auth state changes
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        this.notifyListeners();
        
        if (user) {
          console.log('[FirebaseAuth] User authenticated:', user.uid, user.isAnonymous ? '(anonymous)' : '');
        } else {
          console.log('[FirebaseAuth] User signed out');
        }
      });

      // Sign in anonymously if not already signed in
      if (!this.auth.currentUser) {
        await this.signInAnonymously();
      } else {
        this.currentUser = this.auth.currentUser;
      }

      this.initialized = true;
      console.log('[FirebaseAuth] Initialized');
    } catch (err) {
      console.error('[FirebaseAuth] Initialization error:', err);
      throw err;
    }
  }

  /**
   * Sign in anonymously
   * Creates a unique UID for this device/browser
   */
  async signInAnonymously(): Promise<string | null> {
    if (!this.auth) {
      await this.initialize();
    }

    try {
      const result = await signInAnonymously(this.auth!);
      this.currentUser = result.user;
      console.log('[FirebaseAuth] Signed in anonymously:', result.user.uid);
      return result.user.uid;
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('[FirebaseAuth] Anonymous sign-in error:', err);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/configuration-not-found') {
        console.warn('[FirebaseAuth] Anonymous authentication is not enabled in Firebase Console.');
        console.warn('[FirebaseAuth] To enable: Firebase Console → Authentication → Sign-in method → Anonymous → Enable');
        console.warn('[FirebaseAuth] The app will continue without Firebase sync features.');
      } else if (error.code === 'auth/network-request-failed') {
        console.warn('[FirebaseAuth] Network error - Firebase sync will be unavailable.');
      }
      
      // Don't throw - allow app to continue without auth
      return null;
    }
  }

  // In-flight Twitch sign-ins, keyed by expected Twitch id (dedupes parallel callers)
  private twitchSignIns = new Map<string, Promise<boolean>>();

  /**
   * Sign in with a verified Twitch identity.
   *
   * Sends the user's own Twitch token to /api/firebase-token, which validates
   * it with Twitch and returns a Firebase custom token (uid "twitch:<id>",
   * claim twitchId). The database rules only trust this identity for
   * streamer-owned data (broadcaster tokens, profile, giveaways).
   *
   * Returns false (and keeps the anonymous session) if the endpoint is not
   * deployed/configured, e.g. under `npm run dev` without `vercel dev`.
   */
  async signInWithTwitch(accessToken: string, expectedTwitchId?: string): Promise<boolean> {
    await this.initialize();
    if (!this.auth || !accessToken) return false;

    if (expectedTwitchId && this.getTwitchId() === expectedTwitchId) {
      return true;
    }

    const key = expectedTwitchId || accessToken;
    const pending = this.twitchSignIns.get(key);
    if (pending) return pending;

    const attempt = this.doSignInWithTwitch(accessToken, expectedTwitchId).finally(() => {
      this.twitchSignIns.delete(key);
    });
    this.twitchSignIns.set(key, attempt);
    return attempt;
  }

  private async doSignInWithTwitch(accessToken: string, expectedTwitchId?: string): Promise<boolean> {
    try {
      const response = await fetch(FIREBASE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      if (!response.ok) {
        console.warn(`[FirebaseAuth] Twitch identity unavailable (HTTP ${response.status}); staying anonymous`);
        return false;
      }

      const data = (await response.json()) as { firebaseToken?: string; twitchId?: string };
      if (!data.firebaseToken || !data.twitchId) return false;
      if (expectedTwitchId && data.twitchId !== expectedTwitchId) {
        console.warn('[FirebaseAuth] Twitch token belongs to a different user than expected');
        return false;
      }

      const result = await signInWithCustomToken(this.auth!, data.firebaseToken);
      this.currentUser = result.user;
      this.linkPlatformId(data.twitchId);
      return true;
    } catch (err) {
      console.warn('[FirebaseAuth] Twitch sign-in failed; staying anonymous:', err);
      return false;
    }
  }

  /**
   * Twitch id verified by the server (from the custom-token uid), or null when
   * signed in anonymously. Unlike getLinkedPlatformId(), this is what the
   * database rules see.
   */
  getTwitchId(): string | null {
    const uid = this.currentUser?.uid;
    return uid && uid.startsWith(TWITCH_UID_PREFIX) ? uid.slice(TWITCH_UID_PREFIX.length) : null;
  }

  /**
   * Waits (up to timeoutMs) until the session has the given verified Twitch
   * identity. Used before writes that the rules only allow to the owner.
   */
  waitForTwitchIdentity(twitchId: string, timeoutMs = 8000): Promise<boolean> {
    if (this.getTwitchId() === twitchId) return Promise.resolve(true);
    return new Promise(resolve => {
      let done = false;
      let unsubscribe: () => void = () => {};
      const finish = (value: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        unsubscribe();
        resolve(value);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      unsubscribe = this.onAuthStateChange(() => {
        if (this.getTwitchId() === twitchId) finish(true);
      });
    });
  }

  /**
   * Link a platform ID to the current Firebase user.
   * NOTE: local only (localStorage); the database rules do NOT see this.
   * Verified identity comes from signInWithTwitch().
   */
  linkPlatformId(platformId: string): void {
    this.linkedPlatformId = platformId;
    // Store in localStorage for persistence
    localStorage.setItem('firebase_linked_platform_id', platformId);
    this.notifyListeners();
    console.log('[FirebaseAuth] Linked platform ID:', platformId);
  }

  /**
   * Get the linked platform ID
   */
  getLinkedPlatformId(): string | null {
    if (!this.linkedPlatformId) {
      this.linkedPlatformId = localStorage.getItem('firebase_linked_platform_id');
    }
    return this.linkedPlatformId;
  }

  /**
   * Unlink platform ID
   */
  unlinkPlatformId(): void {
    this.linkedPlatformId = null;
    localStorage.removeItem('firebase_linked_platform_id');
    this.notifyListeners();
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (!this.auth) return;

    try {
      await signOut(this.auth);
      this.currentUser = null;
      this.unlinkPlatformId();
      console.log('[FirebaseAuth] Signed out');
      // Keep an anonymous session so overlays and local sync keep working
      await this.signInAnonymously();
    } catch (err) {
      console.error('[FirebaseAuth] Sign out error:', err);
    }
  }

  /**
   * Get current auth state
   */
  getAuthState(): FirebaseAuthState {
    return {
      isAuthenticated: !!this.currentUser,
      uid: this.currentUser?.uid || null,
      isAnonymous: this.currentUser?.isAnonymous || false,
      linkedPlatformId: this.getLinkedPlatformId() || undefined,
    };
  }

  /**
   * Get current user UID
   */
  getUid(): string | null {
    return this.currentUser?.uid || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: AuthStateCallback): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current state
    callback(this.getAuthState());
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const state = this.getAuthState();
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (err) {
        console.error('[FirebaseAuth] Listener error:', err);
      }
    });
  }

  /**
   * Get the Firebase Auth instance (for advanced use)
   */
  getAuth(): Auth | null {
    return this.auth;
  }
}

// ============================================
// Singleton Export
// ============================================

export const FirebaseAuthService = new FirebaseAuthServiceImpl();

export default FirebaseAuthService;
