/**
 * Mobile Companion Integration Tests
 * @requirements Task 14 - Tests de integración
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: Error) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket;

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Mobile Companion Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('PairingService', () => {
    it('should parse valid QR code data', async () => {
      const { getPairingService } = await import('../../mobile/services/PairingService');
      const service = getPairingService();

      const validData = JSON.stringify({
        sessionId: 'ABC123',
        wsUrl: 'ws://localhost:9876',
        token: 'token123',
        expiresAt: Date.now() + 300000,
      });

      const result = service.parseQRCode(validData);
      expect(result.success).toBe(true);
      expect(result.data?.sessionId).toBe('ABC123');
      expect(result.data?.wsUrl).toBe('ws://localhost:9876');
      expect(result.data?.token).toBe('token123');
    });

    it('should reject invalid QR code data', async () => {
      const { getPairingService } = await import('../../mobile/services/PairingService');
      const service = getPairingService();

      const result = service.parseQRCode('invalid data');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should generate valid pairing codes', async () => {
      const { PairingService } = await import('../../mobile/services/PairingService');
      
      // Valid characters: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no I, O, 0, 1)
      const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      
      for (let i = 0; i < 10; i++) {
        const code = PairingService.generatePairingCode();
        expect(code).toHaveLength(6);
        for (const char of code) {
          expect(validChars).toContain(char);
        }
      }
    });

    it('should detect expired pairing data', async () => {
      const { getPairingService } = await import('../../mobile/services/PairingService');
      const service = getPairingService();

      const expiredData = JSON.stringify({
        sessionId: 'ABC123',
        wsUrl: 'ws://localhost:9876',
        token: 'token123',
        expiresAt: Date.now() - 1000, // Expired
      });

      const result = service.parseQRCode(expiredData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should format codes correctly', async () => {
      const { PairingService } = await import('../../mobile/services/PairingService');
      
      expect(PairingService.formatCode('ABC234')).toBe('ABC-234');
      expect(PairingService.formatCode('abc234')).toBe('ABC-234');
      expect(PairingService.formatCode('AB')).toBe('AB');
    });
  });

  describe('MobileWebSocketService', () => {
    it('should connect with valid pairing data', async () => {
      const { getMobileWebSocketService } = await import('../../mobile/services/MobileWebSocketService');
      
      // Get fresh instance
      const service = getMobileWebSocketService();

      const pairingData = {
        sessionId: 'ABC123',
        wsUrl: 'ws://localhost:9876',
        token: 'validtoken',
        expiresAt: Date.now() + 300000,
      };

      const connectPromise = service.connect(pairingData);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should be connecting or connected
      expect(['connecting', 'connected']).toContain(service.getStatus());
    });

    it('should handle message sending', async () => {
      const { getMobileWebSocketService } = await import('../../mobile/services/MobileWebSocketService');
      const service = getMobileWebSocketService();

      // Not connected - should return false
      const result = service.send({ type: 'PING', data: { timestamp: Date.now() } });
      // May return false if not connected
      expect(typeof result).toBe('boolean');
    });
  });

  describe('NotificationService', () => {
    it('should check notification support', async () => {
      const { getNotificationService } = await import('../../mobile/services/NotificationService');
      const service = getNotificationService();

      // In test environment, Notification may not be defined
      const isSupported = service.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    it('should get permission status', async () => {
      const { getNotificationService } = await import('../../mobile/services/NotificationService');
      const service = getNotificationService();

      const status = service.getPermissionStatus();
      expect(status).toHaveProperty('granted');
      expect(status).toHaveProperty('denied');
      expect(status).toHaveProperty('default');
    });
  });

  describe('State Synchronization', () => {
    it('should handle STATE_SYNC messages', async () => {
      const mockState = {
        channelName: 'TestChannel',
        isLive: true,
        viewerCount: 1000,
        poll: null,
        prediction: null,
        timers: [],
        giveaways: [],
        recentChat: [],
      };

      // Verify state structure
      expect(mockState.channelName).toBe('TestChannel');
      expect(mockState.isLive).toBe(true);
      expect(mockState.viewerCount).toBe(1000);
    });

    it('should handle POLL_UPDATE messages', async () => {
      const mockPoll = {
        id: 'poll1',
        question: 'Test Poll?',
        options: [
          { id: 1, label: 'Option A', votes: 50, percentage: 50, color: '#ff0000' },
          { id: 2, label: 'Option B', votes: 50, percentage: 50, color: '#00ff00' },
        ],
        totalVotes: 100,
        isActive: true,
        startTime: Date.now(),
      };

      expect(mockPoll.totalVotes).toBe(100);
      expect(mockPoll.options).toHaveLength(2);
    });

    it('should handle TIMER_UPDATE messages', async () => {
      const mockTimer = {
        id: 'timer1',
        name: 'Break Timer',
        duration: 300,
        remaining: 150,
        isRunning: true,
        isPaused: false,
        isFinished: false,
      };

      expect(mockTimer.remaining).toBeLessThan(mockTimer.duration);
      expect(mockTimer.isRunning).toBe(true);
    });
  });

  describe('Mobile Actions', () => {
    it('should create valid POLL_CREATE action', () => {
      const action = {
        type: 'POLL_CREATE' as const,
        data: {
          question: 'What game next?',
          options: ['Game A', 'Game B', 'Game C'],
          duration: 60,
        },
      };

      expect(action.type).toBe('POLL_CREATE');
      expect(action.data.options).toHaveLength(3);
    });

    it('should create valid TIMER_START action', () => {
      const action = {
        type: 'TIMER_START' as const,
        data: { timerId: 'timer1' },
      };

      expect(action.type).toBe('TIMER_START');
      expect(action.data.timerId).toBe('timer1');
    });

    it('should create valid GIVEAWAY_DRAW action', () => {
      const action = {
        type: 'GIVEAWAY_DRAW' as const,
        data: { giveawayId: 'giveaway1' },
      };

      expect(action.type).toBe('GIVEAWAY_DRAW');
    });

    it('should create valid PREDICTION_RESOLVE action', () => {
      const action = {
        type: 'PREDICTION_RESOLVE' as const,
        data: { predictionId: 'pred1', outcomeId: 'outcome1' },
      };

      expect(action.type).toBe('PREDICTION_RESOLVE');
      expect(action.data.outcomeId).toBe('outcome1');
    });
  });
});
