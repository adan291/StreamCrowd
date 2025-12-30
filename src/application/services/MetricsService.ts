// MetricsService - Orchestrator for metrics collection and management

import {
  SessionMetrics,
  SessionSummary,
  MetricType,
  StreamEvent,
  SessionComparison,
  METRICS_STORAGE_CONFIG,
} from '../../../types/metrics';
import { MetricsCollectorService } from './MetricsCollectorService';
import { MetricsAggregatorService } from './MetricsAggregatorService';
import { SessionStorageService } from './SessionStorageService';
import { InsightsGeneratorService } from './InsightsGeneratorService';

export class MetricsService {
  private collector: MetricsCollectorService;
  private aggregator: MetricsAggregatorService;
  private storage: SessionStorageService;
  private insightsGenerator: InsightsGeneratorService;
  private currentSession: SessionMetrics | null = null;

  constructor(
    collector?: MetricsCollectorService,
    aggregator?: MetricsAggregatorService,
    storage?: SessionStorageService,
    insightsGenerator?: InsightsGeneratorService
  ) {
    this.collector = collector || new MetricsCollectorService();
    this.aggregator = aggregator || new MetricsAggregatorService();
    this.storage = storage || new SessionStorageService();
    this.insightsGenerator = insightsGenerator || new InsightsGeneratorService();
  }

  /**
   * Start a new metrics session
   */
  startSession(platform: string, channelName: string): SessionMetrics {
    // End any existing session first
    if (this.currentSession) {
      this.endSession();
    }

    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      platform,
      channelName,
      isFavorite: false,
      summary: this.createEmptySummary(),
      timeSeries: {},
      events: [],
    };

    this.collector.start(sessionId);
    
    return { ...this.currentSession };
  }

  /**
   * End the current session and persist it
   */
  async endSession(): Promise<SessionMetrics | null> {
    if (!this.currentSession) {
      return null;
    }

    this.collector.stop();
    
    // Flush any remaining metrics
    const buffer = this.collector.getBuffer();
    
    // Update time series from buffer
    for (const [metricType, points] of buffer.entries()) {
      if (points.length > 0) {
        this.currentSession.timeSeries[metricType] = {
          name: metricType,
          points: [...points],
          resolution: 'raw',
        };
      }
    }

    // Set end time
    this.currentSession.endTime = Date.now();

    // Calculate summary from time series
    this.currentSession.summary = this.aggregator.calculateSummary(
      this.currentSession.timeSeries,
      this.currentSession.events,
      this.currentSession.startTime,
      this.currentSession.endTime
    );

    // Save to storage
    await this.storage.saveSession(this.currentSession);

    const completedSession = { ...this.currentSession };
    this.currentSession = null;

    return completedSession;
  }

  /**
   * Record a metric value
   */
  recordMetric(type: MetricType, value: number): void {
    if (!this.currentSession) {
      return;
    }

    this.collector.record(type, value);
  }

  /**
   * Record a stream event
   */
  recordEvent(event: Omit<StreamEvent, 'id'>): void {
    if (!this.currentSession) {
      return;
    }

    const fullEvent: StreamEvent = {
      ...event,
      id: this.generateEventId(),
    };

    this.currentSession.events.push(fullEvent);
  }

  /**
   * Get current session metrics
   */
  getCurrentMetrics(): SessionMetrics | null {
    if (!this.currentSession) {
      return null;
    }

    // Get latest buffer data
    const buffer = this.collector.getBuffer();
    const sessionCopy = { ...this.currentSession };

    // Merge buffer into time series
    for (const [metricType, points] of buffer.entries()) {
      if (points.length > 0) {
        sessionCopy.timeSeries[metricType] = {
          name: metricType,
          points: [...points],
          resolution: 'raw',
        };
      }
    }

    return sessionCopy;
  }

  /**
   * Get all sessions from storage
   */
  async getSessions(options?: { limit?: number; offset?: number }): Promise<SessionMetrics[]> {
    return this.storage.getAllSessions(options);
  }

  /**
   * Get a specific session by ID
   */
  async getSession(id: string): Promise<SessionMetrics | null> {
    return this.storage.getSession(id);
  }

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<void> {
    await this.storage.deleteSession(id);
  }

  /**
   * Toggle favorite status for a session
   */
  async toggleFavorite(id: string): Promise<void> {
    const session = await this.storage.getSession(id);
    if (session) {
      session.isFavorite = !session.isFavorite;
      await this.storage.saveSession(session);
    }
  }

  /**
   * Compare multiple sessions
   */
  async compareSessions(ids: string[]): Promise<SessionComparison> {
    const sessions: SessionMetrics[] = [];
    
    for (const id of ids) {
      const session = await this.storage.getSession(id);
      if (session) {
        sessions.push(session);
      }
    }

    if (sessions.length < 2) {
      return {
        sessions,
        differences: [],
        highlights: ['Se necesitan al menos 2 sesiones para comparar'],
      };
    }

    const metricTypes: MetricType[] = [
      'viewers',
      'chat_messages',
      'poll_participation',
      'prediction_participation',
      'followers',
      'subscribers',
    ];

    const differences: SessionComparison['differences'] = [];

    for (const metric of metricTypes) {
      const values = sessions.map(s => this.getMetricValue(s, metric));
      const percentChanges = this.calculatePercentChanges(values);

      differences.push({
        metric,
        values,
        percentChanges,
      });
    }

    const highlights = this.generateComparisonHighlights(sessions, differences);

    return {
      sessions,
      differences,
      highlights,
    };
  }

  /**
   * Get storage usage information
   */
  async getStorageUsage(): Promise<{ used: number; limit: number }> {
    const usage = await this.storage.getStorageUsage();
    return {
      used: usage.used,
      limit: usage.limit,
    };
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(): Promise<number> {
    return this.storage.cleanupOldSessions();
  }

  /**
   * Generate insights for a session
   */
  async generateInsights(sessionId: string) {
    const session = await this.storage.getSession(sessionId);
    if (!session) {
      return [];
    }

    const historicalSessions = await this.storage.getAllSessions({ limit: 10 });
    return this.insightsGenerator.generateInsights(session, historicalSessions);
  }

  // Private helper methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createEmptySummary(): SessionSummary {
    return {
      duration: 0,
      peakViewers: 0,
      avgViewers: 0,
      totalMessages: 0,
      uniqueChatters: 0,
      pollsCreated: 0,
      pollParticipation: 0,
      predictionsCreated: 0,
      predictionParticipation: 0,
      newFollowers: 0,
      newSubscribers: 0,
    };
  }

  private getMetricValue(session: SessionMetrics, metric: MetricType): number {
    switch (metric) {
      case 'viewers':
        return session.summary.peakViewers;
      case 'chat_messages':
        return session.summary.totalMessages;
      case 'poll_participation':
        return session.summary.pollParticipation;
      case 'prediction_participation':
        return session.summary.predictionParticipation;
      case 'followers':
        return session.summary.newFollowers;
      case 'subscribers':
        return session.summary.newSubscribers;
      default:
        return 0;
    }
  }

  private calculatePercentChanges(values: number[]): number[] {
    if (values.length < 2) {
      return values.map(() => 0);
    }

    const percentChanges: number[] = [0]; // First value has no change

    for (let i = 1; i < values.length; i++) {
      const oldValue = values[i - 1];
      const newValue = values[i];

      if (oldValue === 0) {
        percentChanges.push(newValue > 0 ? 100 : 0);
      } else {
        const change = ((newValue - oldValue) / oldValue) * 100;
        percentChanges.push(Math.round(change * 10) / 10);
      }
    }

    return percentChanges;
  }

  private generateComparisonHighlights(
    sessions: SessionMetrics[],
    differences: SessionComparison['differences']
  ): string[] {
    const highlights: string[] = [];

    // Find biggest improvements
    for (const diff of differences) {
      const maxChange = Math.max(...diff.percentChanges);
      const minChange = Math.min(...diff.percentChanges);

      if (maxChange > 20) {
        const idx = diff.percentChanges.indexOf(maxChange);
        highlights.push(
          `${this.getMetricLabel(diff.metric)} aumentó ${maxChange}% en la sesión ${idx + 1}`
        );
      }

      if (minChange < -20) {
        const idx = diff.percentChanges.indexOf(minChange);
        highlights.push(
          `${this.getMetricLabel(diff.metric)} disminuyó ${Math.abs(minChange)}% en la sesión ${idx + 1}`
        );
      }
    }

    if (highlights.length === 0) {
      highlights.push('Las sesiones tienen métricas similares');
    }

    return highlights.slice(0, 5); // Limit to 5 highlights
  }

  private getMetricLabel(metric: MetricType): string {
    const labels: Record<MetricType, string> = {
      viewers: 'Viewers',
      chat_messages: 'Mensajes de chat',
      poll_participation: 'Participación en polls',
      prediction_participation: 'Participación en predicciones',
      followers: 'Nuevos seguidores',
      subscribers: 'Nuevos suscriptores',
      bits: 'Bits',
      raids: 'Raids',
    };
    return labels[metric] || metric;
  }
}

// Singleton instance
export const metricsService = new MetricsService();
