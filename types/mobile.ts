/**
 * Types for Mobile Companion App
 * @requirements Mobile Companion - Communication protocol
 */

// ============================================
// Connection Types
// ============================================

export interface PairingData {
  sessionId: string;
  wsUrl: string;
  token: string;
  expiresAt: number;
  channelName?: string;
}

export type MobileConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface ConnectedDevice {
  id: string;
  name: string;
  platform: 'ios' | 'android' | 'web';
  connectedAt: number;
  lastSeen: number;
}

// ============================================
// Message Types - Mobile to Desktop
// ============================================

export type MobileMessage =
  | { type: 'POLL_CREATE'; data: MobilePollCreateData }
  | { type: 'POLL_CLOSE'; data: { pollId: string } }
  | { type: 'POLL_RESET'; data: { pollId: string } }
  | { type: 'PREDICTION_CREATE'; data: MobilePredictionCreateData }
  | { type: 'PREDICTION_LOCK'; data: { predictionId: string } }
  | { type: 'PREDICTION_RESOLVE'; data: { predictionId: string; outcomeId: string } }
  | { type: 'PREDICTION_CANCEL'; data: { predictionId: string } }
  | { type: 'TIMER_START'; data: { timerId: string } }
  | { type: 'TIMER_PAUSE'; data: { timerId: string } }
  | { type: 'TIMER_RESET'; data: { timerId: string } }
  | { type: 'TIMER_CREATE'; data: MobileTimerCreateData }
  | { type: 'GIVEAWAY_START'; data: { giveawayId: string } }
  | { type: 'GIVEAWAY_DRAW'; data: { giveawayId: string } }
  | { type: 'GIVEAWAY_REROLL'; data: { giveawayId: string } }
  | { type: 'GIVEAWAY_CREATE'; data: { mode: 'viewers' | 'keyword'; keyword?: string; duration: number; name: string } }
  | { type: 'GIVEAWAY_DELETE'; data: { giveawayId: string } }
  | { type: 'GIVEAWAY_REFRESH'; data: {} }
  | { type: 'CHAT_SEND'; data: { message: string; channel?: string } }
  | { type: 'PING'; data: { timestamp: number } }
  | { type: 'REQUEST_STATE'; data: {} };

export interface MobilePollCreateData {
  question: string;
  options: string[];
  duration?: number;
  maxVotes?: number;
}

export interface MobilePredictionCreateData {
  title: string;
  outcomes: string[];
  duration: number;
}

export interface MobileTimerCreateData {
  name: string;
  duration: number;
  autoStart?: boolean;
}

// ============================================
// Message Types - Desktop to Mobile
// ============================================

export type DesktopMessage =
  | { type: 'STATE_SYNC'; data: MobileAppState }
  | { type: 'POLL_UPDATE'; data: MobilePollState }
  | { type: 'PREDICTION_UPDATE'; data: MobilePredictionState }
  | { type: 'TIMER_UPDATE'; data: MobileTimerState }
  | { type: 'GIVEAWAY_UPDATE'; data: MobileGiveawayState }
  | { type: 'CHAT_MESSAGE'; data: MobileChatMessage }
  | { type: 'NOTIFICATION'; data: MobileNotification }
  | { type: 'METRICS_UPDATE'; data: MobileMetrics }
  | { type: 'PONG'; data: { timestamp: number; serverTime: number } }
  | { type: 'ERROR'; data: { code: string; message: string } }
  | { type: 'CONNECTION_ACCEPTED'; data: { deviceId: string } };

// ============================================
// State Types
// ============================================

export interface MobileAppState {
  channelName: string;
  isLive: boolean;
  viewerCount: number;
  poll: MobilePollState | null;
  prediction: MobilePredictionState | null;
  timers: MobileTimerState[];
  giveaways: MobileGiveawayState[];
  recentChat: MobileChatMessage[];
}

export interface MobilePollState {
  id: string;
  question: string;
  options: MobilePollOption[];
  totalVotes: number;
  isActive: boolean;
  startTime: number;
  duration?: number;
  endTime?: number;
}

export interface MobilePollOption {
  id: number;
  label: string;
  votes: number;
  percentage: number;
  color: string;
}

export interface MobilePredictionState {
  id: string;
  title: string;
  outcomes: MobilePredictionOutcome[];
  status: 'active' | 'locked' | 'resolved' | 'cancelled';
  totalPoints: number;
  startTime: number;
  lockTime?: number;
  resolvedOutcomeId?: string;
}

export interface MobilePredictionOutcome {
  id: string;
  title: string;
  points: number;
  users: number;
  percentage: number;
  color: string;
}

export interface MobileTimerState {
  id: string;
  name: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
}

export interface MobileGiveawayState {
  id: string;
  name: string;
  keyword?: string;
  participantCount: number;
  isActive: boolean;
  winner?: string;
  mode: 'viewers' | 'keyword' | 'subs';
}

export interface MobileChatMessage {
  id: string;
  username: string;
  displayName: string;
  message: string;
  timestamp: number;
  isMod: boolean;
  isSubscriber: boolean;
  badges?: string[];
  color?: string;
}

export interface MobileNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  action?: {
    label: string;
    type: string;
    data?: any;
  };
}

export interface MobileMetrics {
  viewerCount: number;
  chatMessagesPerMinute: number;
  newFollowers: number;
  newSubscribers: number;
  bitsReceived: number;
}

// ============================================
// Settings Types
// ============================================

export interface MobileSettings {
  notifications: {
    enabled: boolean;
    pollEnd: boolean;
    predictionLock: boolean;
    giveawayWinner: boolean;
    timerEnd: boolean;
    newFollower: boolean;
    newSubscriber: boolean;
  };
  haptics: boolean;
  theme: 'dark' | 'light' | 'system';
  keepScreenOn: boolean;
}

export const DEFAULT_MOBILE_SETTINGS: MobileSettings = {
  notifications: {
    enabled: true,
    pollEnd: true,
    predictionLock: true,
    giveawayWinner: true,
    timerEnd: true,
    newFollower: false,
    newSubscriber: true,
  },
  haptics: true,
  theme: 'dark',
  keepScreenOn: true,
};

// ============================================
// Navigation Types
// ============================================

export type MobileScreen =
  | 'pairing'
  | 'dashboard'
  | 'polls'
  | 'predictions'
  | 'giveaways'
  | 'timers'
  | 'chat'
  | 'settings';

export type MobileTab = 'dashboard' | 'activities' | 'chat' | 'settings';
