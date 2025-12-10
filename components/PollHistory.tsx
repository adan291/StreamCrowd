import React from 'react';
import { Poll } from '../types';
import { Trophy, Calendar, Hash, X } from 'lucide-react';

interface PollHistoryProps {
  history: Poll[];
  onClose: () => void;
}

export const PollHistory: React.FC<PollHistoryProps> = ({ history, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border-0 sm:border border-zinc-200 dark:border-zinc-800 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] animate-slide-up sm:animate-scale-up">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-twitch-brand/20 rounded-lg">
               <Calendar className="text-twitch-brand dark:text-twitch-light" size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white">Historial de Encuestas</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs">Resultados de sesiones anteriores</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar flex-1">
          {history.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-zinc-500">No hay encuestas finalizadas todavía.</p>
            </div>
          ) : (
            history.map((poll) => {
              const winner = poll.options.reduce((prev, current) => (prev.votes > current.votes) ? prev : current);
              const date = new Date(poll.startTime);
              
              return (
                <div key={poll.id} className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 hover:border-twitch-brand/30 dark:hover:border-zinc-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0 mb-2 sm:mb-3">
                    <h3 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-lg">{poll.question}</h3>
                    <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-500 font-mono shrink-0">
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <Hash size={12} />
                      <span className="text-zinc-900 dark:text-white font-bold">{poll.totalVotes}</span> votos
                    </div>
                    {winner.votes > 0 && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-500/20">
                        <Trophy size={12} />
                        <span className="hidden xs:inline">Ganador:</span> <span className="font-bold truncate max-w-[100px] sm:max-w-none">{winner.icon} {winner.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Mini visualization */}
                  <div className="space-y-1 sm:space-y-1.5">
                    {poll.options.map(opt => {
                      const pct = poll.totalVotes > 0 ? (opt.votes / poll.totalVotes) * 100 : 0;
                      return (
                        <div key={opt.id} className="relative h-5 sm:h-6 bg-white dark:bg-zinc-900 rounded overflow-hidden flex items-center px-1.5 sm:px-2 border border-zinc-100 dark:border-zinc-800">
                           <div 
                              className="absolute top-0 left-0 h-full opacity-20" 
                              style={{ width: `${pct}%`, backgroundColor: opt.color }} 
                           />
                           <div className="relative z-10 flex justify-between w-full text-[10px] sm:text-xs">
                              <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[60%]">
                                {opt.icon && <span className="mr-1">{opt.icon}</span>}
                                {opt.label}
                              </span>
                              <span className="text-zinc-500 shrink-0">{opt.votes} ({pct.toFixed(0)}%)</span>
                           </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-2xl flex justify-end shrink-0">
           <button onClick={onClose} className="text-zinc-500 hover:text-black dark:hover:text-white text-xs sm:text-sm font-medium px-4 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cerrar</button>
        </div>
      </div>
    </div>
  );
};