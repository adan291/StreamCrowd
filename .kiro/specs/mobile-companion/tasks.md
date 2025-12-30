# Implementation Tasks: App Móvil Companion

## Task 1: Setup PWA
- [x] 1.1 Crear `mobile/index.html`
- [x] 1.2 Crear `mobile/manifest.json`
- [x] 1.3 Crear `mobile/service-worker.ts`
- [x] 1.4 Configurar Vite para build de PWA
- [x] 1.5 Configurar iconos y splash screens
- **Validates**: Requirement 1

## Task 2: Implementar MobileWebSocketService
- [x] 2.1 Crear `mobile/services/MobileWebSocketService.ts`
- [x] 2.2 Implementar conexión con token
- [x] 2.3 Implementar reconexión automática
- [x] 2.4 Implementar handlers de mensajes
- **Validates**: Requirement 1.1-1.4

## Task 3: Implementar PairingService
- [x] 3.1 Crear `mobile/services/PairingService.ts`
- [x] 3.2 Implementar escaneo de QR
- [x] 3.3 Implementar input de código manual
- [x] 3.4 Implementar validación de sesión
- **Validates**: Requirement 1.1-1.2


## Task 4: Implementar MobileServerService (Desktop)
- [x] 4.1 Crear `src/services/MobileServerService.ts`
- [x] 4.2 Implementar WebSocket server
- [x] 4.3 Implementar generación de tokens
- [x] 4.4 Implementar broadcast de estado
- **Validates**: Requirement 1.4

## Task 5: Crear PairingScreen
- [x] 5.1 Crear `mobile/screens/PairingScreen.tsx`
- [x] 5.2 Implementar QR scanner
- [x] 5.3 Implementar input de código
- [x] 5.4 Mostrar estado de conexión
- **Validates**: Requirement 1.1-1.2

## Task 6: Crear DashboardScreen
- [x] 6.1 Crear `mobile/screens/DashboardScreen.tsx`
- [x] 6.2 Mostrar métricas principales
- [x] 6.3 Mostrar actividades activas
- [x] 6.4 Quick actions
- **Validates**: Requirement 8

## Task 7: Crear PollsScreen
- [x] 7.1 Crear `mobile/screens/PollsScreen.tsx`
- [x] 7.2 Ver poll activo
- [x] 7.3 Crear poll rápido
- [x] 7.4 Cerrar poll
- **Validates**: Requirement 2

## Task 8: Crear PredictionsScreen
- [x] 8.1 Crear `mobile/screens/PredictionsScreen.tsx`
- [x] 8.2 Ver prediction activa
- [x] 8.3 Resolver prediction
- [x] 8.4 Cancelar prediction
- **Validates**: Requirement 3

## Task 9: Crear GiveawaysScreen
- [x] 9.1 Crear `mobile/screens/GiveawaysScreen.tsx`
- [x] 9.2 Ver giveaway activo
- [x] 9.3 Seleccionar ganador
- [x] 9.4 Re-roll
- **Validates**: Requirement 4

## Task 10: Crear TimersScreen
- [x] 10.1 Crear `mobile/screens/TimersScreen.tsx`
- [x] 10.2 Ver timers activos
- [x] 10.3 Controles play/pause/reset
- [x] 10.4 Crear timer rápido
- **Validates**: Requirement 5

## Task 11: Crear ChatScreen
- [x] 11.1 Crear `mobile/screens/ChatScreen.tsx`
- [x] 11.2 Ver mensajes de mods
- [x] 11.3 Enviar mensajes
- [x] 11.4 Menciones
- **Validates**: Requirement 7

## Task 12: Implementar Push Notifications
- [x] 12.1 Crear `mobile/services/NotificationService.ts`
- [x] 12.2 Solicitar permisos
- [x] 12.3 Configurar qué notificar
- [x] 12.4 Mostrar notificaciones
- **Validates**: Requirement 6

## Task 13: Crear MobilePairingPanel (Desktop)
- [x] 13.1 Crear `components/MobilePairingPanel.tsx`
- [x] 13.2 Generar QR code
- [x] 13.3 Mostrar código manual
- [x] 13.4 Lista de dispositivos conectados
- **Validates**: Requirement 1.3-1.5

## Task 14: Tests de integración
- [x] 14.1 Test: Pairing funciona
- [x] 14.2 Test: Acciones se sincronizan
- [x] 14.3 Test: Reconexión funciona
- **Validates**: All requirements

---

## Resumen

| Categoría | Tareas | Subtareas |
|-----------|--------|-----------|
| Setup | 1 | 5 |
| Services | 4 | 15 |
| Screens | 7 | 26 |
| Desktop Integration | 2 | 8 |
| Tests | 1 | 3 |
| **Total** | **14** | **57** |

**Estimación**: 4-5 semanas
