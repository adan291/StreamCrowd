// API Router - Enrutador principal de la API
import { APIScope, APIResponse, APIErrorResponse, RequestContext, PaginationParams } from '../../../types/api';
import { authenticate, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { enforceRateLimit, getRateLimitHeaders } from '../middleware/rateLimiter';
import { handleError, logError } from '../middleware/errorHandler';
import { getCORSHeaders, getSecurityHeaders, handlePreflight } from '../middleware/cors';
import { parseQueryParams } from '../middleware/validation';
import { getAPIKeyService } from '../services/APIKeyService';
import {
  getPollController,
  getPredictionController,
  getGiveawayController,
  getTimerController,
  getOBSController,
  getMetricsController
} from '../controllers';

// ============================================
// Route Definitions
// ============================================

interface RouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  scopes: APIScope[];
  handler: (params: RouteParams) => Promise<APIResponse<any>>;
}

interface RouteParams {
  pathParams: Record<string, string>;
  query: Record<string, any>;
  body: any;
  context: RequestContext;
}

// ============================================
// Route Registry
// ============================================

const routes: RouteHandler[] = [
  // Auth routes
  {
    method: 'GET',
    path: '/api/v1/auth/keys',
    scopes: ['admin'],
    handler: async ({ context }) => ({
      success: true,
      data: getAPIKeyService().listKeys()
    })
  },

  // Poll routes
  {
    method: 'GET',
    path: '/api/v1/polls',
    scopes: ['polls:read'],
    handler: async ({ query, context }) => 
      getPollController().list(query as PaginationParams, context)
  },
  {
    method: 'GET',
    path: '/api/v1/polls/:id',
    scopes: ['polls:read'],
    handler: async ({ pathParams, context }) => 
      getPollController().get(pathParams.id, context)
  },
  {
    method: 'POST',
    path: '/api/v1/polls',
    scopes: ['polls:write'],
    handler: async ({ body, context }) => 
      getPollController().create(body, context)
  },
  {
    method: 'PUT',
    path: '/api/v1/polls/:id',
    scopes: ['polls:write'],
    handler: async ({ pathParams, body, context }) => 
      getPollController().update(pathParams.id, body, context)
  },
  {
    method: 'DELETE',
    path: '/api/v1/polls/:id',
    scopes: ['polls:write'],
    handler: async ({ pathParams, context }) => 
      getPollController().delete(pathParams.id, context)
  },
  {
    method: 'POST',
    path: '/api/v1/polls/:id/start',
    scopes: ['polls:write'],
    handler: async ({ pathParams, context }) => 
      getPollController().start(pathParams.id, context)
  },
  {
    method: 'POST',
    path: '/api/v1/polls/:id/stop',
    scopes: ['polls:write'],
    handler: async ({ pathParams, context }) => 
      getPollController().stop(pathParams.id, context)
  },
  {
    method: 'GET',
    path: '/api/v1/polls/:id/results',
    scopes: ['polls:read'],
    handler: async ({ pathParams, context }) => 
      getPollController().getResults(pathParams.id, context)
  },

  // Prediction routes
  {
    method: 'GET',
    path: '/api/v1/predictions',
    scopes: ['predictions:read'],
    handler: async ({ query, context }) => 
      getPredictionController().list(query as PaginationParams, context)
  },
  {
    method: 'POST',
    path: '/api/v1/predictions',
    scopes: ['predictions:write'],
    handler: async ({ body, context }) => 
      getPredictionController().create(body, context)
  },
  {
    method: 'POST',
    path: '/api/v1/predictions/:id/lock',
    scopes: ['predictions:write'],
    handler: async ({ pathParams, context }) => 
      getPredictionController().lock(pathParams.id, context)
  },
  {
    method: 'POST',
    path: '/api/v1/predictions/:id/resolve',
    scopes: ['predictions:write'],
    handler: async ({ pathParams, body, context }) => 
      getPredictionController().resolve(pathParams.id, body, context)
  },
  {
    method: 'POST',
    path: '/api/v1/predictions/:id/cancel',
    scopes: ['predictions:write'],
    handler: async ({ pathParams, context }) => 
      getPredictionController().cancel(pathParams.id, context)
  },

  // Giveaway routes
  {
    method: 'GET',
    path: '/api/v1/giveaways',
    scopes: ['giveaways:read'],
    handler: async ({ query, context }) => 
      getGiveawayController().list(query as PaginationParams, context)
  },
  {
    method: 'POST',
    path: '/api/v1/giveaways',
    scopes: ['giveaways:write'],
    handler: async ({ body, context }) => 
      getGiveawayController().create(body, context)
  },
  {
    method: 'POST',
    path: '/api/v1/giveaways/:id/start',
    scopes: ['giveaways:write'],
    handler: async ({ pathParams, context }) => 
      getGiveawayController().start(pathParams.id, context)
  },
  {
    method: 'POST',
    path: '/api/v1/giveaways/:id/draw',
    scopes: ['giveaways:write'],
    handler: async ({ pathParams, context }) => 
      getGiveawayController().draw(pathParams.id, context)
  },
  {
    method: 'GET',
    path: '/api/v1/giveaways/:id/participants',
    scopes: ['giveaways:read'],
    handler: async ({ pathParams, query, context }) => 
      getGiveawayController().getParticipants(pathParams.id, query as PaginationParams, context)
  },

  // Timer routes
  {
    method: 'GET',
    path: '/api/v1/timers',
    scopes: ['timers:read'],
    handler: async ({ query, context }) => 
      getTimerController().list(query as PaginationParams, context)
  },
  {
    method: 'POST',
    path: '/api/v1/timers',
    scopes: ['timers:write'],
    handler: async ({ body, context }) => 
      getTimerController().create(body, context)
  },
  {
    method: 'POST',
    path: '/api/v1/timers/:id/start',
    scopes: ['timers:write'],
    handler: async ({ pathParams, context }) => 
      getTimerController().start(pathParams.id, context)
  },
  {
    method: 'POST',
    path: '/api/v1/timers/:id/pause',
    scopes: ['timers:write'],
    handler: async ({ pathParams, context }) => 
      getTimerController().pause(pathParams.id, context)
  },
  {
    method: 'POST',
    path: '/api/v1/timers/:id/reset',
    scopes: ['timers:write'],
    handler: async ({ pathParams, context }) => 
      getTimerController().reset(pathParams.id, context)
  },

  // OBS routes
  {
    method: 'GET',
    path: '/api/v1/obs/status',
    scopes: ['obs:read'],
    handler: async ({ context }) => 
      getOBSController().getStatus(context)
  },
  {
    method: 'GET',
    path: '/api/v1/obs/scenes',
    scopes: ['obs:read'],
    handler: async ({ context }) => 
      getOBSController().getScenes(context)
  },
  {
    method: 'POST',
    path: '/api/v1/obs/scenes/switch',
    scopes: ['obs:write'],
    handler: async ({ body, context }) => 
      getOBSController().switchScene(body, context)
  },
  {
    method: 'GET',
    path: '/api/v1/obs/sources',
    scopes: ['obs:read'],
    handler: async ({ context }) => 
      getOBSController().getSources(context)
  },
  {
    method: 'POST',
    path: '/api/v1/obs/sources/:name/visibility',
    scopes: ['obs:write'],
    handler: async ({ pathParams, body, context }) => 
      getOBSController().setSourceVisibility(pathParams.name, body, context)
  },

  // Metrics routes
  {
    method: 'GET',
    path: '/api/v1/metrics/current',
    scopes: ['metrics:read'],
    handler: async ({ context }) => 
      getMetricsController().getCurrent(context)
  },
  {
    method: 'GET',
    path: '/api/v1/metrics/session/:id',
    scopes: ['metrics:read'],
    handler: async ({ pathParams, context }) => 
      getMetricsController().getSession(pathParams.id, context)
  },
  {
    method: 'GET',
    path: '/api/v1/metrics/history',
    scopes: ['metrics:read'],
    handler: async ({ query, context }) => 
      getMetricsController().getHistory(query as PaginationParams, context)
  }
];

// ============================================
// Route Matching
// ============================================

function matchRoute(method: string, path: string): { route: RouteHandler; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;

    const routeParts = route.path.split('/');
    const pathParts = path.split('/');

    if (routeParts.length !== pathParts.length) continue;

    const params: Record<string, string> = {};
    let match = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { route, params };
    }
  }

  return null;
}

// ============================================
// Request Handler
// ============================================

export interface APIRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: any;
}

export interface APIRequestResult {
  status: number;
  headers: Record<string, string>;
  body: APIResponse<any> | APIErrorResponse;
}

export async function handleAPIRequest(request: APIRequest): Promise<APIRequestResult> {
  const { method, path, headers, query, body } = request;
  const origin = headers['origin'] || headers['Origin'];

  // Base headers
  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getCORSHeaders(origin),
    ...getSecurityHeaders()
  };

  // Handle preflight
  if (method === 'OPTIONS') {
    const preflight = handlePreflight(
      origin,
      headers['access-control-request-method'],
      headers['access-control-request-headers']
    );
    return {
      status: preflight.allowed ? 204 : 403,
      headers: { ...responseHeaders, ...preflight.headers },
      body: { success: true, data: null }
    };
  }

  try {
    // Match route
    const matched = matchRoute(method, path);
    if (!matched) {
      return {
        status: 404,
        headers: responseHeaders,
        body: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Endpoint not found', timestamp: Date.now() }
        }
      };
    }

    const { route, params } = matched;

    // Authenticate
    const auth = await requireAuth(route.scopes)(headers, query);

    // Rate limit
    const rateLimitResult = enforceRateLimit(auth.apiKey);
    Object.assign(responseHeaders, rateLimitResult.headers);

    // Record usage
    await getAPIKeyService().recordUsage(auth.apiKey.id, path, false);

    // Parse query params
    const parsedQuery = parseQueryParams(query);

    // Execute handler
    const result = await route.handler({
      pathParams: params,
      query: parsedQuery,
      body,
      context: auth.context
    });

    return {
      status: 200,
      headers: responseHeaders,
      body: result
    };

  } catch (error) {
    logError(error, { method, path });
    const { response, statusCode } = handleError(error);

    // Record error usage if authenticated
    try {
      const auth = await authenticate(headers, query, { allowAnonymous: true });
      if (auth) {
        await getAPIKeyService().recordUsage(auth.apiKey.id, path, true);
      }
    } catch {
      // Ignore auth errors during error handling
    }

    return {
      status: statusCode,
      headers: responseHeaders,
      body: response
    };
  }
}

// ============================================
// Route Listing (for documentation)
// ============================================

export function getRouteList(): Array<{
  method: string;
  path: string;
  scopes: APIScope[];
}> {
  return routes.map(r => ({
    method: r.method,
    path: r.path,
    scopes: r.scopes
  }));
}
