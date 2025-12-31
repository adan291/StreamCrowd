// API Key Service - Gestión de API Keys para autenticación
import {
  APIKey,
  APIScope,
  APIKeyCreateInput,
  APIKeyCreateResult,
  APIKeyUpdateInput,
  APIKeyUsage,
  APIKeyUsageStats,
  APIException
} from '../../../types/api';

const STORAGE_KEY = 'twitchvote_api_keys';
const USAGE_STORAGE_KEY = 'twitchvote_api_usage';

export class APIKeyService {
  private keys: Map<string, APIKey> = new Map();
  private usage: Map<string, APIKeyUsage[]> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  // ============================================
  // Key Generation
  // ============================================

  async generateKey(input: APIKeyCreateInput): Promise<APIKeyCreateResult> {
    const { name, scopes, rateLimit = 60, expiresAt } = input;

    // Validate input
    if (!name || name.trim().length === 0) {
      throw APIException.validationError({ name: 'Name is required' });
    }

    if (!scopes || scopes.length === 0) {
      throw APIException.validationError({ scopes: 'At least one scope is required' });
    }

    // Generate unique key
    const keyId = this.generateId();
    const rawKey = this.generateRawKey();
    const keyPrefix = rawKey.substring(0, 8);
    const keyHash = await this.hashKey(rawKey);

    const apiKey: APIKey = {
      id: keyId,
      keyHash,
      keyPrefix,
      name: name.trim(),
      scopes,
      rateLimit,
      createdAt: Date.now(),
      expiresAt,
      enabled: true
    };

    this.keys.set(keyId, apiKey);
    this.saveToStorage();

    return {
      id: keyId,
      key: rawKey,
      keyPrefix
    };
  }

  // ============================================
  // Key Validation
  // ============================================

  async validateKey(rawKey: string): Promise<APIKey | null> {
    if (!rawKey || rawKey.length < 32) {
      return null;
    }

    const keyPrefix = rawKey.substring(0, 8);

    // Find key by prefix first (optimization)
    for (const apiKey of this.keys.values()) {
      if (apiKey.keyPrefix === keyPrefix) {
        // Verify full hash
        const isValid = await this.verifyKey(rawKey, apiKey.keyHash);
        if (isValid) {
          // Check if enabled
          if (!apiKey.enabled) {
            return null;
          }

          // Check expiration
          if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
            return null;
          }

          return apiKey;
        }
      }
    }

    return null;
  }

  hasScope(apiKey: APIKey, requiredScope: APIScope): boolean {
    // Admin has all permissions
    if (apiKey.scopes.includes('admin')) {
      return true;
    }

    return apiKey.scopes.includes(requiredScope);
  }

  hasAnyScope(apiKey: APIKey, requiredScopes: APIScope[]): boolean {
    return requiredScopes.some(scope => this.hasScope(apiKey, scope));
  }

  // ============================================
  // Key Management
  // ============================================

  async revokeKey(id: string): Promise<void> {
    const key = this.keys.get(id);
    if (!key) {
      throw APIException.notFound('API Key');
    }

    key.enabled = false;
    this.saveToStorage();
  }

  async deleteKey(id: string): Promise<void> {
    if (!this.keys.has(id)) {
      throw APIException.notFound('API Key');
    }

    this.keys.delete(id);
    this.usage.delete(id);
    this.saveToStorage();
  }

  async updateKey(id: string, updates: APIKeyUpdateInput): Promise<APIKey> {
    const key = this.keys.get(id);
    if (!key) {
      throw APIException.notFound('API Key');
    }

    if (updates.name !== undefined) {
      key.name = updates.name.trim();
    }

    if (updates.scopes !== undefined) {
      if (updates.scopes.length === 0) {
        throw APIException.validationError({ scopes: 'At least one scope is required' });
      }
      key.scopes = updates.scopes;
    }

    if (updates.rateLimit !== undefined) {
      key.rateLimit = updates.rateLimit;
    }

    if (updates.enabled !== undefined) {
      key.enabled = updates.enabled;
    }

    if (updates.expiresAt !== undefined) {
      key.expiresAt = updates.expiresAt;
    }

    this.saveToStorage();
    return key;
  }

  listKeys(): APIKey[] {
    return Array.from(this.keys.values()).map(key => ({
      ...key,
      keyHash: '***' // Never expose hash
    }));
  }

  getKey(id: string): APIKey | null {
    const key = this.keys.get(id);
    if (!key) return null;

    return {
      ...key,
      keyHash: '***'
    };
  }

  // ============================================
  // Usage Tracking
  // ============================================

  async recordUsage(keyId: string, endpoint: string, isError: boolean = false): Promise<void> {
    const key = this.keys.get(keyId);
    if (!key) return;

    // Update lastUsedAt
    key.lastUsedAt = Date.now();

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get or create usage array for this key
    let keyUsage = this.usage.get(keyId) || [];

    // Find or create today's entry
    let todayUsage = keyUsage.find(u => u.date === today);
    if (!todayUsage) {
      todayUsage = {
        keyId,
        date: today,
        requests: 0,
        endpoints: {},
        errors: 0
      };
      keyUsage.push(todayUsage);
    }

    // Update counts
    todayUsage.requests++;
    todayUsage.endpoints[endpoint] = (todayUsage.endpoints[endpoint] || 0) + 1;
    if (isError) {
      todayUsage.errors++;
    }

    // Keep only last 30 days
    keyUsage = keyUsage
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    this.usage.set(keyId, keyUsage);
    this.saveToStorage();
  }

  getUsageStats(keyId: string): APIKeyUsageStats {
    const keyUsage = this.usage.get(keyId) || [];
    const key = this.keys.get(keyId);

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayUsage = keyUsage.find(u => u.date === today);
    const weekUsage = keyUsage.filter(u => u.date >= weekAgo);

    // Calculate totals
    const totalRequests = keyUsage.reduce((sum, u) => sum + u.requests, 0);
    const requestsToday = todayUsage?.requests || 0;
    const requestsThisWeek = weekUsage.reduce((sum, u) => sum + u.requests, 0);
    const totalErrors = keyUsage.reduce((sum, u) => sum + u.errors, 0);

    // Calculate top endpoints
    const endpointCounts: Record<string, number> = {};
    keyUsage.forEach(u => {
      Object.entries(u.endpoints).forEach(([endpoint, count]) => {
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + count;
      });
    });

    const topEndpoints = Object.entries(endpointCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      totalRequests,
      requestsToday,
      requestsThisWeek,
      topEndpoints,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      lastUsed: key?.lastUsedAt
    };
  }

  // ============================================
  // Private Helpers
  // ============================================

  private generateId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateRawKey(): string {
    // Generate a 48-character key: prefix (8) + random (40)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'tvl_'; // TwitchVote Live prefix
    for (let i = 0; i < 44; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  private async hashKey(rawKey: string): Promise<string> {
    // Simple hash for browser environment
    // In production, use bcrypt on server
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey + 'twitchvote_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyKey(rawKey: string, storedHash: string): Promise<boolean> {
    const hash = await this.hashKey(rawKey);
    return hash === storedHash;
  }

  private loadFromStorage(): void {
    try {
      const keysData = localStorage.getItem(STORAGE_KEY);
      if (keysData) {
        const keys = JSON.parse(keysData) as APIKey[];
        keys.forEach(key => this.keys.set(key.id, key));
      }

      const usageData = localStorage.getItem(USAGE_STORAGE_KEY);
      if (usageData) {
        const usage = JSON.parse(usageData) as Record<string, APIKeyUsage[]>;
        Object.entries(usage).forEach(([keyId, keyUsage]) => {
          this.usage.set(keyId, keyUsage);
        });
      }
    } catch (error) {
      console.error('Failed to load API keys from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const keys = Array.from(this.keys.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));

      const usage: Record<string, APIKeyUsage[]> = {};
      this.usage.forEach((value, key) => {
        usage[key] = value;
      });
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
    } catch (error) {
      console.error('Failed to save API keys to storage:', error);
    }
  }

  // ============================================
  // Testing Helpers
  // ============================================

  clearAll(): void {
    this.keys.clear();
    this.usage.clear();
    this.saveToStorage();
  }

  getKeyCount(): number {
    return this.keys.size;
  }
}

// Singleton instance
let instance: APIKeyService | null = null;

export function getAPIKeyService(): APIKeyService {
  if (!instance) {
    instance = new APIKeyService();
  }
  return instance;
}
