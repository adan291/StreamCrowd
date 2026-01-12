/**
 * useGiveawayCloud - Hook para sincronizar sorteos con Firebase
 * 
 * Permite guardar y recuperar sorteos de la nube automáticamente.
 */

import { useState, useEffect, useCallback } from 'react';
import { GiveawayFirebaseService, type FirebaseGiveaway } from '../src/infrastructure/firebase/GiveawayFirebaseService';
import type { GiveawayThread } from '../components/giveaway/index';

// Storage key for sync preferences
const SYNC_ENABLED_KEY = 'giveaway_cloud_sync_enabled';
const LAST_SYNC_KEY = 'giveaway_last_cloud_sync';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface UseGiveawayCloudOptions {
  autoSync?: boolean; // Sincronizar automáticamente al crear/actualizar sorteos
}

interface UseGiveawayCloudReturn {
  // Estado
  isReady: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  syncEnabled: boolean;
  lastSyncTime: number | null;
  cloudGiveaways: FirebaseGiveaway[];
  error: string | null;
  
  // Configuración
  setSyncEnabled: (enabled: boolean) => void;
  
  // Acciones
  saveToCloud: (giveaway: GiveawayThread, isPublic?: boolean) => Promise<boolean>;
  updateInCloud: (giveawayId: string, updates: Partial<FirebaseGiveaway>) => Promise<void>;
  deleteFromCloud: (giveawayId: string) => Promise<void>;
  loadFromCloud: () => Promise<FirebaseGiveaway[]>;
  
  // Sync
  syncGiveaway: (giveaway: GiveawayThread) => Promise<void>;
  syncAll: (localThreads: GiveawayThread[]) => Promise<void>;
  manualSync: () => Promise<void>;
}

export function useGiveawayCloud(options: UseGiveawayCloudOptions = {}): UseGiveawayCloudReturn {
  const { autoSync = true } = options;
  
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [cloudGiveaways, setCloudGiveaways] = useState<FirebaseGiveaway[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(LAST_SYNC_KEY);
    return saved ? parseInt(saved, 10) : null;
  });
  const [syncEnabled, setSyncEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(SYNC_ENABLED_KEY);
    return saved !== null ? saved === 'true' : true; // Default enabled
  });

  // Persist sync preference
  const setSyncEnabled = useCallback((enabled: boolean) => {
    setSyncEnabledState(enabled);
    localStorage.setItem(SYNC_ENABLED_KEY, String(enabled));
  }, []);

  // Update last sync time
  const updateLastSync = useCallback(() => {
    const now = Date.now();
    setLastSyncTime(now);
    localStorage.setItem(LAST_SYNC_KEY, String(now));
  }, []);

  // Initialize and check if service is ready
  useEffect(() => {
    const checkReady = async () => {
      try {
        await GiveawayFirebaseService.initialize();
        const ready = GiveawayFirebaseService.isReady();
        setIsReady(ready);
        setSyncStatus(ready ? 'idle' : 'offline');
      } catch (err) {
        console.error('[useGiveawayCloud] Init error:', err);
        setError('Error al conectar con la nube');
        setSyncStatus('offline');
      }
    };
    
    checkReady();
    
    // Re-check periodically (in case user logs in later)
    const interval = setInterval(() => {
      const ready = GiveawayFirebaseService.isReady();
      setIsReady(ready);
      if (!ready && syncStatus !== 'offline') {
        setSyncStatus('offline');
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [syncStatus]);

  // Load giveaways when ready
  useEffect(() => {
    if (isReady && syncEnabled) {
      loadFromCloud();
    }
  }, [isReady, syncEnabled]);

  const saveToCloud = useCallback(async (giveaway: GiveawayThread, isPublic: boolean = true): Promise<boolean> => {
    if (!isReady || !syncEnabled) {
      console.warn('[useGiveawayCloud] Service not ready or sync disabled');
      return false;
    }
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    setError(null);
    
    try {
      const id = await GiveawayFirebaseService.saveGiveaway(giveaway, isPublic);
      if (id) {
        await loadFromCloud();
        updateLastSync();
        setSyncStatus('synced');
        return true;
      }
      setSyncStatus('error');
      return false;
    } catch (err) {
      console.error('[useGiveawayCloud] Save error:', err);
      setError('Error al guardar en la nube');
      setSyncStatus('error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isReady, syncEnabled, updateLastSync]);

  const updateInCloud = useCallback(async (giveawayId: string, updates: Partial<FirebaseGiveaway>): Promise<void> => {
    if (!isReady || !syncEnabled) return;
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      await GiveawayFirebaseService.updateGiveaway(giveawayId, updates);
      await loadFromCloud();
      updateLastSync();
      setSyncStatus('synced');
    } catch (err) {
      console.error('[useGiveawayCloud] Update error:', err);
      setError('Error al actualizar en la nube');
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [isReady, syncEnabled, updateLastSync]);

  const deleteFromCloud = useCallback(async (giveawayId: string): Promise<void> => {
    if (!isReady || !syncEnabled) return;
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      await GiveawayFirebaseService.deleteGiveaway(giveawayId);
      setCloudGiveaways(prev => prev.filter(g => g.id !== giveawayId));
      updateLastSync();
      setSyncStatus('synced');
    } catch (err) {
      console.error('[useGiveawayCloud] Delete error:', err);
      setError('Error al eliminar de la nube');
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [isReady, syncEnabled, updateLastSync]);

  const loadFromCloud = useCallback(async (): Promise<FirebaseGiveaway[]> => {
    if (!isReady) return [];
    
    setIsSyncing(true);
    try {
      const giveaways = await GiveawayFirebaseService.getMyGiveaways();
      setCloudGiveaways(giveaways);
      setError(null);
      return giveaways;
    } catch (err) {
      console.error('[useGiveawayCloud] Load error:', err);
      setError('Error al cargar de la nube');
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, [isReady]);

  // Auto-sync helper
  const syncGiveaway = useCallback(async (giveaway: GiveawayThread): Promise<void> => {
    if (!autoSync || !isReady || !syncEnabled) return;
    
    // Check if exists in cloud
    const existing = cloudGiveaways.find(g => g.id === giveaway.id);
    
    if (existing) {
      // Update
      await GiveawayFirebaseService.updateGiveaway(giveaway.id, {
        isActive: giveaway.isActive,
        isPaused: giveaway.isPaused,
        winner: giveaway.winner,
        participantCount: giveaway.participants?.length || 0,
        closedAt: giveaway.closedAt,
      });
    } else {
      // Create new
      await saveToCloud(giveaway, true);
    }
  }, [autoSync, isReady, syncEnabled, cloudGiveaways, saveToCloud]);

  // Sync all local threads to cloud
  const syncAll = useCallback(async (localThreads: GiveawayThread[]): Promise<void> => {
    if (!isReady || !syncEnabled) return;
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    try {
      for (const thread of localThreads) {
        await GiveawayFirebaseService.saveGiveaway(thread, true);
      }
      await loadFromCloud();
      updateLastSync();
      setSyncStatus('synced');
    } catch (err) {
      console.error('[useGiveawayCloud] Sync all error:', err);
      setError('Error al sincronizar');
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [isReady, syncEnabled, loadFromCloud, updateLastSync]);

  // Manual sync button handler
  const manualSync = useCallback(async (): Promise<void> => {
    if (!isReady) return;
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    try {
      await loadFromCloud();
      updateLastSync();
      setSyncStatus('synced');
    } catch (err) {
      console.error('[useGiveawayCloud] Manual sync error:', err);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [isReady, loadFromCloud, updateLastSync]);

  return {
    isReady,
    isSyncing,
    syncStatus,
    syncEnabled,
    lastSyncTime,
    cloudGiveaways,
    error,
    setSyncEnabled,
    saveToCloud,
    updateInCloud,
    deleteFromCloud,
    loadFromCloud,
    syncGiveaway,
    syncAll,
    manualSync,
  };
}

export default useGiveawayCloud;
