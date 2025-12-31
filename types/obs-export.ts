// OBS Export Types - Exportación Directa a OBS

// ============================================================================
// Source Types
// ============================================================================

export type SourceType = 
  | 'browser_source' 
  | 'image_source' 
  | 'text_gdi_plus' 
  | 'color_source' 
  | 'ffmpeg_source' 
  | 'window_capture' 
  | 'game_capture' 
  | 'dshow_input';

export interface BrowserSourceConfig {
  name: string;
  url: string;
  width: number;
  height: number;
  fps?: number;
  css?: string;
  shutdownWhenHidden?: boolean;
  restartWhenActive?: boolean;
}

export interface ImageSourceConfig {
  name: string;
  file: string;
  unload?: boolean;
}

export interface TextSourceConfig {
  name: string;
  text: string;
  font?: FontConfig;
  color?: number;
  backgroundColor?: number;
  outline?: boolean;
  outlineColor?: number;
  outlineSize?: number;
}

export interface FontConfig {
  face: string;
  size: number;
  style: 'normal' | 'bold' | 'italic' | 'bold italic';
}

export interface ColorSourceConfig {
  name: string;
  color: number;
  width: number;
  height: number;
}

export interface MediaSourceConfig {
  name: string;
  localFile: string;
  looping?: boolean;
  restart?: boolean;
}

export type SourceConfig = 
  | BrowserSourceConfig 
  | ImageSourceConfig 
  | TextSourceConfig 
  | ColorSourceConfig 
  | MediaSourceConfig;

export interface SourceSettings {
  type: SourceType;
  settings: Record<string, unknown>;
}

export interface SourceInfo {
  name: string;
  type: SourceType;
  settings: Record<string, unknown>;
}

export interface SourceResult {
  success: boolean;
  sourceName: string;
  created: boolean;
  updated: boolean;
  error?: string;
}

// ============================================================================
// Transform Types
// ============================================================================

export interface Transform {
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

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export const DEFAULT_TRANSFORM: Transform = {
  positionX: 0,
  positionY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0
};

// ============================================================================
// Filter Types
// ============================================================================

export interface FilterConfig {
  name: string;
  type: string;
  settings: Record<string, unknown>;
  enabled: boolean;
}

export type FilterType = 
  | 'crop_filter'
  | 'color_correction_filter'
  | 'chroma_key_filter'
  | 'mask_filter'
  | 'scroll_filter';

// ============================================================================
// Scene Types
// ============================================================================

export interface SceneInfo {
  name: string;
  index: number;
  itemCount: number;
}

export interface SceneItem {
  sceneItemId: number;
  sourceName: string;
  sourceType: SourceType;
  sceneItemIndex: number;
  sceneItemEnabled: boolean;
  sceneItemLocked: boolean;
  sceneItemTransform: Transform;
}

export interface SceneItemSettings {
  transform?: Partial<Transform>;
  enabled?: boolean;
  locked?: boolean;
}

// ============================================================================
// Template Types
// ============================================================================

export type TemplateCategory = 'gaming' | 'just_chatting' | 'irl' | 'creative' | 'custom';

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail?: string;
  scenes: TemplateScene[];
  transitions?: TemplateTransition[];
  variables: TemplateVariable[];
  createdAt: number;
  updatedAt: number;
  builtIn: boolean;
}

export interface TemplateScene {
  name: string;
  items: TemplateSceneItem[];
}

export interface TemplateSceneItem {
  sourceType: SourceType;
  sourceName: string;
  settings: Record<string, unknown>;
  transform: Transform;
  filters?: FilterConfig[];
  variableBindings?: Record<string, string>;
}

export interface TemplateTransition {
  name: string;
  type: string;
  duration: number;
  settings?: Record<string, unknown>;
}

export type TemplateVariableType = 'string' | 'number' | 'color' | 'url' | 'file' | 'position';

export interface TemplateVariable {
  name: string;
  type: TemplateVariableType;
  label: string;
  defaultValue: unknown;
  description?: string;
  options?: unknown[];
}

export interface TemplateCustomization {
  variableValues: Record<string, unknown>;
  selectedScenes?: string[];
  prefix?: string;
}

export interface ApplyOptions {
  prefix?: string;
  replaceExisting?: boolean;
  variableValues?: Record<string, unknown>;
  selectedScenes?: string[];
  dryRun?: boolean;
}

export interface ApplyResult {
  success: boolean;
  scenesCreated: string[];
  sourcesCreated: string[];
  errors: string[];
  warnings: string[];
}

export interface TemplatePreview {
  scenes: { name: string; itemCount: number }[];
  totalSources: number;
  variables: TemplateVariable[];
  estimatedTime: number;
}

// ============================================================================
// Config Sync Types
// ============================================================================

export interface OBSConfig {
  version: string;
  exportedAt: number;
  scenes: SceneConfig[];
  sources: SourceConfigEntry[];
  transitions: TransitionConfig[];
  profiles?: ProfileConfig[];
}

export interface SceneConfig {
  name: string;
  items: SceneItemConfig[];
}

export interface SceneItemConfig {
  sourceName: string;
  sourceType: SourceType;
  transform: Transform;
  enabled: boolean;
  locked: boolean;
  filters: FilterConfig[];
}

export interface SourceConfigEntry {
  name: string;
  type: SourceType;
  settings: Record<string, unknown>;
}

export interface TransitionConfig {
  name: string;
  type: string;
  duration: number;
  settings?: Record<string, unknown>;
}

export interface ProfileConfig {
  name: string;
  settings: Record<string, unknown>;
}

export interface Backup {
  id: string;
  description: string;
  createdAt: number;
  config: OBSConfig;
  automatic: boolean;
}

export interface BackupInfo {
  id: string;
  description: string;
  createdAt: number;
  automatic: boolean;
  sceneCount: number;
  sourceCount: number;
}

export interface ConfigDiff {
  added: DiffItem[];
  modified: DiffItem[];
  removed: DiffItem[];
}

export interface DiffItem {
  type: 'scene' | 'source' | 'transition' | 'filter';
  name: string;
  details?: string;
}

export type ConflictType = 'name_collision' | 'version_mismatch' | 'missing_dependency';

export interface Conflict {
  type: ConflictType;
  item: string;
  details: string;
  suggestions: Resolution[];
}

export type ResolutionAction = 'replace' | 'rename' | 'skip' | 'merge';

export interface Resolution {
  action: ResolutionAction;
  newName?: string;
  description: string;
}

export interface ExportOptions {
  includeScenes?: boolean;
  includeSources?: boolean;
  includeTransitions?: boolean;
  includeProfiles?: boolean;
  sceneFilter?: string[];
}

export interface ImportOptions {
  replaceExisting?: boolean;
  prefix?: string;
  selectedItems?: string[];
  createBackup?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: { scenes: number; sources: number; transitions: number };
  skipped: string[];
  errors: string[];
}

// ============================================================================
// Quick Export Types
// ============================================================================

export type OverlayType = 
  | 'poll' 
  | 'prediction' 
  | 'alert' 
  | 'chat' 
  | 'timer' 
  | 'giveaway' 
  | 'wheel' 
  | 'game' 
  | 'metrics';

export interface OverlayOBSStatus {
  inOBS: boolean;
  sceneName?: string;
  sourceName?: string;
  sceneItemId?: number;
  lastUpdated?: number;
  urlMatches: boolean;
  currentUrl?: string;
}

export interface QuickAddOptions {
  sceneName?: string;
  position?: Position;
  dimensions?: Dimensions;
  autoShow?: boolean;
  sourceName?: string;
}

export interface AddResult {
  success: boolean;
  sourceName: string;
  sceneName: string;
  sceneItemId?: number;
  error?: string;
}

export interface ExportedOverlay {
  overlayType: OverlayType;
  sourceName: string;
  sceneName: string;
  sceneItemId: number;
  url: string;
  exportedAt: number;
}

export interface OverlaySuggestion {
  position: Position;
  dimensions: Dimensions;
  sceneName?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export type OBSExportErrorCode = 
  | 'NOT_CONNECTED'
  | 'SOURCE_EXISTS'
  | 'SOURCE_NOT_FOUND'
  | 'SCENE_EXISTS'
  | 'SCENE_NOT_FOUND'
  | 'SCENE_ITEM_NOT_FOUND'
  | 'INVALID_CONFIG'
  | 'INVALID_TEMPLATE'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'BACKUP_FAILED'
  | 'RESTORE_FAILED'
  | 'IMPORT_FAILED'
  | 'EXPORT_FAILED'
  | 'UNKNOWN_ERROR';

export class OBSExportError extends Error {
  constructor(
    message: string,
    public code: OBSExportErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OBSExportError';
  }
}

// ============================================================================
// Operation Log Types
// ============================================================================

export type OperationType = 
  | 'create_source'
  | 'update_source'
  | 'delete_source'
  | 'create_scene'
  | 'delete_scene'
  | 'apply_template'
  | 'create_backup'
  | 'restore_backup'
  | 'import_config'
  | 'export_config'
  | 'add_overlay'
  | 'remove_overlay';

export interface OperationLog {
  id: string;
  type: OperationType;
  timestamp: number;
  details: Record<string, unknown>;
  success: boolean;
  error?: string;
  undoable: boolean;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface OBSExportState {
  connected: boolean;
  dryRunMode: boolean;
  currentOperation?: string;
  operationProgress?: number;
  lastError?: OBSExportError;
}

export type OBSExportTab = 'sources' | 'scenes' | 'templates' | 'sync';
