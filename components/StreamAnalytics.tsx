import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  Activity,
  Zap,
  Target,
  Hash,
  Flame,
  Save,
  Database,
  Trash2,
  Check,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAnalyticsService, type AnalyticsSession, type AIConfig } from '../src/application/hooks';
import {
  analyzeChat,
  generateTimeSeries,
  getActivityLabel,
  getInsights,
  calculateHealthScore,
  type ChatMetrics,
  type TimeSlotData,
} from '../src/application/services/AnalyticsService';
import { useI18n } from '../i18n';

// Re-export StreamSession type for compatibility
export type StreamSession = AnalyticsSession;

interface StreamAnalyticsProps {
  currentSession?: AnalyticsSession | null;
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
  const { getSessions, saveSession } = useAnalyticsService();
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [savedSessions, setSavedSessions] = useState<AnalyticsSession[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load saved sessions on mount and when tab changes
  useEffect(() => {
    if (activeTab === 'history') {
      setSavedSessions(getSessions());
    }
  }, [activeTab, getSessions]);

  // Analyze current session
  const metrics = useMemo<ChatMetrics>(() => {
    if (!currentSession?.messages.length) {
      return {
        totalMessages: 0,
        uniqueUsers: 0,
        messagesPerMinute: 0,
        avgWordsPerMessage: 0,
        sentiment: 'neutral',
        sentimentScore: 0,
        sentimentIntensity: 0,
        engagementScore: 0,
        activityLevel: 'dead',
        topUsers: [],
        topWords: [],
        topEmotes: [],
        isGrowing: false,
        peakActivity: 0,
        growthRate: 0,
        specialMood: null,
        chatVelocity: 0,
        userRetention: 0,
        responseRate: 0,
        peakHour: null,
        dominantLanguage: 'mixed',
        spamScore: 0,
        diversityIndex: 0,
      };
    }
    return analyzeChat(currentSession.messages, currentSession.startTime);
  }, [currentSession?.messages.length, currentSession?.startTime]);

  // Generate time series for charts
  const timeSeriesData = useMemo<TimeSlotData[]>(() => {
    if (!currentSession?.messages.length) return [];
    return generateTimeSeries(currentSession.messages);
  }, [currentSession?.messages.length]);

  // Exportar mensajes a CSV
  const exportMessagesToCSV = () => {
    if (!currentSession?.messages.length) return;
    
    const headers = ['Timestamp', 'Username', 'Message', 'UserID'];
    const rows = currentSession.messages.map(msg => {
      const timestamp = new Date(msg.timestamp).toISOString();
      // Escapar comillas en el mensaje
      const escapedMsg = msg.message.replace(/"/g, '""');
      return `"${timestamp}","${msg.username}","${escapedMsg}","${msg.userId || ''}"`;
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_export_${currentSession.channelName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sentiment distribution for pie chart
  const sentimentDistribution = useMemo(() => {
    if (!currentSession?.messages.length) return [];
    
    let positive = 0, negative = 0, neutral = 0;
    const positivePatterns = [/\b(pog|gg|nice|love|great|awesome|genial|vamos|bien)\b/gi, /(❤️|🔥|👏|😊)+/g];
    const negativePatterns = [/\b(bad|hate|boring|trash|malo)\b/gi, /(😢|😭|👎)+/g];
    
    currentSession.messages.forEach(msg => {
      let isPositive = false, isNegative = false;
      positivePatterns.forEach(p => { if (msg.message.match(p)) isPositive = true; });
      negativePatterns.forEach(p => { if (msg.message.match(p)) isNegative = true; });
      
      if (isPositive && !isNegative) positive++;
      else if (isNegative && !isPositive) negative++;
      else neutral++;
    });
    
    return [
      { name: 'Positivo', value: positive, color: '#22c55e' },
      { name: 'Neutral', value: neutral, color: '#eab308' },
      { name: 'Negativo', value: negative, color: '#ef4444' },
    ].filter(d => d.value > 0) as Array<{ name: string; value: number; color: string; [key: string]: string | number }>;
  }, [currentSession?.messages.length]);

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const SentimentIcon = ({ sentiment, size = 20 }: { sentiment: string; size?: number }) => {
    switch (sentiment) {
      case 'positive': return <Smile className="text-green-400" style={{ width: size, height: size }} />;
      case 'negative': return <Frown className="text-red-400" style={{ width: size, height: size }} />;
      default: return <Meh className="text-yellow-400" style={{ width: size, height: size }} />;
    }
  };

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

  // Engagement Gauge Component - Mejorado para no pisar texto
  const EngagementGauge = ({ value, label }: { value: number; label: string }) => {
    const angle = (value / 100) * 180 - 90; // -90 to 90 degrees
    const color = value > 70 ? '#22c55e' : value > 40 ? '#eab308' : '#ef4444';
    
    return (
      <div className="flex flex-col items-center">
        {/* Gauge SVG */}
        <div className="relative w-full" style={{ height: '60px' }}>
          <svg viewBox="0 0 100 55" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 45 A 35 35 0 0 1 90 45"
              fill="none"
              stroke="#333"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d="M 10 45 A 35 35 0 0 1 90 45"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(value / 100) * 110} 110`}
              className="transition-all duration-500"
            />
            {/* Needle */}
            <line
              x1="50"
              y1="45"
              x2={50 + 25 * Math.cos((angle * Math.PI) / 180)}
              y2={45 + 25 * Math.sin((angle * Math.PI) / 180)}
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            <circle cx="50" cy="45" r="3" fill="white" />
            {/* Labels en los extremos */}
            <text x="8" y="52" fontSize="7" fill="#666">0</text>
            <text x="86" y="52" fontSize="7" fill="#666">100</text>
          </svg>
        </div>
        {/* Valor y label debajo, separados */}
        <div className="text-center mt-1">
          <span className="text-xl sm:text-2xl font-bold text-white">{value}%</span>
          <span className="text-[10px] sm:text-xs text-gray-500 ml-1">{label}</span>
        </div>
      </div>
    );
  };

  // Activity Heatmap for the last hour
  const ActivityHeatmap = ({ data }: { data: TimeSlotData[] }) => {
    if (data.length === 0) return null;
    const maxMsgs = Math.max(...data.map(d => d.messages), 1);
    
    return (
      <div className="flex gap-0.5 flex-wrap">
        {data.slice(-30).map((slot, i) => {
          const intensity = slot.messages / maxMsgs;
          const bgColor = intensity > 0.7 ? 'bg-purple-500' : 
                         intensity > 0.4 ? 'bg-purple-400' : 
                         intensity > 0.1 ? 'bg-purple-300' : 'bg-gray-700';
          return (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${bgColor} transition-all hover:scale-125`}
              style={{ opacity: 0.3 + intensity * 0.7 }}
              title={`${slot.time}: ${slot.messages} msgs`}
            />
          );
        })}
      </div>
    );
  };


  const renderLiveAnalytics = () => {
    const sessionDuration = currentSession ? Date.now() - currentSession.startTime : 0;
    const hasData = metrics.totalMessages > 0;

    return (
      <div className="space-y-4">
        {/* Status Bar */}
        <div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-500/10 to-purple-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-400 font-medium">En Vivo</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(sessionDuration)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {metrics.totalMessages} msgs
            </span>
            {currentSession?.channelName && (
              <span className="text-purple-400">#{currentSession.channelName}</span>
            )}
            {/* Botón exportar CSV */}
            {metrics.totalMessages > 0 && (
              <button
                onClick={exportMessagesToCSV}
                className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-gray-300 hover:text-white transition-colors"
                title="Exportar chat a CSV"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Stats Grid - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Activity */}
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 rounded-xl p-3 border border-purple-500/20">
            <div className="flex items-center gap-1 text-purple-400 text-[10px] sm:text-xs mb-1.5">
              <Activity className="w-3 h-3 flex-shrink-0" />
              <span className="font-medium truncate">ACTIVIDAD</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{metrics.messagesPerMinute}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">msgs/min</p>
            <div className={`text-[10px] sm:text-xs mt-0.5 truncate ${metrics.activityLevel === 'high' || metrics.activityLevel === 'explosive' ? 'text-green-400' : 'text-gray-500'}`}>
              {getActivityLabel(metrics.activityLevel)}
            </div>
          </div>

          {/* Sentiment */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 rounded-xl p-3 border border-blue-500/20">
            <div className="flex items-center gap-1 text-blue-400 text-[10px] sm:text-xs mb-1.5">
              <TrendingUp className="w-3 h-3 flex-shrink-0" />
              <span className="font-medium truncate">SENTIMIENTO</span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-xl sm:text-2xl font-bold text-white">
                {metrics.sentimentScore > 0 ? '+' : ''}{metrics.sentimentScore.toFixed(2)}
              </p>
              <SentimentIcon sentiment={metrics.sentiment} size={20} />
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500">escala -1 a 1</p>
          </div>

          {/* Users */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/5 rounded-xl p-3 border border-green-500/20">
            <div className="flex items-center gap-1 text-green-400 text-[10px] sm:text-xs mb-1.5">
              <Users className="w-3 h-3 flex-shrink-0" />
              <span className="font-medium truncate">USUARIOS</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{metrics.uniqueUsers}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">únicos activos</p>
            {metrics.isGrowing && (
              <div className="text-[10px] sm:text-xs text-green-400 flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> Creciendo
              </div>
            )}
          </div>

          {/* Engagement */}
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/5 rounded-xl p-3 border border-orange-500/20">
            <div className="flex items-center gap-1 text-orange-400 text-[10px] sm:text-xs mb-1.5">
              <Flame className="w-3 h-3 flex-shrink-0" />
              <span className="font-medium truncate">ENGAGEMENT</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{metrics.engagementScore}%</p>
            <p className="text-[10px] sm:text-xs text-gray-500">participación</p>
            {metrics.specialMood && (
              <div className="text-[10px] sm:text-xs text-yellow-400 truncate">
                {metrics.specialMood === 'hype' && '🔥 HYPE'}
                {metrics.specialMood === 'love' && '💜 LOVE'}
                {metrics.specialMood === 'angry' && '😤 TENSO'}
                {metrics.specialMood === 'sad' && '😢 TRISTE'}
              </div>
            )}
          </div>
        </div>

        {/* Charts Row - Responsive */}
        {hasData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Activity Chart */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
              <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                Volumen de Chat
              </h4>
              <div className="h-36">
                <ResponsiveContainer width="100%" height={144}>
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="messages" stroke="#8b5cf6" fill="url(#colorMsgs)" name="Mensajes" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sentiment Chart */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
              <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Tendencia Emocional
              </h4>
              <div className="h-36">
                <ResponsiveContainer width="100%" height={144}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
                    <YAxis domain={[-1, 1]} tick={{ fill: '#666', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="sentiment" stroke="#22d3ee" strokeWidth={2} dot={false} name="Sentimiento" />
                    <Line type="monotone" dataKey={() => 0} stroke="#666" strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Second Row - Distribution & Top Users - Responsive */}
        {hasData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Sentiment Pie */}
            {sentimentDistribution.length > 0 && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-400" />
                  Distribución
                </h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height={128}>
                    <PieChart>
                      <Pie data={sentimentDistribution} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={5} dataKey="value">
                        {sentimentDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={20} formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top Users */}
            {metrics.topUsers.length > 0 && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  Top Usuarios
                </h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height={128}>
                    <BarChart data={metrics.topUsers.slice(0, 5).map(u => ({ name: u.username.slice(0, 10), msgs: u.count }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#666', fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#999', fontSize: 10 }} width={70} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="msgs" fill="#f97316" radius={[0, 4, 4, 0]} name="Mensajes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Topics & Words - Responsive */}
        {hasData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Topics/Words */}
            {metrics.topWords.length > 0 && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-400" />
                  Palabras Frecuentes
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {metrics.topWords.slice(0, 12).map((w, i) => {
                    const size = Math.max(11, 14 - i * 0.3);
                    const colors = ['text-purple-400', 'text-blue-400', 'text-cyan-400', 'text-green-400'];
                    return (
                      <span
                        key={i}
                        className={`px-2 py-0.5 bg-white/5 rounded ${colors[i % colors.length]} hover:bg-white/10 transition-colors`}
                        style={{ fontSize: `${size}px` }}
                      >
                        {w.word}
                        <span className="text-gray-600 ml-1 text-xs">({w.count})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Emotes */}
            {metrics.topEmotes.length > 0 && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                  <Smile className="w-4 h-4 text-yellow-400" />
                  Emotes Populares
                </h4>
                <div className="space-y-2">
                  {metrics.topEmotes.slice(0, 5).map((e, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-white text-sm w-24 truncate">{e.emote}</span>
                      <div className="flex-1 bg-gray-700/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                          style={{ width: `${Math.min(100, (e.count / metrics.topEmotes[0].count) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{e.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Engagement & Heatmap Row - Responsive */}
        {hasData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Engagement Gauge */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
              <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Nivel de Engagement
              </h4>
              <EngagementGauge value={metrics.engagementScore} label="engagement" />
              <div className="mt-2 text-center">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  metrics.engagementScore > 70 ? 'bg-green-500/20 text-green-400' :
                  metrics.engagementScore > 40 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {metrics.engagementScore > 70 ? '🔥 Muy Alto' :
                   metrics.engagementScore > 40 ? '👍 Bueno' : '📈 En Crecimiento'}
                </span>
              </div>
            </div>

            {/* Activity Heatmap */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
              <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Mapa de Actividad
              </h4>
              <ActivityHeatmap data={timeSeriesData} />
              <div className="flex justify-between mt-3 text-xs text-gray-500">
                <span>Menos activo</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-sm bg-gray-700" />
                  <div className="w-3 h-3 rounded-sm bg-purple-300" />
                  <div className="w-3 h-3 rounded-sm bg-purple-400" />
                  <div className="w-3 h-3 rounded-sm bg-purple-500" />
                </div>
                <span>Más activo</span>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Metrics Grid - Responsive */}
        {hasData && (
          <div className="bg-black/30 rounded-xl p-3 sm:p-4 border border-white/5">
            <h4 className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="truncate">Métricas Avanzadas</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Chat Velocity */}
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <p className="text-base sm:text-lg font-bold text-white">{metrics.chatVelocity}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">msgs/seg</p>
              </div>
              {/* User Retention */}
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <p className="text-base sm:text-lg font-bold text-white">{metrics.userRetention}%</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">retención</p>
              </div>
              {/* Growth Rate */}
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <p className={`text-base sm:text-lg font-bold ${metrics.growthRate > 0 ? 'text-green-400' : metrics.growthRate < 0 ? 'text-red-400' : 'text-white'}`}>
                  {metrics.growthRate > 0 ? '+' : ''}{metrics.growthRate}%
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">crecimiento</p>
              </div>
              {/* Diversity Index */}
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <p className="text-base sm:text-lg font-bold text-white">{(metrics.diversityIndex * 100).toFixed(0)}%</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">diversidad</p>
              </div>
            </div>
            
            {/* Secondary metrics row */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              {/* Language */}
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                <span className="text-lg">
                  {metrics.dominantLanguage === 'es' ? '🇪🇸' : metrics.dominantLanguage === 'en' ? '🇬🇧' : '🌍'}
                </span>
                <div>
                  <p className="text-xs text-white font-medium">
                    {metrics.dominantLanguage === 'es' ? 'Español' : metrics.dominantLanguage === 'en' ? 'English' : 'Mixto'}
                  </p>
                  <p className="text-xs text-gray-500">idioma</p>
                </div>
              </div>
              {/* Spam Score */}
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  metrics.spamScore < 20 ? 'bg-green-500/20 text-green-400' :
                  metrics.spamScore < 50 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {metrics.spamScore}
                </div>
                <div>
                  <p className="text-xs text-white font-medium">
                    {metrics.spamScore < 20 ? 'Limpio' : metrics.spamScore < 50 ? 'Normal' : 'Alto'}
                  </p>
                  <p className="text-xs text-gray-500">spam</p>
                </div>
              </div>
              {/* Peak Hour */}
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                <Clock className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-white font-medium">{metrics.peakHour || '--:--'}</p>
                  <p className="text-xs text-gray-500">hora pico</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Health Score & Insights - Responsive */}
        {hasData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Health Score */}
            <div className="bg-black/30 rounded-xl p-3 sm:p-4 border border-white/5">
              <h4 className="text-xs sm:text-sm text-gray-400 mb-2 truncate">Salud del Chat</h4>
              {(() => {
                const healthScore = calculateHealthScore(metrics);
                const color = healthScore > 70 ? 'text-green-400' : healthScore > 40 ? 'text-yellow-400' : 'text-red-400';
                return (
                  <div className="text-center">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="35" stroke="#333" strokeWidth="6" fill="none" />
                        <circle 
                          cx="40" cy="40" r="35" 
                          stroke={healthScore > 70 ? '#22c55e' : healthScore > 40 ? '#eab308' : '#ef4444'}
                          strokeWidth="6" 
                          fill="none"
                          strokeDasharray={`${(healthScore / 100) * 220} 220`}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xl sm:text-2xl font-bold ${color}`}>{healthScore}</span>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2 truncate">
                      {healthScore > 70 ? '¡Excelente!' : healthScore > 40 ? 'Bueno' : 'Mejorable'}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Insights */}
            <div className="sm:col-span-2 bg-black/30 rounded-xl p-3 sm:p-4 border border-white/5">
              <h4 className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
                <span className="truncate">Insights</span>
              </h4>
              <div className="space-y-1.5 sm:space-y-2">
                {getInsights(metrics).map((insight, i) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg text-[10px] sm:text-xs ${
                      insight.type === 'success' ? 'bg-green-500/10 text-green-400' :
                      insight.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    <span>
                      {insight.type === 'success' ? '✓' : insight.type === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    <span>{insight.message}</span>
                  </div>
                ))}
                {getInsights(metrics).length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    Recopilando datos para generar insights...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Real-time Stats Summary - Responsive */}
        {hasData && (
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-3 sm:p-4 border border-purple-500/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                  metrics.specialMood === 'hype' ? 'bg-orange-500/20' :
                  metrics.specialMood === 'love' ? 'bg-pink-500/20' :
                  'bg-purple-500/20'
                }`}>
                  {metrics.specialMood === 'hype' && <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />}
                  {metrics.specialMood === 'love' && <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />}
                  {!metrics.specialMood && <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium text-xs sm:text-sm truncate">
                    {metrics.specialMood === 'hype' ? '🔥 ¡Chat ON FIRE!' :
                     metrics.specialMood === 'love' ? '💜 Mucho amor' :
                     metrics.isGrowing ? '📈 Creciendo' : 'Chat activo'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                    {metrics.avgWordsPerMessage.toFixed(1)} palabras/msg
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl sm:text-2xl font-bold text-white">{metrics.totalMessages}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">msgs totales</p>
              </div>
            </div>
          </div>
        )}

        {/* Save Session Button */}
        {hasData && currentSession && (
          <button
            onClick={() => {
              if (currentSession) {
                saveSession({ ...currentSession, endTime: Date.now() });
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
                // Refresh saved sessions list
                setSavedSessions(getSessions());
              }
            }}
            disabled={saveSuccess}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              saveSuccess 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                ¡Sesión guardada!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Sesión Actual
              </>
            )}
          </button>
        )}

        {/* Empty State */}
        {!hasData && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Esperando mensajes del chat...</p>
            <p className="text-xs mt-1 text-gray-600">Los gráficos aparecerán cuando haya actividad</p>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    // Group sessions by date
    const sessionsByDate = savedSessions.reduce((acc, session) => {
      const date = new Date(session.startTime).toLocaleDateString('es-ES', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(session);
      return acc;
    }, {} as Record<string, StreamSession[]>);

    const dates = Object.keys(sessionsByDate).reverse(); // Most recent first

    if (savedSessions.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No hay registros guardados</p>
          <p className="text-xs mt-2 text-gray-600">
            Guarda sesiones desde "Data Stream" para verlas aquí
          </p>
        </div>
      );
    }

    // Calculate totals
    const totalMessages = savedSessions.reduce((acc, s) => acc + s.messages.length, 0);
    const totalSessions = savedSessions.length;

    return (
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">{totalSessions} sesiones guardadas</p>
                <p className="text-xs text-gray-400">{totalMessages.toLocaleString()} mensajes totales</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{dates.length} días</p>
            </div>
          </div>
        </div>

        {/* Sessions grouped by date */}
        <div className="space-y-3">
          {dates.map(date => {
            const sessions = sessionsByDate[date];
            const dayMessages = sessions.reduce((acc, s) => acc + s.messages.length, 0);
            
            return (
              <div key={date} className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
                {/* Date Header */}
                <div className="px-3 py-2 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white capitalize">{date}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {sessions.length} sesión{sessions.length > 1 ? 'es' : ''} • {dayMessages} msgs
                  </span>
                </div>
                
                {/* Sessions for this date */}
                <div className="divide-y divide-white/5">
                  {sessions.map(session => {
                    const sessionMetrics = session.messages.length > 0 ? analyzeChat(session.messages) : null;
                    const duration = session.endTime 
                      ? Math.round((session.endTime - session.startTime) / 60000) 
                      : Math.round((Date.now() - session.startTime) / 60000);
                    
                    return (
                      <div key={session.id} className="p-3 hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400 font-medium text-sm">#{session.channelName}</span>
                              {sessionMetrics && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  sessionMetrics.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                                  sessionMetrics.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {sessionMetrics.sentiment === 'positive' ? '😊' : 
                                   sessionMetrics.sentiment === 'negative' ? '😔' : '😐'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(session.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>{duration}min</span>
                              {sessionMetrics && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {sessionMetrics.uniqueUsers}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">{session.messages.length}</p>
                            <p className="text-[10px] text-gray-500">msgs</p>
                          </div>
                        </div>
                        
                        {/* Quick metrics bar */}
                        {sessionMetrics && sessionMetrics.engagementScore > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-gray-700/50 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${sessionMetrics.engagementScore}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500">{sessionMetrics.engagementScore}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Export All */}
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(savedSessions, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `registros-stream-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
          }}
          className="w-full flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm"
        >
          <Download className="w-4 h-4" />
          Exportar todos los registros
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-white">Analytics</h2>
            <p className="text-xs text-gray-500">Métricas en tiempo real</p>
          </div>
          {aiConfig && Object.values(aiConfig.providers).some(p => p.enabled) && (
            <span className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              IA
            </span>
          )}
        </div>

        {/* Tabs - Data Stream y Registros Stream */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'live' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Activity className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Data Stream</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Database className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Registros</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'live' ? (
          (isStreamActive || currentSession) ? renderLiveAnalytics() : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t.analytics.noActiveStream}</p>
              <p className="text-sm mt-1 text-gray-600">{t.analytics.connectToSee}</p>
            </div>
          )
        ) : (
          renderHistory()
        )}
      </div>
    </div>
  );
};
