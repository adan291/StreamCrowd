# Chat Timers System - Tasks

## Task 1: Type Definitions and Configuration

### Task 1.1: Create Timer Types
- [x] Create `types/timers.ts` with Timer, TimerGroup, TimerTemplate, TimerExecutionLog, TimerEngineState interfaces
- [x] Export types from main types file

### Task 1.2: Add Timer Templates Config
- [x] Create `config/timerTemplates.ts` with predefined templates (social, rules, discord, donations, commands)

### Task 1.3: Update Platform Config
- [x] Add 'timers' tool to `TWITCH_TOOLS` in `config/platforms.ts`
- [x] Add 'timers' to `PlatformsTool` type in `types.ts`

### Task 1.4: Add i18n Translations
- [x] Create `i18n/timerLocales.ts` with Spanish translations for all timer UI strings
- [x] Integrate with main locales (merged into `i18n/locales.ts`, timerLocales.ts deleted)

---

## Task 2: Core Hook Implementation

### Task 2.1: Create useTimers Hook
- [x] Create `src/application/hooks/useTimers.ts`
- [x] Implement timer CRUD operations (add, update, delete, toggle)
- [x] Implement group CRUD operations
- [x] Implement localStorage persistence
- [x] Implement state management with useState

### Task 2.2: Create Timer Engine
- [x] Implement central interval (10 second check)
- [x] Implement timer execution logic (interval check, min lines check, group check)
- [x] Implement variable substitution (reuse from commands)
- [x] Implement execution logging
- [x] Implement chat line counting

### Task 2.3: Create useTimerVariables Hook
- [x] Implemented in useTimers.ts as substituteVariables function
- [x] Implement variable substitution: $(channel), $(game), $(uptime), $(viewers), $(followers), $(date), $(time)

---

## Task 3: UI Components

### Task 3.1: Create TimerForm Component
- [x] Create `components/timers/TimerForm.tsx`
- [x] Implement form fields: name, message, interval (slider + input), minChatLines (slider + input), group selector, enabled toggle
- [x] Implement variable preview
- [x] Implement validation (name required, message required, interval 1-120, minLines 0-100)
- [x] Support create and edit modes

### Task 3.2: Create TimerCard Component
- [x] Create `components/timers/TimerCard.tsx`
- [x] Display timer info: name, message (truncated), interval, min lines, group badge
- [x] Show next execution countdown
- [x] Add quick actions: toggle, edit, delete, execute now
- [x] Visual indicator for enabled/disabled state

### Task 3.3: Create TimerList Component
- [x] Create `components/timers/TimerList.tsx`
- [x] Render list of TimerCard components
- [x] Group timers by group (collapsible sections)
- [x] Empty state when no timers
- [x] Filter by group

### Task 3.4: Create TimerTemplates Component
- [x] Create `components/timers/TimerTemplates.tsx`
- [x] Display template cards by category
- [x] Preview template message
- [x] "Use template" action that opens form with prefilled values

### Task 3.5: Create TimerGroups Component
- [x] Create `components/timers/TimerGroups.tsx`
- [x] List groups with timer count
- [x] Create/edit/delete group actions
- [x] Toggle group enabled/disabled
- [x] Color picker for group

### Task 3.6: Create TimerLog Component
- [x] Create `components/timers/TimerLog.tsx`
- [x] Display execution history (last 50 entries)
- [x] Show timestamp, timer name, message, success/failure
- [x] Clear log action

### Task 3.7: Create TimersPanel Component
- [x] Create `components/timers/TimersPanel.tsx`
- [x] Implement tab navigation: Timers, Plantillas, Grupos, Log
- [x] Integrate all sub-components
- [x] Engine status indicator (running/stopped)
- [x] Start/stop engine controls
- [x] Chat line counter display

### Task 3.8: Create Component Index
- [x] Create `components/timers/index.ts` with all exports

---

## Task 4: Integration

### Task 4.1: Update TwitchToolSelector
- [x] Add Timer icon to TOOL_ICONS mapping in `components/TwitchToolSelector.tsx`

### Task 4.2: Update PlatformsPanel
- [x] Import TimersPanel in `components/PlatformsPanel.tsx`
- [x] Add case for 'timers' tool rendering
- [x] Pass required props (sendMessage, isConnected, channel)

### Task 4.3: Connect to Chat Service
- [x] Integrate timer message sending with existing tmi.js chat connection (via sendMessage prop in useTimers)
- [x] Handle connection state changes (pause timers when disconnected - auto-stop engine)

---

## Task 5: Polish and Accessibility

### Task 5.1: Accessibility Improvements
- [x] Add ARIA labels to all interactive elements
- [x] Implement keyboard navigation (Tab, Enter, Escape)
- [x] Add focus indicators
- [x] Screen reader announcements for state changes (via aria-live region in TimersPanel)

### Task 5.2: Visual Polish
- [x] Add animations for timer execution
- [x] Countdown animation for next execution
- [x] Toast notifications for timer events (via onNotification callback)
- [x] Responsive design for mobile

### Task 5.3: Error Handling
- [x] Handle localStorage errors gracefully
- [x] Handle chat disconnection during timer execution
- [x] Validate timer data on load (migration support) - implemented with versioning and migration functions

---

## Dependencies

```
Task 1.1 → Task 1.2, Task 2.1
Task 1.3 → Task 4.1, Task 4.2
Task 2.1 → Task 2.2, Task 3.x
Task 2.3 → Task 2.2
Task 3.1-3.6 → Task 3.7
Task 3.7 → Task 4.2
Task 4.1, Task 4.2 → Task 4.3
Task 4.3 → Task 5.x
```

## Estimated Effort

| Task Group | Estimated Time | Status |
|------------|----------------|--------|
| Task 1: Types & Config | 1 hour | ✅ Done |
| Task 2: Core Hook | 2 hours | ✅ Done |
| Task 3: UI Components | 3 hours | ✅ Done |
| Task 4: Integration | 1 hour | ✅ Done |
| Task 5: Polish | 1 hour | ✅ Done |
| **Total** | **8 hours** | **100%** |
