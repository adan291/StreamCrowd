# Design: Sistema de Plugins

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    TwitchVote Live App                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Plugin      │  │ Plugin      │  │ Plugin              │  │
│  │ Manager     │  │ Registry    │  │ Sandbox             │  │
│  │             │  │             │  │ (iframe/worker)     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│  ┌──────┴────────────────┴─────────────────────┴──────────┐  │
│  │                    Plugin Host API                      │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │  │
│  │  │ Events  │ │ Storage │ │ UI API  │ │ Core API    │   │  │
│  │  │ System  │ │ API     │ │         │ │ (polls,etc) │   │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Tipos Core

```typescript
// types/plugins.ts

// Manifest del plugin
interface PluginManifest {
  id: string;                    // Identificador único (ej: "my-plugin")
  name: string;                  // Nombre para mostrar
  version: string;               // Semver (1.0.0)
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  
  // Requisitos
  minAppVersion: string;         // Versión mínima de TwitchVote
  permissions: PluginPermission[];
  
  // Entry points
  main: string;                  // Archivo principal JS
  ui?: string;                   // Componente UI opcional
  
  // Configuración
  configSchema?: JSONSchema;     // Schema para settings
  defaultConfig?: Record<string, any>;
}

type PluginPermission =
  | 'polls:read' | 'polls:write'
  | 'predictions:read' | 'predictions:write'
  | 'giveaways:read' | 'giveaways:write'
  | 'timers:read' | 'timers:write'
  | 'obs:read' | 'obs:write'
  | 'chat:read' | 'chat:write'
  | 'storage'           // Acceso a storage del plugin
  | 'notifications'     // Enviar notificaciones
  | 'ui:panel'          // Añadir panel UI
  | 'ui:overlay'        // Añadir overlay
  | 'commands';         // Registrar comandos

interface Plugin {
  id: string;
  manifest: PluginManifest;
  status: PluginStatus;
  config: Record<string, any>;
  installedAt: number;
  updatedAt: number;
  error?: string;
}

type PluginStatus = 'installed' | 'active' | 'disabled' | 'error';

// API expuesta a plugins
interface PluginHostAPI {
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
  getConfig<T>(): T;
  setConfig<T>(config: Partial<T>): void;
}

// Sistema de eventos
interface EventsAPI {
  on(event: PluginEvent, handler: EventHandler): void;
  off(event: PluginEvent, handler: EventHandler): void;
  emit(event: string, data: any): void;  // Eventos custom del plugin
}

type PluginEvent =
  | 'poll:created' | 'poll:started' | 'poll:ended' | 'poll:vote'
  | 'prediction:created' | 'prediction:locked' | 'prediction:resolved'
  | 'giveaway:started' | 'giveaway:winner'
  | 'timer:started' | 'timer:tick' | 'timer:completed'
  | 'obs:connected' | 'obs:scene_changed'
  | 'chat:message'
  | 'app:ready' | 'app:shutdown';

// Storage API
interface StorageAPI {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// UI API
interface UIAPI {
  registerPanel(config: PanelConfig): void;
  registerOverlay(config: OverlayConfig): void;
  showToast(message: string, type?: 'info' | 'success' | 'error'): void;
  showModal(config: ModalConfig): Promise<any>;
}

interface PanelConfig {
  id: string;
  title: string;
  icon?: string;
  component: string;  // Nombre del componente registrado
  position?: 'sidebar' | 'main' | 'tools';
}

// Commands API
interface CommandsAPI {
  register(command: CommandConfig): void;
  unregister(name: string): void;
}

interface CommandConfig {
  name: string;           // !micomando
  description: string;
  usage?: string;
  handler: (args: string[], context: CommandContext) => void | Promise<void>;
}
```

## Servicios

### PluginLoaderService
Carga y valida plugins desde diferentes fuentes.

```typescript
class PluginLoaderService {
  loadFromFile(file: File): Promise<PluginManifest>;
  loadFromURL(url: string): Promise<PluginManifest>;
  validateManifest(manifest: unknown): PluginManifest;
  validatePermissions(manifest: PluginManifest): boolean;
}
```

### PluginRegistryService
Gestiona el registro de plugins instalados.

```typescript
class PluginRegistryService {
  install(manifest: PluginManifest, code: string): Promise<Plugin>;
  uninstall(pluginId: string): Promise<void>;
  update(pluginId: string, manifest: PluginManifest, code: string): Promise<Plugin>;
  getPlugin(id: string): Plugin | null;
  listPlugins(): Plugin[];
  getActivePlugins(): Plugin[];
}
```

### PluginSandboxService
Ejecuta plugins en entorno aislado.

```typescript
class PluginSandboxService {
  createSandbox(plugin: Plugin): PluginSandbox;
  destroySandbox(pluginId: string): void;
  executeInSandbox(pluginId: string, code: string): Promise<any>;
  callPluginMethod(pluginId: string, method: string, args: any[]): Promise<any>;
}

interface PluginSandbox {
  id: string;
  iframe: HTMLIFrameElement;
  api: PluginHostAPI;
  status: 'ready' | 'loading' | 'error';
}
```

### PluginManagerService
Orquesta el ciclo de vida de plugins.

```typescript
class PluginManagerService {
  initialize(): Promise<void>;
  activatePlugin(id: string): Promise<void>;
  deactivatePlugin(id: string): Promise<void>;
  getPluginConfig(id: string): Record<string, any>;
  setPluginConfig(id: string, config: Record<string, any>): void;
  getPluginLogs(id: string): PluginLog[];
}
```

### PluginHostService
Implementa la API expuesta a plugins.

```typescript
class PluginHostService {
  createHostAPI(plugin: Plugin): PluginHostAPI;
  handlePluginCall(pluginId: string, method: string, args: any[]): Promise<any>;
  broadcastEvent(event: PluginEvent, data: any): void;
}
```

## Sandbox Implementation

Usamos iframes con postMessage para aislamiento:

```typescript
// Dentro del iframe del plugin
const api = new Proxy({}, {
  get(target, prop) {
    return (...args) => {
      return new Promise((resolve, reject) => {
        const callId = generateId();
        window.parent.postMessage({
          type: 'plugin-call',
          pluginId: PLUGIN_ID,
          callId,
          method: prop,
          args
        }, '*');
        
        // Esperar respuesta...
      });
    };
  }
});

// En la app principal
window.addEventListener('message', (event) => {
  if (event.data.type === 'plugin-call') {
    const { pluginId, callId, method, args } = event.data;
    pluginHostService.handlePluginCall(pluginId, method, args)
      .then(result => {
        event.source.postMessage({
          type: 'plugin-response',
          callId,
          result
        }, '*');
      });
  }
});
```

## Componentes UI

### PluginManager.tsx
Panel principal para gestionar plugins.

### PluginCard.tsx
Tarjeta individual de plugin con acciones.

### PluginConfigModal.tsx
Modal para configurar un plugin.

### PluginMarketplace.tsx
Lista de plugins recomendados/disponibles.

### PluginDevTools.tsx
Herramientas para desarrolladores de plugins.

## Flujo de Instalación

1. Usuario selecciona archivo .zip o URL
2. PluginLoaderService extrae y valida manifest
3. Se muestran permisos requeridos al usuario
4. Usuario acepta → PluginRegistryService.install()
5. Plugin queda en estado 'installed'
6. Usuario activa → PluginManagerService.activatePlugin()
7. Se crea sandbox y se ejecuta código del plugin

## Seguridad

- Plugins corren en iframe con sandbox
- CSP restrictivo en iframe
- Timeout de 5s para operaciones
- Rate limiting en llamadas a API
- Validación de todos los inputs
- No acceso a localStorage/cookies de la app
