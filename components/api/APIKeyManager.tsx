// API Key Manager - UI para gestionar API Keys
import React, { useState, useCallback } from 'react';
import { useAPIKeys } from '../../hooks/useAPIKeys';
import { APIScope } from '../../types/api';
import { SCOPE_DEFINITIONS, getScopesByCategory } from '../../src/api/middleware/auth';

interface APIKeyManagerProps {
  onClose?: () => void;
}

export const APIKeyManager: React.FC<APIKeyManagerProps> = ({ onClose }) => {
  const {
    keys,
    loading,
    error,
    createKey,
    revokeKey,
    deleteKey,
    updateKey,
    getUsageStats,
    refresh
  } = useAPIKeys();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<APIScope[]>([]);
  const [rateLimit, setRateLimit] = useState(60);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [keyStats, setKeyStats] = useState<any>(null);

  const scopesByCategory = getScopesByCategory();

  const handleCreate = useCallback(async () => {
    if (!newKeyName.trim() || selectedScopes.length === 0) return;

    try {
      const result = await createKey({
        name: newKeyName,
        scopes: selectedScopes,
        rateLimit
      });
      setCreatedKey(result.key);
      setNewKeyName('');
      setSelectedScopes([]);
      setRateLimit(60);
    } catch (err) {
      // Error handled by hook
    }
  }, [newKeyName, selectedScopes, rateLimit, createKey]);

  const handleCopyKey = useCallback(async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }, [createdKey]);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setCreatedKey(null);
    setCopiedKey(false);
  }, []);

  const handleToggleScope = useCallback((scope: APIScope) => {
    setSelectedScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  }, []);

  const handleViewStats = useCallback(async (keyId: string) => {
    setSelectedKeyId(keyId);
    const stats = getUsageStats(keyId);
    setKeyStats(stats);
  }, [getUsageStats]);

  const handleRevoke = useCallback(async (keyId: string) => {
    if (!confirm('¿Revocar esta API Key? No podrá ser usada después.')) return;
    await revokeKey(keyId);
  }, [revokeKey]);

  const handleDelete = useCallback(async (keyId: string) => {
    if (!confirm('¿Eliminar esta API Key permanentemente?')) return;
    await deleteKey(keyId);
    if (selectedKeyId === keyId) {
      setSelectedKeyId(null);
      setKeyStats(null);
    }
  }, [deleteKey, selectedKeyId]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="api-key-manager">
      <div className="manager-header">
        <h2>API Keys</h2>
        <div className="header-actions">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            + Nueva API Key
          </button>
          <button onClick={refresh} className="btn-icon" title="Actualizar">
            🔄
          </button>
          {onClose && (
            <button onClick={onClose} className="btn-icon">✕</button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">{error.message}</div>
      )}

      <div className="keys-container">
        <div className="keys-list">
          {loading ? (
            <div className="loading">Cargando...</div>
          ) : keys.length === 0 ? (
            <div className="empty-state">
              <p>No hay API Keys creadas</p>
              <button onClick={() => setShowCreateModal(true)} className="btn-secondary">
                Crear primera API Key
              </button>
            </div>
          ) : (
            keys.map(key => (
              <div
                key={key.id}
                className={`key-card ${selectedKeyId === key.id ? 'selected' : ''} ${!key.enabled ? 'disabled' : ''}`}
                onClick={() => handleViewStats(key.id)}
              >
                <div className="key-info">
                  <div className="key-name">
                    {key.name}
                    {!key.enabled && <span className="revoked-badge">Revocada</span>}
                  </div>
                  <div className="key-prefix">
                    <code>{key.keyPrefix}...</code>
                  </div>
                  <div className="key-meta">
                    <span>Creada: {formatDate(key.createdAt)}</span>
                    <span>Último uso: {formatDate(key.lastUsedAt)}</span>
                  </div>
                  <div className="key-scopes">
                    {key.scopes.slice(0, 3).map(scope => (
                      <span key={scope} className="scope-badge">{scope}</span>
                    ))}
                    {key.scopes.length > 3 && (
                      <span className="scope-badge more">+{key.scopes.length - 3}</span>
                    )}
                  </div>
                </div>
                <div className="key-actions">
                  {key.enabled && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRevoke(key.id); }}
                      className="btn-small danger"
                      title="Revocar"
                    >
                      🚫
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(key.id); }}
                    className="btn-small danger"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedKeyId && keyStats && (
          <div className="key-details">
            <h3>Estadísticas de uso</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{keyStats.totalRequests}</span>
                <span className="stat-label">Total requests</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{keyStats.requestsToday}</span>
                <span className="stat-label">Hoy</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{keyStats.requestsThisWeek}</span>
                <span className="stat-label">Esta semana</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{(keyStats.errorRate * 100).toFixed(1)}%</span>
                <span className="stat-label">Tasa de error</span>
              </div>
            </div>
            {keyStats.topEndpoints.length > 0 && (
              <div className="top-endpoints">
                <h4>Endpoints más usados</h4>
                <ul>
                  {keyStats.topEndpoints.map((ep: any) => (
                    <li key={ep.endpoint}>
                      <code>{ep.endpoint}</code>
                      <span>{ep.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {createdKey ? (
              <>
                <h3>✅ API Key creada</h3>
                <p className="warning-text">
                  ⚠️ Guarda esta key ahora. No podrás verla de nuevo.
                </p>
                <div className="key-display">
                  <code>{createdKey}</code>
                  <button onClick={handleCopyKey} className="btn-copy">
                    {copiedKey ? '✓ Copiada' : '📋 Copiar'}
                  </button>
                </div>
                <button onClick={handleCloseCreateModal} className="btn-primary full-width">
                  Entendido
                </button>
              </>
            ) : (
              <>
                <h3>Nueva API Key</h3>
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="Mi aplicación"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Rate Limit (requests/minuto)</label>
                  <input
                    type="number"
                    value={rateLimit}
                    onChange={e => setRateLimit(parseInt(e.target.value) || 60)}
                    min={1}
                    max={1000}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Permisos</label>
                  <div className="scopes-selector">
                    {Object.entries(scopesByCategory).map(([category, scopes]) => (
                      <div key={category} className="scope-category">
                        <h4>{category}</h4>
                        {scopes.map(scope => (
                          <label key={scope} className="scope-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedScopes.includes(scope)}
                              onChange={() => handleToggleScope(scope)}
                            />
                            <span className="scope-name">{scope}</span>
                            <span className="scope-desc">
                              {SCOPE_DEFINITIONS[scope]?.description}
                            </span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={handleCloseCreateModal} className="btn-secondary">
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    className="btn-primary"
                    disabled={!newKeyName.trim() || selectedScopes.length === 0}
                  >
                    Crear API Key
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .api-key-manager {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary, #0f0f1a);
          color: var(--text-primary, #fff);
        }
        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color, #333);
        }
        .manager-header h2 { margin: 0; }
        .header-actions { display: flex; gap: 0.5rem; }
        .keys-container {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .keys-list {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }
        .key-card {
          display: flex;
          justify-content: space-between;
          padding: 1rem;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .key-card:hover { border-color: var(--accent-color, #9147ff); }
        .key-card.selected { border-color: var(--accent-color, #9147ff); background: rgba(145, 71, 255, 0.1); }
        .key-card.disabled { opacity: 0.6; }
        .key-info { flex: 1; }
        .key-name {
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .revoked-badge {
          background: #ff4444;
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.625rem;
        }
        .key-prefix {
          margin: 0.25rem 0;
          color: var(--text-muted, #666);
        }
        .key-prefix code {
          background: var(--bg-tertiary, #16213e);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }
        .key-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: var(--text-muted, #666);
          margin: 0.5rem 0;
        }
        .key-scopes { display: flex; gap: 0.25rem; flex-wrap: wrap; }
        .scope-badge {
          background: rgba(145, 71, 255, 0.2);
          color: var(--accent-color, #9147ff);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.625rem;
        }
        .scope-badge.more { background: var(--bg-tertiary, #16213e); color: var(--text-muted, #666); }
        .key-actions { display: flex; gap: 0.25rem; align-items: flex-start; }
        .key-details {
          width: 300px;
          padding: 1rem;
          border-left: 1px solid var(--border-color, #333);
          overflow-y: auto;
        }
        .key-details h3 { margin: 0 0 1rem; font-size: 1rem; }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .stat-item {
          background: var(--bg-secondary, #1a1a2e);
          padding: 0.75rem;
          border-radius: 8px;
          text-align: center;
        }
        .stat-value { display: block; font-size: 1.5rem; font-weight: bold; }
        .stat-label { font-size: 0.75rem; color: var(--text-muted, #666); }
        .top-endpoints { margin-top: 1rem; }
        .top-endpoints h4 { margin: 0 0 0.5rem; font-size: 0.875rem; color: var(--text-secondary, #aaa); }
        .top-endpoints ul { list-style: none; padding: 0; margin: 0; }
        .top-endpoints li {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 4px;
          margin-bottom: 0.25rem;
          font-size: 0.75rem;
        }
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted, #666);
        }
        .loading { text-align: center; padding: 2rem; }
        .error-banner {
          padding: 0.75rem 1rem;
          background: rgba(255, 0, 0, 0.1);
          border-bottom: 1px solid rgba(255, 0, 0, 0.3);
          color: #ff6b6b;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          padding: 1.5rem;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }
        .modal-content h3 { margin: 0 0 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; }
        .form-input {
          width: 100%;
          padding: 0.5rem;
          background: var(--bg-tertiary, #16213e);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
        }
        .scopes-selector { max-height: 300px; overflow-y: auto; }
        .scope-category { margin-bottom: 1rem; }
        .scope-category h4 { margin: 0 0 0.5rem; font-size: 0.875rem; color: var(--accent-color, #9147ff); }
        .scope-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-tertiary, #16213e);
          border-radius: 4px;
          margin-bottom: 0.25rem;
          cursor: pointer;
        }
        .scope-checkbox input { margin-top: 0.25rem; }
        .scope-name { font-weight: 500; }
        .scope-desc { font-size: 0.75rem; color: var(--text-muted, #666); }
        .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
        .warning-text { color: #ffc107; font-size: 0.875rem; margin-bottom: 1rem; }
        .key-display {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .key-display code {
          flex: 1;
          padding: 0.75rem;
          background: var(--bg-tertiary, #16213e);
          border-radius: 4px;
          word-break: break-all;
          font-size: 0.75rem;
        }
        .btn-copy {
          padding: 0.5rem 1rem;
          background: var(--accent-color, #9147ff);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-primary {
          padding: 0.5rem 1rem;
          background: var(--accent-color, #9147ff);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary {
          padding: 0.5rem 1rem;
          background: var(--bg-tertiary, #16213e);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          cursor: pointer;
        }
        .btn-small {
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          opacity: 0.7;
        }
        .btn-small:hover { opacity: 1; }
        .btn-small.danger:hover { color: #ff6b6b; }
        .btn-icon {
          padding: 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 1rem;
        }
        .full-width { width: 100%; }
      `}</style>
    </div>
  );
};

export default APIKeyManager;
