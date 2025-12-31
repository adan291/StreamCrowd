// WebhookConfigPanel - UI for managing outgoing webhooks

import React, { useState } from 'react';
import { useWebhooks } from '../../hooks/useWebhooks';
import {
  WebhookConfig,
  WebhookEventType,
} from '../../types/webhooks';

const ALL_EVENTS: { type: WebhookEventType; label: string }[] = [
  { type: 'follower', label: 'Nuevo Follower' },
  { type: 'raid', label: 'Raid' },
  { type: 'subscription', label: 'Suscripción' },
  { type: 'bits', label: 'Bits' },
  { type: 'poll_started', label: 'Poll Iniciado' },
  { type: 'poll_ended', label: 'Poll Finalizado' },
  { type: 'prediction_started', label: 'Predicción Iniciada' },
  { type: 'prediction_resolved', label: 'Predicción Resuelta' },
  { type: 'giveaway_winner', label: 'Ganador Sorteo' },
  { type: 'macro_executed', label: 'Macro Ejecutada' },
];

interface WebhookFormData {
  name: string;
  url: string;
  enabled: boolean;
  events: WebhookEventType[];
}

export const WebhookConfigPanel: React.FC = () => {
  const {
    webhooks,
    loading,
    error,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    regenerateSecret,
  } = useWebhooks();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WebhookFormData>({
    name: '',
    url: '',
    enabled: true,
    events: [],
  });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ name: '', url: '', enabled: true, events: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setFormData({
      name: webhook.name,
      url: webhook.url,
      enabled: webhook.enabled,
      events: webhook.events,
    });
    setEditingId(webhook.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateWebhook(editingId, formData);
      } else {
        await createWebhook(formData);
      }
      resetForm();
    } catch (err) {
      // Error is handled by hook
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await testWebhook(id);
    } finally {
      setTestingId(null);
    }
  };

  const handleCopySecret = async (webhook: WebhookConfig) => {
    await navigator.clipboard.writeText(webhook.secret);
    setCopiedId(webhook.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerateSecret = async (id: string) => {
    if (confirm('¿Regenerar secret? El anterior dejará de funcionar inmediatamente.')) {
      await regenerateSecret(id);
    }
  };

  const toggleEvent = (event: WebhookEventType) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const getStatusColor = (webhook: WebhookConfig) => {
    if (!webhook.enabled) return 'bg-gray-500';
    if (webhook.failureCount >= 3) return 'bg-red-500';
    if (webhook.failureCount > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = (webhook: WebhookConfig) => {
    if (!webhook.enabled) return 'Desactivado';
    if (webhook.failureCount >= 3) return 'Error';
    if (webhook.failureCount > 0) return 'Advertencia';
    return 'Activo';
  };

  if (loading) {
    return <div className="p-4 text-center">Cargando webhooks...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Webhooks Outgoing</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          + Nuevo Webhook
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Webhook List */}
      <div className="space-y-3">
        {webhooks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No hay webhooks configurados
          </div>
        ) : (
          webhooks.map(webhook => (
            <div
              key={webhook.id}
              className="p-4 bg-gray-800 rounded-lg border border-gray-700"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(webhook)}`} />
                    <h3 className="font-semibold">{webhook.name}</h3>
                    <span className="text-xs text-gray-400">
                      {getStatusText(webhook)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 truncate">{webhook.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {webhook.events.map(event => (
                      <span
                        key={event}
                        className="px-2 py-0.5 text-xs bg-gray-700 rounded"
                      >
                        {ALL_EVENTS.find(e => e.type === event)?.label || event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTest(webhook.id)}
                    disabled={testingId === webhook.id}
                    className="px-3 py-1 text-sm bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {testingId === webhook.id ? 'Enviando...' : 'Test'}
                  </button>
                  <button
                    onClick={() => handleEdit(webhook)}
                    className="px-3 py-1 text-sm bg-gray-600 rounded hover:bg-gray-500"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="px-3 py-1 text-sm bg-red-600 rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Secret Section */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Secret:</span>
                  <code className="text-xs bg-gray-900 px-2 py-1 rounded font-mono">
                    {webhook.secret.substring(0, 8)}...{webhook.secret.substring(webhook.secret.length - 8)}
                  </code>
                  <button
                    onClick={() => handleCopySecret(webhook)}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    {copiedId === webhook.id ? '✓ Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={() => handleRegenerateSecret(webhook.id)}
                    className="text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    Regenerar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? 'Editar Webhook' : 'Nuevo Webhook'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-1">URL (HTTPS)</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                  pattern="https://.*"
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span className="text-sm">Activado</span>
                </label>
              </div>

              <div>
                <label className="block text-sm mb-2">Eventos</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_EVENTS.map(event => (
                    <label key={event.type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event.type)}
                        onChange={() => toggleEvent(event.type)}
                      />
                      <span className="text-sm">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
                >
                  {editingId ? 'Guardar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookConfigPanel;
