import React from 'react';
import type { ConnectionStatus } from '../../types/integrations';

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus | null;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  if (!status) {
    return (
      <span className="status-badge disconnected">
        ⚫ Desconectado
      </span>
    );
  }

  const { connected, reconnecting, error, latency } = status;

  let className = 'status-badge ';
  let icon = '⚫';
  let text = 'Desconectado';

  if (connected) {
    className += 'connected';
    icon = '🟢';
    text = latency ? `Conectado (${latency}ms)` : 'Conectado';
  } else if (reconnecting) {
    className += 'reconnecting';
    icon = '🟡';
    text = 'Reconectando...';
  } else if (error) {
    className += 'error';
    icon = '🔴';
    text = 'Error';
  } else {
    className += 'disconnected';
  }

  return (
    <span className={className} title={error || undefined}>
      {icon} {text}
      <style>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge.connected {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .status-badge.reconnecting {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .status-badge.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .status-badge.disconnected {
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        }
      `}</style>
    </span>
  );
}
