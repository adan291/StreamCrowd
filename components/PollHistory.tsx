import React, { useState, useEffect } from 'react';
import { Poll } from '../types';
import { Trophy, Calendar, Hash, X, Download, RotateCcw, Gift, Users, Crown, Star, BarChart3 } from 'lucide-react';
import { useI18n } from '../i18n';
import { FinishedGiveaway } from './GiveawayHub';

interface PollHistoryProps {
  history: Poll[];
  onClose: () => void;
  onLoadPoll?: (poll: Poll) => void;
  onDownloadPoll?: (poll: Poll) => void;
}

type HistoryTab = 'polls' | 'giveaways';

export const PollHistory: React.FC<PollHistoryProps> = ({ history, onClose, onLoadPoll, onDownloadPoll }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<HistoryTab>('polls');
  const [giveawayHistory, setGiveawayHistory] = useState<FinishedGiveaway[]>([]);

  // Load giveaway history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('giveaway_history');
    if (saved) {
      try {
        setGiveawayHistory(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, []);

  const handleDownloadPoll = (poll: Poll) => {
    const data = {
      question: poll.question,
      options: poll.options.map(o => ({
        label: o.label,
        color: o.color,
        icon: o.icon,
        votes: o.votes
      })),
      totalVotes: poll.totalVotes,
      date: new Date(poll.startTime).toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `encuesta_${poll.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onDownloadPoll?.(poll);
  };

  const handleDownloadGiveaway = (giveaway: FinishedGiveaway) => {
    const data = {
      name: giveaway.name,
      mode: giveaway.mode,
      keyword: giveaway.keyword,
      winner: giveaway.winner,
      participantCount: giveaway.participantCount,
      subscribersOnly: giveaway.subscribersOnly,
      createdAt: new Date(giveaway.createdAt).toISOString(),
      finishedAt: new Date(giveaway.finishedAt).toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sorteo_${giveaway.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearGiveawayHistory = () => {
    localStorage.removeItem('giveaway_history');
    setGiveawayHistory([]);
  };
  
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border-0 sm:border border-zinc-200 dark:border-zinc-800 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] animate-slide-up sm:animate-scale-up">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-twitch-brand/20 rounded-lg">
               <Calendar className="text-twitch-brand dark:text-twitch-light" size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white">{t.history.title}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs">{t.history.viewDetails}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 pb-0 shrink-0">
          <button
            onClick={() => setActiveTab('polls')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'polls'
                ? 'bg-twitch-brand text-white shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <BarChart3 size={16} />
            Encuestas
            {history.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'polls' ? 'bg-white/20' : 'bg-twitch-brand/20 text-twitch-brand'}`}>
                {history.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('giveaways')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'giveaways'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Gift size={16} />
            Sorteos
            {giveawayHistory.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'giveaways' ? 'bg-white/20' : 'bg-pink-500/20 text-pink-500'}`}>
                {giveawayHistory.length}
              </span>
            )}
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar flex-1">
          {activeTab === 'polls' ? (
            // POLLS TAB
            history.length === 0 ? (
              <div className="text-center py-10">
                <BarChart3 size={40} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                <p className="text-zinc-500">{t.history.noPastPolls}</p>
              </div>
            ) : (
              history.map((poll, index) => {
                const winner = poll.options.reduce((prev, current) => (prev.votes > current.votes) ? prev : current);
                const date = new Date(poll.startTime);
                
                return (
                  <div key={`poll-${poll.id}-${index}`} className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 hover:border-twitch-brand/30 dark:hover:border-zinc-700 transition-colors group">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0 mb-2 sm:mb-3">
                      <h3 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-lg flex-1">{poll.question}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-500 font-mono shrink-0">
                          {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onLoadPoll && (
                            <button
                              onClick={() => { onLoadPoll(poll); onClose(); }}
                              className="p-1.5 text-zinc-400 hover:text-twitch-brand hover:bg-twitch-brand/10 rounded-lg transition-colors"
                              title="Reutilizar esta encuesta"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPoll(poll)}
                            className="p-1.5 text-zinc-400 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Descargar encuesta"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <Hash size={12} />
                        <span className="text-zinc-900 dark:text-white font-bold">{poll.totalVotes}</span> {t.poll.votes}
                      </div>
                      {winner.votes > 0 && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-500/20">
                          <Trophy size={12} />
                          <span className="hidden xs:inline">{t.poll.winner}:</span> <span className="font-bold truncate max-w-[100px] sm:max-w-none">{winner.icon} {winner.label}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 sm:space-y-1.5">
                      {poll.options.map(opt => {
                        const pct = poll.totalVotes > 0 ? (opt.votes / poll.totalVotes) * 100 : 0;
                        return (
                          <div key={opt.id} className="relative h-5 sm:h-6 bg-white dark:bg-zinc-900 rounded overflow-hidden flex items-center px-1.5 sm:px-2 border border-zinc-100 dark:border-zinc-800">
                             <div 
                                className="absolute top-0 left-0 h-full opacity-20" 
                                style={{ width: `${pct}%`, backgroundColor: opt.color }} 
                             />
                             <div className="relative z-10 flex justify-between w-full text-[10px] sm:text-xs">
                                <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[60%]">
                                  {opt.icon && <span className="mr-1">{opt.icon}</span>}
                                  {opt.label}
                                </span>
                                <span className="text-zinc-500 shrink-0">{opt.votes} ({pct.toFixed(0)}%)</span>
                             </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            // GIVEAWAYS TAB
            giveawayHistory.length === 0 ? (
              <div className="text-center py-10">
                <Gift size={40} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                <p className="text-zinc-500">No hay sorteos en el historial</p>
              </div>
            ) : (
              giveawayHistory.map((giveaway, index) => {
                const finishedDate = new Date(giveaway.finishedAt);
                
                return (
                  <div key={`giveaway-${giveaway.id}-${index}`} className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 hover:border-pink-500/30 dark:hover:border-zinc-700 transition-colors group">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0 mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <Gift size={16} className="text-pink-500 shrink-0" />
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-lg">{giveaway.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-500 font-mono shrink-0">
                          {finishedDate.toLocaleDateString()} {finishedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDownloadGiveaway(giveaway)}
                            className="p-1.5 text-zinc-400 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Descargar sorteo"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Winner highlight */}
                    <div className="mb-3 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Crown className="text-yellow-500" size={20} />
                        <div>
                          <p className="text-[10px] text-yellow-600 dark:text-yellow-400 uppercase font-bold">Ganador</p>
                          <p className="text-lg font-bold text-zinc-900 dark:text-white">{giveaway.winner}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <Users size={12} />
                        <span className="text-zinc-900 dark:text-white font-bold">{giveaway.participantCount}</span> participantes
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                        giveaway.mode === 'keyword' 
                          ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20'
                          : 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20'
                      }`}>
                        {giveaway.mode === 'keyword' ? (
                          <>
                            <Hash size={12} />
                            {giveaway.keyword}
                          </>
                        ) : (
                          <>
                            <Users size={12} />
                            Viewers
                          </>
                        )}
                      </div>
                      {giveaway.subscribersOnly && (
                        <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-200 dark:border-yellow-500/20">
                          <Star size={12} />
                          Solo subs
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
        
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-2xl flex justify-between items-center shrink-0">
          {activeTab === 'giveaways' && giveawayHistory.length > 0 && (
            <button 
              onClick={clearGiveawayHistory}
              className="text-red-500 hover:text-red-400 text-xs font-medium px-3 py-2 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Limpiar historial
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="text-zinc-500 hover:text-black dark:hover:text-white text-xs sm:text-sm font-medium px-4 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">{t.common.close}</button>
        </div>
      </div>
    </div>
  );
};
