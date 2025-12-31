/**
 * PairingService - Handle QR code scanning and manual code input
 * @requirements Task 3 - Implementar PairingService
 */

import type { PairingData } from '../../types/mobile';

export interface PairingResult {
  success: boolean;
  data?: PairingData;
  error?: string;
}

const PAIRING_CODE_LENGTH = 6;
const PAIRING_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1

export class PairingService {
  private storageKey = 'mobile_pairing_data';

  /**
   * Parse QR code data
   */
  parseQRCode(qrData: string): PairingResult {
    try {
      // Try to parse as JSON first
      const data = JSON.parse(qrData);
      
      if (!this.validatePairingData(data)) {
        return { success: false, error: 'Invalid QR code format' };
      }

      // Check if expired
      if (data.expiresAt && data.expiresAt < Date.now()) {
        return { success: false, error: 'QR code has expired' };
      }

      return { success: true, data };
    } catch {
      // Try to parse as URL
      return this.parseQRUrl(qrData);
    }
  }

  /**
   * Parse QR code as URL format
   */
  private parseQRUrl(url: string): PairingResult {
    try {
      const parsed = new URL(url);
      
      const sessionId = parsed.searchParams.get('sessionId');
      const token = parsed.searchParams.get('token');
      const expiresAt = parsed.searchParams.get('expiresAt');
      const channelName = parsed.searchParams.get('channel');

      if (!sessionId || !token) {
        return { success: false, error: 'Invalid QR code URL' };
      }

      // Build WebSocket URL from HTTP URL
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${parsed.host}/mobile-ws`;

      const data: PairingData = {
        sessionId,
        wsUrl,
        token,
        expiresAt: expiresAt ? parseInt(expiresAt, 10) : Date.now() + 300000,
        channelName: channelName || undefined,
      };

      if (data.expiresAt < Date.now()) {
        return { success: false, error: 'QR code has expired' };
      }

      return { success: true, data };
    } catch {
      return { success: false, error: 'Invalid QR code' };
    }
  }

  /**
   * Validate pairing code (manual input)
   */
  async validateCode(code: string, serverUrl: string): Promise<PairingResult> {
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (normalizedCode.length !== PAIRING_CODE_LENGTH) {
      return { success: false, error: 'Invalid code length' };
    }

    // Validate characters
    for (const char of normalizedCode) {
      if (!PAIRING_CODE_CHARS.includes(char)) {
        return { success: false, error: 'Invalid code characters' };
      }
    }

    try {
      // Request pairing data from server
      const response = await fetch(`${serverUrl}/api/mobile/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: error.message || 'Invalid or expired code' 
        };
      }

      const data = await response.json();
      
      if (!this.validatePairingData(data)) {
        return { success: false, error: 'Invalid server response' };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to connect to server' 
      };
    }
  }

  /**
   * Save pairing data to storage
   */
  savePairingData(data: PairingData): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save pairing data:', error);
    }
  }

  /**
   * Load saved pairing data
   */
  loadPairingData(): PairingData | null {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return null;

      const data = JSON.parse(saved);
      
      // Check if expired
      if (data.expiresAt && data.expiresAt < Date.now()) {
        this.clearPairingData();
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Clear saved pairing data
   */
  clearPairingData(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Generate pairing code (for desktop)
   */
  static generatePairingCode(): string {
    let code = '';
    for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * PAIRING_CODE_CHARS.length);
      code += PAIRING_CODE_CHARS[randomIndex];
    }
    return code;
  }

  /**
   * Format code for display (add dashes)
   */
  static formatCode(code: string): string {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 3) return clean;
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }

  /**
   * Validate pairing data structure
   */
  private validatePairingData(data: any): data is PairingData {
    return (
      typeof data === 'object' &&
      typeof data.sessionId === 'string' &&
      typeof data.wsUrl === 'string' &&
      typeof data.token === 'string' &&
      typeof data.expiresAt === 'number'
    );
  }
}

// Singleton instance
let instance: PairingService | null = null;

export function getPairingService(): PairingService {
  if (!instance) {
    instance = new PairingService();
  }
  return instance;
}

export default PairingService;
