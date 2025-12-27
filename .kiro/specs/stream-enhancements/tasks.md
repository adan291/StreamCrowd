# Implementation Plan: Stream Enhancements

## Overview

Este plan implementa las mejoras del sistema de streaming en fases incrementales. Cada fase es independiente y puede ser completada por separado. El orden prioriza funcionalidad core antes de optimizaciones.

## Tasks

- [x] 1. Sistema de Alertas Personalizadas
  - [x] 1.1 Crear port IAlertPort en `src/domain/ports/`
    - Definir interfaces AlertConfig, AlertEvent
    - Definir métodos getConfigs, saveConfig, deleteConfig, getConfigByEvent
    - _Requirements: 1.6, 1.7_

  - [x] 1.2 Crear adapter LocalStorageAlertAdapter en `src/infrastructure/adapters/`
    - Implementar IAlertPort con localStorage
    - Manejar versionado del schema
    - _Requirements: 1.6, 1.7_

  - [x] 1.3 Crear AlertService en `src/application/services/`
    - Implementar queue de alertas con procesamiento FIFO
    - Implementar gestión de configuraciones
    - Implementar preview de alertas
    - Conectar con StreamEventService para recibir eventos
    - _Requirements: 1.1, 1.3_

  - [x] 1.4 Property test: Alert Queue FIFO (Property 1)
    - Generar secuencias aleatorias de eventos
    - Verificar orden de procesamiento
    - **Property 1: Alert Queue Ordering**
    - **Validates: Requirements 1.3**

  - [x] 1.5 Property test: Alert Config Round-Trip (Property 2)
    - Generar configs aleatorias
    - Verificar persistencia y recuperación
    - **Property 2: Alert Configuration Round-Trip**
    - **Validates: Requirements 1.6, 1.7**

  - [x] 1.6 Crear hook useAlerts en `src/application/hooks/`
    - Exponer estado de alertas activas
    - Exponer funciones de configuración
    - _Requirements: 1.2, 1.4_

  - [x] 1.7 Crear componente AlertOverlay en `components/`
    - Renderizar alertas con animaciones
    - Soportar templates: default, minimal, fancy
    - Reproducir sonidos
    - _Requirements: 1.1, 1.2_

  - [x] 1.8 Crear componente AlertConfigPanel en `components/`
    - UI para crear/editar alertas
    - Preview de alertas
    - Selector de sonidos
    - _Requirements: 1.2, 1.4_

- [x] 2. Checkpoint - Alertas
  - Verificar que alertas funcionan con eventos de stream
  - Ejecutar tests y verificar que pasan

- [x] 3. Sistema de Comandos Personalizados
  - [x] 3.1 Crear port ICommandPort en `src/domain/ports/`
    - Definir interfaces CustomCommand, CommandContext
    - Definir métodos CRUD para comandos
    - _Requirements: 2.6, 2.7_

  - [x] 3.2 Crear adapter LocalStorageCommandAdapter en `src/infrastructure/adapters/`
    - Implementar ICommandPort con localStorage
    - Manejar versionado del schema
    - _Requirements: 2.6, 2.7_

  - [x] 3.3 Crear CommandService en `src/application/services/`
    - Implementar parsing de mensajes con prefix
    - Implementar sistema de cooldowns
    - Implementar verificación de permisos
    - Implementar interpolación de variables
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.8_

  - [x] 3.4 Property test: Command Prefix Detection (Property 4)
    - Generar mensajes aleatorios
    - Verificar detección correcta de prefix
    - **Property 4: Command Prefix Detection**
    - **Validates: Requirements 2.1**

  - [x] 3.5 Property test: Cooldown Enforcement (Property 6)
    - Generar secuencias de comandos con timestamps
    - Verificar que cooldown se respeta
    - **Property 6: Cooldown Enforcement**
    - **Validates: Requirements 2.4**

  - [x] 3.6 Property test: Permission Enforcement (Property 7)
    - Generar comandos con diferentes niveles
    - Generar usuarios con diferentes permisos
    - Verificar acceso correcto
    - **Property 7: Permission Enforcement**
    - **Validates: Requirements 2.5**

  - [x] 3.7 Property test: Variable Interpolation (Property 8)
    - Generar responses con variables
    - Verificar reemplazo correcto
    - **Property 8: Variable Interpolation**
    - **Validates: Requirements 2.8**

  - [x] 3.8 Property test: Command Config Round-Trip (Property 9)
    - Generar comandos aleatorios
    - Verificar persistencia y recuperación
    - **Property 9: Command Configuration Round-Trip**
    - **Validates: Requirements 2.6, 2.7**

  - [x] 3.9 Crear hook useCommands en `src/application/hooks/`
    - Exponer lista de comandos
    - Exponer funciones CRUD
    - Integrar con chat para procesar mensajes
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.10 Crear componente CommandPanel en `components/`
    - UI para crear/editar comandos
    - Lista de comandos existentes
    - Estadísticas de uso
    - _Requirements: 2.3_

- [x] 4. Checkpoint - Comandos
  - Verificar que comandos funcionan en chat
  - Ejecutar tests y verificar que pasan

- [x] 5. Estadísticas Avanzadas
  - [x] 5.1 Crear port IAdvancedAnalyticsPort en `src/domain/ports/`
    - Definir interfaces StreamSession, TimelinePoint
    - Definir métodos para sesiones
    - _Requirements: 3.2, 3.3_

  - [x] 5.2 Crear adapter LocalStorageAnalyticsAdapter en `src/infrastructure/adapters/`
    - Implementar IAdvancedAnalyticsPort con localStorage
    - Implementar pruning de sesiones antiguas
    - _Requirements: 3.2, 3.3_

  - [x] 5.3 Crear AdvancedAnalyticsService en `src/application/services/`
    - Implementar gestión de sesiones
    - Implementar cálculos de métricas
    - Implementar exportación CSV
    - Integrar con StreamEventService existente
    - _Requirements: 3.1, 3.2, 3.6, 3.7_

  - [x] 5.4 Property test: Session Round-Trip (Property 10)
    - Generar sesiones aleatorias
    - Verificar persistencia y recuperación
    - **Property 10: Session Persistence Round-Trip**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 5.5 Property test: Metrics Consistency (Property 11)
    - Generar datos de sesión
    - Verificar invariantes (peak >= avg, chatters <= messages)
    - **Property 11: Metrics Consistency**
    - **Validates: Requirements 3.1**

  - [x] 5.6 Property test: CSV Export (Property 12)
    - Generar sesiones aleatorias
    - Verificar que CSV contiene todos los campos
    - **Property 12: CSV Export Completeness**
    - **Validates: Requirements 3.6**

  - [x] 5.7 Crear hook useAdvancedAnalytics en `src/application/hooks/`
    - Exponer sesión actual y métricas
    - Exponer historial de sesiones
    - Exponer función de exportación
    - _Requirements: 3.1, 3.3, 3.4, 3.6_

  - [x] 5.8 Crear componente AnalyticsDashboard en `components/`
    - Mostrar métricas en tiempo real
    - Mostrar gráficos de engagement
    - Historial de sesiones
    - Botón de exportación
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

- [x] 6. Checkpoint - Analytics
  - Verificar que métricas se calculan correctamente
  - Ejecutar tests y verificar que pasan

- [x] 7. Optimización del Bundle
  - [x] 7.1 Configurar lazy loading para juegos
    - Crear LazyGames map con imports dinámicos
    - Crear GameLoader component con Suspense
    - Actualizar StreamGames para usar lazy loading
    - _Requirements: 4.1, 4.4_

  - [x] 7.2 Configurar code splitting en vite.config.ts
    - Definir manualChunks para vendor, games, obs, analytics
    - Optimizar dependencias externas
    - _Requirements: 4.2_

  - [x] 7.3 Optimizar imports y tree-shaking
    - Revisar imports de lucide-react (usar imports específicos)
    - Revisar imports de framer-motion
    - Eliminar código muerto
    - _Requirements: 4.5_

  - [x] 7.4 Verificar reducción de bundle
    - Ejecutar build antes y después
    - Documentar tamaños de chunks
    - Verificar reducción >= 30%
    - _Requirements: 4.3_

- [x] 8. Checkpoint Final
  - Ejecutar `npm run build` y verificar éxito
  - Ejecutar `npm test` y verificar todos los tests pasan
  - Verificar que la aplicación funciona correctamente

## Notes

- Todos los property tests son requeridos para garantizar correctness
- Cada fase (Alertas, Comandos, Analytics, Bundle) puede implementarse independientemente
- Los checkpoints permiten validar cada fase antes de continuar
- La optimización del bundle debe hacerse al final para medir el impacto real

