# Design Document: Pending Features

## Overview

Este documento describe el diseño técnico para las funcionalidades pendientes: integración con StreamElements/Streamlabs, tests OBS, y optimización del bundle. Sigue la arquitectura hexagonal existente.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
│  ┌─────────────────┐ ┌─────────────────┐                        │
│  │AlertProviderPanel│ │BundleReportView │                        │
│  └─────────────────┘ └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌───────────────────┐ ┌───────────────────┐                    │
│  │AlertProviderService│ │useAlertProvider   │                    │
│  └───────────────────┘ └───────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         Domain Layer                             │
│  ┌─────────────────┐                                            │
│  │IAlertProvider   │ (port for external alert providers)        │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
│  ┌───────────────────┐ ┌───────────────────┐                    │
│  │StreamElementsAdapter│ │StreamlabsAdapter │                    │
│  └───────────────────┘ └───────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Alert Provider Integration

#### Domain Port: IAlertProvider

```typescript
interface AlertProviderConfig {
  provider: 'streamelements' | 'streamlabs';
  enabled: boolean;
  // StreamElements
  jwtToken?: string;
  // Streamlabs
  socketToken?: string;
}

interface ExternalAlert {
  id: string;
  type: 'donation' | 'follow' | 'subscription' | 'cheer' | 'raid';
  username: string;
  amount?: number;
  currency?: string;
  message?: string;
  timestamp: number;
}

interface IAlertProvider {
  connect(config: AlertProviderConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  onAlert(callback: (alert: ExternalAlert) => void): () => void;
  getProviderName(): string;
}
```

#### StreamElements Adapter

```typescript
class StreamElementsAdapter implements IAlertProvider {
  private socket: Socket | null = null;
  private listeners: Set<(alert: ExternalAlert) => void> = new Set();
  
  async connect(config: AlertProviderConfig): Promise<void> {
    // Connect to wss://realtime.streamelements.com
    // Authenticate with JWT token
  }
  
  async disconnect(): Promise<void>;
  isConnected(): boolean;
  onAlert(callback: (alert: ExternalAlert) => void): () => void;
  getProviderName(): string { return 'StreamElements'; }
}
```

#### Streamlabs Adapter

```typescript
class StreamlabsAdapter implements IAlertProvider {
  private socket: Socket | null = null;
  private listeners: Set<(alert: ExternalAlert) => void> = new Set();
  
  async connect(config: AlertProviderConfig): Promise<void> {
    // Connect to Streamlabs socket API
    // Authenticate with socket token
  }
  
  async disconnect(): Promise<void>;
  isConnected(): boolean;
  onAlert(callback: (alert: ExternalAlert) => void): () => void;
  getProviderName(): string { return 'Streamlabs'; }
}
```

#### Application Service: AlertProviderService

```typescript
class AlertProviderService {
  private providers: Map<string, IAlertProvider> = new Map();
  private configs: AlertProviderConfig[] = [];
  
  constructor();
  
  // Provider management
  addProvider(provider: IAlertProvider): void;
  connectProvider(providerName: string, config: AlertProviderConfig): Promise<void>;
  disconnectProvider(providerName: string): Promise<void>;
  disconnectAll(): Promise<void>;
  
  // Config
  saveConfig(config: AlertProviderConfig): void;
  getConfigs(): AlertProviderConfig[];
  
  // Events - forwards to AlertService
  onAlert(callback: (alert: ExternalAlert) => void): () => void;
}
```

### 2. OBS Test Suite

#### Unit Test Structure

```typescript
// tests/services/OBSService.test.ts
describe('OBSService', () => {
  describe('connection', () => {
    it('should connect with valid credentials');
    it('should handle connection failure');
    it('should disconnect cleanly');
  });
  
  describe('scenes', () => {
    it('should get scene list');
    it('should switch scenes');
    it('should get current scene');
  });
  
  describe('automations', () => {
    it('should add automation');
    it('should execute trigger');
    it('should respect enabled state');
    it('should handle delay');
  });
});

// tests/hooks/useOBS.test.ts
describe('useOBS', () => {
  it('should expose connection state');
  it('should handle connect/disconnect');
  it('should update scenes on change');
});

// tests/hooks/useOBSTriggers.test.ts
describe('useOBSTriggers', () => {
  it('should trigger game_start');
  it('should trigger poll_end');
  it('should trigger brb_start/end');
  it('should handle disconnected state');
});
```

#### Mock OBS Controller

```typescript
class MockOBSController implements IOBSController {
  private scenes: OBSScene[] = [
    { name: 'Main', index: 0 },
    { name: 'Game', index: 1 },
    { name: 'BRB', index: 2 },
  ];
  private currentScene = 'Main';
  private connected = false;
  
  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }
  getConnectionStatus(): OBSConnectionStatus { 
    return this.connected ? 'connected' : 'disconnected'; 
  }
  async getScenes(): Promise<OBSScene[]> { return this.scenes; }
  async setScene(name: string): Promise<void> { this.currentScene = name; }
  // ... etc
}
```

### 3. E2E Test Suite

#### Playwright Tests

```typescript
// tests/e2e/obs-integration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('OBS Integration', () => {
  test('should show connection form when disconnected', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="obs-connect-form"]')).toBeVisible();
  });
  
  test('should connect to OBS', async ({ page }) => {
    // Mock WebSocket server
    await page.goto('/');
    await page.fill('[data-testid="obs-host"]', 'localhost');
    await page.fill('[data-testid="obs-port"]', '4455');
    await page.click('[data-testid="obs-connect-btn"]');
    await expect(page.locator('[data-testid="obs-connected"]')).toBeVisible();
  });
  
  test('should switch scenes', async ({ page }) => {
    // After connection
    await page.click('[data-testid="scene-Main"]');
    await expect(page.locator('[data-testid="current-scene"]')).toHaveText('Main');
  });
  
  test('should toggle BRB mode', async ({ page }) => {
    await page.click('[data-testid="brb-toggle"]');
    await expect(page.locator('[data-testid="brb-active"]')).toBeVisible();
  });
});
```

### 4. Bundle Optimization

#### Vite Configuration Enhancements

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react'],
          'vendor-motion': ['framer-motion'],
          'obs': ['obs-websocket-js'],
          'firebase': ['firebase/app', 'firebase/database'],
          'games-core': ['./src/application/games/index.ts'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
  },
  plugins: [
    // Add bundle analyzer in build mode
    visualizer({
      filename: 'dist/bundle-report.html',
      open: false,
      gzipSize: true,
    }),
  ],
});
```

#### Lazy Loading Strategy

```typescript
// Lazy load heavy components
const OBSControlPanel = lazy(() => import('./components/OBSControlPanel'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const AlertConfigPanel = lazy(() => import('./components/AlertConfigPanel'));
const CommandPanel = lazy(() => import('./components/CommandPanel'));

// Already lazy: all games in StreamGames.tsx
```

## Data Models

### Alert Provider Storage

```typescript
interface AlertProviderStorageSchema {
  version: 1;
  configs: AlertProviderConfig[];
}

// localStorage key: 'alert_providers_config'
// Note: tokens stored securely (consider encryption)
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.*

### Alert Provider Properties

**Property 1: Provider Authentication**
*For any* valid provider config (StreamElements with JWT or Streamlabs with socket token), calling connect SHALL establish a connection or return a clear error.
**Validates: Requirements 1.1, 1.3**

**Property 2: Alert Delivery**
*For any* connected provider and any incoming alert, the alert SHALL be forwarded to all registered listeners with correct data mapping.
**Validates: Requirements 1.2, 1.4**

**Property 3: Config Preservation on Switch**
*For any* sequence of provider connections and disconnections, saved configurations SHALL remain intact and retrievable.
**Validates: Requirements 1.5**

**Property 4: Provider Config Round-Trip**
*For any* valid AlertProviderConfig, saving and then loading SHALL return an equivalent config.
**Validates: Requirements 1.7**

**Property 5: Simultaneous Providers**
*For any* two different providers, connecting both SHALL result in both being active and receiving alerts independently.
**Validates: Requirements 1.8**

### OBS Test Properties (Unit Tests)

**Property 6: OBS Connection State Consistency**
*For any* sequence of connect/disconnect calls, the connection state SHALL accurately reflect the actual connection status.
**Validates: Requirements 2.7**

**Property 7: Automation Trigger Execution**
*For any* enabled automation with matching trigger, executeTrigger SHALL execute the automation actions.
**Validates: Requirements 2.5**

## Error Handling

### Alert Providers
- Invalid token: Return clear error message, do not connect
- Connection timeout: Retry with exponential backoff (max 3 attempts)
- Socket disconnect: Attempt automatic reconnection
- Invalid alert format: Log warning, skip alert

### OBS Tests
- Mock server unavailable: Skip E2E tests with clear message
- Timeout in tests: Fail with descriptive error

### Bundle Optimization
- Build failure: Report error with chunk details
- Size target not met: Warning in build output

## Testing Strategy

### Unit Tests (Vitest)
- AlertProviderService: connection, config management, alert forwarding
- OBSService: all methods with MockOBSController
- useOBS hook: state management, callbacks
- useOBSTriggers hook: trigger functions

### Property-Based Tests (fast-check)
- Provider config round-trip
- Alert data mapping consistency
- Config preservation across operations

### E2E Tests (Playwright)
- OBS connection flow
- Scene switching
- Automation creation
- BRB toggle

### Build Verification
- Bundle size comparison (before/after)
- Chunk analysis report
- Lazy loading verification

