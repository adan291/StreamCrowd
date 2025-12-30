# Implementation Plan: Twitch Tools Implementation

## Overview

Este plan implementa las herramientas de Twitch: Predicciones, Channel Points (Recompensas), y mejoras a Comandos (import/export). Se integran con la Twitch Helix API y el sistema de OBS triggers existente.

## Tasks

- [x] 1. Crear tipos de datos de Twitch
  - Crear archivo `types/twitch.ts` con interfaces para Prediction, Outcome, Reward, Redemption
  - Crear archivo `types/commandExport.ts` con formato de export
  - _Requirements: 1.1, 4.1, 6.5_

- [x] 2. Implementar TwitchPredictionService
  - [x] 2.1 Crear estructura base del servicio
    - Crear archivo `src/application/services/TwitchPredictionService.ts`
    - Implementar método `getPredictions`
    - Implementar método `createPrediction`
    - _Requirements: 1.2, 1.3_

  - [x] 2.2 Implementar métodos de gestión
    - Implementar `endPrediction` con status LOCKED, RESOLVED, CANCELED
    - Manejar winning_outcome_id para RESOLVED
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 2.3 Añadir manejo de errores
    - Implementar rate limiting con retry
    - Mapear errores API a mensajes user-friendly
    - _Requirements: 8.2, 8.4_

  - [x] 2.4 Write property test for prediction state machine
    - **Property 2: Prediction State Machine**
    - **Validates: Requirements 1.4, 2.3, 2.4, 2.5**

- [x] 3. Implementar hook usePredictions
  - [x] 3.1 Crear estructura base del hook
    - Crear archivo `src/application/hooks/usePredictions.ts`
    - Implementar estado para currentPrediction, history, loading, error
    - Implementar polling cada 5 segundos para predicción activa
    - _Requirements: 1.3, 2.2_

  - [x] 3.2 Implementar acciones
    - Implementar createPrediction, lockPrediction, resolvePrediction, cancelPrediction
    - Conectar con TwitchPredictionService
    - Emitir eventos OBS en cambios de estado
    - _Requirements: 1.2, 2.3, 2.4, 2.5, 7.1_

  - [x] 3.3 Implementar persistencia de historial
    - Guardar historial en localStorage
    - Cargar historial al inicializar
    - _Requirements: 3.3_

  - [x] 3.4 Write property test for API integration
    - **Property 3: Prediction API Integration**
    - **Validates: Requirements 1.2, 2.3, 2.4, 2.5**

- [x] 4. Crear componentes de Predicciones
  - [x] 4.1 Crear PredictionForm
    - Crear archivo `components/PredictionForm.tsx`
    - Implementar formulario con título, outcomes (2-10), duración
    - Añadir validación de campos
    - _Requirements: 1.1_

  - [x] 4.2 Write property test for form validation
    - **Property 1: Prediction Form Validation**
    - **Validates: Requirements 1.1**

  - [x] 4.3 Crear ActivePrediction
    - Crear archivo `components/ActivePrediction.tsx`
    - Mostrar outcomes con votos y puntos en tiempo real
    - Mostrar top predictors
    - Añadir botones Lock, Resolve, Cancel según estado
    - _Requirements: 1.3, 1.4, 2.1, 2.6_

  - [x] 4.4 Crear PredictionHistory
    - Crear archivo `components/PredictionHistory.tsx`
    - Listar predicciones pasadas con estadísticas
    - Permitir ver detalles de cada predicción
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 4.5 Crear PredictionPanel
    - Crear archivo `components/PredictionPanel.tsx`
    - Integrar PredictionForm, ActivePrediction, PredictionHistory
    - Mostrar mensaje si no es Partner/Affiliate
    - Verificar scope antes de operaciones
    - _Requirements: 1.5, 1.6, 8.1_

- [x] 5. Checkpoint - Verificar predicciones
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar flujo completo: crear → lock → resolve
  - Verificar manejo de errores

- [x] 6. Implementar TwitchRewardsService
  - [x] 6.1 Crear estructura base del servicio
    - Crear archivo `src/application/services/TwitchRewardsService.ts`
    - Implementar `getCustomRewards`
    - Implementar `createCustomReward`, `updateCustomReward`, `deleteCustomReward`
    - _Requirements: 4.1, 4.3_

  - [x] 6.2 Implementar gestión de redenciones
    - Implementar `getRedemptions` con filtros
    - Implementar `updateRedemptionStatus` para fulfill/reject
    - _Requirements: 5.1, 5.3_

  - [x] 6.3 Write property test for reward operations
    - **Property 4: Reward CRUD Operations**
    - **Validates: Requirements 4.3, 4.4, 4.5**

- [x] 7. Implementar hook useRewards
  - [x] 7.1 Crear estructura base del hook
    - Crear archivo `src/application/hooks/useRewards.ts`
    - Implementar estado para rewards, redemptions, loading, error
    - Implementar polling para redenciones pendientes
    - _Requirements: 4.1, 5.1, 5.5_

  - [x] 7.2 Implementar acciones de recompensas
    - Implementar createReward, updateReward, deleteReward, toggleReward
    - Conectar con TwitchRewardsService
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 7.3 Implementar acciones de redenciones
    - Implementar fulfillRedemption, rejectRedemption
    - Emitir eventos OBS en redenciones
    - _Requirements: 5.3, 7.2_

  - [x] 7.4 Write property test for redemption management
    - **Property 5: Redemption Management**
    - **Validates: Requirements 5.3**

- [x] 8. Crear componentes de Channel Points
  - [x] 8.1 Crear RewardForm
    - Crear archivo `components/RewardForm.tsx`
    - Implementar formulario con título, costo, descripción, cooldown, límites
    - Añadir validación de campos
    - _Requirements: 4.4_

  - [x] 8.2 Crear RedemptionsList
    - Crear archivo `components/RedemptionsList.tsx`
    - Listar redenciones pendientes
    - Añadir botones Fulfill y Reject
    - Permitir filtrar por recompensa
    - _Requirements: 5.1, 5.3, 5.4_

  - [x] 8.3 Crear RewardsPanel
    - Crear archivo `components/RewardsPanel.tsx`
    - Integrar lista de recompensas, RewardForm, RedemptionsList
    - Permitir enable/disable de recompensas
    - Verificar scope antes de operaciones
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

- [x] 9. Checkpoint - Verificar Channel Points
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar flujo: crear recompensa → redención → fulfill
  - Verificar manejo de errores

- [x] 10. Implementar Import/Export de Comandos
  - [x] 10.1 Crear hook useCommandsExport
    - Crear archivo `src/application/hooks/useCommandsExport.ts`
    - Implementar `exportCommands` que descarga JSON
    - Implementar `validateImport` para validar estructura
    - Implementar `importCommands` con modos merge/replace
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 10.2 Write property test for round-trip
    - **Property 6: Command Export Round-Trip**
    - **Validates: Requirements 6.1, 6.2, 6.5**

  - [x] 10.3 Write property test for import validation
    - **Property 7: Command Import Validation**
    - **Validates: Requirements 6.3, 6.6**

  - [x] 10.4 Actualizar CommandPanel
    - Añadir botones Export e Import al header
    - Implementar modal de import con opción merge/replace
    - Mostrar errores de validación
    - _Requirements: 6.1, 6.2, 6.4, 6.6_

- [x] 11. Implementar verificación de permisos
  - [x] 11.1 Crear utilidad de verificación de scopes
    - Crear función para verificar scopes en token
    - Implementar prompt de re-autenticación si faltan scopes
    - _Requirements: 1.5, 4.2, 8.1_

  - [x] 11.2 Write property test for permission validation
    - **Property 8: Permission Validation**
    - **Validates: Requirements 1.5, 4.2, 8.1**

- [x] 12. Implementar manejo de errores global
  - [x] 12.1 Crear utilidades de error handling
    - Crear mapeo de errores API a mensajes
    - Implementar rate limiting con retry
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [x] 12.2 Write property test for error handling
    - **Property 9: Error Handling**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5**

- [x] 13. Integrar con OBS Triggers
  - [x] 13.1 Añadir triggers para predicciones
    - Añadir trigger `prediction_start`, `prediction_lock`, `prediction_resolve`
    - Conectar con sistema de automatizaciones OBS
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 13.2 Añadir triggers para redenciones
    - Añadir trigger `reward_redeemed`
    - Incluir datos de la redención en el evento
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 13.3 Write property test for OBS events
    - **Property 10: OBS Event Emission**
    - **Validates: Requirements 7.1, 7.2**

- [x] 14. Integrar en PlatformsPanel
  - [x] 14.1 Actualizar TwitchToolSelector
    - Habilitar cards de Predicciones y Channel Points (quitar coming soon)
    - _Requirements: (actualización de sidebar-platforms-section)_

  - [x] 14.2 Actualizar PlatformsPanel
    - Añadir renderizado de PredictionPanel cuando tool === 'predictions'
    - Añadir renderizado de RewardsPanel cuando tool === 'channelpoints'
    - Pasar props necesarios (channelId, authToken, etc.)
    - _Requirements: (integración)_

- [x] 15. Actualizar traducciones i18n
  - [x] 15.1 Añadir traducciones
    - Añadir textos para predicciones (crear, lock, resolve, cancel, etc.)
    - Añadir textos para recompensas (crear, fulfill, reject, etc.)
    - Añadir textos para import/export
    - _Requirements: (i18n)_

- [x] 16. Final checkpoint - Verificar implementación completa
  - Ensure all tests pass, ask the user if questions arise.
  - Verificar flujo completo de predicciones
  - Verificar flujo completo de recompensas
  - Verificar import/export de comandos
  - Verificar integración con OBS
  - Verificar manejo de errores y permisos

## Notes

- All tasks including tests are required for complete implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Las predicciones solo funcionan para Partners/Affiliates (limitación de Twitch)
- Se requieren scopes adicionales: `channel:manage:predictions`, `channel:manage:redemptions`
- El sistema debe manejar gracefully cuando el usuario no tiene los permisos necesarios
