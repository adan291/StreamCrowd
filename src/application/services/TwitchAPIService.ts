/**
 * TwitchAPIService - Service for Twitch API data fetching
 * 
 * This service provides methods to fetch data from the Twitch API
 * (followers, subscribers, bits, clips, videos, moderators, VIPs, chatters)
 * with structured error handling.
 * 
 * @requirements 1.1-1.8 - API data fetching methods
 * @requirements 1.9 - Structured error handling
 */

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';

// ============================================
// Interfaces
// ============================================

/**
 * Structured error from Twitch API calls
 */
export interface TwitchAPIError {
  code: string;
  status: number;
  message: string;
  solution: string;
  link?: string;
}

/**
 * Follower data from Twitch API
 */
export interface Follower {
  username: string;
  displayName: string;
  followedAt: string;
}

/**
 * Subscriber data from Twitch API
 */
export interface Subscriber {
  username: string;
  displayName: string;
  tier: '1000' | '2000' | '3000' | 'Prime';
  isGift: boolean;
  gifterId?: string;
}

/**
 * Bits leaderboard entry
 */
export interface BitsLeader {
  rank: number;
  username: string;
  displayName: string;
  bits: number;
}

/**
 * Clip data from Twitch API
 */
export interface Clip {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  viewCount: number;
  creatorName: string;
  createdAt: string;
  duration: number;
}

/**
 * Video/VOD data from Twitch API
 */
export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  viewCount: number;
  type: 'archive' | 'highlight' | 'upload';
  duration: string;
  createdAt: string;
}

/**
 * Moderator data from Twitch API
 */
export interface Moderator {
  userId: string;
  username: string;
  displayName: string;
}

/**
 * VIP data from Twitch API
 */
export interface VIP {
  userId: string;
  username: string;
  displayName: string;
}

/**
 * Chatter data from Twitch API
 */
export interface Chatter {
  userId: string;
  username: string;
  displayName: string;
}

/**
 * Period for bits leaderboard
 */
export type BitsPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

/**
 * Video type filter
 */
export type VideoType = 'archive' | 'highlight' | 'upload' | 'all';

// ============================================
// Error Definitions
// ============================================

const ERROR_DEFINITIONS: Record<string, Omit<TwitchAPIError, 'status'>> = {
  invalid_token: {
    code: 'invalid_token',
    message: 'Token inválido o expirado',
    solution: 'Genera un nuevo token OAuth en twitchtokengenerator.com',
    link: 'https://twitchtokengenerator.com/'
  },
  token_expired: {
    code: 'token_expired',
    message: 'El token ha expirado',
    solution: 'Los tokens de Twitch expiran. Genera uno nuevo.',
    link: 'https://twitchtokengenerator.com/'
  },
  missing_scope_followers: {
    code: 'missing_scope_followers',
    message: 'Sin permiso para ver followers',
    solution: 'Necesitas el scope moderator:read:followers para ver seguidores recientes.',
    link: 'https://twitchtokengenerator.com/'
  },
  missing_scope_subscribers: {
    code: 'missing_scope_subscribers',
    message: 'Sin permiso para ver suscriptores',
    solution: 'Necesitas el scope channel:read:subscriptions para ver la lista de subs.',
    link: 'https://twitchtokengenerator.com/'
  },
  missing_scope_bits: {
    code: 'missing_scope_bits',
    message: 'Sin permiso para ver bits',
    solution: 'Necesitas el scope bits:read para ver el leaderboard de bits.',
    link: 'https://twitchtokengenerator.com/'
  },
  missing_scope_moderation: {
    code: 'missing_scope_moderation',
    message: 'Sin permiso para ver moderadores',
    solution: 'Necesitas el scope moderation:read para ver la lista de mods.',
    link: 'https://twitchtokengenerator.com/'
  },
  missing_scope_vips: {
    code: 'missing_scope_vips',
    message: 'Sin permiso para ver VIPs',
    solution: 'Necesitas el scope channel:read:vips para ver la lista de VIPs.',
    link: 'https://twitchtokengenerator.com/'
  },
  missing_scope_chatters: {
    code: 'missing_scope_chatters',
    message: 'Sin permiso para ver chatters',
    solution: 'Necesitas el scope moderator:read:chatters para ver los usuarios en el chat.',
    link: 'https://twitchtokengenerator.com/'
  },
  rate_limit: {
    code: 'rate_limit',
    message: 'Demasiadas peticiones',
    solution: 'Has excedido el límite de peticiones. Espera unos segundos e intenta de nuevo.'
  },
  server_error: {
    code: 'server_error',
    message: 'Error del servidor de Twitch',
    solution: 'Twitch está teniendo problemas. Intenta de nuevo en unos minutos.'
  },
  service_unavailable: {
    code: 'service_unavailable',
    message: 'Servicio no disponible',
    solution: 'El servicio de Twitch no está disponible temporalmente.'
  },
  channel_not_found: {
    code: 'channel_not_found',
    message: 'Canal no encontrado',
    solution: 'Verifica que el nombre del canal sea correcto.'
  },
  not_broadcaster: {
    code: 'not_broadcaster',
    message: 'No eres el broadcaster',
    solution: 'Algunas APIs solo funcionan con el token del dueño del canal.'
  },
  unknown: {
    code: 'unknown',
    message: 'Error desconocido',
    solution: 'Ocurrió un error inesperado. Revisa la consola para más detalles.'
  }
};

// ============================================
// Type Guards
// ============================================

/**
 * Check if a result is a TwitchAPIError
 */
export function isTwitchAPIError(result: unknown): result is TwitchAPIError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'code' in result &&
    'status' in result &&
    'message' in result &&
    'solution' in result
  );
}

// ============================================
// TwitchAPIService Class
// ============================================

export class TwitchAPIService {
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
   * Get authorization headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Client-Id': this.clientId,
    };
  }

  /**
   * Parse HTTP error status to structured TwitchAPIError
   * @requirements 1.9 - Structured error handling
   */
  parseError(status: number, body?: string, dataType?: string): TwitchAPIError {
    // Authentication errors
    if (status === 401) {
      if (body?.includes('expired')) {
        return { ...ERROR_DEFINITIONS['token_expired'], status };
      }
      return { ...ERROR_DEFINITIONS['invalid_token'], status };
    }

    // Permission errors
    if (status === 403) {
      // Detect missing scope based on data type
      if (dataType === 'followers') {
        return { ...ERROR_DEFINITIONS['missing_scope_followers'], status };
      }
      if (dataType === 'subscribers') {
        return { ...ERROR_DEFINITIONS['missing_scope_subscribers'], status };
      }
      if (dataType === 'bits') {
        return { ...ERROR_DEFINITIONS['missing_scope_bits'], status };
      }
      if (dataType === 'moderators') {
        return { ...ERROR_DEFINITIONS['missing_scope_moderation'], status };
      }
      if (dataType === 'vips') {
        return { ...ERROR_DEFINITIONS['missing_scope_vips'], status };
      }
      if (dataType === 'chatters') {
        return { ...ERROR_DEFINITIONS['missing_scope_chatters'], status };
      }

      // Check if error mentions broadcaster
      if (body?.includes('broadcaster')) {
        return { ...ERROR_DEFINITIONS['not_broadcaster'], status };
      }

      return {
        code: 'access_denied',
        status,
        message: 'Acceso denegado',
        solution: 'No tienes permisos para acceder a estos datos. Verifica los scopes de tu token.',
        link: 'https://twitchtokengenerator.com/'
      };
    }

    // Rate limit
    if (status === 429) {
      return { ...ERROR_DEFINITIONS['rate_limit'], status };
    }

    // Not found
    if (status === 404) {
      return { ...ERROR_DEFINITIONS['channel_not_found'], status };
    }

    // Server errors
    if (status >= 500) {
      if (status === 503) {
        return { ...ERROR_DEFINITIONS['service_unavailable'], status };
      }
      return { ...ERROR_DEFINITIONS['server_error'], status };
    }

    return { ...ERROR_DEFINITIONS['unknown'], status };
  }


  // ============================================
  // API Fetch Methods
  // ============================================

  /**
   * Get followers for a broadcaster
   * @requirements 1.1 - getFollowers method
   */
  async getFollowers(broadcasterId: string, limit: number = 100): Promise<Follower[] | TwitchAPIError> {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=${limit}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        return this.parseError(response.status, errorBody, 'followers');
      }

      const data = await response.json();
      return (data.data || []).map((f: any) => ({
        username: f.user_login || f.user_name,
        displayName: f.user_name || f.user_login,
        followedAt: f.followed_at,
      }));
    } catch (err) {
      console.error('Error fetching followers:', err);
      return this.parseError(0, String(err));
    }
  }

  /**
   * Get subscribers for a broadcaster
   * @requirements 1.2 - getSubscribers method
   */
  async getSubscribers(broadcasterId: string, limit: number = 100): Promise<Subscriber[] | TwitchAPIError> {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&first=${limit}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        return this.parseError(response.status, errorBody, 'subscribers');
      }

      const data = await response.json();
      return (data.data || []).map((s: any) => ({
        username: s.user_login || s.user_name,
        displayName: s.user_name || s.user_login,
        tier: s.tier as '1000' | '2000' | '3000' | 'Prime',
        isGift: s.is_gift || false,
        gifterId: s.gifter_id,
      }));
    } catch (err) {
      console.error('Error fetching subscribers:', err);
      return this.parseError(0, String(err));
    }
  }

  /**
   * Get bits leaderboard for a broadcaster
   * @requirements 1.3 - getBitsLeaderboard method
   */
  async getBitsLeaderboard(broadcasterId: string, period: BitsPeriod = 'all'): Promise<BitsLeader[] | TwitchAPIError> {
    try {
      let url = `https://api.twitch.tv/helix/bits/leaderboard?count=100`;
      if (period !== 'all') {
        url += `&period=${period}`;
      }

      const response = await fetch(url, { headers: this.getHeaders() });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        return this.parseError(response.status, errorBody, 'bits');
      }

      const data = await response.json();
      return (data.data || []).map((b: any) => ({
        rank: b.rank,
        username: b.user_login || b.user_name,
        displayName: b.user_name || b.user_login,
        bits: b.score,
      }));
    } catch (err) {
      console.error('Error fetching bits leaderboard:', err);
      return this.parseError(0, String(err));
    }
  }

  /**
   * Get clips for a broadcaster
   * @requirements 1.4 - getClips method
   */
  async getClips(
    broadcasterId: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<Clip[] | TwitchAPIError> {
    try {
      let url = `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&first=${limit}`;
      
      if (startDate) {
        url += `&started_at=${new Date(startDate).toISOString()}`;
      }
      if (endDate) {
        url += `&ended_at=${new Date(endDate).toISOString()}`;
      }

      const response = await fetch(url, { headers: this.getHeaders() });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        return this.parseError(response.status, errorBody, 'clips');
      }

      const data = await response.json();
      return (data.data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        url: c.url,
        thumbnailUrl: c.thumbnail_url,
        viewCount: c.view_count,
        creatorName: c.creator_name,
        createdAt: c.created_at,
        duration: c.duration,
      }));
    } catch (err) {
      console.error('Error fetching clips:', err);
      return this.parseError(0, String(err));
    }
  }

  /**
   * Get videos/VODs for a broadcaster
   * @requirements 1.5 - getVideos method
   */
  async getVideos(
    broadcasterId: string,
    type: VideoType = 'all',
    limit: number = 50
  ): Promise<Video[] | TwitchAPIError> {
    try {
      let url = `https://api.twitch.tv/helix/videos?user_id=${broadcasterId}&first=${limit}`;
      
      if (type !== 'all') {
        url += `&type=${type}`;
      }

      const response = await fetch(url, { headers: this.getHeaders() });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        return this.parseError(response.status, errorBody, 'videos');
      }

      const data = await response.json();
      return (data.data || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        url: v.url,
        thumbnailUrl: v.thumbnail_url,
        viewCount: v.view_count,
        type: v.type as 'archive' | 'highlight' | 'upload',
        duration: v.duration,
        createdAt: v.created_at,
      }));
    } catch (err) {
      console.error('Error fetching videos:', err);
      return this.parseError(0, String(err));
    }
  }

  /**
   * Get moderators for a broadcaster
   * @requirements 1.6 - getModerators method
   */
  async getModerators(broadcasterId: string): Promise<Moderator[] | TwitchAPIError> {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&first=100`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        return this.parseError(response.status, errorBody, 'moderators');
      }

      const data = await response.json();
      return (data.data || []).map((m: any) => ({
        userId: m.user_id,
        username: m.user_login || m.user_name,
        displayName: m.user_name || m.user_login,
      }));
    } catch (err) {
      console.error('Error fetching moderators:', err);
      return this.parseError(0, String(err));
    }
  }

  /**
   * Get VIPs for a broadcaster
   * @requirements 1.7 - getVIPs method
   */
  async getVIPs(broadcasterId: string): Promise<VIP[] | TwitchAPIError> {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&first=100`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        return this.parseError(response.status, errorBody, 'vips');
      }

      const data = await response.json();
      return (data.data || []).map((v: any) => ({
        userId: v.user_id,
        username: v.user_login || v.user_name,
        displayName: v.user_name || v.user_login,
      }));
    } catch (err) {
      console.error('Error fetching VIPs:', err);
      return this.parseError(0, String(err));
    }
  }

  /**
   * Get chatters (users currently in chat) for a broadcaster
   * @requirements 1.8 - getChatters method
   */
  async getChatters(broadcasterId: string, moderatorId?: string): Promise<Chatter[] | TwitchAPIError> {
    try {
      const modId = moderatorId || broadcasterId;
      const response = await fetch(
        `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${modId}&first=1000`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        return this.parseError(response.status, errorBody, 'chatters');
      }

      const data = await response.json();
      return (data.data || []).map((c: any) => ({
        userId: c.user_id,
        username: c.user_login || c.user_name,
        displayName: c.user_name || c.user_login,
      }));
    } catch (err) {
      console.error('Error fetching chatters:', err);
      return this.parseError(0, String(err));
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new TwitchAPIService instance
 */
export function createTwitchAPIService(token: string, clientId?: string): TwitchAPIService {
  return new TwitchAPIService(token, clientId);
}
