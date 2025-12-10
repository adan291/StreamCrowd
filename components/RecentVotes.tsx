import React, { useEffect, useRef } from 'react';
import { VoteRecord } from '../types';
import { Activity } from 'lucide-react';
import { useI18n } from '../i18n';

interface RecentVotesProps {
  votes: VoteRecord[];
  options: { [key: number]: { color: string; label: string; icon?: string; image?: string } };
}

export const RecentVotes: React.FC<RecentVotesProps> = ({ votes, options }) => {
  const { t } = useI18n();
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
        <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
            <Activity size={48} className="opacity-20 mb-2" />
            <p className="text-xs">{t.nav.activity}...</p>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-900/50">
      {/* Header - simplified as it's inside a tab */}
      <div className="flex justify-between items-center p-2 sm:p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10 shrink-0">
         <h4 className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{t.poll.votes}: {Math.min(votes.length, 50)}</h4>
         <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
         </span>
      </div>
      
      <div ref={containerRef} className="overflow-y-auto flex-1 custom-scrollbar scroll-smooth p-2 sm:p-3 space-y-1.5 sm:space-y-2 pb-20 md:pb-2">
        {votes.map((vote, i) => {
          const option = options[vote.optionId];
          // Determine if this is a "new" vote for animation purposes
          const isNew = i >= prevVotesLength.current;
          
          return (
            <div 
              key={`${vote.userId}-${vote.timestamp}`} 
              className={`flex items-center justify-between text-sm p-1.5 sm:p-2 rounded-lg border transition-all ${isNew ? 'animate-slide-in-right bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-sm' : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
              style={{ animationDuration: '0.4s' }}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                 <span className="text-[9px] sm:text-[10px] text-zinc-400 font-mono w-10 sm:w-12 shrink-0">
                    {new Date(vote.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                 </span>
                 <span className="text-zinc-800 dark:text-zinc-300 font-bold text-[11px] sm:text-xs truncate max-w-[100px] sm:max-w-[120px] md:max-w-[200px]">{vote.username}</span>
              </div>
              
              <div 
                className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-zinc-900 text-[9px] sm:text-[10px] font-bold shadow-sm overflow-hidden border border-black/5"
                style={{ backgroundColor: option?.image ? 'transparent' : (option?.color || '#eee') }}
              >
                {option?.image ? (
                    <img src={option.image} alt="opt" className="w-4 h-4 sm:w-5 sm:h-5 object-cover rounded-sm" />
                ) : (
                    <>
                       {option?.icon && <span className="text-xs sm:text-sm">{option.icon}</span>}
                       <span>+{vote.optionId}</span>
                    </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};