/**
 * useTimers Hook
 * 
 * Hook for managing chat timers - automatic periodic messages.
 * Handles timer CRUD, groups, execution engine, and persistence.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { 
  Timer, 
  TimerGroup, 
  TimerExecutionLog, 
  TimerEngineState,
  TimerFormData,
  TimerGroupFormData
} from '../../../types/timers';

// Storage keys
const TIMERS_KEY = 'chat_timers';
const GROUPS_KEY = 'chat_timer_groups';
const ENGINE_STATE_KEY = 'chat_timer_engine_state';

// Current data version for migration support
const CURRENT_DATA_VERSION = 1;

// Engine check interval (10 seconds)
const ENGINE_CHECK_INTERVAL = 10000;

// Max log entries
const MAX_LOG_ENTRIES = 50;

// Generate unique ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Default groups
const DEFAULT_GROUPS: TimerGroup[] = [];

// Default engine state
const DEFAULT_ENGINE_STATE: TimerEngineState = {
  isRunning: false,
  chatLineCount: 0,
  lastCheck: 0,
  executionLog: []
};

/**
 * Storage data structure with versioning
 */
interface TimerStorageData {
  version: number;
  timers: Timer[];
}

interface GroupStorageData {
  version: number;
  groups: TimerGroup[];
}

/**
 * Validate a single timer object
 */
function isValidTimer(obj: unknown): obj is Timer {
  if (!obj || typeof obj !== 'object') return false;
  const t = obj as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    typeof t.message === 'string' &&
    typeof t.intervalMinutes === 'number' &&
    typeof t.minChatLines === 'number' &&
    typeof t.enabled === 'boolean'
  );
}

/**
 * Validate a single group object
 */
function isValidGroup(obj: unknown): obj is TimerGroup {
  if (!obj || typeof obj !== 'object') return false;
  const g = obj as Record<string, unknown>;
  return (
    typeof g.id === 'string' &&
    typeof g.name === 'string' &&
    typeof g.enabled === 'boolean'
  );
}

/**
 * Migrate timer to ensure all required fields exist
 */
function migrateTimer(obj: Record<string, unknown>): Timer {
  const now = Date.now();
  return {
    id: typeof obj.id === 'string' ? obj.id : generateId(),
    name: typeof obj.name === 'string' ? obj.name : 'Timer',
    message: typeof obj.message === 'string' ? obj.message : '',
    intervalMinutes: typeof obj.intervalMinutes === 'number' ? obj.intervalMinutes : 5,
    minChatLines: typeof obj.minChatLines === 'number' ? obj.minChatLines : 0,
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : true,
    groupId: typeof obj.groupId === 'string' ? obj.groupId : null,
    lastExecuted: typeof obj.lastExecuted === 'number' ? obj.lastExecuted : null,
    createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : now,
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : now
  };
}

/**
 * Migrate group to ensure all required fields exist
 */
function migrateGroup(obj: Record<string, unknown>): TimerGroup {
  return {
    id: typeof obj.id === 'string' ? obj.id : generateId(),
    name: typeof obj.name === 'string' ? obj.name : 'Group',
    color: typeof obj.color === 'string' ? obj.color : '#6366f1',
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : true
  };
}

/**
 * Load and validate timers from localStorage
 */
function loadTimersFromStorage(): Timer[] {
  try {
    const stored = localStorage.getItem(TIMERS_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    
    // Handle versioned data
    if (parsed && typeof parsed === 'object' && 'version' in parsed && 'timers' in parsed) {
      const data = parsed as TimerStorageData;
      // Future migrations can check data.version here
      return Array.isArray(data.timers) 
        ? data.timers.filter(isValidTimer)
        : [];
    }
    
    // Handle legacy data (array without version)
    if (Array.isArray(parsed)) {
      const validTimers: Timer[] = [];
      for (const item of parsed) {
        if (isValidTimer(item)) {
          validTimers.push(item);
        } else if (item && typeof item === 'object') {
          // Try to migrate invalid timer
          const migrated = migrateTimer(item as Record<string, unknown>);
          if (migrated.name && migrated.message) {
            validTimers.push(migrated);
          }
        }
      }
      return validTimers;
    }
  } catch (error) {
    console.error('Error loading timers from localStorage:', error);
  }
  return [];
}

/**
 * Load and validate groups from localStorage
 */
function loadGroupsFromStorage(): TimerGroup[] {
  try {
    const stored = localStorage.getItem(GROUPS_KEY);
    if (!stored) return DEFAULT_GROUPS;

    const parsed = JSON.parse(stored);
    
    // Handle versioned data
    if (parsed && typeof parsed === 'object' && 'version' in parsed && 'groups' in parsed) {
      const data = parsed as GroupStorageData;
      return Array.isArray(data.groups) 
        ? data.groups.filter(isValidGroup)
        : DEFAULT_GROUPS;
    }
    
    // Handle legacy data (array without version)
    if (Array.isArray(parsed)) {
      const validGroups: TimerGroup[] = [];
      for (const item of parsed) {
        if (isValidGroup(item)) {
          validGroups.push(item);
        } else if (item && typeof item === 'object') {
          const migrated = migrateGroup(item as Record<string, unknown>);
          if (migrated.name) {
            validGroups.push(migrated);
          }
        }
      }
      return validGroups;
    }
  } catch (error) {
    console.error('Error loading groups from localStorage:', error);
  }
  return DEFAULT_GROUPS;
}

/**
 * Save timers to localStorage with versioning
 */
function saveTimersToStorage(timers: Timer[]): void {
  try {
    const data: TimerStorageData = {
      version: CURRENT_DATA_VERSION,
      timers
    };
    localStorage.setItem(TIMERS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving timers to localStorage:', error);
  }
}

/**
 * Save groups to localStorage with versioning
 */
function saveGroupsToStorage(groups: TimerGroup[]): void {
  try {
    const data: GroupStorageData = {
      version: CURRENT_DATA_VERSION,
      groups
    };
    localStorage.setItem(GROUPS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving groups to localStorage:', error);
  }
}

/**
 * Load data from localStorage (generic)
 */
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
  }
  return defaultValue;
}

/**
 * Save data to localStorage (generic)
 */
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

/**
 * Variable substitution for timer messages
 */
export function substituteVariables(
  message: string,
  context: {
    channel?: string;
    game?: string;
    uptime?: string;
    viewers?: number;
    followers?: number;
  }
): string {
  const now = new Date();
  
  return message
    .replace(/\$\(channel\)/gi, context.channel || 'channel')
    .replace(/\$\(game\)/gi, context.game || 'Just Chatting')
    .replace(/\$\(uptime\)/gi, context.uptime || '0h 0m')
    .replace(/\$\(viewers\)/gi, String(context.viewers || 0))
    .replace(/\$\(followers\)/gi, String(context.followers || 0))
    .replace(/\$\(date\)/gi, now.toLocaleDateString())
    .replace(/\$\(time\)/gi, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
}

export interface UseTimersOptions {
  /** Function to send message to chat */
  sendMessage?: (message: string) => void;
  /** Whether chat is connected */
  isConnected?: boolean;
  /** Channel name for variable substitution */
  channel?: string;
  /** Current game for variable substitution */
  game?: string;
  /** Stream uptime for variable substitution */
  uptime?: string;
  /** Current viewers for variable substitution */
  viewers?: number;
  /** Total followers for variable substitution */
  followers?: number;
  /** Callback for notifications */
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export interface UseTimersReturn {
  // State
  timers: Timer[];
  groups: TimerGroup[];
  engineState: TimerEngineState;
  
  // Timer CRUD
  addTimer: (data: TimerFormData) => Timer;
  updateTimer: (id: string, updates: Partial<Timer>) => boolean;
  deleteTimer: (id: string) => boolean;
  toggleTimer: (id: string) => void;
  
  // Group CRUD
  addGroup: (data: TimerGroupFormData) => TimerGroup;
  updateGroup: (id: string, updates: Partial<TimerGroup>) => boolean;
  deleteGroup: (id: string) => boolean;
  toggleGroup: (id: string) => void;
  
  // Engine control
  startEngine: () => void;
  stopEngine: () => void;
  executeTimerNow: (id: string) => void;
  incrementChatLines: () => void;
  clearLog: () => void;
  
  // Helpers
  getTimersByGroup: (groupId: string | null) => Timer[];
  getNextExecutionTime: (timer: Timer) => number | null;
}

export function useTimers(options: UseTimersOptions = {}): UseTimersReturn {
  const {
    sendMessage,
    isConnected = false,
    channel,
    game,
    uptime,
    viewers,
    followers,
    onNotification
  } = options;

  // State - use validated loaders
  const [timers, setTimers] = useState<Timer[]>(() => 
    loadTimersFromStorage()
  );
  const [groups, setGroups] = useState<TimerGroup[]>(() => 
    loadGroupsFromStorage()
  );
  const [engineState, setEngineState] = useState<TimerEngineState>(() => ({
    ...DEFAULT_ENGINE_STATE,
    ...loadFromStorage(ENGINE_STATE_KEY, {})
  }));

  // Refs for engine
  const engineIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Persist timers with versioning
  useEffect(() => {
    saveTimersToStorage(timers);
  }, [timers]);

  // Persist groups with versioning
  useEffect(() => {
    saveGroupsToStorage(groups);
  }, [groups]);

  // Persist engine state (only running status)
  useEffect(() => {
    saveToStorage(ENGINE_STATE_KEY, { isRunning: engineState.isRunning });
  }, [engineState.isRunning]);

  // Add timer
  const addTimer = useCallback((data: TimerFormData): Timer => {
    const now = Date.now();
    const newTimer: Timer = {
      ...data,
      id: generateId(),
      lastExecuted: null,
      createdAt: now,
      updatedAt: now
    };
    setTimers(prev => [...prev, newTimer]);
    return newTimer;
  }, []);

  // Update timer
  const updateTimer = useCallback((id: string, updates: Partial<Timer>): boolean => {
    let found = false;
    setTimers(prev => prev.map(timer => {
      if (timer.id === id) {
        found = true;
        return { ...timer, ...updates, updatedAt: Date.now() };
      }
      return timer;
    }));
    return found;
  }, []);

  // Delete timer
  const deleteTimer = useCallback((id: string): boolean => {
    let found = false;
    setTimers(prev => {
      const filtered = prev.filter(t => {
        if (t.id === id) {
          found = true;
          return false;
        }
        return true;
      });
      return filtered;
    });
    return found;
  }, []);

  // Toggle timer enabled
  const toggleTimer = useCallback((id: string): void => {
    setTimers(prev => prev.map(timer => 
      timer.id === id 
        ? { ...timer, enabled: !timer.enabled, updatedAt: Date.now() }
        : timer
    ));
  }, []);

  // Add group
  const addGroup = useCallback((data: TimerGroupFormData): TimerGroup => {
    const newGroup: TimerGroup = {
      ...data,
      id: generateId()
    };
    setGroups(prev => [...prev, newGroup]);
    return newGroup;
  }, []);

  // Update group
  const updateGroup = useCallback((id: string, updates: Partial<TimerGroup>): boolean => {
    let found = false;
    setGroups(prev => prev.map(group => {
      if (group.id === id) {
        found = true;
        return { ...group, ...updates };
      }
      return group;
    }));
    return found;
  }, []);

  // Delete group (move timers to no group)
  const deleteGroup = useCallback((id: string): boolean => {
    let found = false;
    setGroups(prev => {
      const filtered = prev.filter(g => {
        if (g.id === id) {
          found = true;
          return false;
        }
        return true;
      });
      return filtered;
    });
    
    if (found) {
      // Move timers from deleted group to no group
      setTimers(prev => prev.map(timer => 
        timer.groupId === id 
          ? { ...timer, groupId: null, updatedAt: Date.now() }
          : timer
      ));
    }
    
    return found;
  }, []);

  // Toggle group enabled
  const toggleGroup = useCallback((id: string): void => {
    setGroups(prev => prev.map(group => 
      group.id === id 
        ? { ...group, enabled: !group.enabled }
        : group
    ));
  }, []);

  // Execute a timer
  const executeTimer = useCallback((timer: Timer): void => {
    const opts = optionsRef.current;
    if (!opts.sendMessage || !opts.isConnected) return;

    const message = substituteVariables(timer.message, {
      channel: opts.channel,
      game: opts.game,
      uptime: opts.uptime,
      viewers: opts.viewers,
      followers: opts.followers
    });

    try {
      opts.sendMessage(message);
      
      // Update last executed
      setTimers(prev => prev.map(t => 
        t.id === timer.id 
          ? { ...t, lastExecuted: Date.now() }
          : t
      ));

      // Add to log
      const logEntry: TimerExecutionLog = {
        id: generateId(),
        timerId: timer.id,
        timerName: timer.name,
        message,
        executedAt: Date.now(),
        success: true
      };

      setEngineState(prev => ({
        ...prev,
        chatLineCount: 0, // Reset chat line count after execution
        executionLog: [logEntry, ...prev.executionLog].slice(0, MAX_LOG_ENTRIES)
      }));

      // Notify success
      opts.onNotification?.('success', `Timer "${timer.name}" ejecutado`);
    } catch (error) {
      // Add error to log
      const logEntry: TimerExecutionLog = {
        id: generateId(),
        timerId: timer.id,
        timerName: timer.name,
        message,
        executedAt: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      setEngineState(prev => ({
        ...prev,
        executionLog: [logEntry, ...prev.executionLog].slice(0, MAX_LOG_ENTRIES)
      }));

      // Notify error
      opts.onNotification?.('error', `Error en timer "${timer.name}"`);
    }
  }, []);

  // Execute timer now (manual)
  const executeTimerNow = useCallback((id: string): void => {
    const timer = timers.find(t => t.id === id);
    if (timer) {
      executeTimer(timer);
    }
  }, [timers, executeTimer]);

  // Check and execute timers
  const checkTimers = useCallback(() => {
    const now = Date.now();
    const opts = optionsRef.current;

    if (!opts.isConnected || !opts.sendMessage) return;

    setEngineState(prev => {
      // Get current state values
      const currentChatLines = prev.chatLineCount;

      // Find timers to execute
      timers.forEach(timer => {
        // Skip disabled timers
        if (!timer.enabled) return;

        // Check if group is enabled
        if (timer.groupId) {
          const group = groups.find(g => g.id === timer.groupId);
          if (group && !group.enabled) return;
        }

        // Check interval
        const intervalMs = timer.intervalMinutes * 60 * 1000;
        const timeSinceLastExec = now - (timer.lastExecuted || 0);
        if (timeSinceLastExec < intervalMs) return;

        // Check minimum chat lines
        if (currentChatLines < timer.minChatLines) return;

        // Execute timer
        executeTimer(timer);
      });

      return { ...prev, lastCheck: now };
    });
  }, [timers, groups, executeTimer]);

  // Start engine
  const startEngine = useCallback(() => {
    if (engineIntervalRef.current) return;

    engineIntervalRef.current = setInterval(checkTimers, ENGINE_CHECK_INTERVAL);
    setEngineState(prev => ({ ...prev, isRunning: true }));
  }, [checkTimers]);

  // Stop engine
  const stopEngine = useCallback(() => {
    if (engineIntervalRef.current) {
      clearInterval(engineIntervalRef.current);
      engineIntervalRef.current = null;
    }
    setEngineState(prev => ({ ...prev, isRunning: false }));
  }, []);

  // Increment chat lines
  const incrementChatLines = useCallback(() => {
    setEngineState(prev => ({
      ...prev,
      chatLineCount: prev.chatLineCount + 1
    }));
  }, []);

  // Clear log
  const clearLog = useCallback(() => {
    setEngineState(prev => ({
      ...prev,
      executionLog: []
    }));
  }, []);

  // Get timers by group
  const getTimersByGroup = useCallback((groupId: string | null): Timer[] => {
    return timers.filter(t => t.groupId === groupId);
  }, [timers]);

  // Get next execution time for a timer
  const getNextExecutionTime = useCallback((timer: Timer): number | null => {
    if (!timer.enabled) return null;
    
    // Check if group is enabled
    if (timer.groupId) {
      const group = groups.find(g => g.id === timer.groupId);
      if (group && !group.enabled) return null;
    }

    const intervalMs = timer.intervalMinutes * 60 * 1000;
    const lastExec = timer.lastExecuted || timer.createdAt;
    return lastExec + intervalMs;
  }, [groups]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineIntervalRef.current) {
        clearInterval(engineIntervalRef.current);
      }
    };
  }, []);

  // Auto-start engine if it was running before
  useEffect(() => {
    const savedState = loadFromStorage<Partial<TimerEngineState>>(ENGINE_STATE_KEY, {});
    if (savedState.isRunning && isConnected) {
      startEngine();
    }
  }, [isConnected, startEngine]);

  // Stop engine when disconnected
  useEffect(() => {
    if (!isConnected && engineState.isRunning) {
      stopEngine();
    }
  }, [isConnected, engineState.isRunning, stopEngine]);

  return {
    timers,
    groups,
    engineState,
    addTimer,
    updateTimer,
    deleteTimer,
    toggleTimer,
    addGroup,
    updateGroup,
    deleteGroup,
    toggleGroup,
    startEngine,
    stopEngine,
    executeTimerNow,
    incrementChatLines,
    clearLog,
    getTimersByGroup,
    getNextExecutionTime
  };
}

export default useTimers;
