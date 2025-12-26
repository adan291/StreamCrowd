/**
 * Tests para la entidad Vote del dominio
 * Validación de votos y moderación
 */

import { describe, it, expect } from 'vitest';
import {
  validateVote,
  calculateWeight,
  validateAccountAge,
  validateCooldown,
  canChangeVote,
  isUserBlacklisted,
  isUserWhitelisted,
  DEFAULT_MODERATION_CONFIG,
  ModerationConfig,
  VoteValidationInput,
} from '../../src/domain/entities/Vote';

describe('Vote Entity', () => {
  const defaultInput: VoteValidationInput = {
    username: 'testuser',
    oderId: 'user123',
    optionId: 1,
    accountAgeDays: 30,
    hasVoted: false,
    lastVoteTime: 0,
    currentTime: Date.now(),
    isSubscriber: false,
    isFollower: true,
  };

  describe('validateVote', () => {
    it('should accept valid vote with default config', () => {
      const result = validateVote(
        defaultInput,
        DEFAULT_MODERATION_CONFIG,
        [1, 2, 3]
      );

      expect(result.isValid).toBe(true);
      expect(result.weight).toBe(1);
      expect(result.isVoteChange).toBe(false);
    });

    it('should reject vote for invalid option', () => {
      const result = validateVote(
        { ...defaultInput, optionId: 99 },
        DEFAULT_MODERATION_CONFIG,
        [1, 2, 3]
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('INVALID_OPTION');
    });

    it('should reject duplicate vote when not allowed', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        voteChangeEnabled: false,
      };

      const result = validateVote(
        { ...defaultInput, hasVoted: true },
        config,
        [1, 2, 3],
        { optionId: 1, timestamp: Date.now() - 1000, weight: 1 }
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('VOTE_CHANGE_DISABLED');
    });

    it('should allow vote change when enabled', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        voteChangeEnabled: true,
        voteChangeCooldownSeconds: 0,
      };

      const result = validateVote(
        { ...defaultInput, hasVoted: true },
        config,
        [1, 2, 3],
        { optionId: 2, timestamp: Date.now() - 10000, weight: 1 }
      );

      expect(result.isValid).toBe(true);
      expect(result.isVoteChange).toBe(true);
      expect(result.previousOptionId).toBe(2);
    });

    it('should reject vote change during cooldown', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        voteChangeEnabled: true,
        voteChangeCooldownSeconds: 60,
      };

      const now = Date.now();
      const result = validateVote(
        { ...defaultInput, hasVoted: true, lastVoteTime: now - 5000, currentTime: now },
        config,
        [1, 2, 3],
        { optionId: 2, timestamp: now - 5000, weight: 1 }
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('COOLDOWN_ACTIVE');
    });

    it('should reject new accounts when minAccountAgeDays is set', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        minAccountAgeDays: 30,
      };

      const result = validateVote(
        { ...defaultInput, accountAgeDays: 5 },
        config,
        [1, 2, 3]
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('ACCOUNT_TOO_YOUNG');
    });

    it('should accept old accounts', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        minAccountAgeDays: 30,
      };

      const result = validateVote(
        { ...defaultInput, accountAgeDays: 60 },
        config,
        [1, 2, 3]
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject blacklisted users', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        blacklist: {
          enabled: true,
          usernames: ['baduser', 'testuser'],
        },
      };

      const result = validateVote(
        defaultInput,
        config,
        [1, 2, 3]
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('BLACKLISTED');
    });

    it('should reject non-whitelisted users when whitelist enabled', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        whitelist: {
          enabled: true,
          usernames: ['vipuser'],
        },
      };

      const result = validateVote(
        defaultInput,
        config,
        [1, 2, 3]
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('NOT_WHITELISTED');
    });
  });

  describe('calculateWeight', () => {
    it('should return regular weight by default', () => {
      const weight = calculateWeight(false, false, DEFAULT_MODERATION_CONFIG);
      expect(weight).toBe(1);
    });

    it('should apply subscriber weight', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        weights: { subscriber: 3, follower: 2, regular: 1 },
      };

      const weight = calculateWeight(true, false, config);
      expect(weight).toBe(3);
    });

    it('should apply follower weight', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        weights: { subscriber: 3, follower: 2, regular: 1 },
      };

      const weight = calculateWeight(false, true, config);
      expect(weight).toBe(2);
    });

    it('should prioritize subscriber over follower', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        weights: { subscriber: 3, follower: 2, regular: 1 },
      };

      const weight = calculateWeight(true, true, config);
      expect(weight).toBe(3);
    });
  });

  describe('validateAccountAge', () => {
    it('should return true when minAge is 0', () => {
      expect(validateAccountAge(0, 0)).toBe(true);
    });

    it('should return true when account is old enough', () => {
      expect(validateAccountAge(30, 7)).toBe(true);
    });

    it('should return false when account is too new', () => {
      expect(validateAccountAge(3, 7)).toBe(false);
    });
  });

  describe('validateCooldown', () => {
    it('should return true when no previous vote', () => {
      expect(validateCooldown(0, 60, Date.now())).toBe(true);
    });

    it('should return true when cooldown has passed', () => {
      const now = Date.now();
      const lastVote = now - 120000; // 2 minutes ago
      expect(validateCooldown(lastVote, 60, now)).toBe(true);
    });

    it('should return false when still in cooldown', () => {
      const now = Date.now();
      const lastVote = now - 30000; // 30 seconds ago
      expect(validateCooldown(lastVote, 60, now)).toBe(false);
    });
  });

  describe('canChangeVote', () => {
    it('should return true for first vote', () => {
      expect(canChangeVote(false, false)).toBe(true);
    });

    it('should return true when vote change enabled', () => {
      expect(canChangeVote(true, true)).toBe(true);
    });

    it('should return false when vote change disabled and already voted', () => {
      expect(canChangeVote(true, false)).toBe(false);
    });
  });

  describe('isUserBlacklisted', () => {
    it('should return false when blacklist disabled', () => {
      expect(isUserBlacklisted('anyuser', DEFAULT_MODERATION_CONFIG)).toBe(false);
    });

    it('should return true for blacklisted user', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        blacklist: { enabled: true, usernames: ['baduser'] },
      };
      expect(isUserBlacklisted('baduser', config)).toBe(true);
    });

    it('should be case insensitive', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        blacklist: { enabled: true, usernames: ['BadUser'] },
      };
      expect(isUserBlacklisted('baduser', config)).toBe(true);
    });
  });

  describe('isUserWhitelisted', () => {
    it('should return true when whitelist disabled', () => {
      expect(isUserWhitelisted('anyuser', DEFAULT_MODERATION_CONFIG)).toBe(true);
    });

    it('should return true for whitelisted user', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        whitelist: { enabled: true, usernames: ['vipuser'] },
      };
      expect(isUserWhitelisted('vipuser', config)).toBe(true);
    });

    it('should return false for non-whitelisted user', () => {
      const config: ModerationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        whitelist: { enabled: true, usernames: ['vipuser'] },
      };
      expect(isUserWhitelisted('regularuser', config)).toBe(false);
    });
  });

  describe('DEFAULT_MODERATION_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_MODERATION_CONFIG.voteChangeEnabled).toBe(true);
      expect(DEFAULT_MODERATION_CONFIG.voteChangeCooldownSeconds).toBe(0);
      expect(DEFAULT_MODERATION_CONFIG.minAccountAgeDays).toBe(0);
      expect(DEFAULT_MODERATION_CONFIG.weights.subscriber).toBe(1);
      expect(DEFAULT_MODERATION_CONFIG.weights.follower).toBe(1);
      expect(DEFAULT_MODERATION_CONFIG.weights.regular).toBe(1);
      expect(DEFAULT_MODERATION_CONFIG.blacklist.enabled).toBe(false);
      expect(DEFAULT_MODERATION_CONFIG.whitelist.enabled).toBe(false);
    });
  });
});
