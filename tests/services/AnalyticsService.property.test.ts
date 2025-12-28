/**
 * Property-based tests for AnalyticsService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the analytics system.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AnalyticsService, StoredMessage } from '../../src/application/services/AnalyticsService';

// ============ ARBITRARIES ============

const usernameArb = fc.string({ minLength: 3, maxLength: 25 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s));

const messageArb = fc.string({ minLength: 1, maxLength: 200 });

const storedMessageArb = (baseTimestamp: number): fc.Arbitrary<StoredMessage> => fc.record({
  username: usernameArb,
  message: messageArb,
  timestamp: fc.integer({ min: baseTimestamp, max: baseTimestamp + 3600000 }),
  userId: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }),
});

const positiveMessageArb: fc.Arbitrary<string> = fc.constantFrom(
  'POG this is amazing!',
  'HYPE lets go!!!',
  'love this stream ❤️💜',
  'GG well played!',
  'awesome content 🔥🔥🔥',
  'POGGERS incredible play',
  'genial increíble vamos!',
  'jajaja muy bueno crack'
);

const negativeMessageArb: fc.Arbitrary<string> = fc.constantFrom(
  'this is terrible',
  'hate this so boring',
  'worst stream ever 😭',
  'trash content 💀',
  'cringe fail rip',
  'basura aburrido horrible',
  'malo fatal asco'
);

const neutralMessageArb: fc.Arbitrary<string> = fc.constantFrom(
  'hello everyone',
  'what time is it',
  'anyone here from spain',
  'first time watching',
  'hola a todos',
  'que hora es'
);

// ============ TESTS ============

describe('AnalyticsService Property Tests', () => {
  let service: AnalyticsService;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Mock localStorage
    const storage = new Map<string, string>();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
      writable: true,
    });
    
    service = new AnalyticsService();
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe('Property 14: Metrics Calculation - totalMessages equals processed count', () => {
    /**
     * totalMessages should equal the number of messages processed.
     * 
     * @validates Requirements 3.1
     */
    it('should count total messages correctly', () => {
      const baseTimestamp = Date.now() - 300000; // 5 minutes ago
      
      fc.assert(
        fc.property(
          fc.array(storedMessageArb(baseTimestamp), { minLength: 1, maxLength: 100 }),
          (messages) => {
            const metrics = service.analyzeChat(messages, baseTimestamp);
            expect(metrics.totalMessages).toBe(messages.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 15: Metrics Calculation - uniqueUsers equals unique usernames', () => {
    /**
     * uniqueUsers should equal the number of unique usernames.
     * 
     * @validates Requirements 3.2
     */
    it('should count unique users correctly', () => {
      const baseTimestamp = Date.now() - 300000;
      
      fc.assert(
        fc.property(
          fc.array(storedMessageArb(baseTimestamp), { minLength: 1, maxLength: 100 }),
          (messages) => {
            const metrics = service.analyzeChat(messages, baseTimestamp);
            const expectedUniqueUsers = new Set(messages.map(m => m.username.toLowerCase())).size;
            expect(metrics.uniqueUsers).toBe(expectedUniqueUsers);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 16: Metrics Calculation - messagesPerMinute is non-negative', () => {
    /**
     * messagesPerMinute should always be >= 0.
     * 
     * @validates Requirements 3.1
     */
    it('should have non-negative messages per minute', () => {
      const baseTimestamp = Date.now() - 300000;
      
      fc.assert(
        fc.property(
          fc.array(storedMessageArb(baseTimestamp), { minLength: 0, maxLength: 100 }),
          (messages) => {
            const metrics = service.analyzeChat(messages, baseTimestamp);
            expect(metrics.messagesPerMinute).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 17: Mood Detection - Positive messages result in positive sentiment', () => {
    /**
     * Messages with positive patterns should result in 'positive' sentiment.
     * 
     * @validates Requirements 3.3
     */
    it('should detect positive sentiment from positive messages', () => {
      const baseTimestamp = Date.now() - 60000;
      
      fc.assert(
        fc.property(
          fc.array(positiveMessageArb, { minLength: 10, maxLength: 30 }),
          (positiveTexts) => {
            const messages: StoredMessage[] = positiveTexts.map((text, i) => ({
              username: `user${i}`,
              message: text,
              timestamp: baseTimestamp + i * 1000,
            }));
            
            const metrics = service.analyzeChat(messages, baseTimestamp);
            expect(metrics.sentiment).toBe('positive');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 18: Mood Detection - Negative messages result in negative sentiment', () => {
    /**
     * Messages with negative patterns should result in 'negative' sentiment.
     * 
     * @validates Requirements 3.3
     */
    it('should detect negative sentiment from negative messages', () => {
      const baseTimestamp = Date.now() - 60000;
      
      fc.assert(
        fc.property(
          fc.array(negativeMessageArb, { minLength: 10, maxLength: 30 }),
          (negativeTexts) => {
            const messages: StoredMessage[] = negativeTexts.map((text, i) => ({
              username: `user${i}`,
              message: text,
              timestamp: baseTimestamp + i * 1000,
            }));
            
            const metrics = service.analyzeChat(messages, baseTimestamp);
            expect(metrics.sentiment).toBe('negative');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 19: Mood Detection - Neutral messages result in neutral sentiment', () => {
    /**
     * Messages without strong sentiment patterns should result in 'neutral' sentiment.
     * 
     * @validates Requirements 3.3
     */
    it('should detect neutral sentiment from neutral messages', () => {
      const baseTimestamp = Date.now() - 60000;
      
      fc.assert(
        fc.property(
          fc.array(neutralMessageArb, { minLength: 10, maxLength: 30 }),
          (neutralTexts) => {
            const messages: StoredMessage[] = neutralTexts.map((text, i) => ({
              username: `user${i}`,
              message: text,
              timestamp: baseTimestamp + i * 1000,
            }));
            
            const metrics = service.analyzeChat(messages, baseTimestamp);
            expect(metrics.sentiment).toBe('neutral');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 20: Word Cloud - Words are sorted by frequency descending', () => {
    /**
     * generateWordCloud should return words sorted by frequency in descending order.
     * 
     * @validates Requirements 3.4
     */
    it('should sort word cloud by frequency descending', () => {
      const baseTimestamp = Date.now() - 60000;
      
      fc.assert(
        fc.property(
          fc.array(storedMessageArb(baseTimestamp), { minLength: 5, maxLength: 50 }),
          (messages) => {
            const wordCloud = service.generateWordCloud(messages);
            
            // Verify descending order
            for (let i = 1; i < wordCloud.length; i++) {
              expect(wordCloud[i - 1].count).toBeGreaterThanOrEqual(wordCloud[i].count);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 21: Word Cloud - Stop words are excluded', () => {
    /**
     * Stop words should not appear in the word cloud.
     * 
     * @validates Requirements 3.4
     */
    it('should exclude stop words from word cloud', () => {
      const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'el', 'la', 'los', 'las', 'de', 'en', 'que', 'es', 'y'];
      const baseTimestamp = Date.now() - 60000;
      
      // Create messages with lots of stop words
      const messages: StoredMessage[] = [
        { username: 'user1', message: 'the quick brown fox jumps over the lazy dog', timestamp: baseTimestamp },
        { username: 'user2', message: 'a man and a woman in the park', timestamp: baseTimestamp + 1000 },
        { username: 'user3', message: 'el perro y el gato en la casa', timestamp: baseTimestamp + 2000 },
        { username: 'user4', message: 'streaming gaming content today', timestamp: baseTimestamp + 3000 },
        { username: 'user5', message: 'amazing incredible awesome stream', timestamp: baseTimestamp + 4000 },
      ];
      
      const wordCloud = service.generateWordCloud(messages);
      const wordCloudWords = wordCloud.map(w => w.word.toLowerCase());
      
      // None of the stop words should appear
      stopWords.forEach(stopWord => {
        expect(wordCloudWords).not.toContain(stopWord);
      });
    });
  });

  describe('Property 22: Word Cloud - Limit is respected', () => {
    /**
     * The word cloud should not exceed the specified limit.
     * 
     * @validates Requirements 3.4
     */
    it('should respect the word limit', () => {
      const baseTimestamp = Date.now() - 60000;
      
      fc.assert(
        fc.property(
          fc.array(storedMessageArb(baseTimestamp), { minLength: 10, maxLength: 100 }),
          fc.integer({ min: 1, max: 50 }),
          (messages, limit) => {
            const wordCloud = service.generateWordCloud(messages, limit);
            expect(wordCloud.length).toBeLessThanOrEqual(limit);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property: Engagement score is bounded', () => {
    /**
     * Engagement score should always be between 0 and 100.
     * 
     * @validates Requirements 3.4
     */
    it('should have engagement score between 0 and 100', () => {
      const baseTimestamp = Date.now() - 300000;
      
      fc.assert(
        fc.property(
          fc.array(storedMessageArb(baseTimestamp), { minLength: 0, maxLength: 100 }),
          (messages) => {
            const metrics = service.analyzeChat(messages, baseTimestamp);
            expect(metrics.engagementScore).toBeGreaterThanOrEqual(0);
            expect(metrics.engagementScore).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
