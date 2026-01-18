import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineAI } from '../../hooks/useOfflineAI';
import { useSmartModerator } from '../../hooks/useSmartModerator';
import { useAdvancedOverlaySync } from '../../hooks/useAdvancedOverlaySync';
import { useIntelligentVoice } from '../../hooks/useIntelligentVoice';
import { usePerformanceOptimizer } from '../../hooks/usePerformanceOptimizer';

describe('Self-Sustained AI Hooks', () => {
  describe('useOfflineAI', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useOfflineAI());
      
      expect(result.current.analyzeSentiment).toBeDefined();
      expect(result.current.generateGameNarration).toBeDefined();
      expect(result.current.generateClipSuggestion).toBeDefined();
      expect(result.current.generateStreamSummary).toBeDefined();
    });

    it('should analyze sentiment correctly', () => {
      const { result } = renderHook(() => useOfflineAI());
      
      const positiveResult = result.current.analyzeSentiment('This is amazing! I love it!');
      expect(positiveResult.mood).toBe('hype');
      expect(positiveResult.confidence).toBeGreaterThan(0.1);
      
      const negativeResult = result.current.analyzeSentiment('This sucks and is awful terrible');
      expect(['toxic', 'calm']).toContain(negativeResult.mood);
      expect(negativeResult.confidence).toBeGreaterThan(0.1);
    });

    it('should generate game narration', () => {
      const { result } = renderHook(() => useOfflineAI());
      
      const narration = result.current.generateGameNarration('player wins casino roulette');
      expect(narration.speech).toBeDefined();
      expect(narration.speech.length).toBeGreaterThan(0);
      expect(narration.tone).toBeDefined();
      expect(narration.duration).toBeGreaterThan(0);
    });
  });

  describe('useSmartModerator', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSmartModerator());
      
      expect(result.current.moderateMessage).toBeDefined();
      expect(result.current.analyzeChatTrends).toBeDefined();
      expect(result.current.getProblematicUsers).toBeDefined();
      expect(result.current.moderationStats).toBeDefined();
    });

    it('should moderate messages correctly', async () => {
      const { result } = renderHook(() => useSmartModerator());
      
      const cleanMessage = await result.current.moderateMessage({
        id: '1',
        username: 'user1',
        message: 'Hello everyone!',
        timestamp: Date.now(),
        platform: 'twitch'
      });
      
      expect(cleanMessage.action).toBeDefined();
      expect(cleanMessage.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('useAdvancedOverlaySync', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAdvancedOverlaySync('test-channel'));
      
      expect(result.current.state).toBeDefined();
      expect(result.current.updateState).toBeDefined();
      expect(result.current.isOffline).toBeDefined();
      expect(result.current.addNotification).toBeDefined();
    });

    it('should update state correctly', async () => {
      const { result } = renderHook(() => useAdvancedOverlaySync('test-channel'));
      
      await act(async () => {
        await result.current.updateState({ theme: 'dark' });
      });
      
      expect(result.current.state.theme).toBe('dark');
    });
  });

  describe('useIntelligentVoice', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useIntelligentVoice());
      
      expect(result.current.speak).toBeDefined();
      expect(result.current.speakImmediate).toBeDefined();
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.queue).toEqual([]);
    });
  });

  describe('usePerformanceOptimizer', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePerformanceOptimizer());
      
      expect(result.current.metrics).toBeDefined();
      expect(result.current.optimizeComponent).toBeDefined();
      expect(result.current.debounce).toBeDefined();
      expect(result.current.throttle).toBeDefined();
      expect(result.current.getRecommendations).toBeDefined();
    });

    it('should provide performance recommendations', () => {
      const { result } = renderHook(() => usePerformanceOptimizer());
      
      const recommendations = result.current.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});