// ============================================
// Connection Types
// ============================================

export type IntegrationProvider = 'streamlabs' | 'streamelements';

export interface ConnectionStatus {
  provider: IntegrationProvider;
  connected: boolean;
  lastConnected?: Date;
  latency?: number;
  error?: string;
  reconnecting?: boolean;
}

// ============================================
// Event Types
// ============================================

export type IntegrationEventType = 
  | 'donation' 
  | 'follow' 
  | 'subscription' 
  | 'raid' 
  | 'cheer' 
  | 'tip'
  | 'host'
  | 'bits';

export interface IntegrationEvent {
  id: string;
  provider: IntegrationProvider;
  type: IntegrationEventType;
  timestamp: Date;
  data: EventData;
  processed: boolean;
}

export interface EventData {
  username: string;
  displayName?: string;
  amount?: number;
  currency?: string;
  message?: string;
  tier?: '1000' | '2000' | '3000' | 'prime';
  months?: number;
  viewers?: number;
  isGift?: boolean;
  giftCount?: number;
}


// ============================================
// Streamlabs Types
// ============================================

export interface StreamlabsTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

export interface StreamlabsConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface StreamlabsDonation {
  id: string;
  name: string;
  amount: number;
  formattedAmount: string;
  currency: string;
  message: string;
  createdAt: Date;
  from: string;
}

export interface StreamlabsFollow {
  id: string;
  name: string;
  createdAt: Date;
}

export interface StreamlabsSub {
  id: string;
  name: string;
  months: number;
  message: string;
  tier: string;
  createdAt: Date;
}

export interface StreamlabsHost {
  id: string;
  name: string;
  viewers: number;
  createdAt: Date;
}

export interface StreamlabsBits {
  id: string;
  name: string;
  amount: number;
  message: string;
  createdAt: Date;
}


// ============================================
// StreamElements Types
// ============================================

export interface StreamElementsConfig {
  jwtToken: string;
  channelId?: string;
}

export interface SEtip {
  _id: string;
  username: string;
  amount: number;
  currency: string;
  message: string;
  createdAt: string;
}

export interface SEFollow {
  _id: string;
  username: string;
  createdAt: string;
}

export interface SESub {
  _id: string;
  username: string;
  tier: string;
  months: number;
  message: string;
  gifted: boolean;
  sender?: string;
  createdAt: string;
}

export interface SERaid {
  _id: string;
  username: string;
  viewers: number;
  createdAt: string;
}

export interface SECheer {
  _id: string;
  username: string;
  amount: number;
  message: string;
  createdAt: string;
}

export interface SEPoints {
  channel: string;
  username: string;
  points: number;
  rank: number;
}


// ============================================
// Event Mapping Types
// ============================================

export interface EventMapping {
  id: string;
  name: string;
  provider: IntegrationProvider;
  eventType: IntegrationEventType;
  filters: EventFilters;
  action: MappedAction;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventFilters {
  minAmount?: number;
  maxAmount?: number;
  keywords?: string[];
  usernames?: string[];
  excludeUsernames?: string[];
  tierFilter?: string[];
  minMonths?: number;
}

export interface MappedAction {
  type: 'macro' | 'notification' | 'obs' | 'webhook' | 'sound';
  macroId?: string;
  notificationConfig?: {
    title: string;
    message: string;
    channels: ('discord' | 'telegram' | 'push')[];
  };
  obsAction?: {
    type: 'scene' | 'source' | 'filter';
    sceneName?: string;
    sourceName?: string;
    filterName?: string;
    enabled?: boolean;
  };
  webhookUrl?: string;
  soundFile?: string;
}

// ============================================
// Integration Settings
// ============================================

export interface IntegrationSettings {
  streamlabs: {
    enabled: boolean;
    autoReconnect: boolean;
    reconnectInterval: number;
  };
  streamelements: {
    enabled: boolean;
    autoReconnect: boolean;
    reconnectInterval: number;
    syncPoints: boolean;
  };
  eventRetention: number; // days
  maxEventsInMemory: number;
}

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  streamlabs: {
    enabled: false,
    autoReconnect: true,
    reconnectInterval: 5000,
  },
  streamelements: {
    enabled: false,
    autoReconnect: true,
    reconnectInterval: 5000,
    syncPoints: false,
  },
  eventRetention: 30,
  maxEventsInMemory: 1000,
};
