# Design: Performance Optimization

## Overview

Este documento describe el diseño técnico para optimizar el rendimiento de StreamCrowd mediante code splitting y optimización de sincronización real-time.

---

## Architecture

### Current State

```
App.tsx
├── Loads ALL overlays eagerly (lazy but in main bundle)
├── No debouncing on chat messages
├── No throttling on state updates
├── Single large bundle (1.5MB+)
└── Re-renders on every chat message
```

### Target State

```
App.tsx
├── OverlayRouter (lazy loads only needed overlay)
├── Debounced chat processing (100ms)
├── Throttled state updates (50ms)
├── Split bundles (main <900KB, overlays <50KB each)
└── Memoized components, virtualized lists
```

---

## Code Splitting Strategy

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-socket': ['socket.io-client', 'tmi.js'],
          
          // Overlay chunks (each overlay in its own chunk)
          'overlay-poll': ['./components/PollOverlay'],
          'overlay-countdown': ['./components/Countdown'],
          'overlay-spinner': ['./components/SpinnerWheel'],
          // ... etc for each overlay
        },
      },
    },
    chunkSizeWarningLimit: 500, // Warn if chunk > 500KB
  },
});
```

### Lazy Loading Pattern

```typescript
// src/presentation/components/OverlayRouter.tsx
import React, { Suspense, lazy } from 'react';
import { OverlayLoadingFallback } from './OverlayLoadingFallback';
import { OverlayErrorBoundary } from './OverlayErrorBoundary';

// Lazy load each overlay
const overlays = {
  poll: lazy(() => import('./overlays/PollOverlay')),
  countdown: lazy(() => import('./overlays/Countdown')),
  spinner: lazy(() => import('./overlays/SpinnerWheel')),
  // ... etc
};

export const OverlayRouter: React.FC<{ type: string }> = ({ type }) => {
  const OverlayComponent = overlays[type];
  
  if (!OverlayComponent) {
    return <div>Unknown overlay type</div>;
  }
  
  return (
    <OverlayErrorBoundary overlayType={type}>
      <Suspense fallback={<OverlayLoadingFallback />}>
        <OverlayComponent />
      </Suspense>
    </OverlayErrorBoundary>
  );
};
```

---

## Real-Time Optimization Strategy

### Debounce Hook

```typescript
// src/application/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### Throttle Hook

```typescript
// src/application/hooks/useThrottle.ts
import { useState, useEffect, useRef } from 'react';

export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timeoutId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timeoutId);
    }
  }, [value, interval]);

  return throttledValue;
}
```

### Debounced Callback Hook

```typescript
// src/application/hooks/useDebouncedCallback.ts
import { useCallback, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}
```

---

## WebSocket Manager Design

```typescript
// src/infrastructure/realtime/WebSocketManager.ts
interface WebSocketManagerConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  batchInterval: number;
  heartbeatInterval: number;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageQueue: any[] = [];
  private reconnectAttempts = 0;
  private batchTimeout: NodeJS.Timeout | null = null;
  
  constructor(private config: WebSocketManagerConfig) {}
  
  connect(): void {
    this.ws = new WebSocket(this.config.url);
    this.setupEventHandlers();
    this.startHeartbeat();
  }
  
  private setupEventHandlers(): void {
    if (!this.ws) return;
    
    this.ws.onmessage = (event) => {
      this.messageQueue.push(JSON.parse(event.data));
      this.scheduleBatchProcess();
    };
    
    this.ws.onclose = () => {
      this.handleReconnect();
    };
  }
  
  private scheduleBatchProcess(): void {
    if (this.batchTimeout) return;
    
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
      this.batchTimeout = null;
    }, this.config.batchInterval);
  }
  
  private processBatch(): void {
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    // Deduplicate and process
    const uniqueMessages = this.deduplicateMessages(messages);
    this.onBatchReceived?.(uniqueMessages);
  }
  
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.onMaxReconnectAttempts?.();
      return;
    }
    
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    setTimeout(() => this.connect(), delay);
  }
  
  // Callbacks
  onBatchReceived?: (messages: any[]) => void;
  onMaxReconnectAttempts?: () => void;
}
```

---

## Render Optimization Patterns

### Memoized Component Pattern

```typescript
// Before
const ChatMessage: React.FC<Props> = ({ message, onReply }) => {
  return (
    <div onClick={() => onReply(message.id)}>
      {message.text}
    </div>
  );
};

// After
const ChatMessage: React.FC<Props> = React.memo(({ message, onReply }) => {
  const handleClick = useCallback(() => {
    onReply(message.id);
  }, [message.id, onReply]);
  
  return (
    <div onClick={handleClick}>
      {message.text}
    </div>
  );
});
```

### Virtualized List Pattern

```typescript
// src/presentation/components/VirtualizedChatList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualizedChatList: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated row height
    overscan: 5, // Render 5 extra items above/below viewport
  });
  
  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ChatMessage message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Bundle Analysis Setup

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ... other plugins
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "vite build",
    "build:analyze": "vite build && open dist/bundle-analysis.html",
    "analyze": "npx vite-bundle-visualizer"
  }
}
```

---

## Performance Budget

| Metric | Target | Current |
|--------|--------|---------|
| Main bundle (gzip) | <250 KB | 400 KB |
| Overlay chunk (gzip) | <20 KB | N/A |
| LCP | <2.5s | TBD |
| FID | <100ms | TBD |
| CLS | <0.1 | TBD |
| TTI | <3.5s | TBD |

---

## File Structure

```
src/
├── application/
│   └── hooks/
│       ├── useDebounce.ts
│       ├── useThrottle.ts
│       ├── useDebouncedCallback.ts
│       └── useThrottledCallback.ts
├── infrastructure/
│   └── realtime/
│       ├── WebSocketManager.ts
│       └── MessageBatcher.ts
└── presentation/
    └── components/
        ├── overlays/
        │   └── OverlayRouter.tsx
        └── shared/
            ├── VirtualizedList.tsx
            └── OverlayLoadingFallback.tsx
```

---

## Testing Strategy

### Performance Tests

```typescript
// tests/performance/bundleSize.test.ts
describe('Bundle Size', () => {
  it('main bundle should be under 250KB gzipped', async () => {
    const stats = await getBundleStats();
    expect(stats.mainBundle.gzipSize).toBeLessThan(250 * 1024);
  });
  
  it('overlay chunks should be under 20KB gzipped', async () => {
    const stats = await getBundleStats();
    for (const overlay of stats.overlayChunks) {
      expect(overlay.gzipSize).toBeLessThan(20 * 1024);
    }
  });
});
```

### Hook Tests

```typescript
// tests/hooks/useDebounce.test.ts
describe('useDebounce', () => {
  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'initial' } }
    );
    
    expect(result.current).toBe('initial');
    
    rerender({ value: 'updated' });
    expect(result.current).toBe('initial'); // Still old value
    
    await waitFor(() => {
      expect(result.current).toBe('updated');
    }, { timeout: 150 });
  });
});
```

---

## Rollback Plan

1. **If code splitting breaks:**
   - Revert vite.config.ts changes
   - Remove lazy imports
   - Deploy previous bundle

2. **If performance degrades:**
   - Disable debouncing/throttling
   - Revert to eager loading
   - Profile and identify issue

3. **If OBS compatibility issues:**
   - Test in OBS browser source
   - Adjust chunk loading strategy
   - Consider inline critical CSS

---

## Success Metrics

| Metric | How to Measure | Target |
|--------|----------------|--------|
| Bundle size | `npm run build` output | <900KB main |
| Load time | Lighthouse | <2s |
| CPU usage | OBS stats | <20% |
| Re-renders | React DevTools | -50% |
| Memory | Chrome DevTools | No leaks |
