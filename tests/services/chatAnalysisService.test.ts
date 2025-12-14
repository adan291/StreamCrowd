/**
 * Tests for chatAnalysisService
 * Tests sentiment analysis, metrics calculation, and chat analysis functions
 */
import { describe, it, expect } from 'vitest';
import {
  analyzeChat,
  generateTimeSeries,
  getActivityLabel,
  getSentimentEmoji,
  generateSummary,
  calculateHealthScore,
  getInsights,
  compareSessions,
  ChatMetrics,
} from '../../services/chatAnalysisService';

// Helper to create mock messages
const createMessage = (
  username: string,
  message: string,
  timestamp: number = Date.now()
) => ({
  username,
  message,
  timestamp,
  userId: username,
});

describe('chatAnalysisService', () => {
  describe('analyzeChat', () => {
    it('should return empty metrics for empty messages', () => {
      const metrics = analyzeChat([]);
      
      expect(metrics.totalMessages).toBe(0);
      expect(metrics.uniqueUsers).toBe(0);
      expect(metrics.sentiment).toBe('neutral');
      expect(metrics.activityLevel).toBe('dead');
    });

    it('should count total messages correctly', () => {
      const messages = [
        createMessage('user1', 'hello'),
        createMessage('user2', 'world'),
        createMessage('user1', 'test'),
      ];
      
      const metrics = analyzeChat(messages);
      expect(metrics.totalMessages).toBe(3);
    });

    it('should count unique users correctly', () => {
      const messages = [
        createMessage('user1', 'hello'),
        createMessage('user2', 'world'),
        createMessage('user1', 'again'),
        createMessage('user3', 'test'),
      ];
      
      const metrics = analyzeChat(messages);
      expect(metrics.uniqueUsers).toBe(3);
    });

    it('should detect positive sentiment', () => {
      const messages = [
        createMessage('user1', 'POG this is amazing!'),
        createMessage('user2', 'love it! ❤️❤️'),
        createMessage('user3', 'GG awesome stream'),
        createMessage('user4', 'nice play! 🔥'),
      ];
      
      const metrics = analyzeChat(messages);
      expect(metrics.sentiment).toBe('positive');
      expect(metrics.sentimentScore).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const messages = [
        createMessage('user1', 'this is bad'),
        createMessage('user2', 'hate this 😭'),
        createMessage('user3', 'boring stream'),
        createMessage('user4', 'trash gameplay 👎'),
      ];
      
      const metrics = analyzeChat(messages);
      expect(metrics.sentiment).toBe('negative');
      expect(metrics.sentimentScore).toBeLessThan(0);
    });

    it('should detect neutral sentiment for mixed messages', () => {
      const messages = [
        createMessage('user1', 'hello everyone'),
        createMessage('user2', 'how are you'),
        createMessage('user3', 'what time is it'),
      ];
      
      const metrics = analyzeChat(messages);
      expect(metrics.sentiment).toBe('neutral');
    });

    it('should calculate top users correctly', () => {
      const messages = [
        createMessage('spammer', 'msg1'),
        createMessage('spammer', 'msg2'),
        createMessage('spammer', 'msg3'),
        createMessage('normal', 'msg4'),
        createMessage('lurker', 'msg5'),
      ];
      
      const metrics = analyzeChat(messages);
      expect(metrics.topUsers[0].username).toBe('spammer');
      expect(metrics.topUsers[0].count).toBe(3);
    });

    it('should detect hype mood', () => {
      const messages = Array(10).fill(null).map((_, i) => 
        createMessage(`user${i}`, '🔥 HYPE LET\'S GO POG 🔥')
      );
      
      const metrics = analyzeChat(messages);
      expect(metrics.specialMood).toBe('hype');
    });

    it('should detect love mood', () => {
      const messages = Array(10).fill(null).map((_, i) => 
        createMessage(`user${i}`, '❤️ love you streamer ❤️💜💕')
      );
      
      const metrics = analyzeChat(messages);
      expect(metrics.specialMood).toBe('love');
    });

    it('should calculate activity level correctly', () => {
      // Dead activity (< 0.5 msgs/min)
      const deadMessages = [createMessage('user1', 'hello')];
      const deadMetrics = analyzeChat(deadMessages, Date.now() - 300000); // 5 min ago
      expect(deadMetrics.activityLevel).toBe('dead');
    });

    it('should detect Spanish as dominant language', () => {
      const messages = [
        createMessage('user1', 'hola que tal'),
        createMessage('user2', 'muy bien gracias'),
        createMessage('user3', 'vamos a jugar'),
        createMessage('user4', 'esto es genial'),
      ];
      
      const metrics = analyzeChat(messages);
      expect(metrics.dominantLanguage).toBe('es');
    });

    it('should detect English as dominant language', () => {
      const messages = [
        createMessage('user1', 'hello how are you'),
        createMessage('user2', 'good thanks'),
        createMessage('user3', 'nice stream'),
        createMessage('user4', 'what is this'),
      ];
      
      const metrics = analyzeChat(messages);
      expect(metrics.dominantLanguage).toBe('en');
    });

    it('should calculate spam score for repetitive messages', () => {
      const messages = Array(20).fill(null).map(() => 
        createMessage('spammer', 'buy my product')
      );
      
      const metrics = analyzeChat(messages);
      expect(metrics.spamScore).toBeGreaterThan(30);
    });

    it('should calculate user retention', () => {
      const messages = [
        createMessage('loyal1', 'msg1'),
        createMessage('loyal1', 'msg2'),
        createMessage('loyal2', 'msg3'),
        createMessage('loyal2', 'msg4'),
        createMessage('onetime', 'msg5'),
      ];
      
      const metrics = analyzeChat(messages);
      // 2 out of 3 users sent 2+ messages = 66%
      expect(metrics.userRetention).toBeGreaterThanOrEqual(60);
    });

    it('should extract top words excluding stop words', () => {
      const messages = [
        createMessage('user1', 'pokemon is great'),
        createMessage('user2', 'pokemon rules'),
        createMessage('user3', 'love pokemon'),
      ];
      
      const metrics = analyzeChat(messages);
      const pokemonWord = metrics.topWords.find(w => w.word === 'pokemon');
      expect(pokemonWord).toBeDefined();
      expect(pokemonWord!.count).toBe(3);
    });

    it('should detect Twitch emotes', () => {
      const messages = [
        createMessage('user1', 'KEKW that was funny'),
        createMessage('user2', 'PogChamp nice'),
        createMessage('user3', 'KEKW KEKW'),
      ];
      
      const metrics = analyzeChat(messages);
      const kekw = metrics.topEmotes.find(e => e.emote === 'KEKW');
      expect(kekw).toBeDefined();
      expect(kekw!.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('generateTimeSeries', () => {
    it('should return empty array for no messages', () => {
      const series = generateTimeSeries([]);
      expect(series).toEqual([]);
    });

    it('should group messages by time slots', () => {
      const now = Date.now();
      const messages = [
        { username: 'user1', message: 'hello', timestamp: now },
        { username: 'user2', message: 'world', timestamp: now + 1000 },
        { username: 'user3', message: 'test', timestamp: now + 120000 }, // 2 min later
      ];
      
      const series = generateTimeSeries(messages);
      expect(series.length).toBeGreaterThanOrEqual(1);
      expect(series[0].messages).toBeGreaterThanOrEqual(1);
    });

    it('should calculate sentiment per time slot', () => {
      const now = Date.now();
      const messages = [
        { username: 'user1', message: 'POG amazing! ❤️', timestamp: now },
        { username: 'user2', message: 'love it!', timestamp: now + 1000 },
      ];
      
      const series = generateTimeSeries(messages);
      expect(series[0].sentiment).toBeGreaterThan(0);
    });
  });

  describe('getActivityLabel', () => {
    it('should return correct labels', () => {
      expect(getActivityLabel('dead')).toContain('Sin actividad');
      expect(getActivityLabel('low')).toContain('Baja');
      expect(getActivityLabel('moderate')).toContain('Moderada');
      expect(getActivityLabel('high')).toContain('Alta');
      expect(getActivityLabel('explosive')).toContain('Explosiva');
    });
  });

  describe('getSentimentEmoji', () => {
    it('should return correct emojis', () => {
      expect(getSentimentEmoji('positive')).toBe('😊');
      expect(getSentimentEmoji('neutral')).toBe('😐');
      expect(getSentimentEmoji('negative')).toBe('😔');
    });
  });

  describe('calculateHealthScore', () => {
    it('should return score between 0 and 100', () => {
      const metrics: ChatMetrics = {
        totalMessages: 100,
        uniqueUsers: 20,
        messagesPerMinute: 5,
        avgWordsPerMessage: 4,
        sentiment: 'positive',
        sentimentScore: 0.5,
        sentimentIntensity: 50,
        engagementScore: 60,
        activityLevel: 'moderate',
        topUsers: [],
        topWords: [],
        topEmotes: [],
        isGrowing: true,
        peakActivity: 10,
        growthRate: 20,
        specialMood: null,
        chatVelocity: 0.5,
        userRetention: 50,
        responseRate: 40,
        peakHour: '20:00',
        dominantLanguage: 'es',
        spamScore: 10,
        diversityIndex: 0.3,
      };
      
      const score = calculateHealthScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should penalize high spam score', () => {
      const baseMetrics: ChatMetrics = {
        totalMessages: 100,
        uniqueUsers: 20,
        messagesPerMinute: 5,
        avgWordsPerMessage: 4,
        sentiment: 'neutral',
        sentimentScore: 0,
        sentimentIntensity: 50,
        engagementScore: 50,
        activityLevel: 'moderate',
        topUsers: [],
        topWords: [],
        topEmotes: [],
        isGrowing: false,
        peakActivity: 5,
        growthRate: 0,
        specialMood: null,
        chatVelocity: 0.5,
        userRetention: 50,
        responseRate: 40,
        peakHour: null,
        dominantLanguage: 'mixed',
        spamScore: 0,
        diversityIndex: 0.3,
      };
      
      const lowSpamScore = calculateHealthScore({ ...baseMetrics, spamScore: 10 });
      const highSpamScore = calculateHealthScore({ ...baseMetrics, spamScore: 80 });
      
      expect(lowSpamScore).toBeGreaterThan(highSpamScore);
    });
  });

  describe('getInsights', () => {
    it('should return success insight for high engagement', () => {
      const metrics: ChatMetrics = {
        totalMessages: 100,
        uniqueUsers: 20,
        messagesPerMinute: 5,
        avgWordsPerMessage: 4,
        sentiment: 'positive',
        sentimentScore: 0.5,
        sentimentIntensity: 50,
        engagementScore: 80, // High engagement
        activityLevel: 'high',
        topUsers: [],
        topWords: [],
        topEmotes: [],
        isGrowing: true,
        peakActivity: 10,
        growthRate: 40,
        specialMood: null,
        chatVelocity: 0.5,
        userRetention: 70,
        responseRate: 40,
        peakHour: '20:00',
        dominantLanguage: 'es',
        spamScore: 10,
        diversityIndex: 0.4,
      };
      
      const insights = getInsights(metrics);
      const successInsights = insights.filter(i => i.type === 'success');
      expect(successInsights.length).toBeGreaterThan(0);
    });

    it('should return warning for high spam', () => {
      const metrics: ChatMetrics = {
        totalMessages: 100,
        uniqueUsers: 5,
        messagesPerMinute: 5,
        avgWordsPerMessage: 2,
        sentiment: 'neutral',
        sentimentScore: 0,
        sentimentIntensity: 30,
        engagementScore: 30,
        activityLevel: 'moderate',
        topUsers: [],
        topWords: [],
        topEmotes: [],
        isGrowing: false,
        peakActivity: 5,
        growthRate: 0,
        specialMood: null,
        chatVelocity: 0.5,
        userRetention: 20,
        responseRate: 20,
        peakHour: null,
        dominantLanguage: 'mixed',
        spamScore: 50, // High spam (threshold is 40)
        diversityIndex: 0.1,
      };
      
      const insights = getInsights(metrics);
      const warningInsights = insights.filter(i => i.type === 'warning');
      // Check for spam or repetitive content warning
      expect(warningInsights.some(i => 
        i.message.toLowerCase().includes('spam') || 
        i.message.toLowerCase().includes('repetitivo')
      )).toBe(true);
    });
  });

  describe('generateSummary', () => {
    it('should generate summary for explosive activity', () => {
      const metrics: ChatMetrics = {
        totalMessages: 500,
        uniqueUsers: 100,
        messagesPerMinute: 25,
        avgWordsPerMessage: 4,
        sentiment: 'positive',
        sentimentScore: 0.6,
        sentimentIntensity: 70,
        engagementScore: 85,
        activityLevel: 'explosive',
        topUsers: [],
        topWords: [],
        topEmotes: [],
        isGrowing: true,
        peakActivity: 30,
        growthRate: 50,
        specialMood: 'hype',
        chatVelocity: 2,
        userRetention: 60,
        responseRate: 50,
        peakHour: '21:00',
        dominantLanguage: 'es',
        spamScore: 5,
        diversityIndex: 0.4,
      };
      
      const summary = generateSummary(metrics);
      expect(summary).toContain('EXPLOSIVA');
    });
  });

  describe('compareSessions', () => {
    it('should compare two sessions correctly', () => {
      const current: ChatMetrics = {
        totalMessages: 200,
        uniqueUsers: 50,
        messagesPerMinute: 10,
        avgWordsPerMessage: 4,
        sentiment: 'positive',
        sentimentScore: 0.5,
        sentimentIntensity: 60,
        engagementScore: 70,
        activityLevel: 'high',
        topUsers: [],
        topWords: [],
        topEmotes: [],
        isGrowing: true,
        peakActivity: 15,
        growthRate: 30,
        specialMood: null,
        chatVelocity: 1,
        userRetention: 55,
        responseRate: 45,
        peakHour: '20:00',
        dominantLanguage: 'es',
        spamScore: 10,
        diversityIndex: 0.35,
      };
      
      const previous: ChatMetrics = {
        ...current,
        messagesPerMinute: 5,
        engagementScore: 50,
        uniqueUsers: 30,
        sentimentScore: 0.2,
      };
      
      const comparison = compareSessions(current, previous);
      
      expect(comparison.length).toBe(4);
      expect(comparison.find(c => c.metric === 'Mensajes/min')?.improved).toBe(true);
      expect(comparison.find(c => c.metric === 'Engagement')?.improved).toBe(true);
    });
  });
});
