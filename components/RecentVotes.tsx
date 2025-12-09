import React, { useEffect, useRef } from 'react';
import { VoteRecord } from '../types';

interface RecentVotesProps {
  votes: VoteRecord[];
  options: { [key: number]: { color: string; label: string; icon?: string; image?: string } };
}

export const RecentVotes: React.FC<RecentVotesProps> = ({ votes, options }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevVotesLength = useRef(votes.length);

  // Auto scroll to bottom when new votes arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    prevVotesLength.current = votes.length;
  }, [votes]);

  if (votes.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <p className="text-sm">Esperando votos...</p>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-3 shrink-0">
         <h4 className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Actividad Reciente ({votes.length})</h4>
         <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
         </span>
      </div>
      
      <div ref={containerRef} className="overflow-y-auto space-y-2 flex-1 custom-scrollbar scroll-smooth pr-2 pb-2">
        {votes.map((vote, i) => {
          const option = options[vote.optionId];
          // Determine if this is a "new" vote for animation purposes
          const isNew = i >= prevVotesLength.current;
          
          return (
            <div 
              key={`${vote.userId}-${vote.timestamp}`} 
              className={`flex items-center justify-between text-sm p-3 rounded-lg border transition-all ${isNew ? 'animate-slide-in-right bg-zinc-100 dark:bg-zinc-700/50 border-zinc-300 dark:border-zinc-600' : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800/50'}`}
              style={{ animationDuration: '0.5s' }}
            >
              <div className="flex flex-col min-w-0 pr-2">
                 <span className="text-zinc-800 dark:text-zinc-300 font-bold text-sm truncate">{vote.username}</span>
                 <span className="text-[10px] text-zinc-500 dark:text-zinc-600 font-mono">{new Date(vote.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div 
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-black text-xs font-bold shadow-sm overflow-hidden"
                  style={{ backgroundColor: option?.image ? 'transparent' : (option?.color || '#555') }}
                >
                  {option?.image ? (
                      <img src={option.image} alt="opt" className="w-6 h-6 object-cover rounded" />
                  ) : (
                      <span className="flex items-center gap-1">
                        {option?.icon && <span className="text-sm">{option.icon}</span>}
                        <span className="text-xs">+{vote.optionId}</span>
                      </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(10px); background-color: rgba(169, 112, 255, 0.1); }
          to { opacity: 1; transform: translateX(0); background-color: transparent; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};