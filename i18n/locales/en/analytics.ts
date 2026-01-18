/**
 * English (EN) Analytics Translations
 * 
 * Analytics and metrics translations for stream insights.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { AnalyticsTranslations } from '../../types';

/**
 * Analytics English translations
 * Stream analytics, chat sentiment, and engagement metrics
 */
export const analytics: AnalyticsTranslations = {
  title: 'Analytics',
  configureAI: 'Configure AI',
  aiActive: 'AI Active',
  noData: 'No data available',
  live: 'Live',
  history: 'History',
  activeSession: 'Active session',
  noActiveStream: 'No active stream',
  connectToSee: 'Connect to a channel to see analytics',
  uniqueViewers: 'Unique viewers',
  messages: 'Messages',
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  engagement: 'Engagement',
  mainTopics: 'Main topics',
  frequentWords: 'Frequent words',
  mostUsedEmotes: 'Most used emotes',
  mostActiveViewers: 'Most active viewers',
  msgs: 'msgs',
  sessionsThisDay: 'Sessions this day',
  totalMessages: 'Total messages',
  noSessionsDate: 'No sessions on this date',
  exportData: 'Export data',
  loading: 'Loading...',
};

export default analytics;