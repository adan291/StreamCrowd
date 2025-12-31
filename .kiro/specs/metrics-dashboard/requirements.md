# Requirements Document: Dashboard de Métricas Avanzado

## Introduction

Este documento define los requisitos para implementar un dashboard de métricas avanzado que proporcione analytics detallados del stream, incluyendo gráficos en tiempo real, histórico de sesiones, exportación de reportes e insights automáticos.

## Glossary

- **Metrics_Service**: Servicio que recopila y procesa métricas del stream
- **Session**: Período de tiempo durante el cual el streamer está en vivo
- **Metric_Point**: Punto de datos con timestamp y valor
- **Insight**: Sugerencia o análisis generado automáticamente basado en datos
- **Time_Series**: Serie temporal de puntos de datos

## Requirements

### Requirement 1: Gráficos en Tiempo Real

**User Story:** Como streamer, quiero ver gráficos de participación en tiempo real, para entender cómo evoluciona mi audiencia durante el stream.

#### Acceptance Criteria

1. THE Metrics_Dashboard SHALL mostrar gráfico de viewers en tiempo real
2. THE Metrics_Dashboard SHALL mostrar gráfico de mensajes de chat por minuto
3. THE Metrics_Dashboard SHALL mostrar gráfico de participación en polls/predictions
4. THE Metrics_Dashboard SHALL actualizar gráficos cada 5 segundos
5. THE Metrics_Dashboard SHALL permitir seleccionar ventana de tiempo: 5min, 15min, 30min, 1h, toda la sesión
6. THE Metrics_Dashboard SHALL mostrar valores actuales, máximos y promedios
7. THE Metrics_Dashboard SHALL soportar zoom y pan en los gráficos

---

### Requirement 2: Histórico de Sesiones

**User Story:** Como streamer, quiero comparar métricas entre diferentes streams, para identificar qué funciona mejor.

#### Acceptance Criteria

1. THE Metrics_Service SHALL almacenar métricas de cada sesión de stream
2. THE Metrics_Dashboard SHALL mostrar lista de sesiones anteriores con resumen
3. THE Metrics_Dashboard SHALL permitir seleccionar hasta 3 sesiones para comparar
4. THE Metrics_Dashboard SHALL mostrar gráficos superpuestos de sesiones comparadas
5. THE Metrics_Dashboard SHALL calcular diferencias porcentuales entre sesiones
6. THE Metrics_Service SHALL retener datos de los últimos 30 días
7. THE Metrics_Service SHALL permitir marcar sesiones como "favoritas" para retención extendida

---

### Requirement 3: Exportación de Reportes

**User Story:** Como streamer, quiero exportar mis métricas, para analizarlas externamente o compartirlas.

#### Acceptance Criteria

1. THE Metrics_Dashboard SHALL permitir exportar datos en formato CSV
2. THE Metrics_Dashboard SHALL permitir exportar reporte visual en formato PDF
3. THE Metrics_Dashboard SHALL incluir en el reporte: resumen, gráficos, top eventos
4. THE Metrics_Dashboard SHALL permitir seleccionar rango de fechas para exportar
5. THE Metrics_Dashboard SHALL incluir metadatos: fecha, duración, plataforma
6. FOR ALL exports, los datos SHALL ser consistentes con lo mostrado en UI

---

### Requirement 4: Insights Automáticos

**User Story:** Como streamer, quiero recibir sugerencias basadas en mis datos, para mejorar mi contenido.

#### Acceptance Criteria

1. THE Metrics_Service SHALL analizar patrones en los datos de sesiones
2. THE Metrics_Service SHALL identificar picos de audiencia y correlacionarlos con eventos
3. THE Metrics_Service SHALL detectar tendencias: crecimiento, declive, estabilidad
4. THE Metrics_Dashboard SHALL mostrar insights como tarjetas con explicación y acción sugerida
5. THE Metrics_Service SHALL generar al menos 3 insights por sesión
6. THE Metrics_Dashboard SHALL permitir marcar insights como "útil" o "no útil" para mejorar

---

### Requirement 5: Métricas de Engagement

**User Story:** Como streamer, quiero métricas detalladas de engagement, para entender la interacción de mi audiencia.

#### Acceptance Criteria

1. THE Metrics_Service SHALL calcular tasa de participación en polls
2. THE Metrics_Service SHALL calcular tasa de participación en predictions
3. THE Metrics_Service SHALL calcular ratio de chatters activos vs viewers
4. THE Metrics_Service SHALL identificar top chatters por sesión
5. THE Metrics_Service SHALL calcular tiempo promedio de retención de viewers
6. THE Metrics_Dashboard SHALL mostrar estas métricas con comparación vs promedio histórico

---

### Requirement 6: Almacenamiento Eficiente

**User Story:** Como usuario, quiero que las métricas no consuman demasiado espacio, para mantener la app ligera.

#### Acceptance Criteria

1. THE Metrics_Service SHALL agregar datos antiguos (>24h) a resolución de 1 minuto
2. THE Metrics_Service SHALL agregar datos muy antiguos (>7 días) a resolución de 5 minutos
3. THE Metrics_Service SHALL comprimir datos antes de almacenar
4. THE Metrics_Service SHALL limitar almacenamiento total a 50MB
5. WHEN se alcanza el límite, THE Metrics_Service SHALL eliminar sesiones más antiguas no favoritas
6. THE Metrics_Service SHALL mostrar uso de almacenamiento en configuración

---

### Requirement 7: UI del Dashboard

**User Story:** Como streamer, quiero un dashboard claro y personalizable, para ver las métricas que me importan.

#### Acceptance Criteria

1. THE Metrics_Dashboard SHALL mostrar layout de widgets configurables
2. THE Metrics_Dashboard SHALL permitir añadir, quitar y reordenar widgets
3. THE Metrics_Dashboard SHALL guardar configuración de layout por usuario
4. THE Metrics_Dashboard SHALL soportar modo compacto para pantallas pequeñas
5. THE Metrics_Dashboard SHALL mostrar indicador de última actualización
6. THE Metrics_Dashboard SHALL permitir pausar actualizaciones en tiempo real
