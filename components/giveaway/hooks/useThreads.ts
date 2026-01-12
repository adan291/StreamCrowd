/**
 * useThreads Hook
 * Manages giveaway threads (background giveaways) with persistence
 */

import { useState, useCallback, useEffect } from 'react';
import type { 
  GiveawayThread, 
  GiveawayParticipant, 
  SubsGiveawayConfig,
  FinishedGiveaway,
  RaffleMode,
  RaffleTimingConfig
} from '../types';
import { DEFAULT_SUBS_CONFIG } from '../types';
import { GiveawayStorage } from '../services/GiveawayStorage';

// ============================================
// TYPES
// ============================================

export interface CreateThreadConfig {
  name: string;
  keyword?: string;
  mode: RaffleMode;
  subscribersOnly?: boolean;
  allowMultipleEntries?: boolean;
  subsConfig?: SubsGiveawayConfig;
  startsAt?: number;
  endsAt?: number;
  prizeImages?: string[];
  prizeDescription?: string;
  timerDuration?: number;
  startNow?: boolean;
  timingConfig?: RaffleTimingConfig;
}

export interface UseThreadsReturn {
  // State
  threads: GiveawayThread[];
  activeThreads: GiveawayThread[];
  scheduledThreads: GiveawayThread[];
  finishedThreads: GiveawayThread[];
  activeCount: number;
  scheduledCount: number;
  
  // CRUD
  createThread: (config: CreateThreadConfig) => GiveawayThread;
  deleteThread: (id: string) => void;
  updateThread: (id: string, updates: Partial<GiveawayThread>) => void;
  importThread: (thread: GiveawayThread) => void;
  
  // Actions
  toggleThread: (id: string) => void;
  pauseThread: (id: string) => void;
  resumeThread: (id: string) => void;
  togglePause: (id: string) => void;
  
  // Participants
  addParticipant: (threadId: string, participant: GiveawayParticipant) => void;
  addParticipants: (threadId: string, participants: GiveawayParticipant[]) => void;
  removeParticipant: (threadId: string, oderId: string) => void;
  
  // Winner selection
  pickWinner: (threadId: string, blacklist?: Set<string>) => string | null;
  closeThread: (threadId: string) => void;
  getUniqueParticipantCount: (thread: GiveawayThread) => number;
  getTotalEntries: (thread: GiveawayThread) => number;
  
  // Utilities
  getThread: (id: string) => GiveawayThread | undefined;
  hasActiveThreads: () => boolean;
}

// ============================================
// HELPERS
// ============================================

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useThreads(): UseThreadsReturn {
  const [threads, setThreads] = useState<GiveawayThread[]>(() => {
    return GiveawayStorage.getThreads();
  });
  
  // Persist threads to storage
  useEffect(() => {
    GiveawayStorage.saveThreads(threads);
  }, [threads]);
  
  // Auto-activate scheduled threads when their start time arrives
  useEffect(() => {
    const checkScheduledThreads = () => {
      const now = Date.now();
      setThreads(prev => prev.map(thread => {
        // If thread has a startsAt in the past and is not active yet, activate it
        if (thread.startsAt && thread.startsAt <= now && !thread.isActive && !thread.winner) {
          // Calculate new endsAt based on duration
          let newEndsAt = thread.endsAt;
          if (thread.timerDuration && !thread.endsAt) {
            newEndsAt = now + (thread.timerDuration * 1000);
          }
          return {
            ...thread,
            isActive: true,
            startsAt: undefined, // Clear startsAt since it's now active
            endsAt: newEndsAt,
          };
        }
        return thread;
      }));
    };
    
    // Check immediately and then every second
    checkScheduledThreads();
    const interval = setInterval(checkScheduledThreads, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // ============================================
  // CRUD OPERATIONS
  // ============================================
  
  const createThread = useCallback((config: CreateThreadConfig): GiveawayThread => {
    const {
      name,
      keyword = '',
      mode,
      subscribersOnly = false,
      allowMultipleEntries = mode === 'subs',
      subsConfig = DEFAULT_SUBS_CONFIG,
      startsAt,
      endsAt,
      prizeImages,
      prizeDescription,
      timerDuration,
      startNow = true,
      timingConfig,
    } = config;
    
    const now = Date.now();
    let calculatedStartsAt: number | undefined;
    let calculatedEndsAt: number | undefined;
    let shouldBeActive = startNow;
    
    console.log('[createThread] Config received:', { startNow, timingConfig: JSON.stringify(timingConfig), timerDuration });
    
    // Use timingConfig if provided
    if (timingConfig) {
      // Calculate start time
      if (timingConfig.timingMode === 'scheduled' && timingConfig.scheduledStartDate) {
        // Default to 00:00 if no time specified
        const startTime = timingConfig.scheduledStartTime || '00:00';
        const startDateTime = new Date(`${timingConfig.scheduledStartDate}T${startTime}`);
        calculatedStartsAt = startDateTime.getTime();
        shouldBeActive = calculatedStartsAt <= now; // Only active if start time has passed
        console.log('[createThread] Scheduled mode:', { 
          scheduledStartDate: timingConfig.scheduledStartDate,
          scheduledStartTime: startTime,
          calculatedStartsAt, 
          now, 
          shouldBeActive,
          isInFuture: calculatedStartsAt > now
        });
      }
      
      // Calculate end time
      if (timingConfig.durationMode === 'fixed' && timingConfig.fixedDuration > 0) {
        const startTime = calculatedStartsAt || now;
        calculatedEndsAt = startTime + (timingConfig.fixedDuration * 1000);
      } else if (timingConfig.durationMode === 'until' && timingConfig.endDate) {
        // Default to 23:59 if no end time specified
        const endTime = timingConfig.endTime || '23:59';
        const endDateTime = new Date(`${timingConfig.endDate}T${endTime}`);
        calculatedEndsAt = endDateTime.getTime();
      } else if (timingConfig.durationMode === 'manual') {
        // No end time - manual finish
        calculatedEndsAt = undefined;
      }
    } else {
      // Legacy: Calculate endsAt if timerDuration is provided and startNow is true
      if (startNow && timerDuration && timerDuration > 0 && !endsAt) {
        calculatedEndsAt = now + (timerDuration * 1000);
      } else {
        calculatedEndsAt = endsAt;
        calculatedStartsAt = startsAt;
      }
    }
    
    console.log('[createThread] Final values:', { 
      shouldBeActive, 
      calculatedStartsAt, 
      calculatedEndsAt,
      willBeScheduled: !shouldBeActive && calculatedStartsAt && calculatedStartsAt > now
    });
    
    const newThread: GiveawayThread = {
      id: generateId(),
      name,
      keyword,
      isActive: shouldBeActive,
      isPaused: false,
      participants: [],
      createdAt: now,
      subscribersOnly: mode === 'subs' ? true : subscribersOnly,
      allowMultipleEntries,
      mode,
      subsConfig: mode === 'subs' ? subsConfig : undefined,
      startsAt: calculatedStartsAt,
      endsAt: calculatedEndsAt,
      prizeImages,
      prizeDescription,
      timerDuration: timingConfig?.fixedDuration || timerDuration,
      timingConfig,
    };
    
    setThreads(prev => [...prev, newThread]);
    return newThread;
  }, []);
  
  const deleteThread = useCallback((id: string): void => {
    setThreads(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const updateThread = useCallback((id: string, updates: Partial<GiveawayThread>): void => {
    setThreads(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  }, []);
  
  const importThread = useCallback((thread: GiveawayThread): void => {
    setThreads(prev => {
      // Check if thread already exists
      const exists = prev.some(t => t.id === thread.id);
      if (exists) return prev;
      return [...prev, thread];
    });
  }, []);
  
  // ============================================
  // THREAD ACTIONS
  // ============================================
  
  const toggleThread = useCallback((id: string): void => {
    setThreads(prev => prev.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    ));
  }, []);
  
  const pauseThread = useCallback((id: string): void => {
    setThreads(prev => prev.map(t => {
      if (t.id !== id) return t;
      
      // Calculate remaining time if thread has endsAt
      let timeRemaining: number | undefined;
      if (t.endsAt) {
        timeRemaining = Math.max(0, Math.floor((t.endsAt - Date.now()) / 1000));
      }
      
      return { 
        ...t, 
        isPaused: true,
        timeRemaining,
      };
    }));
  }, []);
  
  const resumeThread = useCallback((id: string): void => {
    setThreads(prev => prev.map(t => {
      if (t.id !== id) return t;
      
      // Recalculate endsAt based on remaining time
      let newEndsAt = t.endsAt;
      if (t.timeRemaining !== undefined && t.timeRemaining > 0) {
        newEndsAt = Date.now() + (t.timeRemaining * 1000);
      }
      
      return { 
        ...t, 
        isPaused: false,
        endsAt: newEndsAt,
        timeRemaining: undefined,
      };
    }));
  }, []);
  
  const togglePause = useCallback((id: string): void => {
    const thread = threads.find(t => t.id === id);
    if (!thread) return;
    
    if (thread.isPaused) {
      resumeThread(id);
    } else {
      pauseThread(id);
    }
  }, [threads, pauseThread, resumeThread]);
  
  // ============================================
  // PARTICIPANT MANAGEMENT
  // ============================================
  
  const addParticipant = useCallback((threadId: string, participant: GiveawayParticipant): void => {
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId) return t;
      
      // Check for duplicates if not allowing multiple entries
      if (!t.allowMultipleEntries) {
        const exists = t.participants.some(p => p.oderId === participant.oderId);
        if (exists) return t;
      }
      
      return {
        ...t,
        participants: [...t.participants, participant],
      };
    }));
  }, []);
  
  const addParticipants = useCallback((threadId: string, participants: GiveawayParticipant[]): void => {
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId) return t;
      
      let newParticipants = participants;
      
      // Filter duplicates if not allowing multiple entries
      if (!t.allowMultipleEntries) {
        const existingIds = new Set(t.participants.map(p => p.oderId));
        newParticipants = participants.filter(p => !existingIds.has(p.oderId));
      }
      
      return {
        ...t,
        participants: [...t.participants, ...newParticipants],
      };
    }));
  }, []);
  
  const removeParticipant = useCallback((threadId: string, oderId: string): void => {
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId) return t;
      
      return {
        ...t,
        participants: t.participants.filter(p => p.oderId !== oderId),
      };
    }));
  }, []);
  
  // ============================================
  // WINNER SELECTION
  // ============================================
  
  const pickWinner = useCallback((threadId: string, blacklist?: Set<string>): string | null => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread || thread.participants.length === 0) return null;
    
    let candidates: string[];
    
    if (thread.mode === 'subs') {
      // For subs mode, use all entries (weighted)
      candidates = thread.participants.map(p => p.username);
    } else {
      // For keyword mode, use unique participants
      const uniqueMap = new Map<string, GiveawayParticipant>();
      thread.participants.forEach(p => uniqueMap.set(p.oderId, p));
      candidates = Array.from(uniqueMap.values()).map(p => p.username);
    }
    
    // Filter blacklisted users
    if (blacklist && blacklist.size > 0) {
      candidates = candidates.filter(name => !blacklist.has(name.toLowerCase()));
    }
    
    if (candidates.length === 0) return null;
    
    // Random selection
    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const winner = candidates[winnerIndex];
    
    // Find winner participant
    const winnerParticipant = thread.participants.find(p => p.username === winner);
    
    // Mark thread with winner (don't delete yet - user will close it)
    setThreads(prev => prev.map(t => 
      t.id === threadId 
        ? { 
            ...t, 
            isActive: false, 
            winner: winnerParticipant,
            closedAt: Date.now(),
          } 
        : t
    ));
    
    return winner;
  }, [threads]);
  
  // Close thread and save to history (called when user dismisses winner)
  const closeThread = useCallback((threadId: string): void => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    
    // Only save to history if there's a winner
    if (thread.winner) {
      const finished: FinishedGiveaway = {
        id: thread.id,
        name: thread.name,
        keyword: thread.keyword,
        mode: thread.mode as RaffleMode,
        winner: thread.winner.username,
        participantCount: new Set(thread.participants.map(p => p.oderId)).size,
        subscribersOnly: thread.subscribersOnly,
        createdAt: thread.createdAt,
        finishedAt: thread.closedAt || Date.now(),
      };
      
      GiveawayStorage.addToHistory(finished);
      GiveawayStorage.updateStats(finished);
    }
    
    // Remove thread
    setThreads(prev => prev.filter(t => t.id !== threadId));
  }, [threads]);
  
  const getUniqueParticipantCount = useCallback((thread: GiveawayThread): number => {
    return new Set(thread.participants.map(p => p.oderId)).size;
  }, []);
  
  const getTotalEntries = useCallback((thread: GiveawayThread): number => {
    return thread.participants.length;
  }, []);
  
  // ============================================
  // UTILITIES
  // ============================================
  
  const getThread = useCallback((id: string): GiveawayThread | undefined => {
    return threads.find(t => t.id === id);
  }, [threads]);
  
  const hasActiveThreads = useCallback((): boolean => {
    return threads.some(t => t.isActive);
  }, [threads]);
  
  // ============================================
  // DERIVED STATE
  // ============================================
  
  const now = Date.now();
  
  // Active threads: isActive=true, no winner, and (no startsAt OR startsAt has passed)
  const activeThreads = threads.filter(t => 
    t.isActive && 
    !t.winner && 
    (!t.startsAt || t.startsAt <= now)
  );
  
  // Scheduled threads: have startsAt in the future, no winner
  const scheduledThreads = threads.filter(t => 
    !t.winner && 
    t.startsAt && 
    t.startsAt > now
  );
  
  // Finished threads: have a winner but not yet closed
  const finishedThreads = threads.filter(t => t.winner);
  
  const activeCount = activeThreads.length;
  const scheduledCount = scheduledThreads.length;
  
  return {
    // State
    threads,
    activeThreads,
    scheduledThreads,
    finishedThreads,
    activeCount,
    scheduledCount,
    
    // CRUD
    createThread,
    deleteThread,
    updateThread,
    importThread,
    
    // Actions
    toggleThread,
    pauseThread,
    resumeThread,
    togglePause,
    
    // Participants
    addParticipant,
    addParticipants,
    removeParticipant,
    
    // Winner selection
    pickWinner,
    closeThread,
    getUniqueParticipantCount,
    getTotalEntries,
    
    // Utilities
    getThread,
    hasActiveThreads,
  };
}

export default useThreads;
