// useInsights - Hook for session insights

import { useState, useCallback } from 'react';
import { Insight } from '../types/metrics';
import { metricsService } from '../src/application/services/MetricsService';
import { sessionStorageService } from '../src/application/services/SessionStorageService';

interface UseInsightsReturn {
  insights: Insight[];
  isLoading: boolean;
  error: string | null;
  loadInsights: (sessionId: string) => Promise<void>;
  generateInsights: (sessionId: string) => Promise<void>;
  provideFeedback: (insightId: string, feedback: 'useful' | 'not_useful') => Promise<void>;
}

export function useInsights(): UseInsightsReturn {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing insights for a session
  const loadInsights = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await sessionStorageService.getInsightsBySession(sessionId);
      setInsights(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading insights');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate new insights for a session
  const generateInsights = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const generated = await metricsService.generateInsights(sessionId);
      
      // Save generated insights
      for (const insight of generated) {
        await sessionStorageService.saveInsight(insight);
      }

      setInsights(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating insights');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Provide feedback on an insight
  const provideFeedback = useCallback(async (insightId: string, feedback: 'useful' | 'not_useful') => {
    try {
      await sessionStorageService.updateInsightFeedback(insightId, feedback);
      
      setInsights(prev => prev.map(insight => 
        insight.id === insightId ? { ...insight, feedback } : insight
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving feedback');
    }
  }, []);

  return {
    insights,
    isLoading,
    error,
    loadInsights,
    generateInsights,
    provideFeedback,
  };
}
