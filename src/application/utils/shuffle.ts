/**
 * Shuffle utilities.
 *
 * `array.sort(() => Math.random() - 0.5)` is NOT a fair shuffle: the comparator
 * is inconsistent, and with the engine's sort algorithm items tend to stay
 * close to their original position (e.g. a trivia answer stored last ends up
 * last more often than 1/4 of the time). Use these helpers instead.
 */

/** Returns a new array with the items in uniformly random order (Fisher-Yates). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sorts by a numeric key (ascending) and breaks ties uniformly at random:
 * shuffle first, then a stable sort keeps the random order inside each tie.
 */
export function sortByKeyRandomTies<T>(
  items: readonly T[],
  key: (item: T) => number,
  random: () => number = Math.random
): T[] {
  return shuffle(items, random).sort((a, b) => key(a) - key(b));
}
