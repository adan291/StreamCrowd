// Action Log Service - Registra todas las acciones de colaboradores
import { ActionLogEntry, ActionLogFilter, ActionCategory } from '../../../types/collaboration';

const MAX_LOG_ENTRIES = 1000;
const STORAGE_KEY = 'twitchvote_collab_action_log';

export interface ActionLogServiceOptions {
  maxEntries?: number;
  persistToStorage?: boolean;
}

export class ActionLogService {
  private entries: ActionLogEntry[] = [];
  private listeners: Set<(entries: ActionLogEntry[]) => void> = new Set();
  private maxEntries: number;
  private persistToStorage: boolean;

  constructor(options: ActionLogServiceOptions = {}) {
    this.maxEntries = options.maxEntries ?? MAX_LOG_ENTRIES;
    this.persistToStorage = options.persistToStorage ?? true;
    
    if (this.persistToStorage) {
      this.loadFromStorage();
    }
  }

  // ============================================
  // Action Logging
  // ============================================

  logAction(
    action: string,
    userId: string,
    userName: string,
    details: string,
    category: ActionCategory,
    metadata?: Record<string, unknown>
  ): ActionLogEntry {
    const entry: ActionLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      details,
      userId,
      userName,
      timestamp: Date.now(),
      category,
      metadata
    };

    this.addEntry(entry);
    return entry;
  }

  private addEntry(entry: ActionLogEntry): void {
    this.entries.push(entry);

    // Trim old entries if exceeding max
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    if (this.persistToStorage) {
      this.saveToStorage();
    }
    
    this.notifyListeners();
  }

  // ============================================
  // Predefined Action Loggers
  // ============================================

  logPollAction(
    action: 'create' | 'start' | 'stop' | 'delete',
    userId: string,
    userName: string,
    pollTitle: string
  ): ActionLogEntry {
    const actionLabels = {
      create: 'Creó encuesta',
      start: 'Inició encuesta',
      stop: 'Detuvo encuesta',
      delete: 'Eliminó encuesta'
    };

    return this.logAction(
      actionLabels[action],
      userId,
      userName,
      `"${pollTitle}"`,
      'poll',
      { pollTitle }
    );
  }

  logPredictionAction(
    action: 'create' | 'lock' | 'resolve' | 'cancel',
    userId: string,
    userName: string,
    predictionTitle: string,
    outcome?: string
  ): ActionLogEntry {
    const actionLabels = {
      create: 'Creó predicción',
      lock: 'Bloqueó predicción',
      resolve: 'Resolvió predicción',
      cancel: 'Canceló predicción'
    };

    const details = outcome 
      ? `"${predictionTitle}" - Resultado: ${outcome}`
      : `"${predictionTitle}"`;

    return this.logAction(
      actionLabels[action],
      userId,
      userName,
      details,
      'prediction',
      { predictionTitle, outcome }
    );
  }

  logGiveawayAction(
    action: 'create' | 'start' | 'draw' | 'cancel',
    userId: string,
    userName: string,
    giveawayTitle: string,
    winner?: string
  ): ActionLogEntry {
    const actionLabels = {
      create: 'Creó sorteo',
      start: 'Inició sorteo',
      draw: 'Seleccionó ganador',
      cancel: 'Canceló sorteo'
    };

    const details = winner
      ? `"${giveawayTitle}" - Ganador: ${winner}`
      : `"${giveawayTitle}"`;

    return this.logAction(
      actionLabels[action],
      userId,
      userName,
      details,
      'giveaway',
      { giveawayTitle, winner }
    );
  }

  logTimerAction(
    action: 'create' | 'start' | 'pause' | 'reset' | 'delete',
    userId: string,
    userName: string,
    timerName: string
  ): ActionLogEntry {
    const actionLabels = {
      create: 'Creó timer',
      start: 'Inició timer',
      pause: 'Pausó timer',
      reset: 'Reinició timer',
      delete: 'Eliminó timer'
    };

    return this.logAction(
      actionLabels[action],
      userId,
      userName,
      `"${timerName}"`,
      'timer',
      { timerName }
    );
  }

  logOBSAction(
    action: 'scene_change' | 'source_toggle',
    userId: string,
    userName: string,
    targetName: string,
    enabled?: boolean
  ): ActionLogEntry {
    const actionLabels = {
      scene_change: 'Cambió escena OBS',
      source_toggle: enabled ? 'Activó fuente OBS' : 'Desactivó fuente OBS'
    };

    return this.logAction(
      actionLabels[action],
      userId,
      userName,
      `"${targetName}"`,
      'obs',
      { targetName, enabled }
    );
  }

  logSessionAction(
    action: 'join' | 'leave' | 'kick' | 'role_change',
    userId: string,
    userName: string,
    targetUser?: string,
    newRole?: string
  ): ActionLogEntry {
    let actionLabel: string;
    let details: string;

    switch (action) {
      case 'join':
        actionLabel = 'Se unió a la sesión';
        details = '';
        break;
      case 'leave':
        actionLabel = 'Abandonó la sesión';
        details = '';
        break;
      case 'kick':
        actionLabel = 'Expulsó usuario';
        details = targetUser || '';
        break;
      case 'role_change':
        actionLabel = 'Cambió rol';
        details = targetUser ? `${targetUser} → ${newRole}` : '';
        break;
    }

    return this.logAction(
      actionLabel,
      userId,
      userName,
      details,
      'session',
      { targetUser, newRole }
    );
  }

  // ============================================
  // Query Methods
  // ============================================

  getActions(filter?: ActionLogFilter): ActionLogEntry[] {
    let result = [...this.entries];

    if (filter) {
      if (filter.userId) {
        result = result.filter(e => e.userId === filter.userId);
      }

      if (filter.category) {
        result = result.filter(e => e.category === filter.category);
      }

      if (filter.fromDate) {
        result = result.filter(e => e.timestamp >= filter.fromDate!);
      }

      if (filter.toDate) {
        result = result.filter(e => e.timestamp <= filter.toDate!);
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        result = result.filter(e => 
          e.action.toLowerCase().includes(searchLower) ||
          e.details.toLowerCase().includes(searchLower) ||
          e.userName.toLowerCase().includes(searchLower)
        );
      }
    }

    return result;
  }

  getRecentActions(limit: number = 50): ActionLogEntry[] {
    return this.entries.slice(-limit);
  }

  getActionsByUser(userId: string): ActionLogEntry[] {
    return this.entries.filter(e => e.userId === userId);
  }

  getActionsByCategory(category: ActionCategory): ActionLogEntry[] {
    return this.entries.filter(e => e.category === category);
  }

  getActionCount(): number {
    return this.entries.length;
  }

  getActionCountByCategory(): Record<ActionCategory, number> {
    const counts: Record<ActionCategory, number> = {
      poll: 0,
      prediction: 0,
      giveaway: 0,
      timer: 0,
      obs: 0,
      session: 0,
      settings: 0,
      other: 0
    };

    for (const entry of this.entries) {
      counts[entry.category]++;
    }

    return counts;
  }

  // ============================================
  // Export Methods
  // ============================================

  exportToCSV(filter?: ActionLogFilter): string {
    const entries = this.getActions(filter);
    
    if (entries.length === 0) {
      return 'Timestamp,Usuario,Acción,Detalles,Categoría\n';
    }

    const headers = ['Timestamp', 'Usuario', 'Acción', 'Detalles', 'Categoría'];
    const rows = entries.map(entry => [
      new Date(entry.timestamp).toISOString(),
      this.escapeCSV(entry.userName),
      this.escapeCSV(entry.action),
      this.escapeCSV(entry.details),
      entry.category
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  exportToJSON(filter?: ActionLogFilter): string {
    const entries = this.getActions(filter);
    return JSON.stringify(entries, null, 2);
  }

  // ============================================
  // History Management
  // ============================================

  clearLog(): void {
    this.entries = [];
    if (this.persistToStorage) {
      this.saveToStorage();
    }
    this.notifyListeners();
  }

  loadEntries(entries: ActionLogEntry[]): void {
    // Merge and deduplicate
    const existingIds = new Set(this.entries.map(e => e.id));
    const newEntries = entries.filter(e => !existingIds.has(e.id));
    
    this.entries = [...this.entries, ...newEntries]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-this.maxEntries);

    if (this.persistToStorage) {
      this.saveToStorage();
    }
    this.notifyListeners();
  }

  // ============================================
  // Listeners
  // ============================================

  subscribe(listener: (entries: ActionLogEntry[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const entries = this.getRecentActions();
    this.listeners.forEach(listener => listener(entries));
  }

  // ============================================
  // Persistence
  // ============================================

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const entries = JSON.parse(data) as ActionLogEntry[];
        this.entries = entries.slice(-this.maxEntries);
      }
    } catch (error) {
      console.error('Failed to load action log from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch (error) {
      console.error('Failed to save action log to storage:', error);
    }
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    this.listeners.clear();
    this.entries = [];
  }
}

// Singleton
let instance: ActionLogService | null = null;

export function getActionLogService(): ActionLogService {
  if (!instance) {
    instance = new ActionLogService();
  }
  return instance;
}

export function resetActionLogService(): void {
  if (instance) {
    instance.dispose();
  }
  instance = null;
}
