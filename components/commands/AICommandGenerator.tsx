/**
 * AICommandGenerator Component
 * 
 * Allows users to describe a command in natural language
 * and have AI generate the command configuration.
 */

import React, { useState, useCallback } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Loader2,
  Check,
  AlertCircle,
  Lightbulb,
  Edit2
} from 'lucide-react';
import { aiCommandService } from '../../src/application/services/AICommandService';
import type { GeneratedCommand, ChannelContext } from '../../types/commandEditor';

const EXAMPLE_PROMPTS = [
  'Un comando para saludar a los nuevos viewers',
  'Mostrar mis redes sociales',
  'Un comando divertido para abrazar a alguien',
  'Mostrar el tiempo que lleva el stream',
  'Un comando para mostrar mi rango en el juego',
];

interface AICommandGeneratorProps {
  /** Existing command triggers to avoid duplicates */
  existingCommands: string[];
  /** Channel context for better generation */
  channelContext?: Partial<ChannelContext>;
  /** Callback when a command is generated and confirmed */
  onGenerate: (trigger: string, response: string, userLevel: string, cooldown: number) => void;
  /** Callback to close the generator */
  onClose?: () => void;
}

/**
 * AI Command Generator component
 */
export const AICommandGenerator: React.FC<AICommandGeneratorProps> = ({
  existingCommands,
  channelContext,
  onGenerate,
  onClose,
}) => {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCommand, setGeneratedCommand] = useState<GeneratedCommand | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedTrigger, setEditedTrigger] = useState('');
  const [editedResponse, setEditedResponse] = useState('');

  const context: ChannelContext = {
    channelName: channelContext?.channelName || 'MiCanal',
    currentGame: channelContext?.currentGame,
    streamTitle: channelContext?.streamTitle,
    existingCommands,
    socialLinks: channelContext?.socialLinks,
  };

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedCommand(null);

    try {
      const result = await aiCommandService.generateCommand(description, context);
      setGeneratedCommand(result);
      setEditedTrigger(result.trigger);
      setEditedResponse(result.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el comando');
    } finally {
      setIsGenerating(false);
    }
  }, [description, context]);

  const handleConfirm = useCallback(() => {
    if (generatedCommand) {
      onGenerate(
        editedTrigger || generatedCommand.trigger,
        editedResponse || generatedCommand.response,
        generatedCommand.userLevel,
        generatedCommand.cooldown
      );
      setDescription('');
      setGeneratedCommand(null);
      setEditMode(false);
    }
  }, [generatedCommand, editedTrigger, editedResponse, onGenerate]);

  const handleExampleClick = useCallback((example: string) => {
    setDescription(example);
  }, []);

  const handleUseAlternative = useCallback((alt: { trigger: string; response: string }) => {
    setEditedTrigger(alt.trigger);
    setEditedResponse(alt.response);
    setEditMode(true);
  }, []);

  const confidenceColor = generatedCommand 
    ? generatedCommand.confidence > 0.7 
      ? 'text-green-400' 
      : generatedCommand.confidence > 0.4 
        ? 'text-yellow-400' 
        : 'text-red-400'
    : '';

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-purple-400" />
          <h3 className="text-white font-bold">Generar con IA</h3>
        </div>
        <p className="text-zinc-500 text-sm mt-1">
          Describe el comando que quieres crear en lenguaje natural
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Description input */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">
            ¿Qué quieres que haga el comando?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Un comando para mostrar mis redes sociales..."
            rows={3}
            className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none"
          />
        </div>

        {/* Example prompts */}
        <div>
          <div className="flex items-center gap-1 text-zinc-500 text-xs mb-2">
            <Lightbulb size={12} />
            <span>Ideas</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {EXAMPLE_PROMPTS.map((example, i) => (
              <button
                key={i}
                onClick={() => handleExampleClick(example)}
                className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!description.trim() || isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-all text-sm font-medium"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Generar Comando
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Generated result */}
        {generatedCommand && (
          <div className="space-y-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium text-sm">Comando generado</span>
              <span className={`text-xs ${confidenceColor}`}>
                {Math.round(generatedCommand.confidence * 100)}% confianza
              </span>
            </div>

            {/* Trigger */}
            <div>
              <label className="text-zinc-500 text-xs block mb-1">Trigger</label>
              {editMode ? (
                <div className="flex items-center">
                  <span className="bg-zinc-700 text-purple-400 px-3 py-2 rounded-l-lg border border-r-0 border-zinc-600">
                    !
                  </span>
                  <input
                    type="text"
                    value={editedTrigger}
                    onChange={(e) => setEditedTrigger(e.target.value.toLowerCase())}
                    className="flex-1 bg-zinc-700 text-white rounded-r-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between bg-zinc-700 rounded-lg px-3 py-2">
                  <span className="text-purple-400 font-mono">!{generatedCommand.trigger}</span>
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Response */}
            <div>
              <label className="text-zinc-500 text-xs block mb-1">Respuesta</label>
              {editMode ? (
                <textarea
                  value={editedResponse}
                  onChange={(e) => setEditedResponse(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none resize-none"
                />
              ) : (
                <div className="bg-zinc-700 rounded-lg px-3 py-2">
                  <p className="text-zinc-300 text-sm">{generatedCommand.response}</p>
                </div>
              )}
            </div>

            {/* Alternatives */}
            {generatedCommand.alternatives.length > 0 && !editMode && (
              <div>
                <label className="text-zinc-500 text-xs block mb-1">Alternativas</label>
                <div className="space-y-1">
                  {generatedCommand.alternatives.map((alt, i) => (
                    <button
                      key={i}
                      onClick={() => handleUseAlternative(alt)}
                      className="w-full text-left bg-zinc-700/50 hover:bg-zinc-700 rounded px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      <span className="text-purple-400">!{alt.trigger}</span>
                      <span className="mx-2">→</span>
                      <span>{alt.response}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setGeneratedCommand(null);
                  setEditMode(false);
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
              >
                Descartar
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
              >
                <Check size={16} />
                Agregar Comando
              </button>
            </div>
          </div>
        )}

        {/* AI availability notice */}
        {!aiCommandService.isAvailable() && (
          <div className="flex items-start gap-2 p-3 bg-zinc-800/50 rounded-lg text-zinc-500 text-xs">
            <Sparkles size={14} className="flex-shrink-0 mt-0.5" />
            <p>
              Usando generación local. Configura una API key en Datos → IA para mejores resultados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICommandGenerator;
