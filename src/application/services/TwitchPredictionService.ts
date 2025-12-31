/**
 * TwitchPredictionService - Service for Twitch Predictions API
 * 
 * This service provides methods to manage Twitch predictions
 * using the Twitch Helix API.
 * 
 * @requirements 1.2, 1.3 - Create and display predictions
 * @requirements 2.3, 2.4, 2.5 - Lock, resolve, cancel predictions
 * @requirements 8.2, 8.4 - Error handling and rate limiting
 */

import type {
  TwitchPrediction,
  CreatePredictionData,
  EndPredictionData,
  TwitchApiResponse,
  PredictionStatus,
} from '../../../types/twitch';

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

// ============================================
// Error Types
// ============================================

/**
 * Structured error from Twitch Prediction API calls
 */
export interface TwitchPredictionError {
  code: string;
  status: number;
  message: string;
  solution: string;
  retryable: boolean;
}

/**
 * Check if a result is a TwitchPredictionError
 */
export function isTwitchPredictionError(result: unknown): result is TwitchPredictionError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'code' in result &&
    'status' in result &&
    'message' in result &&
    'solution' in result &&
    'retryable' in result
  );
}

// ============================================
// Error Definitions
// ============================================

const ERROR_MESSAGES: Record<string, Omit<TwitchPredictionError, 'status'>> = {
  invalid_token: {
    code: 'invalid_token',
    message: 'Token inválido o expirado',
    solution: 'Reconecta tu cuenta de Twitch para obtener un nuevo token.',
    retryable: false,
  },
  missing_scope: {
    code: 'missing_scope',
    message: 'Sin permiso para gestionar predicciones',
    solution: 'Necesitas el scope channel:manage:predictions. Reconecta tu cuenta.',
    retryable: false,
  },
  not_partner_affiliate: {
    code: 'not_partner_affiliate',
    message: 'Solo Partners y Affiliates pueden crear predicciones',
    solution: 'Las predicciones de Twitch solo están disponibles para Partners y Affiliates.',
    retryable: false,
  },
  rate_limit: {
    code: 'rate_limit',
    message: 'Demasiadas peticiones',
    solution: 'Has excedido el límite de peticiones. Espera unos segundos.',
    retryable: true,
  },
  prediction_active: {
    code: 'prediction_active',
    message: 'Ya hay una predicción activa',
    solution: 'Debes resolver o cancelar la predicción actual antes de crear una nueva.',
    retryable: false,
  },
  prediction_not_found: {
    code: 'prediction_not_found',
    message: 'Predicción no encontrada',
    solution: 'La predicción puede haber sido eliminada o ya no existe.',
    retryable: false,
  },
  invalid_status_transition: {
    code: 'invalid_status_transition',
    message: 'Transición de estado inválida',
    solution: 'No se puede cambiar el estado de la predicción de esta manera.',
    retryable: false,
  },
  server_error: {
    code: 'server_error',
    message: 'Error del servidor de Twitch',
    solution: 'Twitch está teniendo problemas. Intenta de nuevo en unos minutos.',
    retryable: true,
  },
  unknown: {
    code: 'unknown',
    message: 'Error desconocido',
    solution: 'Ocurrió un error inesperado. Revisa la consola para más detalles.',
    retryable: false,
  },
};

// ============================================
// Valid State Transitions
// ============================================

/**
 * Valid prediction status transitions
 * @requirements 1.4, 2.3, 2.4, 2.5 - State machine validation
 */
export const VALID_TRANSITIONS: Record<PredictionStatus, PredictionStatus[]> = {
  ACTIVE: ['LOCKED', 'RESOLVED', 'CANCELED'],
  LOCKED: ['RESOLVED', 'CANCELED'],
  RESOLVED: [], // Terminal state
  CANCELED: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: PredictionStatus, to: PredictionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================
// TwitchPredictionService Class
// ============================================

export class TwitchPredictionService {
  private token: string;
  private clientId: string;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(
    token: string,
    clientId: string = TWITCH_CLIENT_ID,
    maxRetries: number = 3,
    retryDelayMs: number = 1000
  ) {
    this.token = token.replace('oauth:', '');
    this.clientId = clientId;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  /**
   * Update the OAuth token
   */
  setToken(token: string): void {
    this.token = token.replace('oauth:', '');
  }

  /**
   * Get authorization headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Client-Id': this.clientId,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Parse HTTP error status to structured TwitchPredictionError
   * @requirements 8.2, 8.4 - User-friendly error messages
   */
  parseError(status: number, body?: string): TwitchPredictionError {
    // Authentication errors
    if (status === 401) {
      return { ...ERROR_MESSAGES['invalid_token'], status };
    }

    // Permission errors
    if (status === 403) {
      if (body?.includes('scope')) {
        return { ...ERROR_MESSAGES['missing_scope'], status };
      }
      if (body?.includes('affiliate') || body?.includes('partner')) {
        return { ...ERROR_MESSAGES['not_partner_affiliate'], status };
      }
      return { ...ERROR_MESSAGES['missing_scope'], status };
    }

    // Rate limit
    if (status === 429) {
      return { ...ERROR_MESSAGES['rate_limit'], status };
    }

    // Not found
    if (status === 404) {
      return { ...ERROR_MESSAGES['prediction_not_found'], status };
    }

    // Bad request - check for specific errors
    if (status === 400) {
      if (body?.includes('active prediction')) {
        return { ...ERROR_MESSAGES['prediction_active'], status };
      }
      if (body?.includes('status') || body?.includes('transition')) {
        return { ...ERROR_MESSAGES['invalid_status_transition'], status };
      }
    }

    // Server errors
    if (status >= 500) {
      return { ...ERROR_MESSAGES['server_error'], status };
    }

    return { ...ERROR_MESSAGES['unknown'], status };
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a request with retry logic for rate limiting
   * @requirements 8.4 - Rate limit handling with retry
   */
  private async withRetry<T>(
    fn: () => Promise<T | TwitchPredictionError>,
    retries: number = this.maxRetries
  ): Promise<T | TwitchPredictionError> {
    const result = await fn();
    
    if (isTwitchPredictionError(result) && result.retryable && retries > 0) {
      const delayTime = this.retryDelayMs * (this.maxRetries - retries + 1);
      await this.delay(delayTime);
      return this.withRetry(fn, retries - 1);
    }
    
    return result;
  }

  /**
   * Get predictions for a broadcaster
   * @requirements 1.3 - Display current active prediction
   */
  async getPredictions(broadcasterId: string): Promise<TwitchPrediction[] | TwitchPredictionError> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(
          `${TWITCH_API_BASE}/predictions?broadcaster_id=${broadcasterId}`,
          { headers: this.getHeaders() }
        );

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return this.parseError(response.status, errorBody);
        }

        const data: TwitchApiResponse<TwitchPrediction> = await response.json();
        return data.data || [];
      } catch (err) {
        console.error('Error fetching predictions:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Create a new prediction
   * @requirements 1.2 - Create prediction via Twitch API
   */
  async createPrediction(data: CreatePredictionData): Promise<TwitchPrediction | TwitchPredictionError> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(
          `${TWITCH_API_BASE}/predictions`,
          {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return this.parseError(response.status, errorBody);
        }

        const result: TwitchApiResponse<TwitchPrediction> = await response.json();
        return result.data[0];
      } catch (err) {
        console.error('Error creating prediction:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * End a prediction (lock, resolve, or cancel)
   * @requirements 2.3, 2.4, 2.5 - Lock, resolve, cancel predictions
   */
  async endPrediction(data: EndPredictionData): Promise<TwitchPrediction | TwitchPredictionError> {
    // Validate that RESOLVED status has winning_outcome_id
    if (data.status === 'RESOLVED' && !data.winning_outcome_id) {
      return {
        code: 'missing_winning_outcome',
        status: 400,
        message: 'Se requiere seleccionar un ganador',
        solution: 'Debes seleccionar el outcome ganador para resolver la predicción.',
        retryable: false,
      };
    }

    return this.withRetry(async () => {
      try {
        const response = await fetch(
          `${TWITCH_API_BASE}/predictions`,
          {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return this.parseError(response.status, errorBody);
        }

        const result: TwitchApiResponse<TwitchPrediction> = await response.json();
        return result.data[0];
      } catch (err) {
        console.error('Error ending prediction:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Lock a prediction (prevent new bets)
   * @requirements 2.3 - Lock prediction
   */
  async lockPrediction(broadcasterId: string, predictionId: string): Promise<TwitchPrediction | TwitchPredictionError> {
    return this.endPrediction({
      broadcaster_id: broadcasterId,
      id: predictionId,
      status: 'LOCKED',
    });
  }

  /**
   * Resolve a prediction with a winning outcome
   * @requirements 2.4 - Resolve prediction
   */
  async resolvePrediction(
    broadcasterId: string,
    predictionId: string,
    winningOutcomeId: string
  ): Promise<TwitchPrediction | TwitchPredictionError> {
    return this.endPrediction({
      broadcaster_id: broadcasterId,
      id: predictionId,
      status: 'RESOLVED',
      winning_outcome_id: winningOutcomeId,
    });
  }

  /**
   * Cancel a prediction and refund points
   * @requirements 2.5 - Cancel prediction
   */
  async cancelPrediction(broadcasterId: string, predictionId: string): Promise<TwitchPrediction | TwitchPredictionError> {
    return this.endPrediction({
      broadcaster_id: broadcasterId,
      id: predictionId,
      status: 'CANCELED',
    });
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new TwitchPredictionService instance
 */
export function createTwitchPredictionService(
  token: string,
  clientId?: string,
  maxRetries?: number,
  retryDelayMs?: number
): TwitchPredictionService {
  return new TwitchPredictionService(token, clientId, maxRetries, retryDelayMs);
}
