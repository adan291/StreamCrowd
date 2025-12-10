import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Smile,
  Meh,
  Frown,
  Clock,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Activity,
} from 'lucide-react';
import {
  ChatAnalysis,
  StreamSession,
  DailyInsight,
  AIConfig,
  loadAllSessions,
  generateDailyReport,
  exportSessionData,
  analyzeLocally,
  analyzeWithAI,
} from '../services/aiAnalyticsService';
import { useI18n } from '../i18n';

interface StreamAnalyticsProps {
  currentSession?: StreamSession | null;
  aiConfig: AIConfig | null;
  isStreamActive: boolean;
  onClose?: () => void;
}

export const StreamAnalytics: React.FC<StreamAnalyticsProps> = ({
  currentSession,
  aiConfig,
  isStreamActive,
  onClose,
}) => {
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyInsight, setDailyInsight] = useState<DailyInsight | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<ChatAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

  // Load daily report when date changes
  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      const report = await generateDailyReport(selectedDate, aiConfig);
      setDailyInsight(report);
      setLoading(false);
    };
    loadReport();
  }, [selectedDate, aiConfig]);

  // Update live analysis periodically
  useEffect(() => {
    if (!currentSession || !isStreamActive) return;

    const updateAnalysis = async () => {
      if (currentSession.messages.length > 0) {
        if (aiConfig?.enabled && aiConfig.apiKey) {
          const analysis = await analyzeWithAI(currentSession.messages, aiConfig);
          setLiveAnalysis(analysis);
        } else {
          setLiveAnalysis(analyzeLocally(currentSession.messages));
        }
      }
    };

    updateAnalysis();
    const interval = setInterval(updateAnalysis, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [currentSession, isStreamActive, aiConfig]);

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const SentimentIcon = ({ sentiment }: { sentiment: string }) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="w-5 h-5 text-green-400" />;
      case 'negative':
        return <Frown className="w-5 h-5 text-red-400" />;
      default:
        return <Meh className="w-5 h-5 text-yellow-400" />;
    }
  };

  const EngagementBar = ({ value }: { value: number }) => (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${
          value > 70 ? 'bg-green-500' : value > 40 ? 'bg-yellow-500' : 'bg-red-500'
        }`}
        style={{ width: `${value}%` }}
      />
    </div>
  );

  const renderAnalysis = (analysis: ChatAnalysis | undefined) => {
    if (!analysis) {
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{t.analytics.noData}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Users className="w-3 h-3" />
              {t.analytics.uniqueViewers}
            </div>
            <p className="text-2xl font-bold text-white">
              {analysis.viewerInteraction.uniqueViewers}
            </p>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <MessageSquare className="w-3 h-3" />
              {t.analytics.messages}
            </div>
            <p className="text-2xl font-bold text-white">
              {analysis.viewerInteraction.totalMessages}
            </p>
          </div>
        </div>

        {/* Sentiment & Engagement */}
        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SentimentIcon sentiment={analysis.sentiment} />
              <span className="text-white font-medium capitalize">
                {analysis.sentiment === 'positive' && t.analytics.positive}
                {analysis.sentiment === 'neutral' && t.analytics.neutral}
                {analysis.sentiment === 'negative' && t.analytics.negative}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{t.analytics.engagement}</p>
              <p className="text-lg font-bold text-white">{analysis.engagement}%</p>
            </div>
          </div>
          <EngagementBar value={analysis.engagement} />
        </div>

        {/* Topics */}
        {analysis.topics.length > 0 && (
          <div className="bg-black/30 rounded-lg p-4">
            <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t.analytics.mainTopics}
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.topics.map((topic, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                >
                  #{topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Word Cloud */}
        {analysis.wordCloud.length > 0 && (
          <div className="bg-black/30 rounded-lg p-4">
            <h4 className="text-sm text-gray-400 mb-2">{t.analytics.frequentWords}</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.wordCloud.slice(0, 15).map((item, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-white/10 text-gray-300 rounded text-xs"
                  style={{
                    fontSize: `${Math.min(14 + item.count * 0.5, 20)}px`,
                    opacity: Math.max(0.5, 1 - i * 0.05),
                  }}
                >
                  {item.word}
                  <span className="text-gray-500 ml-1">({item.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Emote Usage */}
        {analysis.emoteUsage.length > 0 && (
          <div className="bg-black/30 rounded-lg p-4">
            <h4 className="text-sm text-gray-400 mb-2">{t.analytics.mostUsedEmotes}</h4>
            <div className="space-y-2">
              {analysis.emoteUsage.slice(0, 5).map((emote, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-white font-medium w-24 truncate">{emote.emote}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${emote.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{emote.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Active Viewers */}
        <div className="bg-black/30 rounded-lg p-4">
          <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {t.analytics.mostActiveViewers}
          </h4>
          <div className="space-y-2">
            {analysis.viewerInteraction.mostActiveViewers.slice(0, 5).map((viewer, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                  <span className="text-white">{viewer.username}</span>
                </div>
                <span className="text-sm text-gray-400">{viewer.messageCount} {t.analytics.msgs}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-white">Analytics</h2>
            {aiConfig?.enabled && (
              <span className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                IA
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'live'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {isStreamActive && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />}
            {t.analytics.live}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {t.analytics.history}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'live' ? (
          <>
            {isStreamActive && currentSession ? (
              <>
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    {t.analytics.activeSession}: {formatDuration(Date.now() - currentSession.startTime)}
                  </span>
                </div>
                {renderAnalysis(liveAnalysis || undefined)}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{t.analytics.noActiveStream}</p>
                <p className="text-sm mt-1">{t.analytics.connectToSee}</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Date Selector */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white text-sm border-none focus:outline-none"
                />
              </div>
              <button
                onClick={() => changeDate(1)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-500 mt-2">{t.analytics.loading}</p>
              </div>
            ) : dailyInsight?.sessions.length ? (
              <>
                {/* Sessions Summary */}
                <div className="mb-4 p-3 bg-black/30 rounded-lg">
                  <p className="text-sm text-gray-400">
                    {dailyInsight.sessions.length} {t.analytics.sessionsThisDay}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>
                      {t.analytics.totalMessages}:{' '}
                      {dailyInsight.sessions.reduce((acc, s) => acc + s.messages.length, 0)}
                    </span>
                  </div>
                </div>

                {renderAnalysis(dailyInsight.aggregatedAnalysis)}

                {/* Export Button */}
                {dailyInsight.sessions.length > 0 && (
                  <button
                    onClick={() => {
                      const data = JSON.stringify(dailyInsight, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `stream-analytics-${selectedDate}.json`;
                      a.click();
                    }}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    {t.analytics.exportData}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t.analytics.noSessionsDate}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
