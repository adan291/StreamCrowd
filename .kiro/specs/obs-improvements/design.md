# Design Document: OBS Panel Improvements

## Overview

Este documento describe el diseño técnico para las mejoras del panel OBS: toggle de fuentes mejorado, escenas favoritas editables, comandos rápidos, y sistema de presets mejorado.

## Architecture

Las mejoras se implementan principalmente en el componente `OBSControlPanel.tsx` y el hook `useOBS.ts`, manteniendo la arquitectura hexagonal existente.

```
┌─────────────────────────────────────────────────────────────────┐
│                     OBSControlPanel.tsx                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │SourceToggle │ │FavoriteEdit │ │QuickCommands│ │PresetModal │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         useOBS.ts                                │
│  - favoriteScenes: string[]                                      │
│  - quickCommands: QuickCommand[]                                 │
│  - setFavoriteScenes()                                          │
│  - addQuickCommand() / removeQuickCommand()                     │
│  - executeQuickCommand()                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Source Toggle Mejorado

```typescript
interface SourceToggleProps {
  sceneName: string;
  source: OBSSource;
  onToggle: (visible: boolean) => Promise<void>;
}

// Animación con framer-motion o CSS transitions
const SourceToggle: React.FC<SourceToggleProps> = ({ sceneName, source, onToggle }) => {
  const [isToggling, setIsToggling] = useState(false);
  
  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(!source.enabled);
    } finally {
      setIsToggling(false);
    }
  };
  
  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`transition-all duration-200 ${
        source.enabled 
          ? 'text-green-500 hover:bg-green-50' 
          : 'text-zinc-400 hover:bg-zinc-100'
      } ${isToggling ? 'scale-90 opacity-50' : ''}`}
    >
      {source.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
    </button>
  );
};
```

### 2. Escenas Favoritas

```typescript
interface FavoriteScenesConfig {
  scenes: string[];
  maxFavorites: number; // default 6
}

// Storage key
const FAVORITE_SCENES_KEY = 'obs_favorite_scenes';

// En useOBS.ts
const [favoriteScenes, setFavoriteScenes] = useState<string[]>(() => {
  const saved = localStorage.getItem(FAVORITE_SCENES_KEY);
  return saved ? JSON.parse(saved) : [];
});

const saveFavoriteScenes = (scenes: string[]) => {
  setFavoriteScenes(scenes);
  localStorage.setItem(FAVORITE_SCENES_KEY, JSON.stringify(scenes));
};

// Validar que las escenas existen
useEffect(() => {
  if (scenes.length > 0 && favoriteScenes.length > 0) {
    const validFavorites = favoriteScenes.filter(f => 
      scenes.some(s => s.name === f)
    );
    if (validFavorites.length !== favoriteScenes.length) {
      saveFavoriteScenes(validFavorites);
    }
  }
}, [scenes, favoriteScenes]);
```

### 3. Comandos Rápidos

```typescript
interface QuickCommand {
  id: string;
  name: string;
  icon: string; // emoji o nombre de icono lucide
  actions: QuickCommandAction[];
}

type QuickCommandAction = 
  | { type: 'switch_scene'; sceneName: string }
  | { type: 'toggle_source'; sceneName: string; sourceName: string; visible: boolean }
  | { type: 'set_transition'; transitionName: string }
  | { type: 'start_recording' }
  | { type: 'stop_recording' }
  | { type: 'start_stream' }
  | { type: 'stop_stream' };

// Storage key
const QUICK_COMMANDS_KEY = 'obs_quick_commands';

// Ejecución secuencial
const executeQuickCommand = async (command: QuickCommand) => {
  for (const action of command.actions) {
    switch (action.type) {
      case 'switch_scene':
        await switchScene(action.sceneName);
        break;
      case 'toggle_source':
        await setSourceVisible(action.sceneName, action.sourceName, action.visible);
        break;
      case 'set_transition':
        await setTransition(action.transitionName);
        break;
      case 'start_recording':
        await startRecording();
        break;
      case 'stop_recording':
        await stopRecording();
        break;
      // ... etc
    }
    // Pequeño delay entre acciones para evitar race conditions
    await new Promise(r => setTimeout(r, 100));
  }
};
```

### 4. Sistema de Presets Mejorado

```typescript
interface PresetModalProps {
  preset: AutomationPreset;
  scenes: OBSScene[];
  onApply: (mappings: PresetSceneMapping[]) => void;
  onClose: () => void;
}

interface PresetSceneMapping {
  automationName: string;
  trigger: AutomationTrigger;
  selectedScene: string;
}

const PresetConfigModal: React.FC<PresetModalProps> = ({ preset, scenes, onApply, onClose }) => {
  const [mappings, setMappings] = useState<PresetSceneMapping[]>(() => 
    preset.automations.map(auto => ({
      automationName: auto.name,
      trigger: auto.trigger,
      // Pre-seleccionar si hay match
      selectedScene: scenes.find(s => 
        s.name.toLowerCase().includes(auto.sceneNameHint.toLowerCase())
      )?.name || '',
    }))
  );
  
  const canApply = mappings.every(m => m.selectedScene !== '');
  
  return (
    <div className="modal">
      <h3>{preset.icon} {preset.name}</h3>
      <p>{preset.description}</p>
      
      {mappings.map((mapping, i) => (
        <div key={i}>
          <label>{mapping.automationName}</label>
          <select 
            value={mapping.selectedScene}
            onChange={(e) => updateMapping(i, e.target.value)}
          >
            <option value="">Seleccionar escena...</option>
            {scenes.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      ))}
      
      <button onClick={() => onApply(mappings)} disabled={!canApply}>
        Aplicar Preset
      </button>
    </div>
  );
};
```

## Data Models

### Storage Schema

```typescript
// localStorage keys
const STORAGE_KEYS = {
  favoriteScenes: 'obs_favorite_scenes',
  quickCommands: 'obs_quick_commands',
  // existing
  automations: 'obs_automations',
  connectionConfig: 'obs_connection_config',
};

// Favorite Scenes
interface FavoriteScenesStorage {
  version: 1;
  scenes: string[];
}

// Quick Commands
interface QuickCommandsStorage {
  version: 1;
  commands: QuickCommand[];
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Source Toggle Properties

**Property 1: Source Visibility Toggle**
*For any* source toggle action, the OBS service setSourceVisible method SHALL be called with the correct scene, source, and inverted visibility state.
**Validates: Requirements 1.1**

### Favorite Scenes Properties

**Property 2: Favorite Scenes Limit**
*For any* attempt to add favorite scenes, the total count SHALL never exceed 6.
**Validates: Requirements 2.1**

**Property 3: Favorite Scenes Round-Trip**
*For any* valid list of favorite scenes, saving and then loading SHALL return an equivalent list.
**Validates: Requirements 2.3, 2.4**

**Property 4: Invalid Favorites Cleanup**
*For any* favorites list containing scene names not present in OBS, those invalid entries SHALL be removed.
**Validates: Requirements 2.6**

### Quick Commands Properties

**Property 5: Quick Command Execution Order**
*For any* quick command with N actions, all N actions SHALL execute in the specified order.
**Validates: Requirements 3.2**

**Property 6: Quick Commands Round-Trip**
*For any* valid quick command, saving and then loading SHALL return an equivalent command.
**Validates: Requirements 3.4**

### Preset Properties

**Property 7: Preset Scene Pre-selection**
*For any* preset automation with a scene hint, if a scene name contains the hint (case-insensitive), it SHALL be pre-selected.
**Validates: Requirements 4.3**

**Property 8: Preset Validation**
*For any* preset application attempt, if any automation has no scene selected, the apply action SHALL be disabled.
**Validates: Requirements 4.5**

**Property 9: Preset Application Completeness**
*For any* confirmed preset with N automations, exactly N automations SHALL be created in the system.
**Validates: Requirements 4.4**

## Error Handling

### Source Toggle
- OBS disconnected: Show error, disable toggle
- Toggle fails: Show notification, revert UI state

### Favorite Scenes
- Scene deleted in OBS: Auto-remove from favorites on next sync
- localStorage full: Log warning, continue with in-memory

### Quick Commands
- Action fails mid-execution: Log error, continue with remaining actions
- Invalid action type: Skip and log warning

### Presets
- No scenes available: Disable preset application
- Partial match: Allow manual selection for unmatched

## Testing Strategy

### Unit Tests
- Source toggle state changes
- Favorite scenes CRUD operations
- Quick command execution sequence
- Preset scene matching logic

### Property-Based Tests (fast-check)
- Favorite scenes limit enforcement
- Favorites round-trip persistence
- Quick commands round-trip persistence
- Preset pre-selection matching

### Integration Tests
- Full preset application flow
- Quick command with multiple action types

