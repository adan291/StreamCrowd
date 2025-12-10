import React, { useState } from 'react';
import { Settings, BarChart3, List, ChevronDown, ChevronUp } from 'lucide-react';
import { ModerationConfigForm } from './ModerationConfigForm';
import { ModerationStatsDisplay } from './ModerationStatsDisplay';
import { ModerationLogViewer } from './ModerationLogViewer';
import {
  ModerationConfig,
  ModerationStats,
  ModerationLogEntry,
} from '../services/voteModerationService';

interface ModerationPanelProps {
  config: ModerationConfig;
  stats: ModerationStats;
  logEntries: ModerationLogEntry[];
  onConfigChange: (config: ModerationConfig) => void;
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
  isPollActive?: boolean;
}

type PanelSection = 'config' | 'stats' | 'log';

export const ModerationPanel: React.FC<ModerationPanelProps> = ({
  config,
  stats,
  logEntries,
  onConfigChange,
  onNotification,
  isPollActive = false,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<PanelSection>>(
    new Set(['config'])
  );

  const toggleSection = (section: PanelSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const sections: { id: PanelSection; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: 'config', label: 'Settings', icon: <Settings size={16} />, disabled: isPollActive },
    { id: 'stats', label: 'Statistics', icon: <BarChart3 size={16} /> },
    { id: 'log', label: 'Activity Log', icon: <List size={16} /> },
  ];

  return (
    <div className="space-y-2">
      {sections.map(({ id, label, icon, disabled }) => {
        const isExpanded = expandedSections.has(id);
        return (
          <div key={id} className="rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(id)}
              disabled={disabled}
              className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                disabled
                  ? 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 cursor-not-allowed'
                  : isExpanded
                  ? 'bg-twitch-brand/10 text-twitch-brand dark:text-twitch-light'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-sm">
                {icon}
                {label}
                {disabled && (
                  <span className="text-xs text-zinc-400">(locked during poll)</span>
                )}
              </span>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isExpanded && !disabled && (
              <div className="animate-fade-in-down">
                {id === 'config' && (
                  <ModerationConfigForm
                    config={config}
                    onChange={onConfigChange}
                    onNotification={onNotification}
                  />
                )}
                {id === 'stats' && <ModerationStatsDisplay stats={stats} />}
                {id === 'log' && (
                  <ModerationLogViewer entries={logEntries} onNotification={onNotification} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
