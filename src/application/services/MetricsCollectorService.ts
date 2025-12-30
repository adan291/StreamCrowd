// MetricsCollectorService - Collects real-time metrics during stream

import {
  MetricPoint,
  MetricType,
  AGGREGATION_CONFIG,
} from '../../../types/metrics';

type FlushCallback = (data: Map<MetricType, MetricPoint[]>) => void;

export class MetricsCollectorService {
  private buffer: Map<MetricType, MetricPoint[]> = new Map();
  private sessionId: string | null = null;
  private flushCallback: FlushCallback | null = null;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  /**
   * Start collecting metrics for a session
   */
  start(sessionId: string, onFlush?: FlushCallback): void {
    if (this.isRunning) {
      this.stop();
    }

    this.sessionId = sessionId;
    this.flushCallback = onFlush || null;
    this.buffer.clear();
    this.isRunning = true;

    // Initialize buffers for all metric types
    const metricTypes: MetricType[] = [
      'viewers', 'chat_messages', 'poll_participation',
      'prediction_participation', 'followers', 'subscribers', 'bits', 'raids'
    ];
    metricTypes.forEach(type => this.buffer.set(type, []));

    // Start auto-flush interval
    this.flushInterval = setInterval(() => {
      this.flush();
    }, AGGREGATION_CONFIG.FLUSH_INTERVAL_MS);
  }

  /**
   * Stop collecting metrics
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    if (this.isRunning) {
      this.flush();
    }

    this.isRunning = false;
    this.sessionId = null;
    this.flushCallback = null;
  }

  /**
   * Record a metric value
   */
  record(type: MetricType, value: number): void {
    if (!this.isRunning) {
      console.warn('[MetricsCollector] Not running, ignoring metric');
      return;
    }

    // Validate value
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      console.warn(`[MetricsCollector] Invalid value for ${type}: ${value}`);
      return;
    }

    const point: MetricPoint = {
      timestamp: Date.now(),
      value,
    };

    const points = this.buffer.get(type);
    if (points) {
      points.push(point);
    } else {
      this.buffer.set(type, [point]);
    }
  }

  /**
   * Record multiple metrics at once
   */
  recordBatch(metrics: Partial<Record<MetricType, number>>): void {
    Object.entries(metrics).forEach(([type, value]) => {
      if (value !== undefined) {
        this.record(type as MetricType, value);
      }
    });
  }

  /**
   * Increment a counter metric
   */
  increment(type: MetricType, amount: number = 1): void {
    const points = this.buffer.get(type);
    const lastValue = points && points.length > 0 
      ? points[points.length - 1].value 
      : 0;
    this.record(type, lastValue + amount);
  }

  /**
   * Get current buffer contents
   */
  getBuffer(): Map<MetricType, MetricPoint[]> {
    return new Map(this.buffer);
  }

  /**
   * Get buffer size (total points)
   */
  getBufferSize(): number {
    let total = 0;
    this.buffer.forEach(points => {
      total += points.length;
    });
    return total;
  }

  /**
   * Flush buffer to storage
   */
  flush(): void {
    if (!this.isRunning || this.getBufferSize() === 0) {
      return;
    }

    // Create copy of buffer
    const data = new Map(this.buffer);

    // Clear buffer
    this.buffer.forEach((_, key) => {
      this.buffer.set(key, []);
    });

    // Call flush callback
    if (this.flushCallback) {
      try {
        this.flushCallback(data);
      } catch (error) {
        console.error('[MetricsCollector] Flush callback error:', error);
      }
    }
  }

  /**
   * Check if collector is running
   */
  isCollecting(): boolean {
    return this.isRunning;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get latest value for a metric
   */
  getLatestValue(type: MetricType): number | null {
    const points = this.buffer.get(type);
    if (!points || points.length === 0) {
      return null;
    }
    return points[points.length - 1].value;
  }

  /**
   * Get all latest values
   */
  getLatestValues(): Partial<Record<MetricType, number>> {
    const result: Partial<Record<MetricType, number>> = {};
    this.buffer.forEach((points, type) => {
      if (points.length > 0) {
        result[type] = points[points.length - 1].value;
      }
    });
    return result;
  }
}

// Singleton instance
export const metricsCollectorService = new MetricsCollectorService();
