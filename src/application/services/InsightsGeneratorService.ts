// InsightsGeneratorService - Generates insights from session metrics

import {
  SessionMetrics,
  Insight,
  InsightType,
  MetricType,
} from '../../../types/metrics';
import { metricsAggregatorService } from './MetricsAggregatorService';

export class InsightsGeneratorService {
  private readonly MIN_INSIGHTS = 3;

  /**
   * Generate insights for a session
   */
  generateInsights(
    session: SessionMetrics,
    historicalSessions: SessionMetrics[] = []
  ): Insight[] {
    const insights: Insight[] = [];

    // Detect peak correlations
    insights.push(...this.detectPeakCorrelations(session));

    // Detect engagement trends
    if (historicalSessions.length > 0) {
      insights.push(...this.detectTrends(historicalSessions.concat(session)));
    }

    // Detect optimal times
    insights.push(...this.detectOptimalTimes(session));

    // Detect growth patterns
    insights.push(...this.detectGrowthPatterns(session));

    // Compare with historical if available
    if (historicalSessions.length > 0) {
      insights.push(...this.detectComparisonHighlights(session, historicalSessions));
    }

    // Ensure minimum insights
    if (insights.length < this.MIN_INSIGHTS) {
      insights.push(...this.generateBasicInsights(session, this.MIN_INSIGHTS - insights.length));
    }

    return insights;
  }

  /**
   * Detect correlations between viewer peaks and events
   */
  detectPeakCorrelations(session: SessionMetrics): Insight[] {
    const insights: Insight[] = [];
    const viewersSeries = session.timeSeries.viewers;

    if (!viewersSeries || viewersSeries.points.length < 5) {
      return insights;
    }

    // Find peaks (local maxima)
    const peaks = this.findPeaks(viewersSeries.points.map(p => p.value));
    
    for (const peakIndex of peaks.slice(0, 3)) { // Top 3 peaks
      const peakTime = viewersSeries.points[peakIndex].timestamp;
      const peakValue = viewersSeries.points[peakIndex].value;

      // Find events near this peak (within 5 minutes)
      const nearbyEvents = session.events.filter(e => 
        Math.abs(e.timestamp - peakTime) < 5 * 60 * 1000
      );

      if (nearbyEvents.length > 0) {
        const event = nearbyEvents[0];
        insights.push({
          id: this.generateId(),
          sessionId: session.id,
          type: 'peak_correlation',
          title: `Pico de ${peakValue} viewers`,
          description: `El pico de audiencia coincidió con un evento de tipo "${event.type}". Considera repetir este tipo de contenido.`,
          suggestedAction: `Programa más eventos de tipo "${event.type}" durante tus streams.`,
          confidence: 0.8,
          data: { peakValue, eventType: event.type, eventData: event.data },
          createdAt: Date.now(),
        });
      }
    }

    return insights;
  }

  /**
   * Detect trends across sessions
   */
  detectTrends(sessions: SessionMetrics[]): Insight[] {
    const insights: Insight[] = [];

    if (sessions.length < 3) return insights;

    // Sort by start time
    const sorted = [...sessions].sort((a, b) => a.startTime - b.startTime);
    const recent = sorted.slice(-5); // Last 5 sessions

    // Calculate average viewers trend
    const avgViewers = recent.map(s => s.summary.avgViewers);
    const trend = this.calculateTrend(avgViewers);

    if (Math.abs(trend) > 0.1) {
      const trendType = trend > 0 ? 'crecimiento' : 'declive';
      const percentage = Math.abs(Math.round(trend * 100));

      insights.push({
        id: this.generateId(),
        sessionId: sessions[sessions.length - 1].id,
        type: 'engagement_trend',
        title: `Tendencia de ${trendType} en audiencia`,
        description: `Tu audiencia promedio ha ${trend > 0 ? 'aumentado' : 'disminuido'} un ${percentage}% en las últimas sesiones.`,
        suggestedAction: trend > 0 
          ? 'Sigue con la estrategia actual, está funcionando.'
          : 'Considera variar el contenido o los horarios de stream.',
        confidence: 0.7,
        data: { trend, avgViewers, percentage },
        createdAt: Date.now(),
      });
    }

    return insights;
  }

  /**
   * Detect optimal times for engagement
   */
  detectOptimalTimes(session: SessionMetrics): Insight[] {
    const insights: Insight[] = [];
    
    // Find when polls/predictions had highest participation
    const pollEvents = session.events.filter(e => e.type === 'poll');
    const predictionEvents = session.events.filter(e => e.type === 'prediction');

    if (pollEvents.length >= 2) {
      // Analyze poll timing
      const sessionDuration = (session.endTime || Date.now()) - session.startTime;
      const pollTimes = pollEvents.map(e => (e.timestamp - session.startTime) / sessionDuration);
      const avgPollTime = pollTimes.reduce((a, b) => a + b, 0) / pollTimes.length;

      const timeDescription = avgPollTime < 0.33 ? 'inicio' : avgPollTime < 0.66 ? 'mitad' : 'final';

      insights.push({
        id: this.generateId(),
        sessionId: session.id,
        type: 'optimal_time',
        title: 'Mejor momento para encuestas',
        description: `Tus encuestas funcionan mejor durante el ${timeDescription} del stream.`,
        suggestedAction: `Programa tus encuestas principales durante el ${timeDescription} del stream.`,
        confidence: 0.6,
        data: { avgPollTime, pollCount: pollEvents.length },
        createdAt: Date.now(),
      });
    }

    return insights;
  }

  /**
   * Detect growth patterns
   */
  detectGrowthPatterns(session: SessionMetrics): Insight[] {
    const insights: Insight[] = [];

    const { newFollowers, newSubscribers, peakViewers, avgViewers } = session.summary;

    // Follower conversion rate
    if (peakViewers > 0 && newFollowers > 0) {
      const conversionRate = (newFollowers / peakViewers) * 100;

      if (conversionRate > 5) {
        insights.push({
          id: this.generateId(),
          sessionId: session.id,
          type: 'growth_pattern',
          title: 'Alta conversión de followers',
          description: `${conversionRate.toFixed(1)}% de tus viewers se convirtieron en followers. ¡Excelente!`,
          suggestedAction: 'Mantén el contenido que atrae nuevos seguidores.',
          confidence: 0.85,
          data: { conversionRate, newFollowers, peakViewers },
          createdAt: Date.now(),
        });
      }
    }

    // Viewer retention
    if (peakViewers > 0 && avgViewers > 0) {
      const retention = (avgViewers / peakViewers) * 100;

      if (retention > 70) {
        insights.push({
          id: this.generateId(),
          sessionId: session.id,
          type: 'chatter_retention',
          title: 'Excelente retención de audiencia',
          description: `Mantuviste el ${retention.toFixed(0)}% de tu audiencia pico durante el stream.`,
          confidence: 0.9,
          data: { retention, peakViewers, avgViewers },
          createdAt: Date.now(),
        });
      }
    }

    return insights;
  }

  /**
   * Detect comparison highlights with historical sessions
   */
  detectComparisonHighlights(
    current: SessionMetrics,
    historical: SessionMetrics[]
  ): Insight[] {
    const insights: Insight[] = [];

    // Calculate historical averages
    const avgPeakViewers = historical.reduce((sum, s) => sum + s.summary.peakViewers, 0) / historical.length;
    const avgMessages = historical.reduce((sum, s) => sum + s.summary.totalMessages, 0) / historical.length;

    // Compare current session
    if (current.summary.peakViewers > avgPeakViewers * 1.2) {
      const increase = ((current.summary.peakViewers - avgPeakViewers) / avgPeakViewers) * 100;
      
      insights.push({
        id: this.generateId(),
        sessionId: current.id,
        type: 'comparison_highlight',
        title: 'Audiencia por encima del promedio',
        description: `Tu pico de viewers fue ${increase.toFixed(0)}% mayor que tu promedio histórico.`,
        suggestedAction: 'Analiza qué hiciste diferente en este stream.',
        confidence: 0.75,
        data: { current: current.summary.peakViewers, average: avgPeakViewers, increase },
        createdAt: Date.now(),
      });
    }

    if (current.summary.totalMessages > avgMessages * 1.3) {
      const increase = ((current.summary.totalMessages - avgMessages) / avgMessages) * 100;
      
      insights.push({
        id: this.generateId(),
        sessionId: current.id,
        type: 'comparison_highlight',
        title: 'Chat muy activo',
        description: `El chat tuvo ${increase.toFixed(0)}% más mensajes que tu promedio.`,
        confidence: 0.7,
        data: { current: current.summary.totalMessages, average: avgMessages, increase },
        createdAt: Date.now(),
      });
    }

    return insights;
  }

  /**
   * Generate basic insights when not enough data
   */
  private generateBasicInsights(session: SessionMetrics, count: number): Insight[] {
    const insights: Insight[] = [];
    const { summary } = session;

    if (count > 0 && summary.peakViewers > 0) {
      insights.push({
        id: this.generateId(),
        sessionId: session.id,
        type: 'growth_pattern',
        title: 'Resumen de audiencia',
        description: `Alcanzaste ${summary.peakViewers} viewers con un promedio de ${summary.avgViewers}.`,
        confidence: 1.0,
        data: { peakViewers: summary.peakViewers, avgViewers: summary.avgViewers },
        createdAt: Date.now(),
      });
    }

    if (insights.length < count && summary.totalMessages > 0) {
      insights.push({
        id: this.generateId(),
        sessionId: session.id,
        type: 'engagement_trend',
        title: 'Actividad del chat',
        description: `Tu chat tuvo ${summary.totalMessages} mensajes de ${summary.uniqueChatters} usuarios únicos.`,
        confidence: 1.0,
        data: { totalMessages: summary.totalMessages, uniqueChatters: summary.uniqueChatters },
        createdAt: Date.now(),
      });
    }

    if (insights.length < count) {
      const durationHours = Math.round(summary.duration / (60 * 60 * 1000) * 10) / 10;
      insights.push({
        id: this.generateId(),
        sessionId: session.id,
        type: 'growth_pattern',
        title: 'Duración del stream',
        description: `Tu stream duró ${durationHours} horas.`,
        confidence: 1.0,
        data: { duration: summary.duration, durationHours },
        createdAt: Date.now(),
      });
    }

    return insights.slice(0, count);
  }

  /**
   * Provide feedback on an insight
   */
  provideFeedback(insightId: string, feedback: 'useful' | 'not_useful'): void {
    // This would typically update the insight in storage
    // For now, just log it
    console.log(`[Insights] Feedback for ${insightId}: ${feedback}`);
  }

  // ============ Helpers ============

  private findPeaks(values: number[]): number[] {
    const peaks: number[] = [];
    
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push(i);
      }
    }

    // Sort by value descending
    peaks.sort((a, b) => values[b] - values[a]);
    
    return peaks;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const first = values.slice(0, Math.ceil(values.length / 2));
    const second = values.slice(Math.ceil(values.length / 2));

    const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
    const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;

    if (avgFirst === 0) return 0;
    
    return (avgSecond - avgFirst) / avgFirst;
  }

  private generateId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance
export const insightsGeneratorService = new InsightsGeneratorService();
