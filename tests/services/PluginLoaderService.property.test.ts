// Property Tests for PluginLoaderService
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PluginLoaderService } from '../../src/plugins/services/PluginLoaderService';
import { PluginManifest, PluginPermission, PERMISSION_DESCRIPTIONS } from '../../types/plugins';

describe('PluginLoaderService Property Tests', () => {
  let service: PluginLoaderService;

  beforeEach(() => {
    service = new PluginLoaderService();
  });

  // Valid permissions for arbitrary generation
  const validPermissions = Object.keys(PERMISSION_DESCRIPTIONS) as PluginPermission[];

  // Arbitrary for valid plugin ID
  const validPluginId = fc.stringMatching(/^[a-z][a-z0-9-]{2,30}$/);

  // Arbitrary for semver version
  const semverVersion = fc.tuple(
    fc.integer({ min: 0, max: 99 }),
    fc.integer({ min: 0, max: 99 }),
    fc.integer({ min: 0, max: 99 })
  ).map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

  // Arbitrary for valid manifest
  const validManifestArb = fc.record({
    id: validPluginId,
    name: fc.string({ minLength: 1, maxLength: 50 }),
    version: semverVersion,
    description: fc.string({ minLength: 1, maxLength: 200 }),
    author: fc.string({ minLength: 1, maxLength: 50 }),
    minAppVersion: fc.constant('1.0.0'),
    permissions: fc.subarray(validPermissions, { minLength: 1, maxLength: 5 }),
    main: fc.constant('index.js')
  }) as fc.Arbitrary<PluginManifest>;

  describe('Property 1: Valid manifests are accepted', () => {
    it('should accept all valid manifests', () => {
      fc.assert(
        fc.property(validManifestArb, (manifest) => {
          const result = service.validateManifest(manifest);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 50 }
      );
    });

    it('should preserve manifest data through validation', () => {
      fc.assert(
        fc.property(validManifestArb, (manifest) => {
          const result = service.validateManifest(manifest);
          expect(result.valid).toBe(true);
          // Original manifest should be unchanged
          expect(manifest.id).toBeDefined();
          expect(manifest.name).toBeDefined();
          expect(manifest.version).toBeDefined();
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 2: Invalid manifests are rejected', () => {
    it('should reject manifests without required fields', () => {
      const requiredFields = ['id', 'name', 'version', 'description', 'author', 'minAppVersion', 'main', 'permissions'];
      
      fc.assert(
        fc.property(
          validManifestArb,
          fc.constantFrom(...requiredFields),
          (manifest, fieldToRemove) => {
            const invalidManifest = { ...manifest };
            delete (invalidManifest as Record<string, unknown>)[fieldToRemove];
            
            const result = service.validateManifest(invalidManifest);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject manifests with invalid id format', () => {
      const invalidIds = [
        'Has Spaces',
        'HasUpperCase',
        'special!chars',
        'with@symbol',
        ''
      ];

      for (const invalidId of invalidIds) {
        const manifest = {
          ...service.createManifestTemplate(),
          id: invalidId
        };
        const result = service.validateManifest(manifest);
        expect(result.valid).toBe(false);
      }
    });

    it('should reject manifests with invalid version format', () => {
      fc.assert(
        fc.property(
          validManifestArb,
          fc.string().filter(s => !/^\d+\.\d+\.\d+/.test(s)),
          (manifest, invalidVersion) => {
            const invalidManifest = { ...manifest, version: invalidVersion };
            const result = service.validateManifest(invalidManifest);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject null or non-object manifests', () => {
      const invalidInputs = [null, undefined, 'string', 123, [], true];
      
      for (const input of invalidInputs) {
        const result = service.validateManifest(input);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Property 3: Permissions are validated correctly', () => {
    it('should accept all valid permissions', () => {
      fc.assert(
        fc.property(
          fc.subarray(validPermissions, { minLength: 1 }),
          (permissions) => {
            expect(service.validatePermissions(permissions)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject invalid permissions', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !validPermissions.includes(s as PluginPermission)),
          (invalidPerm) => {
            expect(service.validatePermissions([invalidPerm as PluginPermission])).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject manifests with invalid permissions', () => {
      fc.assert(
        fc.property(
          validManifestArb,
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => !validPermissions.includes(s as PluginPermission)),
          (manifest, invalidPerm) => {
            const invalidManifest = {
              ...manifest,
              permissions: [...manifest.permissions, invalidPerm as PluginPermission]
            };
            const result = service.validateManifest(invalidManifest);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Permisos inválidos'))).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide descriptions for all valid permissions', () => {
      for (const perm of validPermissions) {
        const desc = service.getPermissionDescription(perm);
        expect(desc).toBeDefined();
        expect(desc.length).toBeGreaterThan(0);
        expect(desc).not.toBe('Permiso desconocido');
      }
    });

    it('should categorize permissions correctly', () => {
      fc.assert(
        fc.property(
          fc.subarray(validPermissions, { minLength: 1, maxLength: 10 }),
          (permissions) => {
            const categories = service.categorizePermissions(permissions);
            
            // All permissions should be in some category
            const allCategorized = Object.values(categories).flat();
            expect(allCategorized.length).toBe(permissions.length);
            
            // Each permission should appear exactly once
            for (const perm of permissions) {
              expect(allCategorized.filter(p => p === perm).length).toBe(1);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 4: Version compatibility', () => {
    it('should accept compatible versions', () => {
      // App version is 1.0.0, so 1.0.0 and below should be compatible
      const compatibleVersions = ['1.0.0', '0.9.0', '0.1.0', '0.0.1'];
      
      for (const version of compatibleVersions) {
        expect(service.isVersionCompatible(version)).toBe(true);
      }
    });

    it('should reject incompatible versions', () => {
      // App version is 1.0.0, so higher versions should be incompatible
      const incompatibleVersions = ['1.0.1', '1.1.0', '2.0.0'];
      
      for (const version of incompatibleVersions) {
        expect(service.isVersionCompatible(version)).toBe(false);
      }
    });

    it('should handle version comparison correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1 }),
          fc.integer({ min: 0, max: 0 }),
          fc.integer({ min: 0, max: 0 }),
          (major, minor, patch) => {
            const version = `${major}.${minor}.${patch}`;
            // Versions <= 1.0.0 should be compatible
            expect(service.isVersionCompatible(version)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 5: Config schema validation', () => {
    it('should accept valid config schemas', () => {
      const validSchemas = [
        {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' }
          }
        },
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            count: { type: 'number' },
            active: { type: 'boolean' }
          }
        },
        {
          type: 'object',
          properties: {
            items: { type: 'array' },
            config: { type: 'object' }
          }
        }
      ];

      for (const schema of validSchemas) {
        const result = service.validateConfigSchema(schema);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid config schemas', () => {
      const invalidSchemas = [
        null,
        'string',
        { type: 'array' }, // Must be object
        { type: 'object' }, // Missing properties
        { type: 'object', properties: 'invalid' },
        { type: 'object', properties: { field: 'not-an-object' } },
        { type: 'object', properties: { field: { type: 'invalid-type' } } }
      ];

      for (const schema of invalidSchemas) {
        const result = service.validateConfigSchema(schema);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('Property 6: Template generation', () => {
    it('should generate valid manifest template', () => {
      const template = service.createManifestTemplate();
      const result = service.validateManifest(template);
      
      expect(result.valid).toBe(true);
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(template.permissions.length).toBeGreaterThan(0);
    });

    it('should generate valid code template', () => {
      const code = service.createCodeTemplate();
      
      expect(code).toContain('function');
      expect(code).toContain('api');
      expect(code.length).toBeGreaterThan(100);
    });
  });

  describe('Property 7: loadFromJSON validation', () => {
    it('should load valid JSON manifests', () => {
      fc.assert(
        fc.property(validManifestArb, (manifest) => {
          const json = JSON.stringify(manifest);
          const code = 'console.log("test");';
          
          const result = service.loadFromJSON(json, code);
          expect(result.manifest.id).toBe(manifest.id);
          expect(result.code).toBe(code);
        }),
        { numRuns: 30 }
      );
    });

    it('should reject invalid JSON', () => {
      const invalidJsons = [
        'not json',
        '{ invalid }',
        '',
        '[]'
      ];

      for (const json of invalidJsons) {
        expect(() => service.loadFromJSON(json, 'code')).toThrow();
      }
    });

    it('should reject valid JSON with invalid manifest', () => {
      const invalidManifests = [
        '{}',
        '{"id": "test"}', // Missing required fields
        '{"id": "INVALID", "name": "test"}' // Invalid id format
      ];

      for (const json of invalidManifests) {
        expect(() => service.loadFromJSON(json, 'code')).toThrow();
      }
    });
  });
});
