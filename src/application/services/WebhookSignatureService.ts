// WebhookSignatureService - HMAC-SHA256 signing and verification for webhooks

import { SIGNATURE_CONFIG } from '../../../types/webhooks';

export class WebhookSignatureService {
  /**
   * Generate a cryptographically secure secret
   */
  generateSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Sign a payload with HMAC-SHA256
   * Format: sha256=<hex_signature>
   */
  async sign(payload: string, secret: string, timestamp: number): Promise<string> {
    const message = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: SIGNATURE_CONFIG.ALGORITHM },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(message)
    );

    const hexSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `sha256=${hexSignature}`;
  }

  /**
   * Verify a signature against payload
   * Returns true if signature is valid and timestamp is within tolerance
   */
  async verify(
    payload: string,
    signature: string,
    secret: string,
    timestamp: number
  ): Promise<boolean> {
    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > SIGNATURE_CONFIG.TOLERANCE_SECONDS) {
      return false;
    }

    // Compute expected signature
    const expectedSignature = await this.sign(payload, secret, timestamp);

    // Timing-safe comparison
    return this.timingSafeEqual(signature, expectedSignature);
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Create signature headers for outgoing webhook
   */
  async createHeaders(payload: string, secret: string): Promise<Record<string, string>> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await this.sign(payload, secret, timestamp);

    return {
      [SIGNATURE_CONFIG.HEADER_SIGNATURE]: signature,
      [SIGNATURE_CONFIG.HEADER_TIMESTAMP]: timestamp.toString(),
      [SIGNATURE_CONFIG.HEADER_API_VERSION]: '1.0',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Extract and validate signature from incoming request headers
   */
  async validateIncomingRequest(
    payload: string,
    headers: Record<string, string>,
    secret: string
  ): Promise<{ valid: boolean; error?: string }> {
    const signature = headers[SIGNATURE_CONFIG.HEADER_SIGNATURE] || 
                      headers[SIGNATURE_CONFIG.HEADER_SIGNATURE.toLowerCase()];
    const timestampStr = headers[SIGNATURE_CONFIG.HEADER_TIMESTAMP] ||
                         headers[SIGNATURE_CONFIG.HEADER_TIMESTAMP.toLowerCase()];

    if (!signature) {
      return { valid: false, error: 'Missing signature header' };
    }

    if (!timestampStr) {
      return { valid: false, error: 'Missing timestamp header' };
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return { valid: false, error: 'Invalid timestamp' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > SIGNATURE_CONFIG.TOLERANCE_SECONDS) {
      return { valid: false, error: 'Timestamp expired' };
    }

    const isValid = await this.verify(payload, signature, secret, timestamp);
    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  }
}

// Singleton instance
export const webhookSignatureService = new WebhookSignatureService();
