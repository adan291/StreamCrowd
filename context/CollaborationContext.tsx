// Collaboration Context - Estado global de colaboración
import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import {
  CollaborationSession,
  Collaborator,
  ConnectionInfo,
  SyncAction,
  ChatMessage,
  ActionLogEntry,
  Permission,
  CollaboratorRole,
  SessionSettings
} from '../types/collaboration';
import { getCollaborationService } from '../src/collaboration/services/CollaborationService';
import { getChatService } from '../src/collaboration/services/ChatService';
import { getActionLogService } from '../src/collaboration/services/ActionLogService';

// ============================================
// Types
// ============================================

export interface CollaborationContextValue {
  // Session state
  session: CollaborationSession | null;
  currentUser: Collaborator | null;
  collaborators: Collaborator[];
  connectionInfo: ConnectionInfo;
  isConnected: boolean;
  isInSession: boolean;
  
  // Chat state
  messages: ChatMessage[];
  typingUsers: Array<{ userId: string; userName: string }>;
  
  // Action log state
  actionLog: ActionLogEntry[];
  
  // Loading/Error state
  isLoading: boolean;
  error: string | null;
  
  // Session actions
  startSession: (userId: string, userName: string, settings?: Partial<SessionSettings>) => Promise<boolean>;
  joinSession: (code: string, userId: string, userName: string, avatar?: string) => Promise<boolean>;
  leaveSession: () => void;
  endSession: () => boolean;
  
  // Sync actions
  broadcastAction: (action: SyncAction) => boolean;
  requestSync: () => void;
  
  // Collaborator actions
  kickCollaborator: (userId: string, reason?: string) => boolean;
  changeRole: (userId: string, newRole: CollaboratorRole) => boolean;
  setCustomPermissions: (userId: string, permissions: Permission[]) => boolean;
  transferOwnership: (newOwnerId: string) => boolean;
  
  // Presence actions
  setPresence: (status: Collaborator['status']) => void;
  setEditing: (itemId: string | null, itemType?: string) => void;
  
  // Chat actions
  sendMessage: (content: string) => ChatMessage | null;
  setTyping: (isTyping: boolean) => void;
  clearChatHistory: () => void;
  
  // Permission checks
  hasPermission: (permission: Permission) => boolean;
  
  // Utilities
  clearError: () => void;
}

// ============================================
// Context
// ============================================

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

// ============================================
// Provider
// ============================================

export interface CollaborationProviderProps {
  children: ReactNode;
}

export function CollaborationProvider({ children }: CollaborationProviderProps) {
  // State
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    state: 'disconnected',
    reconnectAttempts: 0
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state from services
  const syncState = useCallback(() => {
    const service = getCollaborationService();
    setSession(service.getCurrentSession());
    setCurrentUser(service.getCurrentUser());
    setCollaborators(service.getCollaborators());
    setConnectionInfo(service.getConnectionInfo());
  }, []);

  // Set up event listeners
  useEffect(() => {
    const collabService = getCollaborationService();
    const chatService = getChatService();
    const logService = getActionLogService();
    const unsubscribers: Array<() => void> = [];

    // Collaboration events
    const events = [
      'session:created',
      'session:joined',
      'session:left',
      'session:closed',
      'collaborator:joined',
      'collaborator:left',
      'collaborator:kicked',
      'collaborator:role_changed',
      'connection:changed',
      'action:received',
      'error'
    ] as const;

    events.forEach(event => {
      unsubscribers.push(collabService.on(event, (_, data) => {
        syncState();
        
        if (event === 'connection:changed') {
          setConnectionInfo(data as ConnectionInfo);
        }
        
        if (event === 'error') {
          const errorData = data as { message?: string };
          setError(errorData.message || 'Error desconocido');
        }
      }));
    });

    // Chat subscription
    unsubscribers.push(chatService.subscribe(setMessages));
    unsubscribers.push(chatService.subscribeToTyping(setTypingUsers));

    // Action log subscription
    unsubscribers.push(logService.subscribe(setActionLog));

    // Initial sync
    syncState();
    setMessages(chatService.getMessages());
    setActionLog(logService.getRecentActions());

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [syncState]);

  // Session actions
  const startSession = useCallback(async (
    userId: string,
    userName: string,
    settings?: Partial<SessionSettings>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const service = getCollaborationService();
      const result = await service.startSession(userId, userName, settings);
      
      if (!result.success) {
        setError(result.error || 'Error al crear sesión');
        return false;
      }

      syncState();
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [syncState]);

  const joinSession = useCallback(async (
    code: string,
    userId: string,
    userName: string,
    avatar?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const service = getCollaborationService();
      const result = await service.joinSession(code, userId, userName, avatar);
      
      if (!result.success) {
        setError(result.error || 'Error al unirse a sesión');
        return false;
      }

      syncState();
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [syncState]);

  const leaveSession = useCallback(() => {
    const service = getCollaborationService();
    service.leaveSession();
    syncState();
  }, [syncState]);

  const endSession = useCallback((): boolean => {
    const service = getCollaborationService();
    const result = service.endSession();
    syncState();
    return result;
  }, [syncState]);

  // Sync actions
  const broadcastAction = useCallback((action: SyncAction): boolean => {
    const service = getCollaborationService();
    return service.broadcastAction(action);
  }, []);

  const requestSync = useCallback(() => {
    const service = getCollaborationService();
    service.requestStateSync();
  }, []);

  // Collaborator actions
  const kickCollaborator = useCallback((userId: string, reason?: string): boolean => {
    const service = getCollaborationService();
    return service.kickCollaborator(userId, reason);
  }, []);

  const changeRole = useCallback((userId: string, newRole: CollaboratorRole): boolean => {
    const service = getCollaborationService();
    return service.changeRole(userId, newRole);
  }, []);

  const setCustomPermissions = useCallback((userId: string, permissions: Permission[]): boolean => {
    const service = getCollaborationService();
    return service.setCustomPermissions(userId, permissions);
  }, []);

  const transferOwnership = useCallback((newOwnerId: string): boolean => {
    const service = getCollaborationService();
    return service.transferOwnership(newOwnerId);
  }, []);

  // Presence actions
  const setPresence = useCallback((status: Collaborator['status']) => {
    const service = getCollaborationService();
    service.setPresence(status);
  }, []);

  const setEditing = useCallback((itemId: string | null, itemType?: string) => {
    const service = getCollaborationService();
    service.setEditing(itemId, itemType);
  }, []);

  // Chat actions
  const sendMessage = useCallback((content: string): ChatMessage | null => {
    const service = getCollaborationService();
    return service.sendChatMessage(content);
  }, []);

  const setTyping = useCallback((isTyping: boolean) => {
    const service = getCollaborationService();
    service.setTyping(isTyping);
  }, []);

  const clearChatHistory = useCallback(() => {
    const chatService = getChatService();
    chatService.clearHistory();
  }, []);

  // Permission check
  const hasPermission = useCallback((permission: Permission): boolean => {
    const service = getCollaborationService();
    return service.hasPermission(permission);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: CollaborationContextValue = {
    session,
    currentUser,
    collaborators,
    connectionInfo,
    isConnected: connectionInfo.state === 'connected',
    isInSession: session !== null,
    messages,
    typingUsers,
    actionLog,
    isLoading,
    error,
    startSession,
    joinSession,
    leaveSession,
    endSession,
    broadcastAction,
    requestSync,
    kickCollaborator,
    changeRole,
    setCustomPermissions,
    transferOwnership,
    setPresence,
    setEditing,
    sendMessage,
    setTyping,
    clearChatHistory,
    hasPermission,
    clearError
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useCollaborationContext(): CollaborationContextValue {
  const context = useContext(CollaborationContext);
  
  if (!context) {
    throw new Error('useCollaborationContext must be used within a CollaborationProvider');
  }
  
  return context;
}

// ============================================
// Exports
// ============================================

export { CollaborationContext };
