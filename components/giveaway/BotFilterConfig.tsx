/**
 * BotFilterConfig Component
 * Configuration for bot detection and filtering
 */

import React, { useState, useMemo } from 'react';
import { Bot, Shield, Clock, Mail, Plus, X, AlertTriangle, BarChart3 } from 'lucide-react';
import { BotDetectionService } from './services/BotDetectionService';
import type { BotDetectionConfig } from './types';

interface BotFilterConfigProps {
  className?: string;
}

export const BotFilterConfig: React.FC<BotFilterConfigProps> = ({ className = '' }) => {
  const [config, setConfig] = useState<BotDetectionConfig>(() => BotDetectionService.getConfig());
  const [newBot, setNewBot] = useState('');
  const [showKnownBots, setShowKnownBots] = useState(false);

  const stats = useMemo(() => BotDetectionService.getStats(), []);
  const knownBots = useMemo(() => BotDetectionService.getKnownBots(), []);

  const updateConfig = (updates: Partial<BotDetectionConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    BotDetectionService.saveConfig(newConfig);
  };

  const addCustomBot = () => {
    if (!newBot.trim()) return;
    const lower = newBot.toLowerCase().trim();
    if (!config.customBotList.includes(lower)) {
      updateConfig({ customBotList: [...config.customBotList, lower] });
    }
    setNewBot('');
  };

  const removeCustomBot = (bot: string) => {
    updateConfig({ customBotList: config.customBotList.filter(b => b !== bot) });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
        <div className="flex items-center gap-2">
          <Bot size={18} className={config.enabled ? 'text-red-500' : 'text-zinc-400'} />
          <div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Filtro Anti-Bots
            </span>
            {config.enabled && (
              <p className="text-xs text-zinc-500">Activo</p>
            )}
          </div>
        </div>
        <button
          onClick={() => updateConfig({ enabled: !config.enabled })}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            config.enabled ? 'bg-red-500' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            config.enabled ? 'left-5' : 'left-0.5'
          }`} />
        </button>
      </div>

      {config.enabled && (
        <>
          {/* Filter options */}
          <div className="space-y-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            {/* Known bots */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-zinc-400" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Filtrar bots conocidos ({knownBots.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKnownBots(!showKnownBots)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {showKnownBots ? 'Ocultar' : 'Ver lista'}
                </button>
                <button
                  onClick={() => updateConfig({ filterKnownBots: !config.filterKnownBots })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    config.filterKnownBots ? 'bg-red-500' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    config.filterKnownBots ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {showKnownBots && (
              <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {knownBots.map(bot => (
                    <span key={bot} className="px-1.5 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-700 rounded">
                      {bot}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Min account age */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-zinc-400" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Antigüedad mínima de cuenta
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={config.minAccountAge || ''}
                  onChange={e => updateConfig({ minAccountAge: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-16 px-2 py-1 text-sm text-right rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600"
                />
                <span className="text-xs text-zinc-500">días</span>
              </div>
            </div>

            {/* Require verified email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-zinc-400" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Requiere email verificado
                </span>
              </div>
              <button
                onClick={() => updateConfig({ requireVerifiedEmail: !config.requireVerifiedEmail })}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  config.requireVerifiedEmail ? 'bg-red-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  config.requireVerifiedEmail ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </div>
          </div>

          {/* Custom bot list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Lista personalizada ({config.customBotList.length})
              </span>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newBot}
                onChange={e => setNewBot(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomBot()}
                placeholder="Añadir usuario..."
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none"
              />
              <button
                onClick={addCustomBot}
                disabled={!newBot.trim()}
                className="p-2 bg-red-500 text-white rounded-lg disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>

            {config.customBotList.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                {config.customBotList.map(bot => (
                  <span
                    key={bot}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-red-500/20 text-red-600 dark:text-red-400 rounded-full"
                  >
                    {bot}
                    <button onClick={() => removeCustomBot(bot)} className="hover:text-red-800">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          {stats.total > 0 && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Estadísticas de filtrado
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-zinc-500">Verificados</p>
                  <p className="font-medium">{stats.total}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Filtrados</p>
                  <p className="font-medium text-red-500">{stats.filtered}</p>
                </div>
              </div>
              {Object.entries(stats.byReason).length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-1">Por razón:</p>
                  {Object.entries(stats.byReason).map(([reason, count]) => (
                    <p key={reason} className="text-xs text-zinc-600 dark:text-zinc-400">
                      {reason}: {count}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              El filtro de antigüedad y email verificado requiere acceso a la API de Twitch 
              y puede no estar disponible para todos los usuarios.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BotFilterConfig;
