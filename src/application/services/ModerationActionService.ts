/**
 * ModerationActionService - Service for executing moderation actions
 * 
 * This service provides methods to execute moderation actions on Twitch
 * (timeout, ban, unban, VIP management, announcements) with structured results.
 * 
 * @requirements 2.1 - timeoutUser method
 * @requirements 2.2 - banUser method
 * @requirements 2.3 - unbanUser method
 * @requirements 2.4 - addVIP method
 * @requirements 2.5 - removeVIP method
 * @requirements 2.6 - sendAnnouncement method
 */

import { TwitchAPIError } from './TwitchAPIService';

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';

// ============================================
// Interfaces
// ============================================

/**
 * Result of a moderation action
 * @requirements 2.1 - ModerationResult interface
 */
export interface ModerationResult {
  success: boolean;
  message: string;
  error?: TwitchAPIError;
}

/**
 * Available colors for chat announcements
 * @requirements 2.1 - AnnouncementColor type
 */
export type AnnouncementColor = 'blue' | 'green' | 'orange' | 'purple' | 'primary';

// ============================================
// Error Definitions
// ============================================

const MODERATION_ERROR_DEFINITIONS: Record<string, Omit<TwitchAPIError, 'status'>> = {
  invalid_token: {
    code: 'invalid_token',
    message: 'Token inválido o expirado',
    solution: 'Genera un nuevo token OAuth en twitchtokengenerator.com',
    link: 'https://twitchtokengenerator.com/'
  },
  missing_scope_ban: {
    code: 'missing_scope_ban',
    message: 'Sin permiso para banear usuarios',
    solution: 'Necesitas el scope moderator:manage:banned_users para banear/desbanear usuarios.',
    link: 'https://twitchtokengenerator.com/'
  },
  missing_scope_vip: {
    code: 'missing_scope_vip',
    message: 'Sin permiso para gestionar VIPs',
    solution: 'Necesitas el scope channel:manage:vips para añadir/quitar VIPs.',
    link: 'https://twitchtokengenerator.com/'
  },
  missing_scope_announcement: {
    code: 'missing_scope_announcement',
    message: 'Sin permiso para enviar anuncios',
    solution: 'Necesitas el scope moderator:manage:announcements para enviar anuncios.',
    link: 'https://twitchtokengenerator.com/'
  },
  user_not_found: {
    code: 'user_not_found',
    message: 'Usuario no encontrado',
    solution: 'Verifica que el nombre de usuario sea correcto.'
  },
  not_moderator: {
    code: 'not_moderator',
    message: 'No eres moderador del canal',
    solution: 'Necesitas ser moderador o broadcaster para ejecutar esta acción.'
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
  unknown: {
    code: 'unknown',
    message: 'Error desconocido',
    solution: 'Ocurrió un error inesperado. Revisa la consola para más detalles.'
  }
};

// ============================================
// ModerationActionService Class
// ============================================

/**
 * Service for executing moderation actions on Twitch
 */
export class ModerationActionService {
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
      'Content-Type': 'application/json',
    };
  }

  /**
   * Parse HTTP error status to structured TwitchAPIError
   */
  private parseError(status: number, body?: string, actionType?: string): TwitchAPIError {
    // Authentication errors
    if (status === 401) {
      return { ...MODERATION_ERROR_DEFINITIONS['invalid_token'], status };
    }

    // Permission errors
    if (status === 403) {
      if (actionType === 'ban' || actionType === 'timeout' || actionType === 'unban') {
        return { ...MODERATION_ERROR_DEFINITIONS['missing_scope_ban'], status };
      }
      if (actionType === 'vip') {
        return { ...MODERATION_ERROR_DEFINITIONS['missing_scope_vip'], status };
      }
      if (actionType === 'announcement') {
        return { ...MODERATION_ERROR_DEFINITIONS['missing_scope_announcement'], status };
      }
      return { ...MODERATION_ERROR_DEFINITIONS['not_moderator'], status };
    }

    // Not found
    if (status === 404) {
      return { ...MODERATION_ERROR_DEFINITIONS['user_not_found'], status };
    }

    // Rate limit
    if (status === 429) {
      return { ...MODERATION_ERROR_DEFINITIONS['rate_limit'], status };
    }

    // Server errors
    if (status >= 500) {
      return { ...MODERATION_ERROR_DEFINITIONS['server_error'], status };
    }

    return { ...MODERATION_ERROR_DEFINITIONS['unknown'], status };
  }

  /**
   * Format duration for display
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  // ============================================
  // Moderation Action Methods
  // ============================================

  /**
   * Timeout a user in the channel
   * @requirements 2.1 - timeoutUser method
   */
  async timeoutUser(
    broadcasterId: string,
    userId: string,
    duration: number,
    reason?: string
  ): Promise<ModerationResult> {
    try {
      const body: Record<string, unknown> = {
        data: {
          user_id: userId,
          duration: duration,
        }
      };

      if (reason) {
        (body.data as Record<string, unknown>).reason = reason;
      }

      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const error = this.parseError(response.status, errorBody, 'timeout');
        return {
          success: false,
          message: error.message,
          error,
        };
      }

      return {
        success: true,
        message: `Usuario silenciado por ${this.formatDuration(duration)}`,
      };
    } catch (err) {
      console.error('Error timing out user:', err);
      const error = this.parseError(0, String(err), 'timeout');
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }

  /**
   * Ban a user from the channel permanently
   * @requirements 2.2 - banUser method
   */
  async banUser(
    broadcasterId: string,
    userId: string,
    reason?: string
  ): Promise<ModerationResult> {
    try {
      const body: Record<string, unknown> = {
        data: {
          user_id: userId,
        }
      };

      if (reason) {
        (body.data as Record<string, unknown>).reason = reason;
      }

      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const error = this.parseError(response.status, errorBody, 'ban');
        return {
          success: false,
          message: error.message,
          error,
        };
      }

      return {
        success: true,
        message: 'Usuario baneado permanentemente',
      };
    } catch (err) {
      console.error('Error banning user:', err);
      const error = this.parseError(0, String(err), 'ban');
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }

  /**
   * Unban a user from the channel
   * @requirements 2.3 - unbanUser method
   */
  async unbanUser(
    broadcasterId: string,
    userId: string
  ): Promise<ModerationResult> {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}&user_id=${userId}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const error = this.parseError(response.status, errorBody, 'unban');
        return {
          success: false,
          message: error.message,
          error,
        };
      }

      return {
        success: true,
        message: 'Usuario desbaneado',
      };
    } catch (err) {
      console.error('Error unbanning user:', err);
      const error = this.parseError(0, String(err), 'unban');
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }

  /**
   * Add VIP status to a user
   * @requirements 2.4 - addVIP method
   */
  async addVIP(
    broadcasterId: string,
    userId: string
  ): Promise<ModerationResult> {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const error = this.parseError(response.status, errorBody, 'vip');
        return {
          success: false,
          message: error.message,
          error,
        };
      }

      return {
        success: true,
        message: 'Usuario ahora es VIP',
      };
    } catch (err) {
      console.error('Error adding VIP:', err);
      const error = this.parseError(0, String(err), 'vip');
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }

  /**
   * Remove VIP status from a user
   * @requirements 2.5 - removeVIP method
   */
  async removeVIP(
    broadcasterId: string,
    userId: string
  ): Promise<ModerationResult> {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const error = this.parseError(response.status, errorBody, 'vip');
        return {
          success: false,
          message: error.message,
          error,
        };
      }

      return {
        success: true,
        message: 'Usuario ya no es VIP',
      };
    } catch (err) {
      console.error('Error removing VIP:', err);
      const error = this.parseError(0, String(err), 'vip');
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }

  /**
   * Send an announcement to the chat
   * @requirements 2.6 - sendAnnouncement method
   */
  async sendAnnouncement(
    broadcasterId: string,
    message: string,
    color: AnnouncementColor = 'primary'
  ): Promise<ModerationResult> {
    try {
      const body = {
        message,
        color,
      };

      const response = await fetch(
        `https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const error = this.parseError(response.status, errorBody, 'announcement');
        return {
          success: false,
          message: error.message,
          error,
        };
      }

      return {
        success: true,
        message: 'Anuncio enviado',
      };
    } catch (err) {
      console.error('Error sending announcement:', err);
      const error = this.parseError(0, String(err), 'announcement');
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new ModerationActionService instance
 */
export function createModerationActionService(token: string, clientId?: string): ModerationActionService {
  return new ModerationActionService(token, clientId);
}
