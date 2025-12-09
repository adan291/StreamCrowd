import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationProps {
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
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
    success: <CheckCircle size={20} className="text-green-400" />,
    error: <AlertCircle size={20} className="text-red-400" />,
    info: <Info size={20} className="text-blue-400" />
  };

  const bgColors = {
    success: 'bg-zinc-900 border-green-500/30',
    error: 'bg-zinc-900 border-red-500/30',
    info: 'bg-zinc-900 border-blue-500/30'
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 p-4 rounded-lg border shadow-xl animate-slide-up ${bgColors[note.type]}`}>
      <div className="shrink-0">{icons[note.type]}</div>
      <p className="text-sm text-zinc-200 font-medium flex-1">{note.message}</p>
      <button onClick={() => onRemove(note.id)} className="text-zinc-500 hover:text-white transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};