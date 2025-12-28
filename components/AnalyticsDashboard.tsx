/**
 * AnalyticsDashboard - Panel de estadísticas avanzadas de stream
 * 
 * Muestra métricas en tiempo real, gráficos de engagement,
 * historial de sesiones y exportación de datos.
 * 
 * @requirements 3.1 - Display peak viewers, average viewers, chat messages per minute, unique chatters
 * @requirements 3.4 - Display metrics in real-time during stream
 * @requirements 3.5 - Display engagement graphs over time
 * @requirements 3.6 - Export data in CSV format
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Download,
  Calendar,
  Activity,
  Zap,
  Target,
  Trash2,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Eye,
  Heart,
  Gift,
  Coins,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAdvancedAnalytics, type StreamSession } from '../src/application/hooks/useAdvancedAnalytics';

interface AnalyticsDashboardProps {
  onClose?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const {
    currentSession,
    sessionHistory,
    isSessionActive,
    startSession,
    endSession,
    calculateRetention,
    calculateEngagementRate,
    deleteSession,
    downloadCSV,
  } = useAdvancedAnalytics();

  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Format duration from milliseconds
  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-gray-900 border border-white/20 rounded-lg p-2 text-xs shadow-xl">
          <p className="text-white font-medium mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} style={{ color: entry.color }} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Prepare timeline data for charts
  const timelineData = useMemo(() => {
    if (!currentSession?.timeline.length) return [];
    return currentSession.timeline.map((point, index) => ({
      time: new Date(point.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      viewers: point.viewers,
      messages: point.messages,
      index,
    }));
  }, [currentSession?.timeline]);

  // Stat card component
  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue, 
    color 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | number; 
    subValue?: string; 
    color: string;
  }) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-3 border border-white/10`}>
      <div className="flex items-center gap-1 text-white/70 text-xs mb-1.5">
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="font-medium truncate uppercase">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
      {subValue && <p className="text-xs text-white/50">{subValue}</p>}
    </div>
  );

  // Session card component
  const SessionCard: React.FC<{ session: StreamSession }> = ({ session }) => {
    const isExpanded = expandedSession === session.id;
    const duration = session.endTime ? session.endTime - session.startTime : 0;
    const retention = calculateRetention(session);
    const engagement = calculateEngagementRate(session);

    return (
      <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => setExpandedSession(isExpanded ? null : session.id)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">{formatDate(session.startTime)}</p>
              <p className="text-xs text-gray-500">{formatDuration(duration)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-medium">{session.peakViewers}</p>
              <p className="text-xs text-gray-500">peak viewers</p>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-white/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <Eye className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{session.averageViewers}</p>
                <p className="text-xs text-gray-500">avg viewers</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <MessageSquare className="w-4 h-4 text-green-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{session.totalMessages}</p>
                <p className="text-xs text-gray-500">messages</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <Users className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{session.uniqueChatters}</p>
                <p className="text-xs text-gray-500">chatters</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <Target className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{retention}%</p>
                <p className="text-xs text-gray-500">retention</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <Heart className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{session.newFollowers}</p>
                <p className="text-xs text-gray-500">follows</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <Gift className="w-4 h-4 text-pink-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{session.newSubs}</p>
                <p className="text-xs text-gray-500">subs</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <Coins className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{session.bitsReceived}</p>
                <p className="text-xs text-gray-500">bits</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => downloadCSV(session.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => deleteSession(session.id)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/95 text-white">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold">Analytics Dashboard</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'live'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Live
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'live' ? (
          <div className="space-y-4">
            {/* Session Controls */}
            <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                {isSessionActive ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-green-400">Session Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    <span className="text-sm text-gray-400">No Active Session</span>
                  </>
                )}
              </div>
              <button
                onClick={() => isSessionActive ? endSession() : startSession()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSessionActive
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                }`}
              >
                {isSessionActive ? (
                  <>
                    <Square className="w-4 h-4" />
                    End Session
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Session
                  </>
                )}
              </button>
            </div>

            {currentSession ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    icon={Eye}
                    label="Peak Viewers"
                    value={currentSession.peakViewers}
                    subValue="maximum"
                    color="from-blue-500/20 to-blue-600/5"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Avg Viewers"
                    value={currentSession.averageViewers}
                    subValue="average"
                    color="from-green-500/20 to-green-600/5"
                  />
                  <StatCard
                    icon={MessageSquare}
                    label="Messages"
                    value={currentSession.totalMessages}
                    subValue="total"
                    color="from-purple-500/20 to-purple-600/5"
                  />
                  <StatCard
                    icon={Users}
                    label="Chatters"
                    value={currentSession.uniqueChatters}
                    subValue="unique"
                    color="from-orange-500/20 to-orange-600/5"
                  />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-center">
                    <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">{currentSession.newFollowers}</p>
                    <p className="text-xs text-gray-500">New Followers</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-center">
                    <Gift className="w-5 h-5 text-pink-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">{currentSession.newSubs}</p>
                    <p className="text-xs text-gray-500">New Subs</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-center">
                    <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">{currentSession.bitsReceived}</p>
                    <p className="text-xs text-gray-500">Bits</p>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-gray-400">Retention</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{calculateRetention()}%</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-400">Engagement</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{calculateEngagementRate()}%</p>
                  </div>
                </div>

                {/* Timeline Chart */}
                {timelineData.length > 1 && (
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-400" />
                      Viewer Timeline
                    </h4>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineData}>
                          <defs>
                            <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="viewers" 
                            stroke="#8b5cf6" 
                            fill="url(#colorViewers)" 
                            name="Viewers" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Messages Chart */}
                {timelineData.length > 1 && (
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-400" />
                      Chat Activity
                    </h4>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line 
                            type="monotone" 
                            dataKey="messages" 
                            stroke="#22c55e" 
                            strokeWidth={2} 
                            dot={false} 
                            name="Messages/min" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Session Duration */}
                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-400">Session Duration</span>
                    </div>
                    <span className="text-lg font-bold text-white">
                      {formatDuration(Date.now() - currentSession.startTime)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400 mb-2">No active session</p>
                <p className="text-sm text-gray-500">Start a session to track your stream metrics</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Export All Button */}
            {sessionHistory.length > 0 && (
              <button
                onClick={() => downloadCSV()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors"
              >
                <Download className="w-5 h-5" />
                Export All Sessions (CSV)
              </button>
            )}

            {/* Session List */}
            {sessionHistory.length > 0 ? (
              <div className="space-y-3">
                {sessionHistory.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400 mb-2">No session history</p>
                <p className="text-sm text-gray-500">Complete a session to see it here</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
