/**
 * Small status blocks of the RaffleTab (extracted from RaffleTab.tsx):
 * running countdown and the "users in chat" counter.
 */
import React from 'react';
import { Users } from 'lucide-react';

export const formatRaffleTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/** Countdown shown while a timed raffle runs. `compact` is used in the simple view. */
export const RaffleCountdown: React.FC<{ timeLeft: number; participantCount: number; compact?: boolean }> = ({
  timeLeft,
  participantCount,
  compact = false,
}) => (
  <div className={`text-center ${compact ? 'py-2' : 'py-4'}`}>
    <div className={`${compact ? 'text-3xl' : 'text-4xl'} font-bold text-purple-500 font-mono`}>
      {formatRaffleTime(timeLeft)}
    </div>
    <p className={compact ? 'text-xs text-zinc-500' : 'text-sm text-zinc-500 mt-1'}>{participantCount} participantes</p>
  </div>
);

/** Number of (sub) viewers in chat, shown before a "viewers" raffle starts. */
export const ViewersCount: React.FC<{ count: number; subsOnly: boolean }> = ({ count, subsOnly }) => (
  <div className="text-center py-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
    <div className="flex items-center justify-center gap-2 mb-2">
      <Users size={24} className="text-purple-500" />
    </div>
    <div className="text-4xl font-bold text-purple-500">{count}</div>
    <p className="text-sm text-zinc-500 mt-1">{subsOnly ? 'suscriptores en chat' : 'usuarios en chat'}</p>
  </div>
);
