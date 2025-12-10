
import React, { useEffect } from 'react';
import { AlertCircle, Info, X, CheckCircle2 } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  metadata?: {
    channelInitial?: string;
  };
}

interface NotificationProps {
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
  className?: string;
}

export const NotificationContainer: React.FC<NotificationProps> = ({ notifications, onRemove, className = "" }) => {
  return (
    <div className={`flex flex-col items-center gap-2 w-full pointer-events-none ${className}`}>
      {notifications.map((note) => (
        <NotificationToast key={note.id} note={note} onRemove={onRemove} />
      ))}
    </div>
  );
};

const NotificationToast: React.FC<{ note: NotificationItem; onRemove: (id: string) => void }> = ({ note, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(note.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [note.id, onRemove]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-green-400" />,
    error: <AlertCircle size={18} className="text-red-400" />,
    info: <Info size={18} className="text-blue-400" />
  };

  const borderColors = {
    success: 'border-green-500/30',
    error: 'border-red-500/30',
    info: 'border-blue-500/30'
  };

  return (
    <div className={`pointer-events-auto inline-flex items-center gap-3 p-3 pr-4 rounded-xl border shadow-2xl animate-slide-up bg-zinc-900 ${borderColors[note.type]} w-auto max-w-md min-w-[300px]`}>
      
      {/* Icon or Avatar */}
      <div className="shrink-0">
        {note.metadata?.channelInitial ? (
           <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
             <span className="font-bold text-twitch-brand dark:text-twitch-light uppercase text-sm">
               {note.metadata.channelInitial}
             </span>
           </div>
        ) : (
           icons[note.type]
        )}
      </div>

      <p className="text-sm text-zinc-200 font-medium flex-1 leading-tight whitespace-normal">
        {note.message}
      </p>
      
      <button 
        onClick={() => onRemove(note.id)} 
        className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-white/10 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
};
