# Implementation Plan: Enhanced Features

## Overview

Plan de implementación para las mejoras avanzadas de TwitchVote: historial unificado, onboarding interactivo, backup automático e integración multi-plataforma.

## Tasks

- [x] 1. Historial Unificado
  - [x] 1.1 Crear tipos e interfaces de historial
    - Crear `types/history.ts` con HistoryItem, HistoryFilter, HistoryStorage
    - Definir tipos específicos para cada categoría (poll, prediction, giveaway, command, timer)
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Implementar HistoryManager hook
    - Crear `hooks/useHistoryManager.ts`
    - Implementar addItem, getItems, deleteItem, clearHistory
    - Implementar filtrado por tipo y fecha
    - Implementar límite de 100 items por categoría con eliminación de antiguos
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 1.7_

  - [x] 1.3 Property test: History filtering
    - **Property 2: History Filtering Correctness**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 1.4 Property test: History limit enforcement
    - **Property 3: History Limit Enforcement**
    - **Validates: Requirements 1.6, 1.7**

  - [x] 1.5 Implementar exportación/importación JSON
    - Añadir exportToJSON e importFromJSON al hook
    - Validar estructura al importar
    - _Requirements: 1.8_

  - [x] 1.6 Property test: History export round-trip
    - **Property 4: History Export Round-Trip**
    - **Validates: Requirements 1.8**

  - [x] 1.7 Crear componente UnifiedHistory
    - Crear `components/UnifiedHistory.tsx`
    - Implementar vista con tabs por categoría
    - Implementar filtros de fecha y búsqueda
    - Mostrar estadísticas por item
    - Añadir botones de exportar/importar
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.8_

  - [x] 1.8 Integrar historial en componentes existentes
    - Conectar PollHistory con HistoryManager
    - Conectar PredictionHistory con HistoryManager
    - Conectar GiveawayHub con HistoryManager
    - Añadir registro de comandos ejecutados
    - Añadir registro de timers ejecutados
    - _Requirements: 1.2_

  - [x] 1.9 Añadir traducciones de historial
    - Añadir sección `unifiedHistory` en locales.ts (ES/EN)
    - _Requirements: 1.1_

- [x] 2. Checkpoint - Historial
  - Verificar que todos los tests pasan
  - Verificar que el historial persiste correctamente

- [x] 3. Onboarding Interactivo Mejorado
  - [x] 3.1 Crear tipos e interfaces de onboarding
    - Crear `types/onboarding.ts` con OnboardingStep, OnboardingProgress
    - Definir pasos del tutorial con targets y acciones
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Implementar OnboardingService hook
    - Crear `hooks/useOnboarding.ts`
    - Implementar detección de primera visita
    - Implementar progresión de pasos con validación
    - Implementar persistencia de progreso
    - Implementar skip y reset
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.3 Property test: Onboarding step progression
    - **Property 5: Onboarding Step Progression**
    - **Validates: Requirements 2.4, 2.5, 2.7**

  - [x] 3.4 Mejorar DemoTourOverlay para interacción
    - Modificar `components/DemoTourOverlay.tsx`
    - Permitir interacción con elementos destacados
    - Añadir validación de acciones completadas
    - Mostrar progreso visual mejorado
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 3.5 Implementar tips contextuales
    - Crear `components/ContextualTip.tsx`
    - Definir tips por contexto de uso
    - Mostrar tips basados en acciones del usuario
    - Permitir dismissal permanente
    - _Requirements: 2.8_

  - [x] 3.6 Añadir opción de reiniciar tutorial en settings
    - Añadir botón en configuración para reiniciar tutorial
    - _Requirements: 2.6_

  - [x] 3.7 Añadir traducciones de onboarding
    - Añadir/actualizar sección `onboarding` en locales.ts (ES/EN)
    - _Requirements: 2.1_

- [x] 4. Checkpoint - Onboarding
  - Verificar que todos los tests pasan
  - Probar flujo completo de onboarding

- [x] 5. Backup Automático a la Nube
  - [x] 5.1 Crear tipos e interfaces de backup
    - Crear `types/backup.ts` con BackupConfig, BackupData, CloudProvider
    - Definir estructura de datos a respaldar
    - _Requirements: 3.1, 3.4_

  - [x] 5.2 Implementar utilidades de encriptación
    - Crear `utils/encryption.ts`
    - Implementar encryptSensitiveData y decryptSensitiveData
    - Usar Web Crypto API para AES-GCM
    - _Requirements: 3.9_

  - [x] 5.3 Property test: Sensitive data encryption
    - **Property 9: Sensitive Data Encryption**
    - **Validates: Requirements 3.9**

  - [x] 5.4 Implementar BackupService hook
    - Crear `hooks/useBackupService.ts`
    - Implementar conexión con Google Drive API
    - Implementar conexión con servidor custom
    - Implementar backup manual y automático
    - Implementar restore
    - Implementar retry con exponential backoff
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.8_

  - [x] 5.5 Property test: Backup retry behavior
    - **Property 8: Backup Retry Behavior**
    - **Validates: Requirements 3.6**

  - [x] 5.6 Property test: Backup data completeness
    - **Property 7: Backup Data Completeness**
    - **Validates: Requirements 3.4**

  - [x] 5.7 Crear componente BackupConfigPanel
    - Crear `components/BackupConfigPanel.tsx`
    - Selector de proveedor (Google Drive / Custom)
    - Formulario de credenciales
    - Indicador de estado de sincronización
    - Botones de backup/restore manual
    - _Requirements: 3.1, 3.7, 3.8_

  - [x] 5.8 Implementar auto-backup en cambios
    - Detectar cambios en configuración
    - Programar backup con debounce de 5 minutos
    - _Requirements: 3.3_

  - [x] 5.9 Property test: Backup scheduling
    - **Property 6: Backup Scheduling on Changes**
    - **Validates: Requirements 3.3**

  - [x] 5.10 Añadir traducciones de backup
    - Añadir sección `backup` en locales.ts (ES/EN)
    - _Requirements: 3.1_

- [x] 6. Checkpoint - Backup
  - Verificar que todos los tests pasan
  - Probar flujo de backup/restore

- [x] 7. Integración Multi-Plataforma
  - [x] 7.1 Crear tipos e interfaces de plataforma
    - Actualizar `types/platform.ts` con Platform, PlatformConnection, ChatMessage, Badge
    - Definir interfaces comunes para todas las plataformas
    - _Requirements: 4.1, 5.1, 6.1_

  - [x] 7.2 Implementar YouTubeAdapter
    - Crear `src/infrastructure/adapters/YouTubeAdapter.ts`
    - Implementar autenticación OAuth 2.0
    - Implementar lectura de chat via YouTube Live API
    - Implementar envío de mensajes
    - Implementar manejo de rate limits con cola
    - _Requirements: 4.2, 4.3, 4.4, 4.7_

  - [x] 7.3 Property test: Rate limit queue handling
    - **Property 12: Rate Limit Queue Handling**
    - **Validates: Requirements 4.7**

  - [x] 7.4 Implementar KickAdapter
    - Crear `src/infrastructure/adapters/KickAdapter.ts`
    - Implementar autenticación
    - Implementar conexión WebSocket para chat
    - Implementar envío de mensajes
    - Implementar reconexión automática
    - _Requirements: 5.2, 5.3, 5.4, 5.7_

  - [x] 7.5 Property test: Reconnection behavior
    - **Property 13: Reconnection Behavior**
    - **Validates: Requirements 5.7**

  - [x] 7.6 Implementar PlatformAdapter unificado
    - Crear `hooks/usePlatformAdapter.ts`
    - Gestionar múltiples conexiones simultáneas
    - Agregar mensajes de todas las plataformas
    - Mantener estado independiente por plataforma
    - _Requirements: 6.1, 6.4, 6.5, 6.6_

  - [x] 7.7 Property test: Multi-platform state independence
    - **Property 15: Multi-Platform State Independence**
    - **Validates: Requirements 6.4, 6.5, 6.6**

  - [x] 7.8 Implementar procesamiento de votos multi-plataforma
    - Unificar formato de votos (+1, +2, +key)
    - Agregar votos de todas las plataformas activas
    - Mostrar origen de cada voto
    - _Requirements: 4.5, 5.5, 6.2, 6.3_

  - [x] 7.9 Property test: Vote processing across platforms
    - **Property 10: Vote Processing Across Platforms**
    - **Validates: Requirements 4.5, 5.5**

  - [x] 7.10 Property test: Multi-platform vote aggregation
    - **Property 14: Multi-Platform Vote Aggregation**
    - **Validates: Requirements 6.2**

  - [x] 7.11 Implementar display de badges por plataforma
    - Crear componente Badge con iconos por plataforma
    - Mapear badges de YouTube (member, moderator)
    - Mapear badges de Kick (subscriber, moderator, VIP)
    - _Requirements: 4.6, 5.6_

  - [x] 7.12 Property test: Platform badge display
    - **Property 11: Platform Badge Display**
    - **Validates: Requirements 4.6, 5.6**

  - [x] 7.13 Actualizar PlatformSelector
    - Modificar `components/PlatformSelector.tsx`
    - Añadir YouTube y Kick como opciones
    - Mostrar estado de conexión por plataforma
    - Permitir conexión múltiple
    - _Requirements: 6.1, 6.4_

  - [x] 7.14 Actualizar config/platforms.ts
    - Habilitar YouTube y Kick en PLATFORMS
    - Definir YOUTUBE_TOOLS y KICK_TOOLS
    - _Requirements: 4.1, 5.1_

  - [x] 7.15 Añadir traducciones multi-plataforma
    - Añadir sección `platforms` en locales.ts (ES/EN)
    - Traducciones para YouTube y Kick
    - _Requirements: 4.1, 5.1_

- [x] 8. Checkpoint Final
  - Verificar que todos los tests pasan
  - Probar flujo completo multi-plataforma
  - Verificar integración de todas las features

## Notes

- Todos los tests son obligatorios para garantizar correctitud
- Cada task referencia los requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Property tests validan propiedades universales de correctitud
- Unit tests validan ejemplos específicos y edge cases
