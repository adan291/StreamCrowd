// Indicador de estado de conexión
import React, { useState } from 'react';
import { useCollaborationContext } from '../../context/CollaborationContext';
import { ConnectionState } from '../../types/collaboration';

export interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

const STATUS_CONFIG: Record<ConnectionState, {
  color: string;
  bgColor: string;
  label: string;
  icon: string;
}> = {
  connected: {
    color: 'text-green-400',
    bgColor: 'bg-green-500',
    label: 'Conectado',
    icon: '●'
  },
  connecting: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500',
    label: 'Conectando...',
    icon: '◐'
  },
  reconnecting: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500',
    label: 'Reconectando...',
    icon: '◐'
  },
  disconnected: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500',
    label: 'Desconectado',
    icon: '○'
  },
  error: {
    color: 'text-red-400',
    bgColor: 'bg-red-500',
    label: 'Error',
    icon: '✕'
  }
};

export function ConnectionStatus({ 
  className = '', 
  showDetails = false 
}: ConnectionStatusProps) {
  const { connectionInfo, requestSync } = useCollaborationContext();
  const [showTooltip, setShowTooltip] = useState(false);

  const config = STATUS_CONFIG[connectionInfo.state];

  // Format latency
  const formatLatency = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 100) return `${ms}ms (excelente)`;
    if (ms < 300) return `${ms}ms (bueno)`;
    if (ms < 500) return `${ms}ms (regular)`;
    return `${ms}ms (lento)`;
  };

  // Format time
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Handle reconnect
  const handleReconnect = () => {
    requestSync();
  };

  // Simple indicator (default)
  if (!showDetails) {
    return (
      <div 
        className={`relative inline-flex items-center gap-1.5 ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={`text-sm ${config.color} animate-pulse`}>
          {config.icon}
        </span>
        <span className={`text-xs ${config.color}`}>
          {config.label}
        </span>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute top-full left-0 mt-1 bg-gray-900 rounded p-2 
                        shadow-lg z-10 whitespace-nowrap text-xs">
            <p className="text-gray-300">
              Latencia: {formatLatency(connectionInfo.latency)}
            </p>
            {connectionInfo.reconnectAttempts > 0 && (
              <p className="text-yellow-400 mt-1">
                Intentos de reconexión: {connectionInfo.reconnectAttempts}
              </p>
            )}
            {connectionInfo.error && (
              <p className="text-red-400 mt-1">
                Error: {connectionInfo.error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`bg-gray-700/50 rounded p-3 ${className}`}>
      {/* Status header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${config.bgColor} ${
            connectionInfo.state === 'connecting' || connectionInfo.state === 'reconnecting'
              ? 'animate-pulse'
              : ''
          }`} />
          <span className={`font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>

        {(connectionInfo.state === 'disconnected' || connectionInfo.state === 'error') && (
          <button
            onClick={handleReconnect}
            className="text-xs bg-purple-600 hover:bg-purple-700 text-white 
                     px-2 py-1 rounded transition-colors"
          >
            Reconectar
          </button>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Latencia:</span>
          <span className="text-gray-300">
            {formatLatency(connectionInfo.latency)}
          </span>
        </div>

        {connectionInfo.lastConnectedAt && (
          <div className="flex justify-between">
            <span className="text-gray-400">Última conexión:</span>
            <span className="text-gray-300">
              {formatTime(connectionInfo.lastConnectedAt)}
            </span>
          </div>
        )}

        {connectionInfo.reconnectAttempts > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Intentos reconexión:</span>
            <span className="text-yellow-400">
              {connectionInfo.reconnectAttempts}
            </span>
          </div>
        )}

        {connectionInfo.error && (
          <div className="mt-2 p-2 bg-red-900/30 rounded">
            <p className="text-red-400">
              {connectionInfo.error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
