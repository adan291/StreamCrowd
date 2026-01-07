/**
 * FirebaseSyncAdapter - Implementación de IOverlaySync para Firebase
 * 
 * Este adapter envuelve Firebase Realtime Database para sincronizar
 * estado entre el panel de control y los overlays.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, off, Database, DatabaseReference } from 'firebase/database';
import type { 
  IOverlaySync, 
  OverlayType, 
  OverlayState, 
  SyncCallback 
} from '../../domain/ports/IOverlaySync';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "REDACTED_FIREBASE_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "twtich-vote-live.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://twtich-vote-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "twtich-vote-live",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "twtich-vote-live.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "779005710594",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:779005710594:web:8df44b0c02a57fc262b21b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TJZ968LQPC"
};

interface FirebaseSyncConfig {
  firebaseConfig?: typeof DEFAULT_FIREBASE_CONFIG;
  basePath?: string;
}

export class FirebaseSyncAdapter implements IOverlaySync {
  readonly syncId = 'firebase';
  
  private app: FirebaseApp;
  private database: Database;
  private basePath: string;
  private subscriptions = new Map<string, DatabaseReference>();
  private connected = false;
  
  constructor(config: FirebaseSyncConfig = {}) {
    const firebaseConfig = config.firebaseConfig || DEFAULT_FIREBASE_CONFIG;
    this.basePath = config.basePath || 'overlays';
    
    this.app = initializeApp(firebaseConfig);
    this.database = getDatabase(this.app);
    this.connected = true;
  }
  
  async publish<T>(type: OverlayType, data: T): Promise<void> {
    const dbRef = ref(this.database, `${this.basePath}/${type}`);
    const state: OverlayState<T> = {
      type,
      data,
      updatedAt: Date.now(),
      isActive: true,
    };
    
    try {
      await set(dbRef, state);
    } catch (error) {
      console.error(`Firebase sync error for ${type}:`, error);
      throw error;
    }
  }
  
  subscribe<T>(type: OverlayType, callback: SyncCallback<T>): () => void {
    const dbRef = ref(this.database, `${this.basePath}/${type}`);
    
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      callback(data as OverlayState<T> | null);
    }, (error) => {
      console.error(`Firebase subscription error for ${type}:`, error);
    });
    
    this.subscriptions.set(type, dbRef);
    
    return () => {
      off(dbRef);
      this.subscriptions.delete(type);
    };
  }
  
  async clear(type: OverlayType): Promise<void> {
    const dbRef = ref(this.database, `${this.basePath}/${type}`);
    try {
      await set(dbRef, null);
    } catch (error) {
      console.error(`Firebase clear error for ${type}:`, error);
    }
  }
  
  async clearAll(): Promise<void> {
    const dbRef = ref(this.database, this.basePath);
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
