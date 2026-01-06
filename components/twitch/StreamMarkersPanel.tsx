/**
 * StreamMarkersPanel - Panel para crear y ver marcadores de stream
 * 
 * Permite crear marcadores durante el stream para facilitar la edición posterior.
 * 
 * @requirements 9.5, 9.6 - Stream Markers management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Flag, Plus, Clock, Video, RefreshCw, AlertCircle, Lock } from 'lucide-react';
import { getTwitchAdapter, StreamMarker } from '../../src/infrastructure/adapters/TwitchAdapter';
import { useI18n } from '../../i18n';

interface StreamMarkersPanelProps {
  token: string;
  broadcasterId: string;
  isOwnChannel: boolean;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StreamMarkersPanel: React.FC<StreamMarkersPanelProps> = ({
  token,
  broadcasterId,
  isOwnChannel,
  onNotification,
}) => {
  const { t } = useI18n();
  const [markers, setMarkers] = useState<StreamMarker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newMarkerDescription, setNewMarkerDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const adapter = getTwitchAdapter();

  const fetchMarkers = useCallback(async () => {
    if (!token || !broadcasterId) {
      setNeedsAuth(true);
      return;
    }
    
    // Don't fetch if we already know we need auth
    if (needsAuth) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const fetchedMarkers = await adapter.getStreamMarkers(token, broadcasterId);
      if (fetchedMarkers) {
        setMarkers(fetchedMarkers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        setNeedsAuth(false);
      } else {
        // No markers found (could be 404 - no VODs or no markers)
        setMarkers([]);
      }
    } catch (err: any) {
      console.error('Error fetching markers:', err);
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.status === 401) {
        setNeedsAuth(true);
        setError('Se requieren permisos adicionales para ver marcadores de stream.');
      } else if (err?.message?.includes('404') || err?.status === 404) {
        // 404 means no VODs with markers - this is normal
        setMarkers([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, broadcasterId, adapter, needsAuth]);

  useEffect(() => {
    if (!needsAuth) {
      fetchMarkers();
    }
  }, [token, broadcasterId]); // Remove fetchMarkers to avoid loop

  const handleCreateMarker = async () => {
    if (!token || !broadcasterId || !isOwnChannel) return;
    
    setIsCreating(true);
    try {
      const marker = await adapter.createStreamMarker(
        token, 
        broadcasterId, 
        newMarkerDescription.trim() || undefined
      );
      
      if (marker) {
        setMarkers(prev => [marker, ...prev]);
        setNewMarkerDescription('');
        setShowCreateForm(false);
        onNotification?.('Marcador creado correctamente', 'success');
      } else {
        onNotification?.('No se pudo crear el marcador. ¿Estás en directo?', 'error');
      }
    } catch (error) {
      console.error('Error creating marker:', error);
      onNotification?.('Error al crear el marcador', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Marcadores de Stream</h3>
        </div>
        <div className="flex items-center gap-2">
          {isOwnChannel && !needsAuth && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
          )}
          <button
            onClick={fetchMarkers}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Authorization Required Message */}
      {needsAuth && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 font-medium">Permisos adicionales requeridos</p>
              <p className="text-yellow-400/70 text-sm mt-1">
                Para ver y crear marcadores de stream, necesitas reconectar tu cuenta de Twitch con el scope <code className="bg-yellow-500/20 px-1 rounded">channel:manage:broadcast</code>.
              </p>
              <p className="text-yellow-400/60 text-xs mt-2">
                Ve a Configuración → Conexiones y reconecta tu cuenta de Twitch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Marker Form */}
      {showCreateForm && isOwnChannel && !needsAuth && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={newMarkerDescription}
              onChange={(e) => setNewMarkerDescription(e.target.value)}
              placeholder="Ej: Momento épico, Clip potencial..."
              maxLength={140}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
            />
            <span className="text-xs text-gray-500 mt-1">
              {newMarkerDescription.length}/140 caracteres
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateMarker}
              disabled={isCreating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isCreating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Flag className="w-4 h-4" />
              )}
              Crear Marcador
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewMarkerDescription('');
              }}
              className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Los marcadores solo se pueden crear mientras estás en directo. 
              Se guardarán en el VOD para facilitar la edición.
            </span>
          </div>
        </div>
      )}

      {/* Markers List */}
      {markers.length > 0 ? (
        <div className="space-y-2">
          {markers.map((marker) => (
            <div 
              key={marker.id}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Flag className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {marker.description || 'Marcador sin descripción'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(marker.positionSeconds)}
                      </span>
                      {marker.videoId && (
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          VOD
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(marker.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : !needsAuth ? (
        <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
          <Flag className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No hay marcadores</p>
          <p className="text-gray-500 text-sm mt-1">
            {isOwnChannel 
              ? 'Crea marcadores durante tu stream para recordar momentos importantes'
              : 'No hay marcadores disponibles para este canal'
            }
          </p>
        </div>
      ) : null}

      {/* Info */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-blue-400 text-sm">
          💡 Los marcadores te ayudan a encontrar momentos específicos en tus VODs 
          para crear clips o highlights más fácilmente.
        </p>
      </div>
    </div>
  );
};

export default StreamMarkersPanel;
