// Property tests for APIKeyService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { APIKeyService } from '../../src/api/services/APIKeyService';
import { APIScope } from '../../types/api';

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
  // Simple mock hash - just return a deterministic buffer based on input
  const view = new Uint8Array(data);
  const hash = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hash[i] = view[i % view.length] ^ (i * 7);
  }
  return hash.buffer;
});

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest
    }
  }
});

// Arbitrary generators
const validScopes: APIScope[] = [
  'polls:read', 'polls:write',
  'predictions:read', 'predictions:write',
  'giveaways:read', 'giveaways:write',
  'timers:read', 'timers:write',
  'obs:read', 'obs:write',
  'metrics:read',
  'admin'
];

const scopeArb = fc.constantFrom(...validScopes);
const scopesArb = fc.array(scopeArb, { minLength: 1, maxLength: 5 }).map(arr => [...new Set(arr)]);
const nameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const rateLimitArb = fc.integer({ min: 1, max: 1000 });

describe('APIKeyService Property Tests', () => {
  let service: APIKeyService;
  let counter = 0;

  beforeEach(() => {
    localStorageMock.clear();
    service = new APIKeyService();
    counter++;
  });

  describe('Property 1: Generated keys are unique', () => {
    it('should generate unique keys across multiple generations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }),
          async (count) => {
            const localService = new APIKeyService();
            const keys: string[] = [];
            const ids: string[] = [];

            for (let i = 0; i < count; i++) {
              const result = await localService.generateKey({
                name: `Test Key ${counter}_${i}`,
                scopes: ['polls:read']
              });
              keys.push(result.key);
              ids.push(result.id);
            }

            // All keys should be unique
            const uniqueKeys = new Set(keys);
            expect(uniqueKeys.size).toBe(count);

            // All IDs should be unique
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(count);

            localService.clearAll();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should generate keys with correct prefix format', async () => {
      await fc.assert(
        fc.asyncProperty(nameArb, scopesArb, async (name, scopes) => {
          const localService = new APIKeyService();
          const result = await localService.generateKey({ name, scopes });

          // Key should start with tvl_ prefix
          expect(result.key.startsWith('tvl_')).toBe(true);

          // Key should be 48 characters
          expect(result.key.length).toBe(48);

          // Key prefix should be first 8 characters
          expect(result.keyPrefix).toBe(result.key.substring(0, 8));

          localService.clearAll();
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 2: Key validation correctness', () => {
    it('should validate correct keys and reject incorrect ones', async () => {
      await fc.assert(
        fc.asyncProperty(nameArb, scopesArb, async (name, scopes) => {
          const localService = new APIKeyService();
          const result = await localService.generateKey({ name, scopes });

          // Valid key should be validated
          const validatedKey = await localService.validateKey(result.key);
          expect(validatedKey).not.toBeNull();
          expect(validatedKey?.id).toBe(result.id);
          expect(validatedKey?.name).toBe(name.trim());

          // Invalid key should return null
          const invalidKey = await localService.validateKey('invalid_key_12345678901234567890');
          expect(invalidKey).toBeNull();

          // Completely different key should return null
          const differentKey = 'tvl_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1234';
          const differentValidation = await localService.validateKey(differentKey);
          expect(differentValidation).toBeNull();

          localService.clearAll();
        }),
        { numRuns: 25 }
      );
    });

    it('should reject empty or short keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ maxLength: 31 }),
          async (shortKey) => {
            const localService = new APIKeyService();
            const result = await localService.validateKey(shortKey);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 3: Revocation prevents subsequent use', () => {
    it('should prevent use of revoked keys', async () => {
      await fc.assert(
        fc.asyncProperty(nameArb, scopesArb, async (name, scopes) => {
          const localService = new APIKeyService();
          const result = await localService.generateKey({ name, scopes });

          // Key should be valid before revocation
          const beforeRevoke = await localService.validateKey(result.key);
          expect(beforeRevoke).not.toBeNull();

          // Revoke the key
          await localService.revokeKey(result.id);

          // Key should be invalid after revocation
          const afterRevoke = await localService.validateKey(result.key);
          expect(afterRevoke).toBeNull();

          localService.clearAll();
        }),
        { numRuns: 25 }
      );
    });

    it('should throw when revoking non-existent key', async () => {
      const localService = new APIKeyService();
      await expect(localService.revokeKey('non_existent_id')).rejects.toThrow();
    });
  });

  describe('Property 4: Scopes are respected correctly', () => {
    it('should correctly check scope permissions', async () => {
      await fc.assert(
        fc.asyncProperty(nameArb, scopesArb, scopeArb, async (name, scopes, checkScope) => {
          const localService = new APIKeyService();
          const result = await localService.generateKey({ name, scopes });
          const key = await localService.validateKey(result.key);

          if (!key) {
            throw new Error('Key validation failed unexpectedly');
          }

          const hasScope = localService.hasScope(key, checkScope);

          // If scope is in the list, hasScope should return true
          if (scopes.includes(checkScope)) {
            expect(hasScope).toBe(true);
          } else if (!scopes.includes('admin')) {
            // If scope is not in list and not admin, should return false
            expect(hasScope).toBe(false);
          }

          localService.clearAll();
        }),
        { numRuns: 50 }
      );
    });

    it('should grant all permissions to admin scope', async () => {
      await fc.assert(
        fc.asyncProperty(nameArb, scopeArb, async (name, checkScope) => {
          const localService = new APIKeyService();
          const result = await localService.generateKey({
            name,
            scopes: ['admin']
          });
          const key = await localService.validateKey(result.key);

          if (!key) {
            throw new Error('Key validation failed unexpectedly');
          }

          // Admin should have all scopes
          expect(localService.hasScope(key, checkScope)).toBe(true);

          localService.clearAll();
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 5: Key updates are persisted correctly', () => {
    it('should persist updates to key properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          nameArb,
          scopesArb,
          nameArb,
          scopesArb,
          rateLimitArb,
          async (name, scopes, newName, newScopes, newRateLimit) => {
            const localService = new APIKeyService();
            const result = await localService.generateKey({ name, scopes });

            // Update the key
            const updated = await localService.updateKey(result.id, {
              name: newName,
              scopes: newScopes,
              rateLimit: newRateLimit
            });

            expect(updated.name).toBe(newName.trim());
            expect(updated.scopes).toEqual(newScopes);
            expect(updated.rateLimit).toBe(newRateLimit);

            // Verify via getKey
            const retrieved = localService.getKey(result.id);
            expect(retrieved?.name).toBe(newName.trim());
            expect(retrieved?.scopes).toEqual(newScopes);
            expect(retrieved?.rateLimit).toBe(newRateLimit);

            localService.clearAll();
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Property 6: Key expiration is enforced', () => {
    it('should reject expired keys', async () => {
      await fc.assert(
        fc.asyncProperty(nameArb, scopesArb, async (name, scopes) => {
          const localService = new APIKeyService();
          
          // Create key that expires in the past
          const result = await localService.generateKey({
            name,
            scopes,
            expiresAt: Date.now() - 1000 // Expired 1 second ago
          });

          // Key should be invalid due to expiration
          const validated = await localService.validateKey(result.key);
          expect(validated).toBeNull();

          localService.clearAll();
        }),
        { numRuns: 20 }
      );
    });

    it('should accept non-expired keys', async () => {
      await fc.assert(
        fc.asyncProperty(nameArb, scopesArb, async (name, scopes) => {
          const localService = new APIKeyService();
          
          // Create key that expires in the future
          const result = await localService.generateKey({
            name,
            scopes,
            expiresAt: Date.now() + 3600000 // Expires in 1 hour
          });

          // Key should be valid
          const validated = await localService.validateKey(result.key);
          expect(validated).not.toBeNull();

          localService.clearAll();
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 7: Usage tracking is accurate', () => {
    it('should accurately track usage statistics', async () => {
      await fc.assert(
        fc.asyncProperty(
          nameArb,
          scopesArb,
          fc.array(fc.constantFrom('/polls', '/predictions', '/giveaways', '/timers'), { minLength: 1, maxLength: 20 }),
          async (name, scopes, endpoints) => {
            const localService = new APIKeyService();
            const result = await localService.generateKey({ name, scopes });

            // Record usage for each endpoint
            for (const endpoint of endpoints) {
              await localService.recordUsage(result.id, endpoint, false);
            }

            const stats = localService.getUsageStats(result.id);

            // Total requests should match
            expect(stats.totalRequests).toBe(endpoints.length);
            expect(stats.requestsToday).toBe(endpoints.length);

            // Top endpoints should be correct
            const endpointCounts = endpoints.reduce((acc, ep) => {
              acc[ep] = (acc[ep] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            stats.topEndpoints.forEach(({ endpoint, count }) => {
              expect(count).toBe(endpointCounts[endpoint]);
            });

            localService.clearAll();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 8: List operations are consistent', () => {
    it('should list all created keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.tuple(nameArb, scopesArb), { minLength: 1, maxLength: 10 }),
          async (keyInputs) => {
            const localService = new APIKeyService();
            const createdIds: string[] = [];

            for (let i = 0; i < keyInputs.length; i++) {
              const [name, scopes] = keyInputs[i];
              const result = await localService.generateKey({
                name: `${name}_${counter}_${i}`,
                scopes
              });
              createdIds.push(result.id);
            }

            const listedKeys = localService.listKeys();

            // All created keys should be in the list
            expect(listedKeys.length).toBe(keyInputs.length);
            createdIds.forEach(id => {
              expect(listedKeys.some(k => k.id === id)).toBe(true);
            });

            // Hash should be masked
            listedKeys.forEach(key => {
              expect(key.keyHash).toBe('***');
            });

            localService.clearAll();
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});
