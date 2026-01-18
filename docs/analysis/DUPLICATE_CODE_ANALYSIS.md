# Análisis de Código Duplicado y Patrones

## 1. DUPLICACIÓN EN COMPONENTES DE JUEGOS (13 archivos)

### 1.1 Patrón Base Identificado

**Archivos afectados**:
- `components/games/PiumGame.tsx`
- `components/games/DuckHunt.tsx`
- `components/games/BattleshipGame.tsx`
- `components/games/HotPotato.tsx`
- `components/games/ChatFishing.tsx`
- `components/games/TriviaBattle.tsx`
- `components/games/CasinoRoulette.tsx`
- `components/games/VeoVeo.tsx`
- `components/games/PiedraPapelTijera.tsx`
- `components/games/Ahorcado.tsx`
- `components/games/CarreraEmotes.tsx`
- `components/games/MemoriaIRL.tsx`
- `components/games/PartyCo.tsx`

### 1.2 Código Duplicado

```typescript
// PATRÓN 1: Inicialización de estado
const [gameState, setGameState] = useState<GameState>(initialState);
const [players, setPlayers] = useState<Map<string, Player>>(new Map());
const [scores, setScores] = useState<Map<string, number>>(new Map());
const [isActive, setIsActive] = useState(false);

// PATRÓN 2: Listener de mensajes
useEffect(() => {
  const handleMessage = (tags: tmi.ChatUserstate, message: string) => {
    if (!isActive) return;
    
    const username = tags['display-name'] || tags.username;
    const userId = tags['user-id'];
    
    // Parse comando específico del juego
    const command = message.trim().toLowerCase();
    
    // Validar usuario
    if (!username || !userId) return;
    
    // Procesar comando
    // ...
  };
  
  twitchService.onMessage(handleMessage);
  return () => {
    // Cleanup (pero no hay forma de desuscribirse)
  };
}, [isActive]);

// PATRÓN 3: Sincronización con overlay
useEffect(() => {
  const channel = new BroadcastChannel(`game_${gameType}_sync`);
  
  channel.postMessage({
    type: 'state',
    data: gameState,
  });
  
  return () => channel.close();
}, [gameState]);

// PATRÓN 4: Manejo de ganador
const selectWinner = () => {
  const playerArray = Array.from(players.values());
  const winner = playerArray[Math.floor(Math.random() * playerArray.length)];
  setGameState(prev => ({ ...prev, winner }));
};
```

### 1.3 Solución: Hook `useGameBase`

```typescript
// hooks/useGameBase.ts
export interface GameConfig {
  gameType: string;
  initialState: any;
  commandParser: (message: string) => { command: string; args: string[] } | null;
  commandHandler: (command: string, args: string[], context: CommandContext) => void;
  syncChannel?: string;
}

export interface CommandContext {
  username: string;
  userId: string;
  isSubscriber: boolean;
  isFollower: boolean;
}

export function useGameBase(config: GameConfig) {
  const [gameState, setGameState] = useState(config.initialState);
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [isActive, setIsActive] = useState(false);
  
  // Listener centralizado
  useEffect(() => {
    const handleMessage = (tags: tmi.ChatUserstate, message: string) => {
      if (!isActive) return;
      
      const parsed = config.commandParser(message);
      if (!parsed) return;
      
      const context: CommandContext = {
        username: tags['display-name'] || tags.username || 'Unknown',
        userId: tags['user-id'] || 'unknown',
        isSubscriber: tags.subscriber === '1',
        isFollower: tags.badges?.follower === '1',
      };
      
      config.commandHandler(parsed.command, parsed.args, context);
    };
    
    twitchService.onMessage(handleMessage);
  }, [isActive, config]);
  
  // Sincronización centralizada
  useEffect(() => {
    if (!config.syncChannel) return;
    
    const channel = new BroadcastChannel(config.syncChannel);
    channel.postMessage({ type: 'state', data: gameState });
    return () => channel.close();
  }, [gameState, config.syncChannel]);
  
  return {
    gameState,
    setGameState,
    players,
    setPlayers,
    isActive,
    setIsActive,
  };
}
```

## 2. DUPLICACIÓN EN OVERLAYS (13 archivos)

### 2.1 Patrón Base Identificado

**Archivos afectados**:
- `components/games/PiumOverlay.tsx`
- `components/games/DuckHuntOverlay.tsx`
- `components/games/BattleshipOverlay.tsx`
- `components/games/PotatoOverlay.tsx`
- `components/games/TriviaOverlay.tsx`
- `components/games/FishingOverlay.tsx`
- `components/games/RouletteOverlay.tsx`
- `components/games/VeoVeoOverlay.tsx`
- `components/games/PPTOverlay.tsx`
- `components/games/AhorcadoOverlay.tsx`
- `components/games/CarreraOverlay.tsx`
- `components/games/MemoriaOverlay.tsx`
- `components/games/PartyCoOverlay.tsx`

### 2.2 Código Duplicado

```typescript
// PATRÓN 1: Configuración de overlay
const { bgColor, setBgColor } = useOverlayMode(true);
const [bgColor, setBgColor] = useState(getBgFromUrl() || defaultBg);

// PATRÓN 2: Sincronización con juego
useEffect(() => {
  const channel = new BroadcastChannel(`game_${gameType}_sync`);
  
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'state') {
      setGameState(event.data.data);
    }
  };
  
  channel.addEventListener('message', handleMessage);
  
  // Solicitar estado inicial
  channel.postMessage({ type: 'request_state' });
  
  return () => {
    channel.removeEventListener('message', handleMessage);
    channel.close();
  };
}, []);

// PATRÓN 3: Renderizado de overlay
return (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
    <div className="relative w-full h-full">
      {/* Contenido del juego */}
    </div>
  </div>
);
```

### 2.3 Solución: Hook `useOverlaySync`

```typescript
// hooks/useOverlaySync.ts
export interface OverlaySyncConfig {
  channel: string;
  onStateChange: (state: any) => void;
  initialState?: any;
}

export function useOverlaySync(config: OverlaySyncConfig) {
  const [state, setState] = useState(config.initialState);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const channel = new BroadcastChannel(config.channel);
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'state') {
        setState(event.data.data);
        config.onStateChange(event.data.data);
        setIsConnected(true);
      }
    };
    
    channel.addEventListener('message', handleMessage);
    
    // Solicitar estado inicial
    channel.postMessage({ type: 'request_state' });
    
    // Timeout para detectar desconexión
    const timeout = setTimeout(() => {
      if (!isConnected) {
        console.warn(`No response from ${config.channel}`);
      }
    }, 5000);
    
    return () => {
      clearTimeout(timeout);
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [config.channel, config.onStateChange]);
  
  return { state, isConnected };
}
```

## 3. DUPLICACIÓN EN GESTIÓN DE COLABORADORES

### 3.1 Ubicaciones

- `components/PollCreator.tsx` (líneas ~200-250)
- `components/JudgePanel.tsx` (líneas ~150-200)
- `components/GiveawayHub.tsx` (líneas ~300-350)

### 3.2 Código Duplicado

```typescript
// En PollCreator.tsx
const [collaborationChannels, setCollaborationChannels] = useState<CollaborationChannel[]>([]);

const handleAddCollaborator = async (channel: string) => {
  const result = await addCollaborator(channel);
  if (result) {
    setCollaborationChannels(prev => [...prev, result]);
    addNotification('success', `${channel} agregado a colaboración`);
  } else {
    addNotification('error', `No se pudo conectar a ${channel}`);
  }
};

const handleRemoveCollaborator = (channel: string) => {
  removeCollaborator(channel);
  setCollaborationChannels(prev => prev.filter(c => c.name !== channel));
  addNotification('info', `${channel} removido de colaboración`);
};

// En JudgePanel.tsx - CÓDIGO IDÉNTICO
// En GiveawayHub.tsx - CÓDIGO IDÉNTICO
```

### 3.3 Solución: Hook `useCollaborationUI`

```typescript
// hooks/useCollaborationUI.ts
export interface UseCollaborationUIOptions {
  onNotification?: (type: string, message: string) => void;
}

export function useCollaborationUI(options: UseCollaborationUIOptions = {}) {
  const { onNotification } = options;
  const { collaborationChannels, addCollaborator, removeCollaborator } = useTwitchConnection();
  const [localChannels, setLocalChannels] = useState<CollaborationChannel[]>(collaborationChannels);
  
  useEffect(() => {
    setLocalChannels(collaborationChannels);
  }, [collaborationChannels]);
  
  const handleAddCollaborator = async (channel: string) => {
    const result = await addCollaborator(channel);
    if (result) {
      setLocalChannels(prev => [...prev, result]);
      onNotification?.('success', `${channel} agregado a colaboración`);
    } else {
      onNotification?.('error', `No se pudo conectar a ${channel}`);
    }
  };
  
  const handleRemoveCollaborator = (channel: string) => {
    removeCollaborator(channel);
    setLocalChannels(prev => prev.filter(c => c.name !== channel));
    onNotification?.('info', `${channel} removido de colaboración`);
  };
  
  return {
    collaborationChannels: localChannels,
    addCollaborator: handleAddCollaborator,
    removeCollaborator: handleRemoveCollaborator,
  };
}
```

## 4. DUPLICACIÓN EN PROCESAMIENTO DE CHAT

### 4.1 Ubicaciones

- `App.tsx` (líneas ~600-800) - Procesamiento de votos
- `components/games/PiumGame.tsx` - Procesamiento de comandos
- `components/games/DuckHunt.tsx` - Procesamiento de comandos
- ... (todos los juegos)

### 4.2 Código Duplicado

```typescript
// En App.tsx
twitchService.onMessage((tags, message, self, sourceChannel) => {
  const isSubscriber = tags.subscriber === true || tags.subscriber === '1';
  const msg: TwitchMessage = {
    username: tags['display-name'] || tags.username || 'Anon',
    message,
    color: tags.color || '#a970ff',
    id: tags.id,
    userId: tags['user-id'],
    isSubscriber: !!isSubscriber,
    timestamp: Date.now(),
    sourceChannel: sourceChannel,
  };
  
  setChatMessages(prev => [...prev.slice(-199), msg]);
  
  // Procesar votos
  if (pollRef.current && pollRef.current.isActive) {
    const prefix = pollRef.current.votePrefix || '+';
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trimmedMsg = message.trim().toLowerCase();
    
    const voteRegex = new RegExp(`^${escapedPrefix}(\\d+)`, 'i');
    const voteMatch = trimmedMsg.match(voteRegex);
    
    // ... más lógica
  }
});

// En cada juego - PATRÓN SIMILAR
twitchService.onMessage((tags, message) => {
  const username = tags['display-name'] || tags.username;
  const userId = tags['user-id'];
  
  const command = message.trim().toLowerCase();
  
  // Parse comando específico
  // Validar usuario
  // Procesar
});
```

### 4.3 Solución: Hook `useChatCommand`

```typescript
// hooks/useChatCommand.ts
export interface ChatCommand {
  pattern: RegExp;
  handler: (match: RegExpMatchArray, context: CommandContext) => void;
}

export interface CommandContext {
  username: string;
  userId: string;
  isSubscriber: boolean;
  isFollower: boolean;
  message: string;
  tags: tmi.ChatUserstate;
}

export function useChatCommand(commands: ChatCommand[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    
    const handleMessage = (tags: tmi.ChatUserstate, message: string) => {
      const context: CommandContext = {
        username: tags['display-name'] || tags.username || 'Unknown',
        userId: tags['user-id'] || 'unknown',
        isSubscriber: tags.subscriber === '1',
        isFollower: tags.badges?.follower === '1',
        message,
        tags,
      };
      
      for (const command of commands) {
        const match = message.match(command.pattern);
        if (match) {
          command.handler(match, context);
          break; // Solo procesar el primer comando que coincida
        }
      }
    };
    
    twitchService.onMessage(handleMessage);
  }, [commands, enabled]);
}
```

## 5. DUPLICACIÓN EN PERSISTENCIA

### 5.1 Ubicaciones

- `hooks/usePoll.ts` - localStorage + Firebase
- `hooks/useStreamEvents.ts` - localStorage
- `components/StreamActivity.tsx` - localStorage
- `App.tsx` - localStorage directo

### 5.2 Código Duplicado

```typescript
// En usePoll.ts
localStorage.setItem(STORAGE_KEYS.POLL_SYNC, JSON.stringify(currentPoll));
localStorage.setItem(STORAGE_KEYS.VOTE_HISTORY_SYNC, JSON.stringify(voteHistory));

// En useStreamEvents.ts
localStorage.setItem(key, JSON.stringify(trimmed));

// En App.tsx
localStorage.setItem(STORAGE_KEYS.MEDIA_ASSETS, JSON.stringify(updated));

// En StreamActivity.tsx
storageHelpers.saveEventsForDate(channelName, today, events);
```

### 5.3 Solución: Servicio de Persistencia Centralizado

```typescript
// services/persistenceService.ts
export interface PersistenceAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class LocalStoragePersistence implements PersistenceAdapter {
  async get(key: string) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  
  async remove(key: string) {
    localStorage.removeItem(key);
  }
  
  async clear() {
    localStorage.clear();
  }
}

export class FirebasePersistence implements PersistenceAdapter {
  // Implementación con Firebase
}

export class PersistenceService {
  constructor(private adapter: PersistenceAdapter) {}
  
  async savePoll(poll: Poll) {
    await this.adapter.set('poll_current', poll);
  }
  
  async loadPoll(): Promise<Poll | null> {
    return this.adapter.get('poll_current');
  }
  
  // ... más métodos
}
```

## 6. DUPLICACIÓN EN VALIDACIÓN DE USUARIOS

### 6.1 Ubicaciones

- `App.tsx` (líneas ~650-700)
- `components/games/PiumGame.tsx`
- `components/games/DuckHunt.tsx`
- ... (todos los juegos)

### 6.2 Código Duplicado

```typescript
// En App.tsx
const isSubscriber = tags.subscriber === true || tags.subscriber === '1' || 
  (tags.badges && ('subscriber' in tags.badges || 'founder' in tags.badges));
const isBroadcaster = tags.badges && 'broadcaster' in tags.badges;
const isMod = tags.mod === true || tags.mod === '1';

// En cada juego - CÓDIGO SIMILAR
const isSubscriber = tags.subscriber === '1';
const isMod = tags.mod === '1';
```

### 6.3 Solución: Función Utilitaria

```typescript
// utils/userValidation.ts
export interface UserContext {
  isSubscriber: boolean;
  isFollower: boolean;
  isBroadcaster: boolean;
  isMod: boolean;
  isVIP: boolean;
}

export function extractUserContext(tags: tmi.ChatUserstate): UserContext {
  return {
    isSubscriber: tags.subscriber === true || tags.subscriber === '1' || 
      (tags.badges && ('subscriber' in tags.badges || 'founder' in tags.badges)),
    isFollower: tags.badges ? 'follower' in tags.badges : false,
    isBroadcaster: tags.badges ? 'broadcaster' in tags.badges : false,
    isMod: tags.mod === true || tags.mod === '1',
    isVIP: tags.badges ? 'vip' in tags.badges : false,
  };
}
```

## 7. RESUMEN DE DUPLICACIÓN

| Tipo | Ubicaciones | Líneas | Solución |
|------|-------------|--------|----------|
| Juegos base | 13 archivos | ~200 c/u | Hook `useGameBase` |
| Overlays | 13 archivos | ~150 c/u | Hook `useOverlaySync` |
| Colaboradores | 3 archivos | ~50 c/u | Hook `useCollaborationUI` |
| Chat commands | 14 archivos | ~100 c/u | Hook `useChatCommand` |
| Persistencia | 4 archivos | ~50 c/u | Servicio centralizado |
| Validación usuarios | 14 archivos | ~10 c/u | Función utilitaria |
| **TOTAL** | **~60 archivos** | **~2000 líneas** | **Refactorizar** |

## 8. IMPACTO DE LA DUPLICACIÓN

- **Mantenibilidad**: Cambios en un juego requieren cambios en 13 archivos
- **Bugs**: Un bug en un juego se replica en 13 archivos
- **Testing**: Necesario testear 13 veces el mismo código
- **Tamaño del bundle**: ~2000 líneas de código duplicado
- **Onboarding**: Difícil para nuevos desarrolladores

