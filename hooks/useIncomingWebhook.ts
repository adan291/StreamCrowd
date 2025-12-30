// useIncomingWebhook - Hook for managing incoming webhook configuration

import { useState, useEffect, useCallback } from 'react';
import {
  IncomingWebhookConfig,
  IncomingWebhookLog,
  IncomingCommandType,
} from '../types/webhooks';
import { webhookService } from '../src/application/services/WebhookService';
import { webhookStorageService } from '../src/application/services/WebhookStorageService';

interface UseIncomingWebhookReturn {
  config: IncomingWebhookConfig | null;
  logs: IncomingWebhookLog[];
  loading: boolean;
  error: string | null;
  updateConfig: (updates: Partial<IncomingWebhookConfig>) => Promise<void>;
  regenerateSecret: () => Promise<string>;
  toggleEnabled: () => Promise<void>;
  setAllowedCommands: (commands: IncomingCommandType[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useIncomingWebhook(): UseIncomingWebhookReturn {
  const [config, setConfig] = useState<IncomingWebhookConfig | null>(null);
  const [logs, setLogs] = useState<IncomingWebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await webhookService.init();
      const configData = webhookService.getIncomingConfig();
      const logsData = await webhookStorageService.getIncomingLogs(100);

      setConfig(configData);
      setLogs(logsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateConfig = useCallback(async (updates: Partial<IncomingWebhookConfig>): Promise<void> => {
    try {
      const updated = await webhookService.updateIncomingConfig(updates);
      setConfig(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update config';
      setError(message);
      throw err;
    }
  }, []);

  const regenerateSecret = useCallback(async (): Promise<string> => {
    try {
      const newSecret = await webhookService.regenerateIncomingSecret();
      await loadData(); // Refresh to get updated config
      return newSecret;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate secret';
      setError(message);
      throw err;
    }
  }, [loadData]);

  const toggleEnabled = useCallback(async (): Promise<void> => {
    if (!config) return;
    await updateConfig({ enabled: !config.enabled });
  }, [config, updateConfig]);

  const setAllowedCommands = useCallback(async (commands: IncomingCommandType[]): Promise<void> => {
    await updateConfig({ allowedCommands: commands });
  }, [updateConfig]);

  return {
    config,
    logs,
    loading,
    error,
    updateConfig,
    regenerateSecret,
    toggleEnabled,
    setAllowedCommands,
    refresh: loadData,
  };
}
