/**
 * EmptyState Component
 * Displays friendly empty states with illustrations and actions
 */

import React from 'react';
import { Users, Gift, History, Layers, Plus, Upload, UserPlus } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type EmptyStateType = 'participants' | 'threads' | 'history' | 'giveaway';

export interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// ============================================
// CONFIGURATIONS
// ============================================

const EMPTY_STATES: Record<EmptyStateType, {
  icon: React.ReactNode;
  defaultTitle: string;
  defaultDescription: string;
  color: string;
}> = {
  participants: {
    icon: <Users size={48} strokeWidth={1.5} />,
    defaultTitle: 'Sin participantes',
    defaultDescription: 'Añade participantes manualmente, carga chatters o espera a que escriban en el chat.',
    color: 'text-purple-400',
  },
  threads: {
    icon: <Layers size={48} strokeWidth={1.5} />,
    defaultTitle: 'Sin sorteos activos',
    defaultDescription: 'Crea un nuevo sorteo para empezar a recolectar participantes.',
    color: 'text-blue-400',
  },
  history: {
    icon: <History size={48} strokeWidth={1.5} />,
    defaultTitle: 'Sin historial',
    defaultDescription: 'Los sorteos completados aparecerán aquí.',
    color: 'text-amber-400',
  },
  giveaway: {
    icon: <Gift size={48} strokeWidth={1.5} />,
    defaultTitle: 'Listo para sortear',
    defaultDescription: 'Configura tu sorteo y añade participantes para comenzar.',
    color: 'text-pink-400',
  },
};

// ============================================
// COMPONENT
// ============================================

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}) => {
  const config = EMPTY_STATES[type];

  return (
    <div 
      className={`
        flex flex-col items-center justify-center text-center p-8
        ${className}
      `}
      role="status"
      aria-label={title || config.defaultTitle}
    >
      {/* Animated icon */}
      <div className={`
        ${config.color} opacity-40 mb-4
        animate-float
      `}>
        {config.icon}
      </div>

      {/* Decorative dots */}
      <div className="flex gap-1 mb-4" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 animate-pulse" style={{ animationDelay: '0s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-300 mb-2">
        {title || config.defaultTitle}
      </h3>

      {/* Description */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mb-6">
        {description || config.defaultDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {action && (
            <button
              onClick={action.onClick}
              className="
                flex items-center justify-center gap-2 px-4 py-2
                bg-gradient-to-r from-purple-500 to-pink-500 text-white
                rounded-lg font-medium text-sm
                hover:opacity-90 transition-opacity
                focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2
              "
            >
              {action.icon || <Plus size={16} />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="
                flex items-center justify-center gap-2 px-4 py-2
                bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300
                rounded-lg font-medium text-sm
                hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors
                focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2
              "
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// ============================================
// PRESET EMPTY STATES
// ============================================

export const NoParticipants: React.FC<{
  onAddManual?: () => void;
  onLoadChatters?: () => void;
}> = ({ onAddManual, onLoadChatters }) => (
  <EmptyState
    type="participants"
    action={onAddManual ? {
      label: 'Añadir manualmente',
      onClick: onAddManual,
      icon: <UserPlus size={16} />,
    } : undefined}
    secondaryAction={onLoadChatters ? {
      label: 'Cargar chatters',
      onClick: onLoadChatters,
    } : undefined}
  />
);

export const NoActiveThreads: React.FC<{
  onCreateThread?: () => void;
}> = ({ onCreateThread }) => (
  <EmptyState
    type="threads"
    action={onCreateThread ? {
      label: 'Crear sorteo',
      onClick: onCreateThread,
      icon: <Plus size={16} />,
    } : undefined}
  />
);

export const NoHistory: React.FC = () => (
  <EmptyState
    type="history"
    description="Completa tu primer sorteo para ver el historial aquí."
  />
);

export default EmptyState;
