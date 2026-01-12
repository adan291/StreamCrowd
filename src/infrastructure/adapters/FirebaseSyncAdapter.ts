/**
 * FirebaseSyncAdapter - Implementación de IOverlaySync para Firebase
 * 
 * Este adapter envuelve Firebase Realtime Database para sincronizar
 * estado entre el panel de control y los overlays.
 */

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, onValue, off, Database, DatabaseReference } from 'firebase/database';
import type { 
  IOverlaySync, 
  OverlayType, 
  OverlayState, 
  SyncCallback 
} from '../../domain/ports/IOverlaySync';
import { FirebaseAuthService } from '../auth/FirebaseAuthService';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

interface FirebaseSyncConfig {
  firebaseConfig?: typeof DEFAULT_FIREBASE_CONFIG;
  basePath?: string;
}

export class FirebaseSyncAdapter implements IOverlaySync {
  readonly syncId = 'firebase';
  
  private app: FirebaseApp | null = null;
  private database: Database | null = null;
  private basePath: string;
  private subscriptions = new Map<string, DatabaseReference>();
  private connected = false;
  private initPromise: Promise<void> | null = null;
  private firebaseConfig: typeof DEFAULT_FIREBASE_CONFIG;
  
  constructor(config: FirebaseSyncConfig = {}) {
    this.firebaseConfig = config.firebaseConfig || DEFAULT_FIREBASE_CONFIG;
    this.basePath = config.basePath || 'overlays';
  }
  
  /**
   * Initialize Firebase and Auth
   */
  private async ensureInitialized(): Promise<void> {
    if (this.connected && this.database) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }
  
  private async doInitialize(): Promise<void> {
    try {
      // Initialize Firebase Auth first
      await FirebaseAuthService.initialize();
      
      // Ensure we're authenticated
      if (!FirebaseAuthService.isAuthenticated()) {
        await FirebaseAuthService.signInAnonymously();
      }
      
      // Get or create Firebase app
      const apps = getApps();
      this.app = apps.length > 0 ? apps[0] : initializeApp(this.firebaseConfig, 'firebase-sync');
      this.database = getDatabase(this.app);
      this.connected = true;
      
      console.log('[FirebaseSyncAdapter] Initialized with Auth, UID:', FirebaseAuthService.getUid());
    } catch (error) {
      console.error('[FirebaseSyncAdapter] Initialization error:', error);
      throw error;
    }
  }
  
  async publish<T>(type: OverlayType, data: T): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.database) {
      throw new Error('Firebase database not initialized');
    }
    
    const uid = FirebaseAuthService.getUid();
    if (!uid) {
      console.warn('[FirebaseSyncAdapter] No authenticated user, skipping publish');
      return;
    }
    
    // Use UID as the overlay ID to match Firebase rules
    const dbRef = ref(this.database, `${this.basePath}/${uid}`);
    const state: OverlayState<T> & { ownerId: string } = {
      type,
      data,
      updatedAt: Date.now(),
      isActive: true,
      ownerId: uid, // Required by Firebase rules
    };
    
    try {
      await set(dbRef, state);
    } catch (error) {
      console.error(`Firebase sync error for ${type}:`, error);
      throw error;
    }
  }
  
  subscribe<T>(type: OverlayType, callback: SyncCallback<T>): () => void {
    // Initialize asynchronously, but set up subscription immediately
    this.ensureInitialized().then(() => {
      if (!this.database) return;
      
      const uid = FirebaseAuthService.getUid();
      if (!uid) {
        console.warn('[FirebaseSyncAdapter] No authenticated user for subscription');
        return;
      }
      
      const dbRef = ref(this.database, `${this.basePath}/${uid}`);
      
      onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        callback(data as OverlayState<T> | null);
      }, (error) => {
        console.error(`Firebase subscription error for ${type}:`, error);
      });
      
      this.subscriptions.set(type, dbRef);
    }).catch(err => {
      console.error('[FirebaseSyncAdapter] Subscribe initialization error:', err);
    });
    
    return () => {
      const dbRef = this.subscriptions.get(type);
      if (dbRef) {
        off(dbRef);
        this.subscriptions.delete(type);
      }
    };
  }
  
  async clear(type: OverlayType): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.database) return;
    
    const uid = FirebaseAuthService.getUid();
    if (!uid) return;
    
    const dbRef = ref(this.database, `${this.basePath}/${uid}`);
    try {
      await set(dbRef, null);
    } catch (error) {
      console.error(`Firebase clear error for ${type}:`, error);
    }
  }
  
  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.database) return;
    
    const uid = FirebaseAuthService.getUid();
    if (!uid) return;
    
    const dbRef = ref(this.database, `${this.basePath}/${uid}`);
    try {
      await set(dbRef, null);
    } catch (error) {
      console.error('Firebase clearAll error:', error);
    }
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  dispose(): void {
    // Unsubscribe from all
    for (const [, dbRef] of this.subscriptions) {
      off(dbRef);
    }
    this.subscriptions.clear();
    this.connected = false;
  }
}

// Singleton instance
let defaultInstance: FirebaseSyncAdapter | null = null;

export function getFirebaseSyncAdapter(): FirebaseSyncAdapter {
  if (!defaultInstance) {
    defaultInstance = new FirebaseSyncAdapter();
  }
  return defaultInstance;
}
