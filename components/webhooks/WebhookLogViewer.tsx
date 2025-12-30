// WebhookLogViewer - UI for viewing webhook delivery logs

import React, { useState } from 'react';
import { useWebhookLogs } from '../../hooks/useWebhookLogs';
import { WebhookDeliveryStatus } from '../../types/webhooks';

interface WebhookLogViewerProps {
  webhookId: string;
  webhookName: string;
  onClose: () => void;
}

export const WebhookLogViewer: React.FC<WebhookLogViewerProps> = ({
  webhookId,
  webhookName,
  onClose,
}) => {
  const {
    filteredDeliveries,
    stats,
    loading,
    error,
    refresh,
    retryDelivery,
    filterByStatus,
    hasRepeatedFailures,
  } = useWebhookLogs(webhookId);

  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<WebhookDeliveryStatus | 'all'>('all');

  const handleFilterChange = (status: WebhookDeliveryStatus | 'all') => {
    setActiveFilter(status);
    filterByStatus(status);
  };

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      await retryDelivery(deliveryId);
    } finally {
      setRetryingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: WebhookDeliveryStatus) => {
    const styles = {
      success: 'bg-green-600',
      failed: 'bg-red-600',
      pending: 'bg-yellow-600',
    };
    const labels = {
      success: 'Éxito',
      failed: 'Fallido',
      pending: 'Pendiente',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Logs: {webhookName}</h3>
            {hasRepeatedFailures && (
              <div className="flex items-center gap-2 mt-1 text-red-400 text-sm">
                <span className="animate-pulse">⚠️</span>
                Fallos repetidos detectados
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="p-4 border-b border-gray-700 grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalSent}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.totalSuccess}</div>
              <div className="text-xs text-gray-400">Exitosos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.totalFailed}</div>
              <div className="text-xs text-gray-400">Fallidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.totalPending}</div>
              <div className="text-xs text-gray-400">Pendientes</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 border-b border-gray-700 flex gap-2">
          {(['all', 'success', 'failed', 'pending'] as const).map(status => (
            <button
              key={status}
              onClick={() => handleFilterChange(status)}
              className={`px-3 py-1 text-sm rounded ${
                activeFilter === status
                  ? 'bg-purple-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {status === 'all' ? 'Todos' : 
               status === 'success' ? 'Exitosos' :
               status === 'failed' ? 'Fallidos' : 'Pendientes'}
            </button>
          ))}
          <button
            onClick={refresh}
            className="ml-auto px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
          >
            🔄 Actualizar
          </button>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Cargando...</div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No hay entregas registradas
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDeliveries.map(delivery => (
                <div
                  key={delivery.id}
                  className="p-3 bg-gray-900 rounded border border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(delivery.status)}
                        <span className="text-sm font-medium">
                          {delivery.eventType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(delivery.createdAt)}
                        </span>
                      </div>
                      
                      {delivery.statusCode && (
                        <div className="text-xs text-gray-400 mt-1">
                          HTTP {delivery.statusCode}
                        </div>
                      )}
                      
                      {delivery.error && (
                        <div className="text-xs text-red-400 mt-1">
                          {delivery.error}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-1">
                        Intentos: {delivery.attempts}/3
                      </div>
                    </div>

                    {delivery.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(delivery.id)}
                        disabled={retryingId === delivery.id}
                        className="px-3 py-1 text-xs bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
                      >
                        {retryingId === delivery.id ? 'Reintentando...' : 'Reintentar'}
                      </button>
                    )}
                  </div>

                  {/* Expandable payload preview */}
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Ver payload
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-950 rounded text-xs overflow-x-auto">
                      {JSON.stringify(delivery.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebhookLogViewer;
