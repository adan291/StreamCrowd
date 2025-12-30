# Implementation Tasks: Modo Colaborativo Multi-Moderador

## Task 1: Crear tipos y modelos
- [x] 1.1 Crear `types/collaboration.ts` con interfaces Collaborator, CollaborationSession
- [x] 1.2 Crear tipos para roles y permisos (CollaboratorRole, Permission)
- [x] 1.3 Crear tipos para acciones sincronizadas (SyncAction)
- [x] 1.4 Crear tipos para mensajes de chat (ChatMessage)
- [x] 1.5 Crear tipos para log de acciones (ActionLogEntry)
- [x] 1.6 Crear tipos para mensajes WebSocket (WSMessage)
- **Validates**: Requirement 1, 2, 3, 4

## Task 2: Implementar SessionService
- [x] 2.1 Crear `src/collaboration/services/SessionService.ts`
- [x] 2.2 Implementar `generateSessionCode()` - código único de 6 caracteres
- [x] 2.3 Implementar `createSession(ownerId)` - crear nueva sesión
- [x] 2.4 Implementar `joinSession(code, user)` - unirse a sesión
- [x] 2.5 Implementar `leaveSession(sessionId, userId)`
- [x] 2.6 Implementar `getSession(code)` y `validateSession(code)`
- [x] 2.7 Implementar `closeSession(sessionId)`
- **Validates**: Requirement 5.1-5.5

## Task 3: Property tests para SessionService
- [x] 3.1 Test: Códigos de sesión son únicos
- [x] 3.2 Test: Solo owner puede cerrar sesión
- [x] 3.3 Test: Sesiones expiran correctamente
- **Validates**: Property 5

## Task 4: Implementar RoleService
- [x] 4.1 Crear `src/collaboration/services/RoleService.ts`
- [x] 4.2 Implementar `ROLE_PERMISSIONS` - permisos por rol
- [x] 4.3 Implementar `assignRole(userId, role)`
- [x] 4.4 Implementar `checkPermission(userId, permission)`
- [x] 4.5 Implementar `getPermissions(role)`
- [x] 4.6 Implementar `setCustomPermissions(userId, permissions)`
- [x] 4.7 Implementar `transferOwnership(fromId, toId)`
- **Validates**: Requirement 2.1-2.6

## Task 5: Property tests para RoleService
- [x] 5.1 Test: Owner tiene todos los permisos
- [x] 5.2 Test: Viewer no puede modificar nada
- [x] 5.3 Test: Permisos se validan correctamente
- **Validates**: Property 3

## Task 6: Implementar SyncService
- [x] 6.1 Crear `src/collaboration/services/SyncService.ts`
- [x] 6.2 Implementar `createAction(type, payload)` - crear acción sincronizada
- [x] 6.3 Implementar `applyAction(action)` - aplicar acción remota
- [x] 6.4 Implementar `resolveConflict(local, remote)` - resolver conflictos
- [x] 6.5 Implementar `getStateVersion()` y `incrementVersion()`
- [x] 6.6 Implementar `getStateDiff(fromVersion)` - diferencias desde versión
- **Validates**: Requirement 1.1-1.4

## Task 7: Property tests para SyncService
- [x] 7.1 Test: Acciones se aplican en orden
- [x] 7.2 Test: Conflictos se resuelven consistentemente
- [x] 7.3 Test: Versiones incrementan correctamente
- **Validates**: Property 1, 2

## Task 8: Implementar ChatService
- [x] 8.1 Crear `src/collaboration/services/ChatService.ts`
- [x] 8.2 Implementar `sendMessage(content, mentions)`
- [x] 8.3 Implementar `getMessages(limit)` - historial
- [x] 8.4 Implementar `parseMentions(content)` - extraer @menciones
- [x] 8.5 Implementar `clearHistory()`
- **Validates**: Requirement 3.1-3.4

## Task 9: Property tests para ChatService
- [x] 9.1 Test: Mensajes se almacenan correctamente
- [x] 9.2 Test: Menciones se parsean correctamente
- **Validates**: Property 4

## Task 10: Implementar ActionLogService
- [x] 10.1 Crear `src/collaboration/services/ActionLogService.ts`
- [x] 10.2 Implementar `logAction(action, userId, details)`
- [x] 10.3 Implementar `getActions(filters)` - con filtros
- [x] 10.4 Implementar `exportToCSV()` - exportar historial
- [x] 10.5 Implementar `clearLog()`
- **Validates**: Requirement 4.1-4.5

## Task 11: Property tests para ActionLogService
- [x] 11.1 Test: Acciones se registran con timestamp
- [x] 11.2 Test: Filtros funcionan correctamente
- [x] 11.3 Test: Export genera CSV válido
- **Validates**: Property 4

## Task 12: Implementar CollaborationWebSocketService
- [x] 12.1 Crear `src/collaboration/services/CollaborationWebSocketService.ts`
- [x] 12.2 Implementar `connect(sessionCode, token)`
- [x] 12.3 Implementar `disconnect()`
- [x] 12.4 Implementar `send(message)` - enviar mensaje WS
- [x] 12.5 Implementar `onMessage(handler)` - recibir mensajes
- [x] 12.6 Implementar reconexión automática
- [x] 12.7 Implementar heartbeat/ping-pong
- **Validates**: Requirement 1.5

## Task 13: Property tests para CollaborationWebSocketService
- [x] 13.1 Test: Reconexión funciona correctamente
- [x] 13.2 Test: Mensajes se envían/reciben correctamente
- **Validates**: Property 6

## Task 14: Implementar CollaborationService (orquestador)
- [x] 14.1 Crear `src/collaboration/services/CollaborationService.ts`
- [x] 14.2 Implementar `startSession()` - crear y conectar
- [x] 14.3 Implementar `joinSession(code)` - unirse y sincronizar
- [x] 14.4 Implementar `broadcastAction(action)` - enviar acción a todos
- [x] 14.5 Implementar `handleRemoteAction(action)` - procesar acción remota
- [x] 14.6 Implementar `syncState()` - sincronizar estado completo
- [x] 14.7 Implementar `endSession()` - cerrar sesión
- **Validates**: Requirement 1, 5

## Task 15: Property tests para CollaborationService
- [x] 15.1 Test: Ciclo de vida de sesión funciona
- [x] 15.2 Test: Acciones se sincronizan correctamente
- [x] 15.3 Test: Estado se mantiene consistente
- **Validates**: Property 1, 2, 6

## Task 16: Crear hooks de React
- [x] 16.1 Crear `hooks/useCollaboration.ts` - hook principal
- [x] 16.2 Crear `hooks/useCollaborators.ts` - lista de colaboradores
- [x] 16.3 Crear `hooks/useModChat.ts` - chat entre mods
- [x] 16.4 Crear `hooks/useActionLog.ts` - historial de acciones
- [x] 16.5 Crear `hooks/useCollaborationPermissions.ts` - permisos
- **Validates**: Requirement 1-5

## Task 17: Crear CollaborationProvider
- [x] 17.1 Crear `context/CollaborationContext.tsx`
- [x] 17.2 Implementar estado global de colaboración
- [x] 17.3 Implementar acciones del contexto
- [x] 17.4 Integrar con servicios
- **Validates**: Requirement 1

## Task 18: Crear componente CollaborationPanel
- [x] 18.1 Crear `components/collaboration/CollaborationPanel.tsx`
- [x] 18.2 Mostrar estado de conexión
- [x] 18.3 Mostrar código de sesión
- [x] 18.4 Botones para crear/unirse/salir
- [x] 18.5 Tabs para colaboradores/chat/log
- **Validates**: Requirement 5

## Task 19: Crear componente CollaboratorsList
- [x] 19.1 Crear `components/collaboration/CollaboratorsList.tsx`
- [x] 19.2 Mostrar avatar, nombre, rol de cada colaborador
- [x] 19.3 Indicador de estado (online/away/offline)
- [x] 19.4 Menú de acciones (kick, cambiar rol)
- [x] 19.5 Indicador de "editando..."
- **Validates**: Requirement 1.4, 3.5

## Task 20: Crear componente ModeratorChat
- [x] 20.1 Crear `components/collaboration/ModeratorChat.tsx`
- [x] 20.2 Lista de mensajes con timestamps
- [x] 20.3 Input con autocompletado de menciones
- [x] 20.4 Indicador de typing
- [x] 20.5 Scroll automático a nuevos mensajes
- **Validates**: Requirement 3.1-3.4

## Task 21: Crear componente ActionLogViewer
- [x] 21.1 Crear `components/collaboration/ActionLogViewer.tsx`
- [x] 21.2 Lista cronológica de acciones
- [x] 21.3 Filtros por usuario, tipo, fecha
- [x] 21.4 Botón exportar CSV
- [x] 21.5 Paginación o scroll infinito
- **Validates**: Requirement 4.1-4.5

## Task 22: Crear componente InviteModal
- [x] 22.1 Crear `components/collaboration/InviteModal.tsx`
- [x] 22.2 Mostrar código de sesión copiable
- [x] 22.3 Generar link de invitación
- [x] 22.4 Opción de QR code
- [x] 22.5 Configurar permisos de invitado
- **Validates**: Requirement 2.6

## Task 23: Crear componente RoleManager
- [x] 23.1 Crear `components/collaboration/RoleManager.tsx`
- [x] 23.2 Lista de colaboradores con sus roles
- [x] 23.3 Selector de rol para cada usuario
- [x] 23.4 Checkboxes de permisos personalizados
- [x] 23.5 Botón transferir ownership
- **Validates**: Requirement 2.1-2.5

## Task 24: Crear componente JoinSessionModal
- [x] 24.1 Crear `components/collaboration/JoinSessionModal.tsx`
- [x] 24.2 Input para código de sesión
- [x] 24.3 Input para nombre de usuario
- [x] 24.4 Validación de código
- [x] 24.5 Mostrar info de sesión antes de unirse
- **Validates**: Requirement 5.2

## Task 25: Crear componente ConnectionStatus
- [x] 25.1 Crear `components/collaboration/ConnectionStatus.tsx`
- [x] 25.2 Indicador visual de estado (conectado/reconectando/desconectado)
- [x] 25.3 Latencia de conexión
- [x] 25.4 Botón reconectar manual
- **Validates**: Requirement 1.5

## Task 26: Tests de integración
- [x] 26.1 Test: Crear sesión, invitar, unirse
- [x] 26.2 Test: Sincronización de acciones entre usuarios
- [x] 26.3 Test: Chat funciona correctamente
- [x] 26.4 Test: Permisos se respetan
- [x] 26.5 Test: Reconexión funciona
- **Validates**: Property 1-6

## Task 27: Actualizar ROADMAP.md
- [x] 27.1 Marcar "Modo Colaborativo Multi-Moderador" como completado
- [x] 27.2 Actualizar fecha de última modificación
- **Validates**: Documentation

---

## Resumen

| Categoría | Tareas | Subtareas |
|-----------|--------|-----------|
| Tipos/Modelos | 1 | 6 |
| Servicios | 7 | 38 |
| Property Tests | 6 | 15 |
| Hooks | 1 | 5 |
| Context | 1 | 4 |
| Componentes UI | 8 | 35 |
| Tests Integración | 1 | 5 |
| Documentación | 1 | 2 |
| **Total** | **27** | **110** |

**Estimación**: 4-5 semanas
**Property Tests**: 15 tests cubriendo las 6 propiedades de correctness
