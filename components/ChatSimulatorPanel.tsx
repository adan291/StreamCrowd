/**
 * ChatSimulatorPanel - Panel de control para el simulador de chat
 * 
 * Permite activar/desactivar la simulación y configurar parámetros.
 */

import React, { useState } from 'react';
import { 
  Bot, Play, Pause, Zap, Users, MessageCircle, 
  Settings, ChevronDown, ChevronUp, RotateCcw,
  Vote, Gamepad2, Gift, HelpCircle
} from 'lucide-react';
import { SimulatorContext } from '../src/application/services/ChatSimulatorService';

export interface ChatSimulatorPanelProps {
  isRunning: boolean;
  stats: { messageCount: number; uniqueUsers: number };
  config: {
    messagesPerMinute: number;
    relevantMessageProbability: number;
    uniqueUsers: number;
  };
  context: SimulatorContext;
  onToggle: () => void;
  onConfigChange: (config: Partial<{
    messagesPerMinute: number;
    relevantMessageProbability: number;
    uniqueUsers: number;
  }>) => void;
  onContextChange: (context: SimulatorContext) => void;
  onBurst: (count: number) => void;
  onSimulateJoins: (count: number, command?: string) => void;
  onSimulateVotes: (options: string[], count: number) => void;
  onReset: () => void;
  /** Opciones de voto actuales (para encuestas) */
  voteOptions?: string[];
  /** Comando de unión actual (para juegos) */
  joinCommand?: string;
}

export const ChatSimulatorPanel: React.FC<ChatSimulatorPanelProps> = ({
  isRunning,
  stats,
  config,
  context,
  onToggle,
  onConfigChange,
  onContextChange,
  onBurst,
  onSimulateJoins,
  onSimulateVotes,
  onReset,
  voteOptions = ['+1', '+2', '+3'],
  joinCommand = '!join',
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const contextTypes: { id: SimulatorContext['type']; label: string; icon: React.ReactNode }[] = [
    { id: 'generic', label: 'General', icon: <MessageCircle size={14} /> },
    { id: 'poll', label: 'Encuesta', icon: <Vote size={14} /> },
    { id: 'game', label: 'Juego', icon: <Gamepad2 size={14} /> },
    { id: 'trivia', label: 'Trivia', icon: <HelpCircle size={14} /> },
    { id: 'giveaway', label: 'Sorteo', icon: <Gift size={14} /> },
  ];

  return (
    <div className="bg-zinc-800/80 backdrop-blur-sm rounded-xl border border-zinc-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-700/50">
        <div className="flex items-center gap-2">
          <Bot size={18} className={isRunning ? 'text-green-400 animate-pulse' : 'text-zinc-400'} />
          <span className="text-sm font-medium text-white">Simulador de Chat</span>
          {isRunning && (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              Activo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
            title="Configuración"
          >
            {showSettings ? <ChevronUp size={16} /> : <Settings size={16} />}
          </button>
          <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isRunning
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            {isRunning ? 'Pausar' : 'Iniciar'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-3 py-2 bg-zinc-900/50">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <MessageCircle size={12} />
          <span>{stats.messageCount} msgs</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Users size={12} />
          <span>{stats.uniqueUsers} usuarios</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Zap size={12} />
          <span>{config.messagesPerMinute}/min</span>
        </div>
      </div>

      {/* Context Selector */}
      <div className="px-3 py-2 border-t border-zinc-700/50">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-zinc-500 mr-1">Contexto:</span>
          {contextTypes.map(ct => (
            <button
              key={ct.id}
              onClick={() => onContextChange({ type: ct.id })}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                context.type === ct.id
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {ct.icon}
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-t border-zinc-700/50">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onBurst(5)}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors"
          >
            <Zap size={12} />
            +5 msgs
          </button>
          <button
            onClick={() => onBurst(10)}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors"
          >
            <Zap size={12} />
            +10 msgs
          </button>
          
          {context.type === 'poll' && (
            <button
              onClick={() => onSimulateVotes(voteOptions, 10)}
              className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded transition-colors"
            >
              <Vote size={12} />
              +10 votos
            </button>
          )}
          
          {context.type === 'trivia' && (
            <button
              onClick={() => onSimulateVotes(['1', '2', '3', '4'], 10)}
              className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs rounded transition-colors"
            >
              <HelpCircle size={12} />
              +10 respuestas
            </button>
          )}
          
          {(context.type === 'game' || context.type === 'giveaway') && (
            <button
              onClick={() => onSimulateJoins(5, joinCommand)}
              className="flex items-center gap-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs rounded transition-colors"
            >
              <Users size={12} />
              +5 joins
            </button>
          )}
          
          {context.type === 'game' && (
            <button
              onClick={() => onSimulateJoins(5, '!co')}
              className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs rounded transition-colors"
            >
              <Gamepad2 size={12} />
              +5 !co
            </button>
          )}
          
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded transition-colors ml-auto"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-3 py-3 border-t border-zinc-700/50 space-y-3">
          <div>
            <label className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Mensajes por minuto</span>
              <span className="text-white">{config.messagesPerMinute}</span>
            </label>
            <input
              type="range"
              min="5"
              max="120"
              value={config.messagesPerMinute}
              onChange={(e) => onConfigChange({ messagesPerMinute: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
          
          <div>
            <label className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Prob. mensaje relevante</span>
              <span className="text-white">{Math.round(config.relevantMessageProbability * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.relevantMessageProbability * 100}
              onChange={(e) => onConfigChange({ relevantMessageProbability: parseInt(e.target.value) / 100 })}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
          
          <div>
            <label className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Usuarios únicos</span>
              <span className="text-white">{config.uniqueUsers}</span>
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={config.uniqueUsers}
              onChange={(e) => onConfigChange({ uniqueUsers: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSimulatorPanel;
