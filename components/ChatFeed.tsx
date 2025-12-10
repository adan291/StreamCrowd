import React, { useEffect, useRef, useState } from 'react';
import { TwitchMessage, PollOption } from '../types';
import { MessageSquare, CheckCircle2, ArrowDown } from 'lucide-react';
import { useI18n } from '../i18n';

interface ChatFeedProps {
  messages: TwitchMessage[];
  userVoteMap: Map<string, number>;
  options?: PollOption[];
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages, userVoteMap, options }) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Handle scroll events to detect if user scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Logic: If user is within 50px of bottom, auto-scroll is ON.
    // Otherwise, auto-scroll is OFF.
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAutoScroll(isAtBottom);
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setIsAutoScroll(true);
      setShowScrollButton(false);
    }
  };

  // Effect to auto-scroll when new messages arrive (only if isAutoScroll is true)
  useEffect(() => {
    if (isAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isAutoScroll]);

  return (
    <div className="bg-white dark:bg-zinc-900 border-0 md:border border-zinc-200 dark:border-zinc-800 rounded-none md:rounded-xl h-full flex flex-col shadow-lg overflow-hidden relative">
      <div className="flex items-center gap-2 p-2 sm:p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm z-10 shrink-0">
         <div className="p-1 sm:p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-twitch-brand dark:text-twitch-light">
             <MessageSquare size={14} />
         </div>
         <span className="text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t.chat.liveChat}</span>
         <div className="ml-auto text-[10px] text-zinc-400 font-mono">
            {messages.length > 0 ? `${messages.length} msgs` : 'Ready'}
         </div>
      </div>
      
      <div 
        ref={containerRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-1.5 sm:space-y-2 md:space-y-3 custom-scrollbar font-mono text-sm bg-zinc-50/50 dark:bg-black/20"
      >
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2 opacity-50">
                <MessageSquare size={24} />
                <span className="text-xs italic">{t.chat.waitingMessages}</span>
            </div>
        )}
        {messages.map((msg, i) => {
            const votedOptionId = userVoteMap.get(msg.userId || '') || userVoteMap.get(msg.username);
            const hasVoted = votedOptionId !== undefined;
            
            let previousVoteOption: PollOption | undefined;
            if (options && hasVoted) {
                previousVoteOption = options.find(o => o.id === votedOptionId);
            }
            
            const voteMatch = msg.message.trim().match(/^\+(\d+)$/);
            
            let currentMsgOption: PollOption | undefined;
            if (options && voteMatch) {
                const optId = parseInt(voteMatch[1]);
                currentMsgOption = options.find(o => o.id === optId);
            }

            return (
              <div key={msg.id || i} className="break-words leading-snug animate-fade-in text-xs md:text-sm group hover:bg-zinc-100 dark:hover:bg-zinc-800/50 p-1.5 rounded -mx-1.5 transition-colors">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    
                    <span 
                        className="font-bold whitespace-nowrap" 
                        style={{ color: msg.color || '#a970ff' }}
                    >
                        {msg.username}:
                    </span>

                    {hasVoted && previousVoteOption && (
                        <div 
                            className="inline-flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700/50 select-none opacity-80 shadow-sm"
                            title={`${t.chat.votedFor}: ${previousVoteOption.label}`}
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

                    <span className="text-zinc-800 dark:text-zinc-300 flex items-center gap-1 flex-wrap">
                      {msg.message}
                      
                      {currentMsgOption && !hasVoted && (
                        <span 
                          className="inline-flex items-center justify-center h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded-sm overflow-hidden border border-zinc-300 dark:border-zinc-700 ml-1 align-text-bottom shadow-sm"
                          title={currentMsgOption.label}
                        >
                            {currentMsgOption.image ? (
                                <img src={currentMsgOption.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] text-zinc-900 dark:text-white">{currentMsgOption.icon || '#'}</span>
                            )}
                        </span>
                      )}

                      {voteMatch && hasVoted && previousVoteOption && (
                         <span className="ml-1 flex items-center gap-1 text-[10px] text-zinc-400 italic">
                            ({t.chat.alreadyRegistered})
                         </span>
                      )}
                    </span>
                  </div>
              </div>
            );
        })}
      </div>

      {/* Floating Scroll Button */}
      {showScrollButton && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-fade-in-up">
           <button 
              onClick={scrollToBottom}
              className="bg-twitch-brand hover:bg-twitch-light text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 border border-white/10"
           >
              <ArrowDown size={14} /> {t.chat.newMessages}
           </button>
        </div>
      )}
    </div>
  );
};