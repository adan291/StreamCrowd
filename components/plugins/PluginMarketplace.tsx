// Plugin Marketplace - Lista de plugins recomendados
import React, { useState } from 'react';
import { usePlugins } from '../../hooks/usePlugins';
import { PluginManifest, PERMISSION_DESCRIPTIONS } from '../../types/plugins';

interface MarketplacePlugin {
  manifest: PluginManifest;
  downloadUrl: string;
  downloads: number;
  rating: number;
  featured?: boolean;
}

// Plugins de ejemplo (hardcoded inicial)
const MARKETPLACE_PLUGINS: MarketplacePlugin[] = [
  {
    manifest: {
      id: 'auto-shoutout',
      name: 'Auto Shoutout',
      version: '1.0.0',
      description: 'Envía shoutouts automáticos cuando un streamer te hace raid',
      author: 'TwitchVote',
      minAppVersion: '1.0.0',
      permissions: ['commands', 'notifications'],
      main: 'index.js'
    },
    downloadUrl: 'https://plugins.twitchvote.com/auto-shoutout.zip',
    downloads: 1250,
    rating: 4.8,
    featured: true
  },
  {
    manifest: {
      id: 'poll-sounds',
      name: 'Poll Sounds',
      version: '1.2.0',
      description: 'Reproduce sonidos personalizados cuando se crean o finalizan encuestas',
      author: 'TwitchVote',
      minAppVersion: '1.0.0',
      permissions: ['polls:read', 'storage'],
      main: 'index.js'
    },
    downloadUrl: 'https://plugins.twitchvote.com/poll-sounds.zip',
    downloads: 890,
    rating: 4.5
  },
  {
    manifest: {
      id: 'prediction-stats',
      name: 'Prediction Stats',
      version: '2.0.0',
      description: 'Muestra estadísticas detalladas de predicciones y rankings de usuarios',
      author: 'Community',
      minAppVersion: '1.0.0',
      permissions: ['predictions:read', 'ui:panel', 'storage'],
      main: 'index.js'
    },
    downloadUrl: 'https://plugins.twitchvote.com/prediction-stats.zip',
    downloads: 2100,
    rating: 4.9,
    featured: true
  },
  {
    manifest: {
      id: 'timer-alerts',
      name: 'Timer Alerts',
      version: '1.1.0',
      description: 'Alertas visuales y sonoras para timers con overlays personalizables',
      author: 'Community',
      minAppVersion: '1.0.0',
      permissions: ['timers:read', 'ui:overlay', 'notifications'],
      main: 'index.js'
    },
    downloadUrl: 'https://plugins.twitchvote.com/timer-alerts.zip',
    downloads: 650,
    rating: 4.3
  },
  {
    manifest: {
      id: 'giveaway-wheel',
      name: 'Giveaway Wheel',
      version: '1.0.0',
      description: 'Ruleta animada para sorteos con efectos visuales',
      author: 'Community',
      minAppVersion: '1.0.0',
      permissions: ['giveaways:read', 'ui:overlay'],
      main: 'index.js'
    },
    downloadUrl: 'https://plugins.twitchvote.com/giveaway-wheel.zip',
    downloads: 1800,
    rating: 4.7
  }
];

interface PluginMarketplaceProps {
  onInstallComplete?: () => void;
}

export const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({
  onInstallComplete
}) => {
  const { hasPlugin, installFromURL } = usePlugins();
  const [searchQuery, setSearchQuery] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'featured'>('all');

  const filteredPlugins = MARKETPLACE_PLUGINS.filter(plugin => {
    if (filter === 'featured' && !plugin.featured) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        plugin.manifest.name.toLowerCase().includes(query) ||
        plugin.manifest.description.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleInstall = async (plugin: MarketplacePlugin) => {
    setInstalling(plugin.manifest.id);
    try {
      const result = await installFromURL(plugin.downloadUrl);
      if (result.success) {
        onInstallComplete?.();
      } else {
        alert(`Error instalando: ${result.error}`);
      }
    } finally {
      setInstalling(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-xs text-gray-400 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Marketplace</h2>
        <p className="text-sm text-gray-400">Descubre plugins para extender TwitchVote</p>
      </div>

      {/* Search & Filter */}
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
          onChange={(e) => setFilter(e.target.value as 'all' | 'featured')}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos</option>
          <option value="featured">Destacados</option>
        </select>
      </div>

      {/* Plugin Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredPlugins.map(plugin => {
          const isInstalled = hasPlugin(plugin.manifest.id);
          const isInstalling = installing === plugin.manifest.id;

          return (
            <div
              key={plugin.manifest.id}
              className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{plugin.manifest.name}</h3>
                    {plugin.featured && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                        Destacado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    v{plugin.manifest.version} • Por {plugin.manifest.author}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {plugin.manifest.description}
              </p>

              {/* Permissions */}
              <div className="flex flex-wrap gap-1 mb-3">
                {plugin.manifest.permissions.slice(0, 3).map(perm => (
                  <span
                    key={perm}
                    className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                    title={PERMISSION_DESCRIPTIONS[perm]}
                  >
                    {perm}
                  </span>
                ))}
                {plugin.manifest.permissions.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                    +{plugin.manifest.permissions.length - 3}
                  </span>
                )}
              </div>

              {/* Stats & Action */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {renderStars(plugin.rating)}
                  <span className="text-xs text-gray-500">
                    {plugin.downloads.toLocaleString()} descargas
                  </span>
                </div>

                {isInstalled ? (
                  <span className="px-3 py-1.5 bg-green-500/20 text-green-400 text-sm rounded-lg">
                    Instalado
                  </span>
                ) : (
                  <button
                    onClick={() => handleInstall(plugin)}
                    disabled={isInstalling}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isInstalling && (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    )}
                    Instalar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No se encontraron plugins</p>
        </div>
      )}
    </div>
  );
};
