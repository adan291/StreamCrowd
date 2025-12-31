// useWebhookEvents - Hook for triggering webhooks on stream events

import { useCallback, useEffect, useRef } from 'react';
import { WebhookEventType } from '../types/webhooks';
import { webhookService, StreamContext } from '../src/application/services/WebhookService';

interface UseWebhookEventsOptions {
  enabled?: boolean;
  streamContext?: StreamContext;
}

interface UseWebhookEventsReturn {
  triggerFollower: (data: FollowerEventData) => Promise<void>;
  triggerRaid: (data: RaidEventData) => Promise<void>;
  triggerSubscription: (data: SubscriptionEventData) => Promise<void>;
  triggerBits: (data: BitsEventData) => Promise<void>;
  triggerPollStarted: (data: PollEventData) => Promise<void>;
  triggerPollEnded: (data: PollEventData) => Promise<void>;
  triggerPredictionStarted: (data: PredictionEventData) => Promise<void>;
  triggerPredictionResolved: (data: PredictionEventData) => Promise<void>;
  triggerGiveawayWinner: (data: GiveawayEventData) => Promise<void>;
  triggerMacroExecuted: (data: MacroEventData) => Promise<void>;
  triggerEvent: (eventType: WebhookEventType, data: Record<string, unknown>) => Promise<void>;
}

// Event data types
interface FollowerEventData {
  user_id: string;
  user_name: string;
  followed_at: number;
}

interface RaidEventData {
  from_broadcaster_id: string;
  from_broadcaster_name: string;
  viewers: number;
}

interface SubscriptionEventData {
  user_id: string;
  user_name: string;
  tier: '1000' | '2000' | '3000';
  is_gift: boolean;
  gifter_name?: string;
  cumulative_months: number;
}

interface BitsEventData {
  user_id: string;
  user_name: string;
  bits_used: number;
  message: string;
}

interface PollEventData {
  poll_id: string;
  title: string;
  options: Array<{ id: string; title: string; votes?: number }>;
  started_at?: number;
  ended_at?: number;
  status?: 'active' | 'completed' | 'terminated';
}

interface PredictionEventData {
  prediction_id: string;
  title: string;
  outcomes: Array<{ id: string; title: string; users?: number; points?: number }>;
  winning_outcome_id?: string;
  started_at?: number;
  ended_at?: number;
  status?: 'active' | 'resolved' | 'canceled';
}

interface GiveawayEventData {
  giveaway_id: string;
  title: string;
  winner_id: string;
  winner_name: string;
  total_participants: number;
}

interface MacroEventData {
  macro_id: string;
  macro_name: string;
  trigger_type: string;
  actions_executed: number;
  success: boolean;
  error?: string;
}

export function useWebhookEvents(options: UseWebhookEventsOptions = {}): UseWebhookEventsReturn {
  const { enabled = true, streamContext } = options;
  const initialized = useRef(false);

  // Initialize webhook service
  useEffect(() => {
    if (!initialized.current) {
      webhookService.init().then(() => {
        initialized.current = true;
      });
    }
  }, []);

  // Update stream context when it changes
  useEffect(() => {
    if (streamContext) {
      webhookService.setStreamContext(streamContext);
    }
  }, [streamContext]);

  const triggerEvent = useCallback(async (
    eventType: WebhookEventType,
    data: Record<string, unknown>
  ): Promise<void> => {
    if (!enabled) return;
    
    try {
      await webhookService.triggerEvent(eventType, data);
    } catch (error) {
      console.error(`[Webhook] Failed to trigger ${eventType}:`, error);
    }
  }, [enabled]);

  const triggerFollower = useCallback(async (data: FollowerEventData): Promise<void> => {
    await triggerEvent('follower', data);
  }, [triggerEvent]);

  const triggerRaid = useCallback(async (data: RaidEventData): Promise<void> => {
    await triggerEvent('raid', data);
  }, [triggerEvent]);

  const triggerSubscription = useCallback(async (data: SubscriptionEventData): Promise<void> => {
    await triggerEvent('subscription', data);
  }, [triggerEvent]);

  const triggerBits = useCallback(async (data: BitsEventData): Promise<void> => {
    await triggerEvent('bits', data);
  }, [triggerEvent]);

  const triggerPollStarted = useCallback(async (data: PollEventData): Promise<void> => {
    await triggerEvent('poll_started', { ...data, status: 'active' });
  }, [triggerEvent]);

  const triggerPollEnded = useCallback(async (data: PollEventData): Promise<void> => {
    await triggerEvent('poll_ended', { ...data, status: 'completed' });
  }, [triggerEvent]);

  const triggerPredictionStarted = useCallback(async (data: PredictionEventData): Promise<void> => {
    await triggerEvent('prediction_started', { ...data, status: 'active' });
  }, [triggerEvent]);

  const triggerPredictionResolved = useCallback(async (data: PredictionEventData): Promise<void> => {
    await triggerEvent('prediction_resolved', { ...data, status: 'resolved' });
  }, [triggerEvent]);

  const triggerGiveawayWinner = useCallback(async (data: GiveawayEventData): Promise<void> => {
    await triggerEvent('giveaway_winner', data);
  }, [triggerEvent]);

  const triggerMacroExecuted = useCallback(async (data: MacroEventData): Promise<void> => {
    await triggerEvent('macro_executed', data);
  }, [triggerEvent]);

  return {
    triggerFollower,
    triggerRaid,
    triggerSubscription,
    triggerBits,
    triggerPollStarted,
    triggerPollEnded,
    triggerPredictionStarted,
    triggerPredictionResolved,
    triggerGiveawayWinner,
    triggerMacroExecuted,
    triggerEvent,
  };
}
