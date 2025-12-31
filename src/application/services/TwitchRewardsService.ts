/**
 * TwitchRewardsService - Service for Twitch Channel Points Rewards API
 * 
 * This service provides methods to manage Twitch custom rewards and redemptions
 * using the Twitch Helix API.
 * 
 * @requirements 4.1, 4.3 - Display and manage custom rewards
 * @requirements 5.1, 5.3 - Display and manage redemptions
 * @requirements 8.2, 8.4 - Error handling and rate limiting
 */

import type {
  TwitchReward,
  TwitchRedemption,
  CreateRewardData,
  UpdateRewardData,
  TwitchApiResponse,
  RedemptionStatus,
} from '../../../types/twitch';

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

// ============================================
// Error Types
// ============================================

/**
 * Structured error from Twitch Rewards API calls
 */
export interface TwitchRewardsError {
  code: string;
  status: number;
  message: string;
  solution: string;
  retryable: boolean;
}

/**
 * Check if a result is a TwitchRewardsError
 */
export function isTwitchRewardsError(result: unknown): result is TwitchRewardsError {
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

const ERROR_MESSAGES: Record<string, Omit<TwitchRewardsError, 'status'>> = {
  invalid_token: {
    code: 'invalid_token',
    message: 'Token inválido o expirado',
    solution: 'Reconecta tu cuenta de Twitch para obtener un nuevo token.',
    retryable: false,
  },
  missing_scope: {
    code: 'missing_scope',
    message: 'Sin permiso para gestionar recompensas',
    solution: 'Necesitas el scope channel:manage:redemptions. Reconecta tu cuenta.',
    retryable: false,
  },
  not_partner_affiliate: {
    code: 'not_partner_affiliate',
    message: 'Solo Partners y Affiliates pueden gestionar recompensas',
    solution: 'Las recompensas de Channel Points solo están disponibles para Partners y Affiliates.',
    retryable: false,
  },
  rate_limit: {
    code: 'rate_limit',
    message: 'Demasiadas peticiones',
    solution: 'Has excedido el límite de peticiones. Espera unos segundos.',
    retryable: true,
  },
  reward_not_found: {
    code: 'reward_not_found',
    message: 'Recompensa no encontrada',
    solution: 'La recompensa puede haber sido eliminada o no existe.',
    retryable: false,
  },
  redemption_not_found: {
    code: 'redemption_not_found',
    message: 'Redención no encontrada',
    solution: 'La redención puede haber sido procesada o no existe.',
    retryable: false,
  },
  reward_exists: {
    code: 'reward_exists',
    message: 'Ya existe una recompensa con ese nombre',
    solution: 'Usa un nombre diferente para la recompensa.',
    retryable: false,
  },
  invalid_cost: {
    code: 'invalid_cost',
    message: 'Costo inválido',
    solution: 'El costo debe ser un número positivo.',
    retryable: false,
  },
  cannot_manage_reward: {
    code: 'cannot_manage_reward',
    message: 'No puedes gestionar esta recompensa',
    solution: 'Solo puedes gestionar recompensas creadas por esta aplicación.',
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
// TwitchRewardsService Class
// ============================================

export class TwitchRewardsService {
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
   * Parse HTTP error status to structured TwitchRewardsError
   * @requirements 8.2, 8.4 - User-friendly error messages
   */
  parseError(status: number, body?: string): TwitchRewardsError {
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
      if (body?.includes('manage') || body?.includes('created')) {
        return { ...ERROR_MESSAGES['cannot_manage_reward'], status };
      }
      return { ...ERROR_MESSAGES['missing_scope'], status };
    }

    // Rate limit
    if (status === 429) {
      return { ...ERROR_MESSAGES['rate_limit'], status };
    }

    // Not found
    if (status === 404) {
      if (body?.includes('redemption')) {
        return { ...ERROR_MESSAGES['redemption_not_found'], status };
      }
      return { ...ERROR_MESSAGES['reward_not_found'], status };
    }

    // Bad request - check for specific errors
    if (status === 400) {
      if (body?.includes('already exists') || body?.includes('duplicate')) {
        return { ...ERROR_MESSAGES['reward_exists'], status };
      }
      if (body?.includes('cost')) {
        return { ...ERROR_MESSAGES['invalid_cost'], status };
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
    fn: () => Promise<T | TwitchRewardsError>,
    retries: number = this.maxRetries
  ): Promise<T | TwitchRewardsError> {
    const result = await fn();
    
    if (isTwitchRewardsError(result) && result.retryable && retries > 0) {
      const delayTime = this.retryDelayMs * (this.maxRetries - retries + 1);
      await this.delay(delayTime);
      return this.withRetry(fn, retries - 1);
    }
    
    return result;
  }


  // ============================================
  // Custom Rewards Methods
  // ============================================

  /**
   * Get custom rewards for a broadcaster
   * @requirements 4.1 - Display all custom rewards
   */
  async getCustomRewards(
    broadcasterId: string,
    onlyManageable: boolean = false
  ): Promise<TwitchReward[] | TwitchRewardsError> {
    return this.withRetry(async () => {
      try {
        let url = `${TWITCH_API_BASE}/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`;
        if (onlyManageable) {
          url += '&only_manageable_rewards=true';
        }

        const response = await fetch(url, { headers: this.getHeaders() });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return this.parseError(response.status, errorBody);
        }

        const data: TwitchApiResponse<TwitchReward> = await response.json();
        return data.data || [];
      } catch (err) {
        console.error('Error fetching custom rewards:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Create a new custom reward
   * @requirements 4.3 - Create custom reward via API
   */
  async createCustomReward(
    broadcasterId: string,
    data: CreateRewardData
  ): Promise<TwitchReward | TwitchRewardsError> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(
          `${TWITCH_API_BASE}/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`,
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

        const result: TwitchApiResponse<TwitchReward> = await response.json();
        return result.data[0];
      } catch (err) {
        console.error('Error creating custom reward:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Update an existing custom reward
   * @requirements 4.4 - Update custom reward
   */
  async updateCustomReward(
    broadcasterId: string,
    rewardId: string,
    data: UpdateRewardData
  ): Promise<TwitchReward | TwitchRewardsError> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(
          `${TWITCH_API_BASE}/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`,
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

        const result: TwitchApiResponse<TwitchReward> = await response.json();
        return result.data[0];
      } catch (err) {
        console.error('Error updating custom reward:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Delete a custom reward
   * @requirements 4.3 - Delete custom reward
   */
  async deleteCustomReward(
    broadcasterId: string,
    rewardId: string
  ): Promise<void | TwitchRewardsError> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(
          `${TWITCH_API_BASE}/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`,
          {
            method: 'DELETE',
            headers: this.getHeaders(),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return this.parseError(response.status, errorBody);
        }

        // DELETE returns 204 No Content on success
        return;
      } catch (err) {
        console.error('Error deleting custom reward:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Toggle a reward's enabled status
   * @requirements 4.5 - Enable/disable rewards
   */
  async toggleReward(
    broadcasterId: string,
    rewardId: string,
    isEnabled: boolean
  ): Promise<TwitchReward | TwitchRewardsError> {
    return this.updateCustomReward(broadcasterId, rewardId, { is_enabled: isEnabled });
  }


  // ============================================
  // Redemption Methods
  // ============================================

  /**
   * Get redemptions for a reward
   * @requirements 5.1 - Display pending redemptions
   */
  async getRedemptions(
    broadcasterId: string,
    rewardId: string,
    status?: RedemptionStatus,
    first: number = 50
  ): Promise<TwitchRedemption[] | TwitchRewardsError> {
    return this.withRetry(async () => {
      try {
        let url = `${TWITCH_API_BASE}/channel_points/custom_rewards/redemptions?broadcaster_id=${broadcasterId}&reward_id=${rewardId}&first=${first}`;
        if (status) {
          url += `&status=${status}`;
        }

        const response = await fetch(url, { headers: this.getHeaders() });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return this.parseError(response.status, errorBody);
        }

        const data: TwitchApiResponse<TwitchRedemption> = await response.json();
        return data.data || [];
      } catch (err) {
        console.error('Error fetching redemptions:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Get all pending redemptions across all rewards
   * @requirements 5.1 - Display all pending redemptions
   */
  async getAllPendingRedemptions(
    broadcasterId: string
  ): Promise<TwitchRedemption[] | TwitchRewardsError> {
    // First get all manageable rewards
    const rewards = await this.getCustomRewards(broadcasterId, true);
    
    if (isTwitchRewardsError(rewards)) {
      return rewards;
    }

    // Then get pending redemptions for each reward
    const allRedemptions: TwitchRedemption[] = [];
    
    for (const reward of rewards) {
      const redemptions = await this.getRedemptions(
        broadcasterId,
        reward.id,
        'UNFULFILLED'
      );
      
      if (isTwitchRewardsError(redemptions)) {
        // Log error but continue with other rewards
        console.warn(`Error fetching redemptions for reward ${reward.id}:`, redemptions);
        continue;
      }
      
      allRedemptions.push(...redemptions);
    }

    // Sort by redeemed_at (most recent first)
    return allRedemptions.sort(
      (a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime()
    );
  }

  /**
   * Update redemption status (fulfill or reject)
   * @requirements 5.3 - Mark redemptions as fulfilled or rejected
   */
  async updateRedemptionStatus(
    broadcasterId: string,
    rewardId: string,
    redemptionId: string,
    status: 'FULFILLED' | 'CANCELED'
  ): Promise<TwitchRedemption | TwitchRewardsError> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(
          `${TWITCH_API_BASE}/channel_points/custom_rewards/redemptions?broadcaster_id=${broadcasterId}&reward_id=${rewardId}&id=${redemptionId}`,
          {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify({ status }),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return this.parseError(response.status, errorBody);
        }

        const result: TwitchApiResponse<TwitchRedemption> = await response.json();
        return result.data[0];
      } catch (err) {
        console.error('Error updating redemption status:', err);
        return this.parseError(0, String(err));
      }
    });
  }

  /**
   * Fulfill a redemption
   * @requirements 5.3 - Mark redemption as fulfilled
   */
  async fulfillRedemption(
    broadcasterId: string,
    rewardId: string,
    redemptionId: string
  ): Promise<TwitchRedemption | TwitchRewardsError> {
    return this.updateRedemptionStatus(broadcasterId, rewardId, redemptionId, 'FULFILLED');
  }

  /**
   * Reject/cancel a redemption
   * @requirements 5.3 - Mark redemption as rejected
   */
  async rejectRedemption(
    broadcasterId: string,
    rewardId: string,
    redemptionId: string
  ): Promise<TwitchRedemption | TwitchRewardsError> {
    return this.updateRedemptionStatus(broadcasterId, rewardId, redemptionId, 'CANCELED');
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new TwitchRewardsService instance
 */
export function createTwitchRewardsService(
  token: string,
  clientId?: string,
  maxRetries?: number,
  retryDelayMs?: number
): TwitchRewardsService {
  return new TwitchRewardsService(token, clientId, maxRetries, retryDelayMs);
}
