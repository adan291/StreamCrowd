# Requirements: Performance Optimization

## Overview

Optimizar el rendimiento de StreamCrowd mediante code splitting de overlays y optimización de sincronización en tiempo real para reducir el uso de CPU en OBS y mejorar la experiencia del usuario.

**Priority:** HIGH  
**Estimated Effort:** 4-5 días  
**Dependencies:** Foundation Setup, Redux Migration completados

---

## Requirements

### REQ-1: Code Splitting de Overlays (REQ-007)

**User Story:**  
Como streamer, quiero que los overlays carguen rápidamente (<2s) y usen poco CPU, para que mi stream no se vea afectado por la herramienta.

**Acceptance Criteria:**
- [ ] 1.1 Cada overlay se carga en un chunk separado (no en el bundle principal)
- [ ] 1.2 El bundle principal (index.js) se reduce en al menos 40%
- [ ] 1.3 Los overlays cargan en menos de 2 segundos
- [ ] 1.4 Lazy loading implementado con React.lazy() y Suspense
- [ ] 1.5 Loading fallback muestra indicador de carga apropiado
- [ ] 1.6 Error boundary captura errores de carga de chunks

**Validation:**
- Bundle analysis muestra chunks separados para overlays
- Lighthouse performance score >85
- Tiempo de carga medido <2s

---

### REQ-2: Configuración de Vite para Code Splitting

**User Story:**  
Como desarrollador, quiero que Vite genere chunks optimizados automáticamente, para mantener el bundle size bajo control.

**Acceptance Criteria:**
- [ ] 2.1 manualChunks configurado en vite.config.ts
- [ ] 2.2 Vendors separados: firebase, charts, icons, socket
- [ ] 2.3 Cada overlay en su propio chunk
- [ ] 2.4 Chunk común para código compartido entre overlays
- [ ] 2.5 Tree shaking funcionando correctamente
- [ ] 2.6 Source maps generados para debugging

**Validation:**
- `npm run build` genera chunks esperados
- No hay código duplicado entre chunks
- Bundle visualizer muestra estructura correcta

---

### REQ-3: Optimización de Sincronización Real-Time (REQ-008)

**User Story:**  
Como streamer con chat activo, quiero que la UI sea fluida sin lag, para poder interactuar con mi audiencia sin problemas.

**Acceptance Criteria:**
- [ ] 3.1 Mensajes de chat procesados con debouncing (100ms)
- [ ] 3.2 Actualizaciones de estado throttled (50ms mínimo entre updates)
- [ ] 3.3 Batch updates para múltiples cambios simultáneos
- [ ] 3.4 Request deduplication para llamadas API repetidas
- [ ] 3.5 CPU usage en OBS reducido en 50% durante chat activo
- [ ] 3.6 No hay lag visible en la UI durante picos de actividad

**Validation:**
- Performance profiling muestra reducción de re-renders
- CPU usage medido en OBS <20%
- UI responde en <100ms durante chat activo

---

### REQ-4: Hooks de Optimización

**User Story:**  
Como desarrollador, quiero hooks reutilizables para debouncing y throttling, para aplicar optimizaciones consistentemente.

**Acceptance Criteria:**
- [ ] 4.1 useDebounce hook creado con delay configurable
- [ ] 4.2 useThrottle hook creado con intervalo configurable
- [ ] 4.3 useDebouncedCallback hook para funciones
- [ ] 4.4 useThrottledCallback hook para funciones
- [ ] 4.5 Hooks son type-safe con TypeScript
- [ ] 4.6 Tests unitarios para cada hook

**Validation:**
- Hooks funcionan correctamente en componentes
- TypeScript no muestra errores
- Tests pasan

---

### REQ-5: WebSocket Manager Optimizado

**User Story:**  
Como desarrollador, quiero un WebSocket manager que maneje reconexiones y batch updates, para tener comunicación real-time eficiente.

**Acceptance Criteria:**
- [ ] 5.1 WebSocket manager con exponential backoff para reconexiones
- [ ] 5.2 Batch de mensajes entrantes (agrupa mensajes en ventana de 50ms)
- [ ] 5.3 Queue de mensajes salientes con deduplicación
- [ ] 5.4 Heartbeat para detectar conexiones muertas
- [ ] 5.5 Métricas de conexión (latencia, mensajes/segundo)
- [ ] 5.6 Graceful degradation cuando hay problemas de red

**Validation:**
- Reconexión automática funciona
- Batch de mensajes reduce procesamiento
- Métricas disponibles en DevTools

---

### REQ-6: Optimización de Renders

**User Story:**  
Como desarrollador, quiero minimizar re-renders innecesarios, para mejorar el rendimiento de la UI.

**Acceptance Criteria:**
- [ ] 6.1 React.memo aplicado a componentes costosos
- [ ] 6.2 useMemo para cálculos costosos
- [ ] 6.3 useCallback para funciones pasadas como props
- [ ] 6.4 Selectores Redux memoizados con createSelector
- [ ] 6.5 Virtualization para listas largas (chat, participantes)
- [ ] 6.6 React DevTools no muestra re-renders innecesarios

**Validation:**
- React DevTools Profiler muestra mejora
- Componentes no re-renderizan sin cambios
- Listas largas renderizan solo items visibles

---

### REQ-7: Bundle Analysis y Métricas

**User Story:**  
Como desarrollador, quiero visualizar el tamaño del bundle y métricas de performance, para identificar oportunidades de optimización.

**Acceptance Criteria:**
- [ ] 7.1 rollup-plugin-visualizer configurado
- [ ] 7.2 Script para generar reporte de bundle
- [ ] 7.3 Web Vitals medidos (LCP, FID, CLS)
- [ ] 7.4 Performance budget definido
- [ ] 7.5 CI check para bundle size
- [ ] 7.6 Dashboard de métricas de performance

**Validation:**
- Reporte de bundle generado con `npm run analyze`
- Web Vitals dentro de targets
- CI falla si bundle excede límite

---

### REQ-8: Overlay Router Optimizado

**User Story:**  
Como desarrollador, quiero un router de overlays que cargue solo el overlay necesario, para minimizar el código cargado.

**Acceptance Criteria:**
- [ ] 8.1 OverlayRouter usa React.lazy para cada overlay
- [ ] 8.2 Suspense con fallback apropiado
- [ ] 8.3 Preload de overlay cuando se detecta intención
- [ ] 8.4 Cache de chunks cargados
- [ ] 8.5 Error boundary específico para overlays
- [ ] 8.6 Métricas de tiempo de carga por overlay

**Validation:**
- Solo se carga el chunk del overlay activo
- Preload funciona correctamente
- Errores de carga manejados gracefully

---

## Success Criteria

- ✅ Bundle principal reducido en 40%+
- ✅ Overlays cargan en <2 segundos
- ✅ CPU usage en OBS <20% durante chat activo
- ✅ Lighthouse performance score >85
- ✅ No hay lag visible en UI durante picos
- ✅ Web Vitals dentro de targets (LCP <2.5s, FID <100ms, CLS <0.1)
- ✅ Todos los tests pasan
- ✅ Build exitoso sin warnings

---

## Out of Scope

- Cambios en la arquitectura de componentes
- Nuevas features
- Migración de librerías
- Server-side rendering

---

## Technical Notes

### Current Bundle Size (Baseline)
```
index.js: 1,573.73 kB (gzip: 400.18 kB)
```

### Target Bundle Size
```
index.js: <900 kB (gzip: <250 kB)
overlays: <50 kB each
vendors: separated by usage
```

### Overlay List (15 overlays)
1. PollOverlay
2. Countdown
3. SpinnerWheel
4. RandomWinnerOverlay
5. JudgePanel
6. PiumOverlay
7. RouletteOverlay
8. FishingOverlay
9. BattleshipOverlay
10. DuckHuntOverlay
11. VeoVeoOverlay
12. PPTOverlay
13. AhorcadoOverlay
14. CarreraOverlay
15. MemoriaOverlay
16. PotatoOverlay
17. TriviaOverlay
18. PartyCoOverlay

---

## Dependencies

- Vite (ya instalado)
- rollup-plugin-visualizer (ya instalado)
- React 19 (ya instalado)
- Redux Toolkit (ya instalado)

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Code splitting rompe funcionalidad | Alto | Tests exhaustivos, rollback plan |
| Chunks muy pequeños (overhead) | Medio | Configurar minChunkSize |
| Incompatibilidad con OBS browser | Alto | Testing en OBS antes de deploy |
| Memory leaks en WebSocket | Alto | Cleanup en useEffect, tests de memoria |
