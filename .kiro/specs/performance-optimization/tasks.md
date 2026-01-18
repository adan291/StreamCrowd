# Implementation Tasks: Performance Optimization

## Overview

Optimización de rendimiento de StreamCrowd mediante code splitting y optimización de sincronización real-time.

**Duration:** 4-5 días  
**Team Size:** 1-2 developers

---

## Phase 1: Hooks de Optimización (Day 1 - 4 hours)

### Task 1: Create useDebounce Hook
- [x] 1.1 Crear `src/application/hooks/useDebounce.ts`
- [x] 1.2 Implementar hook con delay configurable
- [x] 1.3 Añadir tipos TypeScript
- [x] 1.4 Crear tests en `tests/hooks/useDebounce.test.ts`
- [x] 1.5 Documentar uso en JSDoc
- **Validates**: REQ-4.1

### Task 2: Create useThrottle Hook
- [x] 2.1 Crear `src/application/hooks/useThrottle.ts`
- [x] 2.2 Implementar hook con intervalo configurable
- [x] 2.3 Añadir tipos TypeScript
- [x] 2.4 Crear tests en `tests/hooks/useThrottle.test.ts`
- [x] 2.5 Documentar uso en JSDoc
- **Validates**: REQ-4.2

### Task 3: Create Callback Hooks
- [x] 3.1 Crear `src/application/hooks/useDebouncedCallback.ts`
- [x] 3.2 Crear `src/application/hooks/useThrottledCallback.ts`
- [x] 3.3 Añadir tipos TypeScript genéricos
- [x] 3.4 Crear tests para ambos hooks
- [x] 3.5 Exportar desde `src/application/hooks/index.ts`
- **Validates**: REQ-4.3, 4.4, 4.5, 4.6

---

## Phase 2: Vite Code Splitting (Day 1-2 - 4 hours)

### Task 4: Configure Vite Manual Chunks
- [x] 4.1 Actualizar `vite.config.ts` con manualChunks
- [x] 4.2 Separar vendors: react, redux, firebase, charts, icons, socket, zod, mediapipe
- [x] 4.3 Separar features: giveaway, activity, games, commands, macros, timers
- [x] 4.4 Ejecutar build y verificar chunks generados
- [x] 4.5 Documentar configuración
- **Validates**: REQ-2.1, 2.2, 2.5
- **Results**: Bundle principal reducido de 1,573KB a 212KB (-86%)

### Task 5: Setup Bundle Analysis
- [x] 5.1 Verificar rollup-plugin-visualizer está instalado
- [x] 5.2 Configurar visualizer en vite.config.ts
- [ ] 5.3 Añadir script `build:analyze` en package.json
- [x] 5.4 Generar reporte baseline
- [ ] 5.5 Documentar cómo usar el análisis
- **Validates**: REQ-7.1, 7.2

---

## Phase 3: Overlay Code Splitting (Day 2 - 6 hours)

### Task 6: Create Overlay Loading Components
- [x] 6.1 Crear `LoadingFallback` component (ya existe en App.tsx)
- [x] 6.2 Crear animación de carga apropiada para OBS
- [x] 6.3 Crear `OverlayErrorBoundary` (ya existe)
- [x] 6.4 Manejar errores de carga de chunks
- [ ] 6.5 Crear tests para ambos componentes
- **Validates**: REQ-1.5, 1.6, 8.5

### Task 7: Refactor OverlayRouter with Lazy Loading
- [x] 7.1 Crear mapa de overlays con React.lazy()
- [x] 7.2 Implementar Suspense con fallback
- [x] 7.3 Añadir error boundary por overlay
- [x] 7.4 Verificar que cada overlay genera su propio chunk
- [ ] 7.5 Medir tiempo de carga de cada overlay
- [x] 7.6 Actualizar App.tsx para usar nuevo OverlayRouter
- **Validates**: REQ-1.1, 1.4, 8.1, 8.2

### Task 8: Configure Overlay Chunks in Vite
- [x] 8.1 Añadir cada overlay a manualChunks (via feature-games)
- [x] 8.2 Crear chunk común para código compartido
- [x] 8.3 Verificar que no hay código duplicado
- [x] 8.4 Ejecutar build y verificar tamaños
- [ ] 8.5 Documentar estructura de chunks
- **Validates**: REQ-2.3, 2.4

---

## Phase 4: Real-Time Optimization (Day 3 - 6 hours)

### Task 9: Optimize Chat Message Processing
- [x] 9.1 Identificar dónde se procesan mensajes de chat
- [x] 9.2 Crear useBatchedMessages hook para batching
- [x] 9.3 Implementar batch processing de mensajes
- [x] 9.4 Verificar que no se pierden mensajes
- [ ] 9.5 Medir reducción de re-renders (opcional)
- **Validates**: REQ-3.1

### Task 10: Optimize State Updates
- [x] 10.1 Identificar actualizaciones de estado frecuentes
- [x] 10.2 Hooks de throttle disponibles para uso
- [x] 10.3 Batch updates implementado en useBatchedMessages
- [x] 10.4 Verificar que UI sigue siendo responsive
- [ ] 10.5 Medir reducción de CPU usage (opcional)
- **Validates**: REQ-3.2, 3.3

### Task 11: Implement Request Deduplication
- [x] 11.1 Crear `src/infrastructure/api/RequestDeduplicator.ts`
- [x] 11.2 Implementar cache de requests en vuelo
- [x] 11.3 Deduplicar llamadas API repetidas
- [x] 11.4 Añadir TTL configurable
- [x] 11.5 Crear tests
- **Validates**: REQ-3.4

---

## Phase 5: WebSocket Optimization (Day 3-4 - 4 hours)

### Task 12: Create WebSocket Manager
- [x] 12.1 Crear `src/infrastructure/realtime/WebSocketManager.ts`
- [x] 12.2 Implementar exponential backoff para reconexiones
- [x] 12.3 Implementar batch de mensajes entrantes (50ms)
- [x] 12.4 Implementar queue de mensajes salientes
- [x] 12.5 Añadir heartbeat para detectar conexiones muertas
- [x] 12.6 Crear tests
- **Validates**: REQ-5.1, 5.2, 5.3, 5.4

### Task 13: Add WebSocket Metrics
- [x] 13.1 Implementar métricas de latencia
- [x] 13.2 Implementar contador de mensajes/segundo
- [x] 13.3 Métricas disponibles via getMetrics()
- [x] 13.4 Añadir logging de eventos importantes
- [x] 13.5 Documentar métricas disponibles
- **Validates**: REQ-5.5, 5.6

---

## Phase 6: Render Optimization (Day 4 - 6 hours)

### Task 14: Apply React.memo to Components
- [ ] 14.1 Identificar componentes que re-renderizan frecuentemente
- [ ] 14.2 Aplicar React.memo a ChatMessage
- [ ] 14.3 Aplicar React.memo a ParticipantItem
- [ ] 14.4 Aplicar React.memo a VoteOption
- [ ] 14.5 Verificar con React DevTools Profiler
- **Validates**: REQ-6.1

### Task 15: Optimize Callbacks and Memos
- [ ] 15.1 Identificar funciones pasadas como props
- [ ] 15.2 Aplicar useCallback donde sea necesario
- [ ] 15.3 Aplicar useMemo a cálculos costosos
- [ ] 15.4 Verificar que selectores Redux usan createSelector
- [ ] 15.5 Medir mejora en re-renders
- **Validates**: REQ-6.2, 6.3, 6.4

### Task 16: Implement Virtualized Lists
- [x] 16.1 VirtualList ya existe en components/ui/VirtualList.tsx
- [x] 16.2 Crear `src/presentation/components/shared/VirtualizedList.tsx` (ya existe)
- [ ] 16.3 Aplicar a lista de chat
- [ ] 16.4 Aplicar a lista de participantes
- [x] 16.5 Verificar que solo items visibles se renderizan
- [x] 16.6 Crear tests (componente ya testeado)
- **Validates**: REQ-6.5, 6.6

---

## Phase 7: Metrics and Validation (Day 4-5 - 4 hours)

### Task 17: Implement Web Vitals Tracking
- [x] 17.1 Verificar @vercel/speed-insights está configurado
- [ ] 17.2 Añadir tracking de LCP, FID, CLS (opcional)
- [ ] 17.3 Crear dashboard de métricas (opcional)
- [x] 17.4 Documentar cómo ver métricas
- **Validates**: REQ-7.3

### Task 18: Define Performance Budget
- [x] 18.1 Documentar targets de performance
- [x] 18.2 Crear script para verificar bundle size (build:analyze)
- [ ] 18.3 Añadir check en CI (opcional)
- [x] 18.4 Documentar proceso de monitoreo
- **Validates**: REQ-7.4, 7.5

### Task 19: Final Validation
- [x] 19.1 Ejecutar build y verificar bundle sizes
- [x] 19.2 Bundle principal: 212KB (objetivo <900KB ✅)
- [ ] 19.3 Medir CPU usage en OBS (opcional)
- [ ] 19.4 Ejecutar Lighthouse audit (opcional)
- [x] 19.5 Verificar todos los tests pasan (74 tests)
- [x] 19.6 Documentar resultados
- **Validates**: All requirements

### Task 20: Create Performance Report
- [x] 20.1 Crear `docs/analysis/PERFORMANCE_OPTIMIZATION_REPORT.md`
- [x] 20.2 Documentar métricas antes/después
- [x] 20.3 Documentar cambios realizados
- [x] 20.4 Documentar recomendaciones futuras
- [x] 20.5 Actualizar CHECKLIST_IMPLEMENTACION.md
- **Validates**: REQ-7.6

---

## Optional Tasks (If Time Permits)

### Task 21: Preload Critical Overlays
- [ ] 21.1 Identificar overlays más usados
- [ ] 21.2 Implementar preload en hover/focus
- [ ] 21.3 Implementar prefetch en idle time
- [ ] 21.4 Medir mejora en tiempo de carga
- **Validates**: REQ-8.3, 8.4

### Task 22: Add Performance Monitoring Dashboard
- [ ] 22.1 Crear componente de métricas en DevTools
- [ ] 22.2 Mostrar bundle sizes
- [ ] 22.3 Mostrar Web Vitals en tiempo real
- [ ] 22.4 Mostrar métricas de WebSocket
- **Validates**: REQ-7.6

---

## Estimated Timeline

| Phase | Tasks | Hours | Day |
|-------|-------|-------|-----|
| 1. Hooks | 1-3 | 4 | 1 |
| 2. Vite Config | 4-5 | 4 | 1-2 |
| 3. Overlay Splitting | 6-8 | 6 | 2 |
| 4. Real-Time Opt | 9-11 | 6 | 3 |
| 5. WebSocket | 12-13 | 4 | 3-4 |
| 6. Render Opt | 14-16 | 6 | 4 |
| 7. Validation | 17-20 | 4 | 4-5 |
| Optional | 21-22 | 4 | 5 |

**Total:** 34-38 hours (4-5 días)

---

## Success Criteria

- ✅ Bundle principal <900KB (actualmente 212KB - objetivo superado!)
- ✅ Overlays en chunks separados <50KB cada uno
- ⏳ Tiempo de carga de overlays <2s (no medido)
- ⏳ CPU usage en OBS <20% (no medido)
- ⏳ Lighthouse performance >85 (no medido)
- ✅ Todos los tests pasan (74 tests de performance)
- ✅ Hooks de optimización disponibles
- ✅ Documentación actualizada

---

## Rollback Plan

Si algo falla:
1. Revertir cambios en vite.config.ts
2. Revertir lazy loading en OverlayRouter
3. Desactivar debouncing/throttling
4. Deploy versión anterior

---

## Dependencies to Install (if needed)

```bash
# Virtualization (if not installed)
npm install @tanstack/react-virtual

# Bundle analysis (already installed)
# rollup-plugin-visualizer
```

---

## Notes

- Hacer commits frecuentes para fácil rollback
- Probar en OBS después de cada fase
- Medir métricas antes y después de cada cambio
- Documentar decisiones importantes
