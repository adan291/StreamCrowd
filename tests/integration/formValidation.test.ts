/**
 * Form Validation Integration Tests
 * 
 * Tests that all forms properly validate input with Zod schemas
 * before submission to APIs or database operations.
 * 
 * @requirements 5.1, 5.2 - Input validation with Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  RewardFormSchema,
  PredictionFormSchema,
  PollFormSchema,
  ConnectionFormSchema,
  TimerFormSchema,
  CommandFormSchema,
  WebhookConfigFormSchema,
} from '../../src/domain/schemas/formSchemas';

describe('Form Validation Integration', () => {
  describe('RewardFormSchema', () => {
    it('should validate valid reward form data', () => {
      const validData = {
        title: 'Test Reward',
        cost: 100,
        prompt: 'Test prompt',
        backgroundColor: '#9147FF',
        isUserInputRequired: false,
        isEnabled: true,
        globalCooldownEnabled: false,
        maxPerStreamEnabled: false,
        maxPerUserPerStreamEnabled: false,
      };

      const result = RewardFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject reward with empty title', () => {
      const invalidData = {
        title: '',
        cost: 100,
        backgroundColor: '#9147FF',
        isUserInputRequired: false,
        isEnabled: true,
        globalCooldownEnabled: false,
        maxPerStreamEnabled: false,
        maxPerUserPerStreamEnabled: false,
      };

      const result = RewardFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('título');
      }
    });

    it('should reject reward with title exceeding 45 characters', () => {
      const invalidData = {
        title: 'A'.repeat(46),
        cost: 100,
        backgroundColor: '#9147FF',
        isUserInputRequired: false,
        isEnabled: true,
        globalCooldownEnabled: false,
        maxPerStreamEnabled: false,
        maxPerUserPerStreamEnabled: false,
      };

      const result = RewardFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject reward with cost below minimum', () => {
      const invalidData = {
        title: 'Test',
        cost: 0,
        backgroundColor: '#9147FF',
        isUserInputRequired: false,
        isEnabled: true,
        globalCooldownEnabled: false,
        maxPerStreamEnabled: false,
        maxPerUserPerStreamEnabled: false,
      };

      const result = RewardFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject reward with invalid background color', () => {
      const invalidData = {
        title: 'Test',
        cost: 100,
        backgroundColor: 'invalid',
        isUserInputRequired: false,
        isEnabled: true,
        globalCooldownEnabled: false,
        maxPerStreamEnabled: false,
        maxPerUserPerStreamEnabled: false,
      };

      const result = RewardFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require cooldown seconds when cooldown is enabled', () => {
      const invalidData = {
        title: 'Test',
        cost: 100,
        backgroundColor: '#9147FF',
        isUserInputRequired: false,
        isEnabled: true,
        globalCooldownEnabled: true,
        // Missing globalCooldownSeconds
        maxPerStreamEnabled: false,
        maxPerUserPerStreamEnabled: false,
      };

      const result = RewardFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('PredictionFormSchema', () => {
    it('should validate valid prediction form data', () => {
      const validData = {
        title: 'Who will win?',
        outcomes: ['Team A', 'Team B'],
        duration: 120,
      };

      const result = PredictionFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject prediction with less than 2 outcomes', () => {
      const invalidData = {
        title: 'Who will win?',
        outcomes: ['Team A'],
        duration: 120,
      };

      const result = PredictionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject prediction with more than 10 outcomes', () => {
      const invalidData = {
        title: 'Who will win?',
        outcomes: Array(11).fill('Option'),
        duration: 120,
      };

      const result = PredictionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject prediction with duplicate outcomes', () => {
      const invalidData = {
        title: 'Who will win?',
        outcomes: ['Team A', 'Team A'],
        duration: 120,
      };

      const result = PredictionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject prediction with duration below minimum', () => {
      const invalidData = {
        title: 'Who will win?',
        outcomes: ['Team A', 'Team B'],
        duration: 15,
      };

      const result = PredictionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject prediction with outcome exceeding 25 characters', () => {
      const invalidData = {
        title: 'Who will win?',
        outcomes: ['A'.repeat(26), 'Team B'],
        duration: 120,
      };

      const result = PredictionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('PollFormSchema', () => {
    it('should validate valid poll form data', () => {
      const validData = {
        title: 'What do you prefer?',
        choices: ['Option A', 'Option B'],
        duration: 60,
      };

      const result = PollFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject poll with empty title', () => {
      const invalidData = {
        title: '',
        choices: ['Option A', 'Option B'],
        duration: 60,
      };

      const result = PollFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject poll with duplicate choices', () => {
      const invalidData = {
        title: 'What do you prefer?',
        choices: ['Option A', 'Option A'],
        duration: 60,
      };

      const result = PollFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject poll with more than 5 choices', () => {
      const invalidData = {
        title: 'What do you prefer?',
        choices: Array(6).fill('Option'),
        duration: 60,
      };

      const result = PollFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ConnectionFormSchema', () => {
    it('should validate valid connection form data', () => {
      const validData = {
        channel: 'testchannel',
        token: 'oauth:abcdefghijklmnopqrstuvwxyz1234567890',
      };

      const result = ConnectionFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject channel with less than 3 characters', () => {
      const invalidData = {
        channel: 'ab',
        token: '',
      };

      const result = ConnectionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject channel with invalid characters', () => {
      const invalidData = {
        channel: 'test-channel',
        token: '',
      };

      const result = ConnectionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid OAuth token format', () => {
      const invalidData = {
        channel: 'testchannel',
        token: 'invalid',
      };

      const result = ConnectionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept empty token', () => {
      const validData = {
        channel: 'testchannel',
        token: '',
      };

      const result = ConnectionFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should convert channel to lowercase', () => {
      const validData = {
        channel: 'TestChannel',
        token: '',
      };

      const result = ConnectionFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.channel).toBe('testchannel');
      }
    });
  });

  describe('TimerFormSchema', () => {
    it('should validate valid timer form data', () => {
      const validData = {
        name: 'Test Timer',
        message: 'This is a test message',
        interval: 300,
        enabled: true,
      };

      const result = TimerFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject timer with empty name', () => {
      const invalidData = {
        name: '',
        message: 'Test message',
        interval: 300,
        enabled: true,
      };

      const result = TimerFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject timer with interval below minimum', () => {
      const invalidData = {
        name: 'Test Timer',
        message: 'Test message',
        interval: 30,
        enabled: true,
      };

      const result = TimerFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject timer with message exceeding 500 characters', () => {
      const invalidData = {
        name: 'Test Timer',
        message: 'A'.repeat(501),
        interval: 300,
        enabled: true,
      };

      const result = TimerFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('CommandFormSchema', () => {
    it('should validate valid command form data', () => {
      const validData = {
        name: 'testcommand',
        response: 'This is a test response',
        cooldown: 30,
        enabled: true,
        modOnly: false,
      };

      const result = CommandFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject command with invalid name characters', () => {
      const invalidData = {
        name: 'test-command',
        response: 'Test response',
        enabled: true,
      };

      const result = CommandFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject command with empty response', () => {
      const invalidData = {
        name: 'testcommand',
        response: '',
        enabled: true,
      };

      const result = CommandFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('WebhookConfigFormSchema', () => {
    it('should validate valid webhook config data', () => {
      const validData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['message', 'follow'],
        enabled: true,
      };

      const result = WebhookConfigFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject webhook with non-HTTPS URL', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'http://example.com/webhook',
        events: ['message'],
        enabled: true,
      };

      const result = WebhookConfigFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject webhook with no events selected', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: [],
        enabled: true,
      };

      const result = WebhookConfigFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject webhook with invalid URL', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'not-a-url',
        events: ['message'],
        enabled: true,
      };

      const result = WebhookConfigFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Cross-cutting validation concerns', () => {
    it('should trim whitespace from string fields', () => {
      const data = {
        title: '  Test Reward  ',
        cost: 100,
        backgroundColor: '#9147FF',
        isUserInputRequired: false,
        isEnabled: true,
        globalCooldownEnabled: false,
        maxPerStreamEnabled: false,
        maxPerUserPerStreamEnabled: false,
      };

      const result = RewardFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Reward');
      }
    });

    it('should provide clear error messages for validation failures', () => {
      const invalidData = {
        title: '',
        cost: 0,
        backgroundColor: 'invalid',
        isUserInputRequired: false,
        isEnabled: true,
        globalCooldownEnabled: false,
        maxPerStreamEnabled: false,
        maxPerUserPerStreamEnabled: false,
      };

      const result = RewardFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        result.error.issues.forEach((issue) => {
          expect(issue.message).toBeTruthy();
          expect(typeof issue.message).toBe('string');
        });
      }
    });
  });
});

