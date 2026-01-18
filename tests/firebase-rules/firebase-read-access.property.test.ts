/**
 * Property-Based Tests for Firebase Read Access Control
 * 
 * Tests Property 9: Firebase Read Access Control
 * **Validates: Requirements 1.2**
 * 
 * Property: For any Firebase read operation, access SHALL only be granted 
 * if the user owns the data or has explicit permission.
 * 
 * This test uses fast-check to generate arbitrary user IDs, data paths, and
 * ownership scenarios to verify that the Firebase rules correctly enforce
 * read access control across all possible inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock Firebase Rules Testing Infrastructure
 * 
 * Since we cannot run the actual Firebase emulator in property tests,
 * we simulate the rules logic to verify correctness.
 */

interface AuthContext {
  uid: string | null;
}

interface DataSnapshot {
  exists: () => boolean;
  child: (path: string) => DataSnapshot;
  val: () => unknown;
  hasChildren: (children: string[]) => boolean;
}

// Rule evaluation helper that simulates Firebase rules logic
class RulesEvaluator {
  canRead(path: string, auth: AuthContext, data: DataSnapshot): boolean {
    const pathParts = path.split('/').filter(Boolean);
    return this.evaluateReadRule(pathParts, auth, data);
  }

  private evaluateReadRule(pathParts: string[], auth: AuthContext, data: DataSnapshot): boolean {
    const [root, ...rest] = pathParts;
    
    switch (root) {
      case 'overlays':
        return this.evaluateOverlaysRead(rest, auth);
      case 'broadcaster_tokens':
        return this.evaluateBroadcasterTokensRead(rest, auth);
      case 'users':
        return this.evaluateUsersRead(rest, auth);
      case 'giveaways':
        return this.evaluateGiveawaysRead(rest, auth, data);
      case 'polls':
        return this.evaluatePollsRead(rest, auth, data);
      case 'sessions':
        return this.evaluateSessionsRead(rest, auth, data);
      case 'overlay_sessions':
        return true; // Public read for OBS browser sources
      case 'streamers':
        return this.evaluateStreamersRead(rest, auth);
      default:
        return false; // Default deny
    }
  }

  // Overlays: auth.uid == $uid
  private evaluateOverlaysRead(pathParts: string[], auth: AuthContext): boolean {
    if (!auth.uid) return false;
    const [uid] = pathParts;
    return auth.uid === uid;
  }

  // Broadcaster tokens: auth.uid == $broadcasterId
  private evaluateBroadcasterTokensRead(pathParts: string[], auth: AuthContext): boolean {
    if (!auth.uid) return false;
    const [broadcasterId] = pathParts;
    return auth.uid === broadcasterId;
  }

  // Users: auth.uid == $uid
  private evaluateUsersRead(pathParts: string[], auth: AuthContext): boolean {
    if (!auth.uid) return false;
    const [uid] = pathParts;
    return auth.uid === uid;
  }

  // Giveaways: owner or public
  private evaluateGiveawaysRead(
    pathParts: string[], 
    auth: AuthContext, 
    data: DataSnapshot
  ): boolean {
    if (!auth.uid && !data.child('public').val()) return false;
    if (data.child('public').val() === true) return true;
    return auth.uid === data.child('ownerId').val();
  }

  // Polls: owner or public
  private evaluatePollsRead(
    pathParts: string[], 
    auth: AuthContext, 
    data: DataSnapshot
  ): boolean {
    if (!auth.uid && !data.child('public').val()) return false;
    if (data.child('public').val() === true) return true;
    return auth.uid === data.child('ownerId').val();
  }

  // Sessions: owner only
  private evaluateSessionsRead(
    pathParts: string[], 
    auth: AuthContext, 
    data: DataSnapshot
  ): boolean {
    if (!auth.uid) return false;
    return data.child('userId').val() === auth.uid;
  }

  // Streamers: profile public read
  private evaluateStreamersRead(pathParts: string[], auth: AuthContext): boolean {
    // Profile and sorteos are public read
    return true;
  }
}

// Helper to create mock data snapshots
function createMockSnapshot(data: Record<string, unknown> | null): DataSnapshot {
  return {
    exists: () => data !== null,
    child: (path: string) => {
      if (!data) return createMockSnapshot(null);
      const value = data[path];
      if (typeof value === 'object' && value !== null) {
        return createMockSnapshot(value as Record<string, unknown>);
      }
      return {
        exists: () => value !== undefined,
        child: () => createMockSnapshot(null),
        val: () => value,
        hasChildren: () => false,
      };
    },
    val: () => data,
    hasChildren: (children: string[]) => {
      if (!data) return false;
      return children.every(child => child in data);
    },
  };
}

const rulesEvaluator = new RulesEvaluator();

// ============================================
// PROPERTY-BASED TEST GENERATORS
// ============================================

/**
 * Generator for valid user IDs
 */
const userIdArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/'));

/**
 * Generator for resource IDs
 */
const resourceIdArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/'));

/**
 * Generator for auth contexts (authenticated or not)
 */
const authContextArbitrary = fc.oneof(
  fc.constant({ uid: null }), // Unauthenticated
  userIdArbitrary.map(uid => ({ uid })) // Authenticated
);

/**
 * Generator for ownership scenarios
 */
const ownershipScenarioArbitrary = fc.record({
  ownerId: userIdArbitrary,
  isPublic: fc.boolean(),
});

describe('Property 9: Firebase Read Access Control', () => {
  describe('Ownership-Based Access (overlays, broadcaster_tokens, users)', () => {
    it('should only allow users to read their own overlays', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary,
          resourceIdArbitrary,
          (authenticatedUserId, resourceOwnerId, overlayId) => {
            const auth = { uid: authenticatedUserId };
            const path = `overlays/${resourceOwnerId}/${overlayId}`;
            const data = createMockSnapshot({ type: 'poll', updatedAt: Date.now() });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Can read if and only if authenticated user owns the resource
            expect(canRead).toBe(authenticatedUserId === resourceOwnerId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny unauthenticated read access to overlays', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          resourceIdArbitrary,
          (resourceOwnerId, overlayId) => {
            const auth = { uid: null }; // Unauthenticated
            const path = `overlays/${resourceOwnerId}/${overlayId}`;
            const data = createMockSnapshot({ type: 'poll', updatedAt: Date.now() });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Unauthenticated users can never read overlays
            expect(canRead).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only allow broadcasters to read their own tokens', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary,
          (authenticatedUserId, broadcasterId) => {
            const auth = { uid: authenticatedUserId };
            const path = `broadcaster_tokens/${broadcasterId}`;
            const data = createMockSnapshot({
              broadcasterId,
              encryptedToken: 'encrypted_value',
              storedAt: Date.now(),
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Can read if and only if authenticated user is the broadcaster
            expect(canRead).toBe(authenticatedUserId === broadcasterId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only allow users to read their own user data', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary,
          (authenticatedUserId, targetUserId) => {
            const auth = { uid: authenticatedUserId };
            const path = `users/${targetUserId}`;
            const data = createMockSnapshot({
              displayName: 'Test User',
              email: 'test@example.com',
              createdAt: Date.now(),
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Can read if and only if authenticated user is the target user
            expect(canRead).toBe(authenticatedUserId === targetUserId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Public or Owner Access (giveaways, polls)', () => {
    it('should allow owner to read their giveaways regardless of public flag', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          resourceIdArbitrary,
          fc.boolean(),
          (ownerId, giveawayId, isPublic) => {
            const auth = { uid: ownerId };
            const path = `giveaways/${giveawayId}`;
            const data = createMockSnapshot({
              title: 'Test Giveaway',
              ownerId,
              createdAt: Date.now(),
              public: isPublic,
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Owner can always read their own giveaways
            expect(canRead).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow anyone to read public giveaways', () => {
      fc.assert(
        fc.property(
          authContextArbitrary,
          userIdArbitrary,
          resourceIdArbitrary,
          (auth, ownerId, giveawayId) => {
            const path = `giveaways/${giveawayId}`;
            const data = createMockSnapshot({
              title: 'Public Giveaway',
              ownerId,
              createdAt: Date.now(),
              public: true,
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Public giveaways are readable by anyone (authenticated or not)
            expect(canRead).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny non-owners from reading private giveaways', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary,
          resourceIdArbitrary,
          (authenticatedUserId, ownerId, giveawayId) => {
            fc.pre(authenticatedUserId !== ownerId); // Ensure they're different users
            
            const auth = { uid: authenticatedUserId };
            const path = `giveaways/${giveawayId}`;
            const data = createMockSnapshot({
              title: 'Private Giveaway',
              ownerId,
              createdAt: Date.now(),
              public: false,
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Non-owners cannot read private giveaways
            expect(canRead).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce same access rules for polls as giveaways', () => {
      fc.assert(
        fc.property(
          authContextArbitrary,
          userIdArbitrary,
          resourceIdArbitrary,
          fc.boolean(),
          (auth, ownerId, pollId, isPublic) => {
            const path = `polls/${pollId}`;
            const data = createMockSnapshot({
              title: 'Test Poll',
              options: ['Option 1', 'Option 2'],
              ownerId,
              createdAt: Date.now(),
              public: isPublic,
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Access rules match giveaways
            // - Public polls are readable by anyone
            // - Private polls are only readable by owner
            if (isPublic) {
              expect(canRead).toBe(true);
            } else {
              expect(canRead).toBe(auth.uid === ownerId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Session-Based Access', () => {
    it('should only allow users to read their own sessions', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary,
          resourceIdArbitrary,
          (authenticatedUserId, sessionOwnerId, sessionId) => {
            const auth = { uid: authenticatedUserId };
            const path = `sessions/${sessionId}`;
            const data = createMockSnapshot({
              userId: sessionOwnerId,
              overlayType: 'poll',
              createdAt: Date.now(),
              expiresAt: Date.now() + 86400000,
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Can read if and only if authenticated user owns the session
            expect(canRead).toBe(authenticatedUserId === sessionOwnerId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny unauthenticated access to sessions', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          resourceIdArbitrary,
          (sessionOwnerId, sessionId) => {
            const auth = { uid: null }; // Unauthenticated
            const path = `sessions/${sessionId}`;
            const data = createMockSnapshot({
              userId: sessionOwnerId,
              overlayType: 'giveaway',
              createdAt: Date.now(),
              expiresAt: Date.now() + 86400000,
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Unauthenticated users can never read sessions
            expect(canRead).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Public Read Access (overlay_sessions, streamers)', () => {
    it('should allow anyone to read overlay_sessions (for OBS browser sources)', () => {
      fc.assert(
        fc.property(
          authContextArbitrary,
          resourceIdArbitrary,
          (auth, sessionId) => {
            const path = `overlay_sessions/${sessionId}`;
            const data = createMockSnapshot({
              ownerId: 'some_user',
              overlayType: 'poll',
              overlayData: { question: 'Test?' },
              createdAt: Date.now(),
              expiresAt: Date.now() + 86400000,
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Overlay sessions are always publicly readable
            expect(canRead).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow anyone to read streamer profiles', () => {
      fc.assert(
        fc.property(
          authContextArbitrary,
          userIdArbitrary,
          (auth, streamerId) => {
            const path = `streamers/${streamerId}/profile`;
            const data = createMockSnapshot({
              displayName: 'Test Streamer',
              updatedAt: Date.now(),
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Streamer profiles are always publicly readable
            expect(canRead).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Default Deny for Unknown Paths', () => {
    it('should deny read access to unknown/undefined paths', () => {
      fc.assert(
        fc.property(
          authContextArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
            !['overlays', 'broadcaster_tokens', 'users', 'giveaways', 'polls', 
              'sessions', 'overlay_sessions', 'streamers'].includes(s.split('/')[0])
          ),
          (auth, unknownPath) => {
            const data = createMockSnapshot({ test: 'data' });
            
            const canRead = rulesEvaluator.canRead(unknownPath, auth, data);
            
            // Property: Unknown paths are always denied (default deny)
            expect(canRead).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-User Access Prevention', () => {
    it('should prevent any user from reading another users private resources', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary,
          fc.constantFrom('overlays', 'broadcaster_tokens', 'users', 'sessions'),
          resourceIdArbitrary,
          (user1, user2, resourceType, resourceId) => {
            fc.pre(user1 !== user2); // Ensure different users
            
            const auth = { uid: user1 };
            const path = `${resourceType}/${user2}/${resourceId}`;
            const data = createMockSnapshot({
              ownerId: user2,
              userId: user2,
              broadcasterId: user2,
            });
            
            const canRead = rulesEvaluator.canRead(path, auth, data);
            
            // Property: Users cannot read other users' private resources
            expect(canRead).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
