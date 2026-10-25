/**
 * GiveawayDialogs - winner, backup-recovery and import-error dialogs of the
 * GiveawayHub (extracted from GiveawayHub.tsx).
 */
import React from 'react';
import { AlertTriangle, Trophy, Sparkles } from 'lucide-react';

export interface WinnerDisplayState {
  threadId: string;
  threadName: string;
  winner: string;
  participantCount: number;
  prizeImages?: string[];
}

interface GiveawayDialogsProps {
  currentWinner: WinnerDisplayState | null;
  /** "Cerrar y guardar en historial" */
  onCloseWinner: (winner: WinnerDisplayState) => void;
  showRecovery: boolean;
  onRecover: () => void;
  onDiscardBackup: () => void;
  importError: string | null;
  onDismissImportError: () => void;
}

const AlertDialog: React.FC<{ tone: 'yellow' | 'red'; title: string; children: React.ReactNode }> = ({ tone, title, children }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${tone === 'yellow' ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
          <AlertTriangle className={tone === 'yellow' ? 'text-yellow-500' : 'text-red-500'} size={24} />
        </div>
        <h3 className="font-bold text-lg text-zinc-800 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  </div>
);

export const GiveawayDialogs: React.FC<GiveawayDialogsProps> = ({
  currentWinner,
  onCloseWinner,
  showRecovery,
  onRecover,
  onDiscardBackup,
  importError,
  onDismissImportError,
}) => (
  <>
    {currentWinner && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
          {currentWinner.prizeImages && currentWinner.prizeImages.length > 0 && (
            <div className="flex justify-center gap-2 mb-4">
              {currentWinner.prizeImages.slice(0, 3).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Premio ${i + 1}`}
                  className="w-20 h-20 rounded-xl object-cover ring-4 ring-purple-500/30 shadow-lg"
                />
              ))}
            </div>
          )}

          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="text-yellow-500" size={24} />
              <Trophy className="text-yellow-500" size={32} />
              <Sparkles className="text-yellow-500" size={24} />
            </div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-white">¡Tenemos ganador!</h2>
            <p className="text-sm text-zinc-500">{currentWinner.threadName}</p>
          </div>

          <div className="text-center py-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl mb-4">
            <p className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              {currentWinner.winner}
            </p>
            <p className="text-sm text-zinc-500 mt-2">de {currentWinner.participantCount} participantes</p>
          </div>

          <button
            onClick={() => onCloseWinner(currentWinner)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Cerrar y guardar en historial
          </button>
        </div>
      </div>
    )}

    {showRecovery && (
      <AlertDialog tone="yellow" title="Sorteos sin finalizar">
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Se encontraron sorteos activos de una sesión anterior. ¿Deseas recuperarlos?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onDiscardBackup}
            className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
          >
            Descartar
          </button>
          <button
            onClick={onRecover}
            className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
          >
            Recuperar
          </button>
        </div>
      </AlertDialog>
    )}

    {importError && (
      <AlertDialog tone="red" title="Error de importación">
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">{importError}</p>
        <button
          onClick={onDismissImportError}
          className="w-full py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
        >
          Cerrar
        </button>
      </AlertDialog>
    )}
  </>
);

export default GiveawayDialogs;
