// API Types - Tipos para la API Pública REST

// ============================================
// API Key Types
// ============================================

export type APIScope =
  | 'polls:read' | 'polls:write'
  | 'predictions:read' | 'predictions:write'
  | 'giveaways:read' | 'giveaways:write'
  | 'timers:read' | 'timers:write'
  | 'obs:read' | 'obs:write'
  | 'metrics:read'
  | 'admin';

export interface APIKey {
  id: string;
  keyHash: string;        // Hash bcrypt del key real
  keyPrefix: string;      // Primeros 8 caracteres para identificación
  name: string;           // Nombre descriptivo
  scopes: APIScope[];     // Permisos
  rateLimit: number;      // Requests por minuto
  createdAt: number;
  lastUsedAt?: number;
  expiresAt?: number;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface APIKeyCreateInput {
  name: string;
  scopes: APIScope[];
  rateLimit?: number;
  expiresAt?: number;
}

export interface APIKeyCreateResult {
  id: string;
  key: string;            // Key completo (solo se muestra una vez)
  keyPrefix: string;
}

export interface APIKeyUpdateInput {
  name?: string;
  scopes?: APIScope[];
  rateLimit?: number;
  enabled?: boolean;
  expiresAt?: number;
}

// ============================================
// Rate Limiting Types
// ============================================

export interface RateLimitConfig {
  windowMs: number;       // Ventana de tiempo en ms
  maxRequests: number;    // Máximo de requests en la ventana
}

export interface RateLimitStatus {
  remaining: number;      // Requests restantes
  reset: number;          // Timestamp cuando se resetea
  limit: number;          // Límite total
  retryAfter?: number;    // Segundos hasta poder reintentar (si limitado)
}

export interface RateLimitEntry {
  keyId: string;
  requests: number[];     // Timestamps de requests
  windowStart: number;
}

// ============================================
// API Response Types
// ============================================

export interface APIResponse<T = any> {
  success: true;
  data: T;
  meta?: APIMeta;
}

export interface APIMeta {
  page?: number;
  perPage?: number;
  total?: number;
  totalPages?: number;
  timestamp?: number;
}

export interface APIErrorResponse {
  success: false;
  error: APIError;
}

export interface APIError {
  code: APIErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp?: number;
}

export type APIErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'SERVICE_UNAVAILABLE'
  | 'METHOD_NOT_ALLOWED';

// ============================================
// WebSocket Types
// ============================================

// Eventos que el servidor emite
export type ServerEvent =
  | { type: 'poll:created'; data: PollEventData }
  | { type: 'poll:updated'; data: PollEventData }
  | { type: 'poll:started'; data: PollEventData }
  | { type: 'poll:stopped'; data: PollEventData }
  | { type: 'poll:vote'; data: PollVoteEventData }
  | { type: 'prediction:created'; data: PredictionEventData }
  | { type: 'prediction:locked'; data: PredictionEventData }
  | { type: 'prediction:resolved'; data: PredictionEventData }
  | { type: 'prediction:cancelled'; data: PredictionEventData }
  | { type: 'giveaway:created'; data: GiveawayEventData }
  | { type: 'giveaway:started'; data: GiveawayEventData }
  | { type: 'giveaway:winner'; data: GiveawayWinnerEventData }
  | { type: 'timer:created'; data: TimerEventData }
  | { type: 'timer:started'; data: TimerEventData }
  | { type: 'timer:paused'; data: TimerEventData }
  | { type: 'timer:tick'; data: TimerTickEventData }
  | { type: 'timer:completed'; data: TimerEventData }
  | { type: 'obs:connected'; data: OBSConnectionEventData }
  | { type: 'obs:disconnected'; data: OBSConnectionEventData }
  | { type: 'obs:scene_changed'; data: OBSSceneEventData }
  | { type: 'metrics:update'; data: MetricsEventData }
  | { type: 'error'; data: { message: string; code: string } }
  | { type: 'pong'; data: { timestamp: number } };

// Mensajes que el cliente puede enviar
export type ClientMessage =
  | { type: 'subscribe'; events: string[] }
  | { type: 'unsubscribe'; events: string[] }
  | { type: 'ping'; timestamp?: number }
  | { type: 'auth'; apiKey: string };

export interface WebSocketConnection {
  id: string;
  keyId: string;
  subscribedEvents: string[];
  connectedAt: number;
  lastPingAt: number;
}

// ============================================
// Event Data Types
// ============================================

export interface PollEventData {
  id: string;
  question: string;
  options: Array<{ id: number; label: string; votes: number }>;
  isActive: boolean;
  totalVotes: number;
}

export interface PollVoteEventData {
  pollId: string;
  optionId: number;
  votes: number;
  totalVotes: number;
}

export interface PredictionEventData {
  id: string;
  title: string;
  outcomes: Array<{ id: string; title: string; points: number }>;
  status: 'active' | 'locked' | 'resolved' | 'cancelled';
  winningOutcomeId?: string;
}

export interface GiveawayEventData {
  id: string;
  name: string;
  keyword?: string;
  participantCount: number;
  isActive: boolean;
}

export interface GiveawayWinnerEventData {
  giveawayId: string;
  winner: string;
  participantCount: number;
}

export interface TimerEventData {
  id: string;
  name: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
}

export interface TimerTickEventData {
  timerId: string;
  remaining: number;
  percentage: number;
}

export interface OBSConnectionEventData {
  connected: boolean;
  version?: string;
}

export interface OBSSceneEventData {
  sceneName: string;
  previousScene?: string;
}

export interface MetricsEventData {
  viewers: number;
  chatMessages: number;
  engagement: number;
  timestamp: number;
}

// ============================================
// Request/Response Types for Endpoints
// ============================================

// Polls
export interface CreatePollRequest {
  question: string;
  options: string[];
  duration?: number;
  allowMultipleVotes?: boolean;
}

export interface UpdatePollRequest {
  question?: string;
  options?: string[];
}

export interface PollResponse {
  id: string;
  question: string;
  options: Array<{ id: number; label: string; votes: number; color: string }>;
  totalVotes: number;
  isActive: boolean;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

// Predictions
export interface CreatePredictionRequest {
  title: string;
  outcomes: Array<{ title: string }>;
  duration?: number;
}

export interface ResolvePredictionRequest {
  winningOutcomeId: string;
}

export interface PredictionResponse {
  id: string;
  title: string;
  outcomes: Array<{ id: string; title: string; points: number; users: number }>;
  status: 'active' | 'locked' | 'resolved' | 'cancelled';
  winningOutcomeId?: string;
  createdAt: number;
  lockedAt?: number;
  resolvedAt?: number;
}

// Giveaways
export interface CreateGiveawayRequest {
  name: string;
  keyword?: string;
  mode: 'viewers' | 'keyword' | 'subs';
  duration?: number;
}

export interface GiveawayResponse {
  id: string;
  name: string;
  keyword?: string;
  mode: 'viewers' | 'keyword' | 'subs';
  participantCount: number;
  isActive: boolean;
  winner?: string;
  createdAt: number;
}

export interface ParticipantResponse {
  username: string;
  joinedAt: number;
  entries: number;
}

// Timers
export interface CreateTimerRequest {
  name: string;
  duration: number;       // En segundos
  autoStart?: boolean;
  sound?: string;
}

export interface TimerResponse {
  id: string;
  name: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
  isPaused: boolean;
  createdAt: number;
  startedAt?: number;
}

// OBS
export interface OBSStatusResponse {
  connected: boolean;
  version?: string;
  platform?: string;
  currentScene?: string;
}

export interface OBSSceneResponse {
  name: string;
  index: number;
  isCurrent: boolean;
}

export interface SwitchSceneRequest {
  sceneName: string;
}

export interface OBSSourceResponse {
  name: string;
  type: string;
  visible: boolean;
  sceneName: string;
}

export interface SetVisibilityRequest {
  visible: boolean;
  sceneName?: string;
}

// Metrics
export interface CurrentMetricsResponse {
  viewers: number;
  peakViewers: number;
  chatMessages: number;
  chatMessagesPerMinute: number;
  engagement: number;
  uptime: number;
  timestamp: number;
}

export interface SessionMetricsResponse {
  id: string;
  startedAt: number;
  endedAt?: number;
  duration: number;
  peakViewers: number;
  averageViewers: number;
  totalChatMessages: number;
  averageEngagement: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  meta: APIMeta & {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// API Key Usage Types
// ============================================

export interface APIKeyUsage {
  keyId: string;
  date: string;           // YYYY-MM-DD
  requests: number;
  endpoints: Record<string, number>;
  errors: number;
}

export interface APIKeyUsageStats {
  totalRequests: number;
  requestsToday: number;
  requestsThisWeek: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  errorRate: number;
  lastUsed?: number;
}

// ============================================
// Error Classes
// ============================================

export class APIException extends Error {
  constructor(
    public code: APIErrorCode,
    message: string,
    public details?: Record<string, any>,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'APIException';
  }

  toResponse(): APIErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: Date.now()
      }
    };
  }

  static unauthorized(message = 'Unauthorized'): APIException {
    return new APIException('UNAUTHORIZED', message, undefined, 401);
  }

  static forbidden(message = 'Forbidden'): APIException {
    return new APIException('FORBIDDEN', message, undefined, 403);
  }

  static notFound(resource = 'Resource'): APIException {
    return new APIException('NOT_FOUND', `${resource} not found`, undefined, 404);
  }

  static validationError(details: Record<string, any>): APIException {
    return new APIException('VALIDATION_ERROR', 'Validation failed', details, 400);
  }

  static rateLimited(retryAfter: number): APIException {
    return new APIException('RATE_LIMITED', 'Rate limit exceeded', { retryAfter }, 429);
  }

  static conflict(message: string): APIException {
    return new APIException('CONFLICT', message, undefined, 409);
  }

  static badRequest(message: string): APIException {
    return new APIException('BAD_REQUEST', message, undefined, 400);
  }

  static internal(message = 'Internal server error'): APIException {
    return new APIException('INTERNAL_ERROR', message, undefined, 500);
  }
}

// ============================================
// Utility Types
// ============================================

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RouteDefinition {
  method: HTTPMethod;
  path: string;
  requiredScopes: APIScope[];
  handler: string;
  description: string;
}

export interface RequestContext {
  apiKey: APIKey;
  requestId: string;
  timestamp: number;
  ip: string;
  userAgent?: string;
}
