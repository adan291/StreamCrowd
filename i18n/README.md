# i18n System Documentation

## Overview

This is a comprehensive, modular internationalization (i18n) system designed for high-performance applications with lazy loading capabilities. The system supports Spanish (ES) and English (EN) locales with strict TypeScript typing and automatic validation.

## 🚀 Key Features

- **🔄 Lazy Loading**: Feature modules loaded on-demand to reduce initial bundle size
- **📦 Modular Structure**: Translations organized by domain/feature for better maintainability
- **🔒 Type Safety**: Full TypeScript support with autocomplete for all translation keys
- **✅ Validation System**: Comprehensive validation ensuring translation completeness and consistency
- **🎯 Performance Optimized**: Core modules (~20% of translations) loaded at startup, features loaded as needed
- **🔧 Developer Experience**: Rich tooling including CLI validation, testing utilities, and detailed documentation

## 📁 Directory Structure

```
i18n/
├── README.md                    # This documentation
├── index.ts                     # Main exports
├── types.ts                     # TypeScript type definitions
├── context.tsx                  # React context and hooks
├── utils.ts                     # Utility functions (interpolation, formatting)
├── validation.ts                # Validation system
├── validate-cli.cjs             # CLI validation tool
├── VALIDATION.md                # Validation system documentation
├── USAGE.md                     # Usage examples and migration guide
└── locales/
    ├── index.ts                 # Combined locale exports
    ├── es/                      # Spanish translations
    │   ├── index.ts             # Spanish module aggregator
    │   ├── common.ts            # Core: Common UI elements
    │   ├── errors.ts            # Core: Error messages
    │   ├── navigation.ts        # Core: Navigation and menus
    │   ├── poll.ts              # Feature: Polls and voting
    │   ├── games.ts             # Feature: Interactive games
    │   ├── giveaway.ts          # Feature: Giveaways and raffles
    │   ├── macros.ts            # Feature: Macro system
    │   ├── commands.ts          # Feature: Chat commands
    │   ├── predictions.ts       # Feature: Twitch predictions
    │   ├── rewards.ts           # Feature: Channel point rewards
    │   ├── moderation.ts        # Feature: Moderation tools
    │   ├── analytics.ts         # Feature: Analytics and metrics
    │   ├── overlay.ts           # Feature: OBS overlays
    │   ├── platforms.ts         # Feature: Platform integrations
    │   └── misc.ts              # Feature: Miscellaneous (mascot, chat, etc.)
    └── en/                      # English translations (same structure as es/)
        ├── index.ts
        ├── common.ts
        ├── errors.ts
        └── ... (mirrors es/ structure)
```

## 🏗️ Architecture

### Core vs Feature Modules

**Core Modules** (loaded at startup):
- `common` - Essential UI elements (save, cancel, loading, etc.) and core chat translations
- `errors` - Error messages and recovery options  
- `navigation` - Navigation and menu items

**Feature Modules** (lazy loaded):
- `poll` - Polls and voting functionality
- `games` - Interactive games (Pium Ball, Roulette, etc.)
- `giveaway` - Giveaways and raffles
- `macros` - Macro system with triggers and actions
- `commands` - Chat command system with templates
- `predictions` - Twitch predictions integration
- `rewards` - Channel point rewards management
- `moderation` - Chat moderation tools
- `analytics` - Analytics and metrics with AI insights
- `overlay` - OBS overlay customization
- `platforms` - Multi-platform integrations (Twitch, YouTube, Kick)
- `misc` - Miscellaneous features (mascot, chat simulator, etc.)

> **Note**: Chat translations were moved from `misc` to `common` to ensure they're always available for core components that need immediate access to chat-related strings without lazy loading delays.

### Lazy Loading Benefits

- **Reduced Initial Bundle**: ~80% reduction in initial translation payload
- **Faster Startup**: Core functionality available immediately
- **Memory Efficient**: Only load translations when features are accessed
- **Automatic Caching**: Loaded modules persist until locale change
- **Seamless UX**: Loading states handled gracefully

## 📝 Naming Conventions

### Translation Keys

#### 1. **camelCase for Keys**
```typescript
// ✅ Good
buttonSave: "Guardar"
errorNetwork: "Error de red"
pollCreateTitle: "Crear encuesta"

// ❌ Bad
button_save: "Guardar"
"error-network": "Error de red"
"poll.create.title": "Crear encuesta"
```

#### 2. **Namespace with Dots for Nested Objects**
```typescript
// ✅ Good
errors: {
  network: {
    timeout: "Tiempo de espera agotado",
    connectionLost: "Conexión perdida"
  },
  validation: {
    required: "Campo requerido",
    invalidFormat: "Formato inválido"
  }
}

// Access: t.errors.network.timeout
```

#### 3. **Plurals with Suffix**
```typescript
// ✅ Good
message: "mensaje"
messages: "mensajes"
participant: "participante"
participants: "participantes"

// With count context
messageCount: "{{count}} mensaje"
messagesCount: "{{count}} mensajes"
```

#### 4. **Action-Based Naming**
```typescript
// ✅ Good - Action verbs
create: "Crear"
edit: "Editar"
delete: "Eliminar"
save: "Guardar"
cancel: "Cancelar"

// ✅ Good - State descriptions
loading: "Cargando..."
active: "Activo"
completed: "Completado"
```

#### 5. **Consistent Hierarchical Structure**
```typescript
// ✅ Good - Consistent grouping
poll: {
  title: "Encuestas",
  create: "Crear encuesta",
  edit: "Editar encuesta",
  delete: "Eliminar encuesta",
  actions: {
    start: "Iniciar",
    stop: "Detener",
    reset: "Reiniciar"
  },
  status: {
    active: "Activa",
    ended: "Finalizada",
    draft: "Borrador"
  }
}
```

### Variable Interpolation

#### 1. **Double Braces Syntax**
```typescript
// ✅ Good
welcome: "Bienvenido, {{username}}!"
voteCount: "{{count}} votos"
timeRemaining: "Quedan {{minutes}} minutos y {{seconds}} segundos"

// ❌ Bad
welcome: "Bienvenido, {username}!"      // Single braces
voteCount: "{{count}} vote(s)"          // English pluralization in Spanish
```

#### 2. **Descriptive Variable Names**
```typescript
// ✅ Good
pollEnded: "La encuesta '{{pollTitle}}' ha finalizado con {{totalVotes}} votos"
userJoined: "{{displayName}} se ha unido al canal"

// ❌ Bad
pollEnded: "La encuesta '{{a}}' ha finalizado con {{b}} votos"
userJoined: "{{user}} se ha unido al canal"
```

#### 3. **Consistent Variable Names Across Locales**
```typescript
// ✅ Good - Same variables in both locales
// ES
greeting: "Hola, {{name}}! Tienes {{count}} mensajes nuevos"
// EN  
greeting: "Hello, {{name}}! You have {{count}} new messages"

// ❌ Bad - Different variable names
// ES
greeting: "Hola, {{nombre}}! Tienes {{cantidad}} mensajes nuevos"
// EN
greeting: "Hello, {{name}}! You have {{count}} new messages"
```

### File Organization

#### 1. **Module Naming**
```typescript
// ✅ Good - Descriptive, singular nouns
poll.ts          // Polls and voting
giveaway.ts      // Giveaways and raffles
analytics.ts     // Analytics and metrics

// ❌ Bad
polls.ts         // Plural
poll-system.ts   // Hyphenated
pollModule.ts    // Redundant suffix
```

#### 2. **Export Structure**
```typescript
// ✅ Good - Named export matching filename
// In poll.ts
export const poll: PollTranslations = {
  title: "Encuestas",
  // ...
};

// In index.ts
export { poll } from './poll';
```

## 🔧 Usage Guide

### Basic Setup

```tsx
// App.tsx
import { I18nProvider } from './i18n';

function App() {
  return (
    <I18nProvider>
      <YourApp />
    </I18nProvider>
  );
}
```

### Using Core Translations

```tsx
import { useI18n } from './i18n';

function SaveButton() {
  const { t } = useI18n();
  
  // Core modules are always available
  return (
    <button>
      {t.common.save}
    </button>
  );
}
```

### Using Feature Translations (Lazy Loading)

```tsx
import { useI18n, useTranslationModule } from './i18n';

function PollComponent() {
  // Automatically loads the 'poll' module
  const { isLoaded, isLoading, error } = useTranslationModule('poll');
  const { t } = useI18n();
  
  if (isLoading) {
    return <div>{t.common.loading}</div>;
  }
  
  if (error) {
    return <div>{t.errors.componentError}</div>;
  }
  
  // Now t.poll is available
  return (
    <div>
      <h2>{t.poll.title}</h2>
      <button>{t.poll.create}</button>
    </div>
  );
}
```

### Manual Module Loading

```tsx
function FeaturePanel() {
  const { t, loadModule, isModuleLoaded } = useI18n();
  
  const handleOpenFeature = async () => {
    if (!isModuleLoaded('games')) {
      await loadModule('games');
    }
    // Now t.games is available
    console.log(t.games.title);
  };
  
  return (
    <button onClick={handleOpenFeature}>
      {t.nav.games}
    </button>
  );
}
```

### Variable Interpolation

```tsx
import { interpolate } from './i18n';

function WelcomeMessage({ username, messageCount }) {
  const { t } = useI18n();
  
  return (
    <div>
      {/* Using interpolate utility */}
      <h1>{interpolate(t.misc.welcome, { username })}</h1>
      
      {/* Using pluralization */}
      <p>
        {messageCount === 1 
          ? interpolate(t.common.messageCount, { count: messageCount })
          : interpolate(t.common.messagesCount, { count: messageCount })
        }
      </p>
    </div>
  );
}
```

### Locale Switching

```tsx
function LanguageSelector() {
  const { locale, setLocale } = useI18n();
  
  return (
    <select 
      value={locale} 
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      <option value="es">Español</option>
      <option value="en">English</option>
    </select>
  );
}
```

## 🛠️ Utility Functions

### Interpolation

```typescript
import { interpolate, extractVariables, validateInterpolation } from './i18n';

// Basic interpolation
const message = interpolate("Hello, {{name}}!", { name: "World" });
// Result: "Hello, World!"

// Extract variables from template
const variables = extractVariables("{{greeting}}, {{name}}!");
// Result: ["greeting", "name"]

// Validate interpolation
const validation = validateInterpolation("Hello, {{name}}!", { name: "World" });
// Result: { isValid: true, missingVariables: [] }
```

### Number Formatting

```typescript
import { formatNumber, formatCurrency, formatPercent } from './i18n';

// Locale-aware number formatting
formatNumber(1234567.89, 'es');  // "1.234.567,89"
formatNumber(1234567.89, 'en');  // "1,234,567.89"

// Currency formatting
formatCurrency(1234.56, 'es');   // "1.234,56 €"
formatCurrency(1234.56, 'en');   // "$1,234.56"

// Percentage formatting
formatPercent(0.756, 'es', 1);   // "75,6 %"
formatPercent(0.756, 'en', 1);   // "75.6%"
```

### Date Formatting

```typescript
import { formatDate, formatRelativeTime, formatDuration } from './i18n';

const date = new Date('2024-12-31');

// Date formatting with presets
formatDate(date, 'es', 'medium');     // "31 dic 2024"
formatDate(date, 'en', 'long');       // "December 31, 2024"

// Relative time
formatRelativeTime(date, 'es');       // "hace 2 horas"
formatRelativeTime(date, 'en');       // "2 hours ago"

// Duration formatting
formatDuration(3661000, 'es');        // "1h 1m 1s"
```

### Pluralization

```typescript
import { pluralize, pluralizeWithCount, pluralizeAdvanced } from './i18n';

// Simple pluralization
pluralize(1, "message", "messages");     // "message"
pluralize(5, "message", "messages");     // "messages"

// With count
pluralizeWithCount(1, "usuario", "usuarios", 'es');  // "1 usuario"
pluralizeWithCount(1000, "usuario", "usuarios", 'es'); // "1.000 usuarios"

// Advanced (with zero form)
pluralizeAdvanced(0, {
  zero: "No messages",
  one: "1 message", 
  many: "{{count}} messages"
}); // "No messages"
```

## ✅ Validation System

### Running Validation

```bash
# Basic validation
node i18n/validate-cli.cjs

# Verbose output with details
node i18n/validate-cli.cjs --verbose

# Validate specific module
node i18n/validate-cli.cjs --module poll --verbose

# Generate reports
node i18n/validate-cli.cjs --format markdown --output validation-report.md
node i18n/validate-cli.cjs --format json --output validation-results.json
```

### Programmatic Validation

```typescript
import { validate, printSummary, toJSON, toMarkdown } from './i18n/validation';

// Full validation
const report = await validate({ verbose: true });

// Print summary to console
printSummary(report);

// Generate reports
const jsonReport = toJSON(report);
const markdownReport = toMarkdown(report);
```

### Validation Rules

1. **Completeness**: All Spanish keys must exist in English
2. **Type Consistency**: Same keys must have same types across locales
3. **Interpolation**: Variable names must match exactly between locales
4. **Structure**: Nested object structures must be consistent

### NPM Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "i18n:validate": "node i18n/validate-cli.cjs",
    "i18n:validate:verbose": "node i18n/validate-cli.cjs --verbose",
    "i18n:report": "node i18n/validate-cli.cjs --format markdown --output docs/i18n-validation.md",
    "i18n:test": "npm run test -- tests/i18n/"
  }
}
```

## 🧪 Testing

### Property-Based Tests

The system includes comprehensive property-based tests:

```typescript
// tests/i18n/validation.test.ts
describe('i18n Property-Based Tests', () => {
  test('P1: Completeness - All ES keys exist in EN', async () => {
    const report = await validate();
    expect(report.summary.overallCoverage.en).toBe(100);
  });
  
  test('P3: Interpolation - Variables match between locales', async () => {
    const report = await validate({ validateInterpolation: true });
    const hasInterpolationIssues = report.modules.some(m => 
      m.interpolationIssues.length > 0
    );
    expect(hasInterpolationIssues).toBe(false);
  });
});
```

### Running Tests

```bash
# Run all i18n tests
npm test -- tests/i18n/

# Run specific test
npm test -- tests/i18n/validation.test.ts

# Run with coverage
npm test -- tests/i18n/ --coverage
```

## 🚀 Performance Optimization

### Bundle Size Reduction

- **Before**: ~500KB of translations loaded at startup
- **After**: ~100KB of core translations, features loaded on demand
- **Improvement**: 80% reduction in initial bundle size

### Loading Strategy

1. **Startup**: Load core modules (common, errors, navigation)
2. **On-Demand**: Load feature modules when components mount
3. **Caching**: Keep loaded modules in memory
4. **Locale Switch**: Reload all previously loaded modules for new locale

### Best Practices

1. **Use `useTranslationModule`** for components needing specific features
2. **Preload modules** if you know they'll be needed soon
3. **Handle loading states** gracefully in UI
4. **Group related features** to minimize module count
5. **Prefer core modules** for common UI elements

## 🔄 Migration Guide

### From Old Monolithic System

#### Before (Old System)
```tsx
import { useI18n } from './i18n/context';

function Component() {
  const { t } = useI18n();
  return <div>{t.poll.title}</div>; // All modules always loaded
}
```

#### After (New Lazy System)
```tsx
import { useI18n, useTranslationModule } from './i18n/context';

function Component() {
  useTranslationModule('poll'); // Load module on demand
  const { t } = useI18n();
  return <div>{t.poll.title}</div>; // Same API, better performance
}
```

### Migration Steps

1. **Update imports**: Add `useTranslationModule` where needed
2. **Add loading hooks**: Use `useTranslationModule` for feature components
3. **Handle loading states**: Add loading/error handling
4. **Update tests**: Ensure tests load required modules
5. **Validate**: Run validation to ensure completeness

## 🛡️ Error Handling

### Graceful Degradation

```tsx
function FeatureComponent() {
  const { isLoaded, isLoading, error } = useTranslationModule('poll');
  const { t } = useI18n();
  
  if (error) {
    // Graceful fallback - core translations still work
    return (
      <div>
        <h2>{t.errors.componentError}</h2>
        <p>{t.errors.componentErrorDescription}</p>
        <button onClick={() => window.location.reload()}>
          {t.errors.retry}
        </button>
      </div>
    );
  }
  
  if (isLoading) {
    return <div>{t.common.loading}</div>;
  }
  
  if (!isLoaded) {
    return null; // Or skeleton UI
  }
  
  // Feature is ready
  return <div>{t.poll.title}</div>;
}
```

### Error Types

- **Module Load Failure**: Network issues, missing files
- **Validation Errors**: Missing keys, type mismatches
- **Interpolation Errors**: Missing variables, malformed templates

## 📚 API Reference

### Hooks

#### `useI18n()`
```typescript
const { 
  locale,           // Current locale ('es' | 'en')
  setLocale,        // Function to change locale
  t,                // All translations (core + loaded modules)
  loadModule,       // Function to load a module
  isModuleLoaded,   // Check if module is loaded
  isLoading         // Check if currently loading
} = useI18n();
```

#### `useTranslationModule(module)`
```typescript
const { 
  isLoaded,         // Whether module is loaded
  isLoading,        // Whether module is currently loading
  error             // Any loading error
} = useTranslationModule('poll');
```

### Utility Functions

#### Interpolation
- `interpolate(template, values)` - Replace {{variables}} in template
- `extractVariables(template)` - Get all variable names from template
- `validateInterpolation(template, values)` - Validate variables are provided

#### Formatting
- `formatNumber(value, locale, options)` - Locale-aware number formatting
- `formatCurrency(value, locale, currency)` - Currency formatting
- `formatPercent(value, locale, decimals)` - Percentage formatting
- `formatDate(date, locale, format)` - Date formatting with presets
- `formatRelativeTime(date, locale)` - Relative time (e.g., "2 hours ago")
- `formatDuration(ms, locale)` - Duration formatting (e.g., "1h 30m")

#### Text Processing
- `pluralize(count, singular, plural)` - Simple pluralization
- `pluralizeWithCount(count, singular, plural, locale)` - Pluralization with formatted count
- `capitalize(str)` - Capitalize first letter
- `truncate(str, maxLength, ellipsis)` - Truncate with ellipsis
- `formatList(items, locale, type)` - Format arrays as lists

### Types

```typescript
// Core types
type Locale = 'es' | 'en';
type LazyTranslationModule = 'poll' | 'games' | 'giveaway' | /* ... */;
type InterpolationValues = Record<string, string | number>;

// Main interfaces
interface Translations { /* ... */ }
interface I18nContextValue { /* ... */ }
interface ValidationResult { /* ... */ }
```

## 🤝 Contributing

### Adding New Translations

1. **Add to Spanish locale** (`i18n/locales/es/[module].ts`)
2. **Add to English locale** (`i18n/locales/en/[module].ts`)
3. **Update type definitions** (`i18n/types.ts`)
4. **Run validation** (`npm run i18n:validate`)
5. **Add tests** if needed
6. **Update documentation** if adding new modules

### Adding New Modules

1. **Create module files** in both `es/` and `en/` directories
2. **Define TypeScript interface** in `types.ts`
3. **Add to lazy loaders** in `context.tsx`
4. **Export from index files**
5. **Add validation coverage**
6. **Document usage patterns**

### Code Style

- Use **camelCase** for translation keys
- Use **descriptive variable names** in interpolation
- **Group related translations** logically
- **Keep modules focused** on single features
- **Document complex translations** with comments

## 📖 Additional Resources

- [VALIDATION.md](./VALIDATION.md) - Detailed validation system documentation
- [USAGE.md](./USAGE.md) - Usage examples and migration guide
- [tests/i18n/](../tests/i18n/) - Test examples and property-based tests
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - For type definitions
- [React i18n Best Practices](https://react.i18next.com/) - General i18n patterns

## 🐛 Troubleshooting

### Common Issues

**Q: Module not loading**
```
Error: Failed to load translation module 'poll'
```
**A**: Check that both `es/poll.ts` and `en/poll.ts` exist and export correctly.

**Q: TypeScript errors on translation keys**
```
Property 'newKey' does not exist on type 'PollTranslations'
```
**A**: Add the new key to the interface in `types.ts` and both locale files.

**Q: Validation fails with missing keys**
```
Missing in EN: poll.newFeature
```
**A**: Add the missing translation to the English locale file.

**Q: Interpolation not working**
```
Output: "Hello, {{name}}!" instead of "Hello, John!"
```
**A**: Use the `interpolate()` function: `interpolate(t.greeting, { name: "John" })`

### Getting Help

1. Check the validation report for specific issues
2. Use `--verbose` flag for detailed error information
3. Review the type definitions in `types.ts`
4. Check existing usage patterns in the codebase
5. Run tests to ensure everything works correctly

---

**Last Updated**: January 2024  
**Version**: 2.0.0  
**Maintainers**: Development Team

## Changelog

### January 17, 2026 - Chat Translations Architecture Update

**Change**: Moved chat-related translations from `misc` module to `common` module

**Rationale**: Chat translations are needed by core components that require immediate access without lazy loading delays. Moving them to the `common` module ensures they're always available at startup.

**Files Modified**:
- `i18n/locales/es/common.ts` - Added chat section
- `i18n/locales/en/common.ts` - Added chat section  
- `i18n/types.ts` - Updated `CommonTranslations` and `MiscTranslations` interfaces
- `i18n/README.md` - Updated documentation
- `i18n/VALIDATION.md` - Updated module descriptions

**Impact**: 
- Core components can now access chat translations immediately
- No breaking changes to existing code using `t.misc.chat.*`
- Improved performance for chat-related UI components
- All validation tests continue to pass

**Note**: Some components are currently accessing translations directly (e.g., `t.timers.title`) instead of through the misc module (`t.misc.timers.title`). This is a separate refactoring task that should be addressed to maintain consistency with the modular architecture.