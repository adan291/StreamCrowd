/**
 * Error Handling Utilities for Twitch API
 * 
 * Provides centralized error handling, user-friendly error messages,
 * and rate limiting with retry logic.
 * 
 * @requirements 8.2 - User-friendly error messages
 * @requirements 8.3 - Partner/Affiliate limitation explanation
 * @requirements 8.4 - Rate limit handling with retry
 * @requirements 8.5 - Input validation before API calls
 */

import type { TwitchApiError, ValidationResult } from '../../../types/twitch';

// ============================================
// Error Types and Interfaces
// ============================================

/**
 * Extended error with additional context
 */
export interface TwitchErrorContext {
  status: number;
  code: string;
  message: string;
  userMessage: string;
  solution: string;
  isRetryable: boolean;
  requiresReauth: boolean;
  isPartnerRequired: boolean;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Result of a rate-limited operation
 */
export interface RateLimitResult<T> {
  success: boolean;
  data?: T;
  error?: TwitchErrorContext;
  retriesUsed: number;
}

// ============================================
// Error Code Definitions
// ============================================

/**
 * Error codes for Twitch API errors
 */
export const ERROR_CODES = {
  // Authentication errors
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',
  MISSING_SCOPE: 'missing_scope',
  
  // Permission errors
  NOT_PARTNER_AFFILIATE: 'not_partner_affiliate',
  ACCESS_DENIED: 'access_denied',
  NOT_BROADCASTER: 'not_broadcaster',
  
  // Rate limiting
  RATE_LIMITED: 'rate_limited',
  
  // Resource errors
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  
  // Server errors
  SERVER_ERROR: 'server_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  
  // Client errors
  BAD_REQUEST: 'bad_request',
  VALIDATION_ERROR: 'validation_error',
  NETWORK_ERROR: 'network_error',
  
  // Unknown
  UNKNOWN: 'unknown',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ============================================
// Error Message Mappings
// ============================================

/**
 * User-friendly error messages mapped by status code and context
 */
const ERROR_MESSAGES: Record<number, { message: string; solution: string }> = {
  400: {
    message: 'Solicitud inválida',
    solution: 'Verifica los datos ingresados e intenta de nuevo.',
  },
  401: {
    message: 'Token expirado o sin permisos',
    solution: 'Por favor, reconecta tu cuenta de Twitch.',
  },
  403: {
    message: 'No tienes permisos para esta acción',
    solution: '¿Eres Partner o Affiliate? Algunas funciones requieren este estatus.',
  },
  404: {
    message: 'Recurso no encontrado',
    solution: 'El elemento que buscas no existe o fue eliminado.',
  },
  409: {
    message: 'Conflicto con el estado actual',
    solution: 'Ya existe una operación en curso. Espera a que termine.',
  },
  429: {
    message: 'Demasiadas solicitudes',
    solution: 'Espera un momento antes de intentar de nuevo.',
  },
  500: {
    message: 'Error del servidor de Twitch',
    solution: 'Twitch está teniendo problemas. Intenta de nuevo en unos minutos.',
  },
  502: {
    message: 'Error de conexión con Twitch',
    solution: 'Hay problemas de conexión. Intenta de nuevo.',
  },
  503: {
    message: 'Servicio no disponible',
    solution: 'El servicio de Twitch no está disponible temporalmente.',
  },
  504: {
    message: 'Tiempo de espera agotado',
    solution: 'La solicitud tardó demasiado. Intenta de nuevo.',
  },
};

/**
 * Specific error messages for Partner/Affiliate requirements
 */
const PARTNER_AFFILIATE_MESSAGES: Record<string, string> = {
  predictions: 'Las predicciones solo están disponibles para Partners y Affiliates de Twitch.',
  channelPoints: 'Los Channel Points solo están disponibles para Partners y Affiliates de Twitch.',
  customRewards: 'Las recompensas personalizadas solo están disponibles para Partners y Affiliates.',
};

// ============================================
// Core Error Handling Functions
// ============================================

/**
 * Parse a Twitch API error into a user-friendly context
 * 
 * @param error - The error from the API (can be TwitchApiError, Error, or unknown)
 * @param feature - Optional feature context for better error messages
 * @returns TwitchErrorContext with user-friendly information
 * 
 * @requirements 8.2 - User-friendly error messages
 * @requirements 8.3 - Partner/Affiliate limitation explanation
 */
export function parseApiError(
  error: TwitchApiError | Error | unknown,
  feature?: 'predictions' | 'channelPoints' | 'customRewards'
): TwitchErrorContext {
  // Handle TwitchApiError
  if (isTwitchApiError(error)) {
    return parseTwitchApiError(error, feature);
  }
  
  // Handle standard Error
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        status: 0,
        code: ERROR_CODES.NETWORK_ERROR,
        message: error.message,
        userMessage: 'Error de conexión',
        solution: 'Verifica tu conexión a internet e intenta de nuevo.',
        isRetryable: true,
        requiresReauth: false,
        isPartnerRequired: false,
      };
    }
    
    return {
      status: 0,
      code: ERROR_CODES.UNKNOWN,
      message: error.message,
      userMessage: 'Error inesperado',
      solution: 'Ocurrió un error. Intenta de nuevo o contacta soporte.',
      isRetryable: false,
      requiresReauth: false,
      isPartnerRequired: false,
    };
  }
  
  // Handle unknown errors
  return {
    status: 0,
    code: ERROR_CODES.UNKNOWN,
    message: safeStringify(error),
    userMessage: 'Error desconocido',
    solution: 'Ocurrió un error inesperado. Intenta de nuevo.',
    isRetryable: false,
    requiresReauth: false,
    isPartnerRequired: false,
  };
}

/**
 * Safely convert any value to a string
 */
function safeStringify(value: unknown): string {
  try {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Error) return value.message;
    return JSON.stringify(value);
  } catch {
    return 'Unknown error';
  }
}

/**
 * Parse a TwitchApiError specifically
 */
function parseTwitchApiError(
  error: TwitchApiError,
  feature?: 'predictions' | 'channelPoints' | 'customRewards'
): TwitchErrorContext {
  const { status, message } = error;
  const errorInfo = ERROR_MESSAGES[status] || ERROR_MESSAGES[500];
  
  // Determine error code
  let code: ErrorCode = ERROR_CODES.UNKNOWN;
  let isRetryable = false;
  let requiresReauth = false;
  let isPartnerRequired = false;
  let userMessage = errorInfo.message;
  let solution = errorInfo.solution;
  
  switch (status) {
    case 400:
      code = ERROR_CODES.BAD_REQUEST;
      break;
      
    case 401:
      code = message.includes('expired') ? ERROR_CODES.TOKEN_EXPIRED : ERROR_CODES.INVALID_TOKEN;
      requiresReauth = true;
      break;
      
    case 403:
      // Check for Partner/Affiliate requirement
      if (message.toLowerCase().includes('partner') || 
          message.toLowerCase().includes('affiliate') ||
          message.toLowerCase().includes('not eligible')) {
        code = ERROR_CODES.NOT_PARTNER_AFFILIATE;
        isPartnerRequired = true;
        if (feature && PARTNER_AFFILIATE_MESSAGES[feature]) {
          userMessage = 'Función no disponible';
          solution = PARTNER_AFFILIATE_MESSAGES[feature];
        }
      } else if (message.toLowerCase().includes('scope')) {
        code = ERROR_CODES.MISSING_SCOPE;
        requiresReauth = true;
        solution = 'Necesitas permisos adicionales. Reconecta tu cuenta.';
      } else {
        code = ERROR_CODES.ACCESS_DENIED;
      }
      break;
      
    case 404:
      code = ERROR_CODES.NOT_FOUND;
      break;
      
    case 409:
      code = ERROR_CODES.CONFLICT;
      break;
      
    case 429:
      code = ERROR_CODES.RATE_LIMITED;
      isRetryable = true;
      break;
      
    case 500:
    case 502:
    case 504:
      code = ERROR_CODES.SERVER_ERROR;
      isRetryable = true;
      break;
      
    case 503:
      code = ERROR_CODES.SERVICE_UNAVAILABLE;
      isRetryable = true;
      break;
  }
  
  return {
    status,
    code,
    message,
    userMessage,
    solution,
    isRetryable,
    requiresReauth,
    isPartnerRequired,
  };
}

/**
 * Type guard for TwitchApiError
 */
export function isTwitchApiError(error: unknown): error is TwitchApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error &&
    typeof (error as TwitchApiError).status === 'number'
  );
}

/**
 * Get a user-friendly error message from any error
 * 
 * @param error - Any error type
 * @param feature - Optional feature context
 * @returns User-friendly error message string
 * 
 * @requirements 8.2 - User-friendly error messages
 */
export function getErrorMessage(
  error: unknown,
  feature?: 'predictions' | 'channelPoints' | 'customRewards'
): string {
  const context = parseApiError(error, feature);
  return `${context.userMessage}. ${context.solution}`;
}

// ============================================
// Rate Limiting with Retry
// ============================================

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Delay helper function
 */
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(
  attempt: number,
  config: RateLimitConfig
): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  return Math.min(exponentialDelay, config.maxDelayMs);
}

/**
 * Execute a function with rate limit handling and retry logic
 * 
 * @param fn - Async function to execute
 * @param config - Rate limit configuration
 * @returns Result with success status, data or error, and retries used
 * 
 * @requirements 8.4 - Rate limit handling with retry
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
): Promise<RateLimitResult<T>> {
  let lastError: TwitchErrorContext | undefined;
  let retriesUsed = 0;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        retriesUsed,
      };
    } catch (error) {
      const errorContext = parseApiError(error);
      lastError = errorContext;
      
      // Only retry if the error is retryable and we have retries left
      if (errorContext.isRetryable && attempt < config.maxRetries) {
        retriesUsed++;
        const delayMs = calculateBackoffDelay(attempt, config);
        await delay(delayMs);
        continue;
      }
      
      // Non-retryable error or out of retries
      break;
    }
  }
  
  return {
    success: false,
    error: lastError,
    retriesUsed,
  };
}

/**
 * Simple wrapper that throws on failure (for backward compatibility)
 * 
 * @param fn - Async function to execute
 * @param retries - Number of retries (default: 3)
 * @returns The result of the function
 * @throws The last error if all retries fail
 * 
 * @requirements 8.4 - Rate limit handling with retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3
): Promise<T> {
  const result = await withRateLimit(fn, {
    ...DEFAULT_RATE_LIMIT_CONFIG,
    maxRetries: retries,
  });
  
  if (result.success && result.data !== undefined) {
    return result.data;
  }
  
  // Throw an error with the context
  const error = new Error(result.error?.userMessage || 'Operation failed');
  (error as any).context = result.error;
  throw error;
}

// ============================================
// Input Validation Helpers
// ============================================

/**
 * Validate that a value is a non-empty string
 */
export function validateNonEmptyString(
  value: unknown,
  fieldName: string
): ValidationResult {
  if (typeof value !== 'string' || !value.trim()) {
    return {
      valid: false,
      errors: [`${fieldName} es requerido`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate that a number is within a range
 */
export function validateNumberRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      errors: [`${fieldName} debe ser un número`],
    };
  }
  if (value < min || value > max) {
    return {
      valid: false,
      errors: [`${fieldName} debe estar entre ${min} y ${max}`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate that an array has a specific length range
 */
export function validateArrayLength(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): ValidationResult {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      errors: [`${fieldName} debe ser una lista`],
    };
  }
  if (value.length < min) {
    return {
      valid: false,
      errors: [`${fieldName} debe tener al menos ${min} elementos`],
    };
  }
  if (value.length > max) {
    return {
      valid: false,
      errors: [`${fieldName} debe tener máximo ${max} elementos`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Combine multiple validation results
 */
export function combineValidations(
  ...results: ValidationResult[]
): ValidationResult {
  const errors = results.flatMap(r => r.errors);
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate inputs before making an API call
 * 
 * @param validations - Array of validation functions to run
 * @returns Combined validation result
 * 
 * @requirements 8.5 - Input validation before API calls
 */
export function validateBeforeApiCall(
  validations: (() => ValidationResult)[]
): ValidationResult {
  const results = validations.map(v => v());
  return combineValidations(...results);
}

// ============================================
// Error Display Helpers
// ============================================

/**
 * Format an error for display in the UI
 */
export function formatErrorForDisplay(error: TwitchErrorContext): {
  title: string;
  description: string;
  action?: string;
  actionLabel?: string;
} {
  const result: {
    title: string;
    description: string;
    action?: string;
    actionLabel?: string;
  } = {
    title: error.userMessage,
    description: error.solution,
  };
  
  if (error.requiresReauth) {
    result.action = 'reauth';
    result.actionLabel = 'Reconectar cuenta';
  }
  
  return result;
}

/**
 * Check if an error requires user action
 */
export function requiresUserAction(error: TwitchErrorContext): boolean {
  return error.requiresReauth || error.isPartnerRequired;
}

/**
 * Check if an operation should be retried automatically
 */
export function shouldAutoRetry(error: TwitchErrorContext): boolean {
  return error.isRetryable && !error.requiresReauth;
}
