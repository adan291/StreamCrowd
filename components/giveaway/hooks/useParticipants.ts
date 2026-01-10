/**
 * useParticipants Hook
 * Manages participant state for giveaways with blacklist support
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GiveawayStorage } from '../services/GiveawayStorage';

export type ParticipantSource = 'manual' | 'chat' | 'import' | 'chatter';

export interface UseParticipantsReturn {
  // State
  participants: Set<string>;
  participantSources: Map<string, ParticipantSource>;
  count: number;
  blacklist: Set<string>;
  blacklistCount: number;
  
  // Participant actions
  add: (name: string, source?: ParticipantSource) => boolean;
  addMultiple: (names: string[], source?: ParticipantSource) => number;
  remove: (name: string) => void;
  clear: () => void;
  has: (name: string) => boolean;
  
  // Blacklist actions
  addToBlacklist: (name: string) => void;
  removeFromBlacklist: (name: string) => void;
  isBlacklisted: (name: string) => boolean;
  filterBlacklisted: (names: string[]) => string[];
  clearBlacklist: () => void;
  
  // Import/Export
  exportList: () => string;
  importList: (content: string) => { added: number; duplicates: number; excluded: number };
  exportBlacklist: () => string;
  importBlacklist: (content: string) => number;
  
  // Utilities
  getAll: () => string[];
  getFiltered: () => string[];
}

export interface UseParticipantsOptions {
  persistBlacklist?: boolean;
  initialParticipants?: string[];
}

export function useParticipants(options: UseParticipantsOptions = {}): UseParticipantsReturn {
  const { persistBlacklist = true, initialParticipants = [] } = options;
  
  // Participants state
  const [participants, setParticipants] = useState<Set<string>>(() => {
    return new Set(initialParticipants.map(p => p.toLowerCase().trim()));
  });
  const participantsRef = useRef<Set<string>>(participants);
  
  // Participant sources tracking
  const [participantSources, setParticipantSources] = useState<Map<string, ParticipantSource>>(() => new Map());
  const sourcesRef = useRef<Map<string, ParticipantSource>>(participantSources);
  
  // Blacklist state
  const [blacklist, setBlacklist] = useState<Set<string>>(() => {
    if (persistBlacklist) {
      const saved = GiveawayStorage.getBlacklist();
      return new Set(saved);
    }
    return new Set();
  });
  const blacklistRef = useRef<Set<string>>(blacklist);
  
  // Keep refs in sync
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);
  
  useEffect(() => {
    sourcesRef.current = participantSources;
  }, [participantSources]);
  
  useEffect(() => {
    blacklistRef.current = blacklist;
  }, [blacklist]);
  
  // Persist blacklist changes
  useEffect(() => {
    if (persistBlacklist) {
      GiveawayStorage.saveBlacklist(Array.from(blacklist));
    }
  }, [blacklist, persistBlacklist]);
  
  // ============================================
  // PARTICIPANT ACTIONS
  // ============================================
  
  const add = useCallback((name: string, source: ParticipantSource = 'manual'): boolean => {
    const normalized = name.toLowerCase().trim();
    if (!normalized) return false;
    
    // Check if already in participants
    if (participantsRef.current.has(normalized)) {
      return false; // Already exists
    }
    
    // Check if in blacklist (excluidos)
    if (blacklistRef.current.has(normalized)) {
      return false; // Is excluded
    }
    
    participantsRef.current.add(normalized);
    sourcesRef.current.set(normalized, source);
    setParticipants(new Set(participantsRef.current));
    setParticipantSources(new Map(sourcesRef.current));
    return true;
  }, []);
  
  const addMultiple = useCallback((names: string[], source: ParticipantSource = 'manual'): number => {
    let added = 0;
    names.forEach(name => {
      const normalized = name.toLowerCase().trim();
      if (normalized && 
          !participantsRef.current.has(normalized) && 
          !blacklistRef.current.has(normalized)) {
        participantsRef.current.add(normalized);
        sourcesRef.current.set(normalized, source);
        added++;
      }
    });
    
    if (added > 0) {
      setParticipants(new Set(participantsRef.current));
      setParticipantSources(new Map(sourcesRef.current));
    }
    
    return added;
  }, []);
  
  const remove = useCallback((name: string): void => {
    const normalized = name.toLowerCase().trim();
    participantsRef.current.delete(normalized);
    sourcesRef.current.delete(normalized);
    setParticipants(new Set(participantsRef.current));
    setParticipantSources(new Map(sourcesRef.current));
  }, []);
  
  const clear = useCallback((): void => {
    participantsRef.current = new Set();
    sourcesRef.current = new Map();
    setParticipants(new Set());
    setParticipantSources(new Map());
  }, []);
  
  const has = useCallback((name: string): boolean => {
    return participantsRef.current.has(name.toLowerCase().trim());
  }, []);
  
  // ============================================
  // BLACKLIST ACTIONS
  // ============================================
  
  const addToBlacklist = useCallback((name: string): void => {
    const normalized = name.toLowerCase().trim();
    if (!normalized) return;
    
    blacklistRef.current.add(normalized);
    setBlacklist(new Set(blacklistRef.current));
  }, []);
  
  const removeFromBlacklist = useCallback((name: string): void => {
    const normalized = name.toLowerCase().trim();
    blacklistRef.current.delete(normalized);
    setBlacklist(new Set(blacklistRef.current));
  }, []);
  
  const isBlacklisted = useCallback((name: string): boolean => {
    return blacklistRef.current.has(name.toLowerCase().trim());
  }, []);
  
  const filterBlacklisted = useCallback((names: string[]): string[] => {
    return names.filter(name => !blacklistRef.current.has(name.toLowerCase().trim()));
  }, []);
  
  const clearBlacklist = useCallback((): void => {
    blacklistRef.current = new Set();
    setBlacklist(new Set());
  }, []);
  
  // ============================================
  // IMPORT/EXPORT
  // ============================================
  
  const exportList = useCallback((): string => {
    return Array.from(participantsRef.current).join('\n');
  }, []);
  
  const importList = useCallback((content: string): { added: number; duplicates: number; excluded: number } => {
    const lines = content
      .split(/[\n\r]+/)
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0);
    
    let added = 0;
    let duplicates = 0;
    let excluded = 0;
    
    lines.forEach(name => {
      if (blacklistRef.current.has(name)) {
        excluded++;
      } else if (participantsRef.current.has(name)) {
        duplicates++;
      } else {
        participantsRef.current.add(name);
        sourcesRef.current.set(name, 'import');
        added++;
      }
    });
    
    if (added > 0) {
      setParticipants(new Set(participantsRef.current));
      setParticipantSources(new Map(sourcesRef.current));
    }
    
    return { added, duplicates, excluded };
  }, []);
  
  const exportBlacklist = useCallback((): string => {
    return Array.from(blacklistRef.current).join('\n');
  }, []);
  
  const importBlacklist = useCallback((content: string): number => {
    const lines = content
      .split(/[\n\r]+/)
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0);
    
    let added = 0;
    lines.forEach(name => {
      if (!blacklistRef.current.has(name)) {
        blacklistRef.current.add(name);
        added++;
      }
    });
    
    if (added > 0) {
      setBlacklist(new Set(blacklistRef.current));
    }
    
    return added;
  }, []);
  
  // ============================================
  // UTILITIES
  // ============================================
  
  const getAll = useCallback((): string[] => {
    return Array.from<string>(participantsRef.current);
  }, []);
  
  const getFiltered = useCallback((): string[] => {
    return Array.from<string>(participantsRef.current).filter(
      (name) => !blacklistRef.current.has(name)
    );
  }, []);
  
  return {
    // State
    participants,
    participantSources,
    count: participants.size,
    blacklist,
    blacklistCount: blacklist.size,
    
    // Participant actions
    add,
    addMultiple,
    remove,
    clear,
    has,
    
    // Blacklist actions
    addToBlacklist,
    removeFromBlacklist,
    isBlacklisted,
    filterBlacklisted,
    clearBlacklist,
    
    // Import/Export
    exportList,
    importList,
    exportBlacklist,
    importBlacklist,
    
    // Utilities
    getAll,
    getFiltered,
  };
}

export default useParticipants;
