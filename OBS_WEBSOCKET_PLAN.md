# Plan de Integración OBS WebSocket

## ✅ IMPLEMENTACIÓN COMPLETADA

### Archivos Creados:
- `src/domain/ports/IOBSController.ts` - Puerto del dominio ✅
- `src/infrastructure/adapters/OBSWebSocketAdapter.ts` - Adapter WebSocket ✅
- `src/application/services/OBSService.ts` - Servicio de aplicación ✅
- `src/application/hooks/useOBS.ts` - Hook principal de React ✅
- `src/application/hooks/useOBSTriggers.ts` - Hook simplificado para triggers ✅
- `components/OBSControlPanel.tsx` - Panel de control UI ✅

### Juegos con OBS Triggers Activos:
- `DuckHunt.tsx` ✅ (start/end)
- `TriviaBattle.tsx` ✅ (start/end)
- `PiumGame.tsx` ✅ (start/end)
- `CasinoRoulette.tsx` ✅ (start/end)
- `HotPotato.tsx` ✅ (start/end)
- `ChatFishing.tsx` ✅ (start/end)
- `BattleshipGame.tsx` ✅ (start/end)
- `VeoVeo.tsx` ✅ (start/end)
- `PiedraPapelTijera.tsx` ✅ (start/end)
- `Ahorcado.tsx` ✅ (start/end)
- `CarreraEmotes.tsx` ✅ (start/end)
- `MemoriaIRL.tsx` ✅ (start/end)
- `PartyCo.tsx` ✅ (start/end)

### Componentes Integrados:
- `PollCreator.tsx` ✅ (poll_start trigger)
- `App.tsx` ✅ (poll_end, poll_results, raid_incoming triggers)
- `GiveawayHub.tsx` ✅ (giveaway_start/giveaway_winner triggers)

### UI Integrada:
- Tab "OBS" en sidebar izquierdo ✅
- `OBSControlPanel` accesible desde la app ✅
- Presets de automatizaciones (Juegos, Encuestas, Sorteos, BRB) ✅
- Control de fuentes por escena ✅
- Control de streaming/grabación ✅

### Mejoras Opcionales Implementadas:
- **BRB Manual** ✅ - Botón toggle en tab "Rápido" para ir/volver de BRB
- **Detección de Raids** ✅ - Detecta raids automáticamente y dispara `raid_incoming`
- **Hotkeys de Escenas** ✅ - Grabación y gestión de atajos de teclado para cambiar escenas
- **Notificaciones de Escena** ✅ - Notificaciones cuando cambia la escena (con toggle on/off)

### Dependencia instalada:
- `obs-websocket-js` ✅

### Triggers Disponibles:
| Trigger | Descripción | Componente |
|---------|-------------|------------|
| `game_start` | Inicio de cualquier juego | Todos los juegos |
| `game_end` | Fin de cualquier juego | Todos los juegos |
| `poll_start` | Crear encuesta | PollCreator |
| `poll_end` | Terminar encuesta | App.tsx |
| `poll_results` | Mostrar resultados | App.tsx |
| `giveaway_start` | Iniciar sorteo | GiveawayHub |
| `giveaway_winner` | Ganador seleccionado | GiveawayHub |
| `brb_start` | Ir a BRB | Manual/Custom |
| `brb_end` | Volver de BRB | Manual/Custom |
| `raid_incoming` | Raid entrante | Manual/Custom |
| `raid_outgoing` | Raid saliente | Manual/Custom |
| `stream_start` | Inicio stream | Manual/Custom |
| `stream_end` | Fin stream | Manual/Custom |
| `custom` | Personalizado | Manual |

---

## CÓMO USAR

### 1. Configurar OBS
1. Abre OBS Studio (v28+)
2. Ve a Herramientas → Configuración de WebSocket Server
3. Habilita el servidor WebSocket
4. Configura una contraseña (recomendado)
5. Puerto por defecto: 4455

### 2. Conectar desde la App
1. Ve al tab "OBS" en el sidebar izquierdo
2. Ingresa host (localhost), puerto (4455) y contraseña
3. Click en "Conectar a OBS"

### 3. Configurar Automatizaciones
1. En el tab "Automatizaciones"
2. Click "Nueva"
3. Selecciona un trigger (ej: "Inicio de juego")
4. Selecciona la escena de OBS a la que cambiar
5. Guarda

### 4. Usar
- Cuando inicies un juego, OBS cambiará automáticamente a la escena configurada
- Cuando termines, volverá a la escena anterior (si configuraste "Fin de juego")

---

## 1. VISIÓN GENERAL

### Objetivo
Integrar OBS WebSocket para controlar OBS Studio directamente desde TwitchVote Live, permitiendo automatización de escenas, fuentes y transiciones basadas en eventos de la app.

### Beneficios para el Usuario
- **Un solo lugar**: Controlar stream + interactividad desde una app
- **Automatización**: Escenas cambian automáticamente con eventos
- **Menos errores**: No más "olvidé cambiar la escena"
- **Profesionalismo**: Transiciones sincronizadas con juegos/encuestas

## 2. ARQUITECTURA

### Integración con Arquitectura Hexagonal Existente

```
src/
├── domain/
│   └── ports/
│       ├── IChatProvider.ts        ✅ Existe
│       ├── IOverlaySync.ts         ✅ Existe
│       └── IOBSController.ts       🆕 NUEVO - Puerto para OBS
│
├── infrastructure/
│   └── adapters/
│       ├── TwitchAdapter.ts        ✅ Existe
│       └── OBSWebSocketAdapter.ts  🆕 NUEVO - Implementación OBS
│
├── application/
│   └── services/
│       └── OBSService.ts           🆕 NUEVO - Orquestación
│
└── presentation/
    └── components/
        └── OBSControlPanel.tsx     🆕 NUEVO - UI de control
```

## 3. IMPLEMENTACIÓN

### Fase 1: Puerto del Dominio (IOBSController.ts)

```typescript
// src/domain/ports/IOBSController.ts

export type OBSConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface OBSScene {
  name: string;
  index: number;
}

export interface OBSSource {
  name: string;
  type: string;
  enabled: boolean;
  sceneItemId: number;
}

export interface OBSStreamStatus {
  isStreaming: boolean;
  isRecording: boolean;
  streamTimecode?: string;
  recordTimecode?: string;
}

export interface OBSConnectionOptions {
  host?: string;      // default: localhost
  port?: number;      // default: 4455
  password?: string;
}

export type OBSStatusCallback = (status: OBSConnectionStatus, error?: string) => void;
export type OBSSceneCallback = (scene: OBSScene) => void;
export type OBSStreamCallback = (status: OBSStreamStatus) => void;

/**
 * Puerto para controlar OBS Studio
 */
export interface IOBSController {
  /** Estado de conexión */
  getConnectionStatus(): OBSConnectionStatus;
  
  /** Conectar a OBS WebSocket */
  connect(options?: OBSConnectionOptions): Promise<void>;
  
  /** Desconectar */
  disconnect(): Promise<void>;
  
  // === ESCENAS ===
  
  /** Obtener lista de escenas */
  getScenes(): Promise<OBSScene[]>;
  
  /** Obtener escena actual */
  getCurrentScene(): Promise<string | null>;
  
  /** Cambiar a escena */
  setScene(sceneName: string): Promise<void>;
  
  // === FUENTES ===
  
  /** Obtener fuentes de una escena */
  getSceneSources(sceneName: string): Promise<OBSSource[]>;
  
  /** Mostrar/ocultar fuente */
  setSourceVisible(sceneName: string, sourceName: string, visible: boolean): Promise<void>;
  
  /** Obtener visibilidad de fuente */
  isSourceVisible(sceneName: string, sourceName: string): Promise<boolean>;
  
  // === STREAMING ===
  
  /** Estado del stream */
  getStreamStatus(): Promise<OBSStreamStatus>;
  
  /** Iniciar stream */
  startStream(): Promise<void>;
  
  /** Detener stream */
  stopStream(): Promise<void>;
  
  /** Iniciar grabación */
  startRecording(): Promise<void>;
  
  /** Detener grabación */
  stopRecording(): Promise<void>;
  
  // === CALLBACKS ===
  
  /** Callback cuando cambia el estado de conexión */
  onStatusChange(callback: OBSStatusCallback): () => void;
  
  /** Callback cuando cambia la escena */
  onSceneChange(callback: OBSSceneCallback): () => void;
  
  /** Callback cuando cambia el estado del stream */
  onStreamStatusChange(callback: OBSStreamCallback): () => void;
  
  /** Limpiar recursos */
  dispose(): void;
}
```

### Fase 2: Adapter de Infraestructura (OBSWebSocketAdapter.ts)

```typescript
// src/infrastructure/adapters/OBSWebSocketAdapter.ts

import OBSWebSocket from 'obs-websocket-js';
import type {
  IOBSController,
  OBSConnectionStatus,
  OBSScene,
  OBSSource,
  OBSStreamStatus,
  OBSConnectionOptions,
  OBSStatusCallback,
  OBSSceneCallback,
  OBSStreamCallback,
} from '../../domain/ports/IOBSController';

const DEFAULT_OPTIONS: Required<OBSConnectionOptions> = {
  host: 'localhost',
  port: 4455,
  password: '',
};

export class OBSWebSocketAdapter implements IOBSController {
  private obs: OBSWebSocket;
  private status: OBSConnectionStatus = 'disconnected';
  private statusCallbacks = new Set<OBSStatusCallback>();
  private sceneCallbacks = new Set<OBSSceneCallback>();
  private streamCallbacks = new Set<OBSStreamCallback>();
  
  constructor() {
    this.obs = new OBSWebSocket();
    this.setupEventHandlers();
  }
  
  getConnectionStatus(): OBSConnectionStatus {
    return this.status;
  }
  
  async connect(options: OBSConnectionOptions = {}): Promise<void> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    
    this.setStatus('connecting');
    
    try {
      const url = `ws://${config.host}:${config.port}`;
      await this.obs.connect(url, config.password || undefined);
      this.setStatus('connected');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error de conexión';
      this.setStatus('error', msg);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    await this.obs.disconnect();
    this.setStatus('disconnected');
  }
  
  // === ESCENAS ===
  
  async getScenes(): Promise<OBSScene[]> {
    const { scenes } = await this.obs.call('GetSceneList');
    return scenes.map((s, i) => ({
      name: s.sceneName as string,
      index: i,
    }));
  }
  
  async getCurrentScene(): Promise<string | null> {
    try {
      const { currentProgramSceneName } = await this.obs.call('GetCurrentProgramScene');
      return currentProgramSceneName;
    } catch {
      return null;
    }
  }
  
  async setScene(sceneName: string): Promise<void> {
    await this.obs.call('SetCurrentProgramScene', { sceneName });
  }
  
  // === FUENTES ===
  
  async getSceneSources(sceneName: string): Promise<OBSSource[]> {
    const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName });
    return sceneItems.map(item => ({
      name: item.sourceName as string,
      type: item.inputKind as string || 'unknown',
      enabled: item.sceneItemEnabled as boolean,
      sceneItemId: item.sceneItemId as number,
    }));
  }
  
  async setSourceVisible(sceneName: string, sourceName: string, visible: boolean): Promise<void> {
    const sources = await this.getSceneSources(sceneName);
    const source = sources.find(s => s.name === sourceName);
    
    if (source) {
      await this.obs.call('SetSceneItemEnabled', {
        sceneName,
        sceneItemId: source.sceneItemId,
        sceneItemEnabled: visible,
      });
    }
  }
  
  async isSourceVisible(sceneName: string, sourceName: string): Promise<boolean> {
    const sources = await this.getSceneSources(sceneName);
    const source = sources.find(s => s.name === sourceName);
    return source?.enabled ?? false;
  }
  
  // === STREAMING ===
  
  async getStreamStatus(): Promise<OBSStreamStatus> {
    const stream = await this.obs.call('GetStreamStatus');
    const record = await this.obs.call('GetRecordStatus');
    
    return {
      isStreaming: stream.outputActive,
      isRecording: record.outputActive,
      streamTimecode: stream.outputTimecode,
      recordTimecode: record.outputTimecode,
    };
  }
  
  async startStream(): Promise<void> {
    await this.obs.call('StartStream');
  }
  
  async stopStream(): Promise<void> {
    await this.obs.call('StopStream');
  }
  
  async startRecording(): Promise<void> {
    await this.obs.call('StartRecord');
  }
  
  async stopRecording(): Promise<void> {
    await this.obs.call('StopRecord');
  }
  
  // === CALLBACKS ===
  
  onStatusChange(callback: OBSStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }
  
  onSceneChange(callback: OBSSceneCallback): () => void {
    this.sceneCallbacks.add(callback);
    return () => this.sceneCallbacks.delete(callback);
  }
  
  onStreamStatusChange(callback: OBSStreamCallback): () => void {
    this.streamCallbacks.add(callback);
    return () => this.streamCallbacks.delete(callback);
  }
  
  dispose(): void {
    this.obs.disconnect();
    this.statusCallbacks.clear();
    this.sceneCallbacks.clear();
    this.streamCallbacks.clear();
  }
  
  // === PRIVATE ===
  
  private setupEventHandlers(): void {
    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.sceneCallbacks.forEach(cb => cb({
        name: data.sceneName,
        index: 0,
      }));
    });
    
    this.obs.on('StreamStateChanged', (data) => {
      this.streamCallbacks.forEach(cb => cb({
        isStreaming: data.outputActive,
        isRecording: false,
      }));
    });
    
    this.obs.on('RecordStateChanged', (data) => {
      this.streamCallbacks.forEach(cb => cb({
        isStreaming: false,
        isRecording: data.outputActive,
      }));
    });
    
    this.obs.on('ConnectionClosed', () => {
      this.setStatus('disconnected');
    });
    
    this.obs.on('ConnectionError', (err) => {
      this.setStatus('error', err.message);
    });
  }
  
  private setStatus(status: OBSConnectionStatus, error?: string): void {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(status, error));
  }
}

// Singleton
let instance: OBSWebSocketAdapter | null = null;

export function getOBSAdapter(): OBSWebSocketAdapter {
  if (!instance) {
    instance = new OBSWebSocketAdapter();
  }
  return instance;
}
```

### Fase 3: Servicio de Aplicación (OBSService.ts)

```typescript
// src/application/services/OBSService.ts

import type { IOBSController, OBSScene } from '../../domain/ports/IOBSController';
import { getOBSAdapter } from '../../infrastructure/adapters/OBSWebSocketAdapter';

export interface SceneAutomation {
  trigger: 'game_start' | 'game_end' | 'poll_start' | 'poll_end' | 'giveaway' | 'raid' | 'brb';
  sceneName: string;
  sourcesToShow?: string[];
  sourcesToHide?: string[];
  delay?: number;
}

export class OBSService {
  private controller: IOBSController;
  private automations: SceneAutomation[] = [];
  
  constructor(controller?: IOBSController) {
    this.controller = controller || getOBSAdapter();
  }
  
  // === CONEXIÓN ===
  
  async connect(password?: string): Promise<void> {
    await this.controller.connect({ password });
  }
  
  async disconnect(): Promise<void> {
    await this.controller.disconnect();
  }
  
  isConnected(): boolean {
    return this.controller.getConnectionStatus() === 'connected';
  }
  
  // === ESCENAS ===
  
  async getScenes(): Promise<OBSScene[]> {
    return this.controller.getScenes();
  }
  
  async switchScene(sceneName: string): Promise<void> {
    await this.controller.setScene(sceneName);
  }
  
  // === AUTOMATIZACIÓN ===
  
  addAutomation(automation: SceneAutomation): void {
    this.automations.push(automation);
    this.saveAutomations();
  }
  
  removeAutomation(trigger: SceneAutomation['trigger']): void {
    this.automations = this.automations.filter(a => a.trigger !== trigger);
    this.saveAutomations();
  }
  
  getAutomations(): SceneAutomation[] {
    return [...this.automations];
  }
  
  /**
   * Ejecutar automatización basada en trigger
   * Llamar desde los juegos/encuestas cuando ocurra el evento
   */
  async executeTrigger(trigger: SceneAutomation['trigger']): Promise<void> {
    const automation = this.automations.find(a => a.trigger === trigger);
    
    if (!automation || !this.isConnected()) return;
    
    // Delay opcional
    if (automation.delay) {
      await new Promise(r => setTimeout(r, automation.delay));
    }
    
    // Cambiar escena
    await this.controller.setScene(automation.sceneName);
    
    // Mostrar fuentes
    for (const source of automation.sourcesToShow || []) {
      await this.controller.setSourceVisible(automation.sceneName, source, true);
    }
    
    // Ocultar fuentes
    for (const source of automation.sourcesToHide || []) {
      await this.controller.setSourceVisible(automation.sceneName, source, false);
    }
  }
  
  // === PERSISTENCIA ===
  
  private saveAutomations(): void {
    localStorage.setItem('obs_automations', JSON.stringify(this.automations));
  }
  
  loadAutomations(): void {
    const saved = localStorage.getItem('obs_automations');
    if (saved) {
      this.automations = JSON.parse(saved);
    }
  }
}

// Singleton
let serviceInstance: OBSService | null = null;

export function getOBSService(): OBSService {
  if (!serviceInstance) {
    serviceInstance = new OBSService();
    serviceInstance.loadAutomations();
  }
  return serviceInstance;
}
```

### Fase 4: Hook de React (useOBS.ts)

```typescript
// src/application/hooks/useOBS.ts

import { useState, useEffect, useCallback } from 'react';
import { getOBSService, type SceneAutomation } from '../services/OBSService';
import type { OBSConnectionStatus, OBSScene } from '../../domain/ports/IOBSController';

export function useOBS() {
  const [status, setStatus] = useState<OBSConnectionStatus>('disconnected');
  const [scenes, setScenes] = useState<OBSScene[]>([]);
  const [currentScene, setCurrentScene] = useState<string | null>(null);
  const [automations, setAutomations] = useState<SceneAutomation[]>([]);
  
  const service = getOBSService();
  
  const connect = useCallback(async (password?: string) => {
    setStatus('connecting');
    try {
      await service.connect(password);
      setStatus('connected');
      
      // Cargar escenas
      const sceneList = await service.getScenes();
      setScenes(sceneList);
      
      // Cargar automatizaciones
      setAutomations(service.getAutomations());
    } catch (error) {
      setStatus('error');
    }
  }, [service]);
  
  const disconnect = useCallback(async () => {
    await service.disconnect();
    setStatus('disconnected');
    setScenes([]);
    setCurrentScene(null);
  }, [service]);
  
  const switchScene = useCallback(async (sceneName: string) => {
    await service.switchScene(sceneName);
    setCurrentScene(sceneName);
  }, [service]);
  
  const addAutomation = useCallback((automation: SceneAutomation) => {
    service.addAutomation(automation);
    setAutomations(service.getAutomations());
  }, [service]);
  
  const removeAutomation = useCallback((trigger: SceneAutomation['trigger']) => {
    service.removeAutomation(trigger);
    setAutomations(service.getAutomations());
  }, [service]);
  
  // Función para que otros componentes disparen automatizaciones
  const trigger = useCallback(async (triggerType: SceneAutomation['trigger']) => {
    await service.executeTrigger(triggerType);
  }, [service]);
  
  return {
    status,
    isConnected: status === 'connected',
    scenes,
    currentScene,
    automations,
    connect,
    disconnect,
    switchScene,
    addAutomation,
    removeAutomation,
    trigger,
  };
}
```

## 4. INTEGRACIÓN CON JUEGOS/ENCUESTAS

### Ejemplo: Integrar con Duck Hunt

```typescript
// En components/games/DuckHunt.tsx

import { useOBS } from '../../src/application/hooks/useOBS';

export const DuckHunt = () => {
  const { trigger, isConnected } = useOBS();
  
  const startGame = async () => {
    // Lógica existente del juego...
    
    // Trigger OBS automation
    if (isConnected) {
      await trigger('game_start');
    }
  };
  
  const endGame = async () => {
    // Lógica existente...
    
    if (isConnected) {
      await trigger('game_end');
    }
  };
  
  // ...resto del componente
};
```

## 5. COMPONENTE UI (OBSControlPanel.tsx)

Panel para configurar conexión y automatizaciones:

- Conexión: host, puerto, password
- Lista de escenas disponibles
- Configurar automatizaciones (trigger → escena)
- Estado del stream (live/recording)
- Botones de control rápido

## 6. DEPENDENCIAS

```bash
npm install obs-websocket-js
```

## 7. CRONOGRAMA

| Fase | Tarea | Tiempo |
|------|-------|--------|
| 1 | Puerto IOBSController | 1 día |
| 2 | Adapter OBSWebSocketAdapter | 2 días |
| 3 | Servicio OBSService | 1 día |
| 4 | Hook useOBS | 1 día |
| 5 | UI OBSControlPanel | 2 días |
| 6 | Integrar con juegos existentes | 2-3 días |
| 7 | Testing | 2 días |

**Total estimado: 10-12 días**

## 8. CONFIGURACIÓN OBS

El usuario necesita:
1. OBS Studio v28+ (WebSocket incluido)
2. Herramientas → Configuración de WebSocket Server
3. Habilitar servidor WebSocket
4. Configurar contraseña (opcional pero recomendado)
5. Puerto por defecto: 4455

## 9. PRÓXIMOS PASOS

1. ¿Empezamos con la Fase 1 (Puerto)?
2. ¿Prefieres ver primero el componente UI?
3. ¿Quieres que priorice alguna automatización específica?
