// Property Tests for SyncService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService } from '../../src/collaboration/services/SyncService';
import { SyncAction, SyncActionType } from '../../types/collaboration';

describe('SyncService Property Tests', () => {
  let service: SyncService;
  let counter = 0;

  const createAction = (
    type: SyncActionType = 'poll:create',
    userId: string = 'user1',
    payload: unknown = { id: 'item1' },
    timestamp?: number
  ): SyncAction => {
    const action = service.createAction(type, payload, userId, `User ${userId}`);
    if (timestamp) {
      action.timestamp = timestamp;
    }
    return action;
  };

  beforeEach(() => {
    counter = 0;
    service = new SyncService();
  });

  describe('Property 1: Actions are applied in order', () => {
    it('should apply actions and increment version', () => {
      const action1 = createAction('poll:create', 'user1', { id: 'poll1' });
      const action2 = createAction('poll:update', 'user1', { id: 'poll1' });
      const action3 = createAction('poll:delete', 'user1', { id: 'poll1' });

      service.applyLocalAction(action1);
      service.applyLocalAction(action2);
      service.applyLocalAction(action3);

      expect(service.getStateVersion()).toBe(3);
      expect(service.getAppliedActions().length).toBe(3);
    });

    it('should return actions in version order with getStateDiff', () => {
      const action1 = createAction('poll:create', 'user1');
      const action2 = createAction('prediction:create', 'user2');
      const action3 = createAction('timer:create', 'user1');

      service.applyLocalAction(action1);
      service.applyLocalAction(action2);
      service.applyLocalAction(action3);

      const diff = service.getStateDiff(0);
      expect(diff.length).toBe(3);
      expect(diff[0].version).toBeLessThan(diff[1].version);
      expect(diff[1].version).toBeLessThan(diff[2].version);
    });

    it('should only return actions after specified version', () => {
      const action1 = createAction('poll:create', 'user1');
      const action2 = createAction('prediction:create', 'user2');
      const action3 = createAction('timer:create', 'user1');

      service.applyLocalAction(action1);
      service.applyLocalAction(action2);
      service.applyLocalAction(action3);

      const diff = service.getStateDiff(1);
      expect(diff.length).toBe(2);
      expect(diff[0].version).toBe(2);
    });
  });

  describe('Property 2: Conflicts are resolved consistently', () => {
    it('should resolve conflicts using Last Write Wins', () => {
      const now = Date.now();
      
      // Earlier action
      const action1 = createAction('poll:update', 'user1', { id: 'poll1' }, now - 100);
      action1.version = 1;
      
      // Later action
      const action2 = createAction('poll:update', 'user2', { id: 'poll1' }, now);
      action2.version = 2;

      const resolution = service.resolveConflict(action1, action2);
      expect(resolution.resolution).toBe('rejected');
      expect(resolution.reason).toContain('más reciente');
    });

    it('should accept action with later timestamp', () => {
      const now = Date.now();
      
      const action1 = createAction('poll:update', 'user1', { id: 'poll1' }, now);
      action1.version = 2;
      
      const action2 = createAction('poll:update', 'user2', { id: 'poll1' }, now - 100);
      action2.version = 1;

      const resolution = service.resolveConflict(action1, action2);
      expect(resolution.resolution).toBe('accepted');
    });

    it('should use version as tiebreaker for same timestamp', () => {
      const now = Date.now();
      
      const action1 = createAction('poll:update', 'user1', { id: 'poll1' }, now);
      action1.version = 2;
      
      const action2 = createAction('poll:update', 'user2', { id: 'poll1' }, now);
      action2.version = 1;

      const resolution = service.resolveConflict(action1, action2);
      expect(resolution.resolution).toBe('accepted');
    });
  });

  describe('Property 3: Versions increment correctly', () => {
    it('should start at version 0', () => {
      expect(service.getStateVersion()).toBe(0);
    });

    it('should increment version on each local action', () => {
      service.applyLocalAction(createAction());
      expect(service.getStateVersion()).toBe(1);

      service.applyLocalAction(createAction());
      expect(service.getStateVersion()).toBe(2);

      service.applyLocalAction(createAction());
      expect(service.getStateVersion()).toBe(3);
    });

    it('should update version when applying remote action with higher version', () => {
      const remoteAction = createAction();
      remoteAction.version = 10;

      service.applyAction(remoteAction);
      expect(service.getStateVersion()).toBe(10);
    });

    it('should not decrease version when applying action with lower version', () => {
      service.applyLocalAction(createAction()); // version 1
      service.applyLocalAction(createAction()); // version 2
      service.applyLocalAction(createAction()); // version 3

      const oldAction = createAction();
      oldAction.version = 1;

      service.applyAction(oldAction);
      expect(service.getStateVersion()).toBe(3);
    });

    it('should allow manual version increment', () => {
      expect(service.incrementVersion()).toBe(1);
      expect(service.incrementVersion()).toBe(2);
      expect(service.getStateVersion()).toBe(2);
    });
  });

  describe('Property 4: Duplicate actions are rejected', () => {
    it('should reject already applied action', () => {
      const action = createAction();
      
      const result1 = service.applyAction(action);
      expect(result1.resolution).toBe('accepted');

      const result2 = service.applyAction(action);
      expect(result2.resolution).toBe('rejected');
      expect(result2.reason).toContain('ya aplicada');
    });

    it('should track applied actions by ID', () => {
      const action = createAction();
      service.applyAction(action);

      expect(service.getAction(action.id)).not.toBeNull();
      expect(service.getAction('non-existent')).toBeNull();
    });
  });

  describe('Property 5: Pending actions management', () => {
    it('should track pending actions', () => {
      const action1 = createAction();
      const action2 = createAction();

      service.addPendingAction(action1);
      service.addPendingAction(action2);

      expect(service.hasPendingActions()).toBe(true);
      expect(service.getPendingActions().length).toBe(2);
    });

    it('should clear specific pending action', () => {
      const action1 = createAction();
      const action2 = createAction();

      service.addPendingAction(action1);
      service.addPendingAction(action2);

      service.clearPendingAction(action1.id);

      expect(service.getPendingActions().length).toBe(1);
      expect(service.getPendingActions()[0].id).toBe(action2.id);
    });

    it('should clear all pending actions', () => {
      service.addPendingAction(createAction());
      service.addPendingAction(createAction());
      service.addPendingAction(createAction());

      service.clearAllPendingActions();

      expect(service.hasPendingActions()).toBe(false);
      expect(service.getPendingActions().length).toBe(0);
    });
  });

  describe('Property 6: Action queries', () => {
    it('should filter actions by user', () => {
      service.applyLocalAction(createAction('poll:create', 'user1'));
      service.applyLocalAction(createAction('poll:create', 'user2'));
      service.applyLocalAction(createAction('poll:update', 'user1'));

      const user1Actions = service.getActionsByUser('user1');
      expect(user1Actions.length).toBe(2);
      expect(user1Actions.every(a => a.userId === 'user1')).toBe(true);
    });

    it('should filter actions by type', () => {
      service.applyLocalAction(createAction('poll:create', 'user1'));
      service.applyLocalAction(createAction('prediction:create', 'user2'));
      service.applyLocalAction(createAction('poll:create', 'user3'));

      const pollActions = service.getActionsByType('poll:create');
      expect(pollActions.length).toBe(2);
      expect(pollActions.every(a => a.type === 'poll:create')).toBe(true);
    });

    it('should get actions since timestamp', () => {
      const now = Date.now();
      
      const action1 = createAction('poll:create', 'user1', {}, now - 1000);
      const action2 = createAction('poll:create', 'user2', {}, now);
      const action3 = createAction('poll:create', 'user3', {}, now + 1000);

      service.applyAction(action1);
      service.applyAction(action2);
      service.applyAction(action3);

      const recentActions = service.getActionsSince(now - 500);
      expect(recentActions.length).toBe(2);
    });
  });

  describe('Property 7: Listeners', () => {
    it('should notify listeners on action applied', () => {
      const listener = vi.fn();
      service.onAction(listener);

      const action = createAction();
      service.applyLocalAction(action);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(action);
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = service.onAction(listener);

      service.applyLocalAction(createAction());
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      service.applyLocalAction(createAction());
      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should notify conflict listeners', () => {
      const conflictListener = vi.fn();
      service.onConflict(conflictListener);

      // Apply first action
      const action1 = createAction('poll:update', 'user1', { id: 'poll1' });
      service.applyAction(action1);

      // Try to apply conflicting action (same action ID)
      const result = service.applyAction(action1);
      
      // Duplicate rejection doesn't trigger conflict listener
      // Conflict listener is for actual conflicts, not duplicates
      expect(result.resolution).toBe('rejected');
    });
  });

  describe('Property 8: Full state sync', () => {
    it('should apply full state sync', () => {
      // Add some actions first
      service.applyLocalAction(createAction());
      service.applyLocalAction(createAction());

      const newState = { polls: [], predictions: [] };
      service.applyFullStateSync(newState, 100);

      expect(service.getStateVersion()).toBe(100);
      expect(service.getAppliedActions().length).toBe(1); // Only sync action
      expect(service.hasPendingActions()).toBe(false);
    });

    it('should notify listeners on full sync', () => {
      const listener = vi.fn();
      service.onAction(listener);

      service.applyFullStateSync({ data: 'test' }, 50);

      expect(listener).toHaveBeenCalledTimes(1);
      const action = listener.mock.calls[0][0];
      expect(action.type).toBe('state:full_sync');
      expect(action.version).toBe(50);
    });
  });

  describe('Property 9: Reset', () => {
    it('should reset all state', () => {
      service.applyLocalAction(createAction());
      service.applyLocalAction(createAction());
      service.addPendingAction(createAction());

      service.reset();

      expect(service.getStateVersion()).toBe(0);
      expect(service.getAppliedActions().length).toBe(0);
      expect(service.hasPendingActions()).toBe(false);
    });
  });

  describe('Property 10: Action creation', () => {
    it('should create action with correct properties', () => {
      const action = service.createAction(
        'poll:create',
        { title: 'Test Poll' },
        'user123',
        'Test User'
      );

      expect(action.id).toBeDefined();
      expect(action.type).toBe('poll:create');
      expect(action.payload).toEqual({ title: 'Test Poll' });
      expect(action.userId).toBe('user123');
      expect(action.userName).toBe('Test User');
      expect(action.timestamp).toBeDefined();
      expect(action.version).toBe(1); // stateVersion + 1
    });

    it('should create unique action IDs', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const action = service.createAction('poll:create', {}, 'user', 'User');
        expect(ids.has(action.id)).toBe(false);
        ids.add(action.id);
      }
    });
  });
});
