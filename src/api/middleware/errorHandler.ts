// Error Handler Middleware - Manejo centralizado de errores
import { APIException, APIErrorResponse, APIErrorCode } from '../../../types/api';

/**
 * Convert any error to APIErrorResponse
 */
export function handleError(error: unknown): { response: APIErrorResponse; statusCode: number } {
  // Handle APIException
  if (error instanceof APIException) {
    return {
      response: error.toResponse(),
      statusCode: error.statusCode
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    // Check for known error types
    if (error.name === 'ValidationError') {
      return {
        response: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: Date.now()
          }
        },
        statusCode: 400
      };
    }

    if (error.name === 'NotFoundError') {
      return {
        response: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: Date.now()
          }
        },
        statusCode: 404
      };
    }

    // Generic error
    return {
      response: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: process.env.NODE_ENV === 'production' 
            ? 'An internal error occurred' 
            : error.message,
          timestamp: Date.now()
        }
      },
      statusCode: 500
    };
  }

  // Unknown error type
  return {
    response: {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp: Date.now()
      }
    },
    statusCode: 500
  };
}

/**
 * Create error response for specific HTTP status codes
 */
export function createErrorResponse(
  code: APIErrorCode,
  message: string,
  details?: Record<string, any>
): APIErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: Date.now()
    }
  };
}

/**
 * Get HTTP status code for error code
 */
export function getStatusCode(code: APIErrorCode): number {
  const statusCodes: Record<APIErrorCode, number> = {
    'UNAUTHORIZED': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'VALIDATION_ERROR': 400,
    'RATE_LIMITED': 429,
    'INTERNAL_ERROR': 500,
    'CONFLICT': 409,
    'BAD_REQUEST': 400,
    'SERVICE_UNAVAILABLE': 503,
    'METHOD_NOT_ALLOWED': 405
  };

  return statusCodes[code] || 500;
}

/**
 * Log error for debugging/monitoring
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  
  if (error instanceof APIException) {
    console.error(`[${timestamp}] API Error:`, {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      ...context
    });
  } else if (error instanceof Error) {
    console.error(`[${timestamp}] Error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context
    });
  } else {
    console.error(`[${timestamp}] Unknown Error:`, error, context);
  }
}

/**
 * Wrap async handler to catch errors
 */
export function asyncHandler<T>(
  handler: () => Promise<T>
): Promise<{ data: T } | { error: APIErrorResponse; statusCode: number }> {
  return handler()
    .then(data => ({ data }))
    .catch(error => {
      logError(error);
      const { response, statusCode } = handleError(error);
      return { error: response, statusCode };
    });
}

/**
 * Create common error responses
 */
export const ErrorResponses = {
  unauthorized: (message = 'Unauthorized') => 
    createErrorResponse('UNAUTHORIZED', message),
  
  forbidden: (message = 'Forbidden') => 
    createErrorResponse('FORBIDDEN', message),
  
  notFound: (resource = 'Resource') => 
    createErrorResponse('NOT_FOUND', `${resource} not found`),
  
  validationError: (details: Record<string, any>) => 
    createErrorResponse('VALIDATION_ERROR', 'Validation failed', details),
  
  rateLimited: (retryAfter: number) => 
    createErrorResponse('RATE_LIMITED', 'Rate limit exceeded', { retryAfter }),
  
  conflict: (message: string) => 
    createErrorResponse('CONFLICT', message),
  
  badRequest: (message: string) => 
    createErrorResponse('BAD_REQUEST', message),
  
  internal: (message = 'Internal server error') => 
    createErrorResponse('INTERNAL_ERROR', message),
  
  serviceUnavailable: (message = 'Service temporarily unavailable') => 
    createErrorResponse('SERVICE_UNAVAILABLE', message),
  
  methodNotAllowed: (method: string) => 
    createErrorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`)
};
