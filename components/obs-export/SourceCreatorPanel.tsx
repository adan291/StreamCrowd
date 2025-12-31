// Source Creator Panel - Crear y editar fuentes OBS
import React, { useState, useCallback } from 'react';
import { useOBSSources } from '../../hooks/useOBSSources';
import {
  SourceType,
  BrowserSourceConfig,
  Transform,
  DEFAULT_TRANSFORM
} from '../../types/obs-export';

interface SourceCreatorPanelProps {
  obsWebSocket: any;
  onSourceCreated?: (sourceName: string) => void;
  onCancel?: () => void;
  editingSource?: string;
}

const SOURCE_TYPES: { value: SourceType; label: string; description: string }[] = [
  { value: 'browser_source', label: 'Browser Source', description: 'Web page or overlay URL' },
  { value: 'image_source', label: 'Image', description: 'Static image file' },
  { value: 'text_gdi_plus', label: 'Text', description: 'Text with custom font' },
  { value: 'color_source', label: 'Color', description: 'Solid color background' },
  { value: 'ffmpeg_source', label: 'Media', description: 'Video or audio file' },
  { value: 'game_capture', label: 'Game Capture', description: 'Capture game window' },
  { value: 'window_capture', label: 'Window Capture', description: 'Capture application window' },
  { value: 'dshow_input', label: 'Video Capture', description: 'Webcam or capture card' }
];

export const SourceCreatorPanel: React.FC<SourceCreatorPanelProps> = ({
  obsWebSocket,
  onSourceCreated,
  onCancel,
  editingSource
}) => {
  const { createBrowserSource, createSource, updateBrowserSource, sourceExists, loading, error } = useOBSSources(obsWebSocket);
  
  const [sourceType, setSourceType] = useState<SourceType>('browser_source');
  const [name, setName] = useState(editingSource || '');
  const [url, setUrl] = useState('');
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [fps, setFps] = useState(30);
  const [css, setCss] = useState('');
  const [shutdownWhenHidden, setShutdownWhenHidden] = useState(true);
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ffffff');
  const [filePath, setFilePath] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const validateForm = useCallback(async (): Promise<boolean> => {
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Source name is required');
      return false;
    }

    if (!editingSource) {
      const exists = await sourceExists(name);
      if (exists) {
        setValidationError('A source with this name already exists');
        return false;
      }
    }

    if (sourceType === 'browser_source') {
      if (!url.trim()) {
        setValidationError('URL is required for browser source');
        return false;
      }
      try {
        new URL(url);
      } catch {
        setValidationError('Invalid URL format');
        return false;
      }
      if (width < 1 || width > 4096) {
        setValidationError('Width must be between 1 and 4096');
        return false;
      }
      if (height < 1 || height > 4096) {
        setValidationError('Height must be between 1 and 4096');
        return false;
      }
    }

    if (sourceType === 'text_gdi_plus' && !text.trim()) {
      setValidationError('Text content is required');
      return false;
    }

    return true;
  }, [name, url, width, height, sourceType, text, editingSource, sourceExists]);

  const handlePreview = useCallback(() => {
    if (sourceType === 'browser_source' && url) {
      setPreviewUrl(url);
    }
  }, [sourceType, url]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      if (sourceType === 'browser_source') {
        const config: BrowserSourceConfig = {
          name,
          url,
          width,
          height,
          fps,
          css: css || undefined,
          shutdownWhenHidden
        };

        if (editingSource) {
          await updateBrowserSource(name, config);
        } else {
          await createBrowserSource(config);
        }
      } else {
        const settings: any = { name };
        
        switch (sourceType) {
          case 'text_gdi_plus':
            settings.text = text;
            settings.font = { face: 'Arial', size: fontSize };
            settings.color = parseInt(color.replace('#', ''), 16);
            break;
          case 'color_source':
            settings.color = parseInt(color.replace('#', ''), 16);
            settings.width = width;
            settings.height = height;
            break;
          case 'image_source':
          case 'ffmpeg_source':
            settings.file = filePath;
            break;
        }

        await createSource(sourceType, settings);
      }

      onSourceCreated?.(name);
    } catch (err) {
      // Error is handled by the hook
    }
  }, [
    validateForm, sourceType, name, url, width, height, fps, css,
    shutdownWhenHidden, text, fontSize, color, filePath,
    editingSource, createBrowserSource, updateBrowserSource, createSource, onSourceCreated
  ]);

  const renderBrowserSourceForm = () => (
    <>
      <div className="form-group">
        <label htmlFor="url">URL *</label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/overlay"
          className="form-input"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="width">Width</label>
          <input
            id="width"
            type="number"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value) || 800)}
            min={1}
            max={4096}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="height">Height</label>
          <input
            id="height"
            type="number"
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value) || 600)}
            min={1}
            max={4096}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="fps">FPS</label>
          <input
            id="fps"
            type="number"
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value) || 30)}
            min={1}
            max={60}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="css">Custom CSS (optional)</label>
        <textarea
          id="css"
          value={css}
          onChange={(e) => setCss(e.target.value)}
          placeholder="body { background: transparent; }"
          className="form-textarea"
          rows={3}
        />
      </div>

      <div className="form-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={shutdownWhenHidden}
            onChange={(e) => setShutdownWhenHidden(e.target.checked)}
          />
          Shutdown source when not visible
        </label>
      </div>

      {url && (
        <button type="button" onClick={handlePreview} className="btn-secondary">
          Preview
        </button>
      )}
    </>
  );

  const renderTextSourceForm = () => (
    <>
      <div className="form-group">
        <label htmlFor="text">Text Content *</label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your text here"
          className="form-textarea"
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="fontSize">Font Size</label>
          <input
            id="fontSize"
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value) || 48)}
            min={8}
            max={256}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="textColor">Color</label>
          <input
            id="textColor"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="form-input color-input"
          />
        </div>
      </div>
    </>
  );

  const renderColorSourceForm = () => (
    <>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="colorValue">Color</label>
          <input
            id="colorValue"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="form-input color-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="colorWidth">Width</label>
          <input
            id="colorWidth"
            type="number"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value) || 1920)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="colorHeight">Height</label>
          <input
            id="colorHeight"
            type="number"
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value) || 1080)}
            className="form-input"
          />
        </div>
      </div>
    </>
  );

  const renderFileSourceForm = () => (
    <div className="form-group">
      <label htmlFor="filePath">File Path</label>
      <input
        id="filePath"
        type="text"
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
        placeholder="C:\path\to\file"
        className="form-input"
      />
      <small className="form-hint">Enter the full path to the file on your computer</small>
    </div>
  );

  const renderCaptureSourceForm = () => (
    <div className="form-info">
      <p>This source type will be created with default settings.</p>
      <p>You can configure capture settings in OBS after creation.</p>
    </div>
  );

  const renderFormFields = () => {
    switch (sourceType) {
      case 'browser_source':
        return renderBrowserSourceForm();
      case 'text_gdi_plus':
        return renderTextSourceForm();
      case 'color_source':
        return renderColorSourceForm();
      case 'image_source':
      case 'ffmpeg_source':
        return renderFileSourceForm();
      case 'game_capture':
      case 'window_capture':
      case 'dshow_input':
        return renderCaptureSourceForm();
      default:
        return null;
    }
  };

  return (
    <div className="source-creator-panel">
      <h3>{editingSource ? 'Edit Source' : 'Create New Source'}</h3>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sourceType">Source Type</label>
          <select
            id="sourceType"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
            className="form-select"
            disabled={!!editingSource}
          >
            {SOURCE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <small className="form-hint">
            {SOURCE_TYPES.find(t => t.value === sourceType)?.description}
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="sourceName">Source Name *</label>
          <input
            id="sourceName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Source"
            className="form-input"
            disabled={!!editingSource}
          />
        </div>

        {renderFormFields()}

        {(validationError || error) && (
          <div className="error-message">
            {validationError || error?.message}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : editingSource ? 'Update Source' : 'Create Source'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      {previewUrl && (
        <div className="source-preview">
          <h4>Preview</h4>
          <div className="preview-frame" style={{ width: Math.min(width, 400), height: Math.min(height, 300) }}>
            <iframe
              src={previewUrl}
              title="Source Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
          <button onClick={() => setPreviewUrl(null)} className="btn-small">
            Close Preview
          </button>
        </div>
      )}

      <style>{`
        .source-creator-panel {
          padding: 1rem;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 8px;
        }
        .source-creator-panel h3 {
          margin: 0 0 1rem;
          color: var(--text-primary, #fff);
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.25rem;
          color: var(--text-secondary, #aaa);
          font-size: 0.875rem;
        }
        .form-row {
          display: flex;
          gap: 1rem;
        }
        .form-row .form-group {
          flex: 1;
        }
        .form-input, .form-select, .form-textarea {
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
          cursor: pointer;
        }
        .form-hint {
          display: block;
          margin-top: 0.25rem;
          color: var(--text-muted, #666);
          font-size: 0.75rem;
        }
        .checkbox label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .form-info {
          padding: 1rem;
          background: var(--bg-tertiary, #16213e);
          border-radius: 4px;
          color: var(--text-secondary, #aaa);
        }
        .form-info p {
          margin: 0.5rem 0;
        }
        .error-message {
          padding: 0.75rem;
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 4px;
          color: #ff6b6b;
          margin-bottom: 1rem;
        }
        .form-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }
        .btn-primary, .btn-secondary, .btn-small {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: opacity 0.2s;
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
        .btn-small {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          background: var(--bg-tertiary, #16213e);
          color: var(--text-secondary, #aaa);
        }
        .btn-primary:disabled, .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .source-preview {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color, #333);
        }
        .source-preview h4 {
          margin: 0 0 0.5rem;
          color: var(--text-secondary, #aaa);
        }
        .preview-frame {
          background: #000;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default SourceCreatorPanel;
