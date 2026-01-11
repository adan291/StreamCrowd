import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { useStreamElements } from '../../hooks/useStreamElements';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

export function StreamElementsConfig() {
  const { t } = useI18n();
  const {
    isConnected,
    isConnecting,
    connectionStatus,
    channelId,
    error,
    tips,
    follows,
    subscriptions,
    raids,
    setJWTToken,
    validateToken,
    connect,
    disconnect,
    testAlert,
    getPoints,
    addPoints,
  } = useStreamElements();

  const [jwtToken, setJwtTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [pointsUsername, setPointsUsername] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [userPoints, setUserPoints] = useState<number | null>(null);

  const handleValidateAndConnect = async () => {
    if (!jwtToken) return;
    
    setIsValidating(true);
    setJWTToken(jwtToken);
    
    try {
      const valid = await validateToken();
      if (valid) {
        await connect();
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleGetPoints = async () => {
    if (!pointsUsername) return;
    const result = await getPoints(pointsUsername);
    if (result) {
      setUserPoints(result.points);
    }
  };

  const handleAddPoints = async () => {
    if (!pointsUsername || !pointsAmount) return;
    const amount = parseInt(pointsAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    
    const result = await addPoints(pointsUsername, amount);
    if (result) {
      setUserPoints(result.points);
      setPointsAmount('');
    }
  };

  return (
    <div className="streamelements-config">
      <div className="config-section">
        <div className="section-header">
          <h3>⚡ StreamElements</h3>
          <ConnectionStatusBadge status={connectionStatus} />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="config-form">
          <div className="form-group">
            <label>JWT Token</label>
            <div className="secret-input">
              <input
                type={showToken ? 'text' : 'password'}
                value={jwtToken}
                onChange={(e) => setJwtTokenInput(e.target.value)}
                placeholder="Tu JWT Token de StreamElements"
              />
              <button
                type="button"
                className="toggle-secret"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="help-text">
              Obtén tu token en streamelements.com → Dashboard → Account → Show secrets
            </p>
          </div>

          <div className="button-group">
            {!isConnected ? (
              <button
                onClick={handleValidateAndConnect}
                disabled={!jwtToken || isConnecting || isValidating}
                className="btn-primary"
              >
                {isValidating ? 'Validando...' : isConnecting ? 'Conectando...' : 'Conectar'}
              </button>
            ) : (
              <button onClick={disconnect} className="btn-danger">
                Desconectar
              </button>
            )}
          </div>

          {channelId && (
            <p className="channel-info">
              Canal conectado: <strong>{channelId}</strong>
            </p>
          )}
        </div>
      </div>

      {isConnected && (
        <>
          <div className="config-section">
            <h4>🎯 Sistema de Puntos</h4>
            <div className="points-form">
              <input
                type="text"
                value={pointsUsername}
                onChange={(e) => setPointsUsername(e.target.value)}
                placeholder="Username"
              />
              <button onClick={handleGetPoints} className="btn-small">
                Consultar
              </button>
              <input
                type="number"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                placeholder="Cantidad"
                min="1"
              />
              <button onClick={handleAddPoints} className="btn-small">
                Añadir
              </button>
            </div>
            {userPoints !== null && (
              <p className="points-result">
                {pointsUsername}: <strong>{userPoints.toLocaleString()}</strong> puntos
              </p>
            )}
          </div>

          <div className="config-section">
            <h4>🧪 Probar Alertas</h4>
            <div className="button-group">
              <button onClick={() => testAlert('tip')} className="btn-small">💰 Tip</button>
              <button onClick={() => testAlert('follow')} className="btn-small">❤️ Follow</button>
              <button onClick={() => testAlert('subscriber')} className="btn-small">⭐ Sub</button>
              <button onClick={() => testAlert('cheer')} className="btn-small">💎 Cheer</button>
            </div>
          </div>

          <div className="config-section">
            <h4>📋 Eventos Recientes</h4>
            <div className="events-list">
              {tips.slice(0, 3).map((tip) => (
                <div key={tip._id} className="event-item">
                  <span className="event-icon">💰</span>
                  <span className="event-user">{tip.username}</span>
                  <span className="event-amount">{tip.amount} {tip.currency}</span>
                </div>
              ))}
              {follows.slice(0, 3).map((f) => (
                <div key={f._id} className="event-item">
                  <span className="event-icon">❤️</span>
                  <span className="event-user">{f.username}</span>
                </div>
              ))}
              {subscriptions.slice(0, 3).map((s) => (
                <div key={s._id} className="event-item">
                  <span className="event-icon">⭐</span>
                  <span className="event-user">{s.username}</span>
                  <span className="event-months">{s.months} meses</span>
                </div>
              ))}
              {raids.slice(0, 3).map((r) => (
                <div key={r._id} className="event-item">
                  <span className="event-icon">🚀</span>
                  <span className="event-user">{r.username}</span>
                  <span className="event-viewers">{r.viewers} viewers</span>
                </div>
              ))}
              {tips.length === 0 && follows.length === 0 && subscriptions.length === 0 && raids.length === 0 && (
                <p className="no-events">No hay eventos recientes</p>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .streamelements-config {
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

        .section-header h3 { margin: 0; font-size: 1rem; }
        h4 { margin: 0 0 0.75rem 0; font-size: 0.875rem; color: var(--text-secondary, #888); }

        .error-message {
          background: var(--error-bg, #3b1a1a);
          color: var(--error-color, #ef4444);
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .config-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-size: 0.875rem; color: var(--text-secondary, #888); }
        .form-group input {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color, #333);
          border-radius: 0.375rem;
          background: var(--bg-primary, #0a0a0a);
          color: var(--text-primary, #fff);
          font-size: 0.875rem;
        }

        .help-text { font-size: 0.75rem; color: var(--text-secondary, #666); margin: 0; }
        .channel-info { font-size: 0.875rem; color: var(--text-secondary, #888); margin: 0.5rem 0 0 0; }

        .secret-input { display: flex; gap: 0.5rem; }
        .secret-input input { flex: 1; }
        .toggle-secret {
          padding: 0.5rem;
          background: var(--bg-hover, #2a2a2a);
          border: 1px solid var(--border-color, #333);
          border-radius: 0.375rem;
          cursor: pointer;
        }

        .button-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }

        .btn-primary, .btn-danger, .btn-small {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .btn-primary { background: var(--primary-color, #6366f1); color: white; }
        .btn-danger { background: var(--error-color, #ef4444); color: white; }
        .btn-small { padding: 0.375rem 0.75rem; background: var(--bg-hover, #2a2a2a); color: var(--text-primary, #fff); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .points-form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .points-form input { padding: 0.375rem 0.5rem; width: 120px; }
        .points-result { margin: 0.5rem 0 0 0; font-size: 0.875rem; }

        .events-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 150px; overflow-y: auto; }
        .event-item {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem; background: var(--bg-primary, #0a0a0a);
          border-radius: 0.375rem; font-size: 0.875rem;
        }
        .event-icon { font-size: 1rem; }
        .event-user { font-weight: 500; }
        .event-amount { color: var(--success-color, #22c55e); font-weight: 600; }
        .no-events { color: var(--text-secondary, #888); font-size: 0.875rem; text-align: center; padding: 1rem; }
      `}</style>
    </div>
  );
}
