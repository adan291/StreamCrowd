/**
 * TwitchApiServiceAdapter
 * 
 * Adapter that implements ITwitchApiServiceAdapter interface
 * and connects to TwitchAdapter for macro execution.
 * 
 * This adapter bridges the ActionExecutorService with the TwitchAdapter
 * for executing Twitch API actions like announcements, chat settings,
 * shoutouts, raids, and clips.
 * 
 * IMPORTANT: Some actions require the broadcaster's token (raids, polls, predictions)
 * while others can be done with the moderator's token (announcements, chat settings).
 * This adapter handles fetching the broadcaster token from Firebase when needed.
 */

import type { ITwitchApiServiceAdapter } from '../services/ActionExecutorService';
import type { TwitchAdapter } from '../../infrastructure/adapters/TwitchAdapter';
import { BroadcasterTokenService, BROADCASTER_SCOPES } from '../services/BroadcasterTokenService';
import { helixFetch } from '../../infrastructure/http/helixFetch';

export class TwitchApiServiceAdapter implements ITwitchApiServiceAdapter {
  private twitchAdapter: TwitchAdapter;
  private token: string | null = null;
  private broadcasterId: string | null = null;
  private moderatorId: string | null = null;

  constructor(twitchAdapter: TwitchAdapter) {
    this.twitchAdapter = twitchAdapter;
  }

  /**
   * Set authentication credentials
   */
  setCredentials(token: string, broadcasterId: string, moderatorId?: string): void {
    this.token = token;
    this.broadcasterId = broadcasterId;
    this.moderatorId = moderatorId || broadcasterId;
  }

  getToken(): string | null {
    return this.token;
  }

  getBroadcasterId(): string | null {
    return this.broadcasterId;
  }

  getModeratorId(): string | null {
    return this.moderatorId;
  }

  /**
   * Check if the current user is the broadcaster
   */
  private isOwnChannel(): boolean {
    return this.moderatorId === this.broadcasterId;
  }

  /**
   * Get the appropriate token for broadcaster-only actions
   * Returns the user's token if they're the broadcaster, or fetches from Firebase
   */
  private async getBroadcasterToken(requiredScopes: string[]): Promise<{ token: string } | { error: string }> {
    if (!this.broadcasterId) {
      return { error: 'No hay canal seleccionado' };
    }

    // If user is the broadcaster, use their token
    if (this.isOwnChannel() && this.token) {
      return { token: this.token };
    }

    // Otherwise, get broadcaster token from Firebase
    return BroadcasterTokenService.getTokenForAction(this.broadcasterId, requiredScopes);
  }

  /**
   * Send an announcement to chat
   */
  async sendAnnouncement(
    message: string,
    color?: 'blue' | 'green' | 'orange' | 'purple' | 'primary'
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.token || !this.broadcasterId || !this.moderatorId) {
      return { success: false, error: 'No autenticado en Twitch' };
    }

    try {
      const success = await this.twitchAdapter.sendAnnouncement(
        this.token,
        this.broadcasterId,
        this.moderatorId,
        message,
        color
      );
      
      return success 
        ? { success: true }
        : { success: false, error: 'Error al enviar anuncio' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Update chat settings
   */
  async updateChatSettings(settings: {
    slowMode?: boolean;
    slowModeWaitTime?: number;
    emoteMode?: boolean;
    subscriberMode?: boolean;
    followerMode?: boolean;
    followerModeDuration?: number;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.token || !this.broadcasterId || !this.moderatorId) {
      return { success: false, error: 'No autenticado en Twitch' };
    }

    try {
      const success = await this.twitchAdapter.updateChatSettings(
        this.token,
        this.broadcasterId,
        this.moderatorId,
        settings
      );
      
      return success 
        ? { success: true }
        : { success: false, error: 'Error al actualizar configuración del chat' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Send a shoutout to another streamer
   */
  async sendShoutout(targetUsername: string): Promise<{ success: boolean; error?: string }> {
    if (!this.token || !this.broadcasterId || !this.moderatorId) {
      return { success: false, error: 'No autenticado en Twitch' };
    }

    try {
      // First get the user ID for the target username
      const targetUserId = await this.twitchAdapter.getUserId(this.token, targetUsername);
      
      if (!targetUserId) {
        return { success: false, error: `Usuario "${targetUsername}" no encontrado` };
      }

      return await this.twitchAdapter.sendShoutout(
        this.token,
        this.broadcasterId,
        targetUserId,
        this.moderatorId
      );
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Start a raid to another channel
   * NOTE: This requires broadcaster token - moderators cannot start raids via API
   */
  async startRaid(targetUsername: string): Promise<{ success: boolean; error?: string }> {
    if (!this.broadcasterId) {
      return { success: false, error: 'No hay canal seleccionado' };
    }

    // Get broadcaster token (from Firebase if moderator)
    const tokenResult = await this.getBroadcasterToken([BROADCASTER_SCOPES.raids]);
    if ('error' in tokenResult) {
      return { success: false, error: tokenResult.error };
    }

    try {
      // First get the user ID for the target username
      const targetUserId = await this.twitchAdapter.getUserId(tokenResult.token, targetUsername);
      
      if (!targetUserId) {
        return { success: false, error: `Usuario "${targetUsername}" no encontrado` };
      }

      return await this.twitchAdapter.startRaid(
        tokenResult.token,
        this.broadcasterId,
        targetUserId
      );
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Create a clip of the current stream
   */
  async createClip(hasDelay?: boolean): Promise<{ 
    success: boolean; 
    clipId?: string; 
    editUrl?: string; 
    error?: string 
  }> {
    if (!this.token || !this.broadcasterId) {
      return { success: false, error: 'No autenticado en Twitch' };
    }

    try {
      return await this.twitchAdapter.createClip(
        this.token,
        this.broadcasterId,
        hasDelay
      );
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Create a poll
   * NOTE: This requires broadcaster token - moderators cannot create polls via API
   */
  async createPoll(data: {
    title: string;
    choices: string[];
    duration: number;
    channelPointsVotingEnabled?: boolean;
    channelPointsPerVote?: number;
  }): Promise<{ success: boolean; pollId?: string; error?: string }> {
    if (!this.broadcasterId) {
      return { success: false, error: 'No hay canal seleccionado' };
    }

    // Get broadcaster token (from Firebase if moderator)
    const tokenResult = await this.getBroadcasterToken([BROADCASTER_SCOPES.polls]);
    if ('error' in tokenResult) {
      return { success: false, error: tokenResult.error };
    }

    try {
      const response = await helixFetch('https://api.twitch.tv/helix/polls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenResult.token}`,
          'Client-Id': import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broadcaster_id: this.broadcasterId,
          title: data.title,
          choices: data.choices.map(title => ({ title })),
          duration: data.duration,
          channel_points_voting_enabled: data.channelPointsVotingEnabled || false,
          channel_points_per_vote: data.channelPointsPerVote || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `Error ${response.status}` 
        };
      }

      const result = await response.json();
      return { 
        success: true, 
        pollId: result.data?.[0]?.id 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }
}

// Singleton instance
let twitchApiServiceAdapterInstance: TwitchApiServiceAdapter | null = null;

/**
 * Get or create the TwitchApiServiceAdapter singleton
 */
export function getTwitchApiServiceAdapter(twitchAdapter?: TwitchAdapter): TwitchApiServiceAdapter | null {
  if (!twitchApiServiceAdapterInstance && twitchAdapter) {
    twitchApiServiceAdapterInstance = new TwitchApiServiceAdapter(twitchAdapter);
  }
  return twitchApiServiceAdapterInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetTwitchApiServiceAdapter(): void {
  twitchApiServiceAdapterInstance = null;
}

export default TwitchApiServiceAdapter;
