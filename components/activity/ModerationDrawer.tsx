/**
 * ModerationDrawer - Drawer/modal para acciones de moderación
 * 
 * Proporciona una interfaz para ejecutar acciones de moderación como
 * timeout, ban/unban, y gestión de VIP con opciones de duración y razón.
 * 
 * @requirements 7.2 - Acciones de moderación en drawer/modal
 */

import React, { useState, useCallback } from 'react';
import {
  X,
  Clock,
  Ban,
  Crown,
  User,
  ExternalLink,
  AlertTriangle,
  Check,
  Loader2,
  MessageSquare,
} from 'lucide-react';

/**
 * User data for moderation
 */
export interface ModerationUser {
  userId: string;
  username: string;
  displayName?: string;
}

/**
 * Props for the ModerationDrawer component
 */
export interface ModerationDrawerProps {
  /** User to moderate */
  user: ModerationUser | null;
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Callback for timeout action */
  onTimeout: (userId: string, duration: number, reason?: string) => Promise<void>;
  /** Callback for ban action */
  onBan: (userId: string, reason?: string) => Promise<void>;
  /** Callback for unban action */
  onUnban: (userId: string) => Promise<void>;
  /** Callback for add VIP action */
  onAddVIP: (userId: string) => Promise<void>;
  /** Callback for remove VIP action */
  onRemoveVIP: (userId: string) => Promise<void>;
  /** Channel name for external links */
  channelName?: string;
  /** Whether the user is currently a VIP */
  isVip?: boolean;
  /** Whether the user is currently banned */
  isBanned?: boolean;
}

/**
 * Preset timeout durations
 */
const TIMEOUT_PRESETS = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '1h', seconds: 3600 },
  { label: '24h', seconds: 86400 },
];

/**
 * Custom duration units
 */
type DurationUnit = 'seconds' | 'minutes' | 'hours' | 'days';

const DURATION_UNITS: { value: DurationUnit; label: string; multiplier: number }[] = [
  { value: 'seconds', label: 'Segundos', multiplier: 1 },
  { value: 'minutes', label: 'Minutos', multiplier: 60 },
  { value: 'hours', label: 'Horas', multiplier: 3600 },
  { value: 'days', label: 'Días', multiplier: 86400 },
];


/**
 * Action result state
 */
interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * ModerationDrawer component - provides moderation actions interface
 */
export const ModerationDrawer: React.FC<ModerationDrawerProps> = ({
  user,
  isOpen,
  onClose,
  onTimeout,
  onBan,
  onUnban,
  onAddVIP,
  onRemoveVIP,
  channelName,
  isVip = false,
  isBanned = false,
}) => {
  // State
  const [activeAction, setActiveAction] = useState<'timeout' | 'ban' | 'vip' | null>(null);
  const [customDuration, setCustomDuration] = useState<number>(5);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('minutes');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  // Reset state when drawer closes or user changes
  const resetState = useCallback(() => {
    setActiveAction(null);
    setCustomDuration(5);
    setDurationUnit('minutes');
    setReason('');
    setLoading(false);
    setResult(null);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Calculate total seconds from custom duration
  const getCustomSeconds = useCallback((): number => {
    const unit = DURATION_UNITS.find(u => u.value === durationUnit);
    return customDuration * (unit?.multiplier || 60);
  }, [customDuration, durationUnit]);

  // Handle timeout with preset duration
  const handlePresetTimeout = useCallback(async (seconds: number) => {
    if (!user) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      await onTimeout(user.userId, seconds, reason || undefined);
      setResult({ success: true, message: `Timeout aplicado: ${formatDuration(seconds)}` });
    } catch (err) {
      setResult({ success: false, message: 'Error al aplicar timeout' });
    } finally {
      setLoading(false);
    }
  }, [user, onTimeout, reason]);

  // Handle custom timeout
  const handleCustomTimeout = useCallback(async () => {
    if (!user) return;
    
    const seconds = getCustomSeconds();
    setLoading(true);
    setResult(null);
    
    try {
      await onTimeout(user.userId, seconds, reason || undefined);
      setResult({ success: true, message: `Timeout aplicado: ${formatDuration(seconds)}` });
    } catch (err) {
      setResult({ success: false, message: 'Error al aplicar timeout' });
    } finally {
      setLoading(false);
    }
  }, [user, onTimeout, reason, getCustomSeconds]);

  // Handle ban
  const handleBan = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      await onBan(user.userId, reason || undefined);
      setResult({ success: true, message: 'Usuario baneado permanentemente' });
    } catch (err) {
      setResult({ success: false, message: 'Error al banear usuario' });
    } finally {
      setLoading(false);
    }
  }, [user, onBan, reason]);

  // Handle unban
  const handleUnban = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      await onUnban(user.userId);
      setResult({ success: true, message: 'Usuario desbaneado' });
    } catch (err) {
      setResult({ success: false, message: 'Error al desbanear usuario' });
    } finally {
      setLoading(false);
    }
  }, [user, onUnban]);

  // Handle VIP toggle
  const handleVIPToggle = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      if (isVip) {
        await onRemoveVIP(user.userId);
        setResult({ success: true, message: 'VIP removido' });
      } else {
        await onAddVIP(user.userId);
        setResult({ success: true, message: 'VIP otorgado' });
      }
    } catch (err) {
      setResult({ success: false, message: `Error al ${isVip ? 'remover' : 'otorgar'} VIP` });
    } finally {
      setLoading(false);
    }
  }, [user, isVip, onAddVIP, onRemoveVIP]);

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  if (!isOpen || !user) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-80 max-w-full bg-zinc-900 border-l border-zinc-700 z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
              <User className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-200">
                {user.displayName || user.username}
              </h3>
              <p className="text-[10px] text-zinc-500">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* External links */}
        {channelName && (
          <div className="px-4 py-2 border-b border-zinc-700/50">
            <a
              href={`https://www.twitch.tv/popout/${channelName}/viewercard/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] text-purple-400 hover:text-purple-300"
            >
              <ExternalLink size={12} />
              Abrir Viewer Card en Twitch
            </a>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Result message */}
          {result && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              result.success 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {result.success ? (
                <Check size={16} className="text-green-400" />
              ) : (
                <AlertTriangle size={16} className="text-red-400" />
              )}
              <span className={`text-xs ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </span>
            </div>
          )}

          {/* Reason input */}
          <div>
            <label htmlFor="moderation-reason" className="block text-[10px] text-zinc-500 mb-1">
              Razón (opcional)
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                id="moderation-reason"
                name="moderation-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo de la acción..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* Timeout section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-orange-400" />
              <span className="text-xs font-bold text-zinc-300">Timeout</span>
            </div>
            
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5">
              {TIMEOUT_PRESETS.map((preset) => (
                <button
                  key={preset.seconds}
                  onClick={() => handlePresetTimeout(preset.seconds)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom duration */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="timeout-duration"
                name="timeout-duration"
                aria-label="Duración del timeout"
                value={customDuration}
                onChange={(e) => setCustomDuration(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-20 px-2 py-1.5 text-xs bg-zinc-800/50 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
              <select
                id="timeout-duration-unit"
                name="timeout-duration-unit"
                aria-label="Unidad de tiempo del timeout"
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                className="flex-1 px-2 py-1.5 text-xs bg-zinc-800/50 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-zinc-600"
              >
                {DURATION_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCustomTimeout}
                disabled={loading}
                className="px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar'}
              </button>
            </div>
          </div>

          {/* Ban section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Ban size={14} className="text-red-400" />
              <span className="text-xs font-bold text-zinc-300">Ban</span>
            </div>
            
            <div className="flex gap-2">
              {isBanned ? (
                <button
                  onClick={handleUnban}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Desbanear
                </button>
              ) : (
                <button
                  onClick={handleBan}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                  Ban permanente
                </button>
              )}
            </div>
            
            {!isBanned && (
              <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                <AlertTriangle size={10} />
                Esta acción es permanente hasta que se desbanee manualmente
              </p>
            )}
          </div>

          {/* VIP section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Crown size={14} className="text-pink-400" />
              <span className="text-xs font-bold text-zinc-300">VIP</span>
            </div>
            
            <button
              onClick={handleVIPToggle}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg disabled:opacity-50 transition-colors ${
                isVip
                  ? 'bg-zinc-700/50 border border-zinc-600 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20'
              }`}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Crown size={14} />
              )}
              {isVip ? 'Quitar VIP' : 'Dar VIP'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-zinc-700">
          <button
            onClick={handleClose}
            className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
};

export default ModerationDrawer;
