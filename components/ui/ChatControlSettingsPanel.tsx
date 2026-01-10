/**
 * ChatControlSettingsPanel Component
 * 
 * Configuration panel for chat control commands.
 * Allows setting permissions, prefix, and enabling/disabling commands per dynamic.
 * 
 * @module components/ui/ChatControlSettingsPanel
 */

import React, { useState, useCallback } from 'react';
import { 
  Terminal, 
  Shield, 
  Settings, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Info,
  Crown,
  Star,
  Users,
} from 'lucide-react';
import type { 
  ChatControlConfig, 
  DynamicType, 
  PermissionLevel,
  ControlCommand,
  CONTROL_COMMANDS,
} from '../../src/application/services/ChatControlCommandsService';
import { DEFAULT_CONTROL_CONFIG } from '../../src/application/services/ChatControlCommandsService';

// ============================================
// TYPES
// ============================================

export interface ChatControlSettingsPanelProps {
  config: ChatControlConfig;
  onConfigChange: (config: ChatControlConfig) => void;
  className?: string;
  compact?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DYNAMIC_LABELS: Record<DynamicType, { label: string; icon: string; color: string }> = {
  poll: { label: 'Encuestas', icon: '📊', color: 'purple' },
  giveaway: { label: 'Sorteos', icon: '🎁', color: 'amber' },
  prediction: { label: 'Predicciones', icon: '🔮', color: 'blue' },
  judge: { label: 'Torneos', icon: '🏆', color: 'yellow' },
};

const PERMISSION_LABELS: Record<PermissionLevel, { label: string; icon: React.ReactNode }> = {
  broadcaster: { label: 'Solo Streamer', icon: <Crown size={14} className="text-yellow-500" /> },
  moderator: { label: 'Moderadores+', icon: <Shield size={14} className="text-green-500" /> },
  vip: { label: 'VIPs+', icon: <Star size={14} className="text-purple-500" /> },
  subscriber: { label: 'Subs+', icon: <Star size={14} className="text-blue-500" /> },
  everyone: { label: 'Todos', icon: <Users size={14} className="text-zinc-500" /> },
};

const PERMISSION_OPTIONS: PermissionLevel[] = ['broadcaster', 'moderator', 'vip', 'subscriber', 'everyone'];

// ============================================
// COMPONENT
// ============================================

export const ChatControlSettingsPanel: React.FC<ChatControlSettingsPanelProps> = ({
  config,
  onConfigChange,
  className = '',
  compact = false,
}) => {
  const [expandedDynamic, setExpandedDynamic] = useState<DynamicType | null>(null);

  // Update config helper
  const updateConfig = useCallback(<K extends keyof ChatControlConfig>(
    key: K,
    value: ChatControlConfig[K]
  ) => {
    onConfigChange({ ...config, [key]: value });
  }, [config, onConfigChange]);

  // Update permission for a dynamic
  const updatePermission = useCallback((dynamic: DynamicType, permission: PermissionLevel) => {
    updateConfig('allowedPermissions', {
      ...config.allowedPermissions,
      [dynamic]: permission,
    });
  }, [config.allowedPermissions, updateConfig]);

  // Toggle component
  const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; color?: string }> = ({
    enabled,
    onChange,
    color = 'blue',
  }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        enabled ? `bg-${color}-500` : 'bg-zinc-300 dark:bg-zinc-600'
      }`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
        enabled ? 'left-5' : 'left-0.5'
      }`} />
    </button>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Comandos de Control
          </h3>
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Permite controlar las dinámicas desde el chat de Twitch/YouTube/Kick
      </p>

      {/* Main toggle */}
      <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-zinc-400" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Comandos de control habilitados
          </span>
        </div>
        <Toggle enabled={config.enabled} onChange={(v) => updateConfig('enabled', v)} />
      </div>

      {config.enabled && (
        <>
          {/* Prefix */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Prefijo de comandos
            </label>
            <input
              type="text"
              value={config.prefix}
              onChange={(e) => updateConfig('prefix', e.target.value.slice(0, 2))}
              maxLength={2}
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="!"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Los comandos usan el prefijo fijo <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv</code> para evitar conflictos con Twitch
            </p>
          </div>

          {/* Cooldown */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-zinc-400" />
              <div>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Cooldown entre comandos
                </span>
                <p className="text-xs text-zinc-500">
                  {config.cooldownMs / 1000}s entre comandos
                </p>
              </div>
            </div>
            <input
              type="number"
              value={config.cooldownMs / 1000}
              onChange={(e) => updateConfig('cooldownMs', Math.max(0, parseInt(e.target.value) || 0) * 1000)}
              min={0}
              max={60}
              className="w-16 px-2 py-1 text-sm text-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          {/* Announce in chat */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Anunciar acciones en chat
              </span>
            </div>
            <Toggle 
              enabled={config.announceInChat} 
              onChange={(v) => updateConfig('announceInChat', v)} 
            />
          </div>

          {/* Permissions per dynamic */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-500">
              Permisos por dinámica
            </label>
            
            {(Object.keys(DYNAMIC_LABELS) as DynamicType[]).map((dynamic) => {
              const { label, icon, color } = DYNAMIC_LABELS[dynamic];
              const currentPermission = config.allowedPermissions[dynamic];
              const isExpanded = expandedDynamic === dynamic;
              
              return (
                <div
                  key={dynamic}
                  className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl overflow-hidden"
                >
                  {/* Dynamic header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setExpandedDynamic(isExpanded ? null : dynamic)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
                        {PERMISSION_LABELS[currentPermission].icon}
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                          {PERMISSION_LABELS[currentPermission].label}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-zinc-400" />
                      ) : (
                        <ChevronDown size={14} className="text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                      {/* Permission selector */}
                      <div>
                        <label className="block text-xs text-zinc-500 mb-2">
                          ¿Quién puede usar estos comandos?
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {PERMISSION_OPTIONS.map((perm) => (
                            <button
                              key={perm}
                              onClick={() => updatePermission(dynamic, perm)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                                currentPermission === perm
                                  ? `bg-${color}-500/20 border-${color}-500 text-${color}-600 dark:text-${color}-400 border`
                                  : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                              }`}
                            >
                              {PERMISSION_LABELS[perm].icon}
                              <span>{PERMISSION_LABELS[perm].label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Available commands */}
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">
                          Comandos disponibles:
                        </label>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                          {dynamic === 'poll' && (
                            <>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv poll create "Pregunta" op1,op2</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv poll close</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv poll results</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv poll reset</code></p>
                            </>
                          )}
                          {dynamic === 'giveaway' && (
                            <>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle start "Premio" keyword</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle winner</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle reroll</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle close</code></p>
                            </>
                          )}
                          {dynamic === 'prediction' && (
                            <>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv pred create "Titulo" op1,op2</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv pred lock</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv pred resolve 1</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv pred cancel</code></p>
                            </>
                          )}
                          {dynamic === 'judge' && (
                            <>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv judge start</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv judge next</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv judge pause</code></p>
                              <p><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv judge winner</code></p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Info box */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-blue-500 mt-0.5" />
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                <p className="font-medium mb-1">Cómo funcionan los comandos de control:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Todos los comandos usan el prefijo <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv</code> para evitar conflictos con Twitch</li>
                  <li>Formato: <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv [dynamic] [action]</code></li>
                  <li>Usa comillas para textos con espacios: "Mi pregunta"</li>
                  <li>Separa opciones con comas: opcion1,opcion2,opcion3</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get default chat control settings
 */
export function getDefaultChatControlSettings(): ChatControlConfig {
  return { ...DEFAULT_CONTROL_CONFIG };
}

export default ChatControlSettingsPanel;
