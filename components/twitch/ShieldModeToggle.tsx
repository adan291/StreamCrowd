/**
 * ShieldModeToggle - Toggle para activar/desactivar Shield Mode
 * 
 * Shield Mode es una función de Twitch que restringe el chat durante situaciones de acoso.
 * 
 * @requirements 9.7, 9.8 - Shield Mode toggle
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, Clock, Lock } from 'lucide-react';
import { getTwitchAdapter, ShieldModeStatus } from '../../src/infrastructure/adapters/TwitchAdapter';
import { useI18n } from '../../i18n';

interface ShieldModeToggleProps {
  token: string;
  broadcasterId: string;
  moderatorId: string;
  isOwnChannel: boolean;
  isModerator: boolean;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ShieldModeToggle: React.FC<ShieldModeToggleProps> = ({
  token,
  broadcasterId,
  moderatorId,
  isOwnChannel,
  isModerator,
  onNotification,
}) => {
  const { t } = useI18n();
  const [status, setStatus] = useState<ShieldModeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const adapter = getTwitchAdapter();
  const canToggle = isOwnChannel || isModerator;

  const fetchStatus = useCallback(async () => {
    if (!token || !broadcasterId || !moderatorId) {
      setNeedsAuth(true);
      return;
    }
    
    // Don't fetch if we already know we need auth
    if (needsAuth) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const shieldStatus = await adapter.getShieldModeStatus(token, broadcasterId, moderatorId);
      if (shieldStatus) {
        setStatus(shieldStatus);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Error fetching Shield Mode status:', err);
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.status === 401) {
        setNeedsAuth(true);
        setError('Se requieren permisos adicionales para ver el estado del Shield Mode.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, broadcasterId, moderatorId, adapter, needsAuth]);

  useEffect(() => {
    if (!needsAuth) {
      fetchStatus();
    }
    
    // Poll for updates every 30 seconds (only if we have auth)
    const interval = !needsAuth ? setInterval(fetchStatus, 30000) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [token, broadcasterId, moderatorId]); // Remove fetchStatus to avoid loop

  const handleToggle = async () => {
    if (!token || !broadcasterId || !moderatorId || !canToggle || isToggling) return;
    
    const newState = !status?.isActive;
    setIsToggling(true);
    
    try {
      const success = await adapter.updateShieldMode(token, broadcasterId, moderatorId, newState);
      
      if (success) {
        setStatus(prev => prev ? { ...prev, isActive: newState } : null);
        onNotification?.(
          newState ? 'Shield Mode activado' : 'Shield Mode desactivado',
          'success'
        );
      } else {
        onNotification?.('No se pudo cambiar el Shield Mode', 'error');
      }
    } catch (error) {
      console.error('Error toggling Shield Mode:', error);
      onNotification?.('Error al cambiar Shield Mode', 'error');
    } finally {
      setIsToggling(false);
    }
  };

  const formatLastActivated = (date?: Date): string => {
    if (!date) return 'Nunca';
    
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
          <Shield className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Shield Mode</h3>
        </div>
        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Authorization Required Message */}
      {needsAuth && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 font-medium">Permisos adicionales requeridos</p>
              <p className="text-yellow-400/70 text-sm mt-1">
                Para ver y controlar el Shield Mode, necesitas reconectar tu cuenta de Twitch con el scope <code className="bg-yellow-500/20 px-1 rounded">moderator:read:shield_mode</code>.
              </p>
              <p className="text-yellow-400/60 text-xs mt-2">
                Ve a Configuración → Conexiones y reconecta tu cuenta de Twitch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      {!needsAuth && (
      <div className={`p-4 rounded-xl border transition-all ${
        status?.isActive 
          ? 'bg-blue-500/10 border-blue-500/30' 
          : 'bg-white/5 border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status?.isActive ? (
              <div className="p-3 rounded-xl bg-blue-500/20">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/10">
                <ShieldAlert className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-white font-medium">
                {status?.isActive ? 'Shield Mode Activo' : 'Shield Mode Inactivo'}
              </p>
              <p className="text-sm text-gray-400">
                {status?.isActive 
                  ? 'El chat está protegido con restricciones adicionales'
                  : 'El chat funciona con normalidad'
                }
              </p>
            </div>
          </div>

          {/* Toggle Button */}
          {canToggle && (
            <button
              onClick={handleToggle}
              disabled={isToggling || isLoading}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                status?.isActive 
                  ? 'bg-blue-500' 
                  : 'bg-white/20'
              } ${isToggling ? 'opacity-50' : ''}`}
            >
              <span 
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  status?.isActive ? 'left-8' : 'left-1'
                }`}
              />
            </button>
          )}
        </div>

        {/* Last Activated Info */}
        {status?.lastActivatedAt && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Última activación: {formatLastActivated(status.lastActivatedAt)}</span>
            {status.moderatorLogin && (
              <span className="text-gray-500">por {status.moderatorLogin}</span>
            )}
          </div>
        )}
      </div>
      )}

      {/* Shield Mode Info */}
      {!needsAuth && (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-400">¿Qué hace Shield Mode?</h4>
        <div className="grid gap-2">
          {[
            { icon: '🛡️', text: 'Bloquea mensajes de cuentas no verificadas' },
            { icon: '⏱️', text: 'Activa modo lento automáticamente' },
            { icon: '🚫', text: 'Bloquea términos potencialmente dañinos' },
            { icon: '👥', text: 'Solo permite chatear a seguidores antiguos' },
          ].map((item, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm text-gray-300">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Warning */}
      {!canToggle && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-400 text-sm">
            Solo el broadcaster y los moderadores pueden activar/desactivar Shield Mode.
          </p>
        </div>
      )}

      {/* Tip */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-blue-400 text-sm">
          💡 Activa Shield Mode cuando experimentes acoso o raids negativos. 
          Puedes configurar las restricciones específicas en el panel de moderación de Twitch.
        </p>
      </div>
    </div>
  );
};

export default ShieldModeToggle;
