// Config Sync Panel - Sincronización y backups de configuración OBS
import React, { useState, useCallback, useRef } from 'react';
import { useConfigSync } from '../../hooks/useConfigSync';
import { BackupInfo, OBSConfig, Conflict, Resolution } from '../../types/obs-export';

interface ConfigSyncPanelProps {
  obsWebSocket: any;
}

export const ConfigSyncPanel: React.FC<ConfigSyncPanelProps> = ({ obsWebSocket }) => {
  const {
    backups,
    currentDiff,
    conflicts,
    loading,
    syncing,
    error,
    exportConfig,
    importConfig,
    createBackup,
    restoreBackup,
    deleteBackup,
    detectChanges,
    detectConflicts,
    resolveConflict,
    downloadConfig,
    refresh
  } = useConfigSync(obsWebSocket);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importedConfig, setImportedConfig] = useState<OBSConfig | null>(null);
  const [backupDescription, setBackupDescription] = useState('');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(async () => {
    try {
      const config = await exportConfig();
      downloadConfig(config, `obs-config-${new Date().toISOString().split('T')[0]}.json`);
    } catch (err) {
      // Error handled by hook
    }
  }, [exportConfig, downloadConfig]);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const config = JSON.parse(event.target?.result as string) as OBSConfig;
        setImportedConfig(config);
        
        // Check for conflicts
        const detectedConflicts = await detectConflicts(config);
        if (detectedConflicts.length > 0) {
          setSelectedConflict(detectedConflicts[0]);
        }
        
        setShowImportModal(true);
      } catch (err) {
        alert('Invalid configuration file');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [detectConflicts]);

  const handleImport = useCallback(async () => {
    if (!importedConfig) return;

    try {
      await importConfig(importedConfig, {
        replaceExisting: true,
        createBackup: true
      });
      setShowImportModal(false);
      setImportedConfig(null);
    } catch (err) {
      // Error handled by hook
    }
  }, [importedConfig, importConfig]);

  const handleCreateBackup = useCallback(async () => {
    try {
      await createBackup(backupDescription || undefined);
      setBackupDescription('');
      setShowBackupModal(false);
    } catch (err) {
      // Error handled by hook
    }
  }, [backupDescription, createBackup]);

  const handleRestore = useCallback(async (backup: BackupInfo) => {
    if (!confirm(`Restore backup from ${new Date(backup.createdAt).toLocaleString()}? Current configuration will be backed up first.`)) {
      return;
    }
    try {
      await restoreBackup(backup.id);
    } catch (err) {
      // Error handled by hook
    }
  }, [restoreBackup]);

  const handleDeleteBackup = useCallback(async (backup: BackupInfo) => {
    if (!confirm(`Delete this backup? This cannot be undone.`)) return;
    try {
      await deleteBackup(backup.id);
    } catch (err) {
      // Error handled by hook
    }
  }, [deleteBackup]);

  const handleResolveConflict = useCallback((resolution: Resolution) => {
    if (!importedConfig || !selectedConflict) return;
    
    const resolved = resolveConflict(importedConfig, selectedConflict, resolution);
    setImportedConfig(resolved);
    
    // Move to next conflict or clear
    const remainingConflicts = conflicts.filter(c => c.item !== selectedConflict.item);
    if (remainingConflicts.length > 0) {
      setSelectedConflict(remainingConflicts[0]);
    } else {
      setSelectedConflict(null);
    }
  }, [importedConfig, selectedConflict, conflicts, resolveConflict]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="config-sync-panel">
      <div className="panel-header">
        <h3>Configuration Sync</h3>
        <button onClick={refresh} className="btn-icon" title="Refresh" disabled={loading}>
          🔄
        </button>
      </div>

      <div className="sync-actions">
        <button onClick={handleExport} className="btn-action" disabled={syncing}>
          <span className="icon">📤</span>
          <span className="label">Export Config</span>
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="btn-action" disabled={syncing}>
          <span className="icon">📥</span>
          <span className="label">Import Config</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
      </div>

      <div className="backups-section">
        <div className="section-header">
          <h4>Backups</h4>
          <button onClick={() => setShowBackupModal(true)} className="btn-small">
            + New Backup
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading backups...</div>
        ) : backups.length === 0 ? (
          <p className="empty-message">No backups yet. Create one to save your current configuration.</p>
        ) : (
          <ul className="backups-list">
            {backups.map((backup) => (
              <li key={backup.id} className="backup-item">
                <div className="backup-info">
                  <span className="backup-description">
                    {backup.description}
                    {backup.automatic && <span className="auto-badge">Auto</span>}
                  </span>
                  <span className="backup-meta">
                    {formatRelativeTime(backup.createdAt)} • {backup.sceneCount} scenes, {backup.sourceCount} sources
                  </span>
                </div>
                <div className="backup-actions">
                  <button
                    onClick={() => handleRestore(backup)}
                    className="btn-small"
                    title="Restore this backup"
                    disabled={syncing}
                  >
                    ↩️ Restore
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup)}
                    className="btn-small danger"
                    title="Delete backup"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div className="error-message">{error.message}</div>
      )}

      {syncing && (
        <div className="sync-indicator">
          <span className="spinner"></span>
          Syncing...
        </div>
      )}

      {/* Backup Modal */}
      {showBackupModal && (
        <div className="modal-overlay" onClick={() => setShowBackupModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h4>Create Backup</h4>
            <input
              type="text"
              value={backupDescription}
              onChange={(e) => setBackupDescription(e.target.value)}
              placeholder="Backup description (optional)"
              className="form-input"
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowBackupModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateBackup} className="btn-primary">Create Backup</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && importedConfig && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Import Configuration</h4>
            
            <div className="import-preview">
              <p>This configuration contains:</p>
              <ul>
                <li>{importedConfig.scenes.length} scenes</li>
                <li>{importedConfig.sources.length} sources</li>
                <li>{importedConfig.transitions?.length || 0} transitions</li>
              </ul>
              <p className="import-date">
                Exported: {formatDate(importedConfig.exportedAt)}
              </p>
            </div>

            {selectedConflict && (
              <div className="conflict-section">
                <h5>⚠️ Conflict Detected</h5>
                <p>{selectedConflict.details}</p>
                <div className="conflict-actions">
                  {selectedConflict.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleResolveConflict(suggestion)}
                      className="btn-small"
                    >
                      {suggestion.description}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!selectedConflict && (
              <div className="import-warning">
                <p>⚠️ A backup of your current configuration will be created before importing.</p>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowImportModal(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleImport}
                className="btn-primary"
                disabled={!!selectedConflict || syncing}
              >
                {syncing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .config-sync-panel {
          padding: 1rem;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 8px;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .panel-header h3 {
          margin: 0;
          color: var(--text-primary, #fff);
        }
        .sync-actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .btn-action {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--bg-tertiary, #16213e);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-action:hover:not(:disabled) {
          border-color: var(--accent-color, #9147ff);
        }
        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-action .icon {
          font-size: 1.5rem;
        }
        .btn-action .label {
          font-size: 0.875rem;
        }
        .backups-section {
          margin-top: 1rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .section-header h4 {
          margin: 0;
          color: var(--text-secondary, #aaa);
          font-size: 0.875rem;
        }
        .backups-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .backup-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--bg-tertiary, #16213e);
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }
        .backup-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .backup-description {
          color: var(--text-primary, #fff);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .auto-badge {
          background: rgba(116, 185, 255, 0.2);
          color: #74b9ff;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.625rem;
        }
        .backup-meta {
          color: var(--text-muted, #666);
          font-size: 0.75rem;
        }
        .backup-actions {
          display: flex;
          gap: 0.25rem;
        }
        .btn-icon {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 4px;
          background: transparent;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-small {
          padding: 0.25rem 0.5rem;
          border: none;
          border-radius: 4px;
          background: var(--bg-tertiary, #16213e);
          color: var(--text-secondary, #aaa);
          cursor: pointer;
          font-size: 0.75rem;
          border: 1px solid var(--border-color, #333);
        }
        .btn-small:hover {
          border-color: var(--accent-color, #9147ff);
        }
        .btn-small.danger:hover {
          border-color: #ff6b6b;
          color: #ff6b6b;
        }
        .empty-message {
          color: var(--text-muted, #666);
          font-size: 0.875rem;
          text-align: center;
          padding: 1rem;
        }
        .loading {
          text-align: center;
          padding: 1rem;
          color: var(--text-muted, #666);
        }
        .error-message {
          padding: 0.75rem;
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 4px;
          color: #ff6b6b;
          margin-top: 1rem;
        }
        .sync-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(145, 71, 255, 0.1);
          border-radius: 4px;
          color: var(--accent-color, #9147ff);
          margin-top: 1rem;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
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
          border-radius: 8px;
          padding: 1.5rem;
          max-width: 400px;
          width: 90%;
        }
        .modal-content.small {
          max-width: 300px;
        }
        .modal-content h4 {
          margin: 0 0 1rem;
          color: var(--text-primary, #fff);
        }
        .form-input {
          width: 100%;
          padding: 0.5rem;
          background: var(--bg-tertiary, #16213e);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          margin-bottom: 1rem;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
        .btn-primary, .btn-secondary {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-primary {
          background: var(--accent-color, #9147ff);
          color: white;
        }
        .btn-secondary {
          background: var(--bg-tertiary, #16213e);
          color: var(--text-primary, #fff);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .import-preview {
          background: var(--bg-tertiary, #16213e);
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .import-preview p {
          margin: 0 0 0.5rem;
          color: var(--text-secondary, #aaa);
        }
        .import-preview ul {
          margin: 0;
          padding-left: 1.5rem;
          color: var(--text-primary, #fff);
        }
        .import-date {
          margin-top: 0.5rem !important;
          font-size: 0.75rem;
          color: var(--text-muted, #666) !important;
        }
        .conflict-section {
          background: rgba(255, 200, 0, 0.1);
          border: 1px solid rgba(255, 200, 0, 0.3);
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .conflict-section h5 {
          margin: 0 0 0.5rem;
          color: #ffc800;
        }
        .conflict-section p {
          margin: 0 0 0.75rem;
          color: var(--text-secondary, #aaa);
        }
        .conflict-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .import-warning {
          background: rgba(255, 200, 0, 0.1);
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .import-warning p {
          margin: 0;
          color: #ffc800;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default ConfigSyncPanel;
