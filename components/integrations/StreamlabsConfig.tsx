import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStreamlabs } from '../../hooks/useStreamlabs';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

export function StreamlabsConfig() {
  const { t } = useTranslation();
  const {
    isConnected,
    isConnecting,
    connectionStatus,
    error,
    donations,
    follows,
    subscriptions,
    connect,
    disconnect,
    testAlert,
    setConfig,
    getAuthUrl,
  } = useStreamlabs();

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const handleSaveConfig = () => {
    setConfig({
      clientId,
      clientSecret,
      redirectUri: `${window.location.origin}/auth/streamlabs/callback`,
    });
  };

  const handleConnect = async () => {
    const authUrl = getAuthUrl();
    if (authUrl) {
      window.open(authUrl, '_blank', 'width=600,height=700');
    }
  };

  return (
    <div className="streamlabs-config">
      <div className="config-section">
        <div className="section-header">
          <h3>🎬 Streamlabs</h3>
          <ConnectionStatusBadge status={connectionStatus} />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="config-form">
          <div className="form-group">
            <label>{t('integrations.clientId', 'Client ID')}</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Tu Client ID de Streamlabs"
            />
          </div>

          <div className="form-group">
            <label>{t('integrations.clientSecret', 'Client Secret')}</label>
            <div className="secret-input">
              <input
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Tu Client Secret"
              />
              <button
                type="button"
                className="toggle-secret"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="button-group">
            <button onClick={handleSaveConfig} className="btn-secondary">
              {t('common.save', 'Guardar')}
            </button>
            
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={!clientId || !clientSecret || isConnecting}
                className="btn-primary"
              >
                {isConnecting ? t('common.connecting', 'Conectando...') : t('integrations.connect', 'Conectar con Streamlabs')}
              </button>
            ) : (
              <button onClick={disconnect} className="btn-danger">
                {t('integrations.disconnect', 'Desconectar')}
              </button>
            )}
          </div>
        </div>
      </div>

      {isConnected && (
        <>
          <div className="config-section">
            <h4>{t('integrations.testAlerts', 'Probar Alertas')}</h4>
            <div className="button-group">
              <button onClick={() => testAlert('donation')} className="btn-small">
                💰 Donación
              </button>
              <button onClick={() => testAlert('follow')} className="btn-small">
                ❤️ Follow
              </button>
              <button onClick={() => testAlert('subscription')} className="btn-small">
                ⭐ Sub
              </button>
            </div>
          </div>

          <div className="config-section">
            <h4>{t('integrations.recentEvents', 'Eventos Recientes')}</h4>
            <div className="events-list">
              {donations.slice(0, 5).map((d) => (
                <div key={d.id} className="event-item donation">
                  <span className="event-icon">💰</span>
                  <span className="event-user">{d.name}</span>
                  <span className="event-amount">{d.formattedAmount}</span>
                  {d.message && <span className="event-message">{d.message}</span>}
                </div>
              ))}
              {follows.slice(0, 5).map((f) => (
                <div key={f.id} className="event-item follow">
                  <span className="event-icon">❤️</span>
                  <span className="event-user">{f.name}</span>
                  <span className="event-type">nuevo follow</span>
                </div>
              ))}
              {subscriptions.slice(0, 5).map((s) => (
                <div key={s.id} className="event-item subscription">
                  <span className="event-icon">⭐</span>
                  <span className="event-user">{s.name}</span>
                  <span className="event-months">{s.months} meses</span>
                </div>
              ))}
              {donations.length === 0 && follows.length === 0 && subscriptions.length === 0 && (
                <p className="no-events">{t('integrations.noEvents', 'No hay eventos recientes')}</p>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .streamlabs-config {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .config-section {
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1rem;
        }

        .error-message {
          background: var(--error-bg, #3b1a1a);
          color: var(--error-color, #ef4444);
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .config-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          color: var(--text-secondary, #888);
        }

        .form-group input {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color, #333);
          border-radius: 0.375rem;
          background: var(--bg-primary, #0a0a0a);
          color: var(--text-primary, #fff);
          font-size: 0.875rem;
        }

        .secret-input {
          display: flex;
          gap: 0.5rem;
        }

        .secret-input input {
          flex: 1;
        }

        .toggle-secret {
          padding: 0.5rem;
          background: var(--bg-hover, #2a2a2a);
          border: 1px solid var(--border-color, #333);
          border-radius: 0.375rem;
          cursor: pointer;
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-primary, .btn-secondary, .btn-danger, .btn-small {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          transition: opacity 0.2s;
        }

        .btn-primary {
          background: var(--primary-color, #6366f1);
          color: white;
        }

        .btn-secondary {
          background: var(--bg-hover, #2a2a2a);
          color: var(--text-primary, #fff);
        }

        .btn-danger {
          background: var(--error-color, #ef4444);
          color: white;
        }

        .btn-small {
          padding: 0.375rem 0.75rem;
          background: var(--bg-hover, #2a2a2a);
          color: var(--text-primary, #fff);
        }

        .btn-primary:disabled, .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .event-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-primary, #0a0a0a);
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .event-icon {
          font-size: 1rem;
        }

        .event-user {
          font-weight: 500;
        }

        .event-amount {
          color: var(--success-color, #22c55e);
          font-weight: 600;
        }

        .event-message {
          color: var(--text-secondary, #888);
          font-size: 0.75rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 150px;
        }

        .no-events {
          color: var(--text-secondary, #888);
          font-size: 0.875rem;
          text-align: center;
          padding: 1rem;
        }

        h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          color: var(--text-secondary, #888);
        }
      `}</style>
    </div>
  );
}
