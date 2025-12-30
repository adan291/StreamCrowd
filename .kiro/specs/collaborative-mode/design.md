# Design: Modo Colaborativo Multi-Moderador

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  CollaborationProvider                                           │
│  ├── useCollaboration (hook principal)                          │
│  ├── useCollaborators (lista de moderadores)                    │
│  ├── useModChat (chat interno)                                  │
│  └── useActionLog (historial de acciones)                       │
├─────────────────────────────────────────────────────────────────┤
│  Componentes UI                                                  │
│  ├── CollaborationPanel (panel principal)                       │
│  ├── CollaboratorsList (lista de mods online)                   │
│  ├── ModeratorChat (chat entre mods)                            │
│  ├── ActionLogViewer (historial de acciones)                    │
│  ├── InviteModal (invitar moderadores)                          │
│  ├── RoleManager (gestión de roles)                             │
│  └── SessionControls (controles de sesión)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Servicios de Colaboración                     │
├─────────────────────────────────────────────────────────────────┤
│  CollaborationService                                            │
│  ├── createSession() / joinSession()                            │
│  ├── broadcastAction() / receiveAction()                        │
│  └── syncState()                                                │
├─────────────────────────────────────────────────────────────────┤
│  SessionService                                                  │
│  ├── generateSessionCode()                                      │
│  ├── validateSession()                                          │
│  └── manageParticipants()                                       │
├─────────────────────────────────────────────────────────────────┤
│  RoleService                                                     │
│  ├── assignRole() / revokeRole()                                │
│  ├── checkPermission()                                          │
│  └── getPermissions()                                           │
├─────────────────────────────────────────────────────────────────┤
│  SyncService                                                     │
│  ├── applyRemoteAction()                                        │
│  ├── resolveConflict()                                          │
│  └── getStateDiff()                                             │
├─────────────────────────────────────────────────────────────────┤
│  ChatService                                                     │
│  ├── sendMessage() / receiveMessage()                           │
│  └── getHistory()                                               │
├─────────────────────────────────────────────────────────────────┤
│  ActionLogService                                                │
│  ├── logAction()                                                │
│  ├── getActions()                                               │
│  └── exportLog()                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Tipos Principales

```typescript
// types/collaboration.ts

// Roles
type CollaboratorRole = 'owner' | 'admin' | 'moderator' | 'viewer';

// Permisos granulares
type Permission = 
  | 'polls:read' | 'polls:write'
  | 'predictions:read' | 'predictions:write'
  | 'giveaways:read' | 'giveaways:write'
  | 'timers:read' | 'timers:write'
  | 'obs:read' | 'obs:write'
  | 'settings:read' | 'settings:write'
  | 'collaborators:manage'
  | 'session:manage';

// Colaborador
interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  role: CollaboratorRole;
  permissions: Permission[];
  status: 'online' | 'away' | 'offline';
  joinedAt: number;
  lastActiveAt: number;
}

// Sesión colaborativa
interface CollaborationSession {
  id: string;
  code: string;
  ownerId: string;
  createdAt: number;
  collaborators: Map<string, Collaborator>;
  settings: SessionSettings;
}

interface SessionSettings {
  maxCollaborators: number;
  allowViewers: boolean;
  requireApproval: boolean;
  autoExpireMinutes: number;
}

// Acciones sincronizadas
interface SyncAction {
  id: string;
  type: string;
  payload: unknown;
  userId: string;
  userName: string;
  timestamp: number;
  version: number;
}

// Mensajes de chat
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  mentions: string[];
  timestamp: number;
}

// Log de acciones
interface ActionLogEntry {
  id: string;
  action: string;
  details: string;
  userId: string;
  userName: string;
  timestamp: number;
  category: 'poll' | 'prediction' | 'giveaway' | 'timer' | 'obs' | 'session' | 'other';
}

// Mensajes WebSocket
type WSMessage = 
  | { type: 'join'; payload: { sessionCode: string; user: Collaborator } }
  | { type: 'leave'; payload: { userId: string } }
  | { type: 'action'; payload: SyncAction }
  | { type: 'chat'; payload: ChatMessage }
  | { type: 'state_sync'; payload: { state: unknown; version: number } }
  | { type: 'presence'; payload: { userId: string; status: string } }
  | { type: 'error'; payload: { code: string; message: string } };
```

## Flujo de Sincronización

```
1. Usuario A crea encuesta
   ├── Acción local aplicada inmediatamente
   ├── Acción enviada al servidor WebSocket
   └── Servidor broadcast a todos los demás

2. Usuario B recibe acción
   ├── Validar versión (evitar duplicados)
   ├── Aplicar acción al estado local
   └── Actualizar UI

3. Conflicto (A y B editan mismo item)
   ├── Servidor determina orden por timestamp
   ├── Última escritura gana (LWW)
   └── Notificar a usuario cuya acción fue sobrescrita
```

## Protocolo WebSocket

```typescript
// Conexión
ws://server/collab?session=CODE&token=TOKEN

// Mensajes del cliente
{ type: 'join', payload: { sessionCode, user } }
{ type: 'action', payload: { type, payload, version } }
{ type: 'chat', payload: { content, mentions } }
{ type: 'presence', payload: { status } }

// Mensajes del servidor
{ type: 'joined', payload: { session, collaborators } }
{ type: 'user_joined', payload: { user } }
{ type: 'user_left', payload: { userId } }
{ type: 'action', payload: { action } }
{ type: 'chat', payload: { message } }
{ type: 'state_sync', payload: { state, version } }
{ type: 'error', payload: { code, message } }
```

## Servicios

### CollaborationService
Servicio principal que orquesta la colaboración:
- Gestiona conexión WebSocket
- Coordina sincronización de estado
- Maneja reconexiones

### SessionService
Gestiona sesiones colaborativas:
- Genera códigos únicos de sesión
- Valida acceso a sesiones
- Gestiona participantes

### RoleService
Sistema de roles y permisos:
- Define permisos por rol
- Valida acciones contra permisos
- Permite permisos personalizados

### SyncService
Sincronización de estado:
- Aplica acciones remotas
- Resuelve conflictos
- Mantiene versión del estado

### ChatService
Chat entre moderadores:
- Envío/recepción de mensajes
- Menciones y notificaciones
- Historial de sesión

### ActionLogService
Registro de acciones:
- Log de todas las acciones
- Filtrado y búsqueda
- Exportación

## Componentes UI

### CollaborationPanel
Panel principal con:
- Estado de conexión
- Lista de colaboradores
- Acceso a chat y log

### CollaboratorsList
Lista de moderadores:
- Avatar, nombre, rol
- Estado (online/away/offline)
- Acciones (kick, cambiar rol)

### ModeratorChat
Chat en tiempo real:
- Mensajes con timestamps
- Menciones con autocompletado
- Indicador de typing

### ActionLogViewer
Historial de acciones:
- Lista cronológica
- Filtros por usuario/tipo
- Exportar a CSV

### InviteModal
Invitar moderadores:
- Código de sesión copiable
- Link de invitación
- QR code

### RoleManager
Gestión de roles:
- Asignar/cambiar roles
- Permisos personalizados
- Transferir ownership

## Consideraciones de Seguridad

1. **Autenticación**: Token JWT para cada colaborador
2. **Autorización**: Validar permisos en cada acción
3. **Rate Limiting**: Limitar acciones por segundo
4. **Sanitización**: Limpiar contenido de chat
5. **Expiración**: Sesiones expiran automáticamente
