import type {
  IntegrationProvider,
  IntegrationEvent,
  IntegrationEventType,
  ConnectionStatus,
  EventFilters,
  IntegrationSettings,
} from '../../../types/integrations';
import { DEFAULT_INTEGRATION_SETTINGS } from '../../../types/integrations';
import { StreamlabsAdapter } from '../adapters/StreamlabsAdapter';
import { StreamElementsAdapter } from '../adapters/StreamElementsAdapter';

type EventHandler = (event: IntegrationEvent) => void;
type ConnectionHandler = (status: ConnectionStatus) => void;

export class IntegrationService {
  private streamlabs: StreamlabsAdapter;
  private streamelements: StreamElementsAdapter;
  private settings: IntegrationSettings;
  
  private events: IntegrationEvent[] = [];
  private eventHandlers: EventHandler[] = [];
  private connectionHandlers: ConnectionHandler[] = [];
  private connectionStatuses: Map<IntegrationProvider, ConnectionStatus> = new Map();

  constructor(settings?: Partial<IntegrationSettings>) {
    this.settings = { ...DEFAULT_INTEGRATION_SETTINGS, ...settings };
    this.streamlabs = new StreamlabsAdapter();
    this.streamelements = new StreamElementsAdapter();
    
    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    // Forward Streamlabs events
    this.streamlabs.onDonation((donation) => {
      this.addEvent('streamlabs', 'donation', {
        username: donation.name,
        amount: donation.amount,
        currency: donation.currency,
        message: donation.message,
      });
    });

    this.streamlabs.onFollow((follow) => {
      this.addEvent('streamlabs', 'follow', {
        username: follow.name,
      });
    });

    this.streamlabs.onSubscription((sub) => {
      this.addEvent('streamlabs', 'subscription', {
        username: sub.name,
        tier: sub.tier as '1000' | '2000' | '3000' | 'prime',
        months: sub.months,
        message: sub.message,
      });
    });

    this.streamlabs.onHost((host) => {
      this.addEvent('streamlabs', 'host', {
        username: host.name,
        viewers: host.viewers,
      });
    });

    this.streamlabs.onBits((bits) => {
      this.addEvent('streamlabs', 'cheer', {
        username: bits.name,
        amount: bits.amount,
        message: bits.message,
      });
    });

    this.streamlabs.onConnectionChange((status) => {
      this.connectionStatuses.set('streamlabs', status);
      this.emitConnectionStatus(status);
    });

    // Forward StreamElements events
    this.streamelements.onTip((tip) => {
      this.addEvent('streamelements', 'tip', {
        username: tip.username,
        amount: tip.amount,
        currency: tip.currency,
        message: tip.message,
      });
    });

    this.streamelements.onFollow((follow) => {
      this.addEvent('streamelements', 'follow', {
        username: follow.username,
      });
    });

    this.streamelements.onSubscription((sub) => {
      this.addEvent('streamelements', 'subscription', {
        username: sub.username,
        tier: sub.tier as '1000' | '2000' | '3000' | 'prime',
        months: sub.months,
        message: sub.message,
        isGift: sub.gifted,
      });
    });

    this.streamelements.onRaid((raid) => {
      this.addEvent('streamelements', 'raid', {
        username: raid.username,
        viewers: raid.viewers,
      });
    });

    this.streamelements.onCheer((cheer) => {
      this.addEvent('streamelements', 'cheer', {
        username: cheer.username,
        amount: cheer.amount,
        message: cheer.message,
      });
    });

    this.streamelements.onConnectionChange((status) => {
      this.connectionStatuses.set('streamelements', status);
      this.emitConnectionStatus(status);
    });
  }

  // ============================================
  // Connection Management
  // ============================================

  async connect(provider: IntegrationProvider): Promise<void> {
    switch (provider) {
      case 'streamlabs':
        await this.streamlabs.connectSocket();
        break;
      case 'streamelements':
        await this.streamelements.connectSocket();
        break;
    }
  }

  disconnect(provider: IntegrationProvider): void {
    switch (provider) {
      case 'streamlabs':
        this.streamlabs.disconnectSocket();
        break;
      case 'streamelements':
        this.streamelements.disconnectSocket();
        break;
    }
  }

  disconnectAll(): void {
    this.streamlabs.disconnectSocket();
    this.streamelements.disconnectSocket();
  }

  getConnectionStatus(provider: IntegrationProvider): ConnectionStatus {
    return this.connectionStatuses.get(provider) || {
      provider,
      connected: false,
    };
  }

  getAllConnectionStatuses(): ConnectionStatus[] {
    return [
      this.getConnectionStatus('streamlabs'),
      this.getConnectionStatus('streamelements'),
    ];
  }

  isConnected(provider: IntegrationProvider): boolean {
    return this.connectionStatuses.get(provider)?.connected || false;
  }

  // ============================================
  // Adapter Access
  // ============================================

  getStreamlabsAdapter(): StreamlabsAdapter {
    return this.streamlabs;
  }

  getStreamElementsAdapter(): StreamElementsAdapter {
    return this.streamelements;
  }

  // ============================================
  // Event Management
  // ============================================

  private addEvent(
    provider: IntegrationProvider,
    type: IntegrationEventType,
    data: IntegrationEvent['data']
  ): void {
    const event: IntegrationEvent = {
      id: crypto.randomUUID(),
      provider,
      type,
      timestamp: new Date(),
      data,
      processed: false,
    };

    this.events.unshift(event);
    
    // Trim events if exceeding max
    if (this.events.length > this.settings.maxEventsInMemory) {
      this.events = this.events.slice(0, this.settings.maxEventsInMemory);
    }

    this.emitEvent(event);
  }

  getEvents(filters?: EventFilters & { provider?: IntegrationProvider; type?: IntegrationEventType }): IntegrationEvent[] {
    let filtered = [...this.events];

    if (filters?.provider) {
      filtered = filtered.filter(e => e.provider === filters.provider);
    }

    if (filters?.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }

    if (filters?.minAmount !== undefined) {
      filtered = filtered.filter(e => (e.data.amount || 0) >= filters.minAmount!);
    }

    if (filters?.maxAmount !== undefined) {
      filtered = filtered.filter(e => (e.data.amount || 0) <= filters.maxAmount!);
    }

    if (filters?.usernames?.length) {
      const usernames = filters.usernames.map(u => u.toLowerCase());
      filtered = filtered.filter(e => 
        usernames.includes(e.data.username.toLowerCase())
      );
    }

    if (filters?.excludeUsernames?.length) {
      const excluded = filters.excludeUsernames.map(u => u.toLowerCase());
      filtered = filtered.filter(e => 
        !excluded.includes(e.data.username.toLowerCase())
      );
    }

    if (filters?.keywords?.length) {
      const keywords = filters.keywords.map(k => k.toLowerCase());
      filtered = filtered.filter(e => {
        const message = e.data.message?.toLowerCase() || '';
        return keywords.some(k => message.includes(k));
      });
    }

    return filtered;
  }

  getEventById(id: string): IntegrationEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  markEventProcessed(id: string): void {
    const event = this.events.find(e => e.id === id);
    if (event) {
      event.processed = true;
    }
  }

  clearEvents(): void {
    this.events = [];
  }

  getEventCount(): number {
    return this.events.length;
  }

  // ============================================
  // Event Handlers
  // ============================================

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
    };
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  private emitEvent(event: IntegrationEvent): void {
    this.eventHandlers.forEach(h => h(event));
  }

  private emitConnectionStatus(status: ConnectionStatus): void {
    this.connectionHandlers.forEach(h => h(status));
  }

  // ============================================
  // Settings
  // ============================================

  getSettings(): IntegrationSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<IntegrationSettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  // ============================================
  // Statistics
  // ============================================

  getStats(): {
    totalEvents: number;
    byProvider: Record<IntegrationProvider, number>;
    byType: Record<IntegrationEventType, number>;
    totalDonations: number;
    totalAmount: number;
  } {
    const byProvider: Record<IntegrationProvider, number> = {
      streamlabs: 0,
      streamelements: 0,
    };

    const byType: Record<IntegrationEventType, number> = {
      donation: 0,
      follow: 0,
      subscription: 0,
      raid: 0,
      cheer: 0,
      tip: 0,
      host: 0,
      bits: 0,
    };

    let totalAmount = 0;
    let totalDonations = 0;

    for (const event of this.events) {
      byProvider[event.provider]++;
      byType[event.type]++;

      if (event.type === 'donation' || event.type === 'tip') {
        totalDonations++;
        totalAmount += event.data.amount || 0;
      }
    }

    return {
      totalEvents: this.events.length,
      byProvider,
      byType,
      totalDonations,
      totalAmount,
    };
  }
}
