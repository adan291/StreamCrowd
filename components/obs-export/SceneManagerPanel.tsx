// Scene Manager Panel - Gestión de escenas OBS
import React, { useState, useCallback } from 'react';
import { useOBSScenes } from '../../hooks/useOBSScenes';
import { SceneInfo, SceneItem } from '../../types/obs-export';

interface SceneManagerPanelProps {
  obsWebSocket: any;
  onSceneSelected?: (sceneName: string) => void;
}

export const SceneManagerPanel: React.FC<SceneManagerPanelProps> = ({
  obsWebSocket,
  onSceneSelected
}) => {
  const {
    scenes,
    currentScene,
    selectedSceneItems,
    loading,
    error,
    createScene,
    deleteScene,
    renameScene,
    duplicateScene,
    setCurrentScene,
    setSceneItemEnabled,
    setSceneItemLocked,
    removeSourceFromScene,
    selectScene,
    refresh
  } = useOBSScenes(obsWebSocket);

  const [selectedSceneName, setSelectedSceneName] = useState<string | null>(null);
  const [showNewSceneModal, setShowNewSceneModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; scene: SceneInfo } | null>(null);

  const handleSelectScene = useCallback(async (scene: SceneInfo) => {
    setSelectedSceneName(scene.name);
    await selectScene(scene.name);
    onSceneSelected?.(scene.name);
  }, [selectScene, onSceneSelected]);

  const handleCreateScene = useCallback(async () => {
    if (!newSceneName.trim()) return;
    try {
      await createScene(newSceneName);
      setNewSceneName('');
      setShowNewSceneModal(false);
    } catch (err) {
      // Error handled by hook
    }
  }, [newSceneName, createScene]);

  const handleRename = useCallback(async () => {
    if (!renameTarget || !newSceneName.trim()) return;
    try {
      await renameScene(renameTarget, newSceneName);
      setNewSceneName('');
      setRenameTarget(null);
      setShowRenameModal(false);
    } catch (err) {
      // Error handled by hook
    }
  }, [renameTarget, newSceneName, renameScene]);

  const handleDuplicate = useCallback(async (scene: SceneInfo) => {
    const copyName = `${scene.name} Copy`;
    try {
      await duplicateScene(scene.name, copyName);
    } catch (err) {
      // Error handled by hook
    }
  }, [duplicateScene]);

  const handleDelete = useCallback(async (scene: SceneInfo) => {
    if (!confirm(`Delete scene "${scene.name}"? This cannot be undone.`)) return;
    try {
      await deleteScene(scene.name);
      if (selectedSceneName === scene.name) {
        setSelectedSceneName(null);
      }
    } catch (err) {
      // Error handled by hook
    }
  }, [deleteScene, selectedSceneName]);

  const handleSetCurrent = useCallback(async (scene: SceneInfo) => {
    try {
      await setCurrentScene(scene.name);
    } catch (err) {
      // Error handled by hook
    }
  }, [setCurrentScene]);

  const handleContextMenu = useCallback((e: React.MouseEvent, scene: SceneInfo) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, scene });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const openRenameModal = useCallback((scene: SceneInfo) => {
    setRenameTarget(scene.name);
    setNewSceneName(scene.name);
    setShowRenameModal(true);
    closeContextMenu();
  }, [closeContextMenu]);

  const handleToggleItemEnabled = useCallback(async (item: SceneItem) => {
    if (!selectedSceneName) return;
    await setSceneItemEnabled(selectedSceneName, item.sceneItemId, !item.sceneItemEnabled);
  }, [selectedSceneName, setSceneItemEnabled]);

  const handleToggleItemLocked = useCallback(async (item: SceneItem) => {
    if (!selectedSceneName) return;
    await setSceneItemLocked(selectedSceneName, item.sceneItemId, !item.sceneItemLocked);
  }, [selectedSceneName, setSceneItemLocked]);

  const handleRemoveItem = useCallback(async (item: SceneItem) => {
    if (!selectedSceneName) return;
    if (!confirm(`Remove "${item.sourceName}" from scene?`)) return;
    await removeSourceFromScene(selectedSceneName, item.sceneItemId);
  }, [selectedSceneName, removeSourceFromScene]);

  return (
    <div className="scene-manager-panel" onClick={closeContextMenu}>
      <div className="panel-header">
        <h3>Scenes</h3>
        <div className="header-actions">
          <button onClick={() => setShowNewSceneModal(true)} className="btn-icon" title="New Scene">
            ➕
          </button>
          <button onClick={refresh} className="btn-icon" title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading scenes...</div>
      ) : (
        <div className="panel-content">
          <div className="scenes-list">
            {scenes.map((scene) => (
              <div
                key={scene.name}
                className={`scene-item ${selectedSceneName === scene.name ? 'selected' : ''} ${currentScene === scene.name ? 'current' : ''}`}
                onClick={() => handleSelectScene(scene)}
                onContextMenu={(e) => handleContextMenu(e, scene)}
              >
                <div className="scene-info">
                  <span className="scene-name">
                    {currentScene === scene.name && <span className="live-badge">LIVE</span>}
                    {scene.name}
                  </span>
                  <span className="scene-items-count">{scene.itemCount} items</span>
                </div>
                <div className="scene-actions">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSetCurrent(scene); }}
                    className="btn-small"
                    title="Set as current"
                    disabled={currentScene === scene.name}
                  >
                    ▶️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedSceneName && (
            <div className="scene-items-panel">
              <h4>Sources in "{selectedSceneName}"</h4>
              {selectedSceneItems.length === 0 ? (
                <p className="empty-message">No sources in this scene</p>
              ) : (
                <ul className="items-list">
                  {selectedSceneItems.map((item) => (
                    <li key={item.sceneItemId} className={`source-item ${!item.sceneItemEnabled ? 'disabled' : ''}`}>
                      <div className="source-info">
                        <span className="source-name">{item.sourceName}</span>
                        <span className="source-type">{item.sourceType}</span>
                      </div>
                      <div className="source-actions">
                        <button
                          onClick={() => handleToggleItemEnabled(item)}
                          className={`btn-icon ${item.sceneItemEnabled ? 'active' : ''}`}
                          title={item.sceneItemEnabled ? 'Hide' : 'Show'}
                        >
                          {item.sceneItemEnabled ? '👁️' : '👁️‍🗨️'}
                        </button>
                        <button
                          onClick={() => handleToggleItemLocked(item)}
                          className={`btn-icon ${item.sceneItemLocked ? 'active' : ''}`}
                          title={item.sceneItemLocked ? 'Unlock' : 'Lock'}
                        >
                          {item.sceneItemLocked ? '🔒' : '🔓'}
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="btn-icon danger"
                          title="Remove from scene"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">{error.message}</div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => { handleSetCurrent(contextMenu.scene); closeContextMenu(); }}>
            ▶️ Set as Current
          </button>
          <button onClick={() => openRenameModal(contextMenu.scene)}>
            ✏️ Rename
          </button>
          <button onClick={() => { handleDuplicate(contextMenu.scene); closeContextMenu(); }}>
            📋 Duplicate
          </button>
          <hr />
          <button onClick={() => { handleDelete(contextMenu.scene); closeContextMenu(); }} className="danger">
            🗑️ Delete
          </button>
        </div>
      )}

      {/* New Scene Modal */}
      {showNewSceneModal && (
        <div className="modal-overlay" onClick={() => setShowNewSceneModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h4>Create New Scene</h4>
            <input
              type="text"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder="Scene name"
              className="form-input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateScene()}
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewSceneModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateScene} className="btn-primary" disabled={!newSceneName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h4>Rename Scene</h4>
            <input
              type="text"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder="New name"
              className="form-input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="modal-actions">
              <button onClick={() => setShowRenameModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleRename} className="btn-primary" disabled={!newSceneName.trim()}>Rename</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scene-manager-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 8px;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color, #333);
        }
        .panel-header h3 {
          margin: 0;
          color: var(--text-primary, #fff);
        }
        .header-actions {
          display: flex;
          gap: 0.25rem;
        }
        .panel-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .scenes-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .scene-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--bg-tertiary, #16213e);
          border-radius: 4px;
          margin-bottom: 0.25rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .scene-item:hover {
          background: var(--bg-hover, #1f2b4a);
        }
        .scene-item.selected {
          background: var(--accent-color, #9147ff);
        }
        .scene-item.current .scene-name {
          font-weight: bold;
        }
        .scene-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .scene-name {
          color: var(--text-primary, #fff);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .live-badge {
          background: #ff4444;
          color: white;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: bold;
        }
        .scene-items-count {
          color: var(--text-muted, #666);
          font-size: 0.75rem;
        }
        .scene-actions {
          display: flex;
          gap: 0.25rem;
        }
        .scene-items-panel {
          border-top: 1px solid var(--border-color, #333);
          padding: 1rem;
          max-height: 40%;
          overflow-y: auto;
        }
        .scene-items-panel h4 {
          margin: 0 0 0.75rem;
          color: var(--text-secondary, #aaa);
          font-size: 0.875rem;
        }
        .empty-message {
          color: var(--text-muted, #666);
          font-size: 0.875rem;
          text-align: center;
          padding: 1rem;
        }
        .items-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .source-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: var(--bg-tertiary, #16213e);
          border-radius: 4px;
          margin-bottom: 0.25rem;
        }
        .source-item.disabled {
          opacity: 0.5;
        }
        .source-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .source-name {
          color: var(--text-primary, #fff);
          font-size: 0.875rem;
        }
        .source-type {
          color: var(--text-muted, #666);
          font-size: 0.625rem;
        }
        .source-actions {
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
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .btn-icon:hover {
          opacity: 1;
        }
        .btn-icon.active {
          opacity: 1;
        }
        .btn-icon.danger:hover {
          background: rgba(255, 0, 0, 0.2);
        }
        .btn-small {
          padding: 0.25rem 0.5rem;
          border: none;
          border-radius: 4px;
          background: var(--bg-tertiary, #16213e);
          color: var(--text-secondary, #aaa);
          cursor: pointer;
          font-size: 0.75rem;
        }
        .btn-small:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .context-menu {
          position: fixed;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          padding: 0.5rem 0;
          min-width: 150px;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .context-menu button {
          display: block;
          width: 100%;
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-primary, #fff);
          text-align: left;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .context-menu button:hover {
          background: var(--bg-hover, #1f2b4a);
        }
        .context-menu button.danger {
          color: #ff6b6b;
        }
        .context-menu hr {
          border: none;
          border-top: 1px solid var(--border-color, #333);
          margin: 0.25rem 0;
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
        }
        .modal-content.small {
          width: 300px;
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
        .loading {
          padding: 2rem;
          text-align: center;
          color: var(--text-muted, #666);
        }
        .error-message {
          padding: 0.75rem;
          margin: 0.5rem;
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 4px;
          color: #ff6b6b;
        }
      `}</style>
    </div>
  );
};

export default SceneManagerPanel;
