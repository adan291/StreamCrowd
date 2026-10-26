/**
 * useChatMessageProcessor - single subscription to the Twitch chat that feeds
 * the chat list, macro triggers, analytics, chat poll commands and votes.
 * Extracted from App.tsx.
 *
 * The subscription is created once. Every message reads the *latest* hook APIs
 * through a ref, so callbacks never go stale (a stale processChatMessage made
 * chat macros never fire; a stale createPoll used the first moderation config).
 */
import { useEffect, useRef } from 'react';
import type React from 'react';
import { getTwitchService } from '../src/application/services/TwitchService';
import type { StoredMessage } from '../src/application/services/AnalyticsService';
import type { UsePollServiceReturn } from '../src/application/hooks/usePollService';
import type { UseModerationServiceReturn } from '../src/application/hooks/useModerationService';
import type { TwitchMessageWithRoles, UseMacroTriggersReturn } from './useMacroTriggers';
import { parseChatPollCommands, matchVoteOption } from '../src/application/utils/chatPollCommands';
import type { TwitchMessage } from '../types';

/** Max chat messages kept in memory (games read from this list) */
export const CHAT_HISTORY_LIMIT = 200;

export interface ChatMessageProcessorDeps {
  poll: UsePollServiceReturn;
  moderation: UseModerationServiceReturn;
  macroTriggers: Pick<UseMacroTriggersReturn, 'processChatMessage'>;
  addMessageToSession: (message: StoredMessage) => void;
  setChatMessages: React.Dispatch<React.SetStateAction<TwitchMessage[]>>;
}

export function useChatMessageProcessor(deps: ChatMessageProcessorDeps): void {
  const latest = useRef(deps);
  useEffect(() => {
    latest.current = deps;
  });

  useEffect(() => {
    const unsubscribe = getTwitchService().onMessage((chatMessage) => {
      const { poll, moderation, macroTriggers, addMessageToSession, setChatMessages } = latest.current;
      const message = chatMessage.message;
      const isSubscriber = chatMessage.isSubscriber ||
        (chatMessage.badges && ('subscriber' in chatMessage.badges || 'founder' in chatMessage.badges));

      const msg: TwitchMessage = {
        username: chatMessage.displayName || chatMessage.username || 'Anon',
        message,
        color: chatMessage.color || '#a970ff',
        id: chatMessage.id,
        userId: chatMessage.userId,
        isSubscriber: !!isSubscriber,
        timestamp: Date.now(),
        sourceChannel: chatMessage.sourceChannel,
      };
      setChatMessages(prev => [...prev.slice(-(CHAT_HISTORY_LIMIT - 1)), msg]);

      // Macro triggers (chat commands and keywords)
      const macroMsg: TwitchMessageWithRoles = {
        ...msg,
        isBroadcaster: chatMessage.isBroadcaster,
        isModerator: chatMessage.isModerator,
      };
      macroTriggers.processChatMessage(macroMsg);

      // Analytics session (handles "no session" internally)
      addMessageToSession({ username: msg.username, message: msg.message, timestamp: Date.now(), userId: msg.userId });

      // Chat poll commands
      const current = poll.currentPoll;
      const canControl = !!(chatMessage.isBroadcaster || chatMessage.isModerator);
      for (const command of parseChatPollCommands(message, canControl, !!current?.isActive, !!current)) {
        if (command.type === 'create') {
          poll.createPoll({ title: 'Encuesta', question: command.question, options: command.options });
          moderation.reset();
        } else if (command.type === 'end') {
          poll.setCurrentPoll(prev => (prev ? { ...prev, isActive: false } : null));
        } else {
          poll.resetPoll();
        }
      }

      // Votes, through moderation (cooldowns, weights, vote changes)
      const activePoll = poll.currentPoll;
      if (!activePoll?.isActive) return;
      const optionId = matchVoteOption(message, activePoll);
      if (optionId === null) return;

      const userId = chatMessage.userId || chatMessage.username || 'unknown';
      const result = moderation.processVote(
        {
          userId,
          username: msg.username,
          optionId,
          isSubscriber: chatMessage.isSubscriber,
          isFollower: chatMessage.badges ? 'follower' in chatMessage.badges : false,
          accountAgeDays: 365, // not available from chat; default 1 year
        },
        activePoll.options.map(o => o.id)
      );
      if (!result.isValid) return;

      if (result.isVoteChange && result.previousOptionId !== undefined && result.previousWeight !== undefined) {
        poll.updateVote(userId, result.previousOptionId, optionId, result.previousWeight, result.weight);
      } else {
        poll.addVote(
          { oderId: userId, userId, username: msg.username, optionId, timestamp: Date.now(), weight: result.weight },
          result.weight
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
}
