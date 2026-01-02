// Property tests for ActionLogService
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActionLogService, resetActionLogService } from '../../src/collaboration/services/ActionLogService';
import { ActionLogEntry, ActionCategory } from '../../types/collaboration';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('ActionLogService', () => {
  let service: ActionLogService;

  beforeEach(() => {
    localStorageMock.clear();
    resetActionLogService();
    service = new ActionLogService({ persistToStorage: false });
  });

  afterEach(() => {
    service.dispose();
  });

  // ============================================
  // Basic Logging Tests
  // ============================================

  describe('logAction', () => {
    it('should create an action log entry with correct properties', () => {
      const entry = service.logAction(
        'Test Action',
        'user1',
        'Alice',
        'Test details',
        'poll'
      );

      expect(entry.id).toMatch(/^log-/);
      expect(entry.action).toBe('Test Action');
      expect(entry.userId).toBe('user1');
      expect(entry.userName).toBe('Alice');
      expect(entry.details).toBe('Test details');
      expect(entry.category).toBe('poll');
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('should include metadata when provided', () => {
      const entry = service.logAction(
        'Test',
        'user1',
        'Alice',
        'Details',
        'poll',
        { pollId: '123', votes: 50 }
      );

      expect(entry.metadata).toEqual({ pollId: '123', votes: 50 });
    });

    it('should store entries in order', () => {
      service.logAction('First', 'user1', 'Alice', '', 'poll');
      service.logAction('Second', 'user1', 'Alice', '', 'poll');
      service.logAction('Third', 'user1', 'Alice', '', 'poll');

      const entries = service.getRecentActions();
      expect(entries.length).toBe(3);
      expect(entries[0].action).toBe('First');
      expect(entries[2].action).toBe('Third');
    });

    it('should limit entries to maxEntries', () => {
      const customService = new ActionLogService({ 
        maxEntries: 5, 
        persistToStorage: false 
      });

      for (let i = 0; i < 10; i++) {
        customService.logAction(`Action ${i}`, 'user1', 'Alice', '', 'poll');
      }

      expect(customService.getActionCount()).toBe(5);
      expect(customService.getRecentActions()[0].action).toBe('Action 5');
      
      customService.dispose();
    });
  });

  // ============================================
  // Predefined Action Logger Tests
  // ============================================

  describe('logPollAction', () => {
    it('should log poll creation', () => {
      const entry = service.logPollAction('create', 'user1', 'Alice', 'Best Game?');

      expect(entry.action).toBe('Creó encuesta');
      expect(entry.details).toBe('"Best Game?"');
      expect(entry.category).toBe('poll');
      expect(entry.metadata).toEqual({ pollTitle: 'Best Game?' });
    });

    it('should log poll start', () => {
      const entry = service.logPollAction('start', 'user1', 'Alice', 'Best Game?');
      expect(entry.action).toBe('Inició encuesta');
    });

    it('should log poll stop', () => {
      const entry = service.logPollAction('stop', 'user1', 'Alice', 'Best Game?');
      expect(entry.action).toBe('Detuvo encuesta');
    });

    it('should log poll delete', () => {
      const entry = service.logPollAction('delete', 'user1', 'Alice', 'Best Game?');
      expect(entry.action).toBe('Eliminó encuesta');
    });
  });

  describe('logPredictionAction', () => {
    it('should log prediction creation', () => {
      const entry = service.logPredictionAction('create', 'user1', 'Alice', 'Will we win?');

      expect(entry.action).toBe('Creó predicción');
      expect(entry.details).toBe('"Will we win?"');
      expect(entry.category).toBe('prediction');
    });

    it('should log prediction resolution with outcome', () => {
      const entry = service.logPredictionAction('resolve', 'user1', 'Alice', 'Will we win?', 'Yes');

      expect(entry.action).toBe('Resolvió predicción');
      expect(entry.details).toBe('"Will we win?" - Resultado: Yes');
      expect(entry.metadata).toEqual({ predictionTitle: 'Will we win?', outcome: 'Yes' });
    });
  });

  describe('logGiveawayAction', () => {
    it('should log giveaway creation', () => {
      const entry = service.logGiveawayAction('create', 'user1', 'Alice', 'Free Sub');

      expect(entry.action).toBe('Creó sorteo');
      expect(entry.category).toBe('giveaway');
    });

    it('should log giveaway draw with winner', () => {
      const entry = service.logGiveawayAction('draw', 'user1', 'Alice', 'Free Sub', 'Bob');

      expect(entry.action).toBe('Seleccionó ganador');
      expect(entry.details).toBe('"Free Sub" - Ganador: Bob');
      expect(entry.metadata).toEqual({ giveawayTitle: 'Free Sub', winner: 'Bob' });
    });
  });

  describe('logTimerAction', () => {
    it('should log timer actions', () => {
      const actions: Array<'create' | 'start' | 'pause' | 'reset' | 'delete'> = 
        ['create', 'start', 'pause', 'reset', 'delete'];
      const expectedLabels = ['Creó timer', 'Inició timer', 'Pausó timer', 'Reinició timer', 'Eliminó timer'];

      actions.forEach((action, i) => {
        const entry = service.logTimerAction(action, 'user1', 'Alice', 'Break Timer');
        expect(entry.action).toBe(expectedLabels[i]);
        expect(entry.category).toBe('timer');
      });
    });
  });

  describe('logOBSAction', () => {
    it('should log scene change', () => {
      const entry = service.logOBSAction('scene_change', 'user1', 'Alice', 'Gaming Scene');

      expect(entry.action).toBe('Cambió escena OBS');
      expect(entry.details).toBe('"Gaming Scene"');
      expect(entry.category).toBe('obs');
    });

    it('should log source enable', () => {
      const entry = service.logOBSAction('source_toggle', 'user1', 'Alice', 'Webcam', true);

      expect(entry.action).toBe('Activó fuente OBS');
    });

    it('should log source disable', () => {
      const entry = service.logOBSAction('source_toggle', 'user1', 'Alice', 'Webcam', false);

      expect(entry.action).toBe('Desactivó fuente OBS');
    });
  });

  describe('logSessionAction', () => {
    it('should log user join', () => {
      const entry = service.logSessionAction('join', 'user1', 'Alice');

      expect(entry.action).toBe('Se unió a la sesión');
      expect(entry.category).toBe('session');
    });

    it('should log user leave', () => {
      const entry = service.logSessionAction('leave', 'user1', 'Alice');
      expect(entry.action).toBe('Abandonó la sesión');
    });

    it('should log user kick', () => {
      const entry = service.logSessionAction('kick', 'user1', 'Alice', 'Bob');

      expect(entry.action).toBe('Expulsó usuario');
      expect(entry.details).toBe('Bob');
    });

    it('should log role change', () => {
      const entry = service.logSessionAction('role_change', 'user1', 'Alice', 'Bob', 'admin');

      expect(entry.action).toBe('Cambió rol');
      expect(entry.details).toBe('Bob → admin');
    });
  });

  // ============================================
  // Query Tests
  // ============================================

  describe('getActions', () => {
    beforeEach(() => {
      // Create diverse entries
      service.logPollAction('create', 'user1', 'Alice', 'Poll 1');
      service.logPredictionAction('create', 'user2', 'Bob', 'Prediction 1');
      service.logGiveawayAction('create', 'user1', 'Alice', 'Giveaway 1');
    });

    it('should return all actions without filter', () => {
      const actions = service.getActions();
      expect(actions.length).toBe(3);
    });

    it('should filter by userId', () => {
      const actions = service.getActions({ userId: 'user1' });
      expect(actions.length).toBe(2);
      expect(actions.every(a => a.userId === 'user1')).toBe(true);
    });

    it('should filter by category', () => {
      const actions = service.getActions({ category: 'poll' });
      expect(actions.length).toBe(1);
      expect(actions[0].category).toBe('poll');
    });

    it('should filter by date range', () => {
      const now = Date.now();
      const actions = service.getActions({ 
        fromDate: now - 1000,
        toDate: now + 1000
      });
      expect(actions.length).toBe(3);
    });

    it('should filter by search term', () => {
      const actions = service.getActions({ search: 'Poll' });
      expect(actions.length).toBe(1);
      expect(actions[0].details).toContain('Poll');
    });

    it('should combine multiple filters', () => {
      const actions = service.getActions({ 
        userId: 'user1',
        category: 'poll'
      });
      expect(actions.length).toBe(1);
    });
  });

  describe('getRecentActions', () => {
    it('should return limited recent actions', () => {
      for (let i = 0; i < 10; i++) {
        service.logAction(`Action ${i}`, 'user1', 'Alice', '', 'poll');
      }

      const recent = service.getRecentActions(3);
      expect(recent.length).toBe(3);
      expect(recent[0].action).toBe('Action 7');
    });
  });

  describe('getActionsByUser', () => {
    it('should return actions for specific user', () => {
      service.logAction('Action 1', 'user1', 'Alice', '', 'poll');
      service.logAction('Action 2', 'user2', 'Bob', '', 'poll');
      service.logAction('Action 3', 'user1', 'Alice', '', 'poll');

      const actions = service.getActionsByUser('user1');
      expect(actions.length).toBe(2);
    });
  });

  describe('getActionsByCategory', () => {
    it('should return actions for specific category', () => {
      service.logPollAction('create', 'user1', 'Alice', 'Poll');
      service.logTimerAction('create', 'user1', 'Alice', 'Timer');
      service.logPollAction('start', 'user1', 'Alice', 'Poll');

      const pollActions = service.getActionsByCategory('poll');
      expect(pollActions.length).toBe(2);
    });
  });

  describe('getActionCountByCategory', () => {
    it('should count actions by category', () => {
      service.logPollAction('create', 'user1', 'Alice', 'Poll');
      service.logPollAction('start', 'user1', 'Alice', 'Poll');
      service.logTimerAction('create', 'user1', 'Alice', 'Timer');

      const counts = service.getActionCountByCategory();
      expect(counts.poll).toBe(2);
      expect(counts.timer).toBe(1);
      expect(counts.prediction).toBe(0);
    });
  });

  // ============================================
  // Export Tests
  // ============================================

  describe('exportToCSV', () => {
    it('should export empty CSV with headers', () => {
      const csv = service.exportToCSV();
      expect(csv).toBe('Timestamp,Usuario,Acción,Detalles,Categoría\n');
    });

    it('should export entries as CSV', () => {
      service.logPollAction('create', 'user1', 'Alice', 'Test Poll');

      const csv = service.exportToCSV();
      const lines = csv.split('\n');
      
      expect(lines.length).toBe(2);
      expect(lines[0]).toBe('Timestamp,Usuario,Acción,Detalles,Categoría');
      expect(lines[1]).toContain('Alice');
      expect(lines[1]).toContain('Creó encuesta');
      expect(lines[1]).toContain('poll');
    });

    it('should escape CSV special characters', () => {
      service.logAction('Test, Action', 'user1', 'Alice "The Great"', 'Details\nwith newline', 'poll');

      const csv = service.exportToCSV();
      expect(csv).toContain('"Alice ""The Great"""');
      expect(csv).toContain('"Test, Action"');
    });

    it('should apply filters to export', () => {
      service.logPollAction('create', 'user1', 'Alice', 'Poll');
      service.logTimerAction('create', 'user2', 'Bob', 'Timer');

      const csv = service.exportToCSV({ userId: 'user1' });
      const lines = csv.split('\n').filter(l => l.trim());
      
      expect(lines.length).toBe(2); // Header + 1 entry
    });
  });

  describe('exportToJSON', () => {
    it('should export entries as JSON', () => {
      service.logPollAction('create', 'user1', 'Alice', 'Test Poll');

      const json = service.exportToJSON();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].userName).toBe('Alice');
    });

    it('should apply filters to JSON export', () => {
      service.logPollAction('create', 'user1', 'Alice', 'Poll');
      service.logTimerAction('create', 'user2', 'Bob', 'Timer');

      const json = service.exportToJSON({ category: 'timer' });
      const parsed = JSON.parse(json);

      expect(parsed.length).toBe(1);
      expect(parsed[0].category).toBe('timer');
    });
  });

  // ============================================
  // History Management Tests
  // ============================================

  describe('clearLog', () => {
    it('should remove all entries', () => {
      service.logAction('Action 1', 'user1', 'Alice', '', 'poll');
      service.logAction('Action 2', 'user1', 'Alice', '', 'poll');

      service.clearLog();

      expect(service.getActionCount()).toBe(0);
    });
  });

  describe('loadEntries', () => {
    it('should load entries from array', () => {
      const entries: ActionLogEntry[] = [
        {
          id: 'log-1',
          action: 'Test',
          details: '',
          userId: 'user1',
          userName: 'Alice',
          timestamp: Date.now(),
          category: 'poll'
        }
      ];

      service.loadEntries(entries);

      expect(service.getActionCount()).toBe(1);
    });

    it('should merge with existing entries', () => {
      service.logAction('Existing', 'user1', 'Alice', '', 'poll');

      const entries: ActionLogEntry[] = [
        {
          id: 'log-new',
          action: 'New',
          details: '',
          userId: 'user2',
          userName: 'Bob',
          timestamp: Date.now(),
          category: 'poll'
        }
      ];

      service.loadEntries(entries);

      expect(service.getActionCount()).toBe(2);
    });

    it('should not duplicate existing entries', () => {
      service.logAction('Test', 'user1', 'Alice', '', 'poll');
      const existing = service.getRecentActions()[0];

      service.loadEntries([existing]);

      expect(service.getActionCount()).toBe(1);
    });

    it('should sort entries by timestamp', () => {
      const now = Date.now();
      
      service.logAction('Middle', 'user1', 'Alice', '', 'poll');

      const entries: ActionLogEntry[] = [
        {
          id: 'log-old',
          action: 'First',
          details: '',
          userId: 'user1',
          userName: 'Alice',
          timestamp: now - 10000,
          category: 'poll'
        },
        {
          id: 'log-new',
          action: 'Last',
          details: '',
          userId: 'user1',
          userName: 'Alice',
          timestamp: now + 10000,
          category: 'poll'
        }
      ];

      service.loadEntries(entries);

      const actions = service.getRecentActions();
      expect(actions[0].action).toBe('First');
      expect(actions[2].action).toBe('Last');
    });
  });

  // ============================================
  // Listener Tests
  // ============================================

  describe('subscribe', () => {
    it('should notify on new entry', () => {
      const listener = vi.fn();
      service.subscribe(listener);

      service.logAction('Test', 'user1', 'Alice', '', 'poll');

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribe(listener);

      unsubscribe();
      service.logAction('Test', 'user1', 'Alice', '', 'poll');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify on clear', () => {
      service.logAction('Test', 'user1', 'Alice', '', 'poll');
      
      const listener = vi.fn();
      service.subscribe(listener);

      service.clearLog();

      expect(listener).toHaveBeenCalled();
    });
  });

  // ============================================
  // Persistence Tests
  // ============================================

  describe('persistence', () => {
    it('should save to localStorage when enabled', () => {
      const persistentService = new ActionLogService({ persistToStorage: true });
      persistentService.logAction('Test', 'user1', 'Alice', '', 'poll');

      const stored = localStorage.getItem('streamcrowd_collab_action_log');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
      
      persistentService.dispose();
    });

    it('should load from localStorage on init', () => {
      // First, save some data
      const entries: ActionLogEntry[] = [{
        id: 'log-stored',
        action: 'Stored Action',
        details: '',
        userId: 'user1',
        userName: 'Alice',
        timestamp: Date.now(),
        category: 'poll'
      }];
      localStorage.setItem('streamcrowd_collab_action_log', JSON.stringify(entries));

      // Create new service that loads from storage
      const persistentService = new ActionLogService({ persistToStorage: true });

      expect(persistentService.getActionCount()).toBe(1);
      expect(persistentService.getRecentActions()[0].action).toBe('Stored Action');
      
      persistentService.dispose();
    });
  });

  // ============================================
  // Dispose Tests
  // ============================================

  describe('dispose', () => {
    it('should clear all state', () => {
      service.logAction('Test', 'user1', 'Alice', '', 'poll');
      const listener = vi.fn();
      service.subscribe(listener);

      service.dispose();

      expect(service.getActionCount()).toBe(0);
    });
  });
});
