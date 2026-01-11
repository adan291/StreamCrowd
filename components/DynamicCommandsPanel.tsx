/**
 * DynamicCommandsPanel - Panel para configurar comandos de dinámicas
 * 
 * Permite editar los comandos de control remoto para:
 * - Encuestas (!tv poll)
 * - Sorteos (!tv raffle)
 * - Predicciones (!tv pred)
 * - Torneos (!tv judge)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  BarChart3, 
  Gift, 
  TrendingUp, 
  Trophy,
  ChevronDown,
  ChevronRight,
  Settings,
  Info,
  Save,
  RotateCcw,
  Copy,
  Check,
  HelpCircle
} from 'lucide-react';
import { useI18n } from '../i18n';

// ============================================
// TYPES
// ============================================

interface DynamicCommand {
  id: string;
  name: string;
  description: string;
  usage: string;
  enabled: boolean;
  aliases: string[];
}

interface DynamicCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  commands: DynamicCommand[];
}

interface DynamicCommandsConfig {
  enabled: boolean;
  prefix: string;
  announceInChat: boolean;
  cooldownMs: number;
  categories: Record<string, { enabled: boolean; commands: Record<string, boolean> }>;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: DynamicCommandsConfig = {
  enabled: true,
  prefix: '!tv',
  announceInChat: true,
  cooldownMs: 2000,
  categories: {
    poll: { enabled: true, commands: {} },
    raffle: { enabled: true, commands: {} },
    prediction: { enabled: true, commands: {} },
    judge: { enabled: true, commands: {} },
  },
};

const DYNAMIC_CATEGORIES: DynamicCategory[] = [
  {
    id: 'poll',
    name: 'Encuestas',
    icon: <BarChart3 size={18} />,
    color: '#a855f7',
    commands: [
      { id: 'help', name: 'help', description: 'Ver todos los comandos de encuesta', usage: '!tv poll help', enabled: true, aliases: ['commands', 'cmds'] },
      { id: 'create', name: 'create', description: 'Crear una encuesta', usage: '!tv poll create "Pregunta" op1,op2,op3 [segundos]', enabled: true, aliases: ['new'] },
      { id: 'close', name: 'close', description: 'Cerrar la encuesta activa', usage: '!tv poll close', enabled: true, aliases: ['stop', 'end'] },
      { id: 'results', name: 'results', description: 'Mostrar resultados actuales', usage: '!tv poll results', enabled: true, aliases: ['votes'] },
      { id: 'reset', name: 'reset', description: 'Reiniciar/limpiar encuesta', usage: '!tv poll reset', enabled: true, aliases: ['clear'] },
    ],
  },
  {
    id: 'raffle',
    name: 'Sorteos',
    icon: <Gift size={18} />,
    color: '#3b82f6',
    commands: [
      { id: 'help', name: 'help', description: 'Ver todos los comandos de sorteo', usage: '!tv raffle help', enabled: true, aliases: ['commands', 'cmds'] },
      { id: 'start', name: 'start', description: 'Iniciar un sorteo', usage: '!tv raffle start "Premio" [keyword] [segundos]', enabled: true, aliases: ['new'] },
      { id: 'winner', name: 'winner', description: 'Elegir un ganador', usage: '!tv raffle winner', enabled: true, aliases: ['pick'] },
      { id: 'reroll', name: 'reroll', description: 'Elegir nuevo ganador', usage: '!tv raffle reroll', enabled: true, aliases: ['again'] },
      { id: 'close', name: 'close', description: 'Cerrar el sorteo', usage: '!tv raffle close', enabled: true, aliases: ['stop', 'end'] },
      { id: 'participants', name: 'participants', description: 'Ver participantes', usage: '!tv raffle participants', enabled: true, aliases: ['count', 'p'] },
    ],
  },
  {
    id: 'prediction',
    name: 'Predicciones',
    icon: <TrendingUp size={18} />,
    color: '#06b6d4',
    commands: [
      { id: 'help', name: 'help', description: 'Ver todos los comandos de predicción', usage: '!tv pred help', enabled: true, aliases: ['commands', 'cmds'] },
      { id: 'create', name: 'create', description: 'Crear una predicción', usage: '!tv pred create "Título" op1,op2 [segundos]', enabled: true, aliases: ['new'] },
      { id: 'lock', name: 'lock', description: 'Bloquear predicciones', usage: '!tv pred lock', enabled: true, aliases: ['close'] },
      { id: 'resolve', name: 'resolve', description: 'Resolver con ganador', usage: '!tv pred resolve <número>', enabled: true, aliases: ['winner'] },
      { id: 'cancel', name: 'cancel', description: 'Cancelar predicción', usage: '!tv pred cancel', enabled: true, aliases: [] },
    ],
  },
  {
    id: 'judge',
    name: 'Torneos',
    icon: <Trophy size={18} />,
    color: '#eab308',
    commands: [
      { id: 'help', name: 'help', description: 'Ver todos los comandos de torneo', usage: '!tv judge help', enabled: true, aliases: ['commands', 'cmds'] },
      { id: 'start', name: 'start', description: 'Iniciar torneo', usage: '!tv judge start', enabled: true, aliases: ['begin'] },
      { id: 'pause', name: 'pause', description: 'Pausar torneo', usage: '!tv judge pause', enabled: true, aliases: [] },
      { id: 'resume', name: 'resume', description: 'Reanudar torneo', usage: '!tv judge resume', enabled: true, aliases: ['continue'] },
      { id: 'next', name: 'next', description: 'Siguiente concursante', usage: '!tv judge next', enabled: true, aliases: [] },
      { id: 'prev', name: 'prev', description: 'Concursante anterior', usage: '!tv judge prev', enabled: true, aliases: ['previous'] },
      { id: 'vote', name: 'vote', description: 'Iniciar votación pública', usage: '!tv judge vote [segundos]', enabled: true, aliases: ['voting'] },
      { id: 'winner', name: 'winner', description: 'Declarar ganador', usage: '!tv judge winner', enabled: true, aliases: ['finish'] },
      { id: 'ranking', name: 'ranking', description: 'Ver ranking actual', usage: '!tv judge ranking', enabled: true, aliases: ['rank', 'top'] },
    ],
  },
];

const STORAGE_KEY = 'stream_crowd_dynamic_commands_config';

// ============================================
// COMPONENT
// ============================================

export const DynamicCommandsPanel: React.FC = () => {
  const { t } = useI18n();
  const [config, setConfig] = useState<DynamicCommandsConfig>(DEFAULT_CONFIG);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['poll']));
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (e) {
      console.error('Error loading dynamic commands config:', e);
    }
  }, []);

  // Save config
  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setHasChanges(false);
    } catch (e) {
      console.error('Error saving config:', e);
    }
  }, [config]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  }, []);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Toggle category enabled
  const toggleCategoryEnabled = (categoryId: string) => {
    setConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [categoryId]: {
          ...prev.categories[categoryId],
          enabled: !prev.categories[categoryId]?.enabled,
        },
      },
    }));
    setHasChanges(true);
  };

  // Copy command to clipboard
  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Sparkles size={20} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Comandos de Dinámicas
            </h2>
            <p className="text-sm text-zinc-500">
              Controla encuestas, sorteos, predicciones y torneos desde el chat
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Global Settings */}
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Settings size={16} />
            Configuración General
          </div>

          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Comandos habilitados
            </span>
            <button
              onClick={() => {
                setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
                setHasChanges(true);
              }}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                config.enabled ? 'bg-amber-500' : 'bg-zinc-600'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                config.enabled ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Announce in chat */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Anunciar respuestas en chat
            </span>
            <button
              onClick={() => {
                setConfig(prev => ({ ...prev, announceInChat: !prev.announceInChat }));
                setHasChanges(true);
              }}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                config.announceInChat ? 'bg-green-500' : 'bg-zinc-600'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                config.announceInChat ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Cooldown */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Cooldown (segundos)
            </span>
            <input
              type="number"
              min={0}
              max={60}
              value={config.cooldownMs / 1000}
              onChange={(e) => {
                setConfig(prev => ({ ...prev, cooldownMs: parseInt(e.target.value) * 1000 }));
                setHasChanges(true);
              }}
              className="w-16 px-2 py-1 text-sm text-center rounded-lg bg-zinc-800 border border-zinc-700 text-white"
            />
          </div>
        </div>

        {/* Global Help Command */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <HelpCircle size={18} className="text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-400 mb-1">
                Comando de ayuda global
              </p>
              <p className="text-xs text-zinc-400 mb-2">
                Los usuarios pueden escribir este comando para ver todas las dinámicas disponibles:
              </p>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-zinc-800 rounded text-sm font-mono text-white">
                  !tv help
                </code>
                <button
                  onClick={() => copyCommand('!tv help')}
                  className="p-1 text-zinc-400 hover:text-amber-500 transition-colors"
                >
                  {copiedCommand === '!tv help' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {DYNAMIC_CATEGORIES.map(category => {
            const isExpanded = expandedCategories.has(category.id);
            const categoryConfig = config.categories[category.id] || { enabled: true, commands: {} };

            return (
              <div
                key={category.id}
                className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden"
              >
                {/* Category Header */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-700/50 transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <span style={{ color: category.color }}>{category.icon}</span>
                    </div>
                    <div>
                      <span className="font-medium text-white">
                        {category.name}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500">
                        {category.commands.length} comandos
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategoryEnabled(category.id);
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        categoryConfig.enabled ? 'bg-green-500' : 'bg-zinc-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                        categoryConfig.enabled ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-zinc-400" />
                    ) : (
                      <ChevronRight size={18} className="text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Commands List */}
                {isExpanded && (
                  <div className="border-t border-zinc-700">
                    {category.commands.map((cmd, idx) => (
                      <div
                        key={cmd.id}
                        className={`p-3 ${idx !== category.commands.length - 1 ? 'border-b border-zinc-700/50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <code
                                className="px-2 py-0.5 rounded text-xs font-mono"
                                style={{ 
                                  backgroundColor: `${category.color}15`,
                                  color: category.color 
                                }}
                              >
                                {cmd.usage.split(' ').slice(0, 3).join(' ')}
                              </code>
                              {cmd.aliases.length > 0 && (
                                <span className="text-[10px] text-zinc-400">
                                  alias: {cmd.aliases.join(', ')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400">
                              {cmd.description}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                              {cmd.usage}
                            </p>
                          </div>
                          <button
                            onClick={() => copyCommand(cmd.usage.split(' ').slice(0, 3).join(' '))}
                            className="p-1.5 text-zinc-400 hover:text-zinc-300 transition-colors"
                            title="Copiar comando"
                          >
                            {copiedCommand === cmd.usage.split(' ').slice(0, 3).join(' ') ? (
                              <Check size={14} className="text-green-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-500 mt-0.5" />
            <div className="text-xs text-zinc-400">
              <p className="font-medium mb-1">¿Cómo funcionan?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Solo <strong className="text-zinc-300">mods y el streamer</strong> pueden usar estos comandos</li>
                <li>Todos usan el prefijo <code className="px-1 bg-zinc-700 rounded">!tv</code></li>
                <li>Las respuestas se muestran en el chat si está habilitado</li>
                <li>Escribe <code className="px-1 bg-zinc-700 rounded">!tv help</code> para ver el menú</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {hasChanges && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <RotateCcw size={14} />
              Restablecer
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Save size={14} />
              Guardar cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicCommandsPanel;
