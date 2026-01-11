/**
 * ChatSettingsPanel Component
 * Generic chat settings panel for all activity types
 * Provides command configuration, cooldowns, and prefix settings
 */

import React, { useState, useCallback } from 'react';
import { 
  MessageSquare, Settings, Clock,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import type { CommandDefinition } from '../../hooks/useChatCommands';

// ============================================
// TYPES
// ============================================

export interface ChatSettingsConfig {
  enabled: boolean;
  prefix: string;
  globalCooldownMs: number;
  commands: CommandConfig[];
}

export interface CommandConfig {
  name: string;
  enabled: boolean;
  cooldownMs: number;
  description?: string;
  aliases?: string[];
}

export interface ChatSettingsPanelProps {
  config: ChatSettingsConfig;
  onConfigChange: (config: ChatSettingsConfig) => void;
  activityType: 'poll' | 'prediction' | 'game' | 'giveaway' | 'judge';
  className?: string;
  compact?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const ACTIVITY_COLORS = {
  poll: 'purple',
  prediction: 'blue',
  game: 'green',
  giveaway: 'amber',
  judge: 'yellow',
};

// Comandos de participación para usuarios
const USER_COMMANDS: Record<string, CommandConfig[]> = {
  poll: [
    { name: 'votar', enabled: true, cooldownMs: 5000, description: 'Info de cómo votar (+1, +2, etc.)', aliases: ['vote', 'v'] },
    { name: 'resultados', enabled: true, cooldownMs: 10000, description: 'Ver resultados actuales', aliases: ['results'] },
  ],
  prediction: [
    { name: 'predecir', enabled: true, cooldownMs: 5000, description: 'Hacer una predicción', aliases: ['predict', 'bet'] },
    { name: 'puntos', enabled: true, cooldownMs: 10000, description: 'Ver tus puntos', aliases: ['points'] },
  ],
  game: [
    { name: 'jugar', enabled: true, cooldownMs: 5000, description: 'Unirse al juego', aliases: ['play', 'join'] },
    { name: 'puntuacion', enabled: true, cooldownMs: 10000, description: 'Ver puntuación', aliases: ['score'] },
  ],
  giveaway: [
    { name: 'participar', enabled: true, cooldownMs: 5000, description: 'Participar en el sorteo', aliases: ['join', 'enter'] },
    { name: 'participantes', enabled: true, cooldownMs: 10000, description: 'Ver participantes', aliases: ['participants'] },
  ],
  judge: [
    { name: 'votar', enabled: true, cooldownMs: 5000, description: 'Votar por un participante', aliases: ['vote', 'v'] },
    { name: 'ranking', enabled: true, cooldownMs: 10000, description: 'Ver ranking actual', aliases: ['rank', 'top'] },
  ],
};

// Comandos de control remoto para mods/streamers (prefijo !tv para evitar conflictos)
// Nota: estos comandos NO usan el prefijo configurable, siempre son !tv
const CONTROL_COMMANDS: Record<string, CommandConfig[]> = {
  poll: [
    { name: '!tv poll help', enabled: true, cooldownMs: 2000, description: 'Ver todos los comandos de encuesta', aliases: ['!tv poll commands'] },
    { name: '!tv poll create', enabled: true, cooldownMs: 2000, description: 'Crear encuesta: !tv poll create "Pregunta" op1,op2,op3 [seg]', aliases: [] },
    { name: '!tv poll close', enabled: true, cooldownMs: 2000, description: 'Cerrar encuesta activa', aliases: ['!tv poll stop', '!tv poll end'] },
    { name: '!tv poll results', enabled: true, cooldownMs: 2000, description: 'Mostrar resultados', aliases: ['!tv poll votes'] },
    { name: '!tv poll reset', enabled: true, cooldownMs: 2000, description: 'Reiniciar encuesta', aliases: ['!tv poll clear'] },
  ],
  prediction: [
    { name: '!tv pred help', enabled: true, cooldownMs: 2000, description: 'Ver todos los comandos de predicción', aliases: ['!tv pred commands'] },
    { name: '!tv pred create', enabled: true, cooldownMs: 2000, description: 'Crear predicción: !tv pred create "Título" op1,op2 [seg]', aliases: ['!tv pred new'] },
    { name: '!tv pred lock', enabled: true, cooldownMs: 2000, description: 'Bloquear predicciones', aliases: ['!tv pred close'] },
    { name: '!tv pred resolve', enabled: true, cooldownMs: 2000, description: 'Resolver: !tv pred resolve <num>', aliases: ['!tv pred winner'] },
    { name: '!tv pred cancel', enabled: true, cooldownMs: 2000, description: 'Cancelar predicción', aliases: [] },
  ],
  game: [],
  giveaway: [
    { name: '!tv raffle help', enabled: true, cooldownMs: 2000, description: 'Ver todos los comandos de sorteo', aliases: ['!tv raffle commands'] },
    { name: '!tv raffle start', enabled: true, cooldownMs: 2000, description: 'Iniciar sorteo: !tv raffle start "Premio" [keyword] [seg]', aliases: ['!tv raffle new'] },
    { name: '!tv raffle winner', enabled: true, cooldownMs: 2000, description: 'Elegir ganador', aliases: ['!tv raffle pick'] },
    { name: '!tv raffle reroll', enabled: true, cooldownMs: 2000, description: 'Elegir nuevo ganador', aliases: ['!tv raffle again'] },
    { name: '!tv raffle close', enabled: true, cooldownMs: 2000, description: 'Cerrar sorteo', aliases: ['!tv raffle stop', '!tv raffle end'] },
    { name: '!tv raffle participants', enabled: true, cooldownMs: 2000, description: 'Ver participantes', aliases: ['!tv raffle count'] },
  ],
  judge: [
    { name: '!tv judge help', enabled: true, cooldownMs: 2000, description: 'Ver todos los comandos de torneo', aliases: ['!tv judge commands'] },
    { name: '!tv judge start', enabled: true, cooldownMs: 2000, description: 'Iniciar torneo', aliases: ['!tv judge begin'] },
    { name: '!tv judge pause', enabled: true, cooldownMs: 2000, description: 'Pausar torneo', aliases: [] },
    { name: '!tv judge resume', enabled: true, cooldownMs: 2000, description: 'Reanudar torneo', aliases: ['!tv judge continue'] },
    { name: '!tv judge next', enabled: true, cooldownMs: 2000, description: 'Siguiente concursante', aliases: [] },
    { name: '!tv judge prev', enabled: true, cooldownMs: 2000, description: 'Concursante anterior', aliases: ['!tv judge previous'] },
    { name: '!tv judge vote', enabled: true, cooldownMs: 2000, description: 'Iniciar votación: !tv judge vote [seg]', aliases: ['!tv judge voting'] },
    { name: '!tv judge winner', enabled: true, cooldownMs: 2000, description: 'Declarar ganador', aliases: ['!tv judge finish'] },
    { name: '!tv judge ranking', enabled: true, cooldownMs: 2000, description: 'Ver ranking', aliases: ['!tv judge rank', '!tv judge top'] },
  ],
};

// Combinar comandos de usuario y control
const DEFAULT_COMMANDS: Record<string, CommandConfig[]> = {
  poll: [...USER_COMMANDS.poll, ...CONTROL_COMMANDS.poll],
  prediction: [...USER_COMMANDS.prediction, ...CONTROL_COMMANDS.prediction],
  game: [...USER_COMMANDS.game, ...CONTROL_COMMANDS.game],
  giveaway: [...USER_COMMANDS.giveaway, ...CONTROL_COMMANDS.giveaway],
  judge: [...USER_COMMANDS.judge, ...CONTROL_COMMANDS.judge],
};

// ============================================
// COMPONENT
// ============================================

export const ChatSettingsPanel: React.FC<ChatSettingsPanelProps> = ({
  config,
  onConfigChange,
  activityType,
  className = '',
  compact = false,
}) => {
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);
  const color = ACTIVITY_COLORS[activityType];
  
  // Always use default commands to ensure they're up to date
  // User preferences (enabled, cooldown) are merged from config
  const displayCommands = DEFAULT_COMMANDS[activityType].map(defaultCmd => {
    const savedCmd = config.commands.find(c => c.name === defaultCmd.name);
    return savedCmd ? { ...defaultCmd, enabled: savedCmd.enabled, cooldownMs: savedCmd.cooldownMs } : defaultCmd;
  });

  // Update config helper
  const updateConfig = useCallback(<K extends keyof ChatSettingsConfig>(
    key: K,
    value: ChatSettingsConfig[K]
  ) => {
    onConfigChange({ ...config, [key]: value });
  }, [config, onConfigChange]);

  // Update command helper
  const updateCommand = useCallback((commandName: string, updates: Partial<CommandConfig>) => {
    const newCommands = displayCommands.map(cmd =>
      cmd.name === commandName ? { ...cmd, ...updates } : cmd
    );
    updateConfig('commands', newCommands);
  }, [displayCommands, updateConfig]);

  // Toggle component
  const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; color?: string }> = ({
    enabled,
    onChange,
    color: toggleColor = color,
  }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        enabled ? `bg-${toggleColor}-500` : 'bg-zinc-300 dark:bg-zinc-600'
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
          <MessageSquare className={`w-5 h-5 text-${color}-500`} />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Configuración de Chat
          </h3>
        </div>
      )}

      {/* Main toggle */}
      <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-zinc-400" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Comandos habilitados
          </span>
        </div>
        <Toggle enabled={config.enabled} onChange={(v: boolean) => updateConfig('enabled', v)} />
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('prefix', e.target.value.slice(0, 2))}
              maxLength={2}
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="!"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Ejemplo: {config.prefix}{displayCommands[0]?.name || 'comando'}
            </p>
          </div>

          {/* Global cooldown */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-zinc-400" />
              <div>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Cooldown global
                </span>
                <p className="text-xs text-zinc-500">
                  {config.globalCooldownMs / 1000}s entre comandos
                </p>
              </div>
            </div>
            <input
              type="number"
              value={config.globalCooldownMs / 1000}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('globalCooldownMs', Math.max(0, parseInt(e.target.value) || 0) * 1000)}
              min={0}
              max={300}
              className="w-16 px-2 py-1 text-sm text-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          {/* Commands list */}
          <div className="space-y-4">
            {/* User commands section */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-500">
                📝 Comandos para usuarios
              </label>
              
              {displayCommands.filter((cmd: CommandConfig) => !cmd.name.startsWith('!tv')).map((cmd: CommandConfig) => (
                <div
                  key={cmd.name}
                  className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl overflow-hidden"
                >
                  {/* Command header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setExpandedCommand(expandedCommand === cmd.name ? null : cmd.name)}
                  >
                    <div className="flex items-center gap-2">
                      <code className={`px-2 py-0.5 text-xs rounded bg-${color}-500/10 text-${color}-600 dark:text-${color}-400`}>
                        {config.prefix}{cmd.name}
                      </code>
                      {cmd.description && (
                        <span className="text-xs text-zinc-500 hidden sm:inline">
                          {cmd.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle
                        enabled={cmd.enabled}
                        onChange={(v: boolean) => {
                          updateCommand(cmd.name, { enabled: v });
                        }}
                      />
                      {expandedCommand === cmd.name ? (
                        <ChevronUp size={14} className="text-zinc-400" />
                      ) : (
                        <ChevronDown size={14} className="text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedCommand === cmd.name && (
                    <div className="px-3 pb-3 pt-1 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                      {/* Description */}
                      {cmd.description && (
                        <p className="text-xs text-zinc-500 sm:hidden">
                          {cmd.description}
                        </p>
                      )}

                      {/* Aliases */}
                      {cmd.aliases && cmd.aliases.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Alias:</span>
                          <div className="flex gap-1 flex-wrap">
                            {cmd.aliases.map((alias: string) => (
                              <code
                                key={alias}
                                className="px-1.5 py-0.5 text-xs rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                              >
                                {config.prefix}{alias}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cooldown */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Cooldown específico:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={cmd.cooldownMs / 1000}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCommand(cmd.name, {
                              cooldownMs: Math.max(0, parseInt(e.target.value) || 0) * 1000
                            })}
                            min={0}
                            max={300}
                            className="w-14 px-2 py-1 text-xs text-center rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                          />
                          <span className="text-xs text-zinc-500">seg</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Control commands section (for mods/streamers) */}
            {displayCommands.filter((cmd: CommandConfig) => cmd.name.startsWith('!tv')).length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-500">
                  🎮 Comandos de control (mods/streamer)
                </label>
                
                {displayCommands.filter((cmd: CommandConfig) => cmd.name.startsWith('!tv')).map((cmd: CommandConfig) => (
                  <div
                    key={cmd.name}
                    className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl overflow-hidden"
                  >
                    {/* Command header - compact, responsive */}
                    <div
                      className="flex items-center justify-between gap-2 p-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => setExpandedCommand(expandedCommand === cmd.name ? null : cmd.name)}
                    >
                      <code className={`px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 truncate min-w-0`}>
                        {cmd.name}
                      </code>
                      <div className="flex items-center gap-2 shrink-0">
                        <Toggle
                          enabled={cmd.enabled}
                          onChange={(v: boolean) => {
                            updateCommand(cmd.name, { enabled: v });
                          }}
                        />
                        {expandedCommand === cmd.name ? (
                          <ChevronUp size={14} className="text-zinc-400" />
                        ) : (
                          <ChevronDown size={14} className="text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {expandedCommand === cmd.name && (
                      <div className="px-3 pb-3 pt-1 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                        {/* Description */}
                        {cmd.description && (
                          <p className="text-xs text-zinc-500">
                            {cmd.description}
                          </p>
                        )}

                        {/* Aliases */}
                        {cmd.aliases && cmd.aliases.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Alias:</span>
                            <div className="flex gap-1 flex-wrap">
                              {cmd.aliases.map((alias: string) => (
                                <code
                                  key={alias}
                                  className="px-1.5 py-0.5 text-xs rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                                >
                                  {alias}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cooldown */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Cooldown:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={cmd.cooldownMs / 1000}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCommand(cmd.name, {
                                cooldownMs: Math.max(0, parseInt(e.target.value) || 0) * 1000
                              })}
                              min={0}
                              max={300}
                              className="w-14 px-2 py-1 text-xs text-center rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                            />
                            <span className="text-xs text-zinc-500">seg</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className={`p-3 bg-${color}-500/10 border border-${color}-500/20 rounded-xl`}>
            <div className="flex items-start gap-2">
              <Info size={14} className={`text-${color}-500 mt-0.5`} />
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                <p className="font-medium mb-1">Tipos de comandos:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li><strong>📝 Usuarios:</strong> Para que el chat participe</li>
                  <li><strong>🎮 Control:</strong> Solo mods/streamer pueden controlar</li>
                </ul>
                <div className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">💡 Comando de ayuda:</p>
                  <p className="text-zinc-500">
                    Escribe <code className="px-1 bg-zinc-200 dark:bg-zinc-700 rounded">!tv help</code> en el chat para ver todos los comandos disponibles.
                  </p>
                </div>
                {activityType === 'poll' && (
                  <div className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">💡 Votación:</p>
                    <p className="text-zinc-500">Los usuarios votan con <code className="px-1 bg-zinc-200 dark:bg-zinc-700 rounded">+1</code>, <code className="px-1 bg-zinc-200 dark:bg-zinc-700 rounded">+2</code>, etc. o con palabras clave si las configuras.</p>
                  </div>
                )}
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
 * Get default chat settings for an activity type
 */
export function getDefaultChatSettings(activityType: keyof typeof DEFAULT_COMMANDS): ChatSettingsConfig {
  return {
    enabled: true,
    prefix: '!',
    globalCooldownMs: 3000,
    commands: DEFAULT_COMMANDS[activityType] || [],
  };
}

/**
 * Get only user commands for an activity type
 */
export function getUserCommands(activityType: keyof typeof USER_COMMANDS): CommandConfig[] {
  return USER_COMMANDS[activityType] || [];
}

/**
 * Get only control commands for an activity type (mods/streamer)
 */
export function getControlCommands(activityType: keyof typeof CONTROL_COMMANDS): CommandConfig[] {
  return CONTROL_COMMANDS[activityType] || [];
}

/**
 * Convert ChatSettingsConfig to CommandDefinition array for useChatCommands
 */
export function toCommandDefinitions(config: ChatSettingsConfig): CommandDefinition[] {
  if (!config.enabled) return [];
  
  return config.commands.map(cmd => ({
    name: cmd.name,
    aliases: cmd.aliases,
    enabled: cmd.enabled,
    cooldownMs: cmd.cooldownMs,
    description: cmd.description,
  }));
}

export default ChatSettingsPanel;
