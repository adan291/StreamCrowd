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
  onAuthStateChanged,
  Auth,
  User,
  signOut
} from 'firebase/auth';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "REDACTED_FIREBASE_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "twtich-vote-live.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://twtich-vote-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "twtich-vote-live",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "twtich-vote-live.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "779005710594",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:779005710594:web:8df44b0c02a57fc262b21b",
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
    } catch (err) {
      console.error('[FirebaseAuth] Anonymous sign-in error:', err);
      return null;
    }
  }

  /**
   * Link a platform ID to the current Firebase user
   * This allows Firebase rules to verify broadcaster identity
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
