# Design: App Móvil Companion

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (PWA/React Native)            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Screens   │  │   Hooks     │  │  Services   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                ┌─────────▼─────────┐                       │
│                │  WebSocket Client │                       │
│                └─────────┬─────────┘                       │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ WSS
┌──────────────────────────┼──────────────────────────────────┐
│                          │                                  │
│                ┌─────────▼─────────┐                       │
│                │  Desktop App      │                       │
│                │  (WebSocket Srv)  │                       │
│                └───────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Technology Choice: PWA

Razones para elegir PWA sobre React Native:
- Reutiliza código existente de React
- No requiere publicar en app stores
- Instalable desde el navegador
- Actualizaciones instantáneas
- Menor tiempo de desarrollo


## Connection Protocol

### Pairing Flow
```
1. Desktop genera QR con: { sessionId, wsUrl, token }
2. Mobile escanea QR
3. Mobile conecta a WebSocket con token
4. Desktop valida token y acepta conexión
5. Mobile recibe estado inicial
```

### Message Types
```typescript
type MobileMessage =
  | { type: 'POLL_CREATE'; data: PollData }
  | { type: 'POLL_CLOSE'; data: { pollId: string } }
  | { type: 'PREDICTION_RESOLVE'; data: { predictionId: string; outcome: string } }
  | { type: 'TIMER_START'; data: { timerId: string } }
  | { type: 'TIMER_PAUSE'; data: { timerId: string } }
  | { type: 'GIVEAWAY_DRAW'; data: { giveawayId: string } }
  | { type: 'CHAT_SEND'; data: { message: string } };

type DesktopMessage =
  | { type: 'STATE_SYNC'; data: AppState }
  | { type: 'POLL_UPDATE'; data: Poll }
  | { type: 'PREDICTION_UPDATE'; data: Prediction }
  | { type: 'TIMER_UPDATE'; data: Timer }
  | { type: 'CHAT_MESSAGE'; data: ChatMessage }
  | { type: 'NOTIFICATION'; data: Notification };
```

## Screen Structure

```
├── SplashScreen
├── PairingScreen (QR scanner / code input)
├── MainTabs
│   ├── DashboardTab (métricas rápidas)
│   ├── ActivitiesTab
│   │   ├── PollsScreen
│   │   ├── PredictionsScreen
│   │   ├── GiveawaysScreen
│   │   └── TimersScreen
│   ├── ChatTab (mod chat)
│   └── SettingsTab
└── Modals
    ├── CreatePollModal
    ├── CreatePredictionModal
    └── NotificationSettingsModal
```


## Key Components

### MobileWebSocketService
```typescript
interface MobileWebSocketService {
  connect(url: string, token: string): Promise<void>;
  disconnect(): void;
  send(message: MobileMessage): void;
  onMessage(handler: (msg: DesktopMessage) => void): void;
  onConnectionChange(handler: (status: ConnectionStatus) => void): void;
}
```

### useMobileSync Hook
```typescript
function useMobileSync() {
  return {
    isConnected: boolean;
    state: AppState | null;
    sendAction: (action: MobileMessage) => void;
    reconnect: () => void;
  };
}
```

## Files to Create

### PWA Setup
- `mobile/index.html`
- `mobile/manifest.json`
- `mobile/service-worker.ts`

### Screens
- `mobile/screens/PairingScreen.tsx`
- `mobile/screens/DashboardScreen.tsx`
- `mobile/screens/PollsScreen.tsx`
- `mobile/screens/PredictionsScreen.tsx`
- `mobile/screens/GiveawaysScreen.tsx`
- `mobile/screens/TimersScreen.tsx`
- `mobile/screens/ChatScreen.tsx`
- `mobile/screens/SettingsScreen.tsx`

### Services
- `mobile/services/MobileWebSocketService.ts`
- `mobile/services/PairingService.ts`
- `mobile/services/NotificationService.ts`

### Hooks
- `mobile/hooks/useMobileSync.ts`
- `mobile/hooks/usePairing.ts`
- `mobile/hooks/usePushNotifications.ts`

### Desktop Integration
- `src/services/MobileServerService.ts` (WebSocket server para móvil)
- `components/MobilePairingPanel.tsx` (QR generator)
