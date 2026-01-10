import React, { useState } from 'react';
import { Vote, Trophy, Gift, Timer, Disc3, BarChart3, History, Terminal } from 'lucide-react';
import { DynamicsView, ACTIVITIES } from '../types';
import { useI18n } from '../i18n';
import { ActivityStatsDrawer } from './ui/ActivityStatsDrawer';
import { UnifiedHistoryDrawer } from './ui/UnifiedHistoryDrawer';
import { ChatControlPopover } from './ui/ChatControlPopover';

// Icon mapping for activity types
const ACTIVITY_ICONS: Record<Exclude<DynamicsView, 'selector'>, React.ReactNode> = {
  poll: <Vote size={28} />,
  judge: <Trophy size={28} />,
  giveaway: <Gift size={28} />,
  countdown: <Timer size={28} />,
  spinner: <Disc3 size={28} />, // Keep for type safety, not displayed
};

interface ActivityCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  icon,
  title,
  description,
  color,
  onClick,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`${title}: ${description}`}
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:border-transparent hover:shadow-lg hover:shadow-current/10 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950"
      style={{
        '--tw-ring-color': color,
        '--hover-border-color': color,
      } as React.CSSProperties}
    >
      {/* Colored accent bar on hover */}
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ backgroundColor: color }}
      />
      
      {/* Icon container */}
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      
      {/* Title */}
      <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-1 sm:mb-2">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
};

interface ActivitySelectorProps {
  onSelectActivity: (activity: Exclude<DynamicsView, 'selector'>) => void;
}

export const ActivitySelector: React.FC<ActivitySelectorProps> = ({
  onSelectActivity,
}) => {
  const { t } = useI18n();
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Get translated titles and descriptions for activities
  const getActivityTitle = (id: Exclude<DynamicsView, 'selector'>): string => {
    switch (id) {
      case 'poll':
        return t.nav?.poll || 'Encuesta';
      case 'judge':
        return t.nav?.judge || 'Jurado';
      case 'giveaway':
        return t.nav?.giveaway || 'Sorteos';
      case 'countdown':
        return t.nav?.countdown || 'Countdown';
      case 'spinner':
        return t.nav?.spinner || 'Ruleta';
      default:
        return id;
    }
  };

  const getActivityDescription = (id: Exclude<DynamicsView, 'selector'>): string => {
    switch (id) {
      case 'poll':
        return t.nav?.pollDescription || 'Crea votaciones interactivas para tu audiencia';
      case 'judge':
        return t.nav?.judgeDescription || 'Panel de puntuación en vivo';
      case 'giveaway':
        return t.nav?.giveawayDescription || 'Sorteos y giveaways para tu comunidad';
      case 'countdown':
        return t.nav?.countdownDescription || 'Temporizador con cuenta atrás para eventos';
      case 'spinner':
        return t.nav?.spinnerDescription || 'Ruleta de la fortuna para decisiones aleatorias';
      default:
        return '';
    }
  };

  return (
    <div
      className="h-full flex flex-col p-4 sm:p-6 bg-zinc-50 dark:bg-black/10"
      aria-label={t.nav?.dynamicsSelector || 'Selector de dinámicas'}
    >
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            {t.nav?.dynamics || 'Dinámicas'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.nav?.dynamicsDescription || 'Selecciona una actividad interactiva para tu stream'}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <ChatControlPopover size="md" position="bottom" />
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg transition-colors"
            title="Ver historial"
          >
            <History size={18} />
            <span className="text-sm font-medium hidden sm:inline">Historial</span>
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg transition-colors"
            title="Ver estadísticas"
          >
            <BarChart3 size={18} />
            <span className="text-sm font-medium hidden sm:inline">Estadísticas</span>
          </button>
        </div>
      </div>

      {/* Activity Cards Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        role="group"
        aria-label={t.nav?.availableActivities || 'Actividades disponibles'}
      >
        {ACTIVITIES.map((activity) => (
          <ActivityCard
            key={activity.id}
            icon={ACTIVITY_ICONS[activity.id]}
            title={getActivityTitle(activity.id)}
            description={getActivityDescription(activity.id)}
            color={activity.color}
            onClick={() => onSelectActivity(activity.id)}
          />
        ))}
      </div>
      
      {/* Stats Drawer */}
      <ActivityStatsDrawer isOpen={showStats} onClose={() => setShowStats(false)} />
      
      {/* History Drawer */}
      <UnifiedHistoryDrawer isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
};

export default ActivitySelector;
