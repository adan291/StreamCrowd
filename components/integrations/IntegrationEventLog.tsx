import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { useIntegrationEvents } from '../../hooks/useIntegrationEvents';
import type { IntegrationProvider, IntegrationEventType } from '../../types/integrations';

const EVENT_ICONS: Record<IntegrationEventType, string> = {
  donation: '💰',
  tip: '💵',
  follow: '❤️',
  subscription: '⭐',
  raid: '🚀',
  cheer: '💎',
  host: '📺',
  bits: '💎',
};

export function IntegrationEventLog() {
  const { t } = useI18n();
  const { events, stats, filters, setFilters, clearFilters, clearEvents, exportEvents } = useIntegrationEvents();
  
  const [providerFilter, setProviderFilter] = useState<IntegrationProvider | ''>('');
  const [typeFilter, setTypeFilter] = useState<IntegrationEventType | ''>('');

  const handleProviderChange = (value: string) => {
    setProviderFilter(value as IntegrationProvider | '');
    setFilters({
      ...filters,
      provider: value ? (value as IntegrationProvider) : undefined,
    });
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value as IntegrationEventType | '');
    setFilters({
      ...filters,
      type: value ? (value as IntegrationEventType) : undefined,
    });
  };

  const handleExport = () => {
    const data = exportEvents();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integration-events-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="event-log">
      <div className="log-header">
        <div className="stats-row">
          <span className="stat">📊 Total: {stats.totalEvents}</span>
          <span className="stat">💰 Donaciones: {stats.totalDonations}</span>
          <span className="stat">💵 Total: ${stats.totalAmount.toFixed(2)}</span>
        </div>
        
        <div className="filters-row">
          <select value={providerFilter} onChange={(e) => handleProviderChange(e.target.value)}>
            <option value="">Todos los proveedores</option>
            <option value="streamlabs">Streamlabs</option>
            <option value="streamelements">StreamElements</option>
          </select>
          
          <select value={typeFilter} onChange={(e) => handleTypeChange(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="donation">Donaciones</option>
            <option value="tip">Tips</option>
            <option value="follow">Follows</option>
            <option value="subscription">Subs</option>
            <option value="raid">Raids</option>
            <option value="cheer">Cheers</option>
          </select>
          
          <button onClick={clearFilters} className="btn-small">Limpiar filtros</button>
          <button onClick={handleExport} className="btn-small">📥 Exportar</button>
          <button onClick={clearEvents} className="btn-small btn-danger">🗑️ Limpiar</button>
        </div>
      </div>

      <div className="events-container">
        {events.length === 0 ? (
          <div className="empty-state">
            <p>📭 No hay eventos que mostrar</p>
            <p className="hint">Los eventos aparecerán aquí cuando se conecten las integraciones</p>
          </div>
        ) : (
          <div className="events-list">
            {events.map((event) => (
              <div key={event.id} className={`event-row ${event.processed ? 'processed' : ''}`}>
                <span className="event-icon">{EVENT_ICONS[event.type]}</span>
                <span className="event-provider">{event.provider}</span>
                <span className="event-type">{event.type}</span>
                <span className="event-user">{event.data.username}</span>
                {event.data.amount !== undefined && (
                  <span className="event-amount">
                    {event.data.currency || '$'}{event.data.amount}
                  </span>
                )}
                {event.data.message && (
                  <span className="event-message" title={event.data.message}>
                    {event.data.message.slice(0, 50)}
                    {event.data.message.length > 50 ? '...' : ''}
                  </span>
                )}
                <span className="event-time">
                  {event.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .event-log {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          height: 100%;
        }

        .log-header {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .stats-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .stat {
          font-size: 0.875rem;
          color: var(--text-secondary, #888);
        }

        .filters-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .filters-row select {
          padding: 0.375rem 0.5rem;
          border: 1px solid var(--border-color, #333);
          border-radius: 0.375rem;
          background: var(--bg-secondary, #1a1a1a);
          color: var(--text-primary, #fff);
          font-size: 0.75rem;
        }

        .btn-small {
          padding: 0.375rem 0.75rem;
          border: none;
          border-radius: 0.375rem;
          background: var(--bg-hover, #2a2a2a);
          color: var(--text-primary, #fff);
          cursor: pointer;
          font-size: 0.75rem;
        }

        .btn-small.btn-danger {
          background: var(--error-color, #ef4444);
        }

        .events-container {
          flex: 1;
          overflow-y: auto;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 0.5rem;
          padding: 0.5rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--text-secondary, #888);
        }

        .empty-state p { margin: 0.25rem 0; }
        .empty-state .hint { font-size: 0.75rem; }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .event-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-primary, #0a0a0a);
          border-radius: 0.375rem;
          font-size: 0.75rem;
        }

        .event-row.processed {
          opacity: 0.6;
        }

        .event-icon { font-size: 1rem; }
        .event-provider {
          padding: 0.125rem 0.375rem;
          background: var(--bg-hover, #2a2a2a);
          border-radius: 0.25rem;
          font-size: 0.625rem;
          text-transform: uppercase;
        }
        .event-type { color: var(--text-secondary, #888); }
        .event-user { font-weight: 500; }
        .event-amount { color: var(--success-color, #22c55e); font-weight: 600; }
        .event-message {
          color: var(--text-secondary, #666);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .event-time {
          color: var(--text-secondary, #666);
          font-size: 0.625rem;
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}
