/**
 * MobileServerService - WebSocket server for mobile companion connections
 * @requirements Task 4 - Implementar MobileServerService (Desktop)
 */

import type {
  PairingData,
  ConnectedDevice,
  MobileMessage,
  DesktopMessage,
  MobileAppState,
  MobilePollState,
  MobilePredictionState,
  MobileTimerState,
  MobileGiveawayState,
  MobileChatMessage,
  MobileMetrics,
} from '../../types/mobile';

// Session code characters (no I, O, 0, 1 to avoid confusion)
const SESSION_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface MobileServerConfig {
  port: number;
  host: string;
  tokenExpiry: number; // ms
  maxDevices: number;
}

const DEFAULT_CONFIG: MobileServerConfig = {
  port: 9876,
  host: 'localhost',
  tokenExpiry: 5 * 60 * 1000, // 5 minutes
  maxDevices: 5,
};

type MessageHandler = (deviceId: string, message: MobileMessage) => void;
type ConnectionHandler = (device: ConnectedDevice) => void;
type DisconnectionHandler = (deviceId: string) => void;

class MobileServerService {
  private static instance: MobileServerService;
  private config: MobileServerConfig;
  private connectedDevices: Map<string, ConnectedDevice> = new Map();
  private pendingTokens: Map<string, { pairingData: PairingData; createdAt: number }> = new Map();
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectionHandlers: Set<DisconnectionHandler> = new Set();
  private wsServer: WebSocket | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<MobileServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<MobileServerConfig>): MobileServerService {
    if (!MobileServerService.instance) {
      MobileServerService.instance = new MobileServerService(config);
    }
    return MobileServerService.instance;
  }

  /**
   * Generate a random session code
   */
  private generateSessionCode(length: number = 6): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += SESSION_CHARS[Math.floor(Math.random() * SESSION_CHARS.length)];
    }
    return code;
  }

  /**
   * Generate a secure token
   */
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate pairing data for QR code
   */
  generatePairingData(channelName?: string): PairingData {
    const sessionId = this.generateSessionCode();
    const token = this.generateToken();
    const expiresAt = Date.now() + this.config.tokenExpiry;

    const pairingData: PairingData = {
      sessionId,
      wsUrl: `ws://${this.config.host}:${this.config.port}`,
      token,
      expiresAt,
      channelName,
    };

    // Store pending token
    this.pendingTokens.set(token, {
      pairingData,
      createdAt: Date.now(),
    });

    // Clean up expired tokens
    this.cleanupExpiredTokens();

    return pairingData;
  }

  /**
   * Validate a connection token
   */
  validateToken(token: string): PairingData | null {
    const pending = this.pendingTokens.get(token);
    if (!pending) return null;

    if (Date.now() > pending.pairingData.expiresAt) {
      this.pendingTokens.delete(token);
      return null;
    }

    return pending.pairingData;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, data] of this.pendingTokens) {
      if (now > data.pairingData.expiresAt) {
        this.pendingTokens.delete(token);
      }
    }
  }

  /**
   * Handle new device connection
   */
  handleConnection(ws: WebSocket, token: string, deviceInfo: Partial<ConnectedDevice>): boolean {
    const pairingData = this.validateToken(token);
    if (!pairingData) {
      this.sendToClient(ws, { type: 'ERROR', data: { code: 'INVALID_TOKEN', message: 'Token inválido o expirado' } });
      return false;
    }

    if (this.connectedDevices.size >= this.config.maxDevices) {
      this.sendToClient(ws, { type: 'ERROR', data: { code: 'MAX_DEVICES', message: 'Máximo de dispositivos alcanzado' } });
      return false;
    }

    // Remove used token
    this.pendingTokens.delete(token);

    // Create device record
    const device: ConnectedDevice = {
      id: this.generateToken().slice(0, 16),
      name: deviceInfo.name || 'Dispositivo móvil',
      platform: deviceInfo.platform || 'web',
      connectedAt: Date.now(),
      lastSeen: Date.now(),
    };

    this.connectedDevices.set(device.id, device);
    this.clients.set(device.id, ws);

    // Notify handlers
    this.connectionHandlers.forEach(handler => handler(device));

    // Send acceptance
    this.sendToClient(ws, { type: 'CONNECTION_ACCEPTED', data: { deviceId: device.id } });

    return true;
  }

  /**
   * Handle device disconnection
   */
  handleDisconnection(deviceId: string): void {
    this.connectedDevices.delete(deviceId);
    this.clients.delete(deviceId);
    this.disconnectionHandlers.forEach(handler => handler(deviceId));
  }

  /**
   * Handle incoming message from mobile
   */
  handleMessage(deviceId: string, message: MobileMessage): void {
    const device = this.connectedDevices.get(deviceId);
    if (device) {
      device.lastSeen = Date.now();
    }

    // Handle ping
    if (message.type === 'PING') {
      const client = this.clients.get(deviceId);
      if (client) {
        this.sendToClient(client, {
          type: 'PONG',
          data: { timestamp: message.data.timestamp, serverTime: Date.now() },
        });
      }
      return;
    }

    // Forward to handlers
    this.messageHandlers.forEach(handler => handler(deviceId, message));
  }

  /**
   * Send message to specific device
   */
  sendToDevice(deviceId: string, message: DesktopMessage): boolean {
    const client = this.clients.get(deviceId);
    if (!client) return false;
    return this.sendToClient(client, message);
  }

  /**
   * Send message to WebSocket client
   */
  private sendToClient(ws: WebSocket, message: DesktopMessage): boolean {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    return false;
  }

  /**
   * Broadcast message to all connected devices
   */
  broadcast(message: DesktopMessage): void {
    for (const [deviceId, client] of this.clients) {
      this.sendToClient(client, message);
    }
  }

  /**
   * Broadcast state sync to all devices
   */
  broadcastState(state: MobileAppState): void {
    this.broadcast({ type: 'STATE_SYNC', data: state });
  }

  /**
   * Broadcast poll update
   */
  broadcastPollUpdate(poll: MobilePollState | null): void {
    if (poll) {
      this.broadcast({ type: 'POLL_UPDATE', data: poll });
    }
  }

  /**
   * Broadcast prediction update
   */
  broadcastPredictionUpdate(prediction: MobilePredictionState): void {
    this.broadcast({ type: 'PREDICTION_UPDATE', data: prediction });
  }

  /**
   * Broadcast timer update
   */
  broadcastTimerUpdate(timer: MobileTimerState): void {
    this.broadcast({ type: 'TIMER_UPDATE', data: timer });
  }

  /**
   * Broadcast giveaway update
   */
  broadcastGiveawayUpdate(giveaway: MobileGiveawayState): void {
    this.broadcast({ type: 'GIVEAWAY_UPDATE', data: giveaway });
  }

  /**
   * Broadcast chat message
   */
  broadcastChatMessage(message: MobileChatMessage): void {
    this.broadcast({ type: 'CHAT_MESSAGE', data: message });
  }

  /**
   * Broadcast metrics update
   */
  broadcastMetrics(metrics: MobileMetrics): void {
    this.broadcast({ type: 'METRICS_UPDATE', data: metrics });
  }

  /**
   * Get connected devices
   */
  getConnectedDevices(): ConnectedDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * Get device count
   */
  getDeviceCount(): number {
    return this.connectedDevices.size;
  }

  /**
   * Disconnect a specific device
   */
  disconnectDevice(deviceId: string): void {
    const client = this.clients.get(deviceId);
    if (client) {
      client.close();
    }
    this.handleDisconnection(deviceId);
  }

  /**
   * Disconnect all devices
   */
  disconnectAll(): void {
    for (const [deviceId, client] of this.clients) {
      client.close();
      this.handleDisconnection(deviceId);
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register connection handler
   */
  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /**
   * Register disconnection handler
   */
  onDisconnection(handler: DisconnectionHandler): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  /**
   * Get server URL for display
   */
  getServerUrl(): string {
    return `ws://${this.config.host}:${this.config.port}`;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.wsServer !== null;
  }
}

export const getMobileServerService = (config?: Partial<MobileServerConfig>): MobileServerService => {
  return MobileServerService.getInstance(config);
};

export default MobileServerService;
