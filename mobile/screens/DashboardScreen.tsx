import React from 'react';
import type { MobileAppState, MobileMessage } from '../../types/mobile';

/**
 * DashboardScreen - Main dashboard with quick metrics and actions
 * @requirements Task 6 - Crear DashboardScreen
 */

interface DashboardScreenProps {
  state: MobileAppState;
  onAction: (action: MobileMessage) => void;
  onNavigate: (screen: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  state,
  onAction,
  onNavigate,
}) => {
  const { channelName, isLive, viewerCount, poll, prediction, timers, giveaways } = state;

  const activeTimers = timers.filter((t) => t.isRunning || t.isPaused);
  const activeGiveaways = giveaways.filter((g) => g.isActive);

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="bg-zinc-900 px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{channelName || 'Dashboard'}</h1>
            <div className="flex items-center gap-2 mt-1">
              {isLive ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 font-medium">EN VIVO</span>
                </span>
              ) : (
                <span className="text-zinc-500 text-xs">Offline</span>
              )}
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 text-xs">{viewerCount.toLocaleString()} viewers</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <StatCard
          label="Encuesta"
          value={poll ? 'Activa' : 'Ninguna'}
          icon="📊"
          active={!!poll}
          onClick={() => onNavigate('polls')}
        />
        <StatCard
          label="Predicción"
          value={prediction ? prediction.status : 'Ninguna'}
          icon="🎯"
          active={!!prediction}
          onClick={() => onNavigate('predictions')}
        />
        <StatCard
          label="Timers"
          value={activeTimers.length > 0 ? `${activeTimers.length} activo(s)` : 'Ninguno'}
          icon="⏱️"
          active={activeTimers.length > 0}
          onClick={() => onNavigate('timers')}
        />
        <StatCard
          label="Sorteos"
          value={activeGiveaways.length > 0 ? `${activeGiveaways.length} activo(s)` : 'Ninguno'}
          icon="🎁"
          active={activeGiveaways.length > 0}
          onClick={() => onNavigate('giveaways')}
        />
      </div>

      {/* Active Poll */}
      {poll && (
        <div className="mx-4 mb-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-white text-sm">Encuesta Activa</h3>
              <span className="text-xs text-zinc-500">{poll.totalVotes} votos</span>
            </div>
            <p className="text-zinc-300 text-sm mb-3">{poll.question}</p>
            <div className="space-y-2">
              {poll.options.slice(0, 3).map((option) => (
                <div key={option.id} className="flex items-center gap-2">
                  <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${option.percentage}%`,
                        backgroundColor: option.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-10 text-right">
                    {option.percentage}%
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onAction({ type: 'POLL_CLOSE', data: { pollId: poll.id } })}
              className="w-full mt-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
            >
              Cerrar Encuesta
            </button>
          </div>
        </div>
      )}

      {/* Active Prediction */}
      {prediction && prediction.status === 'active' && (
        <div className="mx-4 mb-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-white text-sm">Predicción Activa</h3>
              <span className="text-xs text-zinc-500">{prediction.totalPoints.toLocaleString()} puntos</span>
            </div>
            <p className="text-zinc-300 text-sm mb-3">{prediction.title}</p>
            <div className="grid grid-cols-2 gap-2">
              {prediction.outcomes.map((outcome) => (
                <button
                  key={outcome.id}
                  onClick={() => onAction({
                    type: 'PREDICTION_RESOLVE',
                    data: { predictionId: prediction.id, outcomeId: outcome.id }
                  })}
                  className="p-3 bg-zinc-800 rounded-lg text-left hover:bg-zinc-700 transition-colors"
                >
                  <span className="text-white text-sm font-medium block truncate">{outcome.title}</span>
                  <span className="text-zinc-500 text-xs">{outcome.percentage}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4">
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon="📊"
            label="Nueva Encuesta"
            onClick={() => onNavigate('polls')}
          />
          <QuickAction
            icon="🎯"
            label="Nueva Predicción"
            onClick={() => onNavigate('predictions')}
          />
          <QuickAction
            icon="⏱️"
            label="Nuevo Timer"
            onClick={() => onNavigate('timers')}
          />
          <QuickAction
            icon="🎁"
            label="Nuevo Sorteo"
            onClick={() => onNavigate('giveaways')}
          />
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  active?: boolean;
  onClick: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl text-left transition-colors ${
      active
        ? 'bg-purple-500/20 border border-purple-500/30'
        : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
    }`}
  >
    <span className="text-2xl mb-2 block">{icon}</span>
    <span className="text-zinc-400 text-xs block">{label}</span>
    <span className={`text-sm font-medium ${active ? 'text-purple-400' : 'text-white'}`}>
      {value}
    </span>
  </button>
);

// Quick Action Component
interface QuickActionProps {
  icon: string;
  label: string;
  onClick: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
  >
    <span className="text-xl">{icon}</span>
    <span className="text-white text-sm font-medium">{label}</span>
  </button>
);

export default DashboardScreen;
