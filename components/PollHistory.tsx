import React from 'react';
import { Poll } from '../types';
import { Trophy, Calendar, Hash, X } from 'lucide-react';

interface PollHistoryProps {
  history: Poll[];
  onClose: () => void;
}

export const PollHistory: React.FC<PollHistoryProps> = ({ history, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-scale-up">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
               <Calendar className="text-purple-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Historial de Encuestas</h2>
              <p className="text-zinc-400 text-xs">Resultados de sesiones anteriores</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-zinc-500">No hay encuestas finalizadas todavía.</p>
            </div>
          ) : (
            history.map((poll) => {
              const winner = poll.options.reduce((prev, current) => (prev.votes > current.votes) ? prev : current);
              const date = new Date(poll.startTime);
              
              return (
                <div key={poll.id} className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-white text-lg">{poll.question}</h3>
                    <span className="text-xs text-zinc-500 font-mono">
                      {date.toLocaleDateString()} {date.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                      <Hash size={14} />
                      <span className="text-white font-bold">{poll.totalVotes}</span> votos
                    </div>
                    {winner.votes > 0 && (
                      <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                        <Trophy size={14} />
                        Ganador: <span className="font-bold">{winner.icon} {winner.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Mini visualization */}
                  <div className="space-y-1.5">
                    {poll.options.map(opt => {
                      const pct = poll.totalVotes > 0 ? (opt.votes / poll.totalVotes) * 100 : 0;
                      return (
                        <div key={opt.id} className="relative h-6 bg-zinc-900 rounded overflow-hidden flex items-center px-2">
                           <div 
                              className="absolute top-0 left-0 h-full opacity-20" 
                              style={{ width: `${pct}%`, backgroundColor: opt.color }} 
                           />
                           <div className="relative z-10 flex justify-between w-full text-xs">
                              <span className="text-zinc-300">
                                {opt.icon && <span className="mr-1">{opt.icon}</span>}
                                {opt.label}
                              </span>
                              <span className="text-zinc-500">{opt.votes} ({pct.toFixed(0)}%)</span>
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
        
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 rounded-b-2xl flex justify-end">
           <button onClick={onClose} className="text-zinc-400 hover:text-white text-sm font-medium">Cerrar</button>
        </div>
      </div>
    </div>
  );
};