// Plugin Card Component - Muestra información de un plugin
import React from 'react';
import { Plugin, PluginStatus, PERMISSION_DESCRIPTIONS } from '../../types/plugins';

interface PluginCardProps {
  plugin: Plugin;
  onToggle: () => void;
  onConfigure?: () => void;
  onUninstall: () => void;
  onClick?: () => void;
}

const statusColors: Record<PluginStatus, string> = {
  installed: 'bg-gray-500',
  active: 'bg-green-500',
  disabled: 'bg-yellow-500',
  error: 'bg-red-500',
  updating: 'bg-blue-500'
};

const statusLabels: Record<PluginStatus, string> = {
  installed: 'Instalado',
  active: 'Activo',
  disabled: 'Desactivado',
  error: 'Error',
  updating: 'Actualizando'
};

export const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  onToggle,
  onConfigure,
  onUninstall,
  onClick
}) => {
  const { manifest, status, error } = plugin;
  const isActive = status === 'active';

  return (
    <div
      className={`p-4 bg-gray-800 rounded-lg border transition-colors ${
        isActive ? 'border-purple-500/50' : 'border-gray-700'
      } ${onClick ? 'cursor-pointer hover:border-purple-500' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
          {manifest.icon ? (
            <img src={manifest.icon} alt={manifest.name} className="w-8 h-8" />
          ) : (
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate">{manifest.name}</h3>
            <span className="text-xs text-gray-500">v{manifest.version}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs text-white ${statusColors[status]}`}>
              {statusLabels[status]}
            </span>
          </div>
          
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{manifest.description}</p>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>Por {manifest.author}</span>
            {manifest.homepage && (
              <a
                href={manifest.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300"
                onClick={(e) => e.stopPropagation()}
              >
                Sitio web
              </a>
            )}
          </div>

          {/* Permissions */}
          {manifest.permissions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {manifest.permissions.slice(0, 4).map(perm => (
                <span
                  key={perm}
                  className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                  title={PERMISSION_DESCRIPTIONS[perm]}
                >
                  {perm}
                </span>
              ))}
              {manifest.permissions.length > 4 && (
                <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                  +{manifest.permissions.length - 4} más
                </span>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-2 p-2 bg-red-500/20 rounded text-xs text-red-400">
              {error.message}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Toggle */}
          <button
            onClick={onToggle}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isActive ? 'bg-purple-600' : 'bg-gray-600'
            }`}
            title={isActive ? 'Desactivar' : 'Activar'}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                isActive ? 'left-7' : 'left-1'
              }`}
            />
          </button>

          {/* Configure */}
          {onConfigure && manifest.configSchema && (
            <button
              onClick={onConfigure}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Configurar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          {/* Uninstall */}
          <button
            onClick={onUninstall}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
            title="Desinstalar"
            disabled={isActive}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
