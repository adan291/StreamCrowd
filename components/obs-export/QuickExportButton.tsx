// Quick Export Button - Botón de exportación rápida a OBS
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuickExport } from '../../hooks/useQuickExport';
import { OverlayType, OverlayOBSStatus } from '../../types/obs-export';

interface QuickExportButtonProps {
  overlayType: OverlayType;
  obsWebSocket: any;
  sceneName?: string;
  compact?: boolean;
  onExported?: () => void;
  onRemoved?: () => void;
}

export const QuickExportButton: React.FC<QuickExportButtonProps> = ({
  overlayType,
  obsWebSocket,
  sceneName,
  compact = false,
  onExported,
  onRemoved
}) => {
  const {
    exportedOverlays,
    loading,
    error,
    addOverlayToOBS,
    updateOverlayInOBS,
    removeOverlayFromOBS,
    getOverlayStatus,
    getSuggestion
  } = useQuickExport(obsWebSocket);

  const [showDropdown, setShowDropdown] = useState(false);
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const [scenes, setScenes] = useState<string[]>([]);
  const [selectedScene, setSelectedScene] = useState(sceneName || '');
  const [status, setStatus] = useState<OverlayOBSStatus | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current status
  useEffect(() => {
    const checkStatus = async () => {
      const overlayStatus = await getOverlayStatus(overlayType);
      setStatus(overlayStatus);
    };
    checkStatus();
  }, [overlayType, getOverlayStatus, exportedOverlays]);

  // Load scenes when dropdown opens
  useEffect(() => {
    if (showSceneSelector && obsWebSocket) {
      obsWebSocket.call('GetSceneList').then((response: any) => {
        setScenes(response.scenes.map((s: any) => s.sceneName));
        if (!selectedScene && response.currentProgramSceneName) {
          setSelectedScene(response.currentProgramSceneName);
        }
      }).catch(() => {
        setScenes([]);
      });
    }
  }, [showSceneSelector, obsWebSocket, selectedScene]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowSceneSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddToOBS = useCallback(async () => {
    if (!selectedScene) {
      setShowSceneSelector(true);
      return;
    }

    try {
      const suggestion = getSuggestion(overlayType);
      
      await addOverlayToOBS(overlayType, {
        sceneName: selectedScene,
        position: suggestion.position,
        dimensions: suggestion.dimensions
      });
      
      setShowDropdown(false);
      setShowSceneSelector(false);
      onExported?.();
    } catch (err) {
      // Error handled by hook
    }
  }, [selectedScene, overlayType, addOverlayToOBS, getSuggestion, onExported]);

  const handleUpdate = useCallback(async () => {
    try {
      await updateOverlayInOBS(overlayType);
      setShowDropdown(false);
    } catch (err) {
      // Error handled by hook
    }
  }, [overlayType, updateOverlayInOBS]);

  const handleRemove = useCallback(async () => {
    if (!confirm('¿Eliminar este overlay de OBS?')) return;
    try {
      await removeOverlayFromOBS(overlayType);
      setShowDropdown(false);
      onRemoved?.();
    } catch (err) {
      // Error handled by hook
    }
  }, [overlayType, removeOverlayFromOBS, onRemoved]);

  const handleSceneSelect = useCallback((scene: string) => {
    setSelectedScene(scene);
    setShowSceneSelector(false);
  }, []);

  const isInOBS = status?.inOBS ?? false;
  const statusIcon = isInOBS ? '✅' : '📤';
  const statusText = isInOBS ? 'En OBS' : 'Añadir a OBS';

  if (compact) {
    return (
      <div className="quick-export-compact" ref={dropdownRef}>
        <button
          className={`export-btn-compact ${isInOBS ? 'in-obs' : ''}`}
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loading}
          title={isInOBS ? `En OBS: ${status?.sceneName}` : 'Exportar a OBS'}
        >
          {loading ? '⏳' : statusIcon}
        </button>

        {showDropdown && (
          <div className="dropdown-compact">
            {!isInOBS ? (
              <>
                {showSceneSelector ? (
                  <div className="scene-selector">
                    <p>Seleccionar escena:</p>
                    {scenes.map(scene => (
                      <button key={scene} onClick={() => handleSceneSelect(scene)}>
                        {scene}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button onClick={handleAddToOBS}>➕ Añadir a OBS</button>
                )}
              </>
            ) : (
              <>
                <button onClick={handleUpdate}>🔄 Actualizar</button>
                <button onClick={handleRemove} className="danger">🗑️ Eliminar</button>
              </>
            )}
          </div>
        )}

        <style>{`
          .quick-export-compact { position: relative; display: inline-block; }
          .export-btn-compact {
            width: 32px; height: 32px;
            border: none; border-radius: 4px;
            background: var(--bg-tertiary, #16213e);
            cursor: pointer; font-size: 1rem;
            transition: all 0.2s;
          }
          .export-btn-compact:hover { background: var(--bg-hover, #1f2b4a); }
          .export-btn-compact.in-obs { background: rgba(0, 200, 83, 0.2); }
          .export-btn-compact:disabled { opacity: 0.5; cursor: not-allowed; }
          .dropdown-compact {
            position: absolute; top: 100%; right: 0;
            background: var(--bg-secondary, #1a1a2e);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px; padding: 0.5rem;
            min-width: 150px; z-index: 100;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
          .dropdown-compact button {
            display: block; width: 100%;
            padding: 0.5rem; border: none;
            background: transparent;
            color: var(--text-primary, #fff);
            text-align: left; cursor: pointer;
            border-radius: 4px; font-size: 0.875rem;
          }
          .dropdown-compact button:hover { background: var(--bg-hover, #1f2b4a); }
          .dropdown-compact button.danger { color: #ff6b6b; }
          .scene-selector p {
            margin: 0 0 0.5rem;
            color: var(--text-muted, #666);
            font-size: 0.75rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="quick-export-button" ref={dropdownRef}>
      <button
        className={`export-btn ${isInOBS ? 'in-obs' : ''}`}
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
      >
        <span className="icon">{loading ? '⏳' : statusIcon}</span>
        <span className="text">{statusText}</span>
        <span className="arrow">{showDropdown ? '▲' : '▼'}</span>
      </button>

      {showDropdown && (
        <div className="dropdown">
          {!isInOBS ? (
            <>
              {showSceneSelector ? (
                <div className="scene-selector">
                  <p>Seleccionar escena destino:</p>
                  <div className="scene-list">
                    {scenes.length === 0 ? (
                      <p className="no-scenes">No hay escenas disponibles</p>
                    ) : (
                      scenes.map(scene => (
                        <button
                          key={scene}
                          onClick={() => handleSceneSelect(scene)}
                          className={selectedScene === scene ? 'selected' : ''}
                        >
                          {scene}
                        </button>
                      ))
                    )}
                  </div>
                  {selectedScene && (
                    <button onClick={handleAddToOBS} className="confirm-btn">
                      ✓ Añadir a "{selectedScene}"
                    </button>
                  )}
                </div>
              ) : (
                <div className="add-options">
                  <button onClick={() => setShowSceneSelector(true)}>
                    <span className="opt-icon">🎬</span>
                    <span className="opt-text">
                      <strong>Añadir a escena</strong>
                      <small>Seleccionar escena destino</small>
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="manage-options">
              <div className="status-info">
                <span className="status-label">Escena:</span>
                <span className="status-value">{status?.sceneName}</span>
              </div>
              <hr />
              <button onClick={handleUpdate}>
                <span className="opt-icon">🔄</span>
                <span>Actualizar URL</span>
              </button>
              <button onClick={handleRemove} className="danger">
                <span className="opt-icon">🗑️</span>
                <span>Eliminar de OBS</span>
              </button>
            </div>
          )}

          {error && (
            <div className="error-msg">{error.message}</div>
          )}
        </div>
      )}

      <style>{`
        .quick-export-button { position: relative; display: inline-block; }
        .export-btn {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--bg-tertiary, #16213e);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          color: var(--text-primary, #fff);
          cursor: pointer; transition: all 0.2s;
        }
        .export-btn:hover { border-color: var(--accent-color, #9147ff); }
        .export-btn.in-obs {
          background: rgba(0, 200, 83, 0.1);
          border-color: rgba(0, 200, 83, 0.3);
        }
        .export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .export-btn .icon { font-size: 1rem; }
        .export-btn .text { font-size: 0.875rem; }
        .export-btn .arrow { font-size: 0.625rem; opacity: 0.6; }
        .dropdown {
          position: absolute; top: calc(100% + 4px); left: 0;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px; padding: 0.75rem;
          min-width: 250px; z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .scene-selector p {
          margin: 0 0 0.5rem;
          color: var(--text-secondary, #aaa);
          font-size: 0.875rem;
        }
        .scene-list {
          max-height: 200px; overflow-y: auto;
          margin-bottom: 0.5rem;
        }
        .scene-list button {
          display: block; width: 100%;
          padding: 0.5rem; border: none;
          background: var(--bg-tertiary, #16213e);
          color: var(--text-primary, #fff);
          text-align: left; cursor: pointer;
          border-radius: 4px; margin-bottom: 0.25rem;
        }
        .scene-list button:hover { background: var(--bg-hover, #1f2b4a); }
        .scene-list button.selected {
          background: var(--accent-color, #9147ff);
        }
        .no-scenes {
          color: var(--text-muted, #666);
          font-size: 0.875rem;
          text-align: center;
          padding: 1rem;
        }
        .confirm-btn {
          width: 100%; padding: 0.5rem;
          background: var(--accent-color, #9147ff);
          border: none; border-radius: 4px;
          color: white; cursor: pointer;
          font-weight: 500;
        }
        .add-options button, .manage-options button {
          display: flex; align-items: center; gap: 0.75rem;
          width: 100%; padding: 0.75rem;
          background: transparent; border: none;
          color: var(--text-primary, #fff);
          cursor: pointer; border-radius: 4px;
          text-align: left;
        }
        .add-options button:hover, .manage-options button:hover {
          background: var(--bg-tertiary, #16213e);
        }
        .opt-icon { font-size: 1.25rem; }
        .opt-text { display: flex; flex-direction: column; }
        .opt-text strong { font-size: 0.875rem; }
        .opt-text small { font-size: 0.75rem; color: var(--text-muted, #666); }
        .status-info {
          display: flex; justify-content: space-between;
          padding: 0.5rem; font-size: 0.875rem;
        }
        .status-label { color: var(--text-muted, #666); }
        .status-value { color: var(--text-primary, #fff); }
        .manage-options hr {
          border: none;
          border-top: 1px solid var(--border-color, #333);
          margin: 0.5rem 0;
        }
        .manage-options button.danger { color: #ff6b6b; }
        .error-msg {
          margin-top: 0.5rem; padding: 0.5rem;
          background: rgba(255,0,0,0.1);
          border-radius: 4px; color: #ff6b6b;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default QuickExportButton;
