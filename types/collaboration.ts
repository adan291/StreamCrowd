// Types for Collaborative Multi-Moderator Mode

// ============================================
// Roles and Permissions
// ============================================

export type CollaboratorRole = 'owner' | 'admin' | 'moderator' | 'viewer';

export type Permission =
  | 'polls:read' | 'polls:write'
  | 'predictions:read' | 'predictions:write'
  | 'giveaways:read' | 'giveaways:write'
  | 'timers:read' | 'timers:write'
  | 'obs:read' | 'obs:write'
  | 'settings:read' | 'settings:write'
  | 'collaborators:manage'
  | 'session:manage';

export const ROLE_PERMISSIONS: Record<CollaboratorRole, Permission[]> = {
  owner: [
    'polls:read', 'polls:write',
    'predictions:read', 'predictions:write',
    'giveaways:read', 'giveaways:write',
    'timers:read', 'timers:write',
    'obs:read', 'obs:write',
    'settings:read', 'settings:write',
    'collaborators:manage',
    'session:manage'
  ],
  admin: [
    'polls:read', 'polls:write',
    'predictions:read', 'predictions:write',
    'giveaways:read', 'giveaways:write',
    'timers:read', 'timers:write',
    'obs:read', 'obs:write',
    'settings:read', 'settings:write',
    'collaborators:manage'
  ],
  moderator: [
    'polls:read', 'polls:write',
    'predictions:read', 'predictions:write',
    'giveaways:read', 'giveaways:write',
    'timers:read', 'timers:write',
    'obs:read'
  ],
  viewer: [
    'polls:read',
    'predictions:read',
    'giveaways:read',
    'timers:read',
    'obs:read'
  ]
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'polls:read': 'Ver encuestas',
  'polls:write': 'Crear/editar encuestas',
  'predictions:read': 'Ver predicciones',
  'predictions:write': 'Crear/editar predicciones',
  'giveaways:read': 'Ver sorteos',
  'giveaways:write': 'Crear/editar sorteos',
  'timers:read': 'Ver timers',
  'timers:write': 'Crear/editar timers',
  'obs:read': 'Ver estado OBS',
  'obs:write': 'Controlar OBS',
  'settings:read': 'Ver configuración',
  'settings:write': 'Modificar configuración',
  'collaborators:manage': 'Gestionar colaboradores',
  'session:manage': 'Gestionar sesión'
};

// ============================================
// Collaborator
// ============================================

export type CollaboratorStatus = 'online' | 'away' | 'offline';

export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  role: CollaboratorRole;
  customPermissions?: Permission[];
  status: CollaboratorStatus;
  joinedAt: number;
  lastActiveAt: number;
  isTyping?: boolean;
  currentlyEditing?: string; // ID of item being edited
}

// ============================================
// Session
// ============================================

export interface SessionSettings {
  maxCollaborators: number;
  allowViewers: boolean;
  requireApproval: boolean;
  autoExpireMinutes: number;
}

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  maxCollaborators: 10,
  allowViewers: true,
  requireApproval: false,
  autoExpireMinutes: 480 // 8 hours
};

export interface CollaborationSession {
  id: string;
  code: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  expiresAt: number;
  settings: SessionSettings;
  collaborators: Collaborator[];
  stateVersion: number;
}

export interface SessionInfo {
  code: string;
  ownerName: string;
  collaboratorCount: number;
  createdAt: number;
}

// ============================================
// Sync Actions
// ============================================

export type SyncActionType =
  | 'poll:create' | 'poll:update' | 'poll:delete' | 'poll:start' | 'poll:stop'
  | 'prediction:create' | 'prediction:update' | 'prediction:lock' | 'prediction:resolve'
  | 'giveaway:create' | 'giveaway:start' | 'giveaway:draw'
  | 'timer:create' | 'timer:start' | 'timer:pause' | 'timer:reset' | 'timer:delete'
  | 'obs:scene_change' | 'obs:source_toggle'
  | 'settings:update'
  | 'state:full_sync';

export interface SyncAction {
  id: string;
  type: SyncActionType;
  payload: unknown;
  userId: string;
  userName: string;
  timestamp: number;
  version: number;
}

export interface ConflictResolution {
  action: SyncAction;
  resolution: 'accepted' | 'rejected' | 'merged';
  reason?: string;
}

// ============================================
// Chat Messages
// ============================================

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  mentions: string[]; // User IDs mentioned
  timestamp: number;
  isSystem?: boolean;
}

// ============================================
// Action Log
// ============================================

export type ActionCategory = 
  | 'poll' 
  | 'prediction' 
  | 'giveaway' 
  | 'timer' 
  | 'obs' 
  | 'session' 
  | 'settings'
  | 'other';

export interface ActionLogEntry {
  id: string;
  action: string;
  details: string;
  userId: string;
  userName: string;
  timestamp: number;
  category: ActionCategory;
  metadata?: Record<string, unknown>;
}

export interface ActionLogFilter {
  userId?: string;
  category?: ActionCategory;
  fromDate?: number;
  toDate?: number;
  search?: string;
}

// ============================================
// WebSocket Messages
// ============================================

export type WSMessageType =
  | 'join'
  | 'leave'
  | 'action'
  | 'chat'
  | 'state_sync'
  | 'presence'
  | 'typing'
  | 'editing'
  | 'kick'
  | 'role_change'
  | 'error'
  | 'ping'
  | 'pong';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: number;
}

export interface WSJoinPayload {
  sessionCode: string;
  user: Omit<Collaborator, 'joinedAt' | 'lastActiveAt'>;
  token?: string;
}

export interface WSLeavePayload {
  userId: string;
  reason?: 'left' | 'kicked' | 'timeout';
}

export interface WSActionPayload {
  action: SyncAction;
}

export interface WSChatPayload {
  message: ChatMessage;
}

export interface WSStateSyncPayload {
  state: unknown;
  version: number;
}

export interface WSPresencePayload {
  userId: string;
  status: CollaboratorStatus;
}

export interface WSTypingPayload {
  userId: string;
  isTyping: boolean;
}

export interface WSEditingPayload {
  userId: string;
  itemId: string | null;
  itemType?: string;
}

export interface WSKickPayload {
  userId: string;
  reason?: string;
}

export interface WSRoleChangePayload {
  userId: string;
  newRole: CollaboratorRole;
  customPermissions?: Permission[];
}

export interface WSErrorPayload {
  code: string;
  message: string;
}

// ============================================
// Connection State
// ============================================

export type ConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting' 
  | 'error';

export interface ConnectionInfo {
  state: ConnectionState;
  latency?: number;
  lastConnectedAt?: number;
  reconnectAttempts: number;
  error?: string;
}

// ============================================
// Collaboration State
// ============================================

export interface CollaborationState {
  session: CollaborationSession | null;
  currentUser: Collaborator | null;
  connection: ConnectionInfo;
  messages: ChatMessage[];
  actionLog: ActionLogEntry[];
  pendingActions: SyncAction[];
}

// ============================================
// Events
// ============================================

export type CollaborationEvent =
  | 'session:created'
  | 'session:joined'
  | 'session:left'
  | 'session:closed'
  | 'collaborator:joined'
  | 'collaborator:left'
  | 'collaborator:kicked'
  | 'collaborator:role_changed'
  | 'action:received'
  | 'action:conflict'
  | 'chat:message'
  | 'connection:changed'
  | 'error';

export type CollaborationEventHandler = (event: CollaborationEvent, data: unknown) => void;

// ============================================
// Invite
// ============================================

export interface SessionInvite {
  code: string;
  link: string;
  expiresAt: number;
  defaultRole: CollaboratorRole;
}
