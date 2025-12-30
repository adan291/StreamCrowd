// OBS Export Panel - Panel principal de exportación a OBS
import React, { useState, useCallback, useEffect } from 'react';
import { SourceCreatorPanel } from './SourceCreatorPanel';
import { SceneManagerPanel } from './SceneManagerPanel';
import { TemplateLibrary } from './TemplateLibrary';
import { ConfigSyncPanel } from './ConfigSyncPanel';

type TabId = 'sources' | 'scenes' | 'templates' | 'sync';

interface OBSExportPanelProps {
  obsWebSocket: any;
  isConnected?: boolean;
  onClose?: () => void;
}

interface OperationLog {
  id: string;
  timestamp: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const OBSExportPanel: React.FC<OBSExportPanelProps> = ({
  obsWebSocket,
  isConnected = false,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('sources');
  const [dryRunMode, setDryRunMode] = useState(false);
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Check OBS connection
  useEffect(() => {
    const checkConnection = async () => {
      if (!obsWebSocket) {
        setConnectionStatus('disconnected');
        return;
      }
      try {
        await obsWebSocket.call('GetVersion');
        setConnectionStatus('connected');
      } catch {
        setConnectionStatus('disconnected');
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [obsWebSocket]);

  const addLog = useCallback((type: OperationLog['type'], message: string) => {
    const log: OperationLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      message
    };
    setOperationLogs(prev => [log, ...prev].slice(0, 100));
  }, []);

  const clearLogs = useCallback(() => {
    setOperationLogs([]);
  }, []);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'sources', label: 'Fuentes', icon: '📦' },
    { id: 'scenes', label: 'Escenas', icon: '🎬' },
    { id: 'templates', label: 'Plantillas', icon: '📋' },
    { id: 'sync', label: 'Sincronización', icon: '🔄' }
  ];

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="obs-export-panel">
      <div className="panel-header">
        <div className="header-left">
          <h2>Exportación a OBS</h2>
          <div className={`connection-status ${connectionStatus}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {connectionStatus === 'connected' && 'Conectado'}
              {connectionStatus === 'disconnected' && 'Desconectado'}
              {connectionStatus === 'checking' && 'Verificando...'}
            </span>
          </div>
        </div>
        <div className="header-right">
          <label className="dry-run-toggle">
            <input
              type="checkbox"
              checked={dryRunMode}
              onChange={(e) => setDryRunMode(e.target.checked)}
            />
            <span>Modo prueba</span>
          </label>
          <button
            className={`log-toggle ${showLogs ? 'active' : ''}`}
            onClick={() => setShowLogs(!showLogs)}
            title="Ver registro de operaciones"
          >
            📜 {operationLogs.length > 0 && <span className="log-count">{operationLogs.length}</span>}
          </button>
          {onClose && (
            <button className="close-btn" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      {connectionStatus === 'disconnected' && (
        <div className="connection-warning">
          ⚠️ No hay conexión con OBS. Conecta OBS WebSocket para usar estas funciones.
        </div>
      )}

      <div className="tabs-container">
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-content">
        {activeTab === 'sources' && (
          <SourceCreatorPanel
            obsWebSocket={obsWebSocket}
            onSourceCreated={(name) => addLog('success', `Fuente "${name}" creada`)}
          />
        )}
        {activeTab === 'scenes' && (
          <SceneManagerPanel
            obsWebSocket={obsWebSocket}
            onSceneSelected={(name) => addLog('info', `Escena "${name}" seleccionada`)}
          />
        )}
        {activeTab === 'templates' && (
          <TemplateLibrary
            obsWebSocket={obsWebSocket}
            onTemplateApplied={(name) => addLog('success', `Plantilla "${name}" aplicada`)}
          />
        )}
        {activeTab === 'sync' && (
          <ConfigSyncPanel obsWebSocket={obsWebSocket} />
        )}
      </div>

      {showLogs && (
        <div className="logs-panel">
          <div className="logs-header">
            <h4>Registro de operaciones</h4>
            <button onClick={clearLogs} className="clear-logs-btn">Limpiar</button>
          </div>
          <div className="logs-list">
            {operationLogs.length === 0 ? (
              <p className="no-logs">No hay operaciones registradas</p>
            ) : (
              operationLogs.map(log => (
                <div key={log.id} className={`log-entry ${log.type}`}>
                  <span className="log-time">{formatTime(log.timestamp)}</span>
                  <span className="log-icon">
                    {log.type === 'success' && '✅'}
                    {log.type === 'error' && '❌'}
                    {log.type === 'info' && 'ℹ️'}
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {dryRunMode && (
        <div className="dry-run-banner">
          🧪 Modo prueba activo - Las operaciones no se ejecutarán realmente
        </div>
      )}

      <style>{`
        .obs-export-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary, #0f0f1a);
          color: var(--text-primary, #fff);
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: var(--bg-secondary, #1a1a2e);
          border-bottom: 1px solid var(--border-color, #333);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .panel-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }
        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
        }
        .connection-status.connected {
          background: rgba(0, 200, 83, 0.1);
          color: #00c853;
        }
        .connection-status.disconnected {
          background: rgba(255, 82, 82, 0.1);
          color: #ff5252;
        }
        .connection-status.checking {
          background: rgba(255, 193, 7, 0.1);
          color: #ffc107;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .dry-run-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-secondary, #aaa);
        }
        .dry-run-toggle input {
          cursor: pointer;
        }
        .log-toggle {
          position: relative;
          padding: 0.5rem;
          background: transparent;
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        .log-toggle.active {
          background: var(--accent-color, #9147ff);
          border-color: var(--accent-color, #9147ff);
        }
        .log-count {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ff5252;
          color: white;
          font-size: 0.625rem;
          padding: 0.125rem 0.375rem;
          border-radius: 10px;
          min-width: 16px;
          text-align: center;
        }
        .close-btn {
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: var(--text-secondary, #aaa);
          cursor: pointer;
          font-size: 1.25rem;
        }
        .close-btn:hover {
          color: var(--text-primary, #fff);
        }
        .connection-warning {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 193, 7, 0.1);
          border-bottom: 1px solid rgba(255, 193, 7, 0.3);
          color: #ffc107;
          font-size: 0.875rem;
        }
        .tabs-container {
          background: var(--bg-secondary, #1a1a2e);
          padding: 0 1rem;
        }
        .tabs {
          display: flex;
          gap: 0.25rem;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary, #aaa);
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab:hover {
          color: var(--text-primary, #fff);
        }
        .tab.active {
          color: var(--accent-color, #9147ff);
          border-bottom-color: var(--accent-color, #9147ff);
        }
        .tab-icon {
          font-size: 1rem;
        }
        .tab-label {
          font-size: 0.875rem;
        }
        .panel-content {
          flex: 1;
          overflow: auto;
          padding: 1rem;
        }
        .logs-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 200px;
          background: var(--bg-secondary, #1a1a2e);
          border-top: 1px solid var(--border-color, #333);
          display: flex;
          flex-direction: column;
        }
        .logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          border-bottom: 1px solid var(--border-color, #333);
        }
        .logs-header h4 {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary, #aaa);
        }
        .clear-logs-btn {
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-secondary, #aaa);
          cursor: pointer;
          font-size: 0.75rem;
        }
        .logs-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .no-logs {
          text-align: center;
          color: var(--text-muted, #666);
          padding: 1rem;
        }
        .log-entry {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8125rem;
        }
        .log-entry.success { background: rgba(0, 200, 83, 0.05); }
        .log-entry.error { background: rgba(255, 82, 82, 0.05); }
        .log-entry.info { background: rgba(100, 181, 246, 0.05); }
        .log-time {
          color: var(--text-muted, #666);
          font-size: 0.75rem;
          min-width: 60px;
        }
        .log-icon { font-size: 0.875rem; }
        .log-message { color: var(--text-primary, #fff); }
        .dry-run-banner {
          padding: 0.5rem 1rem;
          background: rgba(255, 193, 7, 0.2);
          color: #ffc107;
          text-align: center;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default OBSExportPanel;
