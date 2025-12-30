# Design Document: Dashboard de Métricas Avanzado

## Overview

Este documento describe el diseño técnico para implementar el dashboard de métricas avanzado de TwitchVote, proporcionando analytics en tiempo real, histórico de sesiones, exportación y insights automáticos.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
├─────────────────────────────────────────────────────────────┤
│  MetricsDashboard    SessionHistory    InsightsPanel         │
│  MetricsWidget       ExportDialog      ComparisonView        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Hook Layer                              │
├─────────────────────────────────────────────────────────────┤
│  useMetrics    useSessionHistory    useInsights              │
│  useMetricsExport    useDashboardLayout                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  MetricsService (orchestrator)                               │
│  ├── MetricsCollectorService (recopila datos)                │
│  ├── MetricsAggregatorService (agrega/comprime)              │
│  ├── SessionStorageService (persistencia)                    │
│  ├── InsightsGeneratorService (análisis)                     │
│  └── MetricsExportService (CSV/PDF)                          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
├─────────────────────────────────────────────────────────────┤
│  IndexedDB (sessions, metrics)    localStorage (layout)      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Metric Models

```typescript
interface MetricPoint {
  timestamp: number;
  value: number;
}

interface TimeSeries {
  name: string;
  points: MetricPoint[];
  resolution: 'raw' | '1min' | '5min';
}

type MetricType = 
  | 'viewers'
  | 'chat_messages'
  | 'poll_participation'
  | 'prediction_participation'
  | 'followers'
  | 'subscribers'
  | 'bits'
  | 'raids';

interface SessionMetrics {
  id: string;
  startTime: number;
  endTime?: number;
  platform: string;
  channelName: string;
  isFavorite: boolean;
  summary: SessionSummary;
  timeSeries: Record<MetricType, TimeSeries>;
  events: StreamEvent[];
}

interface SessionSummary {
  duration: number;
  peakViewers: number;
  avgViewers: number;
  totalMessages: number;
  uniqueChatters: number;
  pollsCreated: number;
  pollParticipation: number;
  predictionsCreated: number;
  predictionParticipation: number;
  newFollowers: number;
  newSubscribers: number;
}

interface StreamEvent {
  id: string;
  type: 'poll' | 'prediction' | 'raid' | 'host' | 'milestone';
  timestamp: number;
  data: Record<string, unknown>;
}
```

### Insight Models

```typescript
interface Insight {
  id: string;
  sessionId: string;
  type: InsightType;
  title: string;
  description: string;
  suggestedAction?: string;
  confidence: number; // 0-1
  data: Record<string, unknown>;
  feedback?: 'useful' | 'not_useful';
  createdAt: number;
}

type InsightType = 
  | 'peak_correlation'      // Pico de viewers correlacionado con evento
  | 'engagement_trend'      // Tendencia de engagement
  | 'optimal_time'          // Mejor momento para polls/predictions
  | 'chatter_retention'     // Retención de chatters
  | 'growth_pattern'        // Patrón de crecimiento
  | 'comparison_highlight'; // Diferencia notable vs sesiones anteriores
```

### Dashboard Layout Models

```typescript
interface DashboardWidget {
  id: string;
  type: WidgetType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, unknown>;
}

type WidgetType = 
  | 'viewers_chart'
  | 'chat_chart'
  | 'engagement_chart'
  | 'summary_card'
  | 'top_chatters'
  | 'events_timeline'
  | 'insights_list'
  | 'comparison_chart';

interface DashboardLayout {
  widgets: DashboardWidget[];
  compactMode: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}
```

### Services

```typescript
interface IMetricsService {
  // Real-time
  startSession(platform: string, channelName: string): SessionMetrics;
  endSession(): SessionMetrics;
  recordMetric(type: MetricType, value: number): void;
  recordEvent(event: Omit<StreamEvent, 'id'>): void;
  getCurrentMetrics(): SessionMetrics | null;
  
  // History
  getSessions(options?: { limit?: number; offset?: number }): Promise<SessionMetrics[]>;
  getSession(id: string): Promise<SessionMetrics | null>;
  deleteSession(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<void>;
  compareSessions(ids: string[]): Promise<SessionComparison>;
  
  // Storage
  getStorageUsage(): Promise<{ used: number; limit: number }>;
  cleanupOldSessions(): Promise<number>;
}

interface IMetricsCollectorService {
  start(sessionId: string): void;
  stop(): void;
  record(type: MetricType, value: number): void;
  getBuffer(): Map<MetricType, MetricPoint[]>;
  flush(): void;
}

interface IMetricsAggregatorService {
  aggregate(series: TimeSeries, targetResolution: '1min' | '5min'): TimeSeries;
  compress(data: SessionMetrics): Uint8Array;
  decompress(data: Uint8Array): SessionMetrics;
  calculateSummary(series: Record<MetricType, TimeSeries>, events: StreamEvent[]): SessionSummary;
}

interface IInsightsGeneratorService {
  generateInsights(session: SessionMetrics, historicalSessions: SessionMetrics[]): Insight[];
  detectPeakCorrelations(session: SessionMetrics): Insight[];
  detectTrends(sessions: SessionMetrics[]): Insight[];
  provideFeedback(insightId: string, feedback: 'useful' | 'not_useful'): void;
}

interface IMetricsExportService {
  exportCSV(sessions: SessionMetrics[], options?: ExportOptions): Blob;
  exportPDF(sessions: SessionMetrics[], options?: ExportOptions): Promise<Blob>;
}

interface ExportOptions {
  dateRange?: { start: number; end: number };
  metrics?: MetricType[];
  includeEvents?: boolean;
  includeInsights?: boolean;
}

interface SessionComparison {
  sessions: SessionMetrics[];
  differences: {
    metric: MetricType;
    values: number[];
    percentChanges: number[];
  }[];
  highlights: string[];
}
```

## Data Models

### Storage Schema

```typescript
const METRICS_STORES = {
  sessions: { 
    keyPath: 'id', 
    indexes: ['startTime', 'platform', 'isFavorite'] 
  },
  insights: { 
    keyPath: 'id', 
    indexes: ['sessionId', 'type', 'feedback'] 
  },
  dashboardLayouts: { 
    keyPath: 'id' 
  },
};

const STORAGE_KEYS = {
  CURRENT_SESSION: 'twitchvote_current_session',
  DASHBOARD_LAYOUT: 'twitchvote_dashboard_layout',
};

const STORAGE_LIMITS = {
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_SESSIONS: 100,
  RETENTION_DAYS: 30,
  FAVORITE_RETENTION_DAYS: 365,
};
```

### Aggregation Rules

```typescript
const AGGREGATION_RULES = {
  // Datos < 24h: resolución raw (cada 5s)
  RAW_THRESHOLD: 24 * 60 * 60 * 1000,
  
  // Datos 24h-7d: resolución 1 minuto
  ONE_MIN_THRESHOLD: 7 * 24 * 60 * 60 * 1000,
  
  // Datos > 7d: resolución 5 minutos
  FIVE_MIN_THRESHOLD: Infinity,
};
```

## Correctness Properties

### Property 1: Aggregation Preserves Totals
- **Property**: Para métricas de conteo (messages, followers), sum(aggregated) === sum(raw)
- **Validates**: Requirement 6.1, 6.2

### Property 2: Aggregation Preserves Extremes
- **Property**: Para métricas de valor (viewers), max(aggregated) === max(raw) y min(aggregated) === min(raw)
- **Validates**: Requirement 6.1, 6.2

### Property 3: Time Series Ordering
- **Property**: Los puntos en una TimeSeries siempre están ordenados por timestamp ascendente
- **Validates**: Requirement 1.4, 2.4

### Property 4: Session Summary Consistency
- **Property**: Los valores en SessionSummary son derivables de los TimeSeries correspondientes
- **Validates**: Requirement 1.6, 2.2

### Property 5: Export Data Consistency
- **Property**: Los datos exportados (CSV/PDF) son equivalentes a los mostrados en UI
- **Validates**: Requirement 3.6

### Property 6: Storage Limit Enforcement
- **Property**: El almacenamiento total nunca excede el límite configurado
- **Validates**: Requirement 6.4, 6.5

### Property 7: Comparison Calculation Accuracy
- **Property**: Las diferencias porcentuales se calculan correctamente: (new - old) / old * 100
- **Validates**: Requirement 2.5

### Property 8: Insight Generation Minimum
- **Property**: Cada sesión con datos suficientes genera al menos 3 insights
- **Validates**: Requirement 4.5

## Error Handling

### Data Collection Errors

| Error | Causa | Manejo |
|-------|-------|--------|
| `COLLECTION_BUFFER_FULL` | Buffer de métricas lleno | Flush automático a storage |
| `METRIC_VALUE_INVALID` | Valor negativo o NaN | Ignorar punto, log warning |
| `SESSION_NOT_STARTED` | Intento de grabar sin sesión | Iniciar sesión automáticamente |

### Storage Errors

| Error | Causa | Manejo |
|-------|-------|--------|
| `STORAGE_QUOTA_EXCEEDED` | IndexedDB lleno | Ejecutar cleanup, eliminar sesiones antiguas |
| `SESSION_NOT_FOUND` | ID de sesión inválido | Retornar null, log warning |
| `COMPRESSION_FAILED` | Error comprimiendo datos | Almacenar sin comprimir |

### Export Errors

| Error | Causa | Manejo |
|-------|-------|--------|
| `EXPORT_TOO_LARGE` | Demasiados datos para exportar | Limitar rango, mostrar warning |
| `PDF_GENERATION_FAILED` | Error generando PDF | Ofrecer alternativa CSV |
| `NO_DATA_TO_EXPORT` | Rango sin datos | Mostrar mensaje informativo |

### Insight Errors

| Error | Causa | Manejo |
|-------|-------|--------|
| `INSUFFICIENT_DATA` | Pocos datos para análisis | Generar insights básicos |
| `ANALYSIS_TIMEOUT` | Análisis toma demasiado tiempo | Retornar insights parciales |

## Testing Strategy

### Unit Tests
- MetricsAggregatorService: agregación correcta de diferentes resoluciones
- SessionSummary: cálculo correcto de todas las métricas
- InsightsGenerator: detección de patrones conocidos

### Property-Based Tests
1. **Aggregation Totals**: Verificar que sumas se preservan
2. **Aggregation Extremes**: Verificar que max/min se preservan
3. **Time Series Order**: Verificar ordenamiento de timestamps
4. **Summary Consistency**: Verificar derivabilidad de summary
5. **Export Consistency**: Verificar equivalencia de datos exportados
6. **Storage Limits**: Verificar enforcement de límites
7. **Comparison Accuracy**: Verificar cálculos de diferencias
8. **Insight Minimum**: Verificar generación mínima de insights

### Integration Tests
- Flujo completo de sesión: start → record → end → store
- Comparación de múltiples sesiones
- Exportación de datos a CSV y PDF
- Cleanup automático de storage

### E2E Tests
- Dashboard con datos en tiempo real
- Navegación por histórico de sesiones
- Exportación desde UI
- Configuración de layout de widgets
