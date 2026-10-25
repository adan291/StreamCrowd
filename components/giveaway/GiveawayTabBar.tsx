/**
 * GiveawayTabBar - tab navigation of the GiveawayHub (extracted from GiveawayHub.tsx).
 */
import React from 'react';
import { Gift, Layers, BarChart3, History, CalendarClock, X } from 'lucide-react';

export type GiveawayTab = 'raffle' | 'active' | 'scheduled' | 'stats' | 'history';

interface GiveawayTabBarProps {
  activeTab: GiveawayTab;
  onSelectTab: (tab: GiveawayTab) => void;
  /** True while an existing giveaway is being edited in the "Nuevo" tab */
  isEditing: boolean;
  onCancelEdit: () => void;
  /** Active + finished giveaways */
  activeCount: number;
  scheduledCount: number;
}

const tabClass = (isActive: boolean, grow: boolean) =>
  `${grow ? 'flex-1 ' : ''}py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center${grow ? ' gap-1.5' : ''} ${
    isActive
      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
  }`;

const CountBadge: React.FC<{ count: number; isActive: boolean; color: string }> = ({ count, isActive, color }) =>
  count > 0 ? (
    <span className={`px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-white/20' : `${color} text-white`}`}>
      {count}
    </span>
  ) : null;

export const GiveawayTabBar: React.FC<GiveawayTabBarProps> = ({
  activeTab,
  onSelectTab,
  isEditing,
  onCancelEdit,
  activeCount,
  scheduledCount,
}) => (
  <div className="flex gap-1.5 mt-4">
    <button onClick={() => onSelectTab('raffle')} className={tabClass(activeTab === 'raffle', true)}>
      <Gift size={14} />
      {isEditing ? 'Editando' : 'Nuevo'}
      {isEditing && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onCancelEdit();
          }}
          className="ml-1 p-0.5 rounded hover:bg-white/20 cursor-pointer"
          title="Cancelar edición"
        >
          <X size={12} />
        </span>
      )}
    </button>
    <button onClick={() => onSelectTab('active')} className={tabClass(activeTab === 'active', true)}>
      <Layers size={14} />
      Activos
      <CountBadge count={activeCount} isActive={activeTab === 'active'} color="bg-green-500" />
    </button>
    <button onClick={() => onSelectTab('scheduled')} className={tabClass(activeTab === 'scheduled', true)}>
      <CalendarClock size={14} />
      Programados
      <CountBadge count={scheduledCount} isActive={activeTab === 'scheduled'} color="bg-blue-500" />
    </button>
    <button onClick={() => onSelectTab('stats')} className={tabClass(activeTab === 'stats', false)} title="Estadísticas">
      <BarChart3 size={14} />
    </button>
    <button onClick={() => onSelectTab('history')} className={tabClass(activeTab === 'history', false)} title="Historial">
      <History size={14} />
    </button>
  </div>
);

export default GiveawayTabBar;
