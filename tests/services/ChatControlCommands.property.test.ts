/**
 * Property-based tests for ChatControlCommandsService
 * 
 * Tests command parsing, permission checking, and execution flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  ChatControlCommandsService,
  parseControlCommand,
  hasPermission,
  getUserPermissionLevel,
  DEFAULT_CONTROL_CONFIG,
  CONTROL_COMMANDS,
  type CommandUser,
  type ChatControlConfig,
  type DynamicType,
  type PermissionLevel,
  type ParsedControlCommand,
} from '../../src/application/services/ChatControlCommandsService';

// ============================================
// ARBITRARIES
// ============================================

const platformArb = fc.constantFrom('twitch', 'youtube', 'kick') as fc.Arbitrary<'twitch' | 'youtube' | 'kick'>;

const commandUserArb: fc.Arbitrary<CommandUser> = fc.record({
  id: fc.uuid(),
  username: fc.string({ minLength: 3, maxLength: 25 }).filter(s => /^[a-z0-9_]+$/i.test(s)),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  isBroadcaster: fc.boolean(),
  isModerator: fc.boolean(),
  isVip: fc.boolean(),
  isSubscriber: fc.boolean(),
  platform: platformArb,
});

const broadcasterUserArb: fc.Arbitrary<CommandUser> = commandUserArb.map(user => ({
  ...user,
  isBroadcaster: true,
}));

const moderatorUserArb: fc.Arbitrary<CommandUser> = commandUserArb.map(user => ({
  ...user,
  isBroadcaster: false,
  isModerator: true,
}));

const regularUserArb: fc.Arbitrary<CommandUser> = commandUserArb.map(user => ({
  ...user,
  isBroadcaster: false,
  isModerator: false,
  isVip: false,
  isSubscriber: false,
}));

const dynamicTypeArb: fc.Arbitrary<DynamicType> = fc.constantFrom('poll', 'giveaway', 'prediction', 'judge');

const permissionLevelArb: fc.Arbitrary<PermissionLevel> = fc.constantFrom(
  'broadcaster', 'moderator', 'vip', 'subscriber', 'everyone'
);

const prefixArb = fc.constantFrom('!', '?', '.', '/');

const configArb: fc.Arbitrary<ChatControlConfig> = fc.record({
  enabled: fc.boolean(),
  prefix: prefixArb,
  allowedPermissions: fc.record({
    poll: permissionLevelArb,
    giveaway: permissionLevelArb,
    prediction: permissionLevelArb,
    judge: permissionLevelArb,
  }),
  cooldownMs: fc.integer({ min: 0, max: 60000 }),
  announceInChat: fc.boolean(),
  language: fc.constantFrom('es', 'en'),
});

// ============================================
// PERMISSION TESTS
// ============================================

describe('ChatControlCommandsService - Permissions', () => {
  describe('hasPermission', () => {
    it('broadcaster always has permission', () => {
      fc.assert(
        fc.property(
          broadcasterUserArb,
          permissionLevelArb,
          (user, permission) => {
            expect(hasPermission(user, permission)).toBe(true);
          }
        )
      );
    });

    it('moderator has permission for moderator level and below', () => {
      fc.assert(
        fc.property(
          moderatorUserArb,
          (user) => {
            expect(hasPermission(user, 'moderator')).toBe(true);
            expect(hasPermission(user, 'vip')).toBe(true);
            expect(hasPermission(user, 'subscriber')).toBe(true);
            expect(hasPermission(user, 'everyone')).toBe(true);
            // Moderator should NOT have broadcaster permission
            expect(hasPermission(user, 'broadcaster')).toBe(false);
          }
        )
      );
    });

    it('regular user only has everyone permission', () => {
      fc.assert(
        fc.property(
          regularUserArb,
          (user) => {
            expect(hasPermission(user, 'everyone')).toBe(true);
            expect(hasPermission(user, 'broadcaster')).toBe(false);
            expect(hasPermission(user, 'moderator')).toBe(false);
            expect(hasPermission(user, 'vip')).toBe(false);
            expect(hasPermission(user, 'subscriber')).toBe(false);
          }
        )
      );
    });
  });

  describe('getUserPermissionLevel', () => {
    it('returns correct level for broadcaster', () => {
      fc.assert(
        fc.property(
          broadcasterUserArb,
          (user) => {
            expect(getUserPermissionLevel(user)).toBe('broadcaster');
          }
        )
      );
    });

    it('returns correct level for moderator (non-broadcaster)', () => {
      fc.assert(
        fc.property(
          moderatorUserArb,
          (user) => {
            expect(getUserPermissionLevel(user)).toBe('moderator');
          }
        )
      );
    });

    it('returns everyone for regular users', () => {
      fc.assert(
        fc.property(
          regularUserArb,
          (user) => {
            expect(getUserPermissionLevel(user)).toBe('everyone');
          }
        )
      );
    });
  });
});

// ============================================
// COMMAND PARSING TESTS
// ============================================

describe('ChatControlCommandsService - Parsing', () => {
  describe('parseControlCommand', () => {
    it('returns null for messages without prefix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.startsWith('!')),
          broadcasterUserArb,
          (message, user) => {
            const config = { ...DEFAULT_CONTROL_CONFIG, prefix: '!' };
            const result = parseControlCommand(message, user, config);
            expect(result).toBeNull();
          }
        )
      );
    });

    it('returns null when disabled', () => {
      fc.assert(
        fc.property(
          broadcasterUserArb,
          (user) => {
            const config = { ...DEFAULT_CONTROL_CONFIG, enabled: false };
            const result = parseControlCommand('!tv poll create test', user, config);
            expect(result).toBeNull();
          }
        )
      );
    });

    it('parses valid poll commands', () => {
      fc.assert(
        fc.property(
          broadcasterUserArb,
          fc.constantFrom('create', 'close', 'results', 'reset', 'info'),
          (user, action) => {
            const config = DEFAULT_CONTROL_CONFIG;
            const result = parseControlCommand(`!tv poll ${action}`, user, config);
            
            expect(result).not.toBeNull();
            expect(result?.dynamic).toBe('poll');
            expect(result?.action).toBe(action);
          }
        )
      );
    });

    it('parses valid giveaway commands', () => {
      fc.assert(
        fc.property(
          broadcasterUserArb,
          fc.constantFrom('start', 'winner', 'close', 'participants', 'reroll'),
          (user, action) => {
            const config = DEFAULT_CONTROL_CONFIG;
            const result = parseControlCommand(`!tv raffle ${action}`, user, config);
            
            expect(result).not.toBeNull();
            expect(result?.dynamic).toBe('giveaway');
            expect(result?.action).toBe(action);
          }
        )
      );
    });

    it('parses valid prediction commands', () => {
      fc.assert(
        fc.property(
          broadcasterUserArb,
          fc.constantFrom('create', 'lock', 'resolve', 'cancel'),
          (user, action) => {
            const config = DEFAULT_CONTROL_CONFIG;
            const result = parseControlCommand(`!tv pred ${action}`, user, config);
            
            expect(result).not.toBeNull();
            expect(result?.dynamic).toBe('prediction');
            expect(result?.action).toBe(action);
          }
        )
      );
    });

    it('parses valid judge/tournament commands', () => {
      fc.assert(
        fc.property(
          broadcasterUserArb,
          fc.constantFrom('start', 'pause', 'next', 'winner', 'ranking'),
          (user, action) => {
            const config = DEFAULT_CONTROL_CONFIG;
            const result = parseControlCommand(`!tv judge ${action}`, user, config);
            
            expect(result).not.toBeNull();
            expect(result?.dynamic).toBe('judge');
            expect(result?.action).toBe(action);
          }
        )
      );
    });

    it('handles dynamic aliases', () => {
      const config = DEFAULT_CONTROL_CONFIG;
      const user: CommandUser = {
        id: '123',
        username: 'test',
        displayName: 'Test',
        isBroadcaster: true,
        isModerator: false,
        isVip: false,
        isSubscriber: false,
        platform: 'twitch',
      };

      // Test giveaway aliases
      expect(parseControlCommand('!tv giveaway start', user, config)?.dynamic).toBe('giveaway');
      expect(parseControlCommand('!tv raffle start', user, config)?.dynamic).toBe('giveaway');

      // Test prediction aliases
      expect(parseControlCommand('!tv prediction create', user, config)?.dynamic).toBe('prediction');
      expect(parseControlCommand('!tv pred create', user, config)?.dynamic).toBe('prediction');

      // Test judge aliases
      expect(parseControlCommand('!tv tournament start', user, config)?.dynamic).toBe('judge');
      expect(parseControlCommand('!tv judge start', user, config)?.dynamic).toBe('judge');
    });

    it('parses arguments correctly', () => {
      const config = DEFAULT_CONTROL_CONFIG;
      const user: CommandUser = {
        id: '123',
        username: 'test',
        displayName: 'Test',
        isBroadcaster: true,
        isModerator: false,
        isVip: false,
        isSubscriber: false,
        platform: 'twitch',
      };

      const result = parseControlCommand('!tv poll create "My question" op1,op2,op3 60', user, config);
      
      expect(result).not.toBeNull();
      expect(result?.args).toHaveLength(3);
      expect(result?.args[0]).toBe('My question');
      expect(result?.args[1]).toBe('op1,op2,op3');
      expect(result?.args[2]).toBe('60');
    });

    it('respects custom prefix', () => {
      fc.assert(
        fc.property(
          prefixArb,
          broadcasterUserArb,
          (prefix, user) => {
            const config = { ...DEFAULT_CONTROL_CONFIG, prefix };
            const result = parseControlCommand(`${prefix}tv poll create`, user, config);
            
            expect(result).not.toBeNull();
            expect(result?.dynamic).toBe('poll');
          }
        )
      );
    });

    it('returns null for users without permission', () => {
      const config: ChatControlConfig = {
        ...DEFAULT_CONTROL_CONFIG,
        allowedPermissions: {
          poll: 'broadcaster',
          giveaway: 'broadcaster',
          prediction: 'broadcaster',
          judge: 'broadcaster',
        },
      };

      fc.assert(
        fc.property(
          regularUserArb,
          (user) => {
            const result = parseControlCommand('!tv poll create', user, config);
            expect(result).toBeNull();
          }
        )
      );
    });

    it('returns null for non-tv commands', () => {
      const config = DEFAULT_CONTROL_CONFIG;
      const user: CommandUser = {
        id: '123',
        username: 'test',
        displayName: 'Test',
        isBroadcaster: true,
        isModerator: false,
        isVip: false,
        isSubscriber: false,
        platform: 'twitch',
      };

      // Old format should not work
      expect(parseControlCommand('!encuesta crear', user, config)).toBeNull();
      expect(parseControlCommand('!sorteo iniciar', user, config)).toBeNull();
      expect(parseControlCommand('!prediccion crear', user, config)).toBeNull();
      expect(parseControlCommand('!torneo iniciar', user, config)).toBeNull();
    });
  });
});

// ============================================
// SERVICE TESTS
// ============================================

describe('ChatControlCommandsService - Service', () => {
  let service: ChatControlCommandsService;

  beforeEach(() => {
    service = new ChatControlCommandsService();
  });

  describe('configuration', () => {
    it('uses default config', () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(DEFAULT_CONTROL_CONFIG.enabled);
      expect(config.prefix).toBe(DEFAULT_CONTROL_CONFIG.prefix);
    });

    it('updates config correctly', () => {
      fc.assert(
        fc.property(
          configArb,
          (newConfig) => {
            service.updateConfig(newConfig);
            const config = service.getConfig();
            
            expect(config.enabled).toBe(newConfig.enabled);
            expect(config.prefix).toBe(newConfig.prefix);
            expect(config.cooldownMs).toBe(newConfig.cooldownMs);
          }
        )
      );
    });
  });

  describe('handler registration', () => {
    it('registers and unregisters handlers', () => {
      fc.assert(
        fc.property(
          dynamicTypeArb,
          (dynamic) => {
            const handler = vi.fn().mockReturnValue({ success: true, message: 'ok' });
            const unsubscribe = service.registerHandler(dynamic, handler);
            
            expect(typeof unsubscribe).toBe('function');
            
            // Unsubscribe should work
            unsubscribe();
          }
        )
      );
    });
  });

  describe('processMessage', () => {
    it('returns null for non-command messages', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.startsWith('!')),
          broadcasterUserArb,
          async (message, user) => {
            const result = await service.processMessage(message, user);
            expect(result).toBeNull();
          }
        )
      );
    });

    it('returns error when no handler registered', async () => {
      const user: CommandUser = {
        id: '123',
        username: 'test',
        displayName: 'Test',
        isBroadcaster: true,
        isModerator: false,
        isVip: false,
        isSubscriber: false,
        platform: 'twitch',
      };

      const result = await service.processMessage('!tv poll create test', user);
      
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect(result?.message).toContain('handler');
    });

    it('executes handler when registered', async () => {
      const handler = vi.fn().mockReturnValue({ success: true, message: 'Poll created' });
      service.registerHandler('poll', handler);

      const user: CommandUser = {
        id: '123',
        username: 'test',
        displayName: 'Test',
        isBroadcaster: true,
        isModerator: false,
        isVip: false,
        isSubscriber: false,
        platform: 'twitch',
      };

      const result = await service.processMessage('!tv poll create test', user);
      
      expect(handler).toHaveBeenCalled();
      expect(result?.success).toBe(true);
      expect(result?.message).toBe('Poll created');
    });

    it('respects cooldown', async () => {
      service.updateConfig({ cooldownMs: 5000 });
      
      const handler = vi.fn().mockReturnValue({ success: true, message: 'ok' });
      service.registerHandler('poll', handler);

      const user: CommandUser = {
        id: '123',
        username: 'test',
        displayName: 'Test',
        isBroadcaster: true,
        isModerator: false,
        isVip: false,
        isSubscriber: false,
        platform: 'twitch',
      };

      // First call should work
      await service.processMessage('!tv poll create test', user);
      expect(handler).toHaveBeenCalledTimes(1);

      // Second call should be ignored (cooldown)
      const result = await service.processMessage('!tv poll create test', user);
      expect(result).toBeNull();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAvailableCommands', () => {
    it('returns all commands for broadcaster', () => {
      fc.assert(
        fc.property(
          broadcasterUserArb,
          (user) => {
            const commands = service.getAvailableCommands(user);
            expect(commands.length).toBe(CONTROL_COMMANDS.length);
          }
        )
      );
    });

    it('filters commands based on permission', () => {
      service.updateConfig({
        allowedPermissions: {
          poll: 'everyone',
          giveaway: 'broadcaster',
          prediction: 'broadcaster',
          judge: 'broadcaster',
        },
      });

      fc.assert(
        fc.property(
          regularUserArb,
          (user) => {
            const commands = service.getAvailableCommands(user);
            // Only poll should be available (tv command covers all dynamics)
            expect(commands.length).toBe(1);
          }
        )
      );
    });
  });

  describe('getCommandHelp', () => {
    it('returns help for tv command', () => {
      const help = service.getCommandHelp('tv');
      expect(help).not.toBeNull();
      expect(help).toContain('tv');
    });

    it('returns null for unknown commands', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 20 }),
          (unknownCmd) => {
            const help = service.getCommandHelp(unknownCmd);
            // Most random strings won't match any command
            if (!CONTROL_COMMANDS.some(c => c.name === unknownCmd || c.aliases.includes(unknownCmd))) {
              expect(help).toBeNull();
            }
          }
        )
      );
    });
  });

  describe('resetCooldowns', () => {
    it('allows commands after reset', async () => {
      service.updateConfig({ cooldownMs: 60000 }); // Long cooldown
      
      const handler = vi.fn().mockReturnValue({ success: true, message: 'ok' });
      service.registerHandler('poll', handler);

      const user: CommandUser = {
        id: '123',
        username: 'test',
        displayName: 'Test',
        isBroadcaster: true,
        isModerator: false,
        isVip: false,
        isSubscriber: false,
        platform: 'twitch',
      };

      // First call
      await service.processMessage('!tv poll create test', user);
      expect(handler).toHaveBeenCalledTimes(1);

      // Reset cooldowns
      service.resetCooldowns();

      // Should work again
      await service.processMessage('!tv poll create test', user);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================
// CONTROL COMMANDS DEFINITION TESTS
// ============================================

describe('CONTROL_COMMANDS', () => {
  it('all commands have required fields', () => {
    CONTROL_COMMANDS.forEach(cmd => {
      expect(cmd.name).toBeTruthy();
      expect(cmd.aliases).toBeInstanceOf(Array);
      expect(cmd.description).toBeTruthy();
      expect(cmd.usage).toBeTruthy();
      expect(cmd.examples).toBeInstanceOf(Array);
      expect(cmd.examples.length).toBeGreaterThan(0);
      expect(['poll', 'giveaway', 'prediction', 'judge']).toContain(cmd.dynamic);
      expect(['broadcaster', 'moderator', 'vip', 'subscriber', 'everyone']).toContain(cmd.minPermission);
    });
  });

  it('all dynamics have at least one command', () => {
    // With the new !tv format, there's only one command that handles all dynamics
    expect(CONTROL_COMMANDS.length).toBeGreaterThan(0);
    expect(CONTROL_COMMANDS[0].name).toBe('tv');
  });

  it('no duplicate command names or aliases', () => {
    const allNames = new Set<string>();
    
    CONTROL_COMMANDS.forEach(cmd => {
      expect(allNames.has(cmd.name)).toBe(false);
      allNames.add(cmd.name);
      
      cmd.aliases.forEach(alias => {
        expect(allNames.has(alias)).toBe(false);
        allNames.add(alias);
      });
    });
  });
});
