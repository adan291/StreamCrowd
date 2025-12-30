# Design: Exportación Directa a OBS

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Components                             │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│SourceCreator│TemplateLib  │ SceneManager│ ConfigSync  │QuickAdd │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       ▼             ▼             ▼             ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      React Hooks Layer                           │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│useOBSSources│useTemplates │useOBSScenes │useConfigSync│useQuick │
│             │             │             │             │Export   │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       ▼             ▼             ▼             ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Services                          │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│OBSSourceSvc │TemplateSvc  │OBSSceneSvc  │ConfigSyncSvc│ExportSvc│
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       └─────────────┴──────┬──────┴─────────────┴───────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OBS WebSocket Client                          │
│              (obs-websocket-js - existing)                       │
└─────────────────────────────────────────────────────────────────┘
```

## Services Design

### 1. OBSSourceService
Gestiona la creación y manipulación de fuentes en OBS.

```typescript
interface OBSSourceService {
  // Browser Sources
  createBrowserSource(config: BrowserSourceConfig): Promise<SourceResult>;
  updateBrowserSource(name: string, config: Partial<BrowserSourceConfig>): Promise<void>;
  deleteBrowserSource(name: string): Promise<void>;
  
  // Generic Sources
  createSource(type: SourceType, config: SourceConfig): Promise<SourceResult>;
  getSourceSettings(name: string): Promise<SourceSettings>;
  setSourceSettings(name: string, settings: SourceSettings): Promise<void>;
  
  // Transformations
  setSourceTransform(sceneName: string, sourceName: string, transform: Transform): Promise<void>;
  getSourceTransform(sceneName: string, sourceName: string): Promise<Transform>;
  
  // Filters
  addFilter(sourceName: string, filter: FilterConfig): Promise<void>;
  removeFilter(sourceName: string, filterName: string): Promise<void>;
  
  // Utilities
  sourceExists(name: string): Promise<boolean>;
  listSources(): Promise<SourceInfo[]>;
  duplicateSource(name: string, newName: string): Promise<void>;
}
```

### 2. OBSSceneService
Gestiona escenas en OBS.

```typescript
interface OBSSceneService {
  // CRUD
  createScene(name: string): Promise<void>;
  deleteScene(name: string): Promise<void>;
  renameScene(oldName: string, newName: string): Promise<void>;
  duplicateScene(name: string, newName: string): Promise<void>;
  
  // Scene Items
  addSourceToScene(sceneName: string, sourceName: string, settings?: SceneItemSettings): Promise<number>;
  removeSourceFromScene(sceneName: string, sceneItemId: number): Promise<void>;
  getSceneItems(sceneName: string): Promise<SceneItem[]>;
  
  // Ordering
  setSceneItemIndex(sceneName: string, sceneItemId: number, index: number): Promise<void>;
  reorderScenes(sceneNames: string[]): Promise<void>;
  
  // Visibility
  setSceneItemEnabled(sceneName: string, sceneItemId: number, enabled: boolean): Promise<void>;
  setSceneItemLocked(sceneName: string, sceneItemId: number, locked: boolean): Promise<void>;
  
  // Queries
  listScenes(): Promise<SceneInfo[]>;
  getCurrentScene(): Promise<string>;
  setCurrentScene(name: string): Promise<void>;
}
```

### 3. TemplateService
Gestiona templates de escenas predefinidos.

```typescript
interface TemplateService {
  // Library
  getBuiltInTemplates(): SceneTemplate[];
  getCustomTemplates(): Promise<SceneTemplate[]>;
  saveCustomTemplate(template: SceneTemplate): Promise<void>;
  deleteCustomTemplate(id: string): Promise<void>;
  
  // Import/Export
  exportTemplate(id: string): Promise<string>; // JSON
  importTemplate(json: string): Promise<SceneTemplate>;
  
  // Application
  applyTemplate(template: SceneTemplate, options: ApplyOptions): Promise<ApplyResult>;
  previewTemplate(template: SceneTemplate): TemplatePreview;
  
  // Customization
  customizeTemplate(template: SceneTemplate, customizations: TemplateCustomization): SceneTemplate;
}
```

### 4. ConfigSyncService
Sincroniza configuración entre la app y OBS.

```typescript
interface ConfigSyncService {
  // Export/Import
  exportConfig(options: ExportOptions): Promise<OBSConfig>;
  importConfig(config: OBSConfig, options: ImportOptions): Promise<ImportResult>;
  
  // Backup
  createBackup(description?: string): Promise<Backup>;
  listBackups(): Promise<BackupInfo[]>;
  restoreBackup(backupId: string): Promise<void>;
  deleteBackup(backupId: string): Promise<void>;
  
  // Sync
  detectChanges(): Promise<ConfigDiff>;
  syncChanges(changes: ConfigDiff, direction: 'toOBS' | 'fromOBS'): Promise<void>;
  
  // Conflict Resolution
  detectConflicts(config: OBSConfig): Promise<Conflict[]>;
  resolveConflict(conflict: Conflict, resolution: Resolution): Promise<void>;
}
```

### 5. QuickExportService
Facilita la exportación rápida de overlays a OBS.

```typescript
interface QuickExportService {
  // Quick Add
  addOverlayToOBS(overlayType: OverlayType, options?: QuickAddOptions): Promise<AddResult>;
  
  // Status
  getOverlayStatus(overlayType: OverlayType): Promise<OverlayOBSStatus>;
  listExportedOverlays(): Promise<ExportedOverlay[]>;
  
  // Update
  updateOverlayInOBS(overlayType: OverlayType): Promise<void>;
  removeOverlayFromOBS(overlayType: OverlayType): Promise<void>;
  
  // Suggestions
  getSuggestedPosition(overlayType: OverlayType): Position;
  getSuggestedDimensions(overlayType: OverlayType): Dimensions;
}
```

## Data Types

```typescript
// Source Types
type SourceType = 'browser_source' | 'image_source' | 'text_gdi_plus' | 
                  'color_source' | 'ffmpeg_source' | 'window_capture' | 
                  'game_capture' | 'dshow_input';

interface BrowserSourceConfig {
  name: string;
  url: string;
  width: number;
  height: number;
  fps?: number;
  css?: string;
  shutdownWhenHidden?: boolean;
  restartWhenActive?: boolean;
}

interface Transform {
  positionX: number;
  positionY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
}

interface FilterConfig {
  name: string;
  type: string;
  settings: Record<string, unknown>;
  enabled: boolean;
}

// Scene Types
interface SceneInfo {
  name: string;
  index: number;
  itemCount: number;
}

interface SceneItem {
  sceneItemId: number;
  sourceName: string;
  sourceType: SourceType;
  sceneItemIndex: number;
  sceneItemEnabled: boolean;
  sceneItemLocked: boolean;
  sceneItemTransform: Transform;
}

// Template Types
interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: 'gaming' | 'just_chatting' | 'irl' | 'creative' | 'custom';
  thumbnail?: string;
  scenes: TemplateScene[];
  transitions?: TemplateTransition[];
  variables: TemplateVariable[];
  createdAt: number;
  updatedAt: number;
}

interface TemplateScene {
  name: string;
  items: TemplateSceneItem[];
}

interface TemplateSceneItem {
  sourceType: SourceType;
  sourceName: string;
  settings: Record<string, unknown>;
  transform: Transform;
  filters?: FilterConfig[];
  variableBindings?: Record<string, string>; // setting -> variable name
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'color' | 'url' | 'file';
  label: string;
  defaultValue: unknown;
  description?: string;
}

interface ApplyOptions {
  prefix?: string;           // Prefix for created items
  replaceExisting?: boolean; // Replace if names conflict
  variableValues?: Record<string, unknown>;
  selectedScenes?: string[]; // Apply only specific scenes
}

// Config Sync Types
interface OBSConfig {
  version: string;
  exportedAt: number;
  scenes: SceneConfig[];
  sources: SourceConfig[];
  transitions: TransitionConfig[];
  profiles?: ProfileConfig[];
}

interface Backup {
  id: string;
  description: string;
  createdAt: number;
  config: OBSConfig;
  automatic: boolean;
}

interface ConfigDiff {
  added: DiffItem[];
  modified: DiffItem[];
  removed: DiffItem[];
}

interface Conflict {
  type: 'name_collision' | 'version_mismatch' | 'missing_dependency';
  item: string;
  details: string;
  suggestions: Resolution[];
}

// Quick Export Types
type OverlayType = 'poll' | 'prediction' | 'alert' | 'chat' | 'timer' | 
                   'giveaway' | 'wheel' | 'game' | 'metrics';

interface OverlayOBSStatus {
  inOBS: boolean;
  sceneName?: string;
  sourceName?: string;
  lastUpdated?: number;
  urlMatches: boolean;
}

interface QuickAddOptions {
  sceneName?: string;
  position?: Position;
  dimensions?: Dimensions;
  autoShow?: boolean;
}
```

## Built-in Templates

### 1. Gaming Template
```typescript
const gamingTemplate: SceneTemplate = {
  id: 'builtin-gaming',
  name: 'Gaming Setup',
  category: 'gaming',
  scenes: [
    {
      name: 'Gameplay',
      items: [
        { sourceType: 'game_capture', sourceName: 'Game', ... },
        { sourceType: 'browser_source', sourceName: 'Alerts', ... },
        { sourceType: 'browser_source', sourceName: 'Chat', ... },
        { sourceType: 'dshow_input', sourceName: 'Webcam', ... }
      ]
    },
    {
      name: 'Starting Soon',
      items: [
        { sourceType: 'browser_source', sourceName: 'Starting Timer', ... },
        { sourceType: 'image_source', sourceName: 'Background', ... }
      ]
    },
    {
      name: 'BRB',
      items: [
        { sourceType: 'browser_source', sourceName: 'BRB Timer', ... },
        { sourceType: 'image_source', sourceName: 'BRB Background', ... }
      ]
    },
    {
      name: 'Ending',
      items: [
        { sourceType: 'browser_source', sourceName: 'End Screen', ... }
      ]
    }
  ],
  variables: [
    { name: 'webcamPosition', type: 'string', label: 'Webcam Position', defaultValue: 'bottom-right' },
    { name: 'chatPosition', type: 'string', label: 'Chat Position', defaultValue: 'right' },
    { name: 'accentColor', type: 'color', label: 'Accent Color', defaultValue: '#9147ff' }
  ]
};
```

### 2. Just Chatting Template
### 3. IRL Template
### 4. Creative Template

## UI Components

### 1. SourceCreatorPanel
- Lista de tipos de fuentes disponibles
- Formulario de configuración según tipo
- Preview en tiempo real
- Botón crear/actualizar

### 2. TemplateLibrary
- Grid de templates con thumbnails
- Filtro por categoría
- Preview modal con personalización
- Botón aplicar

### 3. SceneManagerPanel
- Lista de escenas con drag-and-drop
- Árbol de fuentes por escena
- Acciones contextuales (duplicar, eliminar, renombrar)
- Mini-preview de escena

### 4. ConfigSyncPanel
- Estado de sincronización
- Lista de backups
- Botones exportar/importar
- Historial de cambios

### 5. QuickExportButton
- Componente inline para cada overlay
- Indicador de estado (en OBS / no en OBS)
- Dropdown con opciones rápidas

## Property Tests

### Property 1: Source Creation Idempotency
```
∀ config: BrowserSourceConfig
  createBrowserSource(config) twice with same name
  → second call updates instead of duplicating
```

### Property 2: Template Application Completeness
```
∀ template: SceneTemplate, options: ApplyOptions
  applyTemplate(template, options)
  → all scenes in template exist in OBS
  → all items in each scene exist with correct settings
```

### Property 3: Backup Restoration Integrity
```
∀ backup: Backup
  restoreBackup(backup.id)
  → OBS config matches backup.config exactly
```

### Property 4: Transform Preservation
```
∀ transform: Transform
  setSourceTransform(scene, source, transform)
  getSourceTransform(scene, source) === transform
```

### Property 5: Config Export/Import Roundtrip
```
∀ config: OBSConfig
  exportConfig() → importConfig(exported)
  → OBS state unchanged
```

### Property 6: Scene Item Ordering
```
∀ items: SceneItem[], newOrder: number[]
  reorder items according to newOrder
  → getSceneItems returns items in newOrder
```

## Error Handling

```typescript
class OBSExportError extends Error {
  constructor(
    message: string,
    public code: OBSExportErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

type OBSExportErrorCode = 
  | 'NOT_CONNECTED'
  | 'SOURCE_EXISTS'
  | 'SOURCE_NOT_FOUND'
  | 'SCENE_EXISTS'
  | 'SCENE_NOT_FOUND'
  | 'INVALID_CONFIG'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'BACKUP_FAILED'
  | 'RESTORE_FAILED';
```

## Integration Points

### With Existing OBS Services
- Usa `OBSWebSocketService` existente para conexión
- Extiende `OBSControlPanel` con nuevas funcionalidades
- Integra con `OverlayURLService` para URLs de overlays

### With Overlay Components
- Cada overlay expone método `getOBSConfig(): BrowserSourceConfig`
- `QuickExportButton` se añade a cada overlay panel
- Estado de exportación se persiste en localStorage

