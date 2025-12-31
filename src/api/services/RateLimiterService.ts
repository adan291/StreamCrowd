// Rate Limiter Service - Control de rate limiting por API Key
import { RateLimitConfig, RateLimitStatus, RateLimitEntry, APIException } from '../../../types/api';

const DEFAULT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_MAX_REQUESTS = 60; // 60 requests per minute

export class RateLimiterService {
  private entries: Map<string, RateLimitEntry> = new Map();
  private defaultConfig: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.defaultConfig = {
      windowMs: config?.windowMs ?? DEFAULT_WINDOW_MS,
      maxRequests: config?.maxRequests ?? DEFAULT_MAX_REQUESTS
    };
  }

  // ============================================
  // Rate Limit Checking
  // ============================================

  checkLimit(keyId: string, customLimit?: number): RateLimitStatus {
    const now = Date.now();
    const limit = customLimit ?? this.defaultConfig.maxRequests;
    const windowMs = this.defaultConfig.windowMs;

    // Get or create entry
    let entry = this.entries.get(keyId);
    if (!entry) {
      entry = {
        keyId,
        requests: [],
        windowStart: now
      };
      this.entries.set(keyId, entry);
    }

    // Clean up old requests outside the window
    const windowStart = now - windowMs;
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

    // Calculate status
    const remaining = Math.max(0, limit - entry.requests.length);
    const oldestRequest = entry.requests[0];
    const reset = oldestRequest ? oldestRequest + windowMs : now + windowMs;

    const status: RateLimitStatus = {
      remaining,
      reset,
      limit
    };

    // If rate limited, add retry-after
    if (remaining === 0 && oldestRequest) {
      status.retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
    }

    return status;
  }

  isLimited(keyId: string, customLimit?: number): boolean {
    const status = this.checkLimit(keyId, customLimit);
    return status.remaining === 0;
  }

  // ============================================
  // Request Recording
  // ============================================

  recordRequest(keyId: string): RateLimitStatus {
    const now = Date.now();

    // Get or create entry
    let entry = this.entries.get(keyId);
    if (!entry) {
      entry = {
        keyId,
        requests: [],
        windowStart: now
      };
      this.entries.set(keyId, entry);
    }

    // Add current request
    entry.requests.push(now);

    // Return updated status
    return this.checkLimit(keyId);
  }

  // ============================================
  // Status Queries
  // ============================================

  getRemainingRequests(keyId: string, customLimit?: number): number {
    return this.checkLimit(keyId, customLimit).remaining;
  }

  getResetTime(keyId: string): number {
    return this.checkLimit(keyId).reset;
  }

  getRequestCount(keyId: string): number {
    const entry = this.entries.get(keyId);
    if (!entry) return 0;

    const now = Date.now();
    const windowStart = now - this.defaultConfig.windowMs;
    return entry.requests.filter(timestamp => timestamp > windowStart).length;
  }

  // ============================================
  // Administration
  // ============================================

  resetLimit(keyId: string): void {
    this.entries.delete(keyId);
  }

  resetAllLimits(): void {
    this.entries.clear();
  }

  setConfig(config: Partial<RateLimitConfig>): void {
    if (config.windowMs !== undefined) {
      this.defaultConfig.windowMs = config.windowMs;
    }
    if (config.maxRequests !== undefined) {
      this.defaultConfig.maxRequests = config.maxRequests;
    }
  }

  getConfig(): RateLimitConfig {
    return { ...this.defaultConfig };
  }

  // ============================================
  // Cleanup
  // ============================================

  cleanup(): void {
    const now = Date.now();
    const windowMs = this.defaultConfig.windowMs;

    for (const [keyId, entry] of this.entries) {
      // Remove entries with no recent requests
      const windowStart = now - windowMs;
      entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

      if (entry.requests.length === 0) {
        this.entries.delete(keyId);
      }
    }
  }

  // Start automatic cleanup every minute
  startAutoCleanup(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => this.cleanup(), intervalMs);
  }

  // ============================================
  // Middleware Helper
  // ============================================

  /**
   * Check and record a request, throwing if rate limited
   */
  checkAndRecord(keyId: string, customLimit?: number): RateLimitStatus {
    // First check if already limited
    if (this.isLimited(keyId, customLimit)) {
      const status = this.checkLimit(keyId, customLimit);
      throw APIException.rateLimited(status.retryAfter || 60);
    }

    // Record the request and return status
    return this.recordRequest(keyId);
  }

  /**
   * Get headers for rate limit response
   */
  getHeaders(keyId: string, customLimit?: number): Record<string, string> {
    const status = this.checkLimit(keyId, customLimit);
    return {
      'X-RateLimit-Limit': status.limit.toString(),
      'X-RateLimit-Remaining': status.remaining.toString(),
      'X-RateLimit-Reset': status.reset.toString()
    };
  }

  // ============================================
  // Statistics
  // ============================================

  getStats(): {
    totalKeys: number;
    totalRequests: number;
    limitedKeys: number;
  } {
    let totalRequests = 0;
    let limitedKeys = 0;

    for (const [keyId, entry] of this.entries) {
      const now = Date.now();
      const windowStart = now - this.defaultConfig.windowMs;
      const recentRequests = entry.requests.filter(t => t > windowStart).length;
      totalRequests += recentRequests;

      if (recentRequests >= this.defaultConfig.maxRequests) {
        limitedKeys++;
      }
    }

    return {
      totalKeys: this.entries.size,
      totalRequests,
      limitedKeys
    };
  }
}

// Singleton instance
let instance: RateLimiterService | null = null;

export function getRateLimiterService(config?: Partial<RateLimitConfig>): RateLimiterService {
  if (!instance) {
    instance = new RateLimiterService(config);
  }
  return instance;
}

export function resetRateLimiterService(): void {
  instance = null;
}
