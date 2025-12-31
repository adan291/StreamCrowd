// Sync Service - Sincronización de estado entre colaboradores
import {
  SyncAction,
  SyncActionType,
  ConflictResolution
} from '../../../types/collaboration';

export class SyncService {
  private stateVersion: number = 0;
  private pendingActions: SyncAction[] = [];
  private appliedActions: Map<string, SyncAction> = new Map();
  private listeners: Set<(action: SyncAction) => void> = new Set();
  private conflictListeners: Set<(resolution: ConflictResolution) => void> = new Set();

  // ============================================
  // Action Creation
  // ============================================

  createAction(
    type: SyncActionType,
    payload: unknown,
    userId: string,
    userName: string
  ): SyncAction {
    const action: SyncAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      userId,
      userName,
      timestamp: Date.now(),
      version: this.stateVersion + 1
    };

    return action;
  }

  // ============================================
  // Action Application
  // ============================================

  applyAction(action: SyncAction): ConflictResolution {
    // Check if action was already applied
    if (this.appliedActions.has(action.id)) {
      return {
        action,
        resolution: 'rejected',
        reason: 'Acción ya aplicada'
      };
    }

    // Check for conflicts
    const conflict = this.detectConflict(action);
    if (conflict) {
      const resolution = this.resolveConflict(action, conflict);
      if (resolution.resolution === 'rejected') {
        this.notifyConflict(resolution);
        return resolution;
      }
    }

    // Apply action
    this.appliedActions.set(action.id, action);
    
    // Update version if action has higher version
    if (action.version > this.stateVersion) {
      this.stateVersion = action.version;
    }

    // Notify listeners
    this.notifyListeners(action);

    return {
      action,
      resolution: 'accepted'
    };
  }

  applyLocalAction(action: SyncAction): ConflictResolution {
    // For local actions, increment version
    action.version = ++this.stateVersion;
    
    this.appliedActions.set(action.id, action);
    this.notifyListeners(action);

    return {
      action,
      resolution: 'accepted'
    };
  }

  // ============================================
  // Conflict Detection and Resolution
  // ============================================

  private detectConflict(newAction: SyncAction): SyncAction | null {
    // Find conflicting action (same type and target within short time window)
    const conflictWindow = 1000; // 1 second
    
    for (const [, existingAction] of this.appliedActions) {
      if (this.actionsConflict(newAction, existingAction, conflictWindow)) {
        return existingAction;
      }
    }

    return null;
  }

  private actionsConflict(
    action1: SyncAction,
    action2: SyncAction,
    timeWindow: number
  ): boolean {
    // Different types don't conflict
    if (action1.type !== action2.type) return false;

    // Same user's actions don't conflict with each other
    if (action1.userId === action2.userId) return false;

    // Check time window
    if (Math.abs(action1.timestamp - action2.timestamp) > timeWindow) return false;

    // Check if they target the same entity
    const target1 = this.getActionTarget(action1);
    const target2 = this.getActionTarget(action2);

    return target1 !== null && target1 === target2;
  }

  private getActionTarget(action: SyncAction): string | null {
    const payload = action.payload as Record<string, unknown>;
    return (payload?.id as string) || (payload?.targetId as string) || null;
  }

  resolveConflict(localAction: SyncAction, remoteAction: SyncAction): ConflictResolution {
    // Last Write Wins (LWW) strategy
    if (localAction.timestamp > remoteAction.timestamp) {
      return {
        action: localAction,
        resolution: 'accepted',
        reason: 'Acción más reciente'
      };
    } else if (localAction.timestamp < remoteAction.timestamp) {
      return {
        action: localAction,
        resolution: 'rejected',
        reason: 'Sobrescrito por acción más reciente'
      };
    } else {
      // Same timestamp - use version as tiebreaker
      if (localAction.version >= remoteAction.version) {
        return {
          action: localAction,
          resolution: 'accepted',
          reason: 'Versión igual o mayor'
        };
      } else {
        return {
          action: localAction,
          resolution: 'rejected',
          reason: 'Versión menor'
        };
      }
    }
  }

  // ============================================
  // State Version
  // ============================================

  getStateVersion(): number {
    return this.stateVersion;
  }

  incrementVersion(): number {
    return ++this.stateVersion;
  }

  setStateVersion(version: number): void {
    this.stateVersion = version;
  }

  // ============================================
  // State Diff
  // ============================================

  getStateDiff(fromVersion: number): SyncAction[] {
    const diff: SyncAction[] = [];

    for (const [, action] of this.appliedActions) {
      if (action.version > fromVersion) {
        diff.push(action);
      }
    }

    // Sort by version
    diff.sort((a, b) => a.version - b.version);

    return diff;
  }

  getActionsSince(timestamp: number): SyncAction[] {
    const actions: SyncAction[] = [];

    for (const [, action] of this.appliedActions) {
      if (action.timestamp > timestamp) {
        actions.push(action);
      }
    }

    // Sort by timestamp
    actions.sort((a, b) => a.timestamp - b.timestamp);

    return actions;
  }

  // ============================================
  // Pending Actions
  // ============================================

  addPendingAction(action: SyncAction): void {
    this.pendingActions.push(action);
  }

  getPendingActions(): SyncAction[] {
    return [...this.pendingActions];
  }

  clearPendingAction(actionId: string): void {
    const index = this.pendingActions.findIndex(a => a.id === actionId);
    if (index !== -1) {
      this.pendingActions.splice(index, 1);
    }
  }

  clearAllPendingActions(): void {
    this.pendingActions = [];
  }

  hasPendingActions(): boolean {
    return this.pendingActions.length > 0;
  }

  // ============================================
  // Action History
  // ============================================

  getAppliedActions(): SyncAction[] {
    return Array.from(this.appliedActions.values());
  }

  getAction(actionId: string): SyncAction | null {
    return this.appliedActions.get(actionId) || null;
  }

  getActionsByUser(userId: string): SyncAction[] {
    return this.getAppliedActions().filter(a => a.userId === userId);
  }

  getActionsByType(type: SyncActionType): SyncAction[] {
    return this.getAppliedActions().filter(a => a.type === type);
  }

  // ============================================
  // Listeners
  // ============================================

  onAction(listener: (action: SyncAction) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onConflict(listener: (resolution: ConflictResolution) => void): () => void {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  private notifyListeners(action: SyncAction): void {
    this.listeners.forEach(listener => {
      try {
        listener(action);
      } catch (error) {
        console.error('Error in sync action listener:', error);
      }
    });
  }

  private notifyConflict(resolution: ConflictResolution): void {
    this.conflictListeners.forEach(listener => {
      try {
        listener(resolution);
      } catch (error) {
        console.error('Error in conflict listener:', error);
      }
    });
  }

  // ============================================
  // Reset
  // ============================================

  reset(): void {
    this.stateVersion = 0;
    this.pendingActions = [];
    this.appliedActions.clear();
  }

  // ============================================
  // Full State Sync
  // ============================================

  applyFullStateSync(state: unknown, version: number): void {
    // Clear existing actions
    this.appliedActions.clear();
    this.pendingActions = [];
    
    // Set new version
    this.stateVersion = version;

    // Create a synthetic action for the full sync
    const syncAction: SyncAction = {
      id: `sync-${Date.now()}`,
      type: 'state:full_sync',
      payload: state,
      userId: 'system',
      userName: 'Sistema',
      timestamp: Date.now(),
      version
    };

    this.appliedActions.set(syncAction.id, syncAction);
    this.notifyListeners(syncAction);
  }
}

// Singleton
let instance: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!instance) {
    instance = new SyncService();
  }
  return instance;
}

export function resetSyncService(): void {
  if (instance) {
    instance.reset();
  }
  instance = null;
}
