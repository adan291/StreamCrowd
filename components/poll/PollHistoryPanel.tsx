/**
 * PollHistoryPanel Component
 * History panel specifically for polls using GenericHistoryPanel
 * Shows poll history with question, options, winner, and votes
 */

import React, { useMemo } from 'react';
import { Trophy, Users, BarChart3, Clock } from 'lucide-react';
import { GenericHistoryPanel, type HistoryPanelConfig } from '../ui/GenericHistoryPanel';
import type { BaseHistoryItem } from '../../hooks/useActivityHistory';
import type { Poll } from '../../types';

// ============================================
// TYPES
// ============================================

export interface PollHistoryItem extends BaseHistoryItem {
  question: string;
  options: {
    label: string;
    votes: number;
    color: string;
    percentage: number;
  }[];
  totalVotes: number;
  duration?: number;
  winnerLabel?: string;
}

export interface PollHistoryPanelProps {
  polls: Poll[];
  className?: string;
  maxHeight?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Convert Poll to PollHistoryItem format
 */
function pollToHistoryItem(poll: Poll): PollHistoryItem {
  const totalVotes = poll.totalVotes || poll.options.reduce((sum, o) => sum + o.votes, 0);
  const winner = poll.options.reduce((max, o) => o.votes > max.votes ? o : max, poll.options[0]);
  
  return {
    id: poll.id,
    name: poll.title || 'Encuesta',
    type: 'poll',
    result: winner?.label || 'Sin votos',
    participantCount: totalVotes,
    createdAt: poll.startTime,
    finishedAt: poll.startTime + (poll.duration ? poll.duration * 1000 : 0),
    question: poll.question,
    options: poll.options.map(o => ({
      label: o.label,
      votes: o.votes,
      color: o.color,
      percentage: totalVotes > 0 ? (o.votes / totalVotes) * 100 : 0,
    })),
    totalVotes,
    duration: poll.duration,
    winnerLabel: winner?.label,
  };
}

// ============================================
// COMPONENT
// ============================================

export const PollHistoryPanel: React.FC<PollHistoryPanelProps> = ({
  polls,
  className = '',
  maxHeight = '400px',
}) => {
  // Convert polls to history items
  const historyItems = useMemo(() => {
    return polls
      .filter(p => !p.isActive) // Only finished polls
      .map(pollToHistoryItem)
      .sort((a, b) => b.finishedAt - a.finishedAt);
  }, [polls]);

  // Config for GenericHistoryPanel
  const config: HistoryPanelConfig<PollHistoryItem> = useMemo(() => ({
    activityType: 'poll',
    title: 'Historial de Encuestas',
    labels: {
      result: 'Ganador',
      participants: 'Votos',
    },
    accentColor: 'purple',
    
    // Custom render for item details
    renderItemDetails: (item) => (
      <>
        <span className="flex items-center gap-1 text-xs text-purple-600">
          <Trophy size={12} /> {item.winnerLabel || item.result}
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <Users size={12} /> {item.totalVotes} votos
        </span>
        {item.duration && (
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <Clock size={12} /> {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
          </span>
        )}
      </>
    ),
    
    // Custom render for expanded content
    renderExpandedContent: (item) => (
      <div className="space-y-2">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">{item.question}</p>
        
        {/* Options breakdown */}
        <div className="space-y-1.5">
          {item.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: opt.color }}
              />
              <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400">
                {opt.label}
              </span>
              <span className="text-zinc-500 tabular-nums">
                {opt.votes} ({opt.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <span className="text-zinc-500">
            Total: <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.totalVotes}</span> votos
          </span>
          {item.duration && (
            <span className="text-zinc-500">
              Duración: <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
              </span>
            </span>
          )}
        </div>
      </div>
    ),
    
    exportFields: ['id', 'name', 'result', 'participantCount', 'createdAt', 'finishedAt'],
  }), []);

  return (
    <GenericHistoryPanel
      items={historyItems}
      config={config}
      className={className}
      maxHeight={maxHeight}
    />
  );
};

export default PollHistoryPanel;
