/**
 * Application State Management (Redux)
 * 
 * Contains:
 * - store.ts: Redux store configuration
 * - hooks.ts: Custom typed hooks (useAppDispatch, useAppSelector)
 * - slices/: Redux slices for each feature
 * - stateRecovery.ts: State snapshot and recovery functionality
 */

export { store, persistor, type RootState, type AppDispatch, STATE_RECOVERY_RESTORE } from './store';
export { useAppDispatch, useAppSelector, useAppState } from './hooks';
export { 
  stateRecoveryService, 
  withStateRecovery,
  type StateSnapshot,
  type SnapshotMetadata,
  type RecoveryResult,
  type SnapshotOptions,
  type WithRecoveryOptions,
} from './stateRecovery';
// export * from './slices';
