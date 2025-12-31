# Custom Commands Enhancement - Tasks

## Phase 1: Foundation & Templates

### Task 1.1: Create Command Templates Configuration
- [x] Create `config/commandTemplates.ts` with 20+ predefined templates
- [x] Define `CommandTemplate` interface in `types/commandEditor.ts`
- [x] Organize templates by category (info, social, entertainment, moderation, utility, games)
- [x] Include variable placeholders for customization

**Requirements:** US-1 (AC1.1, AC1.2, AC1.6)

### Task 1.2: Create CommandTemplateLibrary Component
- [x] Create `components/commands/CommandTemplateLibrary.tsx`
- [x] Display templates organized by category with tabs/accordion
- [x] Show template preview with name, description, trigger, response
- [x] Add "Use Template" button that opens customization modal
- [x] Implement template search/filter functionality

**Requirements:** US-1 (AC1.3, AC1.4, AC1.5)

### Task 1.3: Create Category System
- [x] Create `config/commandCategories.ts` with default categories
- [x] Add `categoryId` field to command type
- [x] Create `CommandCategoryManager.tsx` for category CRUD
- [x] Implement category filter in command list
- [x] Add category badge/icon to command items

**Requirements:** US-5 (AC5.1, AC5.2, AC5.3, AC5.4, AC5.6)

---

## Phase 2: Visual Editor

### Task 2.1: Create Visual Editor Types
- [x] Create `types/commandEditor.ts` with block interfaces
- [x] Define BlockType, BlockConfig, and related types
- [x] Create utility functions for block manipulation
- [x] Add serialization/deserialization for blocks ↔ text

**Requirements:** US-2 (AC2.7)

### Task 2.2: Create CommandBlock Component
- [x] Create `components/commands/CommandBlock.tsx`
- [x] Implement TextBlock with inline text editing
- [x] Implement VariableBlock with variable selector dropdown
- [x] Implement ConditionalBlock with condition config
- [x] Implement ApiBlock with URL input and fallback
- [x] Add drag handle and delete button to each block

**Requirements:** US-2 (AC2.2, AC2.5, AC2.8)

### Task 2.3: Create CommandBlockPanel Component
- [x] Create `components/commands/CommandBlockPanel.tsx`
- [x] Display available block types with icons and descriptions
- [x] Make blocks draggable to the editor area
- [x] Group blocks by type (Basic, Variables, Advanced)

**Requirements:** US-2 (AC2.3)

### Task 2.4: Create VisualCommandEditor Component
- [x] Create `components/commands/VisualCommandEditor.tsx`
- [x] Implement drop zone for blocks
- [x] Enable drag-and-drop reordering of blocks
- [x] Show real-time preview of command output
- [x] Add toggle between visual and text mode
- [x] Implement keyboard navigation for accessibility

**Requirements:** US-2 (AC2.1, AC2.4, AC2.6, AC2.7), TR-3

### Task 2.5: Create useVisualEditor Hook
- [x] Create `src/application/hooks/useVisualEditor.ts`
- [x] Manage block state (add, remove, reorder, update)
- [x] Implement text ↔ blocks conversion
- [x] Handle drag-and-drop logic
- [x] Provide preview generation

**Requirements:** US-2

---

## Phase 3: Command Testing

### Task 3.1: Create CommandTester Component
- [x] Create `components/commands/CommandTester.tsx`
- [x] Add user level selector (viewer, sub, mod, broadcaster)
- [x] Add arguments input field
- [x] Display test result with variable substitution
- [x] Show warnings for invalid variables or unreachable APIs

**Requirements:** US-6 (AC6.1, AC6.2, AC6.3, AC6.4, AC6.6)

### Task 3.2: Create useCommandTester Hook
- [x] Create `src/application/hooks/useCommandTester.ts`
- [x] Implement variable substitution logic
- [x] Create test contexts for different user levels
- [x] Validate command syntax before testing
- [x] Generate sample data for variables

**Requirements:** US-6 (AC6.5)

---

## Phase 4: AI Integration

### Task 4.1: Create AICommandService
- [x] Create `src/application/services/AICommandService.ts`
- [x] Implement `generateCommand()` method
- [x] Implement `analyzeCommands()` method
- [x] Implement `suggestImprovements()` method
- [x] Add rate limiting and error handling
- [x] Integrate with existing AI service

**Requirements:** US-3, US-4, TR-4

### Task 4.2: Create AICommandGenerator Component
- [x] Create `components/commands/AICommandGenerator.tsx`
- [x] Add description input field with placeholder examples
- [x] Show "Generate with AI" button with loading state
- [x] Display generated command with edit capability
- [x] Show alternative suggestions
- [x] Add to command list on confirmation

**Requirements:** US-4 (AC4.1, AC4.2, AC4.3, AC4.4, AC4.6)

### Task 4.3: Add AI Analysis to DataPanel
- [x] Add "Commands" tab to AI analysis section (added as "Análisis" tab in EnhancedCommandPanel)
- [x] Display command analysis results
- [x] Show duplicate/similar command warnings
- [x] List optimization suggestions with actions
- [x] Show new command recommendations

**Requirements:** US-3 (AC3.1, AC3.2, AC3.3, AC3.4, AC3.5, AC3.6, AC3.7)

---

## Phase 5: Integration & Polish

### Task 5.1: Enhance CommandPanel
- [x] Add template library toggle/tab
- [x] Add visual editor mode toggle
- [x] Integrate category filter
- [x] Add global search across all command fields
- [x] Add "Test" button to each command row

**Requirements:** US-5 (AC5.7), US-6 (AC6.1)

### Task 5.2: Update Export/Import
- [x] Extend export format to version 2.0 with categories
- [x] Add backward compatibility for v1.0 imports
- [x] Include usage stats and metadata in export
- [x] Auto-migrate imported commands to categories

**Requirements:** TR-1

### Task 5.3: Add i18n Translations
- [x] Add Spanish translations for all new UI elements
- [x] Add English translations
- [x] Translate template names and descriptions
- [x] Translate export/import UI elements

### Task 5.4: Performance Optimization
- [x] Virtualize command list for large datasets
- [x] Debounce search input
- [x] Lazy load template library
- [x] Cache AI analysis results (via useLazyLoad hook)

**Requirements:** TR-2

### Task 5.5: Accessibility Improvements
- [x] Add ARIA labels to all interactive elements
- [x] Implement keyboard shortcuts for common actions
- [x] Add focus management for modals
- [x] Add role attributes for semantic structure

**Requirements:** TR-3

---

## Summary

| Phase | Tasks | Priority |
|-------|-------|----------|
| Phase 1: Foundation | 3 tasks | High |
| Phase 2: Visual Editor | 5 tasks | High |
| Phase 3: Testing | 2 tasks | Medium |
| Phase 4: AI Integration | 3 tasks | Medium |
| Phase 5: Integration | 5 tasks | Low |

**Total: 18 tasks**
