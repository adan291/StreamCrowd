import React, { useEffect, useRef } from 'react';
import { TwitchMessage, PollOption } from '../types';
import { MessageSquare, CheckCircle2 } from 'lucide-react';

interface ChatFeedProps {
  messages: TwitchMessage[];
  votedUserIds: Set<string>;
  options?: PollOption[];
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages, votedUserIds, options }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-full flex flex-col shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800 bg-zinc-900/80">
         <MessageSquare size={14} className="text-zinc-400" />
         <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Chat en Vivo</span>
      </div>
      
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar font-mono text-sm bg-black/20">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-2">
                <MessageSquare size={24} className="opacity-50" />
                <span className="text-xs italic">Esperando mensajes...</span>
            </div>
        )}
        {messages.map((msg, i) => {
            // Check if this user has voted
            const hasVoted = votedUserIds.has(msg.userId || '') || votedUserIds.has(msg.username);
            
            // Check if message is a vote and we have option info
            const voteMatch = msg.message.trim().match(/^\+(\d+)$/);
            let votedOption: PollOption | undefined;
            if (voteMatch && options) {
                const optId = parseInt(voteMatch[1]);
                votedOption = options.find(o => o.id === optId);
            }

            return (
              <div key={msg.id || i} className="break-words leading-snug animate-fade-in text-xs md:text-sm group hover:bg-zinc-800/30 p-1.5 rounded -mx-1.5 transition-colors">
                  <div className="flex items-baseline gap-1.5">
                    {hasVoted && (
                        <span className="shrink-0 text-green-500" title="Usuario ha votado">
                            <CheckCircle2 size={12} strokeWidth={3} />
                        </span>
                    )}
                    <span 
                        className="font-bold whitespace-nowrap" 
                        style={{ color: msg.color || '#a970ff' }}
                    >
                        {msg.username}:
                    </span>
                    <span className="text-zinc-300 flex items-center gap-1 flex-wrap">
                      {msg.message}
                      {votedOption && (
                        <span 
                          className="inline-flex items-center justify-center h-4 w-4 bg-zinc-800 rounded-sm overflow-hidden border border-zinc-700 ml-1 align-text-bottom"
                          title={votedOption.label}
                        >
                            {votedOption.image ? (
                                <img src={votedOption.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px]">{votedOption.icon || '#'}</span>
                            )}
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