/**
 * Vote Processing Utilities
 * 
 * Unified vote processing for multi-platform support.
 * Handles vote parsing, aggregation, and display across all platforms.
 * 
 * @requirements 4.5 - Process YouTube chat votes using same format as Twitch
 * @requirements 5.5 - Process Kick chat votes using same format as Twitch
 * @requirements 6.2 - Aggregate votes from all platforms
 * @requirements 6.3 - Display which platform each vote came from
 */

import type {
  Platform,
  ChatMessage,
  PlatformVote,
  AggregatedVotes,
} from '../../../types/platform';

// ============================================
// VOTE PATTERN CONSTANTS
// ============================================

/**
 * Vote pattern regex - matches +1, +2, +key format
 * @requirements 4.5, 5.5 - Same vote format across platforms
 */
export const VOTE_PATTERN = /^\+(\d+|[a-zA-Z]+)$/;

/**
 * Alternative vote patterns for flexibility
 */
export const ALTERNATIVE_VOTE_PATTERNS = [
  /^(\d+)$/, // Just a number: 1, 2, 3
  /^#(\d+|[a-zA-Z]+)$/, // Hash format: #1, #2, #a
];

// ============================================
// VOTE PARSING
// ============================================

/**
 * Parse a vote from a message using the standard format
 * @param message - Chat message to parse
 * @returns Vote value if message is a vote, null otherwise
 */
export function parseVote(message: string): string | null {
  const trimmed = message.trim();
  
  // Try standard format first (+1, +2, +key)
  const standardMatch = trimmed.match(VOTE_PATTERN);
  if (standardMatch) {
    return standardMatch[1];
  }
  
  return null;
}

/**
 * Parse a vote with alternative formats
 * @param message - Chat message to parse
 * @param allowAlternatives - Whether to allow alternative formats
 * @returns Vote value if message is a vote, null otherwise
 */
export function parseVoteExtended(
  message: string,
  allowAlternatives = false
): string | null {
  const standardVote = parseVote(message);
  if (standardVote) {
    return standardVote;
  }
  
  if (allowAlternatives) {
    const trimmed = message.trim();
    for (const pattern of ALTERNATIVE_VOTE_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        return match[1];
      }
    }
  }
  
  return null;
}

/**
 * Check if a message is a vote
 * @param message - Chat message to check
 * @returns True if message is a vote
 */
export function isVote(message: string): boolean {
  return parseVote(message) !== null;
}

// ============================================
// VOTE CREATION
// ============================================

/**
 * Create a PlatformVote from a ChatMessage
 * @requirements 6.3 - Display which platform each vote came from
 */
export function createVoteFromMessage(message: ChatMessage): PlatformVote | null {
  const voteValue = parseVote(message.message);
  if (!voteValue) {
    return null;
  }
  
  return {
    id: `vote_${message.id}`,
    platform: message.platform,
    username: message.username,
    displayName: message.displayName,
    voteValue,
    timestamp: message.timestamp,
    messageId: message.id,
  };
}

// ============================================
// VOTE AGGREGATION
// ============================================

/**
 * Aggregate votes by option
 * @requirements 6.2 - Aggregate votes from all platforms
 */
export function aggregateVotes(votes: PlatformVote[]): AggregatedVotes[] {
  const aggregation = new Map<string, AggregatedVotes>();
  
  for (const vote of votes) {
    const existing = aggregation.get(vote.voteValue);
    
    if (existing) {
      existing.total += 1;
      existing.byPlatform[vote.platform] = (existing.byPlatform[vote.platform] || 0) + 1;
    } else {
      aggregation.set(vote.voteValue, {
        option: vote.voteValue,
        total: 1,
        byPlatform: {
          twitch: vote.platform === 'twitch' ? 1 : 0,
          youtube: vote.platform === 'youtube' ? 1 : 0,
          kick: vote.platform === 'kick' ? 1 : 0,
        },
      });
    }
  }
  
  return Array.from(aggregation.values());
}

/**
 * Add a vote to existing aggregation
 */
export function addVoteToAggregation(
  aggregation: AggregatedVotes[],
  vote: PlatformVote
): AggregatedVotes[] {
  const existingIndex = aggregation.findIndex(a => a.option === vote.voteValue);
  
  if (existingIndex >= 0) {
    return aggregation.map((a, i) => {
      if (i === existingIndex) {
        return {
          ...a,
          total: a.total + 1,
          byPlatform: {
            ...a.byPlatform,
            [vote.platform]: (a.byPlatform[vote.platform] || 0) + 1,
          },
        };
      }
      return a;
    });
  }
  
  return [
    ...aggregation,
    {
      option: vote.voteValue,
      total: 1,
      byPlatform: {
        twitch: vote.platform === 'twitch' ? 1 : 0,
        youtube: vote.platform === 'youtube' ? 1 : 0,
        kick: vote.platform === 'kick' ? 1 : 0,
      },
    },
  ];
}

/**
 * Get total votes across all platforms
 */
export function getTotalVotes(aggregation: AggregatedVotes[]): number {
  return aggregation.reduce((sum, a) => sum + a.total, 0);
}

/**
 * Get votes by platform
 */
export function getVotesByPlatform(
  aggregation: AggregatedVotes[],
  platform: Platform
): number {
  return aggregation.reduce((sum, a) => sum + (a.byPlatform[platform] || 0), 0);
}

/**
 * Get winning option(s)
 */
export function getWinningOptions(aggregation: AggregatedVotes[]): AggregatedVotes[] {
  if (aggregation.length === 0) {
    return [];
  }
  
  const maxVotes = Math.max(...aggregation.map(a => a.total));
  return aggregation.filter(a => a.total === maxVotes);
}

// ============================================
// VOTE FILTERING
// ============================================

/**
 * Filter votes by platform
 */
export function filterVotesByPlatform(
  votes: PlatformVote[],
  platforms: Platform[]
): PlatformVote[] {
  return votes.filter(v => platforms.includes(v.platform));
}

/**
 * Filter votes by time range
 */
export function filterVotesByTimeRange(
  votes: PlatformVote[],
  startTime: number,
  endTime: number
): PlatformVote[] {
  return votes.filter(v => v.timestamp >= startTime && v.timestamp <= endTime);
}

/**
 * Filter votes by option
 */
export function filterVotesByOption(
  votes: PlatformVote[],
  options: string[]
): PlatformVote[] {
  return votes.filter(v => options.includes(v.voteValue));
}

/**
 * Get unique voters
 */
export function getUniqueVoters(votes: PlatformVote[]): Set<string> {
  return new Set(votes.map(v => `${v.platform}:${v.username}`));
}

/**
 * Deduplicate votes (one vote per user per platform)
 */
export function deduplicateVotes(votes: PlatformVote[]): PlatformVote[] {
  const seen = new Set<string>();
  const result: PlatformVote[] = [];
  
  // Process in reverse to keep the latest vote
  for (let i = votes.length - 1; i >= 0; i--) {
    const vote = votes[i];
    const key = `${vote.platform}:${vote.username}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      result.unshift(vote);
    }
  }
  
  return result;
}

// ============================================
// VOTE DISPLAY HELPERS
// ============================================

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: Platform): string {
  switch (platform) {
    case 'twitch':
      return 'Twitch';
    case 'youtube':
      return 'YouTube';
    case 'kick':
      return 'Kick';
    default:
      return platform;
  }
}

/**
 * Get platform color
 */
export function getPlatformColor(platform: Platform): string {
  switch (platform) {
    case 'twitch':
      return '#9146FF';
    case 'youtube':
      return '#FF0000';
    case 'kick':
      return '#53FC18';
    default:
      return '#888888';
  }
}

/**
 * Format vote count with platform breakdown
 * @requirements 6.3 - Display which platform each vote came from
 */
export function formatVoteBreakdown(aggregated: AggregatedVotes): string {
  const parts: string[] = [];
  
  if (aggregated.byPlatform.twitch > 0) {
    parts.push(`Twitch: ${aggregated.byPlatform.twitch}`);
  }
  if (aggregated.byPlatform.youtube > 0) {
    parts.push(`YouTube: ${aggregated.byPlatform.youtube}`);
  }
  if (aggregated.byPlatform.kick > 0) {
    parts.push(`Kick: ${aggregated.byPlatform.kick}`);
  }
  
  return parts.join(' | ');
}
