// MetricsAggregatorService - Aggregates and compresses metrics data

import {
  MetricPoint,
  TimeSeries,
  SessionMetrics,
  SessionSummary,
  MetricType,
  StreamEvent,
  AGGREGATION_CONFIG,
} from '../../../types/metrics';

export class MetricsAggregatorService {
  /**
   * Aggregate time series to lower resolution
   * Preserves sums for count metrics, preserves max/min for value metrics
   */
  aggregate(series: TimeSeries, targetResolution: '1min' | '5min'): TimeSeries {
    if (series.points.length === 0) {
      return { ...series, resolution: targetResolution };
    }

    const intervalMs = targetResolution === '1min' ? 60000 : 300000;
    const aggregatedPoints: MetricPoint[] = [];
    
    // Group points by interval
    const buckets = new Map<number, MetricPoint[]>();
    
    for (const point of series.points) {
      const bucketKey = Math.floor(point.timestamp / intervalMs) * intervalMs;
      const bucket = buckets.get(bucketKey) || [];
      bucket.push(point);
      buckets.set(bucketKey, bucket);
    }

    // Aggregate each bucket
    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
    
    for (const key of sortedKeys) {
      const bucket = buckets.get(key)!;
      const aggregatedValue = this.aggregateBucket(bucket, series.name as MetricType);
      
      aggregatedPoints.push({
        timestamp: key,
        value: aggregatedValue,
      });
    }

    return {
      name: series.name,
      points: aggregatedPoints,
      resolution: targetResolution,
    };
  }

  /**
   * Aggregate a bucket of points based on metric type
   */
  private aggregateBucket(points: MetricPoint[], metricType: MetricType): number {
    if (points.length === 0) return 0;

    // Count metrics: sum values
    const countMetrics: MetricType[] = ['chat_messages', 'followers', 'subscribers', 'bits', 'raids'];
    
    if (countMetrics.includes(metricType)) {
      return points.reduce((sum, p) => sum + p.value, 0);
    }

    // Value metrics: use average (preserves trend while reducing noise)
    // But also track max for viewers
    if (metricType === 'viewers') {
      // For viewers, use max to preserve peaks
      return Math.max(...points.map(p => p.value));
    }

    // For participation rates, use average
    return points.reduce((sum, p) => sum + p.value, 0) / points.length;
  }

  /**
   * Calculate sum of all points in a series
   */
  calculateSum(series: TimeSeries): number {
    return series.points.reduce((sum, p) => sum + p.value, 0);
  }

  /**
   * Calculate max value in a series
   */
  calculateMax(series: TimeSeries): number {
    if (series.points.length === 0) return 0;
    return Math.max(...series.points.map(p => p.value));
  }

  /**
   * Calculate min value in a series
   */
  calculateMin(series: TimeSeries): number {
    if (series.points.length === 0) return 0;
    return Math.min(...series.points.map(p => p.value));
  }

  /**
   * Calculate average value in a series
   */
  calculateAverage(series: TimeSeries): number {
    if (series.points.length === 0) return 0;
    return this.calculateSum(series) / series.points.length;
  }

  /**
   * Compress session data using CompressionStream API
   */
  async compress(data: SessionMetrics): Promise<Uint8Array> {
    const jsonStr = JSON.stringify(data);
    const encoder = new TextEncoder();
    const inputData = encoder.encode(jsonStr);

    // Check if CompressionStream is available
    if (typeof CompressionStream === 'undefined') {
      // Fallback: return uncompressed
      return inputData;
    }

    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(inputData);
    writer.close();

    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Decompress session data
   */
  async decompress(data: Uint8Array): Promise<SessionMetrics> {
    // Check if DecompressionStream is available
    if (typeof DecompressionStream === 'undefined') {
      // Fallback: assume uncompressed
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(data));
    }

    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();

    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(result));
  }

  /**
   * Calculate session summary from time series data
   */
  calculateSummary(
    timeSeries: Partial<Record<MetricType, TimeSeries>>,
    events: StreamEvent[],
    startTime: number,
    endTime?: number
  ): SessionSummary {
    const viewersSeries = timeSeries.viewers;
    const chatSeries = timeSeries.chat_messages;
    const pollSeries = timeSeries.poll_participation;
    const predictionSeries = timeSeries.prediction_participation;
    const followersSeries = timeSeries.followers;
    const subscribersSeries = timeSeries.subscribers;

    // Calculate duration
    const duration = (endTime || Date.now()) - startTime;

    // Viewers stats
    const peakViewers = viewersSeries ? this.calculateMax(viewersSeries) : 0;
    const avgViewers = viewersSeries ? Math.round(this.calculateAverage(viewersSeries)) : 0;

    // Chat stats
    const totalMessages = chatSeries ? this.calculateSum(chatSeries) : 0;
    const uniqueChatters = this.countUniqueChatters(events);

    // Poll stats
    const pollEvents = events.filter(e => e.type === 'poll');
    const pollsCreated = pollEvents.length;
    const pollParticipation = pollSeries ? Math.round(this.calculateAverage(pollSeries)) : 0;

    // Prediction stats
    const predictionEvents = events.filter(e => e.type === 'prediction');
    const predictionsCreated = predictionEvents.length;
    const predictionParticipation = predictionSeries 
      ? Math.round(this.calculateAverage(predictionSeries)) 
      : 0;

    // Growth stats
    const newFollowers = followersSeries ? this.calculateSum(followersSeries) : 0;
    const newSubscribers = subscribersSeries ? this.calculateSum(subscribersSeries) : 0;

    return {
      duration,
      peakViewers,
      avgViewers,
      totalMessages,
      uniqueChatters,
      pollsCreated,
      pollParticipation,
      predictionsCreated,
      predictionParticipation,
      newFollowers,
      newSubscribers,
    };
  }

  /**
   * Count unique chatters from events
   */
  private countUniqueChatters(events: StreamEvent[]): number {
    const chatters = new Set<string>();
    events.forEach(event => {
      if (event.data.user_id) {
        chatters.add(event.data.user_id as string);
      }
    });
    return chatters.size;
  }

  /**
   * Determine if series needs aggregation based on age
   */
  needsAggregation(series: TimeSeries, currentTime: number = Date.now()): '1min' | '5min' | null {
    if (series.points.length === 0) return null;

    const oldestPoint = Math.min(...series.points.map(p => p.timestamp));
    const age = currentTime - oldestPoint;

    if (series.resolution === 'raw' && age > AGGREGATION_CONFIG.RAW_THRESHOLD_MS) {
      return '1min';
    }

    if (series.resolution === '1min' && age > AGGREGATION_CONFIG.ONE_MIN_THRESHOLD_MS) {
      return '5min';
    }

    return null;
  }

  /**
   * Sort time series points by timestamp
   */
  sortByTimestamp(series: TimeSeries): TimeSeries {
    return {
      ...series,
      points: [...series.points].sort((a, b) => a.timestamp - b.timestamp),
    };
  }

  /**
   * Verify points are sorted by timestamp
   */
  isSorted(series: TimeSeries): boolean {
    for (let i = 1; i < series.points.length; i++) {
      if (series.points[i].timestamp < series.points[i - 1].timestamp) {
        return false;
      }
    }
    return true;
  }
}

// Singleton instance
export const metricsAggregatorService = new MetricsAggregatorService();
