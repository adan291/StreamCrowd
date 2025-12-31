# Design: Integraciones Externas (Streamlabs, StreamElements)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Integration Layer                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Streamlabs  │    │StreamElements│    │   Future     │      │
│  │   Adapter    │    │   Adapter    │    │  Adapters    │      │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘      │
│         │                   │                                    │
│         └─────────┬─────────┘                                   │
│                   │                                              │
│         ┌─────────▼─────────┐                                   │
│         │ IntegrationService│                                   │
│         │   (Orchestrator)  │                                   │
│         └─────────┬─────────┘                                   │
│                   │                                              │
│    ┌──────────────┼──────────────┐                              │
│    │              │              │                               │
│    ▼              ▼              ▼                               │
│ ┌──────┐    ┌──────────┐   ┌──────────┐                        │
│ │Events│    │  Macros  │   │ Metrics  │                        │
│ │System│    │  System  │   │Dashboard │                        │
│ └──────┘    └──────────┘   └──────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Service Layer

### Integration Service (Orchestrator)
```typescript
// src/integrations/services/IntegrationService.ts
interface IntegrationService {
  // Connection management
  connect(provider: 'streamlabs' | 'streamelements'): Promise<void>;
  disconnect(provider: string): Promise<void>;
  getConnectionStatus(provider: string): ConnectionStatus;
  
  // Event handling
  onEvent(handler: (event: IntegrationEvent) => void): void;
  getEventHistory(filters?: EventFilters): IntegrationEvent[];
  
  // Actions
  triggerAlert(provider: string, alertType: string, data: any): Promise<void>;
}
```

### Streamlabs Adapter
```typescript
// src/integrations/adapters/StreamlabsAdapter.ts
interface StreamlabsAdapter {
  // OAuth
  getAuthUrl(): string;
  handleCallback(code: string): Promise<StreamlabsTokens>;
  refreshToken(): Promise<void>;
  
  // Socket connection
  connectSocket(token: string): Promise<void>;
  disconnectSocket(): void;
  
  // Events
  onDonation(handler: (donation: StreamlabsDonation) => void): void;
  onFollow(handler: (follow: StreamlabsFollow) => void): void;
  onSubscription(handler: (sub: StreamlabsSub) => void): void;
  
  // Actions
  testAlert(type: string): Promise<void>;
  skipAlert(): Promise<void>;
  pauseAlerts(): Promise<void>;
}
```

### StreamElements Adapter
```typescript
// src/integrations/adapters/StreamElementsAdapter.ts
interface StreamElementsAdapter {
  // JWT Auth
  setJWTToken(token: string): void;
  validateToken(): Promise<boolean>;
  
  // Socket connection
  connectSocket(): Promise<void>;
  disconnectSocket(): void;
  
  // Events
  onTip(handler: (tip: SEtip) => void): void;
  onFollow(handler: (follow: SEFollow) => void): void;
  onSubscription(handler: (sub: SESub) => void): void;
  onRaid(handler: (raid: SERaid) => void): void;
  onCheer(handler: (cheer: SECheer) => void): void;
  
  // Points system
  getPoints(userId: string): Promise<number>;
  addPoints(userId: string, amount: number): Promise<void>;
  removePoints(userId: string, amount: number): Promise<void>;
  
  // Actions
  testAlert(type: string): Promise<void>;
}
```

## Types

```typescript
// types/integrations.ts

// Connection
interface ConnectionStatus {
  provider: string;
  connected: boolean;
  lastConnected?: Date;
  latency?: number;
  error?: string;
}

// Events
interface IntegrationEvent {
  id: string;
  provider: 'streamlabs' | 'streamelements';
  type: 'donation' | 'follow' | 'subscription' | 'raid' | 'cheer' | 'tip';
  timestamp: Date;
  data: EventData;
  processed: boolean;
}

interface EventData {
  username: string;
  amount?: number;
  currency?: string;
  message?: string;
  tier?: string;
  months?: number;
  viewers?: number;
}

// Streamlabs specific
interface StreamlabsTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface StreamlabsDonation {
  id: string;
  name: string;
  amount: number;
  currency: string;
  message: string;
  createdAt: Date;
}

// StreamElements specific
interface SEtip {
  _id: string;
  username: string;
  amount: number;
  currency: string;
  message: string;
  createdAt: string;
}

// Event mapping
interface EventMapping {
  id: string;
  provider: string;
  eventType: string;
  filters: EventFilters;
  action: MappedAction;
  enabled: boolean;
}

interface EventFilters {
  minAmount?: number;
  maxAmount?: number;
  keywords?: string[];
  usernames?: string[];
}

interface MappedAction {
  type: 'macro' | 'notification' | 'obs' | 'custom';
  macroId?: string;
  notificationConfig?: NotificationConfig;
  obsAction?: OBSAction;
  customHandler?: string;
}
```

## React Hooks

```typescript
// hooks/useStreamlabs.ts
function useStreamlabs() {
  return {
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    events: StreamlabsEvent[];
    testAlert: (type: string) => Promise<void>;
  };
}

// hooks/useStreamElements.ts
function useStreamElements() {
  return {
    isConnected: boolean;
    connect: (token: string) => Promise<void>;
    disconnect: () => void;
    events: SEEvent[];
    points: {
      get: (userId: string) => Promise<number>;
      add: (userId: string, amount: number) => Promise<void>;
    };
  };
}

// hooks/useIntegrationEvents.ts
function useIntegrationEvents(filters?: EventFilters) {
  return {
    events: IntegrationEvent[];
    stats: EventStats;
    clearHistory: () => void;
    exportHistory: () => void;
  };
}

// hooks/useEventMappings.ts
function useEventMappings() {
  return {
    mappings: EventMapping[];
    addMapping: (mapping: EventMapping) => void;
    updateMapping: (id: string, updates: Partial<EventMapping>) => void;
    deleteMapping: (id: string) => void;
    toggleMapping: (id: string) => void;
  };
}
```

## UI Components

### IntegrationsPanel
```typescript
// components/integrations/IntegrationsPanel.tsx
// Panel principal con tabs para cada integración
```

### StreamlabsConfig
```typescript
// components/integrations/StreamlabsConfig.tsx
// - Botón conectar con OAuth
// - Estado de conexión
// - Lista de eventos recientes
// - Configuración de alertas
```

### StreamElementsConfig
```typescript
// components/integrations/StreamElementsConfig.tsx
// - Input para JWT token
// - Estado de conexión
// - Sistema de puntos
// - Lista de eventos
```

### EventMappingEditor
```typescript
// components/integrations/EventMappingEditor.tsx
// - Selector de evento
// - Filtros (monto, keywords)
// - Selector de acción (macro, notificación, etc)
// - Toggle enable/disable
```

### IntegrationEventLog
```typescript
// components/integrations/IntegrationEventLog.tsx
// - Lista de eventos recibidos
// - Filtros por provider, tipo, fecha
// - Estadísticas
// - Exportar
```

## Storage

```typescript
// Tokens (encriptados)
localStorage: {
  'integration:streamlabs:tokens': encrypted<StreamlabsTokens>,
  'integration:streamelements:jwt': encrypted<string>,
}

// Configuración
localStorage: {
  'integration:mappings': EventMapping[],
  'integration:settings': IntegrationSettings,
}

// Historial (IndexedDB para volumen)
indexedDB: {
  'integration-events': IntegrationEvent[],
}
```

## Security Considerations

1. **Token Storage**: Tokens encriptados con la misma clave que backups
2. **Refresh Tokens**: Auto-refresh antes de expiración
3. **Scopes**: Solicitar solo scopes necesarios
4. **Validation**: Validar todos los eventos entrantes

## Files to Create

### Services
- `src/integrations/services/IntegrationService.ts`
- `src/integrations/adapters/StreamlabsAdapter.ts`
- `src/integrations/adapters/StreamElementsAdapter.ts`
- `src/integrations/services/EventMappingService.ts`
- `src/integrations/services/IntegrationStorageService.ts`

### Types
- `types/integrations.ts`

### Hooks
- `hooks/useStreamlabs.ts`
- `hooks/useStreamElements.ts`
- `hooks/useIntegrationEvents.ts`
- `hooks/useEventMappings.ts`

### Components
- `components/integrations/IntegrationsPanel.tsx`
- `components/integrations/StreamlabsConfig.tsx`
- `components/integrations/StreamElementsConfig.tsx`
- `components/integrations/EventMappingEditor.tsx`
- `components/integrations/IntegrationEventLog.tsx`
- `components/integrations/ConnectionStatusBadge.tsx`

### Tests
- `tests/services/StreamlabsAdapter.property.test.ts`
- `tests/services/StreamElementsAdapter.property.test.ts`
- `tests/services/IntegrationService.property.test.ts`
