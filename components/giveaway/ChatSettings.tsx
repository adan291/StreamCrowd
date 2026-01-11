/**
 * ChatSettings Component
 * Configuration for chat integration features
 */

import React, { useState } from 'react';
import { MessageSquare, Send, Clock, CheckCircle, Settings } from 'lucide-react';
import { AnimatedModal, ModalFooter, ModalButton } from './AnimatedModal';
import type { ChatCommandsConfig } from './services/ChatCommands';
import { DEFAULT_CHAT_COMMANDS_CONFIG } from './services/ChatCommands';

interface ChatSettingsProps {
  config: ChatCommandsConfig;
  onConfigChange: (config: ChatCommandsConfig) => void;
  onClose: () => void;
}

export const ChatSettings: React.FC<ChatSettingsProps> = ({
  config,
  onConfigChange,
  onClose,
}) => {
  const [localConfig, setLocalConfig] = useState<ChatCommandsConfig>(config);

  const handleChange = <K extends keyof ChatCommandsConfig>(
    key: K,
    value: ChatCommandsConfig[K]
  ) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CHAT_COMMANDS_CONFIG);
  };

  return (
    <AnimatedModal
      isOpen={true}
      onClose={onClose}
      title="Configuración de Chat"
      subtitle="Comandos y anuncios automáticos"
      icon={<MessageSquare size={20} />}
      size="md"
    >
      <div className="space-y-4">
        {/* Enable commands */}
        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-zinc-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Comandos habilitados
            </span>
          </div>
          <button
            onClick={() => handleChange('enabled', !localConfig.enabled)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              localConfig.enabled ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              localConfig.enabled ? 'left-5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {/* Command prefix */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Prefijo de comandos
          </label>
          <input
            type="text"
            value={localConfig.prefix}
            onChange={(e) => handleChange('prefix', e.target.value.slice(0, 2))}
            maxLength={2}
            className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm"
            placeholder="!"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Ej: {localConfig.prefix}participantes, {localConfig.prefix}sorteo
          </p>
        </div>

        {/* Announce winner */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Anunciar ganador en chat
              </span>
            </div>
            <button
              onClick={() => handleChange('announceWinner', !localConfig.announceWinner)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                localConfig.announceWinner ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                localConfig.announceWinner ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {localConfig.announceWinner && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Mensaje de ganador
                </label>
                <textarea
                  value={localConfig.winnerMessageTemplate}
                  onChange={(e) => handleChange('winnerMessageTemplate', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm resize-none"
                  placeholder="🎉 ¡Felicidades {winner}!"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Variables: {'{winner}'}, {'{name}'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Delay antes de anunciar (segundos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={localConfig.announceWinnerDelay}
                  onChange={(e) => handleChange('announceWinnerDelay', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* Winner confirmation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-zinc-400" />
              <div>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Requerir confirmación
                </span>
                <p className="text-xs text-zinc-500">
                  El ganador debe escribir para confirmar
                </p>
              </div>
            </div>
            <button
              onClick={() => handleChange('requireWinnerConfirmation', !localConfig.requireWinnerConfirmation)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                localConfig.requireWinnerConfirmation ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                localConfig.requireWinnerConfirmation ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {localConfig.requireWinnerConfirmation && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Timeout de confirmación (segundos)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={localConfig.confirmationTimeout}
                onChange={(e) => handleChange('confirmationTimeout', parseInt(e.target.value) || 60)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Si no confirma, se puede re-sortear
              </p>
            </div>
          )}
        </div>

        {/* Cooldown */}
        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-zinc-400" />
            <div>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Cooldown de comandos
              </span>
              <p className="text-xs text-zinc-500">
                {localConfig.globalCooldown}s entre comandos
              </p>
            </div>
          </div>
          <button
            onClick={() => handleChange('cooldownEnabled', !localConfig.cooldownEnabled)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              localConfig.cooldownEnabled ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              localConfig.cooldownEnabled ? 'left-5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {/* Available commands info */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
            📝 Comandos para usuarios:
          </p>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">{localConfig.prefix}participantes</code> - Ver participantes</li>
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">{localConfig.prefix}sorteo</code> - Info del sorteo</li>
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">{localConfig.prefix}tiempo</code> - Tiempo restante</li>
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">{localConfig.prefix}ganador</code> - Último ganador</li>
          </ul>
        </div>

        {/* Control commands for mods */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
            🎮 Comandos de control (mods/streamer):
          </p>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle help</code> - Ver todos los comandos</li>
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle start "Premio" [keyword] [seg]</code> - Iniciar sorteo</li>
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle winner</code> - Elegir ganador</li>
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle reroll</code> - Elegir nuevo ganador</li>
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle close</code> - Cerrar sorteo</li>
            <li><code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv raffle participants</code> - Ver participantes</li>
          </ul>
          <p className="text-xs text-zinc-500 mt-2">
            💡 Escribe <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">!tv help</code> en el chat para ver todos los comandos.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Restablecer
        </button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Guardar
        </button>
      </div>
    </AnimatedModal>
  );
};

export default ChatSettings;
