// Plugin Manager Component - Lista y gestión de plugins
import React, { useState, useCallback } from 'react';
import { usePlugins } from '../../hooks/usePlugins';
import { PluginCard } from './PluginCard';
import { PluginInstallModal } from './PluginInstallModal';
import { Plugin } from '../../types/plugins';

interface PluginManagerProps {
  onPluginSelect?: (plugin: Plugin) => void;
  onConfigurePlugin?: (plugin: Plugin) => void;
}

export const PluginManager: React.FC<PluginManagerProps> = ({
  onPluginSelect,
  onConfigurePlugin
}) => {
  const {
    plugins,
    activePlugins,
    loading,
    error,
    installFromFile,
    installFromURL,
    uninstall,
    activate,
    deactivate,
    toggle
  } = usePlugins();

  const [showInstallModal, setShowInstallModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlugins = plugins.filter(plugin => {
    // Filter by status
    if (filter === 'active' && plugin.status !== 'active') return false;
    if (filter === 'inactive' && plugin.status === 'active') return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        plugin.manifest.name.toLowerCase().includes(query) ||
        plugin.manifest.description.toLowerCase().includes(query) ||
        plugin.manifest.author.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleInstall = useCallback(async (file: File | null, url: string | null) => {
    if (file) {
      const result = await installFromFile(file);
      if (!result.success) {
        alert(`Error instalando plugin: ${result.error}`);
      }
    } else if (url) {
      const result = await installFromURL(url);
      if (!result.success) {
        alert(`Error instalando plugin: ${result.error}`);
      }
    }
    setShowInstallModal(false);
  }, [installFromFile, installFromURL]);

  const handleUninstall = useCallback(async (pluginId: string) => {
    if (confirm('¿Estás seguro de que quieres desinstalar este plugin?')) {
      await uninstall(pluginId);
    }
  }, [uninstall]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Plugins</h2>
          <p className="text-sm text-gray-400">
            {activePlugins.length} activos de {plugins.length} instalados
          </p>
        </div>
        <button
          onClick={() => setShowInstallModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Instalar Plugin
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar plugins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Plugin List */}
      {filteredPlugins.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {plugins.length === 0 ? (
            <>
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <p>No hay plugins instalados</p>
              <p className="text-sm mt-2">Instala tu primer plugin para extender la funcionalidad</p>
            </>
          ) : (
            <p>No se encontraron plugins con los filtros actuales</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPlugins.map(plugin => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onToggle={() => toggle(plugin.id)}
              onConfigure={() => onConfigurePlugin?.(plugin)}
              onUninstall={() => handleUninstall(plugin.id)}
              onClick={() => onPluginSelect?.(plugin)}
            />
          ))}
        </div>
      )}

      {/* Install Modal */}
      {showInstallModal && (
        <PluginInstallModal
          onInstall={handleInstall}
          onClose={() => setShowInstallModal(false)}
        />
      )}
    </div>
  );
};
