// Template Library - Biblioteca de templates de escenas OBS
import React, { useState, useCallback } from 'react';
import { useTemplates } from '../../hooks/useTemplates';
import {
  SceneTemplate,
  TemplateCategory,
  TemplateVariable,
  ApplyOptions
} from '../../types/obs-export';

interface TemplateLibraryProps {
  obsWebSocket: any;
  onTemplateApplied?: (result: any) => void;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  gaming: '🎮 Gaming',
  just_chatting: '💬 Just Chatting',
  irl: '📱 IRL',
  creative: '🎨 Creative',
  custom: '⚙️ Custom'
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  gaming: '#9147ff',
  just_chatting: '#00b894',
  irl: '#e17055',
  creative: '#fdcb6e',
  custom: '#74b9ff'
};

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  obsWebSocket,
  onTemplateApplied
}) => {
  const {
    builtInTemplates,
    customTemplates,
    selectedTemplate,
    preview,
    loading,
    applying,
    error,
    selectTemplate,
    applyTemplate,
    saveCustomTemplate,
    deleteCustomTemplate,
    exportTemplate,
    importTemplate
  } = useTemplates(obsWebSocket);

  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, unknown>>({});
  const [prefix, setPrefix] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const allTemplates = [...builtInTemplates, ...customTemplates];
  const filteredTemplates = categoryFilter === 'all'
    ? allTemplates
    : allTemplates.filter(t => t.category === categoryFilter);

  const handleSelectTemplate = useCallback((template: SceneTemplate) => {
    selectTemplate(template);
    // Initialize variable values with defaults
    const defaults: Record<string, unknown> = {};
    template.variables.forEach(v => {
      defaults[v.name] = v.defaultValue;
    });
    setVariableValues(defaults);
    setShowPreviewModal(true);
  }, [selectTemplate]);

  const handleApply = useCallback(async () => {
    if (!selectedTemplate) return;

    const options: ApplyOptions = {
      variableValues,
      prefix: prefix || undefined,
      replaceExisting
    };

    try {
      const result = await applyTemplate(selectedTemplate, options);
      setShowPreviewModal(false);
      onTemplateApplied?.(result);
    } catch (err) {
      // Error handled by hook
    }
  }, [selectedTemplate, variableValues, prefix, replaceExisting, applyTemplate, onTemplateApplied]);

  const handleExport = useCallback(async (template: SceneTemplate) => {
    try {
      const json = await exportTemplate(template.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Error handled by hook
    }
  }, [exportTemplate]);

  const handleImport = useCallback(async () => {
    if (!importJson.trim()) return;

    try {
      await importTemplate(importJson);
      setImportJson('');
      setShowImportModal(false);
    } catch (err) {
      // Error handled by hook
    }
  }, [importJson, importTemplate]);

  const handleDelete = useCallback(async (template: SceneTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    await deleteCustomTemplate(template.id);
  }, [deleteCustomTemplate]);

  const renderVariableInput = (variable: TemplateVariable) => {
    const value = variableValues[variable.name] ?? variable.defaultValue;

    switch (variable.type) {
      case 'url':
        return (
          <input
            type="url"
            value={String(value)}
            onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
            placeholder="https://..."
            className="form-input"
          />
        );
      case 'color':
        return (
          <input
            type="color"
            value={String(value)}
            onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
            className="form-input color-input"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={Number(value)}
            onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: parseFloat(e.target.value) }))}
            className="form-input"
          />
        );
      default:
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
            className="form-input"
          />
        );
    }
  };

  return (
    <div className="template-library">
      <div className="library-header">
        <h3>Scene Templates</h3>
        <div className="header-actions">
          <button onClick={() => setShowImportModal(true)} className="btn-secondary">
            Import Template
          </button>
        </div>
      </div>

      <div className="category-filter">
        <button
          className={`filter-btn ${categoryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          All
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`filter-btn ${categoryFilter === key ? 'active' : ''}`}
            onClick={() => setCategoryFilter(key as TemplateCategory)}
            style={{ '--category-color': CATEGORY_COLORS[key as TemplateCategory] } as any}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading templates...</div>
      ) : (
        <div className="templates-grid">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="template-card"
              onClick={() => handleSelectTemplate(template)}
            >
              <div
                className="template-thumbnail"
                style={{ backgroundColor: CATEGORY_COLORS[template.category] + '33' }}
              >
                <span className="template-icon">
                  {CATEGORY_LABELS[template.category].split(' ')[0]}
                </span>
              </div>
              <div className="template-info">
                <h4>{template.name}</h4>
                <p>{template.description}</p>
                <div className="template-meta">
                  <span>{template.scenes.length} scenes</span>
                  {template.builtIn ? (
                    <span className="badge built-in">Built-in</span>
                  ) : (
                    <span className="badge custom">Custom</span>
                  )}
                </div>
              </div>
              <div className="template-actions" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleExport(template)} title="Export">
                  📤
                </button>
                {!template.builtIn && (
                  <button onClick={() => handleDelete(template)} title="Delete">
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="error-message">{error.message}</div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && preview && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedTemplate.name}</h3>
              <button onClick={() => setShowPreviewModal(false)} className="close-btn">×</button>
            </div>

            <div className="modal-body">
              <p className="template-description">{selectedTemplate.description}</p>

              <div className="preview-section">
                <h4>Scenes ({preview.scenes.length})</h4>
                <ul className="scene-list">
                  {preview.scenes.map((scene, i) => (
                    <li key={i}>
                      <span className="scene-name">{scene.name}</span>
                      <span className="scene-items">{scene.itemCount} items</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedTemplate.variables.length > 0 && (
                <div className="variables-section">
                  <h4>Configuration</h4>
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable.name} className="variable-field">
                      <label>{variable.label}</label>
                      {variable.description && (
                        <small>{variable.description}</small>
                      )}
                      {renderVariableInput(variable)}
                    </div>
                  ))}
                </div>
              )}

              <div className="options-section">
                <h4>Options</h4>
                <div className="option-field">
                  <label>Prefix (optional)</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g., MyStream_"
                    className="form-input"
                  />
                  <small>Add a prefix to all scene and source names</small>
                </div>
                <div className="option-field checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                    />
                    Replace existing scenes with same name
                  </label>
                </div>
              </div>

              <div className="preview-stats">
                <span>Total sources: {preview.totalSources}</span>
                <span>Est. time: ~{preview.estimatedTime}s</span>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowPreviewModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleApply} className="btn-primary" disabled={applying}>
                {applying ? 'Applying...' : 'Apply Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import Template</h3>
              <button onClick={() => setShowImportModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <p>Paste the template JSON below:</p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"name": "My Template", ...}'
                className="form-textarea"
                rows={10}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowImportModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleImport} className="btn-primary" disabled={!importJson.trim()}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .template-library {
          padding: 1rem;
        }
        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .library-header h3 {
          margin: 0;
          color: var(--text-primary, #fff);
        }
        .category-filter {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .filter-btn {
          padding: 0.5rem 1rem;
          background: var(--bg-tertiary, #16213e);
          border: 1px solid var(--border-color, #333);
          border-radius: 20px;
          color: var(--text-secondary, #aaa);
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .filter-btn:hover {
          border-color: var(--category-color, var(--accent-color, #9147ff));
        }
        .filter-btn.active {
          background: var(--category-color, var(--accent-color, #9147ff));
          color: white;
          border-color: transparent;
        }
        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .template-card {
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }
        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .template-thumbnail {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .template-icon {
          font-size: 2.5rem;
        }
        .template-info {
          padding: 1rem;
        }
        .template-info h4 {
          margin: 0 0 0.5rem;
          color: var(--text-primary, #fff);
        }
        .template-info p {
          margin: 0 0 0.5rem;
          color: var(--text-secondary, #aaa);
          font-size: 0.875rem;
          line-height: 1.4;
        }
        .template-meta {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-muted, #666);
        }
        .badge {
          padding: 0.125rem 0.5rem;
          border-radius: 10px;
          font-size: 0.625rem;
          text-transform: uppercase;
        }
        .badge.built-in {
          background: rgba(145, 71, 255, 0.2);
          color: #9147ff;
        }
        .badge.custom {
          background: rgba(116, 185, 255, 0.2);
          color: #74b9ff;
        }
        .template-actions {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .template-card:hover .template-actions {
          opacity: 1;
        }
        .template-actions button {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 4px;
          background: rgba(0,0,0,0.5);
          cursor: pointer;
          font-size: 0.875rem;
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
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .modal-content.small {
          max-width: 500px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color, #333);
        }
        .modal-header h3 {
          margin: 0;
          color: var(--text-primary, #fff);
        }
        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: var(--text-secondary, #aaa);
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
        }
        .template-description {
          color: var(--text-secondary, #aaa);
          margin-bottom: 1.5rem;
        }
        .preview-section, .variables-section, .options-section {
          margin-bottom: 1.5rem;
        }
        .preview-section h4, .variables-section h4, .options-section h4 {
          margin: 0 0 0.75rem;
          color: var(--text-primary, #fff);
          font-size: 0.875rem;
        }
        .scene-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .scene-list li {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: var(--bg-tertiary, #16213e);
          border-radius: 4px;
          margin-bottom: 0.25rem;
        }
        .scene-name {
          color: var(--text-primary, #fff);
        }
        .scene-items {
          color: var(--text-muted, #666);
          font-size: 0.75rem;
        }
        .variable-field, .option-field {
          margin-bottom: 1rem;
        }
        .variable-field label, .option-field label {
          display: block;
          color: var(--text-secondary, #aaa);
          margin-bottom: 0.25rem;
        }
        .variable-field small, .option-field small {
          display: block;
          color: var(--text-muted, #666);
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
        .option-field.checkbox label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .preview-stats {
          display: flex;
          gap: 1rem;
          padding: 0.75rem;
          background: var(--bg-tertiary, #16213e);
          border-radius: 4px;
          color: var(--text-muted, #666);
          font-size: 0.75rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color, #333);
        }
        .form-input, .form-textarea {
          width: 100%;
          padding: 0.5rem;
          background: var(--bg-tertiary, #16213e);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          font-size: 0.875rem;
        }
        .form-textarea {
          resize: vertical;
          font-family: monospace;
        }
        .color-input {
          height: 38px;
          padding: 2px;
        }
        .btn-primary, .btn-secondary {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .btn-primary {
          background: var(--accent-color, #9147ff);
          color: white;
        }
        .btn-secondary {
          background: var(--bg-tertiary, #16213e);
          color: var(--text-primary, #fff);
          border: 1px solid var(--border-color, #333);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .loading {
          text-align: center;
          padding: 2rem;
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
      `}</style>
    </div>
  );
};

export default TemplateLibrary;
