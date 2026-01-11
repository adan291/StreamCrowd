/**
 * PlatformModeratedChannelsService - Stub for moderated channels management
 * 
 * This service manages channels where the user has moderator permissions.
 */

export interface ChannelContext {
  channelId: string;
  channelName: string;
  channelLogin?: string;
  platform: 'twitch' | 'youtube' | 'kick';
  isModerator: boolean;
  isOwner: boolean;
  isOwnChannel?: boolean;
}

export interface ModeratedChannel {
  id: string;
  name: string;
  platform: 'twitch' | 'youtube' | 'kick';
  addedAt: number;
}

export class PlatformModeratedChannelsService {
  private channels: Map<string, ModeratedChannel> = new Map();

  getModeratedChannels(): ModeratedChannel[] {
    return Array.from(this.channels.values());
  }

  addChannel(channel: ModeratedChannel): void {
    this.channels.set(channel.id, channel);
  }

  removeChannel(channelId: string): void {
    this.channels.delete(channelId);
  }

  getChannelContext(channelId: string): ChannelContext | null {
    const channel = this.channels.get(channelId);
    if (!channel) return null;
    
    return {
      channelId: channel.id,
      channelName: channel.name,
      platform: channel.platform,
      isModerator: true,
      isOwner: false,
    };
  }
}

let instance: PlatformModeratedChannelsService | null = null;

export function getPlatformModeratedChannelsService(): PlatformModeratedChannelsService {
  if (!instance) {
    instance = new PlatformModeratedChannelsService();
  }
  return instance;
}
