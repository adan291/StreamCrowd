// useWebhookLogs - Hook for viewing webhook delivery logs

import { useState, useEffect, useCallback } from 'react';
import {
  WebhookDelivery,
  WebhookStats,
  WebhookDeliveryStatus,
} from '../types/webhooks';
import { webhookService } from '../src/application/services/WebhookService';

interface UseWebhookLogsReturn {
  deliveries: WebhookDelivery[];
  stats: WebhookStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  retryDelivery: (deliveryId: string) => Promise<WebhookDelivery>;
  filterByStatus: (status: WebhookDeliveryStatus | 'all') => void;
  filteredDeliveries: WebhookDelivery[];
  hasRepeatedFailures: boolean;
}

export function useWebhookLogs(webhookId: string): UseWebhookLogsReturn {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WebhookDeliveryStatus | 'all'>('all');

  const loadData = useCallback(async () => {
    if (!webhookId) return;

    try {
      setLoading(true);
      setError(null);

      const [deliveriesData, statsData] = await Promise.all([
        webhookService.getDeliveries(webhookId, 100),
        webhookService.getWebhookStats(webhookId),
      ]);

      setDeliveries(deliveriesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [webhookId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const retryDelivery = useCallback(async (deliveryId: string): Promise<WebhookDelivery> => {
    try {
      const result = await webhookService.retryDelivery(deliveryId);
      // Refresh data after retry
      await loadData();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry delivery';
      setError(message);
      throw err;
    }
  }, [loadData]);

  const filterByStatus = useCallback((status: WebhookDeliveryStatus | 'all') => {
    setStatusFilter(status);
  }, []);

  const filteredDeliveries = statusFilter === 'all'
    ? deliveries
    : deliveries.filter(d => d.status === statusFilter);

  // Check for repeated failures (3+ consecutive failures)
  const hasRepeatedFailures = (() => {
    if (deliveries.length < 3) return false;
    
    const recent = deliveries.slice(0, 3);
    return recent.every(d => d.status === 'failed');
  })();

  return {
    deliveries,
    stats,
    loading,
    error,
    refresh: loadData,
    retryDelivery,
    filterByStatus,
    filteredDeliveries,
    hasRepeatedFailures,
  };
}
