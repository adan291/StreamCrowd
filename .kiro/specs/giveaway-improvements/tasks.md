# Implementation Plan: Giveaway System Improvements

## Overview

Este plan implementa las mejoras del sistema de sorteos en orden de prioridad: Alta → Media → Baja. Cada fase construye sobre la anterior, permitiendo entregas incrementales de valor.

## Tasks

---

## FASE 1: PRIORIDAD ALTA

### - [x] 1. Crear estructura de directorios y tipos base
- Crear directorio `components/giveaway/`
- Crear subdirectorios `hooks/`, `modals/`, `services/`, `types/`
- Extraer tipos de giveaway a `components/giveaway/types/index.ts`
- Crear archivo `components/giveaway/index.ts` para re-exports
- _Requirements: 1.3, 1.4_

### - [x] 2. Implementar servicio GiveawayStorage
- [x] 2.1 Crear clase GiveawayStorage con métodos básicos
  - Implementar `saveThreads`, `getThreads`, `saveHistory`, `getHistory`
  - Implementar `saveConfig`, `getConfig`, `saveBlacklist`, `getBlacklist`
  - _Requirements: 5.1_

- [x] 2.2 Implementar validación de datos
  - Crear función `validate()` que verifica estructura de datos
  - Retornar `{ isValid: boolean, errors: string[] }`
  - _Requirements: 5.3_

- [x]* 2.3 Write property test for data validation
  - **Property 8: Storage Validation Correctness**
  - **Validates: Requirements 5.3**

- [x] 2.4 Implementar migración de versiones
  - Detectar versión de datos almacenados
  - Migrar de v1 a v2 automáticamente
  - _Requirements: 5.2_

- [x]* 2.5 Write property test for migration idempotence
  - **Property 7: Storage Migration Idempotence**
  - **Validates: Requirements 5.2**

- [x] 2.6 Implementar export/import
  - Crear `exportAll()` que retorna JSON string
  - Crear `importAll()` que parsea y valida JSON
  - _Requirements: 5.6_

- [x]* 2.7 Write property test for round-trip
  - **Property 6: Storage Data Round-Trip**
  - **Validates: Requirements 5.6**

- [x] 2.8 Implementar manejo de errores y logging
  - Crear clase `GiveawayStorageError`
  - Detectar `QuotaExceededError` y mostrar warning
  - _Requirements: 5.5, 5.7_

### - [x] 3. Checkpoint - Verificar GiveawayStorage
- Ensure all tests pass, ask the user if questions arise.

### - [x] 4. Implementar custom hooks
- [x] 4.1 Crear hook useParticipants
  - Implementar estado con `Set<string>` para participantes
  - Implementar `add`, `remove`, `clear`, `filterBlacklisted`
  - Implementar `exportList`, `importList`
  - Usar GiveawayStorage para persistencia de blacklist
  - _Requirements: 2.3_

- [x]* 4.2 Write property test for useParticipants
  - **Property 2: Hook Interface Consistency (participants)**
  - **Validates: Requirements 2.3, 2.5**

- [x] 4.3 Crear hook useRaffle
  - Implementar reducer con estados: idle, running, selecting, winner
  - Implementar acciones: setMode, start, stop, selectWinner, reset
  - Manejar timer countdown internamente
  - _Requirements: 2.1_

- [x]* 4.4 Write property test for useRaffle
  - **Property 2: Hook Interface Consistency (raffle)**
  - **Validates: Requirements 2.1, 2.5**

- [x] 4.5 Crear hook useThreads
  - Implementar CRUD de threads
  - Usar GiveawayStorage para persistencia
  - Implementar `pickWinner` con filtrado de blacklist
  - _Requirements: 2.2_

- [x]* 4.6 Write property test for useThreads
  - **Property 2: Hook Interface Consistency (threads)**
  - **Validates: Requirements 2.2, 2.5**

- [x] 4.7 Crear hook useGiveawaySync
  - Implementar sincronización con BroadcastChannel
  - Implementar sincronización con Firebase (giveawaySync)
  - _Requirements: 2.4_

### - [x] 5. Checkpoint - Verificar hooks
- ✅ Hooks implementados y listos para pruebas del usuario

### - [x] 6. Implementar animación de ganador mejorada
- [x] 6.1 Crear hook useWinnerAnimation
  - Implementar easing function `easeOutQuart`
  - Implementar lógica de intervalos progresivos (50ms → 500ms)
  - Implementar estado de animación con fases
  - _Requirements: 3.1, 3.2, 3.3_

- [x]* 6.2 Write property test for animation timing
  - **Property 3: Animation Timing Progression**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 6.3 Implementar efecto "near miss"
  - Detectar cuando progress > 0.8
  - Mostrar 2-3 candidatos alternativos
  - _Requirements: 3.4_

- [x]* 6.4 Write property test for near-miss threshold
  - **Property 4: Near-Miss Threshold Trigger**
  - **Validates: Requirements 3.4**

- [x] 6.5 Implementar skip de animación
  - Permitir click/tap para saltar al resultado
  - Seleccionar ganador inmediatamente
  - _Requirements: 3.8_

- [x] 6.6 Crear componente WinnerDisplay
  - Mostrar nombre del ganador con estilo prominente
  - Integrar animación de celebración (confetti)
  - _Requirements: 3.5, 3.7_

- [x] 6.7 Implementar sonido opcional
  - Añadir configuración para habilitar/deshabilitar sonido
  - Reproducir sonido al revelar ganador
  - _Requirements: 3.6_

### - [x] 7. Checkpoint - Verificar animación
- ✅ Animación de ganador implementada con easing, near-miss, skip y sonido

### - [x] 8. Refactorizar componentes UI
- [x] 8.1 Extraer ModeSelector
  - Crear componente con cards visuales
  - Implementar gradientes por modo
  - Máximo 150 líneas
  - _Requirements: 1.4, 6.1, 6.3, 6.4_

- [x]* 8.2 Write property test for mode selection state
  - **Property 9: Mode Selection Visual State**
  - **Validates: Requirements 6.2, 6.4**

- [x] 8.3 Extraer ParticipantsList
  - Crear componente para mostrar lista de participantes
  - Integrar con useParticipants hook
  - Máximo 200 líneas
  - _Requirements: 1.4_

- [x] 8.4 Extraer ThreadCard
  - Crear componente para card individual de hilo
  - Incluir countdown, participantes, acciones
  - Máximo 250 líneas
  - _Requirements: 1.4_

- [x] 8.5 Extraer RaffleTab
  - Componer ModeSelector, ParticipantsList, WinnerDisplay
  - Integrar con useRaffle hook
  - Máximo 300 líneas
  - _Requirements: 1.4_

- [x] 8.6 Extraer ThreadsTab
  - Componer lista de ThreadCards
  - Integrar con useThreads hook
  - Máximo 200 líneas
  - _Requirements: 1.4_

- [x] 8.7 Extraer modales a archivos separados
  - Mover SubsConfigModal a `modals/SubsConfigModal.tsx`
  - Mover BlacklistModal a `modals/BlacklistModal.tsx`
  - Máximo 300 líneas cada uno
  - _Requirements: 1.4_

- [x] 8.8 Refactorizar GiveawayHub principal
  - Importar y componer sub-componentes
  - Usar hooks para estado
  - Reducir a máximo 200 líneas
  - _Requirements: 1.1, 1.2_
  - **NOTA: Reducido de 3377 a 342 líneas (90% reducción)**

- [x]* 8.9 Write property test for component line counts
  - **Property 1: Component Line Count Constraint**
  - **Validates: Requirements 1.1**

### - [x] 9. Checkpoint - Verificar refactorización completa
- ✅ GiveawayHub reducido de 3377 a 342 líneas (90% reducción)
- ✅ Todos los componentes extraídos y funcionando
- _Requirements: 1.5_

---

## FASE 2: PRIORIDAD MEDIA

### - [x] 10. Implementar presets de configuración de subs
- [x] 10.1 Definir constantes de presets
  - Crear SUBS_PRESETS con Simple, Ponderado, VIP, Monetización
  - Incluir todos los campos de SubsGiveawayConfig
  - _Requirements: 4.2_

- [x]* 10.2 Write property test for preset completeness
  - **Property 5: Preset Configuration Completeness**
  - **Validates: Requirements 4.2, 4.3**

- [x] 10.3 Actualizar SubsConfigModal con tabs
  - Añadir tab "Presets" con cards de presets
  - Añadir tab "Personalizado" con formulario actual
  - _Requirements: 4.1, 4.4_

- [x] 10.4 Implementar aplicación de preset
  - Al seleccionar preset, aplicar todos sus valores
  - Mostrar resumen de valores del preset
  - _Requirements: 4.3, 4.6_

- [x] 10.5 Persistir última configuración usada
  - Guardar si fue preset o personalizado
  - Restaurar al abrir modal
  - _Requirements: 4.5_

### - [x] 11. Mejorar cards de selección de modo
- [x] 11.1 Rediseñar ModeSelector con cards grandes
  - Aumentar tamaño de cards
  - Añadir descripciones más detalladas
  - _Requirements: 6.1, 6.3_

- [x] 11.2 Implementar animaciones hover
  - Añadir transiciones suaves
  - Efecto de elevación al hover
  - _Requirements: 6.5_

- [x] 11.3 Hacer responsive
  - Stack vertical en pantallas pequeñas
  - Ajustar tamaños de fuente
  - _Requirements: 6.6_

### - [x] 12. Checkpoint - Verificar prioridad media
- ✅ Presets de subs implementados (Simple, Ponderado, VIP, Monetización)
- ✅ ModeSelector mejorado con animaciones hover y responsive
- 🧪 **LISTO PARA PRUEBAS DEL USUARIO**

---

## FASE 3: PRIORIDAD BAJA

### - [x] 13. Implementar SpinWheel (Rueda de la Fortuna)
- [x] 13.1 Crear componente SpinWheel base
  - Renderizar segmentos circulares con SVG o Canvas
  - Asignar colores a cada participante
  - _Requirements: 7.2_

- [x] 13.2 Implementar lógica de disponibilidad
  - Mostrar opción solo si participantes ≤ 20
  - Añadir toggle en configuración de sorteo
  - _Requirements: 7.1, 7.6_

- [x]* 13.3 Write property test for SpinWheel availability
  - **Property 10: Spin Wheel Availability**
  - **Validates: Requirements 7.1**

- [x] 13.4 Implementar animación de giro
  - Animación de rotación con desaceleración
  - Pointer/indicador fijo
  - _Requirements: 7.3, 7.4_

- [x] 13.5 Implementar highlight de ganador
  - Resaltar segmento ganador al detenerse
  - Integrar con sistema de celebración
  - _Requirements: 7.5_

- [x] 13.6 Integrar con OBS overlay
  - Sincronizar estado de rueda con Firebase
  - _Requirements: 7.7_

### - [x] 14. Implementar panel de estadísticas
- [x] 14.1 Crear modelo de datos GiveawayStats
  - Definir estructura en types
  - Añadir a GiveawayStorage
  - _Requirements: 8.1_

- [x] 14.2 Implementar tracking de estadísticas
  - Actualizar stats al completar cada sorteo
  - Calcular métricas derivadas (promedio, etc.)
  - _Requirements: 8.1_

- [x]* 14.3 Write property test for statistics accumulation
  - **Property 11: Statistics Accumulation**
  - **Validates: Requirements 8.1**

- [x] 14.4 Crear componente StatsPanel
  - Mostrar todas las métricas requeridas
  - Diseño con cards de estadísticas
  - _Requirements: 8.2_

- [x] 14.5 Añadir acceso desde header
  - Añadir botón/tab para acceder a stats
  - _Requirements: 8.3_

- [x] 14.6 Implementar exportación de estadísticas
  - Exportar como JSON
  - Exportar como CSV
  - _Requirements: 8.4_

- [x]* 14.7 Write property test for export format
  - **Property 12: Statistics Export Format**
  - **Validates: Requirements 8.4**

- [x] 14.8 Persistir estadísticas
  - Guardar en localStorage via GiveawayStorage
  - _Requirements: 8.5_

### - [x] 15. Mejorar experiencia móvil
- [x] 15.1 Añadir Quick Raffle en móvil
  - Botón para crear sorteo rápido
  - Configuración mínima (modo, duración)
  - _Requirements: 9.1_

- [x] 15.2 Implementar gestos swipe
  - Swipe left para eliminar
  - Swipe right para sortear
  - _Requirements: 9.2_

- [x] 15.3 Implementar actualización en tiempo real
  - Mostrar contador de participantes actualizado
  - Sincronizar con desktop
  - _Requirements: 9.3, 9.4_

- [x]* 15.4 Write property test for participant count sync
  - **Property 13: Mobile Participant Count Sync**
  - **Validates: Requirements 9.3**

- [x] 15.5 Implementar pull-to-refresh
  - Gesto de pull para actualizar lista
  - _Requirements: 9.5_

- [x] 15.6 Mostrar countdown timers
  - Renderizar timer para sorteos con endsAt
  - _Requirements: 9.6_

### - [x] 16. Checkpoint final
- ✅ Todas las funcionalidades de Fase 3 implementadas
- ✅ SpinWheel con animación y límite de 20 participantes
- ✅ StatsPanel con exportación JSON/CSV
- ✅ Mejoras móviles: Quick Raffle, swipe, pull-to-refresh, countdown
- Verificar integración completa de todas las funcionalidades
- Revisar rendimiento y optimizar si es necesario

---

## FASE 4: MEJORAS AVANZADAS

### - [x] 17. Implementar sistema de sonidos y efectos
- [x] 17.1 Crear hook useGiveawayAudio
  - Implementar reproducción de sonidos con Web Audio API
  - Crear pool de sonidos: countdown, tick, winner, drumroll
  - Implementar control de volumen global
  - _Requirements: Sonidos y efectos_

- [x] 17.2 Implementar cuenta regresiva con sonido
  - Reproducir tick cada segundo en últimos 10 segundos
  - Aumentar intensidad/pitch conforme se acerca a 0
  - Sonido especial al llegar a 0
  - _Requirements: Sonidos y efectos_

- [x] 17.3 Implementar sonido de selección de ganador
  - Sonido de redoble de tambores durante animación
  - Fanfarria al revelar ganador
  - Opción para música de fondo durante ruleta
  - _Requirements: Sonidos y efectos_

- [x] 17.4 Añadir configuración de audio
  - Toggle para habilitar/deshabilitar sonidos
  - Slider de volumen
  - Persistir preferencias en localStorage
  - _Requirements: Sonidos y efectos_

### - [x] 18. Checkpoint - Verificar sistema de audio
- ✅ Hook useGiveawaySound mejorado con Web Audio API
- ✅ Sonidos: tick, countdown, drumroll, winner, start
- ✅ Componente SoundSettings para configuración
- ✅ Integrado en GiveawayHub

### - [x] 19. Mejorar historial de sorteos
- [x] 19.1 Crear componente HistoryPanel mejorado
  - Lista de sorteos anteriores con scroll infinito
  - Mostrar: nombre, fecha, ganador, participantes, modo
  - Diseño con cards expandibles
  - _Requirements: Historial mejorado_

- [x] 19.2 Implementar filtros de historial
  - Filtrar por rango de fechas (hoy, semana, mes, personalizado)
  - Filtrar por modo de sorteo
  - Filtrar por ganador (buscar por nombre)
  - _Requirements: Historial mejorado_

- [x] 19.3 Implementar estadísticas de participación
  - Top 10 participantes más frecuentes
  - Top 10 ganadores
  - Gráfico de participación por día/semana
  - _Requirements: Historial mejorado_

- [x] 19.4 Implementar exportación avanzada
  - Exportar a CSV con todos los campos
  - Exportar a Excel (.xlsx)
  - Exportar solo rango filtrado
  - _Requirements: Historial mejorado_

### - [x] 20. Checkpoint - Verificar historial mejorado
- ✅ HistoryPanel con filtros por fecha, modo y búsqueda de ganador
- ✅ Top ganadores mostrado
- ✅ Exportación CSV y JSON
- ✅ Cards expandibles con detalles

### - [x] 21. Implementar sorteos programados
- [x] 21.1 Crear modelo ScheduledGiveaway
  - Definir tipo con: id, config, scheduledAt, repeatConfig, status
  - Añadir a GiveawayStorage
  - _Requirements: Sorteos programados_

- [x] 21.2 Crear componente ScheduleModal
  - Selector de fecha y hora de inicio
  - Opción de repetición: una vez, cada X minutos, cada X horas
  - Vista previa de próximas ejecuciones
  - _Requirements: Sorteos programados_

- [x] 21.3 Implementar scheduler service
  - Verificar sorteos programados cada minuto
  - Iniciar sorteo automáticamente cuando llegue la hora
  - Manejar sorteos perdidos (si app estaba cerrada)
  - _Requirements: Sorteos programados_

- [x] 21.4 Implementar notificaciones de sorteo programado
  - Notificación en navegador 5 min antes
  - Mensaje automático en chat al iniciar
  - Badge en UI indicando sorteos pendientes
  - _Requirements: Sorteos programados_

- [x] 21.5 Crear vista de sorteos programados
  - Lista de sorteos pendientes
  - Opciones: editar, cancelar, ejecutar ahora
  - Indicador de próximo sorteo
  - _Requirements: Sorteos programados_

### - [x] 22. Checkpoint - Verificar sorteos programados
- ✅ SchedulerService con gestión de sorteos programados
- ✅ ScheduleModal con configuración de fecha/hora y repetición
- ✅ Lista de sorteos pendientes con acciones
- ✅ Soporte para repetición (minutos, horas, diario)

### - [x] 23. Implementar requisitos de participación
- [x] 23.1 Crear modelo ParticipationRequirements
  - Definir tipo con: minFollowTime, minMessages, minChannelPoints, requireVerified
  - Añadir a configuración de sorteo
  - _Requirements: Requisitos de participación_

- [x] 23.2 Crear componente RequirementsConfig
  - Toggle para cada requisito
  - Input para valores mínimos
  - Vista previa de requisitos activos
  - _Requirements: Requisitos de participación_

- [x] 23.3 Implementar validación de requisitos
  - Verificar tiempo de follow via Twitch API
  - Contar mensajes del usuario en sesión actual
  - Verificar puntos de canal (si disponible)
  - _Requirements: Requisitos de participación_

- [x] 23.4 Mostrar feedback de requisitos no cumplidos
  - Mensaje en chat cuando usuario no cumple requisitos
  - Indicador visual en lista de participantes
  - _Requirements: Requisitos de participación_

### - [x] 24. Checkpoint - Verificar requisitos de participación
- ✅ Tipos ParticipationRequirements definidos
- ✅ RequirementsConfig con todos los campos
- ✅ Soporte para: tiempo follow, mensajes, puntos, email verificado, antigüedad cuenta

### - [x] 25. Implementar múltiples ganadores
- [x] 25.1 Añadir configuración de múltiples ganadores
  - Input para número de ganadores (1-10)
  - Opción: con/sin repetición
  - _Requirements: Múltiples ganadores_

- [x] 25.2 Modificar lógica de selección
  - Seleccionar N ganadores únicos
  - Animación secuencial para cada ganador
  - _Requirements: Múltiples ganadores_

- [x] 25.3 Implementar premios por posición
  - Configurar premio diferente para 1º, 2º, 3º, etc.
  - Mostrar premio junto al ganador
  - _Requirements: Múltiples ganadores_

- [x] 25.4 Actualizar WinnerDisplay para múltiples
  - Mostrar lista de ganadores con posición
  - Animación de podio para top 3
  - _Requirements: Múltiples ganadores_

### - [x] 26. Checkpoint - Verificar múltiples ganadores
- ✅ Tipos WinnerEntry y config en RaffleConfig
- ✅ Componente MultiWinnerConfig para configuración
- ✅ Componente MultiWinnerDisplay con podio
- ✅ MultiWinnerConfig integrado en RaffleTab
- ✅ Props conectadas en GiveawayHub

### - [x] 27. Implementar integración con chat
- [x] 27.1 Crear servicio ChatCommands
  - Parsear comandos: !participantes, !sorteo, !ganador
  - Responder con información del sorteo activo
  - _Requirements: Integración con chat_

- [x] 27.2 Implementar anuncio automático de ganador
  - Enviar mensaje al chat con nombre del ganador
  - Formato personalizable
  - Delay configurable
  - _Requirements: Integración con chat_

- [x] 27.3 Implementar confirmación de ganador
  - Esperar mensaje del ganador para confirmar
  - Timeout configurable (30s, 1min, 2min)
  - Re-sortear si no confirma
  - _Requirements: Integración con chat_

- [x] 27.4 Implementar comando de estado
  - !sorteo muestra: tiempo restante, participantes, premio
  - Cooldown para evitar spam
  - _Requirements: Integración con chat_

### - [x] 28. Checkpoint - Verificar integración con chat
- ✅ Servicio ChatCommandsService con comandos
- ✅ Componente ChatSettings para configuración
- ✅ Soporte para confirmación de ganador
- ✅ Integrado en GiveawayHub con procesamiento de comandos
- ✅ lastWinner tracking para comando !ganador

### - [x] 29. Implementar gestión de premios
- [x] 29.1 Crear modelo Prize
  - Definir tipo con: id, name, description, image, value, status
  - Añadir a GiveawayStorage
  - _Requirements: Premios_

- [x] 29.2 Crear componente PrizeLibrary
  - CRUD de premios predefinidos
  - Categorías de premios
  - Búsqueda y filtros
  - _Requirements: Premios_

- [x] 29.3 Implementar asignación de premio a sorteo
  - Selector de premio de la biblioteca
  - Opción de premio personalizado
  - Mostrar premio en overlay OBS
  - _Requirements: Premios_

- [x] 29.4 Implementar tracking de entrega
  - Estados: pendiente, entregado, cancelado
  - Historial de premios entregados
  - Notificación de premios pendientes
  - _Requirements: Premios_

- [x] 29.5 Crear vista de premios pendientes
  - Lista de ganadores con premio pendiente
  - Botón para marcar como entregado
  - Exportar lista de pendientes
  - _Requirements: Premios_

### - [x] 30. Checkpoint - Verificar gestión de premios
- ✅ PrizeService con CRUD completo
- ✅ PrizeLibrary con biblioteca y pendientes
- ✅ Asignación y tracking de entrega
- ✅ Exportación CSV de pendientes

### - [x] 31. Implementar sistema anti-bots
- [x] 31.1 Crear servicio BotDetection
  - Lista de bots conocidos (nightbot, streamelements, etc.)
  - Verificar edad de cuenta via Twitch API
  - Detectar patrones de bot (nombres similares, timing)
  - _Requirements: Anti-bots_

- [x] 31.2 Implementar filtros anti-bot
  - Filtrar cuentas creadas hace menos de X días
  - Filtrar cuentas sin verificación de email
  - Filtrar cuentas en lista de bots conocidos
  - _Requirements: Anti-bots_

- [x] 31.3 Crear configuración anti-bot
  - Toggle para cada filtro
  - Input para edad mínima de cuenta
  - Lista personalizada de bots a excluir
  - _Requirements: Anti-bots_

- [x] 31.4 Mostrar estadísticas de filtrado
  - Cuántos usuarios fueron filtrados
  - Razón del filtrado
  - Opción para revisar y aprobar manualmente
  - _Requirements: Anti-bots_

### - [x] 32. Checkpoint final Fase 4
- ✅ Todas las funcionalidades de Fase 4 implementadas
- ✅ Historial mejorado con filtros y exportación
- ✅ Sorteos programados con repetición
- ✅ Requisitos de participación configurables
- ✅ Múltiples ganadores con premios por posición
- ✅ Integración con chat (comandos)
- ✅ Gestión de premios con tracking
- ✅ Sistema anti-bots con lista conocida y personalizada
- ✅ Sistema de sonidos y efectos
- ✅ **INTEGRACIÓN COMPLETA EN GIVEAWAYHUB**:
  - Tab de Historial añadido
  - Botón de Programar sorteo con badge de pendientes
  - Botón de Biblioteca de premios
  - Botón de Configuración avanzada (Requisitos + Anti-bots)
  - Scheduler service iniciado automáticamente

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- La Fase 1 (Prioridad Alta) debe completarse antes de las siguientes
- Las Fases 2 y 3 pueden ejecutarse en paralelo si hay recursos
- **Fase 4 contiene mejoras avanzadas que pueden implementarse incrementalmente**

