// Plugin Logs Component - Muestra logs de plugins
import React, { useState, useMemo } from 'react';
import { Plugin, PluginLog } from '../../types/plugins';
import { getPluginManagerService } from '../../src/plugins/services/PluginManagerService';

interface PluginLogsProps {
  plugin?: Plugin;
  showAllPlugins?: boolean;
}

const levelColors: Record<PluginLog['level'], string> = {
  debug: 'text-gray-400',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400'
};

const levelBgColors: Record<PluginLog['level'], string> = {
  debug: 'bg-gray-500/20',
  info: 'bg-blue-500/20',
  warn: 'bg-yellow-500/20',
  error: 'bg-red-500/20'
};

export const PluginLogs: React.FC<PluginLogsProps> = ({
  plugin,
  showAllPlugins = false
}) => {
  const [levelFilter, setLevelFilter] = useState<PluginLog['level'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const manager = getPluginManagerService();

  const logs = useMemo(() => {
    let allLogs: Array<PluginLog & { pluginId: string; pluginName: string }> = [];

    if (showAllPlugins) {
      const plugins = manager.listPlugins();
      for (const p of plugins) {
        const pluginLogs = manager.getPluginLogs(p.id);
        allLogs.push(...pluginLogs.map(log => ({
          ...log,
          pluginId: p.id,
          pluginName: p.manifest.name
        })));
      }
    } else if (plugin) {
      const pluginLogs = manager.getPluginLogs(plugin.id);
      allLogs = pluginLogs.map(log => ({
        ...log,
        pluginId: plugin.id,
        pluginName: plugin.manifest.name
      }));
    }

    // Sort by timestamp descending
    allLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply filters
    return allLogs.filter(log => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(query) ||
          log.pluginName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [plugin, showAllPlugins, levelFilter, searchQuery]);

  const handleClearLogs = () => {
    if (plugin) {
      manager.clearPluginLogs(plugin.id);
    } else if (showAllPlugins) {
      const plugins = manager.listPlugins();
      for (const p of plugins) {
        manager.clearPluginLogs(p.id);
      }
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">
            {showAllPlugins ? 'Logs de Plugins' : `Logs - ${plugin?.manifest.name}`}
          </h3>
          <p className="text-sm text-gray-400">{logs.length} entradas</p>
        </div>
        <button
          onClick={handleClearLogs}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          Limpiar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar en logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as PluginLog['level'] | 'all')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos los niveles</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Logs List */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No hay logs disponibles</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Hora</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Nivel</th>
                  {showAllPlugins && (
                    <th className="px-3 py-2 text-left text-gray-400 font-medium">Plugin</th>
                  )}
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Mensaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-800/50">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      <div className="text-xs">
                        <div>{formatDate(log.timestamp)}</div>
                        <div>{formatTimestamp(log.timestamp)}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs uppercase ${levelBgColors[log.level]} ${levelColors[log.level]}`}>
                        {log.level}
                      </span>
                    </td>
                    {showAllPlugins && (
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                        {log.pluginName}
                      </td>
                    )}
                    <td className="px-3 py-2 text-gray-300">
                      <div className="max-w-md truncate" title={log.message}>
                        {log.message}
                      </div>
                      {log.data && (
                        <pre className="mt-1 text-xs text-gray-500 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
