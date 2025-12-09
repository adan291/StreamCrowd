export interface PollOption {
  id: number;
  label: string;
  votes: number;
  color: string;
  icon?: string;
  image?: string; // Base64 or URL
}

export interface VoteRecord {
  userId: string;
  username: string;
  optionId: number;
  timestamp: number;
}

export interface Poll {
  id: string;
  title?: string; // Custom title for the dashboard section
  question: string;
  options: PollOption[];
  isActive: boolean;
  totalVotes: number;
  startTime: number;
  maxVotes?: number; // Optional limit
}

export interface SavedPoll {
  id: string;
  title?: string;
  question: string;
  options: { label: string; color: string; icon?: string; image?: string }[];
  maxVotes?: number;
  isFavorite?: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  data: string; // Base64
  date: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface TwitchMessage {
  username: string;
  message: string;
  color?: string;
  id?: string;
  userId?: string;
}