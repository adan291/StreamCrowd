/**
 * Poll Entity - Modelo de dominio para encuestas
 * 
 * Esta entidad es PURA - no tiene dependencias externas.
 * Contiene la lógica de negocio relacionada con encuestas.
 */

export interface PollOption {
  id: number;
  label: string;
  votes: number;
  color: string;
  icon?: string;
  image?: string;
  voteKey?: string;
}

export interface Poll {
  id: string;
  title: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  totalVotes: number;
  startTime: number;
  endTime?: number;
  maxVotes?: number;
  duration?: number;
  votePrefix?: string;
  voteMatchMode?: 'exact' | 'partial';
  progressBarColor?: string;
  limitIndicatorColor?: string;
}

export interface VoteRecord {
  /** Voter id (historical misspelling of "voterId", kept for compatibility) */
  oderId: string;
  /** Same value as oderId; set by the chat vote handler in App.tsx */
  userId?: string;
  username: string;
  optionId: number;
  timestamp: number;
  weight: number;
}

export interface PollResult {
  poll: Poll;
  winner: PollOption;
  totalVotes: number;
  duration: number;
  votesByOption: Array<{
    option: PollOption;
    percentage: number;
  }>;
}

/**
 * Funciones puras de dominio para encuestas
 */

export function createPoll(params: {
  title: string;
  question: string;
  options: Array<{ label: string; color: string; icon?: string; image?: string; voteKey?: string }>;
  maxVotes?: number;
  duration?: number;
  votePrefix?: string;
  voteMatchMode?: 'exact' | 'partial';
}): Poll {
  // Generate unique ID using timestamp + random string
  const uniqueId = `poll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id: uniqueId,
    title: params.title,
    question: params.question,
    options: params.options.map((o, i) => ({
      id: i + 1,
      label: o.label,
      votes: 0,
      color: o.color,
      icon: o.icon,
      image: o.image,
      voteKey: o.voteKey,
    })),
    isActive: true,
    totalVotes: 0,
    startTime: Date.now(),
    maxVotes: params.maxVotes,
    duration: params.duration,
    votePrefix: params.votePrefix || '+',
    voteMatchMode: params.voteMatchMode || 'exact',
  };
}

export function addVoteToPoll(poll: Poll, optionId: number, weight: number = 1): Poll {
  if (!poll.isActive) return poll;
  
  const newOptions = poll.options.map(o => 
    o.id === optionId 
      ? { ...o, votes: o.votes + weight }
      : o
  );
  
  const newTotalVotes = newOptions.reduce((sum, o) => sum + o.votes, 0);
  
  return {
    ...poll,
    options: newOptions,
    totalVotes: newTotalVotes,
  };
}

export function changeVoteInPoll(
  poll: Poll, 
  oldOptionId: number, 
  newOptionId: number, 
  oldWeight: number,
  newWeight: number
): Poll {
  if (!poll.isActive) return poll;
  
  const newOptions = poll.options.map(o => {
    if (o.id === oldOptionId) {
      return { ...o, votes: Math.max(0, o.votes - oldWeight) };
    }
    if (o.id === newOptionId) {
      return { ...o, votes: o.votes + newWeight };
    }
    return o;
  });
  
  return {
    ...poll,
    options: newOptions,
  };
}

export function stopPoll(poll: Poll): Poll {
  return {
    ...poll,
    isActive: false,
    endTime: Date.now(),
  };
}

export function getPollResult(poll: Poll): PollResult {
  const winner = poll.options.reduce((a, b) => a.votes > b.votes ? a : b);
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
  
  return {
    poll,
    winner,
    totalVotes,
    duration: (poll.endTime || Date.now()) - poll.startTime,
    votesByOption: poll.options.map(o => ({
      option: o,
      percentage: totalVotes > 0 ? (o.votes / totalVotes) * 100 : 0,
    })),
  };
}

export function findOptionByVote(poll: Poll, voteText: string): PollOption | null {
  const prefix = poll.votePrefix || '+';
  const text = voteText.trim().toLowerCase();
  
  // Try numeric vote (e.g., +1, +2)
  const numMatch = text.match(new RegExp(`^\\${prefix}(\\d+)$`, 'i'));
  if (numMatch) {
    const id = parseInt(numMatch[1], 10);
    return poll.options.find(o => o.id === id) || null;
  }
  
  // Try voteKey match
  const keyMatch = text.match(new RegExp(`^\\${prefix}([a-z0-9]+)$`, 'i'));
  if (keyMatch) {
    const key = keyMatch[1].toLowerCase();
    const matchMode = poll.voteMatchMode || 'exact';
    
    return poll.options.find(o => {
      if (!o.voteKey) return false;
      const optKey = o.voteKey.toLowerCase();
      if (matchMode === 'partial') {
        return key.includes(optKey) || optKey.includes(key);
      }
      return optKey === key;
    }) || null;
  }
  
  return null;
}

export function isPollExpired(poll: Poll): boolean {
  if (!poll.duration || !poll.isActive) return false;
  return Date.now() > poll.startTime + (poll.duration * 1000);
}

export function isPollAtMaxVotes(poll: Poll): boolean {
  if (!poll.maxVotes || !poll.isActive) return false;
  return poll.totalVotes >= poll.maxVotes;
}
