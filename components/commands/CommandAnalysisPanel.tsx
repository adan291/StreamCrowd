/**
 * CommandAnalysisPanel Component
 * 
 * Displays AI-powered analysis of commands including:
 * - Duplicate/similar command detection
 * - Optimization suggestions
 * - New command recommendations
 * - Usage statistics
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  BarChart3,
  AlertTriangle,
  Lightbulb,
  Copy,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  Sparkles,
  TrendingUp,
  AlertCircle,
  FileText,
  Plus,
} from 'lucide-react';
import { aiCommandService } from '../../src/application/services/AICommandService';
import type { CommandAnalysis, CommandSuggestion } from '../../types/commandEditor';
import type { ExportedCommand } from '../../types/commandExport';

interface CommandAnalysisPanelProps {
  /** Commands to analyze */
  commands: ExportedCommand[];
  /** Callback when user wants to add a suggested command */
  onAddCommand?: (trigger: string, response: string) => void;
  /** Callback when user wants to edit a command */
  onEditCommand?: (commandName: string) => void;
}

/**
 * Priority badge component
 */
const PriorityBadge: React.FC<{ priority: 'low' | 'medium' | 'high' }> = ({ priority }) => {
  const colors = {
    low: 'bg-blue-500/20 text-blue-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-red-500/20 text-red-400',
  };
  const labels = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[priority]}`}>
      {labels[priority]}
    </span>
  );
};

/**
 * Suggestion type icon
 */
const SuggestionIcon: React.FC<{ type: CommandSuggestion['type'] }> = ({ type }) => {
  const icons = {
    optimize: <Zap size={14} className="text-yellow-400" />,
    combine: <Copy size={14} className="text-blue-400" />,
    split: <FileText size={14} className="text-purple-400" />,
    rename: <FileText size={14} className="text-green-400" />,
    add_variable: <Sparkles size={14} className="text-cyan-400" />,
  };
  return icons[type] || <Lightbulb size={14} className="text-zinc-400" />;
};

/**
 * Collapsible section component
 */
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  color?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  count,
  defaultOpen = true,
  children,
  color = 'zinc',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-700/30 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-white">{title}</span>
          {count !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded bg-${color}-500/20 text-${color}-400`}>
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-zinc-400" />
        ) : (
          <ChevronDown size={16} className="text-zinc-400" />
        )}
      </button>
      {isOpen && <div className="p-3 pt-0 border-t border-zinc-700/50">{children}</div>}
    </div>
  );
};

/**
 * Main CommandAnalysisPanel component
 */
export const CommandAnalysisPanel: React.FC<CommandAnalysisPanelProps> = ({
  commands,
  onAddCommand,
  onEditCommand,
}) => {
  const [analysis, setAnalysis] = useState<CommandAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Convert commands to ExportedCommand format for analysis
  const exportedCommands = useMemo(() => 
    commands.map(cmd => ({
      name: cmd.name,
      response: cmd.response,
      cooldown: cmd.cooldown,
      userLevel: cmd.userLevel,
      enabled: cmd.enabled,
    })),
    [commands]
  );

  // Run analysis
  const runAnalysis = useCallback(async () => {
    if (exportedCommands.length === 0) {
      setAnalysis(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiCommandService.analyzeCommands(exportedCommands);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar comandos');
    } finally {
      setIsLoading(false);
    }
  }, [exportedCommands]);

  // Run analysis on mount and when commands change
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((id: string) => {
    setDismissedSuggestions(prev => new Set([...prev, id]));
  }, []);

  // Filter out dismissed suggestions
  const activeSuggestions = useMemo(() => 
    analysis?.suggestions.filter(s => !dismissedSuggestions.has(`${s.type}-${s.target}`)) || [],
    [analysis?.suggestions, dismissedSuggestions]
  );

  // Calculate stats
  const stats = useMemo(() => {
    if (!analysis) return null;
    
    const enabledCount = commands.filter(c => c.enabled).length;
    const totalUsage = commands.reduce((sum, c) => sum + ((c as any).usageCount || 0), 0);
    const avgCooldown = commands.length > 0 
      ? Math.round(commands.reduce((sum, c) => sum + c.cooldown, 0) / commands.length)
      : 0;
    
    return {
      total: analysis.totalCommands,
      enabled: enabledCount,
      disabled: analysis.totalCommands - enabledCount,
      totalUsage,
      avgCooldown,
      duplicates: analysis.duplicates.length,
      suggestions: activeSuggestions.length,
      ideas: analysis.newCommandIdeas.length,
    };
  }, [analysis, commands, activeSuggestions]);

  // Empty state
  if (commands.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <BarChart3 size={48} className="mx-auto mb-4 opacity-30" />
        <p>No hay comandos para analizar</p>
        <p className="text-sm mt-2">Crea algunos comandos primero</p>
      </div>
    );
  }

  // Loading state
  if (isLoading && !analysis) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        <Loader2 size={24} className="animate-spin mr-2" />
        <span>Analizando comandos...</span>
      </div>
    );
  }

  // Error state
  if (error && !analysis) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400 opacity-50" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={runAnalysis}
          className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-purple-400" />
          <h3 className="text-white font-medium">Análisis de Comandos</h3>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-300 rounded-lg text-sm transition-colors"
          aria-label="Actualizar análisis"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-zinc-500">Total comandos</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="text-2xl font-bold text-green-400">{stats.enabled}</div>
            <div className="text-xs text-zinc-500">Activos</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="text-2xl font-bold text-yellow-400">{stats.suggestions}</div>
            <div className="text-xs text-zinc-500">Sugerencias</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="text-2xl font-bold text-cyan-400">{stats.ideas}</div>
            <div className="text-xs text-zinc-500">Ideas nuevas</div>
          </div>
        </div>
      )}

      {/* Duplicates section */}
      {analysis && analysis.duplicates.length > 0 && (
        <CollapsibleSection
          title="Comandos Duplicados"
          icon={<Copy size={16} className="text-red-400" />}
          count={analysis.duplicates.length}
          color="red"
        >
          <div className="space-y-2 mt-2">
            {analysis.duplicates.map((dup, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {dup.commands.map(cmd => (
                      <button
                        key={cmd}
                        onClick={() => onEditCommand?.(cmd)}
                        className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-purple-400 rounded font-mono transition-colors"
                      >
                        !{cmd}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400">{dup.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Similar triggers section */}
      {analysis && analysis.similarTriggers.length > 0 && (
        <CollapsibleSection
          title="Triggers Similares"
          icon={<AlertCircle size={16} className="text-yellow-400" />}
          count={analysis.similarTriggers.length}
          color="yellow"
          defaultOpen={false}
        >
          <div className="space-y-2 mt-2">
            {analysis.similarTriggers.map((sim, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <AlertCircle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {sim.triggers.map(trigger => (
                      <span key={trigger} className="text-xs px-2 py-0.5 bg-zinc-700 text-yellow-400 rounded font-mono">
                        !{trigger}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400">{sim.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Suggestions section */}
      {activeSuggestions.length > 0 && (
        <CollapsibleSection
          title="Sugerencias de Mejora"
          icon={<Lightbulb size={16} className="text-cyan-400" />}
          count={activeSuggestions.length}
          color="cyan"
        >
          <div className="space-y-2 mt-2">
            {activeSuggestions.map((suggestion, i) => {
              const id = `${suggestion.type}-${suggestion.target}`;
              return (
                <div key={i} className="flex items-start gap-2 p-2 bg-zinc-700/30 rounded-lg">
                  <SuggestionIcon type={suggestion.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => onEditCommand?.(suggestion.target)}
                        className="text-sm font-mono text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        !{suggestion.target}
                      </button>
                      <PriorityBadge priority={suggestion.priority} />
                    </div>
                    <p className="text-sm text-white">{suggestion.suggestion}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{suggestion.reason}</p>
                  </div>
                  <button
                    onClick={() => dismissSuggestion(id)}
                    className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label="Descartar sugerencia"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Long responses section */}
      {analysis && analysis.longResponses.length > 0 && (
        <CollapsibleSection
          title="Respuestas Largas"
          icon={<FileText size={16} className="text-orange-400" />}
          count={analysis.longResponses.length}
          color="orange"
          defaultOpen={false}
        >
          <div className="space-y-2 mt-2">
            {analysis.longResponses.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-zinc-700/30 rounded-lg">
                <button
                  onClick={() => onEditCommand?.(item.trigger)}
                  className="text-sm font-mono text-purple-400 hover:text-purple-300 transition-colors"
                >
                  !{item.trigger}
                </button>
                <span className="text-xs text-orange-400">{item.length} caracteres</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* New command ideas section */}
      {analysis && analysis.newCommandIdeas.length > 0 && (
        <CollapsibleSection
          title="Ideas para Nuevos Comandos"
          icon={<Sparkles size={16} className="text-green-400" />}
          count={analysis.newCommandIdeas.length}
          color="green"
        >
          <div className="space-y-2 mt-2">
            {analysis.newCommandIdeas.map((idea, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-zinc-700/30 rounded-lg">
                <div>
                  <span className="text-sm font-mono text-green-400">!{idea.trigger}</span>
                  <p className="text-xs text-zinc-500">{idea.description}</p>
                </div>
                {onAddCommand && (
                  <button
                    onClick={() => onAddCommand(idea.trigger, '')}
                    className="flex items-center gap-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs transition-colors"
                  >
                    <Plus size={12} />
                    Crear
                  </button>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* All good message */}
      {analysis && 
       analysis.duplicates.length === 0 && 
       activeSuggestions.length === 0 && 
       analysis.similarTriggers.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          <Check size={48} className="mx-auto mb-4 text-green-400 opacity-50" />
          <p className="text-green-400">¡Tus comandos están bien optimizados!</p>
          <p className="text-sm mt-2">No se encontraron problemas</p>
        </div>
      )}

      {/* AI mode indicator */}
      <div className="text-center text-xs text-zinc-600 pt-2 border-t border-zinc-800">
        {aiCommandService.isAvailable() 
          ? '✨ Análisis con IA activado'
          : '📊 Análisis local (configura API key para IA avanzada)'}
      </div>
    </div>
  );
};

export default CommandAnalysisPanel;
