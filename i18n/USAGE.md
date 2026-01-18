# i18n Lazy Loading Usage Guide

## Overview

The i18n system now supports lazy loading of translation modules to improve initial bundle size and performance. Core modules (common, errors, navigation) are loaded at startup, while feature modules are loaded on demand.

## Basic Usage

### Using the i18n Context

```tsx
import { useI18n } from './i18n/context';

function MyComponent() {
  const { t, locale, setLocale } = useI18n();
  
  // Core modules are always available
  return (
    <div>
      <h1>{t.common.loading}</h1>
      <button onClick={() => setLocale('en')}>
        {t.common.language}
      </button>
    </div>
  );
}
```

### Loading Feature Modules

```tsx
import { useTranslationModule } from './i18n/context';

function PollComponent() {
  // This hook will automatically load the 'poll' module
  const { isLoaded, isLoading, error } = useTranslationModule('poll');
  const { t } = useI18n();
  
  if (isLoading) {
    return <div>{t.common.loading}</div>;
  }
  
  if (error) {
    return <div>{t.errors.componentError}</div>;
  }
  
  if (!isLoaded) {
    return null;
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
import { useI18n } from './i18n/context';

function GamesPanel() {
  const { t, loadModule, isModuleLoaded } = useI18n();
  
  const handleOpenGames = async () => {
    if (!isModuleLoaded('games')) {
      await loadModule('games');
    }
    // Now t.games is available
    console.log(t.games.title);
  };
  
  return (
    <button onClick={handleOpenGames}>
      {t.nav.games}
    </button>
  );
}
```

## Module Categories

### Core Modules (Always Loaded)
- `common` - Basic UI elements (save, cancel, loading, etc.)
- `errors` - Error messages and recovery options
- `nav` - Navigation and menu items

### Lazy Modules (Loaded on Demand)
- `poll` - Polls and voting functionality
- `games` - Interactive games
- `giveaway` - Giveaways and raffles
- `macros` - Macro system
- `commands` - Command system
- `predictions` - Twitch predictions
- `rewards` - Channel point rewards
- `moderation` - Moderation tools
- `analytics` - Analytics and metrics
- `overlay` - OBS overlays
- `platforms` - Platform integrations
- `misc` - Miscellaneous features (mascot, chat, etc.)

## Performance Benefits

- **Reduced initial bundle**: Only ~20% of translations loaded at startup
- **Faster app startup**: Core functionality available immediately
- **Memory efficient**: Only load what you need
- **Automatic caching**: Loaded modules stay in memory
- **Locale switching**: Automatically reloads modules for new locale

## Error Handling

The system gracefully handles loading errors:

```tsx
function FeatureComponent() {
  const { isLoaded, isLoading, error } = useTranslationModule('poll');
  
  if (error) {
    // Handle error gracefully - core translations still work
    return <div>Feature temporarily unavailable</div>;
  }
  
  // ... rest of component
}
```

## TypeScript Support

Full TypeScript support with autocomplete:

```tsx
// Type-safe access to translations
const { t } = useI18n();
t.common.save; // ✓ Always available
t.poll.title;  // ✓ Available after loading 'poll' module

// Type-safe module loading
loadModule('poll');     // ✓ Valid module
loadModule('invalid');  // ✗ TypeScript error
```

## Migration from Old System

### Before (Old System)
```tsx
import { useI18n } from './i18n/context';

function Component() {
  const { t } = useI18n();
  return <div>{t.poll.title}</div>; // All modules always loaded
}
```

### After (New Lazy System)
```tsx
import { useI18n, useTranslationModule } from './i18n/context';

function Component() {
  useTranslationModule('poll'); // Load module on demand
  const { t } = useI18n();
  return <div>{t.poll.title}</div>; // Same API, better performance
}
```

## Best Practices

1. **Use `useTranslationModule`** for components that need specific modules
2. **Load modules early** if you know they'll be needed soon
3. **Handle loading states** gracefully in your UI
4. **Prefer core modules** for common UI elements
5. **Group related features** to minimize the number of modules loaded