/**
 * Chat Cursor - Tracks which chat messages a component has already processed.
 *
 * The app keeps only the last N chat messages (App.tsx caps the list at 200),
 * and the list can be cleared (channel switch, "clear chat"). Tracking progress
 * with an array index (`chatMessages.slice(lastIndex)` + `lastIndex = length`)
 * breaks in both cases: once the list is full its length stops growing, so no
 * new message is ever seen again; after a clear, the stored index is larger
 * than the new list.
 *
 * This cursor stores the last processed message object instead. Message
 * objects keep their identity when the list is trimmed, so the cursor can be
 * located again with `lastIndexOf`.
 */

import type { TwitchMessage } from '../../../types';

export interface ChatCursorRef<T> {
  current: T | null;
}

/**
 * Returns the messages that arrived after the cursor and advances the cursor
 * to the newest message.
 *
 * - Cursor empty (first run or after `markChatMessagesRead` on an empty list):
 *   every message in the list is new.
 * - Cursor not found (list cleared or rotated past it): every message in the
 *   list is new.
 */
export function takeNewChatMessages<T = TwitchMessage>(messages: readonly T[], cursorRef: ChatCursorRef<NoInfer<T>>): T[] {
  const last = cursorRef.current;
  let start = 0;

  if (last !== null) {
    const index = messages.lastIndexOf(last);
    start = index >= 0 ? index + 1 : 0;
  }

  if (messages.length > 0) {
    cursorRef.current = messages[messages.length - 1];
  }

  return messages.slice(start);
}

/**
 * Marks every current message as processed (used when a game round starts or
 * resets, so older messages are ignored).
 */
export function markChatMessagesRead<T = TwitchMessage>(messages: readonly T[], cursorRef: ChatCursorRef<NoInfer<T>>): void {
  cursorRef.current = messages.length > 0 ? messages[messages.length - 1] : null;
}
