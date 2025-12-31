# Design Document: OBS Simplified Setup

## Overview

Este documento describe el diseño técnico para simplificar la configuración de OBS, incluyendo auto-descubrimiento, overlay URLs, wizard de conexión, y herramientas de diagnóstico.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OBSControlPanel.tsx                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │ConnectionWiz │ │OverlayURLGen │ │DiagnosticTool│ │ScenePresets │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    OBSConnectionService.ts                           │
│  - discoverOBS(): Promise<OBSInstance[]>                            │
│  - testConnection(host, port, password): Promise<ConnectionResult>  │
│  - diagnoseConnection(): Promise<DiagnosticResult>                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    OverlayService.ts                                 │
│  - generateOverlayURL(type, options): string                        │
│  - getOverlayTypes(): OverlayType[]                                 │
│  - validateOverlayParams(params): boolean                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Auto-Descubrimiento de OBS

```typescript
interface OBSInstance {
  host: string;
  port: number;
  version?: string;
  requiresPassword: boolean;
}

interface DiscoveryResult {
  found: boolean;
  instances: OBSInstance[];
  defaultInstance?: OBSInstance;
}

// Puertos a escanear
const OBS_PORTS = [4455, 4444, 4456];

async function discoverOBS(): Promise<DiscoveryResult> {
  const instances: OBSInstance[] = [];
  
  for (const port of OBS_PORTS) {
    try {
      // Intentar conexión rápida sin autenticación
      const result = await testConnection('localhost', port);
      if (result.success || result.requiresPassword) {
        instances.push({
          host: 'localhost',
          port,
          version: result.version,
          requiresPassword: result.requiresPassword,
        });
      }
    } catch {
      // Puerto no disponible, continuar
    }
  }
  
  return {
    found: instances.length > 0,
    instances,
    defaultInstance: instances[0],
  };
}
```

### 2. Overlay URLs

```typescript
interface OverlayType {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultSize: { width: number; height: number };
}

interface OverlayOptions {
  theme?: 'light' | 'dark' | 'transparent';
  width?: number;
  height?: number;
  position?: 'top' | 'bottom' | 'center';
  customCSS?: string;
}

const OVERLAY_TYPES: OverlayType[] = [
  {
    id: 'poll',
    name: 'Encuestas',
    description: 'Muestra encuestas activas con votos en tiempo real',
    icon: '📊',
    defaultSize: { width: 400, height: 300 },
  },
  {
    id: 'prediction',
    name: 'Predicciones',
    description: 'Muestra predicciones con puntos apostados',
    icon: '🔮',
    defaultSize: { width: 400, height: 250 },
  },
  {
    id: 'giveaway',
    name: 'Sorteos',
    description: 'Muestra sorteos activos y ganadores',
    icon: '🎁',
    defaultSize: { width: 350, height: 400 },
  },
  {
    id: 'game',
    name: 'Juegos',
    description: 'Overlay para juegos interactivos',
    icon: '🎮',
    defaultSize: { width: 800, height: 600 },
  },
  {
    id: 'chat-activity',
    name: 'Actividad del Chat',
    description: 'Muestra estadísticas del chat en tiempo real',
    icon: '💬',
    defaultSize: { width: 300, height: 200 },
  },
];

function generateOverlayURL(type: string, options: OverlayOptions = {}): string {
  const baseURL = window.location.origin;
  const params = new URLSearchParams({
    overlay: type,
    theme: options.theme || 'transparent',
    ...(options.width && { width: String(options.width) }),
    ...(options.height && { height: String(options.height) }),
    ...(options.position && { position: options.position }),
  });
  
  return `${baseURL}/overlay?${params.toString()}`;
}
```

### 3. Wizard de Conexión

```typescript
interface WizardStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  action?: () => Promise<boolean>;
  helpContent?: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'obs-running',
    title: 'OBS Ejecutándose',
    description: 'Verificar que OBS Studio está abierto',
    status: 'pending',
  },
  {
    id: 'websocket-enabled',
    title: 'WebSocket Habilitado',
    description: 'Verificar que el servidor WebSocket está activo',
    status: 'pending',
    helpContent: (
      <div>
        <p>En OBS, ve a:</p>
        <ol>
          <li>Herramientas → Configuración de WebSocket Server</li>
          <li>Marca "Habilitar servidor WebSocket"</li>
          <li>Configura una contraseña (recomendado)</li>
        </ol>
        <img src="/help/obs-websocket-settings.png" alt="OBS WebSocket Settings" />
      </div>
    ),
  },
  {
    id: 'connection-test',
    title: 'Prueba de Conexión',
    description: 'Verificar que la conexión funciona correctamente',
    status: 'pending',
  },
];

const ConnectionWizard: React.FC<{ onComplete: () => void; onSkip: () => void }> = ({
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(WIZARD_STEPS);
  
  // ... implementación del wizard
};
```

### 4. Herramienta de Diagnóstico

```typescript
interface DiagnosticCheck {
  id: string;
  name: string;
  status: 'pending' | 'checking' | 'pass' | 'fail' | 'warning';
  message?: string;
  fix?: string;
}

interface DiagnosticResult {
  checks: DiagnosticCheck[];
  overallStatus: 'healthy' | 'issues' | 'critical';
  summary: string;
}

async function diagnoseConnection(host: string, port: number, password?: string): Promise<DiagnosticResult> {
  const checks: DiagnosticCheck[] = [];
  
  // Check 1: Puerto accesible
  const portCheck = await checkPort(host, port);
  checks.push({
    id: 'port',
    name: 'Puerto accesible',
    status: portCheck.accessible ? 'pass' : 'fail',
    message: portCheck.accessible 
      ? `Puerto ${port} accesible` 
      : `No se puede acceder al puerto ${port}`,
    fix: portCheck.accessible ? undefined : 'Verifica que OBS esté abierto y el WebSocket habilitado',
  });
  
  // Check 2: WebSocket responde
  if (portCheck.accessible) {
    const wsCheck = await checkWebSocket(host, port);
    checks.push({
      id: 'websocket',
      name: 'WebSocket responde',
      status: wsCheck.responds ? 'pass' : 'fail',
      message: wsCheck.responds 
        ? 'WebSocket funcionando' 
        : 'WebSocket no responde',
      fix: wsCheck.responds ? undefined : 'Reinicia OBS y verifica la configuración del WebSocket',
    });
  }
  
  // Check 3: Autenticación
  if (password) {
    const authCheck = await checkAuth(host, port, password);
    checks.push({
      id: 'auth',
      name: 'Autenticación',
      status: authCheck.valid ? 'pass' : 'fail',
      message: authCheck.valid 
        ? 'Contraseña correcta' 
        : 'Contraseña incorrecta',
      fix: authCheck.valid ? undefined : 'Verifica la contraseña en OBS: Herramientas → Configuración de WebSocket Server',
    });
  }
  
  const failedChecks = checks.filter(c => c.status === 'fail').length;
  
  return {
    checks,
    overallStatus: failedChecks === 0 ? 'healthy' : failedChecks > 1 ? 'critical' : 'issues',
    summary: failedChecks === 0 
      ? 'Todos los checks pasaron correctamente'
      : `${failedChecks} problema(s) detectado(s)`,
  };
}
```

### 5. Presets de Escenas

```typescript
interface ScenePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'gaming' | 'chatting' | 'irl' | 'podcast';
  recommendedScenes: RecommendedScene[];
}

interface RecommendedScene {
  name: string;
  description: string;
  suggestedSources: SuggestedSource[];
}

interface SuggestedSource {
  name: string;
  type: 'browser' | 'capture' | 'camera' | 'audio';
  overlayURL?: string;
  settings?: Record<string, unknown>;
}

const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'gaming',
    name: 'Gaming',
    description: 'Setup ideal para streams de videojuegos',
    icon: '🎮',
    category: 'gaming',
    recommendedScenes: [
      {
        name: 'Gameplay',
        description: 'Escena principal de juego',
        suggestedSources: [
          { name: 'Game Capture', type: 'capture' },
          { name: 'Webcam', type: 'camera' },
          { name: 'Chat Overlay', type: 'browser', overlayURL: '/overlay?type=chat' },
        ],
      },
      {
        name: 'Just Chatting',
        description: 'Para momentos de charla',
        suggestedSources: [
          { name: 'Webcam Full', type: 'camera' },
          { name: 'Poll Overlay', type: 'browser', overlayURL: '/overlay?type=poll' },
        ],
      },
      {
        name: 'BRB',
        description: 'Pantalla de espera',
        suggestedSources: [
          { name: 'BRB Image', type: 'browser' },
        ],
      },
    ],
  },
  // ... más presets
];
```

## Data Models

### Storage Schema

```typescript
const STORAGE_KEYS = {
  connectionWizardCompleted: 'obs_wizard_completed',
  lastSuccessfulConnection: 'obs_last_connection',
  overlayPreferences: 'obs_overlay_prefs',
  scenePresetSelection: 'obs_scene_preset',
};

interface LastConnection {
  host: string;
  port: number;
  timestamp: number;
  version?: string;
}

interface OverlayPreferences {
  defaultTheme: 'light' | 'dark' | 'transparent';
  customCSS?: string;
}
```

## UI Components

### OverlayURLGenerator Component

```tsx
const OverlayURLGenerator: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('poll');
  const [options, setOptions] = useState<OverlayOptions>({});
  const [copied, setCopied] = useState(false);
  
  const url = generateOverlayURL(selectedType, options);
  
  const copyURL = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="space-y-4">
      <h3>Generar URL de Overlay</h3>
      
      {/* Selector de tipo */}
      <div className="grid grid-cols-2 gap-2">
        {OVERLAY_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={selectedType === type.id ? 'selected' : ''}
          >
            {type.icon} {type.name}
          </button>
        ))}
      </div>
      
      {/* Opciones */}
      <div>
        <label>Tema</label>
        <select onChange={e => setOptions({...options, theme: e.target.value})}>
          <option value="transparent">Transparente</option>
          <option value="dark">Oscuro</option>
          <option value="light">Claro</option>
        </select>
      </div>
      
      {/* URL generada */}
      <div className="flex gap-2">
        <input value={url} readOnly className="flex-1" />
        <button onClick={copyURL}>
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      
      {/* Instrucciones */}
      <details>
        <summary>Cómo añadir a OBS</summary>
        <ol>
          <li>En OBS, click derecho en Fuentes → Añadir → Navegador</li>
          <li>Pega la URL copiada</li>
          <li>Configura el tamaño recomendado: {OVERLAY_TYPES.find(t => t.id === selectedType)?.defaultSize.width}x{OVERLAY_TYPES.find(t => t.id === selectedType)?.defaultSize.height}</li>
        </ol>
      </details>
    </div>
  );
};
```

## Correctness Properties

### Auto-Discovery Properties

**Property 1: Discovery Port Scanning**
*For any* discovery attempt, the system SHALL check all ports in OBS_PORTS array.
**Validates: Requirements 1.1, 1.3**

**Property 2: Discovery Result Consistency**
*For any* successful discovery, the returned instances SHALL have valid host and port values.
**Validates: Requirements 1.2**

### Overlay URL Properties

**Property 3: Overlay URL Validity**
*For any* generated overlay URL, it SHALL be a valid URL with the correct base and parameters.
**Validates: Requirements 2.1, 2.2**

**Property 4: Overlay URL Idempotency**
*For any* overlay type and options, generating the URL multiple times SHALL return identical results.
**Validates: Requirements 2.2**

### Wizard Properties

**Property 5: Wizard Step Progression**
*For any* wizard session, steps SHALL only progress forward after successful completion.
**Validates: Requirements 3.2**

### Diagnostic Properties

**Property 6: Diagnostic Completeness**
*For any* diagnostic run, all defined checks SHALL be executed and reported.
**Validates: Requirements 4.2**

**Property 7: Diagnostic Fix Suggestions**
*For any* failed diagnostic check, a fix suggestion SHALL be provided.
**Validates: Requirements 4.3**

## Error Handling

### Auto-Discovery
- Network timeout: Return empty results, show manual config option
- Firewall blocking: Suggest checking firewall settings

### Overlay URLs
- Invalid parameters: Use defaults, log warning
- Copy fails: Show fallback with selectable text

### Wizard
- Step fails: Show retry option with help content
- User cancels: Save progress, allow resume later

### Diagnostics
- Check timeout: Mark as warning, continue with other checks
- All checks fail: Show comprehensive troubleshooting guide

## Testing Strategy

### Unit Tests
- URL generation with various options
- Diagnostic check logic
- Wizard step validation

### Property-Based Tests
- URL generation idempotency
- Diagnostic result completeness
- Discovery result validity

### Integration Tests
- Full wizard flow
- Overlay URL in actual browser source
- Diagnostic with mock OBS responses

