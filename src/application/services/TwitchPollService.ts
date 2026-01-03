/**
 * TwitchPollService - Service for Twitch Polls API
 * 
 * This service provides methods to manage Twitch polls
 * using the Twitch Helix API.
 * 
 * IMPORTANTE: Los polls requieren el scope channel:manage:polls
 * que solo puede ser otorgado por el broadcaster.
 */

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

// ============================================
// Types
// ============================================

export interface TwitchPollChoice {
  id: string;
  title: string;
  votes: number;
  channel_points_votes: number;
  bits_votes: number;
}

export interface TwitchPoll {
  id: string;
  broadcaster_id: string;
  broadcaster_name: string;
  broadcaster_login: string;
  title: string;
  choices: TwitchPollChoice[];
  bits_voting_enabled: boolean;
  bits_per_vote: number;
  channel_points_voting_enabled: boolean;
  channel_points_per_vote: number;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'ARCHIVED' | 'MODERATED' | 'INVALID';
  duration: number;
  started_at: string;
  ended_at?: string;
}

export interface CreatePollData {
  broadcaster_id: string;
  title: string;
  choices: Array<{ title: string }>;
  duration: number; // 15-1800 seconds
  channel_points_voting_enabled?: boolean;
  channel_points_per_vote?: number;
}

export interface EndPollData {
  broadcaster_id: string;
  id: string;
  status: 'TERMINATED' | 'ARCHIVED';
}

// ============================================
// Error Types
// ============================================

export interface TwitchPollError {
  code: string;
  status: number;
  message: string;
  solution: string;
  retryable: boolean;
}

export function isTwitchPollError(result: unknown): result is TwitchPollError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'code' in result &&
    'status' in result &&
    'message' in result &&
    'retryable' in result
  );
}

// ============================================
// Error Definitions
// ============================================

const ERROR_MESSAGES: Record<string, Omit<TwitchPollError, 'status'>> = {
  invalid_token: {
    code: 'invalid_token',
    message: 'Token inválido o expirado',
    solution: 'Reconecta tu cuenta de Twitch.',
    retryable: false,
  },
  missing_scope: {
    code: 'missing_scope',
    message: 'Sin permiso para gestionar encuestas',
    solution: 'El streamer debe autorizar la app con permisos de encuestas.',
    retryable: false,
  },
  broadcaster_mismatch: {
    code: 'broadcaster_mismatch',
    message: 'Solo el streamer puede crear encuestas',
    solution: 'La API de Twitch solo permite crear encuestas al dueño del canal.',
    retryable: false,
  },
  not_partner_affiliate: {
    code: 'not_partner_affiliate',
    message: 'Solo Partners y Affiliates pueden crear encuestas',
    solution: 'Las encuestas de Twitch solo están disponibles para Partners y Affiliates.',
    retryable: false,
  },
  rate_limit: {
    code: 'rate_limit',
    message: 'Demasiadas peticiones',
    solution: 'Espera unos segundos e intenta de nuevo.',
    retryable: true,
  },
  poll_active: {
    code: 'poll_active',
    message: 'Ya hay una encuesta activa',
    solution: 'Termina la encuesta actual antes de crear una nueva.',
    retryable: false,
  },
  poll_not_found: {
    code: 'poll_not_found',
    message: 'Encuesta no encontrada',
    solution: 'La encuesta puede haber sido eliminada.',
    retryable: false,
  },
  server_error: {
    code: 'server_error',
    message: 'Error del servidor de Twitch',
    solution: 'Twitch está teniendo problemas. Intenta más tarde.',
    retryable: true,
  },
  unknown: {
    code: 'unknown',
    message: 'Error desconocido',
    solution: 'Ocurrió un error inesperado.',
    retryable: false,
  },
};

// ============================================
// TwitchPollService Class
// ============================================

export class TwitchPollService {
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

  setToken(token: string): void {
    this.token = token.replace('oauth:', '');
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Client-Id': this.clientId,
      'Content-Type': 'application/json',
    };
  }

  parseError(status: number, body?: string): TwitchPollError {
    if (status === 401) {
      if (body?.includes('broadcaster_id must match')) {
        return { ...ERROR_MESSAGES['broadcaster_mismatch'], status };
      }
      if (body?.includes('scope')) {
        return { ...ERROR_MESSAGES['missing_scope'], status };
      }
      return { ...ERROR_MESSAGES['invalid_token'], status };
    }

    if (status === 403) {
      if (body?.includes('scope')) {
        return { ...ERROR_MESSAGES['missing_scope'], status };
      }
      if (body?.includes('affiliate') || body?.includes('partner')) {
        return { ...ERROR_MESSAGES['not_partner_affiliate'], status };
      }
      return { ...ERROR_MESSAGES['missing_scope'], status };
    }

    if (status === 429) {
      return { ...ERROR_MESSAGES['rate_limit'], status };
    }

    if (status === 404) {
      return { ...ERROR_MESSAGES['poll_not_found'], status };
    }

    if (status === 400) {
      if (body?.toLowerCase().includes('active poll') || body?.toLowerCase().includes('already')) {
        return { ...ERROR_MESSAGES['poll_active'], status };
      }
    }

    if (status >= 500) {
      return { ...ERROR_MESSAGES['server_error'], status };
    }

    return { ...ERROR_MESSAGES['unknown'], status };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withRetry<T>(
    fn: () => Promise<T | TwitchPollError>,
    retries: number = this.maxRetries
  ): Promise<T | TwitchPollError> {
    const result = await fn();
    
    if (isTwitchPollError(result) && result.retryable && retries > 0) {
      const delayTime = this.retryDelayMs * (this.maxRetries - retries + 1);
      await this.delay(delayTime);
      return this.withRetry(fn, retries - 1);
    }
    
    return result;
  }

  /**
   * Get polls for a broadcaster
   */
  async getPolls(broadcasterId: string): Promise<TwitchPoll[] | TwitchPollError> {
    return this.withRetry(async () => {
      try {
        const url = `${TWITCH_API_BASE}/polls?broadcaster_id=${broadcasterId}`;
        const response = await fetch(url, { headers: this.getHeaders() });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return this.parseError(response.status, errorBody);
        }

        const data = await response.json();
        return data.data || [];
      } catch (err) {
        console.error('[TwitchPollService] getPolls exception:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Create a new poll
   */
  async createPoll(data: CreatePollData): Promise<TwitchPoll | TwitchPollError> {
    console.log('[TwitchPollService] createPoll called', data);
    
    return this.withRetry(async () => {
      try {
        const response = await fetch(
          `${TWITCH_API_BASE}/polls`,
          {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
          }
        );

        console.log('[TwitchPollService] Response status:', response.status);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          console.log('[TwitchPollService] Error body:', errorBody);
          return this.parseError(response.status, errorBody);
        }

        const result = await response.json();
        console.log('[TwitchPollService] Poll created:', result.data[0]?.id);
        return result.data[0];
      } catch (err) {
        console.error('[TwitchPollService] createPoll exception:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * End a poll (terminate or archive)
   */
  async endPoll(data: EndPollData): Promise<TwitchPoll | TwitchPollError> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(
          `${TWITCH_API_BASE}/polls`,
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

        const result = await response.json();
        return result.data[0];
      } catch (err) {
        console.error('[TwitchPollService] endPoll exception:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Terminate a poll (ends immediately, shows results)
   */
  async terminatePoll(broadcasterId: string, pollId: string): Promise<TwitchPoll | TwitchPollError> {
    return this.endPoll({
      broadcaster_id: broadcasterId,
      id: pollId,
      status: 'TERMINATED',
    });
  }

  /**
   * Archive a poll (ends immediately, hides results)
   */
  async archivePoll(broadcasterId: string, pollId: string): Promise<TwitchPoll | TwitchPollError> {
    return this.endPoll({
      broadcaster_id: broadcasterId,
      id: pollId,
      status: 'ARCHIVED',
    });
  }
}

// ============================================
// Factory Function
// ============================================

export function createTwitchPollService(
  token: string,
  clientId?: string,
  maxRetries?: number,
  retryDelayMs?: number
): TwitchPollService {
  return new TwitchPollService(token, clientId, maxRetries, retryDelayMs);
}
