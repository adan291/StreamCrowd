# Implementation Tasks: Dashboard de Métricas Avanzado

## Task 1: Crear tipos y modelos de métricas
- [x] 1.1 Crear `types/metrics.ts` con interfaces MetricPoint, TimeSeries, SessionMetrics
- [x] 1.2 Crear tipos para SessionSummary y StreamEvent
- [x] 1.3 Crear tipos para Insight e InsightType
- [x] 1.4 Crear tipos para DashboardWidget y DashboardLayout
- **Validates**: Requirement 1, 2, 4, 7

## Task 2: Implementar MetricsCollectorService
- [x] 2.1 Crear `src/application/services/MetricsCollectorService.ts`
- [x] 2.2 Implementar buffer en memoria para métricas en tiempo real
- [x] 2.3 Implementar `record(type, value)` con timestamp automático
- [x] 2.4 Implementar `flush()` para persistir buffer a storage
- [x] 2.5 Implementar auto-flush cada 30 segundos
- **Validates**: Requirement 1.4, 6.1

## Task 3: Implementar MetricsAggregatorService
- [x] 3.1 Crear `src/application/services/MetricsAggregatorService.ts`
- [x] 3.2 Implementar `aggregate(series, resolution)` para reducir resolución
- [x] 3.3 Implementar agregación que preserve sumas para conteos
- [x] 3.4 Implementar agregación que preserve max/min para valores
- [x] 3.5 Implementar `compress/decompress` usando CompressionStream API
- [x] 3.6 Implementar `calculateSummary` derivando de TimeSeries
- **Validates**: Requirement 6.1, 6.2, 6.3

## Task 4: Property tests para MetricsAggregatorService
- [x] 4.1 Escribir property test para preservación de totales (Property 1)
- [x] 4.2 Escribir property test para preservación de extremos (Property 2)
- [x] 4.3 Escribir property test para ordenamiento de timestamps (Property 3)
- [x] 4.4 Escribir property test para consistencia de summary (Property 4)
- **Validates**: Requirement 6.1, 6.2, 1.6, 2.2

## Task 5: Implementar SessionStorageService
- [x] 5.1 Crear `src/application/services/SessionStorageService.ts`
- [x] 5.2 Implementar CRUD para sesiones en IndexedDB
- [x] 5.3 Implementar agregación automática según antigüedad de datos
- [x] 5.4 Implementar `getStorageUsage()` para monitorear espacio
- [x] 5.5 Implementar `cleanup()` para eliminar sesiones antiguas no favoritas
- [x] 5.6 Implementar límite de 50MB con cleanup automático
- **Validates**: Requirement 6.4, 6.5, 6.6

## Task 6: Property tests para SessionStorageService
- [x] 6.1 Escribir property test para enforcement de límite de storage (Property 6)
- **Validates**: Requirement 6.4, 6.5

## Task 7: Implementar InsightsGeneratorService
- [x] 7.1 Crear `src/application/services/InsightsGeneratorService.ts`
- [x] 7.2 Implementar `detectPeakCorrelations` para correlacionar picos con eventos
- [x] 7.3 Implementar `detectTrends` para identificar tendencias
- [x] 7.4 Implementar `generateInsights` que combine todos los análisis
- [x] 7.5 Implementar `provideFeedback` para mejorar insights futuros
- [x] 7.6 Garantizar mínimo 3 insights por sesión con datos suficientes
- **Validates**: Requirement 4.1, 4.2, 4.3, 4.5, 4.6

## Task 8: Property tests para InsightsGeneratorService
- [x] 8.1 Escribir property test para generación mínima de insights (Property 8)
- **Validates**: Requirement 4.5

## Task 9: Implementar MetricsExportService
- [x] 9.1 Crear `src/application/services/MetricsExportService.ts`
- [x] 9.2 Implementar `exportCSV` con todas las métricas y eventos
- [x] 9.3 Implementar `exportPDF` con gráficos y resumen visual
- [x] 9.4 Implementar filtros por rango de fechas y tipos de métricas
- [x] 9.5 Incluir metadatos: fecha, duración, plataforma
- **Validates**: Requirement 3.1, 3.2, 3.3, 3.4, 3.5

## Task 10: Property tests para MetricsExportService
- [x] 10.1 Escribir property test para consistencia de datos exportados (Property 5)
- **Validates**: Requirement 3.6

## Task 11: Implementar MetricsService (orchestrator)
- [x] 11.1 Crear `src/application/services/MetricsService.ts`
- [x] 11.2 Implementar `startSession/endSession` para gestión de sesiones
- [x] 11.3 Implementar `recordMetric/recordEvent` delegando a collector
- [x] 11.4 Implementar `getSessions/getSession/deleteSession`
- [x] 11.5 Implementar `toggleFavorite` para retención extendida
- [x] 11.6 Implementar `compareSessions` con cálculo de diferencias
- **Validates**: Requirement 1, 2, 6

## Task 12: Property tests para comparación de sesiones
- [x] 12.1 Escribir property test para cálculo de diferencias porcentuales (Property 7)
- **Validates**: Requirement 2.5

## Task 13: Crear hooks de React
- [x] 13.1 Crear `hooks/useMetrics.ts` para métricas en tiempo real
- [x] 13.2 Crear `hooks/useSessionHistory.ts` para histórico de sesiones
- [x] 13.3 Crear `hooks/useInsights.ts` para insights de sesión
- [x] 13.4 Crear `hooks/useMetricsExport.ts` para exportación
- [x] 13.5 Crear `hooks/useDashboardLayout.ts` para configuración de layout
- **Validates**: Requirement 1, 2, 3, 4, 7

## Task 14: Crear componentes de gráficos
- [x] 14.1 Crear `components/metrics/ViewersChart.tsx` con gráfico de viewers
- [x] 14.2 Crear `components/metrics/ChatChart.tsx` con mensajes por minuto
- [x] 14.3 Crear `components/metrics/EngagementChart.tsx` con participación
- [x] 14.4 Implementar selector de ventana de tiempo (5min, 15min, 30min, 1h, all)
- [x] 14.5 Implementar zoom y pan en gráficos
- [x] 14.6 Mostrar valores actuales, máximos y promedios
- **Validates**: Requirement 1.1, 1.2, 1.3, 1.5, 1.6, 1.7

## Task 15: Crear MetricsDashboard principal
- [x] 15.1 Crear `components/metrics/MetricsDashboard.tsx`
- [x] 15.2 Implementar layout de widgets configurables (drag & drop)
- [x] 15.3 Implementar añadir, quitar y reordenar widgets
- [x] 15.4 Implementar modo compacto para pantallas pequeñas
- [x] 15.5 Implementar indicador de última actualización
- [x] 15.6 Implementar botón de pausar/reanudar actualizaciones
- [x] 15.7 Guardar configuración de layout en localStorage
- **Validates**: Requirement 7.1, 7.2, 7.3, 7.4, 7.5, 7.6

## Task 16: Crear SessionHistory y ComparisonView
- [x] 16.1 Crear `components/metrics/SessionHistory.tsx` con lista de sesiones
- [x] 16.2 Mostrar resumen de cada sesión (duración, viewers, engagement)
- [x] 16.3 Implementar selector de hasta 3 sesiones para comparar
- [x] 16.4 Crear `components/metrics/ComparisonView.tsx` con gráficos superpuestos
- [x] 16.5 Mostrar diferencias porcentuales entre sesiones
- [x] 16.6 Implementar toggle de favoritos para retención extendida
- **Validates**: Requirement 2.1, 2.2, 2.3, 2.4, 2.5, 2.7

## Task 17: Crear InsightsPanel
- [x] 17.1 Crear `components/metrics/InsightsPanel.tsx`
- [x] 17.2 Mostrar insights como tarjetas con título, descripción y acción
- [x] 17.3 Implementar botones de feedback (útil/no útil)
- [x] 17.4 Ordenar insights por confianza/relevancia
- **Validates**: Requirement 4.4, 4.6

## Task 18: Crear ExportDialog
- [x] 18.1 Crear `components/metrics/ExportDialog.tsx`
- [x] 18.2 Implementar selector de formato (CSV/PDF)
- [x] 18.3 Implementar selector de rango de fechas
- [x] 18.4 Implementar selector de métricas a incluir
- [x] 18.5 Mostrar preview de datos a exportar
- **Validates**: Requirement 3.1, 3.2, 3.4

## Task 19: Integrar métricas con eventos del sistema
- [x] 19.1 Integrar con eventos de Twitch para viewers, followers, subs
- [x] 19.2 Integrar con chat para mensajes por minuto
- [x] 19.3 Integrar con polls y predictions para participación
- [x] 19.4 Registrar eventos significativos (raids, milestones)
- **Validates**: Requirement 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 5.5

---

## Resumen

| Categoría | Tareas | Subtareas |
|-----------|--------|-----------|
| Tipos/Modelos | 1 | 4 |
| Servicios | 6 | 27 |
| Property Tests | 5 | 9 |
| Hooks | 1 | 5 |
| UI Components | 5 | 24 |
| Integración | 1 | 4 |
| **Total** | **19** | **73** |

**Estimación**: 2 semanas
**Property Tests**: 9 tests cubriendo las 8 propiedades de correctness
