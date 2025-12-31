// MetricsDashboard - Main dashboard component with configurable widgets

import React, { useState, useCallback } from 'react';
import { useMetrics } from '../../hooks/useMetrics';
import { useDashboardLayout } from '../../hooks/useDashboardLayout';
import { TimeWindow, WidgetType } from '../../types/metrics';
import ViewersChart from './ViewersChart';
import ChatChart from './ChatChart';
import EngagementChart from './EngagementChart';

const WIDGET_OPTIONS: { type: WidgetType; label: string; icon: string }[] = [
  { type: 'viewers_chart', label: 'Viewers', icon: '👁️' },
  { type: 'chat_chart', label: 'Chat', icon: '💬' },
  { type: 'engagement_chart', label: 'Engagement', icon: '🎯' },
  { type: 'summary_card', label: 'Resumen', icon: '📊' },
  { type: 'events_timeline', label: 'Eventos', icon: '📅' },
  { type: 'insights_list', label: 'Insights', icon: '💡' },
];

export const MetricsDashboard: React.FC = () => {
  const { currentSession, isRecording, startSession, endSession } = useMetrics();
  const { layout, addWidget, removeWidget, toggleCompactMode, toggleAutoRefresh, resetLayout } = useDashboardLayout();
  
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('15min');
  const [isPaused, setIsPaused] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);

  // Handle session start
  const handleStartSession = useCallback(() => {
    startSession('twitch', 'demo_channel');
  }, [startSession]);

  // Handle session end
  const handleEndSession = useCallback(async () => {
    await endSession();
  }, [endSession]);

  // Toggle pause
  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
    toggleAutoRefresh();
  }, [toggleAutoRefresh]);

  // Render widget based on type
  const renderWidget = (type: WidgetType, id: string) => {
    switch (type) {
      case 'viewers_chart':
        return (
          <ViewersChart
            data={currentSession?.timeSeries.viewers}
            timeWindow={timeWindow}
            onTimeWindowChange={setTimeWindow}
          />
        );
      case 'chat_chart':
        return (
          <ChatChart
            data={currentSession?.timeSeries.chat_messages}
            timeWindow={timeWindow}
            onTimeWindowChange={setTimeWindow}
          />
        );
      case 'engagement_chart':
        return (
          <EngagementChart
            pollData={currentSession?.timeSeries.poll_participation}
            predictionData={currentSession?.timeSeries.prediction_participation}
            timeWindow={timeWindow}
            onTimeWindowChange={setTimeWindow}
          />
        );
      case 'summary_card':
        return (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">📊 Resumen</h3>
            {currentSession ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-xl font-bold text-purple-400">
                    {currentSession.summary.peakViewers}
                  </div>
                  <div className="text-xs text-gray-400">Peak Viewers</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-xl font-bold text-blue-400">
                    {currentSession.summary.totalMessages}
                  </div>
                  <div className="text-xs text-gray-400">Mensajes</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-xl font-bold text-green-400">
                    {currentSession.summary.newFollowers}
                  </div>
                  <div className="text-xs text-gray-400">Followers</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-xl font-bold text-yellow-400">
                    {currentSession.summary.newSubscribers}
                  </div>
                  <div className="text-xs text-gray-400">Subs</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                Sin sesión activa
              </div>
            )}
          </div>
        );
      case 'events_timeline':
        return (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">📅 Eventos</h3>
            {currentSession && currentSession.events.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentSession.events.slice(-10).reverse().map(event => (
                  <div key={event.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      event.type === 'poll' ? 'bg-green-600' :
                      event.type === 'prediction' ? 'bg-orange-600' :
                      event.type === 'raid' ? 'bg-purple-600' :
                      'bg-gray-600'
                    }`}>
                      {event.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                Sin eventos
              </div>
            )}
          </div>
        );
      case 'insights_list':
        return (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">💡 Insights</h3>
            <div className="text-gray-500 text-center py-4">
              Los insights se generan al finalizar la sesión
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Dashboard de Métricas</h1>
          <p className="text-gray-400 text-sm">
            {isRecording ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Grabando: {currentSession?.channelName}
              </span>
            ) : (
              'Sin sesión activa'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Session controls */}
          {isRecording ? (
            <>
              <button
                onClick={handleTogglePause}
                className={`px-3 py-2 rounded ${
                  isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
                } text-white text-sm`}
              >
                {isPaused ? '▶️ Reanudar' : '⏸️ Pausar'}
              </button>
              <button
                onClick={handleEndSession}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                ⏹️ Finalizar
              </button>
            </>
          ) : (
            <button
              onClick={handleStartSession}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
            >
              ▶️ Iniciar Sesión
            </button>
          )}

          {/* Layout controls */}
          <button
            onClick={() => setShowAddWidget(!showAddWidget)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            ➕ Widget
          </button>
          <button
            onClick={toggleCompactMode}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            {layout.compactMode ? '📐 Normal' : '📱 Compacto'}
          </button>
          <button
            onClick={resetLayout}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Add widget dropdown */}
      {showAddWidget && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-white font-semibold mb-2">Añadir Widget</h3>
          <div className="flex flex-wrap gap-2">
            {WIDGET_OPTIONS.map(option => (
              <button
                key={option.type}
                onClick={() => {
                  addWidget(option.type);
                  setShowAddWidget(false);
                }}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Widgets grid */}
      <div className={`grid gap-4 ${
        layout.compactMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      }`}>
        {layout.widgets.map(widget => (
          <div
            key={widget.id}
            className="relative"
            style={{
              gridColumn: layout.compactMode ? 'span 1' : `span ${widget.size.width}`,
            }}
          >
            {renderWidget(widget.type, widget.id)}
            <button
              onClick={() => removeWidget(widget.id)}
              className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs opacity-0 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Last update indicator */}
      <div className="mt-4 text-center text-gray-500 text-xs">
        Última actualización: {new Date().toLocaleTimeString()}
        {layout.autoRefresh && !isPaused && (
          <span className="ml-2">• Auto-refresh cada {layout.refreshInterval / 1000}s</span>
        )}
      </div>
    </div>
  );
};

export default MetricsDashboard;
