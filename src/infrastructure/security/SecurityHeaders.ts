/**
 * Security Headers Configuration
 * 
 * This module defines security headers for the application.
 * These headers protect against common web attacks including XSS, clickjacking, and MIME sniffing.
 * 
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

export interface SecurityHeadersConfig {
  /**
   * Content-Security-Policy header
   * Controls which resources can be loaded and executed
   */
  contentSecurityPolicy: string;

  /**
   * X-Content-Type-Options header
   * Prevents MIME type sniffing
   */
  xContentTypeOptions: string;

  /**
   * X-Frame-Options header
   * Prevents clickjacking attacks
   */
  xFrameOptions: string;

  /**
   * X-XSS-Protection header
   * Enables browser XSS filtering
   */
  xXSSProtection: string;

  /**
   * Referrer-Policy header
   * Controls referrer information
   */
  referrerPolicy: string;

  /**
   * Permissions-Policy header
   * Controls browser features
   */
  permissionsPolicy: string;

  /**
   * CORS headers
   */
  cors: {
    allowOrigin: string;
    allowMethods: string;
    allowHeaders: string;
    maxAge: string;
  };
}

/**
 * Default security headers for main application routes
 */
export const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://embed.twitch.tv https://*.twitch.tv https://*.firebasedatabase.app https://*.firebaseio.com https://va.vercel-scripts.com",
    "connect-src 'self' https://*.twitch.tv https://id.twitch.tv https://api.twitch.tv https://static-cdn.jtvnw.net https://*.jtvnw.net wss://irc-ws.chat.twitch.tv wss://eventsub.wss.twitch.tv https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebasedatabase.app https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://decapi.me https://*.kick.com wss://*.kick.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "frame-src 'self' https://embed.twitch.tv https://*.twitch.tv https://id.twitch.tv https://accounts.google.com https://*.firebasedatabase.app https://*.firebaseio.com",
    "worker-src 'self' blob:",
  ].join('; '),

  xContentTypeOptions: 'nosniff',

  xFrameOptions: 'DENY',

  xXSSProtection: '1; mode=block',

  referrerPolicy: 'strict-origin-when-cross-origin',

  permissionsPolicy: 'camera=(), microphone=(), geolocation=()',

  cors: {
    allowOrigin: 'https://streamcrowd.vercel.app',
    allowMethods: 'GET, POST, PUT, DELETE, OPTIONS',
    allowHeaders: 'Content-Type, Authorization',
    maxAge: '86400',
  },
};

/**
 * Security headers for overlay routes
 * Overlays need to be embeddable in OBS, so X-Frame-Options is more permissive
 */
export const OVERLAY_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://*.firebasedatabase.app https://*.firebaseio.com",
    "connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebasedatabase.app https://firebaseinstallations.googleapis.com",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "frame-ancestors *",
    "worker-src 'self' blob:",
  ].join('; '),

  xContentTypeOptions: 'nosniff',

  // Allow overlays to be embedded in any frame (for OBS)
  xFrameOptions: 'ALLOWALL',

  xXSSProtection: '1; mode=block',

  referrerPolicy: 'strict-origin-when-cross-origin',

  permissionsPolicy: 'camera=(), microphone=(), geolocation=()',

  cors: {
    // Allow overlays to be accessed from any origin (for OBS)
    allowOrigin: '*',
    allowMethods: 'GET, OPTIONS',
    allowHeaders: 'Content-Type',
    maxAge: '86400',
  },
};

/**
 * CORS whitelist for production
 * Only these origins are allowed to make requests to the API
 */
export const CORS_WHITELIST = [
  'https://streamcrowd.vercel.app',
  'https://www.streamcrowd.vercel.app',
  'http://localhost:5173', // Development
  'http://localhost:4173', // Preview
];

/**
 * Check if an origin is whitelisted
 */
export function isOriginWhitelisted(origin: string): boolean {
  return CORS_WHITELIST.includes(origin);
}

/**
 * Get CORS headers for a given origin
 */
export function getCorsHeaders(origin: string): Record<string, string> {
  const isWhitelisted = isOriginWhitelisted(origin);
  
  if (!isWhitelisted) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Get security headers as a record
 */
export function getSecurityHeaders(config: SecurityHeadersConfig): Record<string, string> {
  return {
    'Content-Security-Policy': config.contentSecurityPolicy,
    'X-Content-Type-Options': config.xContentTypeOptions,
    'X-Frame-Options': config.xFrameOptions,
    'X-XSS-Protection': config.xXSSProtection,
    'Referrer-Policy': config.referrerPolicy,
    'Permissions-Policy': config.permissionsPolicy,
    'Access-Control-Allow-Origin': config.cors.allowOrigin,
    'Access-Control-Allow-Methods': config.cors.allowMethods,
    'Access-Control-Allow-Headers': config.cors.allowHeaders,
    'Access-Control-Max-Age': config.cors.maxAge,
  };
}

/**
 * Get security headers for a given route
 */
export function getSecurityHeadersForRoute(path: string): Record<string, string> {
  // Check if this is an overlay route
  if (path.startsWith('/overlay')) {
    return getSecurityHeaders(OVERLAY_SECURITY_HEADERS);
  }

  // Default security headers for all other routes
  return getSecurityHeaders(DEFAULT_SECURITY_HEADERS);
}

/**
 * Validate security headers configuration
 */
export function validateSecurityHeaders(config: SecurityHeadersConfig): boolean {
  // Check required headers are present
  if (!config.contentSecurityPolicy) return false;
  if (!config.xContentTypeOptions) return false;
  if (!config.xFrameOptions) return false;
  if (!config.xXSSProtection) return false;
  if (!config.referrerPolicy) return false;
  if (!config.permissionsPolicy) return false;

  // Check CORS configuration
  if (!config.cors.allowOrigin) return false;
  if (!config.cors.allowMethods) return false;
  if (!config.cors.allowHeaders) return false;
  if (!config.cors.maxAge) return false;

  return true;
}
