/**
 * ModeratedChannelsService - Service for fetching channels where user is moderator
 * 
 * Uses Twitch Helix API endpoint: GET /moderation/channels
 * Returns list of channels where the authenticated user has moderator privileges.
 * 
 * @module src/application/services/ModeratedChannelsService
 */

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

// ============================================
// Types
// ============================================

/**
 * Channel where user is moderator
 */
export interface ModeratedChannel {
  /** Broadcaster's user ID */
  broadcasterId: string;
  /** Broadcaster's login name (lowercase) */
  broadcasterLogin: string;
  /** Broadcaster's display name */
  broadcasterName: string;
}

/**
 * Channel context for the app - either own channel or moderated channel
 */
export interface ChannelContext {
  /** Channel ID (broadcaster_id) */
  channelId: string;
  /** Channel login name */
  channelLogin: string;
  /** Channel display name */
  channelName: string;
  /** Whether this is the user's own channel */
  isOwnChannel: boolean;
  /** Whether user is moderator (always true for moderated channels, true for own channel) */
  isModerator: boolean;
  /** Whether user is broadcaster (only true for own channel) */
  isBroadcaster: boolean;
}

/**
 * Error from API calls
 */
export interface ModeratedChannelsError {
  code: string;
  status: number;
  message: string;
  solution: string;
}

// ============================================
// Type Guards
// ============================================

export function isModeratedChannelsError(result: unknown): result is ModeratedChannelsError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'code' in result &&
    'status' in result &&
    'message' in result
  );
}

// ============================================
// Error Definitions
// ============================================

const ERROR_MESSAGES: Record<string, Omit<ModeratedChannelsError, 'status'>> = {
  invalid_token: {
    code: 'invalid_token',
    message: 'Token inválido o expirado',
    solution: 'Reconecta tu cuenta de Twitch.',
  },
  missing_scope: {
    code: 'missing_scope',
    message: 'Sin permiso para ver canales moderados',
    solution: 'Necesitas el scope user:read:moderated_channels. Reconecta tu cuenta.',
  },
  rate_limit: {
    code: 'rate_limit',
    message: 'Demasiadas peticiones',
    solution: 'Espera unos segundos e intenta de nuevo.',
  },
  server_error: {
    code: 'server_error',
    message: 'Error del servidor de Twitch',
    solution: 'Twitch está teniendo problemas. Intenta más tarde.',
  },
  unknown: {
    code: 'unknown',
    message: 'Error desconocido',
    solution: 'Ocurrió un error inesperado.',
  },
};

// ============================================
// Service Class
// ============================================

export class ModeratedChannelsService {
  private token: string;
  private clientId: string;

  constructor(token: string, clientId: string = TWITCH_CLIENT_ID) {
    this.token = token.replace('oauth:', '');
    this.clientId = clientId;
  }

  /**
   * Update the OAuth token
   */
  setToken(token: string): void {
    this.token = token.replace('oauth:', '');
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Client-Id': this.clientId,
    };
  }

  /**
   * Parse error response
   */
  private parseError(status: number, body?: string): ModeratedChannelsError {
    if (status === 401) {
      if (body?.includes('scope')) {
        return { ...ERROR_MESSAGES['missing_scope'], status };
      }
      return { ...ERROR_MESSAGES['invalid_token'], status };
    }
    if (status === 403) {
      return { ...ERROR_MESSAGES['missing_scope'], status };
    }
    if (status === 429) {
      return { ...ERROR_MESSAGES['rate_limit'], status };
    }
    if (status >= 500) {
      return { ...ERROR_MESSAGES['server_error'], status };
    }
    return { ...ERROR_MESSAGES['unknown'], status };
  }

  /**
   * Get channels where the authenticated user is a moderator
   * 
   * @param userId - The authenticated user's ID
   * @returns List of moderated channels or error
   */
  async getModeratedChannels(userId: string): Promise<ModeratedChannel[] | ModeratedChannelsError> {
    try {
      const allChannels: ModeratedChannel[] = [];
      let cursor: string | null = null;

      // Paginate through all results
      do {
        const url = new URL(`${TWITCH_API_BASE}/moderation/channels`);
        url.searchParams.set('user_id', userId);
        url.searchParams.set('first', '100');
        if (cursor) {
          url.searchParams.set('after', cursor);
        }

        const response = await fetch(url.toString(), {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          const error = this.parseError(response.status, errorBody);
          // Don't log 401 errors - they're expected when scope is missing
          return error;
        }

        const data = await response.json();
        
        const channels: ModeratedChannel[] = (data.data || []).map((ch: any) => ({
          broadcasterId: ch.broadcaster_id,
          broadcasterLogin: ch.broadcaster_login,
          broadcasterName: ch.broadcaster_name,
        }));

        allChannels.push(...channels);
        cursor = data.pagination?.cursor || null;

      } while (cursor);

      return allChannels;
    } catch (err) {
      console.error('Error fetching moderated channels:', err);
      return this.parseError(0, String(err));
    }
  }

  /**
   * Build channel context options for the user
   * 
   * @param userId - User's Twitch ID
   * @param userLogin - User's login name
   * @param userName - User's display name
   * @returns Array of channel contexts (own channel + moderated channels)
   */
  async getChannelContextOptions(
    userId: string,
    userLogin: string,
    userName: string
  ): Promise<ChannelContext[] | ModeratedChannelsError> {
    // Start with user's own channel
    const contexts: ChannelContext[] = [
      {
        channelId: userId,
        channelLogin: userLogin,
        channelName: userName,
        isOwnChannel: true,
        isModerator: true,
        isBroadcaster: true,
      },
    ];

    // Fetch moderated channels
    const moderatedResult = await this.getModeratedChannels(userId);
    
    if (isModeratedChannelsError(moderatedResult)) {
      // If we can't fetch moderated channels, still return own channel
      // Only log if it's not a scope issue (scope issues are expected for users who haven't re-authenticated)
      if (moderatedResult.code !== 'missing_scope') {
        console.warn('Could not fetch moderated channels:', moderatedResult.message);
      }
      return contexts;
    }

    // Add moderated channels
    for (const channel of moderatedResult) {
      contexts.push({
        channelId: channel.broadcasterId,
        channelLogin: channel.broadcasterLogin,
        channelName: channel.broadcasterName,
        isOwnChannel: false,
        isModerator: true,
        isBroadcaster: false,
      });
    }

    return contexts;
  }
}

// ============================================
// Factory & Singleton
// ============================================

let serviceInstance: ModeratedChannelsService | null = null;

export function createModeratedChannelsService(token: string): ModeratedChannelsService {
  return new ModeratedChannelsService(token);
}

export function getModeratedChannelsService(token: string): ModeratedChannelsService {
  if (!serviceInstance) {
    serviceInstance = new ModeratedChannelsService(token);
  } else {
    serviceInstance.setToken(token);
  }
  return serviceInstance;
}
