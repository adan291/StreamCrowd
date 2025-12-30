// Plugin System Types - Tipos para el sistema de plugins

// ============================================
// Plugin Manifest
// ============================================

export interface PluginManifest {
  id: string;                    // Identificador único (ej: "my-plugin")
  name: string;                  // Nombre para mostrar
  version: string;               // Semver (1.0.0)
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  
  // Requisitos
  minAppVersion: string;         // Versión mínima de TwitchVote
  permissions: PluginPermission[];
  
  // Entry points
  main: string;                  // Archivo principal JS
  ui?: string;                   // Componente UI opcional
  styles?: string;               // CSS opcional
  
  // Configuración
  configSchema?: JSONSchema;     // Schema para settings
  defaultConfig?: Record<string, unknown>;
  
  // Metadatos
  keywords?: string[];
  icon?: string;                 // URL o data URI
  screenshots?: string[];
}

// JSON Schema simplificado para configuración
export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JSONSchemaProperty;
}

// ============================================
// Plugin Permissions
// ============================================

export type PluginPermission =
  // Core features
  | 'polls:read' | 'polls:write'
  | 'predictions:read' | 'predictions:write'
  | 'giveaways:read' | 'giveaways:write'
  | 'timers:read' | 'timers:write'
  | 'obs:read' | 'obs:write'
  // Chat
  | 'chat:read' | 'chat:write'
  // Utilities
  | 'storage'           // Acceso a storage del plugin
  | 'notifications'     // Enviar notificaciones
  // UI
  | 'ui:panel'          // Añadir panel UI
  | 'ui:overlay'        // Añadir overlay
  | 'ui:toolbar'        // Añadir botones a toolbar
  // Commands
  | 'commands';         // Registrar comandos de chat

export const PERMISSION_DESCRIPTIONS: Record<PluginPermission, string> = {
  'polls:read': 'Ver encuestas y sus resultados',
  'polls:write': 'Crear, modificar y eliminar encuestas',
  'predictions:read': 'Ver predicciones y sus resultados',
  'predictions:write': 'Crear, modificar y resolver predicciones',
  'giveaways:read': 'Ver sorteos y participantes',
  'giveaways:write': 'Crear y gestionar sorteos',
  'timers:read': 'Ver temporizadores activos',
  'timers:write': 'Crear y controlar temporizadores',
  'obs:read': 'Ver estado de conexión OBS y escenas',
  'obs:write': 'Cambiar escenas y controlar fuentes OBS',
  'chat:read': 'Leer mensajes del chat',
  'chat:write': 'Enviar mensajes al chat',
  'storage': 'Guardar datos del plugin localmente',
  'notifications': 'Mostrar notificaciones',
  'ui:panel': 'Añadir paneles a la interfaz',
  'ui:overlay': 'Añadir overlays visuales',
  'ui:toolbar': 'Añadir botones a la barra de herramientas',
  'commands': 'Registrar comandos de chat personalizados'
};

export const PERMISSION_CATEGORIES: Record<string, PluginPermission[]> = {
  'Encuestas': ['polls:read', 'polls:write'],
  'Predicciones': ['predictions:read', 'predictions:write'],
  'Sorteos': ['giveaways:read', 'giveaways:write'],
  'Temporizadores': ['timers:read', 'timers:write'],
  'OBS': ['obs:read', 'obs:write'],
  'Chat': ['chat:read', 'chat:write'],
  'Interfaz': ['ui:panel', 'ui:overlay', 'ui:toolbar'],
  'Otros': ['storage', 'notifications', 'commands']
};

// ============================================
// Plugin Entity
// ============================================

export interface Plugin {
  id: string;
  manifest: PluginManifest;
  status: PluginStatus;
  config: Record<string, unknown>;
  code: string;                  // Código JS del plugin
  installedAt: number;
  updatedAt: number;
  lastActiveAt?: number;
  error?: PluginError;
  logs: PluginLog[];
}

export type PluginStatus = 
  | 'installed'    // Instalado pero no activo
  | 'active'       // Activo y ejecutándose
  | 'disabled'     // Desactivado por el usuario
  | 'error'        // Error durante ejecución
  | 'updating';    // Actualizándose

export interface PluginError {
  code: PluginErrorCode;
  message: string;
  stack?: string;
  timestamp: number;
}

export type PluginErrorCode =
  | 'LOAD_ERROR'
  | 'INIT_ERROR'
  | 'RUNTIME_ERROR'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'INVALID_MANIFEST'
  | 'VERSION_MISMATCH'
  | 'SANDBOX_ERROR';

export interface PluginLog {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  timestamp: number;
}

// ============================================
// Plugin Host API
// ============================================

export interface PluginHostAPI {
  // Core APIs
  polls: PollsAPI;
  predictions: PredictionsAPI;
  giveaways: GiveawaysAPI;
  timers: TimersAPI;
  obs: OBSAPI;
  
  // Utilities
  events: EventsAPI;
  storage: StorageAPI;
  ui: UIAPI;
  commands: CommandsAPI;
  notifications: NotificationsAPI;
  
  // Plugin info
  getManifest(): PluginManifest;
  getConfig<T = Record<string, unknown>>(): T;
  setConfig<T = Record<string, unknown>>(config: Partial<T>): Promise<void>;
  log(level: PluginLog['level'], message: string, data?: unknown): void;
}

// ============================================
// Core APIs
// ============================================

export interface PollsAPI {
  list(): Promise<PollData[]>;
  get(id: string): Promise<PollData | null>;
  create(poll: CreatePollInput): Promise<PollData>;
  update(id: string, updates: UpdatePollInput): Promise<PollData>;
  delete(id: string): Promise<void>;
  start(id: string): Promise<void>;
  stop(id: string): Promise<void>;
  getResults(id: string): Promise<PollResults>;
}

export interface PollData {
  id: string;
  question: string;
  options: Array<{ id: number; label: string; votes: number; color: string }>;
  isActive: boolean;
  totalVotes: number;
  createdAt: number;
}

export interface CreatePollInput {
  question: string;
  options: string[];
}

export interface UpdatePollInput {
  question?: string;
  options?: string[];
}

export interface PollResults {
  pollId: string;
  options: Array<{ id: number; label: string; votes: number; percentage: number }>;
  totalVotes: number;
  winner?: { id: number; label: string };
}

export interface PredictionsAPI {
  list(): Promise<PredictionData[]>;
  get(id: string): Promise<PredictionData | null>;
  create(prediction: CreatePredictionInput): Promise<PredictionData>;
  lock(id: string): Promise<void>;
  resolve(id: string, winningOutcomeId: string): Promise<void>;
  cancel(id: string): Promise<void>;
}

export interface PredictionData {
  id: string;
  title: string;
  outcomes: Array<{ id: string; title: string; points: number }>;
  status: 'active' | 'locked' | 'resolved' | 'cancelled';
  winningOutcomeId?: string;
  createdAt: number;
}

export interface CreatePredictionInput {
  title: string;
  outcomes: Array<{ title: string }>;
}

export interface GiveawaysAPI {
  list(): Promise<GiveawayData[]>;
  get(id: string): Promise<GiveawayData | null>;
  create(giveaway: CreateGiveawayInput): Promise<GiveawayData>;
  start(id: string): Promise<void>;
  draw(id: string): Promise<string>;  // Returns winner
  getParticipants(id: string): Promise<string[]>;
}

export interface GiveawayData {
  id: string;
  name: string;
  keyword?: string;
  participantCount: number;
  isActive: boolean;
  winner?: string;
  createdAt: number;
}

export interface CreateGiveawayInput {
  name: string;
  keyword?: string;
}

export interface TimersAPI {
  list(): Promise<TimerData[]>;
  get(id: string): Promise<TimerData | null>;
  create(timer: CreateTimerInput): Promise<TimerData>;
  start(id: string): Promise<void>;
  pause(id: string): Promise<void>;
  reset(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TimerData {
  id: string;
  name: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
  createdAt: number;
}

export interface CreateTimerInput {
  name: string;
  duration: number;  // En segundos
}

export interface OBSAPI {
  getStatus(): Promise<OBSStatus>;
  getScenes(): Promise<OBSScene[]>;
  getCurrentScene(): Promise<string>;
  switchScene(sceneName: string): Promise<void>;
  getSources(sceneName?: string): Promise<OBSSource[]>;
  setSourceVisibility(sourceName: string, visible: boolean, sceneName?: string): Promise<void>;
}

export interface OBSStatus {
  connected: boolean;
  version?: string;
  currentScene?: string;
}

export interface OBSScene {
  name: string;
  index: number;
  isCurrent: boolean;
}

export interface OBSSource {
  name: string;
  type: string;
  visible: boolean;
  sceneName: string;
}

// ============================================
// Utility APIs
// ============================================

export interface EventsAPI {
  on(event: PluginEvent, handler: EventHandler): () => void;
  off(event: PluginEvent, handler: EventHandler): void;
  once(event: PluginEvent, handler: EventHandler): () => void;
  emit(event: string, data?: unknown): void;  // Eventos custom del plugin
}

export type EventHandler = (data: unknown) => void | Promise<void>;

export type PluginEvent =
  // Polls
  | 'poll:created' | 'poll:updated' | 'poll:started' | 'poll:stopped' | 'poll:vote' | 'poll:deleted'
  // Predictions
  | 'prediction:created' | 'prediction:locked' | 'prediction:resolved' | 'prediction:cancelled'
  // Giveaways
  | 'giveaway:created' | 'giveaway:started' | 'giveaway:winner' | 'giveaway:ended'
  // Timers
  | 'timer:created' | 'timer:started' | 'timer:paused' | 'timer:tick' | 'timer:completed' | 'timer:deleted'
  // OBS
  | 'obs:connected' | 'obs:disconnected' | 'obs:scene_changed' | 'obs:source_changed'
  // Chat
  | 'chat:message' | 'chat:command'
  // App lifecycle
  | 'app:ready' | 'app:shutdown'
  // Custom events (string)
  | string;

export interface StorageAPI {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

export interface UIAPI {
  registerPanel(config: PanelConfig): string;
  unregisterPanel(id: string): void;
  registerOverlay(config: OverlayConfig): string;
  unregisterOverlay(id: string): void;
  registerToolbarButton(config: ToolbarButtonConfig): string;
  unregisterToolbarButton(id: string): void;
  showToast(message: string, options?: ToastOptions): void;
  showModal<T = unknown>(config: ModalConfig): Promise<T | null>;
  showConfirm(message: string, options?: ConfirmOptions): Promise<boolean>;
}

export interface PanelConfig {
  id?: string;
  title: string;
  icon?: string;
  render: () => HTMLElement | string;
  position?: 'sidebar' | 'main' | 'tools';
  order?: number;
}

export interface OverlayConfig {
  id?: string;
  render: () => HTMLElement | string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  zIndex?: number;
}

export interface ToolbarButtonConfig {
  id?: string;
  icon: string;
  tooltip: string;
  onClick: () => void;
  position?: 'left' | 'right';
}

export interface ToastOptions {
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface ModalConfig {
  title: string;
  content: string | HTMLElement;
  buttons?: Array<{
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    value?: unknown;
  }>;
  size?: 'small' | 'medium' | 'large';
}

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface CommandsAPI {
  register(command: CommandConfig): () => void;
  unregister(name: string): void;
  list(): CommandInfo[];
}

export interface CommandConfig {
  name: string;           // Sin el prefijo ! (ej: "micomando")
  description: string;
  usage?: string;         // Ej: "!micomando <arg1> [arg2]"
  aliases?: string[];
  cooldown?: number;      // Segundos entre usos
  handler: CommandHandler;
}

export type CommandHandler = (context: CommandContext) => void | Promise<void>;

export interface CommandContext {
  command: string;
  args: string[];
  rawMessage: string;
  user: {
    username: string;
    displayName: string;
    isMod: boolean;
    isSubscriber: boolean;
    isBroadcaster: boolean;
  };
  reply: (message: string) => void;
}

export interface CommandInfo {
  name: string;
  description: string;
  usage?: string;
  pluginId: string;
}

export interface NotificationsAPI {
  show(notification: NotificationConfig): void;
  requestPermission(): Promise<boolean>;
  hasPermission(): boolean;
}

export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

// ============================================
// Plugin Sandbox
// ============================================

export interface PluginSandbox {
  id: string;
  pluginId: string;
  iframe: HTMLIFrameElement;
  status: SandboxStatus;
  createdAt: number;
}

export type SandboxStatus = 'creating' | 'ready' | 'error' | 'destroyed';

export interface SandboxMessage {
  type: SandboxMessageType;
  pluginId: string;
  callId?: string;
  method?: string;
  args?: unknown[];
  result?: unknown;
  error?: string;
}

export type SandboxMessageType =
  | 'plugin-call'      // Plugin llama a API
  | 'plugin-response'  // Respuesta de la app
  | 'plugin-event'     // Evento enviado al plugin
  | 'plugin-log'       // Log del plugin
  | 'plugin-ready'     // Plugin inicializado
  | 'plugin-error';    // Error en plugin

// ============================================
// Plugin Installation
// ============================================

export interface PluginInstallResult {
  success: boolean;
  plugin?: Plugin;
  error?: string;
}

export interface PluginUpdateResult {
  success: boolean;
  plugin?: Plugin;
  previousVersion?: string;
  error?: string;
}

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// Plugin Marketplace
// ============================================

export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  icon?: string;
  screenshots?: string[];
  downloadUrl: string;
  homepage?: string;
  tags: string[];
  verified: boolean;
  updatedAt: number;
}

// ============================================
// Plugin Development
// ============================================

export interface PluginDevTools {
  reload(): Promise<void>;
  getState(): Record<string, unknown>;
  clearStorage(): Promise<void>;
  simulateEvent(event: PluginEvent, data: unknown): void;
}

// ============================================
// Utility Types
// ============================================

export type PluginEventData<E extends PluginEvent> = 
  E extends 'poll:vote' ? { pollId: string; optionId: number; votes: number } :
  E extends 'poll:created' | 'poll:updated' | 'poll:started' | 'poll:stopped' ? PollData :
  E extends 'timer:tick' ? { timerId: string; remaining: number; percentage: number } :
  E extends 'chat:message' ? { username: string; message: string; timestamp: number } :
  E extends 'chat:command' ? CommandContext :
  unknown;
