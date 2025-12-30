import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEventMappings } from '../../hooks/useEventMappings';
import type { IntegrationProvider, IntegrationEventType, MappedAction, EventFilters } from '../../types/integrations';

const EVENT_TYPES: IntegrationEventType[] = ['donation', 'tip', 'follow', 'subscription', 'raid', 'cheer'];
const ACTION_TYPES: MappedAction['type'][] = ['macro', 'notification', 'obs', 'webhook', 'sound'];

export function EventMappingEditor() {
  const { t } = useTranslation();
  const { mappings, createMapping, updateMapping, deleteMapping, toggleMapping, exportMappings, importMappings } = useEventMappings();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newMapping, setNewMapping] = useState({
    name: '',
    provider: 'streamlabs' as IntegrationProvider,
    eventType: 'donation' as IntegrationEventType,
    actionType: 'notification' as MappedAction['type'],
    minAmount: '',
    keywords: '',
  });

  const handleCreate = () => {
    const filters: EventFilters = {};
    if (newMapping.minAmount) {
      filters.minAmount = parseFloat(newMapping.minAmount);
    }
    if (newMapping.keywords) {
      filters.keywords = newMapping.keywords.split(',').map(k => k.trim());
    }

    const action: MappedAction = {
      type: newMapping.actionType,
    };

    if (newMapping.actionType === 'notification') {
      action.notificationConfig = {
        title: `Nuevo ${newMapping.eventType}`,
        message: '{username} - {amount}',
        channels: ['push'],
      };
    }

    createMapping(newMapping.name, newMapping.provider, newMapping.eventType, action, filters);
    setIsCreating(false);
    setNewMapping({
      name: '',
      provider: 'streamlabs',
      eventType: 'donation',
      actionType: 'notification',
      minAmount: '',
      keywords: '',
    });
  };

  const handleExport = () => {
    const data = exportMappings();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'event-mappings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        importMappings(text);
      }
    };
    input.click();
  };

  return (
    <div className="mapping-editor">
      <div className="editor-header">
        <h3>🔗 Mapeo de Eventos</h3>
        <div className="header-actions">
          <button onClick={() => setIsCreating(true)} className="btn-primary">+ Nuevo</button>
          <button onClick={handleExport} className="btn-small">📥 Exportar</button>
          <button onClick={handleImport} className="btn-small">📤 Importar</button>
        </div>
      </div>

      {isCreating && (
        <div className="create-form">
          <div className="form-row">
            <input
              type="text"
              placeholder="Nombre del mapeo"
              value={newMapping.name}
              onChange={(e) => setNewMapping({ ...newMapping, name: e.target.value })}
            />
          </div>
          <div className="form-row">
            <select
              value={newMapping.provider}
              onChange={(e) => setNewMapping({ ...newMapping, provider: e.target.value as IntegrationProvider })}
            >
              <option value="streamlabs">Streamlabs</option>
              <option value="streamelements">StreamElements</option>
            </select>
            <select
              value={newMapping.eventType}
              onChange={(e) => setNewMapping({ ...newMapping, eventType: e.target.value as IntegrationEventType })}
            >
              {EVENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={newMapping.actionType}
              onChange={(e) => setNewMapping({ ...newMapping, actionType: e.target.value as MappedAction['type'] })}
            >
              {ACTION_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <input
              type="number"
              placeholder="Monto mínimo"
              value={newMapping.minAmount}
              onChange={(e) => setNewMapping({ ...newMapping, minAmount: e.target.value })}
            />
            <input
              type="text"
              placeholder="Keywords (separadas por coma)"
              value={newMapping.keywords}
              onChange={(e) => setNewMapping({ ...newMapping, keywords: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button onClick={handleCreate} className="btn-primary" disabled={!newMapping.name}>
              Crear
            </button>
            <button onClick={() => setIsCreating(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mappings-list">
        {mappings.length === 0 ? (
          <div className="empty-state">
            <p>📭 No hay mapeos configurados</p>
            <p className="hint">Crea un mapeo para ejecutar acciones cuando ocurran eventos</p>
          </div>
        ) : (
          mappings.map((mapping) => (
            <div key={mapping.id} className={`mapping-card ${!mapping.enabled ? 'disabled' : ''}`}>
              <div className="mapping-header">
                <span className="mapping-name">{mapping.name}</span>
                <div className="mapping-badges">
                  <span className="badge provider">{mapping.provider}</span>
                  <span className="badge event">{mapping.eventType}</span>
                  <span className="badge action">{mapping.action.type}</span>
                </div>
              </div>
              <div className="mapping-filters">
                {mapping.filters.minAmount && <span>Min: ${mapping.filters.minAmount}</span>}
                {mapping.filters.keywords?.length && <span>Keywords: {mapping.filters.keywords.join(', ')}</span>}
              </div>
              <div className="mapping-actions">
                <button
                  onClick={() => toggleMapping(mapping.id)}
                  className={`btn-toggle ${mapping.enabled ? 'active' : ''}`}
                >
                  {mapping.enabled ? '✓ Activo' : '○ Inactivo'}
                </button>
                <button onClick={() => deleteMapping(mapping.id)} className="btn-delete">
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .mapping-editor { display: flex; flex-direction: column; gap: 1rem; }
        .editor-header { display: flex; justify-content: space-between; align-items: center; }
        .editor-header h3 { margin: 0; font-size: 1rem; }
        .header-actions { display: flex; gap: 0.5rem; }

        .btn-primary { padding: 0.5rem 1rem; background: var(--primary-color, #6366f1); color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; }
        .btn-secondary { padding: 0.5rem 1rem; background: var(--bg-hover, #2a2a2a); color: var(--text-primary, #fff); border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; }
        .btn-small { padding: 0.375rem 0.75rem; background: var(--bg-hover, #2a2a2a); color: var(--text-primary, #fff); border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .create-form { background: var(--bg-secondary, #1a1a1a); padding: 1rem; border-radius: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .form-row { display: flex; gap: 0.5rem; }
        .form-row input, .form-row select {
          flex: 1; padding: 0.5rem; border: 1px solid var(--border-color, #333);
          border-radius: 0.375rem; background: var(--bg-primary, #0a0a0a);
          color: var(--text-primary, #fff); font-size: 0.875rem;
        }
        .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }

        .mappings-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .empty-state { text-align: center; padding: 2rem; color: var(--text-secondary, #888); }
        .empty-state .hint { font-size: 0.75rem; }

        .mapping-card {
          background: var(--bg-secondary, #1a1a1a); padding: 0.75rem;
          border-radius: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;
        }
        .mapping-card.disabled { opacity: 0.6; }
        .mapping-header { display: flex; justify-content: space-between; align-items: center; }
        .mapping-name { font-weight: 500; }
        .mapping-badges { display: flex; gap: 0.25rem; }
        .badge {
          padding: 0.125rem 0.375rem; border-radius: 0.25rem;
          font-size: 0.625rem; text-transform: uppercase;
        }
        .badge.provider { background: rgba(99, 102, 241, 0.2); color: #6366f1; }
        .badge.event { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .badge.action { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }

        .mapping-filters { font-size: 0.75rem; color: var(--text-secondary, #888); display: flex; gap: 0.5rem; }
        .mapping-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
        .btn-toggle { padding: 0.25rem 0.5rem; border: 1px solid var(--border-color, #333); border-radius: 0.25rem; background: transparent; color: var(--text-secondary, #888); cursor: pointer; font-size: 0.75rem; }
        .btn-toggle.active { border-color: var(--success-color, #22c55e); color: var(--success-color, #22c55e); }
        .btn-delete { padding: 0.25rem 0.5rem; border: none; background: transparent; cursor: pointer; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
