// Plugin Config Modal - Configuración de plugin con JSON Schema
import React, { useState, useEffect } from 'react';
import { Plugin } from '../../types/plugins';
import { usePluginConfig } from '../../hooks/usePluginConfig';

interface PluginConfigModalProps {
  plugin: Plugin;
  onClose: () => void;
  onSave?: () => void;
}

interface SchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
}

export const PluginConfigModal: React.FC<PluginConfigModalProps> = ({
  plugin,
  onClose,
  onSave
}) => {
  const { config, setConfig, resetConfig, loading, error } = usePluginConfig(plugin.id);
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const schema = plugin.manifest.configSchema;

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (key: string, value: unknown) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setConfig(localConfig);
    setHasChanges(false);
    onSave?.();
  };

  const handleReset = () => {
    if (confirm('¿Restablecer la configuración a los valores por defecto?')) {
      resetConfig();
      setHasChanges(false);
    }
  };

  const renderField = (key: string, prop: SchemaProperty) => {
    const value = localConfig[key] ?? prop.default ?? '';

    switch (prop.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleChange(key, e.target.checked)}
              className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-white">{prop.title || key}</span>
          </label>
        );

      case 'number':
      case 'integer':
        return (
          <div>
            <label className="block text-sm text-gray-300 mb-1">{prop.title || key}</label>
            <input
              type="number"
              value={Number(value) || 0}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              min={prop.minimum}
              max={prop.maximum}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        );

      case 'string':
        if (prop.enum) {
          return (
            <div>
              <label className="block text-sm text-gray-300 mb-1">{prop.title || key}</label>
              <select
                value={String(value)}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                {prop.enum.map((opt) => (
                  <option key={String(opt)} value={String(opt)}>
                    {String(opt)}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <div>
            <label className="block text-sm text-gray-300 mb-1">{prop.title || key}</label>
            <input
              type="text"
              value={String(value)}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm text-gray-300 mb-1">{prop.title || key}</label>
            <textarea
              value={JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  handleChange(key, JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Configurar {plugin.manifest.name}</h2>
            <p className="text-sm text-gray-400">v{plugin.manifest.version}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
              {error}
            </div>
          ) : !schema?.properties ? (
            <div className="text-center py-8 text-gray-400">
              <p>Este plugin no tiene opciones de configuración</p>
            </div>
          ) : (
            Object.entries(schema.properties as Record<string, SchemaProperty>).map(([key, prop]) => (
              <div key={key}>
                {renderField(key, prop)}
                {prop.description && (
                  <p className="text-xs text-gray-500 mt-1">{prop.description}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Restablecer
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
