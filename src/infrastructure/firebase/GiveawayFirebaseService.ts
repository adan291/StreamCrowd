/**
 * GiveawayFirebaseService - Sincroniza sorteos con Firebase
 * 
 * Permite guardar sorteos en la nube para:
 * 1. Backup automático de datos del streamer
 * 2. Web pública donde viewers pueden ver sorteos activos
 * 
 * Estructura en Firebase:
 * /streamers/{twitchId}/
 *   - profile: { twitchId, displayName, profileImage, channel }
 *   - sorteos/{sorteoId}: { ...GiveawayThread, isPublic }
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  push,
  update,
  remove,
  onValue,
  off,
  Database,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import { FirebaseAuthService } from '../auth/FirebaseAuthService';
import type { GiveawayThread } from '../../../components/giveaway/index';

// Firebase config - Uses environment variables (set in .env.local or Vercel)
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

export interface StreamerProfile {
  twitchId: string;
  displayName: string;
  profileImage?: string;
  channel: string;
  updatedAt: number;
}

export interface FirebaseGiveaway extends Omit<GiveawayThread, 'participants'> {
  isPublic: boolean;
  participantCount: number;
  streamerId: string;
  streamerName: string;
}

export interface GiveawayUpdateData {
  isActive?: boolean;
  isPaused?: boolean;
  winner?: { oderId: string; username: string };
  participantCount?: number;
  isPublic?: boolean;
  closedAt?: number;
}

// ============================================
// Helper to remove undefined values (Firebase doesn't accept them)
// ============================================

function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// ============================================
// Service
// ============================================

class GiveawayFirebaseServiceImpl {
  private app: FirebaseApp | null = null;
  private database: Database | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private currentStreamerId: string | null = null;
  private currentStreamerName: string | null = null;
  private listeners: Map<string, () => void> = new Map();

  constructor() {
    // Restore streamer from localStorage on init
    this.restoreStreamer();
  }

  private restoreStreamer(): void {
    try {
      const saved = localStorage.getItem('giveaway_firebase_streamer');
      if (saved) {
        const data = JSON.parse(saved);
        this.currentStreamerId = data.id || null;
        this.currentStreamerName = data.name || null;
        console.log('[GiveawayFirebase] Restored streamer from storage:', this.currentStreamerId);
      }
    } catch {}
  }

  private saveStreamer(): void {
    try {
      if (this.currentStreamerId) {
        localStorage.setItem('giveaway_firebase_streamer', JSON.stringify({
          id: this.currentStreamerId,
          name: this.currentStreamerName,
        }));
      } else {
        localStorage.removeItem('giveaway_firebase_streamer');
      }
    } catch {}
  }

  /**
   * Initialize Firebase connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Initialize Firebase Auth first
      await FirebaseAuthService.initialize();

      // Get or create Firebase app
      const apps = getApps();
      this.app = apps.length > 0 ? apps[0] : initializeApp(FIREBASE_CONFIG, 'giveaway-service');
      this.database = getDatabase(this.app);
      this.initialized = true;
      
      console.log('[GiveawayFirebase] Initialized');
    } catch (err) {
      console.error('[GiveawayFirebase] Init error:', err);
      throw err;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Set the current streamer (call after Twitch login)
   */
  setStreamer(twitchId: string, displayName: string, profileImage?: string, channel?: string): void {
    console.log('[GiveawayFirebase] setStreamer called:', { twitchId, displayName, channel });
    this.currentStreamerId = twitchId;
    this.currentStreamerName = displayName;
    this.saveStreamer();
    FirebaseAuthService.linkPlatformId(twitchId);
    
    // Update profile in Firebase
    this.updateStreamerProfile({
      twitchId,
      displayName,
      profileImage,
      channel: channel || displayName.toLowerCase(),
      updatedAt: Date.now(),
    }).catch(err => console.error('[GiveawayFirebase] Error updating profile:', err));
    
    console.log('[GiveawayFirebase] Streamer configured, isReady:', this.isReady());
  }

  /**
   * Update streamer profile in Firebase
   */
  async updateStreamerProfile(profile: StreamerProfile): Promise<void> {
    await this.ensureInitialized();
    if (!this.database || !profile.twitchId) return;

    // Remove undefined values (Firebase doesn't accept them)
    const cleanProfile: Record<string, unknown> = {
      twitchId: profile.twitchId,
      displayName: profile.displayName,
      channel: profile.channel,
      updatedAt: profile.updatedAt,
    };
    
    // Only add profileImage if it exists
    if (profile.profileImage) {
      cleanProfile.profileImage = profile.profileImage;
    }

    const profileRef = ref(this.database, `streamers/${profile.twitchId}/profile`);
    await set(profileRef, cleanProfile);
    console.log('[GiveawayFirebase] Profile updated:', profile.displayName);
  }

  /**
   * Save a giveaway to Firebase
   */
  async saveGiveaway(giveaway: GiveawayThread, isPublic: boolean = true): Promise<string | null> {
    console.log('[GiveawayFirebase] saveGiveaway called:', { id: giveaway.id, name: giveaway.name, isPublic });
    
    await this.ensureInitialized();
    if (!this.database || !this.currentStreamerId) {
      console.warn('[GiveawayFirebase] Cannot save: not initialized or no streamer set', {
        hasDatabase: !!this.database,
        currentStreamerId: this.currentStreamerId,
        initialized: this.initialized
      });
      return null;
    }

    try {
      const streamerProfile = await this.getStreamerProfile(this.currentStreamerId);
      
      // Build giveaway object, removing undefined values
      const firebaseGiveaway = removeUndefined({
        id: giveaway.id,
        name: giveaway.name,
        keyword: giveaway.keyword || '',
        mode: giveaway.mode,
        isActive: giveaway.isActive ?? false,
        isPaused: giveaway.isPaused ?? false,
        subscribersOnly: giveaway.subscribersOnly ?? false,
        allowMultipleEntries: giveaway.allowMultipleEntries ?? false,
        createdAt: giveaway.createdAt,
        closedAt: giveaway.closedAt || null,
        winner: giveaway.winner || null,
        prizeImages: giveaway.prizeImages || [],
        endsAt: giveaway.endsAt || null,
        startsAt: giveaway.startsAt || null,
        participantCount: giveaway.participants?.length || 0,
        isPublic,
        streamerId: this.currentStreamerId,
        streamerName: streamerProfile?.displayName || 'Unknown',
      });

      console.log('[GiveawayFirebase] Saving to path:', `streamers/${this.currentStreamerId}/sorteos/${giveaway.id}`);
      
      const giveawayRef = ref(this.database, `streamers/${this.currentStreamerId}/sorteos/${giveaway.id}`);
      await set(giveawayRef, firebaseGiveaway);
      
      console.log('[GiveawayFirebase] Giveaway saved successfully:', giveaway.name);
      return giveaway.id;
    } catch (err) {
      console.error('[GiveawayFirebase] Error saving giveaway:', err);
      return null;
    }
  }

  /**
   * Update a giveaway in Firebase
   */
  async updateGiveaway(giveawayId: string, updates: GiveawayUpdateData): Promise<void> {
    await this.ensureInitialized();
    if (!this.database || !this.currentStreamerId) return;

    try {
      const giveawayRef = ref(this.database, `streamers/${this.currentStreamerId}/sorteos/${giveawayId}`);
      await update(giveawayRef, {
        ...updates,
        updatedAt: Date.now(),
      });
      console.log('[GiveawayFirebase] Giveaway updated:', giveawayId);
    } catch (err) {
      console.error('[GiveawayFirebase] Error updating giveaway:', err);
    }
  }

  /**
   * Delete a giveaway from Firebase
   */
  async deleteGiveaway(giveawayId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.database || !this.currentStreamerId) return;

    try {
      const giveawayRef = ref(this.database, `streamers/${this.currentStreamerId}/sorteos/${giveawayId}`);
      await remove(giveawayRef);
      console.log('[GiveawayFirebase] Giveaway deleted:', giveawayId);
    } catch (err) {
      console.error('[GiveawayFirebase] Error deleting giveaway:', err);
    }
  }

  /**
   * Get all giveaways for current streamer
   */
  async getMyGiveaways(): Promise<FirebaseGiveaway[]> {
    console.log('[GiveawayFirebase] getMyGiveaways called, streamerId:', this.currentStreamerId);
    await this.ensureInitialized();
    if (!this.database || !this.currentStreamerId) {
      console.warn('[GiveawayFirebase] getMyGiveaways: not ready', { 
        hasDatabase: !!this.database, 
        streamerId: this.currentStreamerId 
      });
      return [];
    }

    try {
      const path = `streamers/${this.currentStreamerId}/sorteos`;
      console.log('[GiveawayFirebase] Reading from path:', path);
      const sorteosRef = ref(this.database, path);
      const snapshot = await get(sorteosRef);
      
      if (!snapshot.exists()) {
        console.log('[GiveawayFirebase] No giveaways found at path');
        return [];
      }
      
      const giveaways: FirebaseGiveaway[] = [];
      snapshot.forEach((child) => {
        giveaways.push({ ...child.val(), id: child.key });
      });
      
      console.log('[GiveawayFirebase] Found', giveaways.length, 'giveaways');
      return giveaways.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.error('[GiveawayFirebase] Error getting giveaways:', err);
      return [];
    }
  }

  // ============================================
  // Public API (for viewer website)
  // ============================================

  /**
   * Get streamer profile by Twitch ID
   */
  async getStreamerProfile(twitchId: string): Promise<StreamerProfile | null> {
    await this.ensureInitialized();
    if (!this.database) return null;

    try {
      const profileRef = ref(this.database, `streamers/${twitchId}/profile`);
      const snapshot = await get(profileRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (err) {
      console.error('[GiveawayFirebase] Error getting profile:', err);
      return null;
    }
  }

  /**
   * Get public giveaways for a streamer (for viewer website)
   */
  async getPublicGiveaways(twitchId: string): Promise<FirebaseGiveaway[]> {
    await this.ensureInitialized();
    if (!this.database) return [];

    try {
      const sorteosRef = ref(this.database, `streamers/${twitchId}/sorteos`);
      const snapshot = await get(sorteosRef);
      
      if (!snapshot.exists()) return [];
      
      const giveaways: FirebaseGiveaway[] = [];
      snapshot.forEach((child) => {
        const giveaway = child.val();
        if (giveaway.isPublic) {
          giveaways.push({ ...giveaway, id: child.key });
        }
      });
      
      return giveaways.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.error('[GiveawayFirebase] Error getting public giveaways:', err);
      return [];
    }
  }

  /**
   * Get active public giveaways for a streamer
   */
  async getActivePublicGiveaways(twitchId: string): Promise<FirebaseGiveaway[]> {
    const giveaways = await this.getPublicGiveaways(twitchId);
    return giveaways.filter(g => g.isActive && !g.winner);
  }

  /**
   * Subscribe to giveaway updates (realtime)
   */
  subscribeToGiveaways(twitchId: string, callback: (giveaways: FirebaseGiveaway[]) => void): () => void {
    if (!this.database) {
      this.initialize().then(() => {
        if (this.database) {
          this.setupSubscription(twitchId, callback);
        }
      });
      return () => {};
    }

    return this.setupSubscription(twitchId, callback);
  }

  private setupSubscription(twitchId: string, callback: (giveaways: FirebaseGiveaway[]) => void): () => void {
    if (!this.database) return () => {};

    const sorteosRef = ref(this.database, `streamers/${twitchId}/sorteos`);
    
    const unsubscribe = onValue(sorteosRef, (snapshot) => {
      const giveaways: FirebaseGiveaway[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const giveaway = child.val();
          if (giveaway.isPublic) {
            giveaways.push({ ...giveaway, id: child.key });
          }
        });
      }
      callback(giveaways.sort((a, b) => b.createdAt - a.createdAt));
    });

    const key = `giveaways_${twitchId}`;
    this.listeners.set(key, () => off(sorteosRef));

    return () => {
      off(sorteosRef);
      this.listeners.delete(key);
    };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized && !!this.currentStreamerId;
  }

  /**
   * Get current streamer ID
   */
  getCurrentStreamerId(): string | null {
    return this.currentStreamerId;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
    this.currentStreamerId = null;
    this.currentStreamerName = null;
    this.saveStreamer(); // Clear from localStorage
  }
}

// Singleton export
export const GiveawayFirebaseService = new GiveawayFirebaseServiceImpl();
export default GiveawayFirebaseService;
