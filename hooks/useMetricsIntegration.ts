// useMetricsIntegration - Hook to integrate metrics with system events

import { useEffect, useCallback, useRef } from 'react';
import { useMetrics } from './useMetrics';
import { StreamEventType } from '../types/metrics';

interface TwitchEvent {
  type: string;
  data: Record<string, unknown>;
}

interface UseMetricsIntegrationOptions {
  enabled?: boolean;
  platform?: string;
  channelName?: string;
}

export function useMetricsIntegration(options: UseMetricsIntegrationOptions = {}) {
  const { enabled = true, platform = 'twitch', channelName = '' } = options;
  const { isRecording, startSession, recordMetric, recordEvent } = useMetrics();
  const lastViewerCount = useRef<number>(0);
  const messageBuffer = useRef<number>(0);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle viewer count updates
  const handleViewerUpdate = useCallback((count: number) => {
    if (!isRecording) return;
    
    recordMetric('viewers', count);
    lastViewerCount.current = count;
  }, [isRecording, recordMetric]);

  // Handle chat messages
  const handleChatMessage = useCallback(() => {
    if (!isRecording) return;
    
    messageBuffer.current += 1;
  }, [isRecording]);

  // Handle follower events
  const handleNewFollower = useCallback((count: number = 1) => {
    if (!isRecording) return;
    
    recordMetric('followers', count);
  }, [isRecording, recordMetric]);

  // Handle subscriber events
  const handleNewSubscriber = useCallback((count: number = 1) => {
    if (!isRecording) return;
    
    recordMetric('subscribers', count);
  }, [isRecording, recordMetric]);

  // Handle bits events
  const handleBits = useCallback((amount: number) => {
    if (!isRecording) return;
    
    recordMetric('bits', amount);
  }, [isRecording, recordMetric]);

  // Handle raid events
  const handleRaid = useCallback((viewerCount: number, raiderName: string) => {
    if (!isRecording) return;
    
    recordMetric('raids', viewerCount);
    recordEvent({
      type: 'raid' as StreamEventType,
      timestamp: Date.now(),
      data: { viewerCount, raiderName },
    });
  }, [isRecording, recordMetric, recordEvent]);

  // Handle poll events
  const handlePollCreated = useCallback((pollId: string, title: string) => {
    if (!isRecording) return;
    
    recordEvent({
      type: 'poll' as StreamEventType,
      timestamp: Date.now(),
      data: { pollId, title, action: 'created' },
    });
  }, [isRecording, recordEvent]);

  // Handle poll participation
  const handlePollVote = useCallback((count: number = 1) => {
    if (!isRecording) return;
    
    recordMetric('poll_participation', count);
  }, [isRecording, recordMetric]);

  // Handle prediction events
  const handlePredictionCreated = useCallback((predictionId: string, title: string) => {
    if (!isRecording) return;
    
    recordEvent({
      type: 'prediction' as StreamEventType,
      timestamp: Date.now(),
      data: { predictionId, title, action: 'created' },
    });
  }, [isRecording, recordEvent]);

  // Handle prediction participation
  const handlePredictionBet = useCallback((count: number = 1) => {
    if (!isRecording) return;
    
    recordMetric('prediction_participation', count);
  }, [isRecording, recordMetric]);

  // Handle milestone events
  const handleMilestone = useCallback((type: string, value: number) => {
    if (!isRecording) return;
    
    recordEvent({
      type: 'milestone' as StreamEventType,
      timestamp: Date.now(),
      data: { milestoneType: type, value },
    });
  }, [isRecording, recordEvent]);

  // Handle host events
  const handleHost = useCallback((hostName: string, viewerCount: number) => {
    if (!isRecording) return;
    
    recordEvent({
      type: 'host' as StreamEventType,
      timestamp: Date.now(),
      data: { hostName, viewerCount },
    });
  }, [isRecording, recordEvent]);

  // Process Twitch EventSub events
  const processTwitchEvent = useCallback((event: TwitchEvent) => {
    switch (event.type) {
      case 'channel.follow':
        handleNewFollower(1);
        break;
      case 'channel.subscribe':
      case 'channel.subscription.gift':
        handleNewSubscriber(1);
        break;
      case 'channel.cheer':
        handleBits((event.data.bits as number) || 0);
        break;
      case 'channel.raid':
        handleRaid(
          (event.data.viewers as number) || 0,
          (event.data.from_broadcaster_user_name as string) || 'Unknown'
        );
        break;
      case 'channel.poll.begin':
        handlePollCreated(
          (event.data.id as string) || '',
          (event.data.title as string) || ''
        );
        break;
      case 'channel.poll.progress':
        // Count total votes
        const choices = (event.data.choices as Array<{ votes: number }>) || [];
        const totalVotes = choices.reduce((sum, c) => sum + (c.votes || 0), 0);
        handlePollVote(totalVotes);
        break;
      case 'channel.prediction.begin':
        handlePredictionCreated(
          (event.data.id as string) || '',
          (event.data.title as string) || ''
        );
        break;
      case 'channel.prediction.progress':
        // Count total predictions
        const outcomes = (event.data.outcomes as Array<{ users: number }>) || [];
        const totalPredictions = outcomes.reduce((sum, o) => sum + (o.users || 0), 0);
        handlePredictionBet(totalPredictions);
        break;
      default:
        // Unknown event type
        break;
    }
  }, [
    handleNewFollower,
    handleNewSubscriber,
    handleBits,
    handleRaid,
    handlePollCreated,
    handlePollVote,
    handlePredictionCreated,
    handlePredictionBet,
  ]);

  // Flush message buffer periodically
  useEffect(() => {
    if (!enabled || !isRecording) return;

    flushIntervalRef.current = setInterval(() => {
      if (messageBuffer.current > 0) {
        recordMetric('chat_messages', messageBuffer.current);
        messageBuffer.current = 0;
      }
    }, 5000); // Flush every 5 seconds

    return () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };
  }, [enabled, isRecording, recordMetric]);

  // Auto-start session when enabled
  useEffect(() => {
    if (enabled && channelName && !isRecording) {
      startSession(platform, channelName);
    }
  }, [enabled, platform, channelName, isRecording, startSession]);

  return {
    isRecording,
    handleViewerUpdate,
    handleChatMessage,
    handleNewFollower,
    handleNewSubscriber,
    handleBits,
    handleRaid,
    handlePollCreated,
    handlePollVote,
    handlePredictionCreated,
    handlePredictionBet,
    handleMilestone,
    handleHost,
    processTwitchEvent,
  };
}
