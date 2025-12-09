import React, { useEffect, useRef } from 'react';
import { TwitchMessage, PollOption } from '../types';
import { MessageSquare, CheckCircle2, RotateCcw } from 'lucide-react';

interface ChatFeedProps {
  messages: TwitchMessage[];
  userVoteMap: Map<string, number>;
  options?: PollOption[];
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages, userVoteMap, options }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl h-full flex flex-col shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80">
         <MessageSquare size={14} className="text-zinc-400" />
         <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Chat en Vivo</span>
      </div>
      
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar font-mono text-sm bg-zinc-50 dark:bg-black/20">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
                <MessageSquare size={24} className="opacity-50" />
                <span className="text-xs italic">Esperando mensajes...</span>
            </div>
        )}
        {messages.map((msg, i) => {
            // Check if this user has voted
            const votedOptionId = userVoteMap.get(msg.userId || '') || userVoteMap.get(msg.username);
            const hasVoted = votedOptionId !== undefined;
            
            // Resolve previous vote option
            let previousVoteOption: PollOption | undefined;
            if (options && hasVoted) {
                previousVoteOption = options.find(o => o.id === votedOptionId);
            }
            
            // Check if current message is a vote command
            const voteMatch = msg.message.trim().match(/^\+(\d+)$/);
            
            // Resolve current message option (if it's a vote)
            let currentMsgOption: PollOption | undefined;
            if (options && voteMatch) {
                const optId = parseInt(voteMatch[1]);
                currentMsgOption = options.find(o => o.id === optId);
            }

            return (
              <div key={msg.id || i} className="break-words leading-snug animate-fade-in text-xs md:text-sm group hover:bg-zinc-100 dark:hover:bg-zinc-800/30 p-1.5 rounded -mx-1.5 transition-colors">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    
                    {/* Username */}
                    <span 
                        className="font-bold whitespace-nowrap" 
                        style={{ color: msg.color || '#a970ff' }}
                    >
                        {msg.username}:
                    </span>

                    {/* Badge: Shows what they voted for (if they have voted) */}
                    {hasVoted && previousVoteOption && (
                        <div 
                            className="inline-flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700/50 select-none opacity-80"
                            title={`Votó por: ${previousVoteOption.label}`}
                        >
                            {previousVoteOption.image ? (
                                <img src={previousVoteOption.image} className="w-3 h-3 rounded-full object-cover" alt="" />
                            ) : (
                                <span className="text-[10px] leading-none text-zinc-900 dark:text-white">{previousVoteOption.icon || '#'}</span>
                            )}
                            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-bold leading-none">+{previousVoteOption.id}</span>
                            <CheckCircle2 size={10} className="text-green-500" />
                        </div>
                    )}

                    {/* Message Content */}
                    <span className="text-zinc-800 dark:text-zinc-300 flex items-center gap-1 flex-wrap">
                      {msg.message}
                      
                      {/* If message is a NEW vote attempt (and distinct from previous), show preview */}
                      {currentMsgOption && !hasVoted && (
                        <span 
                          className="inline-flex items-center justify-center h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded-sm overflow-hidden border border-zinc-300 dark:border-zinc-700 ml-1 align-text-bottom"
                          title={currentMsgOption.label}
                        >
                            {currentMsgOption.image ? (
                                <img src={currentMsgOption.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] text-zinc-900 dark:text-white">{currentMsgOption.icon || '#'}</span>
                            )}
                        </span>
                      )}

                      {/* If they are voting AGAIN, show explicit warning badge */}
                      {voteMatch && hasVoted && previousVoteOption && (
                         <span className="ml-1 flex items-center gap-1 text-[10px] text-zinc-400 italic">
                            (Ya registrado)
                         </span>
                      )}
                    </span>
                  </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};