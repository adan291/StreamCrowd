import React from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  const tooltipId = React.useId();
  
  return (
    <div className="group relative inline-flex items-center ml-1 sm:ml-2 cursor-help">
      <HelpCircle 
        size={12} 
        className="sm:w-[14px] sm:h-[14px] text-slate-600 dark:text-zinc-400 hover:text-twitch-brand dark:hover:text-twitch-light transition-colors" 
        aria-describedby={tooltipId}
        role="img"
        aria-label="Help"
      />
      <div 
        id={tooltipId}
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 sm:w-48 p-1.5 sm:p-2 bg-slate-800 dark:bg-zinc-800 border border-slate-700 dark:border-zinc-700 text-[10px] sm:text-xs text-white dark:text-zinc-200 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center"
      >
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-zinc-800" aria-hidden="true"></div>
      </div>
    </div>
  );
};