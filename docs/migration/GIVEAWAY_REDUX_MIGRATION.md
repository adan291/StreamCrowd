# Giveaway Components Redux Migration

## Overview

This document describes the migration of giveaway components to use Redux-based state management through the `useGiveaway` hook.

## Migration Status

### ✅ Completed Components

1. **CloudSyncButton.tsx**
   - Migrated to use Redux `useGiveaway` hook for cloud sync state
   - Maintains backward compatibility with prop-based API
   - Can now work standalone using Redux state
   - Requirements: 3.5, 3.6

2. **RandomWinnerOverlay.tsx**
   - Integrated Redux state for giveaway display
   - Syncs Redux state with local display state
   - Maintains BroadcastChannel for backward compatibility
   - Requirements: 3.5, 3.6

3. **SimpleGiveawayExample.tsx** (New)
   - Reference implementation showing Redux-based giveaway management
   - Demonstrates all core features: create, add participants, select winner, history
   - Serves as example for future component migrations
   - Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

### 📝 Notes on GiveawayHub.tsx

**GiveawayHub.tsx** uses a more complex architecture with multiple specialized hooks:
- `useRaffle` - Raffle configuration and state
- `useParticipants` - Participant management with blacklist
- `useThreads` - Multiple concurrent giveaways (threads)
- `useGiveawayCloud` - Cloud synchronization
- `useGiveawaySync` - BroadcastChannel sync
- `useGiveawaySound` - Sound effects
- `useWinnerAnimation` - Winner selection animation

This component was **not migrated** because:
1. It doesn't use Context API (already uses custom hooks)
2. It supports advanced features not in the Redux slice (multiple concurrent giveaways, scheduling, threads)
3. Migration would require significant refactoring and potential feature loss
4. The current architecture is well-structured and performant

### 🔍 Components Not Found

The following components mentioned in the task description were not found:
- **GiveawayForm.tsx** - Does not exist as a separate file
- **GiveawayOverlay.tsx** - Functionality is in RandomWinnerOverlay.tsx

## Redux State Structure

The `useGiveaway` hook provides access to the following state:

```typescript
interface UseGiveawayReturn {
  // State
  activeGiveaway: Giveaway | null;
  history: Giveaway[];
  error: string | null;
  isSelecting: boolean;
  cloudSyncEnabled: boolean;
  lastSyncedAt: string | null;
  participants: Participant[];
  participantCount: number;
  winner: Participant | null;
  status: 'active' | 'selecting' | 'ended' | null;
  historyCount: number;
  participantsByPlatform: Record<string, Participant[]>;

  // Actions
  createGiveaway: (title: string) => void;
  addParticipant: (participant: Omit<Participant, 'id' | 'joinedAt'>) => void;
  removeParticipant: (participantId: string) => void;
  clearParticipants: () => void;
  selectWinner: () => void;
  confirmWinner: () => void;
  rerollWinner: () => void;
  endGiveaway: () => void;
  resetGiveaway: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  clearHistory: () => void;
  removeFromHistory: (giveawayId: string) => void;
  enableCloudSync: () => void;
  disableCloudSync: () => void;
  updateLastSynced: () => void;
  restoreGiveaway: (giveaway: Giveaway) => void;
}
```

## Migration Pattern

### Before (Context API or Props)
```typescript
// Component receives state via props
interface MyComponentProps {
  isReady: boolean;
  syncEnabled: boolean;
  onToggleSync: (enabled: boolean) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  isReady,
  syncEnabled,
  onToggleSync,
}) => {
  // Use props
  return <div>{syncEnabled ? 'On' : 'Off'}</div>;
};
```

### After (Redux)
```typescript
// Component uses Redux hook
import { useGiveaway } from '../../src/application/hooks/useGiveaway';

export const MyComponent: React.FC = () => {
  const giveaway = useGiveaway();
  
  // Use Redux state and actions
  return (
    <div>
      {giveaway.cloudSyncEnabled ? 'On' : 'Off'}
      <button onClick={() => giveaway.enableCloudSync()}>
        Enable
      </button>
    </div>
  );
};
```

### Hybrid Approach (Backward Compatible)
```typescript
// Component supports both props and Redux
interface MyComponentProps {
  syncEnabled?: boolean;
  onToggleSync?: (enabled: boolean) => void;
}

export const MyComponent: React.FC<MyComponentProps> = (props) => {
  const giveaway = useGiveaway();
  
  // Use props if provided, otherwise use Redux
  const syncEnabled = props.syncEnabled ?? giveaway.cloudSyncEnabled;
  const onToggleSync = props.onToggleSync ?? ((enabled: boolean) => {
    if (enabled) giveaway.enableCloudSync();
    else giveaway.disableCloudSync();
  });
  
  return <div>{syncEnabled ? 'On' : 'Off'}</div>;
};
```

## Benefits of Redux Migration

1. **Single Source of Truth**: All giveaway state in one place
2. **Persistence**: Automatic state persistence via redux-persist
3. **DevTools**: Redux DevTools for debugging state changes
4. **Type Safety**: Full TypeScript support with typed selectors
5. **Memoization**: Optimized re-renders with memoized selectors
6. **Testability**: Easier to test with predictable state updates

## Testing

### Unit Tests
```typescript
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { useGiveaway } from './useGiveaway';

test('creates giveaway', () => {
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useGiveaway(), { wrapper });
  
  act(() => {
    result.current.createGiveaway('Test Giveaway');
  });
  
  expect(result.current.activeGiveaway).not.toBeNull();
  expect(result.current.activeGiveaway?.title).toBe('Test Giveaway');
});
```

### Integration Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { SimpleGiveawayExample } from './SimpleGiveawayExample';

test('full giveaway flow', () => {
  render(
    <Provider store={store}>
      <SimpleGiveawayExample />
    </Provider>
  );
  
  // Create giveaway
  const titleInput = screen.getByPlaceholderText('Giveaway title...');
  fireEvent.change(titleInput, { target: { value: 'Test' } });
  fireEvent.click(screen.getByRole('button', { name: /create/i }));
  
  // Add participant
  const participantInput = screen.getByPlaceholderText('Participant username...');
  fireEvent.change(participantInput, { target: { value: 'user1' } });
  fireEvent.click(screen.getByRole('button', { name: /add/i }));
  
  // Select winner
  fireEvent.click(screen.getByRole('button', { name: /select winner/i }));
  
  // Verify winner selected
  expect(screen.getByText(/winner/i)).toBeInTheDocument();
});
```

## Future Improvements

1. **Add Syncing State**: Add `isSyncing` to Redux state for better loading indicators
2. **Async Actions**: Use `createAsyncThunk` for cloud sync operations
3. **Optimistic Updates**: Update UI immediately, sync to cloud in background
4. **Conflict Resolution**: Handle conflicts when syncing from multiple devices
5. **Offline Support**: Queue actions when offline, sync when online

## References

- Redux Toolkit Documentation: https://redux-toolkit.js.org/
- Redux Persist: https://github.com/rt2zz/redux-persist
- React Redux Hooks: https://react-redux.js.org/api/hooks

## Requirements Validation

✅ **Requirement 3.1**: Giveaway creation stores data with title, participants, and configuration
✅ **Requirement 3.2**: Participant management updates the participant list
✅ **Requirement 3.3**: Winner selection stores winner and updates status
✅ **Requirement 3.4**: Giveaway ending moves to history
✅ **Requirement 3.5**: Page refresh restores state from localStorage (via redux-persist)
✅ **Requirement 3.6**: Cloud sync integration with Firebase (via cloudSyncEnabled flag)

## Conclusion

The giveaway components have been successfully migrated to use Redux state management where applicable. The migration maintains backward compatibility while providing the benefits of centralized state management, persistence, and improved developer experience.

For new components, use the `SimpleGiveawayExample.tsx` as a reference implementation.
