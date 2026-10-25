/**
 * Pure helpers for giveaway threads (extracted from useThreads.ts).
 */
import type { GiveawayThread, FinishedGiveaway, RaffleMode } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

/** History record for a thread that has a winner. */
export function toFinishedGiveaway(thread: GiveawayThread): FinishedGiveaway {
  return {
    id: thread.id,
    name: thread.name,
    keyword: thread.keyword,
    mode: thread.mode as RaffleMode,
    winner: thread.winner?.username ?? '',
    participantCount: new Set(thread.participants.map(p => p.oderId)).size,
    subscribersOnly: thread.subscribersOnly,
    createdAt: thread.createdAt,
    finishedAt: thread.closedAt || Date.now(),
  };
}

/**
 * - active: isActive, no winner, and no start time or start time passed
 * - scheduled: start time in the future, no winner
 * - finished: has a winner but not closed yet
 */
export function splitThreadsByState(threads: GiveawayThread[], now: number) {
  return {
    activeThreads: threads.filter(t => t.isActive && !t.winner && (!t.startsAt || t.startsAt <= now)),
    scheduledThreads: threads.filter(t => !t.winner && !!t.startsAt && t.startsAt > now),
    finishedThreads: threads.filter(t => !!t.winner),
  };
}
