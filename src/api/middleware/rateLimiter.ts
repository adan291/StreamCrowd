// Rate Limiter Middleware - Control de rate limiting
import { APIKey, APIException, RateLimitStatus } from '../../../types/api';
import { getRateLimiterService } from '../services/RateLimiterService';

export interface RateLimitResult {
  allowed: boolean;
  status: RateLimitStatus;
  headers: Record<string, string>;
}

/**
 * Check rate limit for an API key
 */
export function checkRateLimit(apiKey: APIKey): RateLimitResult {
  const service = getRateLimiterService();
  
  // Use key's custom rate limit or default
  const limit = apiKey.rateLimit;
  
  // Check if already limited
  const isLimited = service.isLimited(apiKey.id, limit);
  const status = service.checkLimit(apiKey.id, limit);
  const headers = service.getHeaders(apiKey.id, limit);

  return {
    allowed: !isLimited,
    status,
    headers
  };
}

/**
 * Record a request and check rate limit
 */
export function recordAndCheckRateLimit(apiKey: APIKey): RateLimitResult {
  const service = getRateLimiterService();
  const limit = apiKey.rateLimit;

  // Check if already limited before recording
  if (service.isLimited(apiKey.id, limit)) {
    const status = service.checkLimit(apiKey.id, limit);
    return {
      allowed: false,
      status,
      headers: {
        ...service.getHeaders(apiKey.id, limit),
        'Retry-After': (status.retryAfter || 60).toString()
      }
    };
  }

  // Record the request
  const status = service.recordRequest(apiKey.id);
  const headers = service.getHeaders(apiKey.id, limit);

  return {
    allowed: true,
    status,
    headers
  };
}

/**
 * Middleware that throws if rate limited
 */
export function enforceRateLimit(apiKey: APIKey): RateLimitResult {
  const result = recordAndCheckRateLimit(apiKey);

  if (!result.allowed) {
    throw APIException.rateLimited(result.status.retryAfter || 60);
  }

  return result;
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(apiKey: APIKey): Record<string, string> {
  const service = getRateLimiterService();
  return service.getHeaders(apiKey.id, apiKey.rateLimit);
}

/**
 * Reset rate limit for a key (admin function)
 */
export function resetRateLimit(keyId: string): void {
  const service = getRateLimiterService();
  service.resetLimit(keyId);
}

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(apiKey: APIKey): RateLimitStatus {
  const service = getRateLimiterService();
  return service.checkLimit(apiKey.id, apiKey.rateLimit);
}

// ============================================
// IP-based Rate Limiting (for unauthenticated requests)
// ============================================

const IP_RATE_LIMIT = 30; // 30 requests per minute for unauthenticated

export function checkIPRateLimit(ip: string): RateLimitResult {
  const service = getRateLimiterService();
  const keyId = `ip:${ip}`;
  
  const isLimited = service.isLimited(keyId, IP_RATE_LIMIT);
  const status = service.checkLimit(keyId, IP_RATE_LIMIT);
  const headers = service.getHeaders(keyId, IP_RATE_LIMIT);

  return {
    allowed: !isLimited,
    status,
    headers
  };
}

export function recordIPRequest(ip: string): RateLimitResult {
  const service = getRateLimiterService();
  const keyId = `ip:${ip}`;

  if (service.isLimited(keyId, IP_RATE_LIMIT)) {
    const status = service.checkLimit(keyId, IP_RATE_LIMIT);
    return {
      allowed: false,
      status,
      headers: {
        ...service.getHeaders(keyId, IP_RATE_LIMIT),
        'Retry-After': (status.retryAfter || 60).toString()
      }
    };
  }

  const status = service.recordRequest(keyId);
  return {
    allowed: true,
    status,
    headers: service.getHeaders(keyId, IP_RATE_LIMIT)
  };
}

// ============================================
// Legacy Exports (for backward compatibility)
// ============================================

/**
 * @deprecated Use enforceRateLimit() instead
 */
export const rateLimiterMiddleware = enforceRateLimit;
