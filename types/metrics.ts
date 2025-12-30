// Metrics Types for TwitchVote Dashboard

// Metric point with timestamp and value
export interface MetricPoint {
  timestamp: number;
  value: number;
}

// Time series data with resolution info
export interface TimeSeries {
  name: string;
  points: MetricPoint[];
  resolution: 'raw' | '1min' | '5min';
}

// Types of metrics tracked
export type MetricType =
  | 'viewers'
  | 'chat_messages'
  | 'poll_participation'
  | 'prediction_participation'
  | 'followers'
  | 'subscribers'
  | 'bits'
  | 'raids';

// Stream event types
export type StreamEventType = 'poll' | 'prediction' | 'raid' | 'host' | 'milestone';

// Stream event record
export interface StreamEvent {
  id: string;
  type: StreamEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

// Session summary statistics
export interface SessionSummary {
  duration: number;
  peakViewers: number;
  avgViewers: number;
  totalMessages: number;
  uniqueChatters: number;
  pollsCreated: number;
  pollParticipation: number;
  predictionsCreated: number;
  predictionParticipation: number;
  newFollowers: number;
  newSubscribers: number;
}

// Complete session metrics
export interface SessionMetrics {
  id: string;
  startTime: number;
  endTime?: number;
  platform: string;
  channelName: string;
  isFavorite: boolean;
  summary: SessionSummary;
  timeSeries: Partial<Record<MetricType, TimeSeries>>;
  events: StreamEvent[];
}

// Insight types
export type InsightType =
  | 'peak_correlation'
  | 'engagement_trend'
  | 'optimal_time'
  | 'chatter_retention'
  | 'growth_pattern'
  | 'comparison_highlight';

// Generated insight
export interface Insight {
  id: string;
  sessionId: string;
  type: InsightType;
  title: string;
  description: string;
  suggestedAction?: string;
  confidence: number; // 0-1
  data: Record<string, unknown>;
  feedback?: 'useful' | 'not_useful';
  createdAt: number;
}

// Dashboard widget types
export type WidgetType =
  | 'viewers_chart'
  | 'chat_chart'
  | 'engagement_chart'
  | 'summary_card'
  | 'top_chatters'
  | 'events_timeline'
  | 'insights_list'
  | 'comparison_chart';

// Widget position and size
export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

// Dashboard widget configuration
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  position: WidgetPosition;
  size: WidgetSize;
  config: Record<string, unknown>;
}

// Dashboard layout configuration
export interface DashboardLayout {
  id: string;
  widgets: DashboardWidget[];
  compactMode: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

// Session comparison result
export interface SessionComparison {
  sessions: SessionMetrics[];
  differences: {
    metric: MetricType;
    values: number[];
    percentChanges: number[];
  }[];
  highlights: string[];
}

// Time window options
export type TimeWindow = '5min' | '15min' | '30min' | '1h' | 'all';

// Export options
export interface ExportOptions {
  dateRange?: { start: number; end: number };
  metrics?: MetricType[];
  includeEvents?: boolean;
  includeInsights?: boolean;
  format: 'csv' | 'pdf';
}

// Storage configuration
export const METRICS_STORAGE_CONFIG = {
  DB_NAME: 'twitchvote_metrics',
  DB_VERSION: 1,
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_SESSIONS: 100,
  RETENTION_DAYS: 30,
  FAVORITE_RETENTION_DAYS: 365,
};

// Aggregation thresholds
export const AGGREGATION_CONFIG = {
  RAW_THRESHOLD_MS: 24 * 60 * 60 * 1000, // 24h
  ONE_MIN_THRESHOLD_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  COLLECTION_INTERVAL_MS: 5000, // 5 seconds
  FLUSH_INTERVAL_MS: 30000, // 30 seconds
};

// Storage keys
export const METRICS_STORAGE_KEYS = {
  CURRENT_SESSION: 'twitchvote_current_session',
  DASHBOARD_LAYOUT: 'twitchvote_dashboard_layout',
};
