// IncomingWebhookPanel - UI for configuring incoming webhooks

import React, { useState } from 'react';
import { useIncomingWebhook } from '../../hooks/useIncomingWebhook';
import { IncomingCommandType } from '../../types/webhooks';

const ALL_COMMANDS: { type: IncomingCommandType; label: string; description: string }[] = [
  { type: 'send_chat_message', label: 'Enviar Mensaje', description: 'Envía un mensaje al chat' },
  { type: 'change_scene', label: 'Cambiar Escena', description: 'Cambia la escena de OBS' },
  { type: 'start_poll', label: 'Iniciar Poll', description: 'Crea una nueva encuesta' },
  { type: 'start_prediction', label: 'Iniciar Predicción', description: 'Crea una nueva predicción' },
  { type: 'execute_macro', label: 'Ejecutar Macro', description: 'Ejecuta una macro por ID' },
];

export const IncomingWebhookPanel: React.FC = () => {
  const {
    config,
    logs,
    loading,
    error,
    updateConfig,
    regenerateSecret,
    toggleEnabled,
    setAllowedCommands,
  } = useIncomingWebhook();

  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const handleCopySecret = async () => {
    if (config?.secret) {
      await navigator.clipboard.writeText(config.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyEndpoint = async () => {
    if (config?.endpoint) {
      const fullUrl = `${window.location.origin}${config.endpoint}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    }
  };

  const handleRegenerateSecret = async () => {
    if (confirm('¿Regenerar secret? El anterior dejará de funcionar inmediatamente.')) {
      await regenerateSecret();
    }
  };

  const toggleCommand = async (command: IncomingCommandType) => {
    if (!config) return;
    
    const newCommands = config.allowedCommands.includes(command)
      ? config.allowedCommands.filter(c => c !== command)
      : [...config.allowedCommands, command];
    
    await setAllowedCommands(newCommands);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="p-4 text-center">Cargando configuración...</div>;
  }

  if (!config) {
    return <div className="p-4 text-center text-red-400">Error cargando configuración</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Webhook Incoming</h2>
        <button
          onClick={toggleEnabled}
          className={`px-4 py-2 rounded ${
            config.enabled
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-600 hover:bg-gray-500'
          }`}
        >
          {config.enabled ? '✓ Activado' : 'Desactivado'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Endpoint Info */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3">Endpoint</h3>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-gray-900 rounded text-sm font-mono truncate">
                {window.location.origin}{config.endpoint}
              </code>
              <button
                onClick={handleCopyEndpoint}
                className="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
              >
                {copiedEndpoint ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400">Secret</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-gray-900 rounded text-sm font-mono">
                {config.secret.substring(0, 8)}...{config.secret.substring(config.secret.length - 8)}
              </code>
              <button
                onClick={handleCopySecret}
                className="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
              >
                {copiedSecret ? '✓ Copiado' : 'Copiar'}
              </button>
              <button
                onClick={handleRegenerateSecret}
                className="px-3 py-2 bg-yellow-600 rounded hover:bg-yellow-700 text-sm"
              >
                Regenerar
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400">Rate Limit</label>
            <div className="mt-1 text-sm">
              {config.rateLimitPerMinute} requests/minuto por IP
            </div>
          </div>
        </div>
      </div>

      {/* Allowed Commands */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3">Comandos Permitidos</h3>
        
        <div className="space-y-2">
          {ALL_COMMANDS.map(cmd => (
            <label
              key={cmd.type}
              className="flex items-start gap-3 p-2 rounded hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={config.allowedCommands.includes(cmd.type)}
                onChange={() => toggleCommand(cmd.type)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{cmd.label}</div>
                <div className="text-sm text-gray-400">{cmd.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3">Instrucciones de Uso</h3>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-purple-400">Request Format</h4>
            <pre className="mt-2 p-3 bg-gray-900 rounded overflow-x-auto">
{`POST ${config.endpoint}
Content-Type: application/json
X-Webhook-Signature: sha256=<signature>
X-Webhook-Timestamp: <unix_timestamp>

{
  "command": "send_chat_message",
  "params": { "message": "Hello!" },
  "timestamp": 1234567890,
  "nonce": "unique_id"
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-purple-400">Signature Calculation</h4>
            <pre className="mt-2 p-3 bg-gray-900 rounded overflow-x-auto text-xs">
{`// Node.js
const crypto = require('crypto');
const timestamp = Math.floor(Date.now() / 1000);
const payload = JSON.stringify(body);
const message = \`\${timestamp}.\${payload}\`;
const signature = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(message)
  .digest('hex');`}
            </pre>
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Logs Recientes</h3>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            {showLogs ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {showLogs && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No hay logs recientes
              </div>
            ) : (
              logs.slice(0, 20).map(log => (
                <div
                  key={log.id}
                  className={`p-2 rounded text-sm ${
                    log.success ? 'bg-green-900/30' : 'bg-red-900/30'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{log.command}</span>
                    <span className="text-xs text-gray-400">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  {log.error && (
                    <div className="text-xs text-red-400 mt-1">{log.error}</div>
                  )}
                  <div className="text-xs text-gray-500">IP: {log.ip}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomingWebhookPanel;
