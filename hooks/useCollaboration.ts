// Hook principal para colaboración
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CollaborationSession,
  Collaborator,
  ConnectionInfo,
  SyncAction,
  CollaborationEvent,
  SessionSettings
} from '../types/collaboration';
import {
  CollaborationService,
  getCollaborationService
} from '../src/collaboration/services/CollaborationService';

export interface UseCollaborationOptions {
  autoConnect?: boolean;
  onSessionCreated?: (session: CollaborationSession) => void;
  onSessionJoined?: (session: CollaborationSession) => void;
  onSessionLeft?: () => void;
  onError?: (error: string) => void;
}

export interface UseCollaborationReturn {
  // State
  session: CollaborationSession | null;
  currentUser: Collaborator | null;
  collaborators: Collaborator[];
  connectionInfo: ConnectionInfo;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  startSession: (userId: string, userName: string, settings?: Partial<SessionSettings>) => Promise<boolean>;
  joinSession: (code: string, userId: string, userName: string, avatar?: string) => Promise<boolean>;
  leaveSession: () => void;
  endSession: () => boolean;

  // Sync
  broadcastAction: (action: SyncAction) => boolean;
  requestSync: () => void;

  // Presence
  setPresence: (status: Collaborator['status']) => void;
  setEditing: (itemId: string | null, itemType?: string) => void;
}

export function useCollaboration(options: UseCollaborationOptions = {}): UseCollaborationReturn {
  const serviceRef = useRef<CollaborationService>(getCollaborationService());
  
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    state: 'disconnected',
    reconnectAttempts: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update state from service
  const syncState = useCallback(() => {
    const service = serviceRef.current;
    setSession(service.getCurrentSession());
    setCurrentUser(service.getCurrentUser());
    setCollaborators(service.getCollaborators());
    setConnectionInfo(service.getConnectionInfo());
  }, []);

  // Set up event listeners
  useEffect(() => {
    const service = serviceRef.current;
    const unsubscribers: Array<() => void> = [];

    const handleEvent = (event: CollaborationEvent, data: unknown) => {
      syncState();

      switch (event) {
        case 'session:created':
          options.onSessionCreated?.(service.getCurrentSession()!);
          break;
        case 'session:joined':
          options.onSessionJoined?.(service.getCurrentSession()!);
          break;
        case 'session:left':
        case 'session:closed':
          options.onSessionLeft?.();
          break;
        case 'error':
          const errorData = data as { message?: string };
          setError(errorData.message || 'Error desconocido');
          options.onError?.(errorData.message || 'Error desconocido');
          break;
        case 'collaborator:joined':
        case 'collaborator:left':
        case 'collaborator:kicked':
        case 'collaborator:role_changed':
          syncState();
          break;
        case 'connection:changed':
          setConnectionInfo(data as ConnectionInfo);
          break;
      }
    };

    // Subscribe to all relevant events
    const events: CollaborationEvent[] = [
      'session:created',
      'session:joined',
      'session:left',
      'session:closed',
      'collaborator:joined',
      'collaborator:left',
      'collaborator:kicked',
      'collaborator:role_changed',
      'connection:changed',
      'error'
    ];

    events.forEach(event => {
      unsubscribers.push(service.on(event, handleEvent));
    });

    // Initial sync
    syncState();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [syncState, options]);

  // Start session
  const startSession = useCallback(async (
    userId: string,
    userName: string,
    settings?: Partial<SessionSettings>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.startSession(userId, userName, settings);
      
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

  // Join session
  const joinSession = useCallback(async (
    code: string,
    userId: string,
    userName: string,
    avatar?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.joinSession(code, userId, userName, avatar);
      
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

  // Leave session
  const leaveSession = useCallback(() => {
    serviceRef.current.leaveSession();
    syncState();
  }, [syncState]);

  // End session
  const endSession = useCallback((): boolean => {
    const result = serviceRef.current.endSession();
    syncState();
    return result;
  }, [syncState]);

  // Broadcast action
  const broadcastAction = useCallback((action: SyncAction): boolean => {
    return serviceRef.current.broadcastAction(action);
  }, []);

  // Request sync
  const requestSync = useCallback(() => {
    serviceRef.current.requestStateSync();
  }, []);

  // Set presence
  const setPresence = useCallback((status: Collaborator['status']) => {
    serviceRef.current.setPresence(status);
  }, []);

  // Set editing
  const setEditing = useCallback((itemId: string | null, itemType?: string) => {
    serviceRef.current.setEditing(itemId, itemType);
  }, []);

  return {
    session,
    currentUser,
    collaborators,
    connectionInfo,
    isConnected: connectionInfo.state === 'connected',
    isLoading,
    error,
    startSession,
    joinSession,
    leaveSession,
    endSession,
    broadcastAction,
    requestSync,
    setPresence,
    setEditing
  };
}
