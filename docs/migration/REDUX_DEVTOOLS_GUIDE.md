# Redux DevTools Usage Guide

## Quick Start

This guide shows you how to use Redux DevTools to verify performance, monitor actions, and debug state changes in StreamCrowd.

---

## Installation

### 1. Install Browser Extension

**Chrome:**
```
https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd
```

**Firefox:**
```
https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/
```

**Edge:**
```
Search "Redux DevTools" in Edge Add-ons
```

### 2. Verify Installation

1. Open StreamCrowd in development mode
2. Open browser DevTools (F12)
3. Look for "Redux" tab
4. You should see the Redux state tree

---

## Checking Action Frequency

### Method 1: Action List View

1. Open Redux DevTools
2. Click "Inspector" tab
3. Perform actions in the app (create poll, add votes, etc.)
4. Watch actions appear in real-time

**What to look for:**
- ✅ Each user action should dispatch 1-2 Redux actions
- ❌ If you see 10+ actions for one user action, there's a problem
- ❌ If actions repeat rapidly without user input, there's a loop

### Method 2: Chart View

1. Open Redux DevTools
2. Click "Chart" tab
3. Perform actions in the app
4. Watch the action frequency graph

**What to look for:**
- ✅ Spikes only when user performs actions
- ❌ Constant high frequency (indicates action loop)
- ❌ Gradual increase over time (indicates memory leak)

### Method 3: Action Filtering

Filter actions to focus on specific slices:

```
Filter: poll/
Shows: poll/createPoll, poll/addVote, poll/endPoll

Filter: giveaway/
Shows: giveaway/createGiveaway, giveaway/addParticipant, etc.
```

---

## Verifying No Unnecessary Re-renders

### Using Redux DevTools

1. Open Redux DevTools
2. Click "Diff" tab
3. Perform an action (e.g., add vote to poll)
4. Check the diff view

**Example: Adding a vote**

```diff
State Diff:
poll.active.options[0].votes
- 5
+ 6
```

**What to verify:**
- ✅ Only the changed data appears in diff
- ✅ Other slices (giveaway, games, etc.) show no changes
- ❌ If entire state tree shows changes, there's a problem

### Using React DevTools Profiler

1. Open React DevTools
2. Click "Profiler" tab
3. Click "Record" button
4. Perform an action (e.g., add vote)
5. Stop recording
6. Check which components re-rendered

**What to look for:**
- ✅ Only components using poll state re-render
- ✅ Giveaway components do NOT re-render
- ❌ If all components re-render, selectors aren't working

---

## Verifying Selector Memoization

### Method 1: Console Testing

Open browser console and run:

```javascript
// Get the store
const store = window.__REDUX_DEVTOOLS_EXTENSION__.store;

// Get state
const state1 = store.getState();
const state2 = store.getState();

// Check if same reference (should be true)
console.log(state1 === state2); // true

// Dispatch an action
store.dispatch({ type: 'poll/addVote', payload: { optionId: 'opt-1' } });

// Get new state
const state3 = store.getState();

// Check if different reference (should be true)
console.log(state1 === state3); // true (different state)

// But unrelated slices should be same reference
console.log(state1.giveaway === state3.giveaway); // true (memoized)
```

### Method 2: Performance Tab

1. Open Redux DevTools
2. Click "Trace" tab
3. Enable "Trace" mode
4. Perform actions
5. Check action processing time

**What to look for:**
- ✅ Most actions process in < 1ms
- ✅ Complex actions (sorting, filtering) < 10ms
- ❌ If actions take > 50ms, there's a performance issue

---

## Common Performance Issues

### Issue 1: Action Loop

**Symptoms:**
- Actions dispatching continuously
- DevTools shows hundreds of actions per second
- App becomes unresponsive

**How to detect:**
1. Open Redux DevTools
2. Watch action list
3. If actions appear without user input, there's a loop

**Common causes:**
```typescript
// ❌ BAD: Dispatching in render
const MyComponent = () => {
  dispatch(someAction()); // Causes infinite loop
  return <div>...</div>;
};

// ✅ GOOD: Dispatch in effect or handler
const MyComponent = () => {
  useEffect(() => {
    dispatch(someAction());
  }, []);
  return <div>...</div>;
};
```

### Issue 2: Unnecessary Re-renders

**Symptoms:**
- App feels sluggish
- Components flash/flicker
- High CPU usage

**How to detect:**
1. Open React DevTools Profiler
2. Record interaction
3. Check "Ranked" view
4. Look for components with high render count

**Common causes:**
```typescript
// ❌ BAD: Selecting entire state
const state = useAppSelector((state) => state);

// ✅ GOOD: Select only what you need
const title = useAppSelector((state) => state.poll.active?.title);
```

### Issue 3: Selector Not Memoizing

**Symptoms:**
- Slow performance with large datasets
- High CPU usage during state updates
- DevTools shows long action processing times

**How to detect:**
1. Open Redux DevTools
2. Click "Trace" tab
3. Check action processing times
4. If > 50ms, selectors may not be memoized

**Common causes:**
```typescript
// ❌ BAD: Creating new array every time
export const selectSortedOptions = (state) => 
  state.poll.active?.options.sort(...); // Not memoized!

// ✅ GOOD: Using createSelector
export const selectSortedOptions = createSelector(
  [(state) => state.poll.active?.options],
  (options) => [...options].sort(...) // Memoized!
);
```

---

## Performance Checklist

Use this checklist to verify Redux performance:

### Action Frequency
- [ ] Actions only dispatch on user interaction
- [ ] No action loops (continuous dispatching)
- [ ] Action frequency < 10 per second during normal use
- [ ] No duplicate actions for single user action

### Re-renders
- [ ] Components only re-render when their data changes
- [ ] Unrelated components don't re-render
- [ ] Re-render count < 5 for typical user action
- [ ] No flickering or visual glitches

### Selector Memoization
- [ ] Selectors use `createSelector` for derived data
- [ ] Same state returns same reference
- [ ] Unrelated state changes don't trigger recomputation
- [ ] Large dataset operations are fast (< 10ms)

### Memory
- [ ] State size remains reasonable (< 10MB)
- [ ] No memory leaks over time
- [ ] History arrays have reasonable limits
- [ ] Old data is properly cleaned up

### DevTools
- [ ] DevTools shows all actions
- [ ] State tree is readable and organized
- [ ] Time-travel debugging works
- [ ] Diff view shows only changed data

---

## Advanced DevTools Features

### 1. Time-Travel Debugging

**Use case:** Reproduce a bug

1. Perform actions that cause the bug
2. Click on earlier action in DevTools
3. App state jumps back to that point
4. Step forward/backward to find exact moment bug occurs

### 2. Action Replay

**Use case:** Test action sequences

1. Record a sequence of actions
2. Export actions as JSON
3. Import and replay in different environment
4. Verify behavior is consistent

### 3. State Export/Import

**Use case:** Share bug reports

1. Click "Export" in DevTools
2. Save state as JSON
3. Share with team
4. Import state to reproduce issue

### 4. Custom Action Monitoring

Add custom middleware to track specific actions:

```typescript
const actionMonitor = (store) => (next) => (action) => {
  // Log specific actions
  if (action.type.startsWith('poll/')) {
    console.log('Poll action:', action);
  }
  
  // Measure performance
  const start = performance.now();
  const result = next(action);
  const duration = performance.now() - start;
  
  if (duration > 16) {
    console.warn(`Slow action: ${action.type} (${duration}ms)`);
  }
  
  return result;
};
```

---

## Troubleshooting

### DevTools Not Showing

**Problem:** Redux tab doesn't appear in browser DevTools

**Solutions:**
1. Verify extension is installed and enabled
2. Check you're in development mode (`NODE_ENV !== 'production'`)
3. Refresh the page
4. Check browser console for errors

### Actions Not Appearing

**Problem:** Actions dispatch but don't show in DevTools

**Solutions:**
1. Check DevTools is connected (green dot in extension icon)
2. Verify store is configured with `devTools: true`
3. Check action format (must have `type` property)
4. Look for serialization errors in console

### State Not Updating

**Problem:** Actions dispatch but state doesn't change

**Solutions:**
1. Check reducer is handling the action type
2. Verify reducer returns new state (not mutating)
3. Check action payload is correct format
4. Look for errors in reducer logic

---

## Performance Testing Commands

Run performance tests to verify optimization:

```bash
# Run all performance tests
npm test -- tests/application/performance.test.ts --run

# Run specific test suite
npm test -- tests/application/performance.test.ts -t "Selector Memoization" --run

# Run with coverage
npm test -- tests/application/performance.test.ts --coverage --run
```

---

## Resources

- [Redux DevTools Documentation](https://github.com/reduxjs/redux-devtools)
- [Redux Toolkit Performance](https://redux-toolkit.js.org/usage/usage-guide#performance)
- [React-Redux Performance](https://react-redux.js.org/api/hooks#performance)
- [Reselect (Memoization)](https://github.com/reduxjs/reselect)

---

**Document Status:** ✅ Complete  
**Last Updated:** 2026-01-16
