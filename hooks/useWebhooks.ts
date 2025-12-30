// useWebhooks - Hook for managing outgoing webhooks

import { useState, useEffect, useCallback } from 'react';
import {
  WebhookConfig,
  WebhookDelivery,
  WebhookStats,
  WebhookEventType,
} from '../types/webhooks';
import { webhookService } from '../src/application/services/WebhookService';

interface UseWebhooksReturn {
  webhooks: WebhookConfig[];
  loading: boolean;
  error: string | null;
  createWebhook: (config: CreateWebhookInput) => Promise<WebhookConfig>;
  updateWebhook: (id: string, updates: Partial<WebhookConfig>) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  testWebhook: (id: string) => Promise<WebhookDelivery>;
  regenerateSecret: (id: string) => Promise<string>;
  getDeliveries: (webhookId: string) => Promise<WebhookDelivery[]>;
  getStats: (webhookId: string) => Promise<WebhookStats>;
  retryDelivery: (deliveryId: string) => Promise<WebhookDelivery>;
  refresh: () => Promise<void>;
}

interface CreateWebhookInput {
  name: string;
  url: string;
  enabled: boolean;
  events: WebhookEventType[];
}

export function useWebhooks(): UseWebhooksReturn {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await webhookService.init();
      const data = await webhookService.getWebhooks();
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const createWebhook = useCallback(async (config: CreateWebhookInput): Promise<WebhookConfig> => {
    try {
      const webhook = await webhookService.createWebhook(config);
      setWebhooks(prev => [...prev, webhook]);
      return webhook;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create webhook';
      setError(message);
      throw err;
    }
  }, []);

  const updateWebhook = useCallback(async (id: string, updates: Partial<WebhookConfig>): Promise<void> => {
    try {
      const updated = await webhookService.updateWebhook(id, updates);
      if (updated) {
        setWebhooks(prev => prev.map(w => w.id === id ? updated : w));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update webhook';
      setError(message);
      throw err;
    }
  }, []);

  const deleteWebhook = useCallback(async (id: string): Promise<void> => {
    try {
      await webhookService.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete webhook';
      setError(message);
      throw err;
    }
  }, []);

  const testWebhook = useCallback(async (id: string): Promise<WebhookDelivery> => {
    try {
      return await webhookService.testWebhook(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test webhook';
      setError(message);
      throw err;
    }
  }, []);

  const regenerateSecret = useCallback(async (id: string): Promise<string> => {
    try {
      const newSecret = await webhookService.regenerateSecret(id);
      // Refresh to get updated webhook
      await loadWebhooks();
      return newSecret;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate secret';
      setError(message);
      throw err;
    }
  }, [loadWebhooks]);

  const getDeliveries = useCallback(async (webhookId: string): Promise<WebhookDelivery[]> => {
    return webhookService.getDeliveries(webhookId);
  }, []);

  const getStats = useCallback(async (webhookId: string): Promise<WebhookStats> => {
    return webhookService.getWebhookStats(webhookId);
  }, []);

  const retryDelivery = useCallback(async (deliveryId: string): Promise<WebhookDelivery> => {
    return webhookService.retryDelivery(deliveryId);
  }, []);

  return {
    webhooks,
    loading,
    error,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    regenerateSecret,
    getDeliveries,
    getStats,
    retryDelivery,
    refresh: loadWebhooks,
  };
}
