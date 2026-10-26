/**
 * Chat poll commands and vote matching (extracted from App.tsx).
 *
 * Pure functions, no React: easy to test and reuse.
 */
import type { Poll } from '../../domain/entities/Poll';

export const CHAT_POLL_COLORS = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6', '#8b5cf6', '#06b6d4'];

export type ChatPollCommand =
  | { type: 'create'; question: string; options: Array<{ label: string; color: string }> }
  | { type: 'end' }
  | { type: 'reset' };

/** "Pregunta | Opción1 | Opción2" → poll definition (needs a question and ≥ 2 options). */
function parsePollDefinition(text: string): ChatPollCommand | null {
  const parts = text.split('|').map(p => p.trim()).filter(p => p);
  if (parts.length < 3) return null;
  return {
    type: 'create',
    question: parts[0],
    options: parts.slice(1).map((label, i) => ({ label, color: CHAT_POLL_COLORS[i % CHAT_POLL_COLORS.length] })),
  };
}

/**
 * Poll commands found in a chat message.
 *
 * - `!poll Q | A | B`, `!endpoll`, `!resetpoll`: broadcaster/moderators only.
 * - `!pollsync Q | A | B`, `!pollend`: sync messages sent by the main panel,
 *   accepted from anyone (kept for compatibility with existing overlays).
 */
export function parseChatPollCommands(message: string, canControl: boolean, hasActivePoll: boolean, hasPoll: boolean): ChatPollCommand[] {
  const text = message.trim();
  const commands: ChatPollCommand[] = [];

  if (canControl) {
    if (text.startsWith('!poll ')) {
      const create = parsePollDefinition(text.substring(6));
      if (create) commands.push(create);
    }
    if (text === '!endpoll' && hasActivePoll) commands.push({ type: 'end' });
    if (text === '!resetpoll') commands.push({ type: 'reset' });
  }

  if (text === '!pollend' && hasPoll) commands.push({ type: 'end' });
  if (text.startsWith('!pollsync ')) {
    const create = parsePollDefinition(text.substring(10));
    if (create) commands.push(create);
  }

  return commands;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Option id a chat message votes for, or null.
 *
 * Accepts `<prefix><number>` (e.g. +2) and `<prefix><voteKey>` (e.g. #rojo).
 * In "partial" mode a key may be contained in the word or anywhere in the
 * message. The numeric id is returned as typed; the moderation step checks it
 * against the poll's option ids.
 */
export function matchVoteOption(message: string, poll: Pick<Poll, 'options' | 'votePrefix' | 'voteMatchMode'>): number | null {
  const prefix = poll.votePrefix || '+';
  const escapedPrefix = escapeRegExp(prefix);
  const text = message.trim().toLowerCase();

  const numberMatch = text.match(new RegExp(`^${escapedPrefix}(\\d+)$`, 'i'));
  if (numberMatch) return parseInt(numberMatch[1], 10);

  const matchMode = poll.voteMatchMode || 'exact';
  const keyMatch = text.match(new RegExp(`^${escapedPrefix}([a-z0-9]+)$`, 'i'));
  if (keyMatch) {
    const key = keyMatch[1].toLowerCase();
    const option = poll.options.find(o => {
      if (!o.voteKey) return false;
      const optKey = o.voteKey.toLowerCase();
      return matchMode === 'partial' ? key.includes(optKey) || optKey.includes(key) : optKey === key;
    });
    if (option) return option.id;
  }

  if (matchMode === 'partial') {
    const lower = message.toLowerCase();
    const option = poll.options.find(o => o.voteKey && lower.includes(`${prefix}${o.voteKey.toLowerCase()}`));
    if (option) return option.id;
  }

  return null;
}
