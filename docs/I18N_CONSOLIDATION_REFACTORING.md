# i18n Consolidation Refactoring Plan (REQ-010)

**Date:** January 18, 2026  
**Status:** In Progress → Completion  
**Progress:** 85% → 100%

---

## 📋 Overview

Complete the i18n consolidation by refactoring components that use incorrect translation paths. The modular i18n system has `misc` module for miscellaneous translations, but some components are accessing them directly.

---

## 🎯 Objectives

1. ✅ Modular structure implemented (es/en by domain)
2. ✅ Lazy loading system working
3. ✅ Property-based validation tests
4. ✅ Chat translations moved to core module
5. ✅ Documentation updated
6. **🔄 Refactor components to use correct translation paths** ← CURRENT TASK

---

## 🔍 Components Requiring Refactoring

### 1. Timers Module (6 files)

**Current:** `t.timers.*`  
**Correct:** `t.misc.timers.*`

Files to update:
- `components/timers/TimersPanel.tsx` (15 occurrences)
- `components/timers/TimerList.tsx` (8 occurrences)
- `components/timers/TimerForm.tsx` (20+ occurrences)
- `components/timers/TimerGroups.tsx` (15 occurrences)
- `components/timers/TimerLog.tsx` (6 occurrences)
- `components/timers/TimerTemplates.tsx` (5 occurrences)

**Impact:** ~70 translation calls to update

---

### 2. SoundBoard Component

**Current:** `t.soundboard.*`  
**Correct:** `t.misc.soundboard.*`

Files to update:
- `components/SoundBoard.tsx` (5 occurrences)

**Impact:** ~5 translation calls to update

---

### 3. SpinnerWheel Component

**Current:** `t.spinner.*`  
**Correct:** `t.misc.spinner.*`

Files to update:
- `components/SpinnerWheel.tsx` (1 occurrence)

**Impact:** ~1 translation call to update

---

### 4. AssetLibrary Component

**Current:** `t.gallery.*`  
**Correct:** `t.misc.gallery.*`

Files to update:
- `components/AssetLibrary.tsx` (5 occurrences)

**Impact:** ~5 translation calls to update

---

## 📊 Validation Issues (False Positives)

The validator reports these issues, but they are false positives:

### Issue 1: poll.winner
- **Status:** ✅ EXISTS in both ES and EN
- **Action:** Ignore - validation bug

### Issue 2: giveaway.participants interpolation
- **Status:** ✅ Both ES and EN use simple string (no interpolation)
- **Action:** Ignore - validation bug

---

## 🔧 Refactoring Strategy

### Step 1: Update Timers Components
```typescript
// Before
import { useTranslation } from '@/i18n/context';
const { t } = useTranslation();
console.log(t.timers.title);

// After
import { useTranslation } from '@/i18n/context';
const { t } = useTranslation();
console.log(t.misc.timers.title);
```

### Step 2: Update Other Components
Same pattern for SoundBoard, SpinnerWheel, and AssetLibrary.

### Step 3: Verify No Regressions
- Run TypeScript compiler
- Run linter
- Test affected components manually

---

## ✅ Success Criteria

- [ ] All timer components use `t.misc.timers.*`
- [ ] SoundBoard uses `t.misc.soundboard.*`
- [ ] SpinnerWheel uses `t.misc.spinner.*`
- [ ] AssetLibrary uses `t.misc.gallery.*`
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Components render correctly

---

## 📈 Progress Tracking

| Component | Files | Occurrences | Status |
|-----------|-------|-------------|--------|
| Timers | 6 | ~70 | ⏳ Pending |
| SoundBoard | 1 | ~5 | ⏳ Pending |
| SpinnerWheel | 1 | ~1 | ⏳ Pending |
| AssetLibrary | 1 | ~5 | ⏳ Pending |

**Total:** 9 files, ~81 translation calls

---

## 🚀 Implementation Order

1. **TimersPanel.tsx** - Most critical, main entry point
2. **TimerForm.tsx** - Form component with most translations
3. **TimerList.tsx** - List display component
4. **TimerGroups.tsx** - Group management
5. **TimerLog.tsx** - Log viewer
6. **TimerTemplates.tsx** - Template system
7. **SoundBoard.tsx** - Sound effects panel
8. **SpinnerWheel.tsx** - Spinner/wheel component
9. **AssetLibrary.tsx** - Asset management

---

## 📝 Notes

- All changes are mechanical find-replace operations
- No logic changes required
- TypeScript will catch any mistakes
- i18n system already has all translations in correct location
- This is purely a path correction exercise

---

**Estimated Time:** 30-45 minutes  
**Risk Level:** Low (mechanical refactoring)  
**Testing Required:** Manual smoke testing of affected components
