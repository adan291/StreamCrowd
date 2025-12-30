/**
 * useStreamNotifications - Hook to connect stream events with notifications
 * 
 * This hook listens to stream events (followers, raids, subs, bits, etc.)
 * and emits notifications through the NotificationService.
 * 
 * @requirements 4.3 - THE Alert_Config SHALL include the following types of events
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNotifications } from './useNotifications';
import { useStreamEventService } from '../src/application/hooks/useStreamEventService';
import type { StreamEvent, StreamEventType } from '../src/domain/entities/StreamEvent';
import type { NotificationEventType, NotificationPriority } from '../types/notifications';

// ============ TYPES ============

/**
 * Options for the useStreamNotifications hook
 */
export interface UseStreamNotificationsOptions {
  /**
   * Whether to enable automatic notifications for stream events
   * @default true
   */
  enabled?: boolean;
}

/**
 * Return type for the useStreamNotifications hook
 */
export interface UseStreamNotificationsReturn {
  /**
   * Manually emit a notification for a poll ending
   */
  notifyPollEnded: (question: string, winner: string, totalVotes: number) => Promise<void>;
  
  /**
   * Manually emit a notification for a prediction being resolved
   */
  notifyPredictionResolved: (title: string, winningOutcome: string, totalPoints: number) => Promise<void>;
  
  /**
   * Manually emit a notification for a giveaway winner
   */
  notifyGiveawayWinner: (winnerName: string, prizeName?: string) => Promise<void>;
  
  /**
   * Manually emit a notification for a command execution
   */
  notifyCommandExecuted: (commandName: string, username: string) => Promise<void>;
  
  /**
   * Manually emit a notification for a new follower
   */
  notifyNewFollower: (username: string) => Promise<void>;
  
  /**
   * Manually emit a notification for a raid
   */
  notifyRaid: (username: string, viewerCount: number) => Promise<void>;
  
  /**
   * Manually emit a notification for a subscription
   */
  notifySubscription: (username: string, tier: string, months?: number) => Promise<void>;
  
  /**
   * Manually emit a notification for bits
   */
  notifyBits: (username: string, amount: number, message?: string) => Promise<void>;
  
  /**
   * Manually emit a notification for a donation
   */
  notifyDonation: (username: string, amount: number, currency: string, message?: string) => Promise<void>;
}

// ============ HELPERS ============

/**
 * Map stream event type to notification event type
 */
function mapStreamEventToNotificationType(streamType: StreamEventType): NotificationEventType | null {
  switch (streamType) {
    case 'sub':
    case 'resub':
    case 'subgift':
    case 'submysterygift':
    case 'primepaidupgrade':
    case 'giftpaidupgrade':
      return 'subscription';
    case 'raid':
      return 'raid';
    case 'hosted':
      return 'host';
    case 'cheer':
      return 'bits';
    default:
      return null;
  }
}

/**
 * Get priority based on event type
 */
function getPriorityForEvent(type: NotificationEventType): NotificationPriority {
  switch (type) {
    case 'donation':
    case 'raid':
      return 'high';
    case 'subscription':
    case 'bits':
    case 'giveaway_winner':
      return 'normal';
    default:
      return 'low';
  }
}

/**
 * Format tier for display
 */
function formatTier(tier?: string): string {
  switch (tier) {
    case 'Prime':
      return 'Prime';
    case '1000':
      return 'Tier 1';
    case '2000':
      return 'Tier 2';
    case '3000':
      return 'Tier 3';
    default:
      return 'Tier 1';
  }
}

// ============ HOOK ============

/**
 * Hook to connect stream events with the notification system
 * 
 * Automatically listens to stream events and emits notifications
 * based on the user's configuration.
 * 
 * @example
 * ```tsx
 * function StreamComponent() {
 *   const { notifyPollEnded, notifyGiveawayWinner } = useStreamNotifications();
 *   
 *   // Notifications for stream events are automatic
 *   // Use manual methods for app-specific events
 *   
 *   const handlePollEnd = (poll) => {
 *     notifyPollEnded(poll.question, poll.winner, poll.totalVotes);
 *   };
 *   
 *   const handleGiveawayWinner = (winner) => {
 *     notifyGiveawayWinner(winner.name, 'Steam Key');
 *   };
 * }
 * ```
 * 
 * @requirements 4.3
 */
export function useStreamNotifications(
  options: UseStreamNotificationsOptions = {}
): UseStreamNotificationsReturn {
  const { enabled = true } = options;
  
  const { notify } = useNotifications();
  const { onEvent } = useStreamEventService();
  
  // Track processed events to avoid duplicates
  const processedEventsRef = useRef<Set<string>>(new Set());

  /**
   * Handle stream events and emit notifications
   */
  const handleStreamEvent = useCallback(async (event: StreamEvent) => {
    // Skip if already processed
    if (processedEventsRef.current.has(event.id)) {
      return;
    }
    processedEventsRef.current.add(event.id);
    
    // Limit the set size to prevent memory leaks
    if (processedEventsRef.current.size > 1000) {
      const entries = Array.from(processedEventsRef.current);
      processedEventsRef.current = new Set(entries.slice(-500));
    }
    
    const notificationType = mapStreamEventToNotificationType(event.type);
    if (!notificationType) {
      return;
    }
    
    let title = '';
    let message = '';
    const data: Record<string, unknown> = {
      username: event.username,
      eventType: event.type,
    };
    
    switch (event.type) {
      case 'sub':
        title = '⭐ Nueva suscripción';
        message = `${event.username} se ha suscrito (${formatTier(event.tier)})`;
        data.tier = event.tier;
        break;
        
      case 'resub':
        title = '⭐ Resuscripción';
        message = `${event.username} se ha resuscrito por ${event.months || 1} mes(es) (${formatTier(event.tier)})`;
        data.tier = event.tier;
        data.months = event.months;
        break;
        
      case 'subgift':
        title = '🎁 Sub regalada';
        message = `${event.username} ha regalado una sub a ${event.recipientUsername || 'alguien'}`;
        data.recipient = event.recipientUsername;
        data.tier = event.tier;
        break;
        
      case 'submysterygift':
        title = '🎁 Subs regaladas';
        message = `${event.username} ha regalado ${event.giftCount || 1} subs`;
        data.giftCount = event.giftCount;
        data.tier = event.tier;
        break;
        
      case 'raid':
        title = '🚀 Raid recibido';
        message = `${event.username} ha hecho raid con ${event.viewerCount || 0} viewers`;
        data.viewerCount = event.viewerCount;
        break;
        
      case 'hosted':
        title = '📺 Host recibido';
        message = `${event.username} te está hosteando`;
        break;
        
      case 'cheer':
        title = '💎 Bits recibidos';
        message = `${event.username} ha enviado ${event.bits || 0} bits`;
        if (event.message) {
          message += `: "${event.message}"`;
        }
        data.bits = event.bits;
        data.message = event.message;
        break;
        
      default:
        return;
    }
    
    try {
      await notify({
        type: notificationType,
        title,
        message,
        data,
        priority: getPriorityForEvent(notificationType),
      });
    } catch (error) {
      console.error('Error sending stream event notification:', error);
    }
  }, [notify]);

  // Subscribe to stream events
  useEffect(() => {
    if (!enabled) {
      return;
    }
    
    const unsubscribe = onEvent(handleStreamEvent);
    
    return () => {
      unsubscribe();
    };
  }, [enabled, onEvent, handleStreamEvent]);

  // ============ MANUAL NOTIFICATION METHODS ============

  /**
   * Notify when a poll ends
   */
  const notifyPollEnded = useCallback(async (
    question: string,
    winner: string,
    totalVotes: number
  ): Promise<void> => {
    try {
      await notify({
        type: 'poll_ended',
        title: '📊 Encuesta finalizada',
        message: `"${question}" - Ganador: ${winner} (${totalVotes} votos)`,
        data: { question, winner, totalVotes },
        priority: 'normal',
      });
    } catch (error) {
      console.error('Error sending poll ended notification:', error);
    }
  }, [notify]);

  /**
   * Notify when a prediction is resolved
   */
  const notifyPredictionResolved = useCallback(async (
    title: string,
    winningOutcome: string,
    totalPoints: number
  ): Promise<void> => {
    try {
      await notify({
        type: 'prediction_resolved',
        title: '🎯 Predicción resuelta',
        message: `"${title}" - Resultado: ${winningOutcome} (${totalPoints.toLocaleString()} puntos)`,
        data: { predictionTitle: title, winningOutcome, totalPoints },
        priority: 'normal',
      });
    } catch (error) {
      console.error('Error sending prediction resolved notification:', error);
    }
  }, [notify]);

  /**
   * Notify when a giveaway winner is selected
   */
  const notifyGiveawayWinner = useCallback(async (
    winnerName: string,
    prizeName?: string
  ): Promise<void> => {
    try {
      const message = prizeName
        ? `${winnerName} ha ganado: ${prizeName}`
        : `${winnerName} ha ganado el sorteo`;
      
      await notify({
        type: 'giveaway_winner',
        title: '🎉 ¡Ganador del sorteo!',
        message,
        data: { winner: winnerName, prize: prizeName },
        priority: 'high',
      });
    } catch (error) {
      console.error('Error sending giveaway winner notification:', error);
    }
  }, [notify]);

  /**
   * Notify when a command is executed
   */
  const notifyCommandExecuted = useCallback(async (
    commandName: string,
    username: string
  ): Promise<void> => {
    try {
      await notify({
        type: 'command_executed',
        title: '⚡ Comando ejecutado',
        message: `${username} ejecutó !${commandName}`,
        data: { command: commandName, username },
        priority: 'low',
      });
    } catch (error) {
      console.error('Error sending command executed notification:', error);
    }
  }, [notify]);

  /**
   * Notify when a new follower arrives
   */
  const notifyNewFollower = useCallback(async (username: string): Promise<void> => {
    try {
      await notify({
        type: 'follower',
        title: '👤 Nuevo seguidor',
        message: `${username} te ha seguido`,
        data: { username },
        priority: 'low',
      });
    } catch (error) {
      console.error('Error sending new follower notification:', error);
    }
  }, [notify]);

  /**
   * Notify when a raid is received
   */
  const notifyRaid = useCallback(async (
    username: string,
    viewerCount: number
  ): Promise<void> => {
    try {
      await notify({
        type: 'raid',
        title: '🚀 Raid recibido',
        message: `${username} ha hecho raid con ${viewerCount} viewers`,
        data: { username, viewerCount },
        priority: 'high',
      });
    } catch (error) {
      console.error('Error sending raid notification:', error);
    }
  }, [notify]);

  /**
   * Notify when a subscription is received
   */
  const notifySubscription = useCallback(async (
    username: string,
    tier: string,
    months?: number
  ): Promise<void> => {
    try {
      const message = months && months > 1
        ? `${username} se ha resuscrito por ${months} meses (${tier})`
        : `${username} se ha suscrito (${tier})`;
      
      await notify({
        type: 'subscription',
        title: '⭐ Nueva suscripción',
        message,
        data: { username, tier, months },
        priority: 'normal',
      });
    } catch (error) {
      console.error('Error sending subscription notification:', error);
    }
  }, [notify]);

  /**
   * Notify when bits are received
   */
  const notifyBits = useCallback(async (
    username: string,
    amount: number,
    message?: string
  ): Promise<void> => {
    try {
      let notificationMessage = `${username} ha enviado ${amount} bits`;
      if (message) {
        notificationMessage += `: "${message}"`;
      }
      
      await notify({
        type: 'bits',
        title: '💎 Bits recibidos',
        message: notificationMessage,
        data: { username, amount, message },
        priority: 'normal',
      });
    } catch (error) {
      console.error('Error sending bits notification:', error);
    }
  }, [notify]);

  /**
   * Notify when a donation is received
   */
  const notifyDonation = useCallback(async (
    username: string,
    amount: number,
    currency: string,
    message?: string
  ): Promise<void> => {
    try {
      let notificationMessage = `${username} ha donado ${amount} ${currency}`;
      if (message) {
        notificationMessage += `: "${message}"`;
      }
      
      await notify({
        type: 'donation',
        title: '💰 Donación recibida',
        message: notificationMessage,
        data: { username, amount, currency, message },
        priority: 'high',
      });
    } catch (error) {
      console.error('Error sending donation notification:', error);
    }
  }, [notify]);

  return {
    notifyPollEnded,
    notifyPredictionResolved,
    notifyGiveawayWinner,
    notifyCommandExecuted,
    notifyNewFollower,
    notifyRaid,
    notifySubscription,
    notifyBits,
    notifyDonation,
  };
}

export default useStreamNotifications;
