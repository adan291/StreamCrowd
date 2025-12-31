// CORS Middleware - Cross-Origin Resource Sharing
export interface CORSOptions {
  allowedOrigins?: string[] | '*';
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const DEFAULT_OPTIONS: CORSOptions = {
  allowedOrigins: '*',
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'Accept',
    'Origin'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Generate CORS headers based on request origin
 */
export function getCORSHeaders(
  requestOrigin?: string,
  options: CORSOptions = DEFAULT_OPTIONS
): Record<string, string> {
  const headers: Record<string, string> = {};
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Access-Control-Allow-Origin
  if (opts.allowedOrigins === '*') {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (Array.isArray(opts.allowedOrigins) && requestOrigin) {
    if (opts.allowedOrigins.includes(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
      headers['Vary'] = 'Origin';
    }
  }

  // Access-Control-Allow-Methods
  if (opts.allowedMethods && opts.allowedMethods.length > 0) {
    headers['Access-Control-Allow-Methods'] = opts.allowedMethods.join(', ');
  }

  // Access-Control-Allow-Headers
  if (opts.allowedHeaders && opts.allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = opts.allowedHeaders.join(', ');
  }

  // Access-Control-Expose-Headers
  if (opts.exposedHeaders && opts.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = opts.exposedHeaders.join(', ');
  }

  // Access-Control-Allow-Credentials
  if (opts.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Access-Control-Max-Age
  if (opts.maxAge) {
    headers['Access-Control-Max-Age'] = opts.maxAge.toString();
  }

  return headers;
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(
  origin: string,
  allowedOrigins: string[] | '*'
): boolean {
  if (allowedOrigins === '*') {
    return true;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Handle preflight OPTIONS request
 */
export function handlePreflight(
  requestOrigin?: string,
  requestMethod?: string,
  requestHeaders?: string,
  options: CORSOptions = DEFAULT_OPTIONS
): { headers: Record<string, string>; allowed: boolean } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const headers = getCORSHeaders(requestOrigin, opts);

  // Check if origin is allowed
  if (requestOrigin && opts.allowedOrigins !== '*') {
    if (!isOriginAllowed(requestOrigin, opts.allowedOrigins as string[])) {
      return { headers: {}, allowed: false };
    }
  }

  // Check if method is allowed
  if (requestMethod && opts.allowedMethods) {
    if (!opts.allowedMethods.includes(requestMethod.toUpperCase())) {
      return { headers, allowed: false };
    }
  }

  // Check if headers are allowed
  if (requestHeaders && opts.allowedHeaders) {
    const requestedHeaders = requestHeaders.split(',').map(h => h.trim().toLowerCase());
    const allowedLower = opts.allowedHeaders.map(h => h.toLowerCase());
    
    for (const header of requestedHeaders) {
      if (!allowedLower.includes(header)) {
        return { headers, allowed: false };
      }
    }
  }

  return { headers, allowed: true };
}

/**
 * Get security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };
}

/**
 * Combine CORS and security headers
 */
export function getAllHeaders(
  requestOrigin?: string,
  options?: CORSOptions
): Record<string, string> {
  return {
    ...getCORSHeaders(requestOrigin, options),
    ...getSecurityHeaders()
  };
}

/**
 * Create CORS middleware configuration
 */
export function createCORSConfig(options?: Partial<CORSOptions>): CORSOptions {
  return { ...DEFAULT_OPTIONS, ...options };
}
