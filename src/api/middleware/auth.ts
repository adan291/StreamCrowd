// Authentication Middleware - Validación de API Keys
import { APIKey, APIScope, APIException, RequestContext } from '../../../types/api';
import { getAPIKeyService } from '../services/APIKeyService';

const API_KEY_HEADER = 'X-API-Key';
const API_KEY_QUERY = 'api_key';

export interface AuthenticatedRequest {
  apiKey: APIKey;
  context: RequestContext;
}

export interface AuthMiddlewareOptions {
  requiredScopes?: APIScope[];
  allowAnonymous?: boolean;
}

/**
 * Extract API key from request headers or query params
 */
export function extractAPIKey(headers: Record<string, string>, query?: Record<string, string>): string | null {
  // Check header first (preferred)
  const headerKey = headers[API_KEY_HEADER] || headers[API_KEY_HEADER.toLowerCase()];
  if (headerKey) {
    return headerKey;
  }

  // Check query param as fallback
  if (query && query[API_KEY_QUERY]) {
    return query[API_KEY_QUERY];
  }

  return null;
}

/**
 * Validate API key and return the key object
 */
export async function validateAPIKey(rawKey: string): Promise<APIKey> {
  const service = getAPIKeyService();
  const apiKey = await service.validateKey(rawKey);

  if (!apiKey) {
    throw APIException.unauthorized('Invalid API key');
  }

  return apiKey;
}

/**
 * Check if API key has required scopes
 */
export function checkScopes(apiKey: APIKey, requiredScopes: APIScope[]): void {
  if (requiredScopes.length === 0) {
    return; // No scopes required
  }

  const service = getAPIKeyService();
  const hasAccess = service.hasAnyScope(apiKey, requiredScopes);

  if (!hasAccess) {
    throw APIException.forbidden(`Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`);
  }
}

/**
 * Create request context from authenticated request
 */
export function createRequestContext(
  apiKey: APIKey,
  ip: string = 'unknown',
  userAgent?: string
): RequestContext {
  return {
    apiKey,
    requestId: generateRequestId(),
    timestamp: Date.now(),
    ip,
    userAgent
  };
}

/**
 * Main authentication function
 */
export async function authenticate(
  headers: Record<string, string>,
  query?: Record<string, string>,
  options: AuthMiddlewareOptions = {}
): Promise<AuthenticatedRequest | null> {
  const { requiredScopes = [], allowAnonymous = false } = options;

  // Extract API key
  const rawKey = extractAPIKey(headers, query);

  if (!rawKey) {
    if (allowAnonymous) {
      return null;
    }
    throw APIException.unauthorized('API key is required');
  }

  // Validate key
  const apiKey = await validateAPIKey(rawKey);

  // Check scopes
  checkScopes(apiKey, requiredScopes);

  // Record usage
  const service = getAPIKeyService();
  await service.recordUsage(apiKey.id, 'auth', false);

  // Create context
  const context = createRequestContext(
    apiKey,
    headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
    headers['user-agent']
  );

  return { apiKey, context };
}

/**
 * Middleware factory for route protection
 */
export function requireAuth(requiredScopes: APIScope[] = []) {
  return async (
    headers: Record<string, string>,
    query?: Record<string, string>
  ): Promise<AuthenticatedRequest> => {
    const result = await authenticate(headers, query, { requiredScopes, allowAnonymous: false });
    if (!result) {
      throw APIException.unauthorized('Authentication required');
    }
    return result;
  };
}

/**
 * Middleware factory for optional authentication
 */
export function optionalAuth() {
  return async (
    headers: Record<string, string>,
    query?: Record<string, string>
  ): Promise<AuthenticatedRequest | null> => {
    return authenticate(headers, query, { allowAnonymous: true });
  };
}

// ============================================
// Scope Definitions
// ============================================

export const SCOPE_DEFINITIONS: Record<APIScope, { description: string; category: string }> = {
  'polls:read': { description: 'Read poll data', category: 'Polls' },
  'polls:write': { description: 'Create and modify polls', category: 'Polls' },
  'predictions:read': { description: 'Read prediction data', category: 'Predictions' },
  'predictions:write': { description: 'Create and manage predictions', category: 'Predictions' },
  'giveaways:read': { description: 'Read giveaway data', category: 'Giveaways' },
  'giveaways:write': { description: 'Create and manage giveaways', category: 'Giveaways' },
  'timers:read': { description: 'Read timer data', category: 'Timers' },
  'timers:write': { description: 'Create and control timers', category: 'Timers' },
  'obs:read': { description: 'Read OBS status and scenes', category: 'OBS' },
  'obs:write': { description: 'Control OBS scenes and sources', category: 'OBS' },
  'metrics:read': { description: 'Read stream metrics', category: 'Metrics' },
  'admin': { description: 'Full administrative access', category: 'Admin' }
};

export function getScopesByCategory(): Record<string, APIScope[]> {
  const categories: Record<string, APIScope[]> = {};
  
  for (const [scope, def] of Object.entries(SCOPE_DEFINITIONS)) {
    if (!categories[def.category]) {
      categories[def.category] = [];
    }
    categories[def.category].push(scope as APIScope);
  }
  
  return categories;
}

// ============================================
// Helpers
// ============================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================
// Legacy Exports (for backward compatibility)
// ============================================

/**
 * @deprecated Use requireAuth() instead
 */
export const authMiddleware = requireAuth;
