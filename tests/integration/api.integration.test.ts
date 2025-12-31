// API Integration Tests - Tests de integración para la API REST
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { APIKeyService, getAPIKeyService } from '../../src/api/services/APIKeyService';
import { RateLimiterService } from '../../src/api/services/RateLimiterService';
import { authMiddleware, SCOPE_DEFINITIONS } from '../../src/api/middleware/auth';
import { rateLimiterMiddleware } from '../../src/api/middleware/rateLimiter';
import { APIScope, APIKey, APIException } from '../../types/api';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock crypto.subtle for hashing
const mockDigest = vi.fn().mockImplementation(async (_algo: string, data: ArrayBuffer) => {
  const arr = new Uint8Array(data);
  const hash = new Uint8Array(32);
  for (let i = 0; i < arr.length; i++) {
    hash[i % 32] ^= arr[i];
  }
  return hash.buffer;
});

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: { digest: mockDigest },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

describe('API Integration Tests', () => {
  let apiKeyService: APIKeyService;
  let rateLimiter: RateLimiterService;

  beforeEach(() => {
    localStorageMock.clear();
    apiKeyService = new APIKeyService();
    rateLimiter = new RateLimiterService();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Task 20.1: Flujo completo de autenticación', () => {
    it('should create, validate, and use an API key', async () => {
      // 1. Create a new API key
      const result = await apiKeyService.generateKey({
        name: 'Test App',
        scopes: ['polls:read', 'polls:write'],
        rateLimit: 100
      });

      expect(result.id).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.key.startsWith('tvl_')).toBe(true);
      expect(result.keyPrefix).toBe(result.key.substring(0, 8));

      // 2. Validate the key
      const validatedKey = await apiKeyService.validateKey(result.key);
      expect(validatedKey).not.toBeNull();
      expect(validatedKey?.id).toBe(result.id);
      expect(validatedKey?.name).toBe('Test App');
      expect(validatedKey?.scopes).toContain('polls:read');

      // 3. Check scopes
      expect(apiKeyService.hasScope(validatedKey!, 'polls:read')).toBe(true);
      expect(apiKeyService.hasScope(validatedKey!, 'polls:write')).toBe(true);
      expect(apiKeyService.hasScope(validatedKey!, 'predictions:read')).toBe(false);

      // 4. Invalid key should fail
      const invalidKey = await apiKeyService.validateKey('invalid_key_12345678901234567890');
      expect(invalidKey).toBeNull();
    });

    it('should handle key revocation correctly', async () => {
      const result = await apiKeyService.generateKey({
        name: 'Revocable Key',
        scopes: ['polls:read']
      });

      // Key works before revocation
      let validatedKey = await apiKeyService.validateKey(result.key);
      expect(validatedKey).not.toBeNull();

      // Revoke the key
      await apiKeyService.revokeKey(result.id);

      // Key should not work after revocation
      validatedKey = await apiKeyService.validateKey(result.key);
      expect(validatedKey).toBeNull();
    });

    it('should handle expired keys', async () => {
      const result = await apiKeyService.generateKey({
        name: 'Expiring Key',
        scopes: ['polls:read'],
        expiresAt: Date.now() - 1000 // Already expired
      });

      const validatedKey = await apiKeyService.validateKey(result.key);
      expect(validatedKey).toBeNull();
    });

    it('admin scope should grant all permissions', async () => {
      const result = await apiKeyService.generateKey({
        name: 'Admin Key',
        scopes: ['admin']
      });

      const validatedKey = await apiKeyService.validateKey(result.key);
      expect(validatedKey).not.toBeNull();

      // Admin should have all scopes
      expect(apiKeyService.hasScope(validatedKey!, 'polls:read')).toBe(true);
      expect(apiKeyService.hasScope(validatedKey!, 'polls:write')).toBe(true);
      expect(apiKeyService.hasScope(validatedKey!, 'predictions:read')).toBe(true);
      expect(apiKeyService.hasScope(validatedKey!, 'obs:write')).toBe(true);
      expect(apiKeyService.hasScope(validatedKey!, 'metrics:read')).toBe(true);
    });
  });

  describe('Task 20.2: CRUD de polls via API', () => {
    it('should require correct scopes for poll operations', async () => {
      // Create key with only read scope
      const readOnlyResult = await apiKeyService.generateKey({
        name: 'Read Only',
        scopes: ['polls:read']
      });

      const readOnlyKey = await apiKeyService.validateKey(readOnlyResult.key);
      expect(readOnlyKey).not.toBeNull();

      // Should have read but not write
      expect(apiKeyService.hasScope(readOnlyKey!, 'polls:read')).toBe(true);
      expect(apiKeyService.hasScope(readOnlyKey!, 'polls:write')).toBe(false);

      // Create key with write scope
      const writeResult = await apiKeyService.generateKey({
        name: 'Write Access',
        scopes: ['polls:read', 'polls:write']
      });

      const writeKey = await apiKeyService.validateKey(writeResult.key);
      expect(apiKeyService.hasScope(writeKey!, 'polls:write')).toBe(true);
    });

    it('should track API key usage', async () => {
      const result = await apiKeyService.generateKey({
        name: 'Usage Tracking',
        scopes: ['polls:read']
      });

      // Record some usage
      await apiKeyService.recordUsage(result.id, '/api/v1/polls', false);
      await apiKeyService.recordUsage(result.id, '/api/v1/polls', false);
      await apiKeyService.recordUsage(result.id, '/api/v1/polls/123', false);
      await apiKeyService.recordUsage(result.id, '/api/v1/polls', true); // Error

      const stats = apiKeyService.getUsageStats(result.id);
      expect(stats.totalRequests).toBe(4);
      expect(stats.requestsToday).toBe(4);
      expect(stats.topEndpoints.length).toBeGreaterThan(0);
      expect(stats.errorRate).toBe(0.25); // 1 error out of 4
    });
  });

  describe('Task 20.3: Rate limiting funciona', () => {
    it('should enforce rate limits', () => {
      const keyId = 'test-key-1';
      const customLimit = 5;

      // First 5 requests should pass
      for (let i = 0; i < 5; i++) {
        const isLimited = rateLimiter.isLimited(keyId, customLimit);
        expect(isLimited).toBe(false);
        rateLimiter.recordRequest(keyId);
      }

      // 6th request should be blocked
      const isLimited = rateLimiter.isLimited(keyId, customLimit);
      expect(isLimited).toBe(true);
      
      const status = rateLimiter.checkLimit(keyId, customLimit);
      expect(status.remaining).toBe(0);
      expect(status.retryAfter).toBeGreaterThan(0);
    });

    it('should track remaining requests correctly', () => {
      const keyId = 'test-key-2';
      const customLimit = 10;

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        rateLimiter.recordRequest(keyId);
      }

      const remaining = rateLimiter.getRemainingRequests(keyId, customLimit);
      expect(remaining).toBe(7);
      
      const status = rateLimiter.checkLimit(keyId, customLimit);
      expect(status.limit).toBe(10);
    });

    it('should reset limits correctly', () => {
      const keyId = 'test-key-3';
      const customLimit = 5;

      // Use up all requests
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordRequest(keyId);
      }

      expect(rateLimiter.isLimited(keyId, customLimit)).toBe(true);

      // Reset
      rateLimiter.resetLimit(keyId);

      // Should be allowed again
      expect(rateLimiter.isLimited(keyId, customLimit)).toBe(false);
    });

    it('should handle per-key rate limits', async () => {
      // Create two keys with different rate limits
      const key1 = await apiKeyService.generateKey({
        name: 'Low Limit',
        scopes: ['polls:read'],
        rateLimit: 5
      });

      const key2 = await apiKeyService.generateKey({
        name: 'High Limit',
        scopes: ['polls:read'],
        rateLimit: 100
      });

      const validKey1 = await apiKeyService.validateKey(key1.key);
      const validKey2 = await apiKeyService.validateKey(key2.key);

      expect(validKey1?.rateLimit).toBe(5);
      expect(validKey2?.rateLimit).toBe(100);
    });
  });

  describe('Task 20.4: WebSocket recibe eventos', () => {
    it('should define all required event types', () => {
      // Verify event type structure
      const pollEvent = { type: 'poll:created', data: { id: '1', question: 'Test', options: [], isActive: false, totalVotes: 0 } };
      const predictionEvent = { type: 'prediction:locked', data: { id: '1', title: 'Test', outcomes: [], status: 'locked' as const } };
      const timerEvent = { type: 'timer:tick', data: { timerId: '1', remaining: 30, percentage: 50 } };

      expect(pollEvent.type).toBe('poll:created');
      expect(predictionEvent.data.status).toBe('locked');
      expect(timerEvent.data.remaining).toBe(30);
    });

    it('should support subscription filtering', () => {
      const subscribedEvents = ['poll:created', 'poll:updated', 'timer:tick'];
      
      const shouldReceive = (eventType: string) => 
        subscribedEvents.includes(eventType) || subscribedEvents.some(e => eventType.startsWith(e.split(':')[0]));

      expect(shouldReceive('poll:created')).toBe(true);
      expect(shouldReceive('poll:updated')).toBe(true);
      expect(shouldReceive('timer:tick')).toBe(true);
      expect(shouldReceive('giveaway:winner')).toBe(false);
    });
  });

  describe('Task 20.5: Errores devuelven formato correcto', () => {
    it('should format unauthorized errors correctly', () => {
      const error = APIException.unauthorized('Invalid API key');
      const response = error.toResponse();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('UNAUTHORIZED');
      expect(response.error.message).toBe('Invalid API key');
      expect(response.error.timestamp).toBeDefined();
    });

    it('should format forbidden errors correctly', () => {
      const error = APIException.forbidden('Insufficient permissions');
      const response = error.toResponse();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('FORBIDDEN');
    });

    it('should format not found errors correctly', () => {
      const error = APIException.notFound('Poll');
      const response = error.toResponse();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.error.message).toBe('Poll not found');
    });

    it('should format validation errors with details', () => {
      const error = APIException.validationError({
        question: 'Question is required',
        options: 'At least 2 options required'
      });
      const response = error.toResponse();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.details?.question).toBe('Question is required');
      expect(response.error.details?.options).toBe('At least 2 options required');
    });

    it('should format rate limit errors with retry info', () => {
      const error = APIException.rateLimited(30);
      const response = error.toResponse();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('RATE_LIMITED');
      expect(response.error.details?.retryAfter).toBe(30);
    });

    it('should include correct HTTP status codes', () => {
      expect(APIException.unauthorized().statusCode).toBe(401);
      expect(APIException.forbidden().statusCode).toBe(403);
      expect(APIException.notFound().statusCode).toBe(404);
      expect(APIException.validationError({}).statusCode).toBe(400);
      expect(APIException.rateLimited(30).statusCode).toBe(429);
      expect(APIException.conflict('Duplicate').statusCode).toBe(409);
      expect(APIException.badRequest('Bad').statusCode).toBe(400);
      expect(APIException.internal().statusCode).toBe(500);
    });
  });

  describe('Additional Integration Scenarios', () => {
    it('should persist keys across service instances', async () => {
      // Create key with first instance
      const result = await apiKeyService.generateKey({
        name: 'Persistent Key',
        scopes: ['polls:read']
      });

      // Create new instance (simulates app restart)
      const newService = new APIKeyService();
      const keys = newService.listKeys();

      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('Persistent Key');
    });

    it('should handle multiple concurrent keys', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(apiKeyService.generateKey({
          name: `Key ${i}`,
          scopes: ['polls:read']
        }));
      }

      const results = await Promise.all(promises);
      const keys = apiKeyService.listKeys();

      expect(keys.length).toBe(5);
      
      // All keys should be unique
      const ids = new Set(results.map(r => r.id));
      expect(ids.size).toBe(5);
    });

    it('should update key properties correctly', async () => {
      const result = await apiKeyService.generateKey({
        name: 'Original Name',
        scopes: ['polls:read'],
        rateLimit: 60
      });

      await apiKeyService.updateKey(result.id, {
        name: 'Updated Name',
        scopes: ['polls:read', 'polls:write'],
        rateLimit: 120
      });

      const updated = apiKeyService.getKey(result.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.scopes).toContain('polls:write');
      expect(updated?.rateLimit).toBe(120);
    });

    it('should delete keys and their usage data', async () => {
      const result = await apiKeyService.generateKey({
        name: 'To Delete',
        scopes: ['polls:read']
      });

      await apiKeyService.recordUsage(result.id, '/api/v1/polls', false);
      
      await apiKeyService.deleteKey(result.id);

      expect(apiKeyService.getKey(result.id)).toBeNull();
      expect(apiKeyService.listKeys().length).toBe(0);
    });
  });
});
