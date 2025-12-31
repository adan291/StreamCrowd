import React, { useState } from 'react';
import type { MobileAppState, MobileMessage, MobilePredictionState } from '../../types/mobile';

/**
 * PredictionsScreen - View and manage predictions from mobile
 * @requirements Task 8 - Crear PredictionsScreen
 */

interface PredictionsScreenProps {
  state: MobileAppState;
  onAction: (action: MobileMessage) => void;
  onBack: () => void;
}

export const PredictionsScreen: React.FC<PredictionsScreenProps> = ({
  state,
  onAction,
  onBack,
}) => {
  const { prediction } = state;
  const [showResolveModal, setShowResolveModal] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="bg-zinc-900 px-4 py-4 border-b border-zinc-800 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">Predicciones</h1>
      </div>

      {/* Content */}
      <div className="p-4">
        {prediction ? (
          <PredictionCard
            prediction={prediction}
            onAction={onAction}
            onResolve={() => setShowResolveModal(true)}
          />
        ) : (
          <EmptyState />
        )}

        {/* Info */}
        <div className="mt-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">💡 Tip</h3>
          <p className="text-xs text-zinc-500">
            Las predicciones permiten a los viewers apostar puntos de canal.
            Puedes bloquear, resolver o cancelar desde aquí.
          </p>
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && prediction && (
        <ResolveModal
          prediction={prediction}
          onResolve={(outcomeId) => {
            onAction({ type: 'PREDICTION_RESOLVE', data: { predictionId: prediction.id, outcomeId } });
            setShowResolveModal(false);
          }}
          onClose={() => setShowResolveModal(false)}
        />
      )}
    </div>
  );
};

interface PredictionCardProps {
  prediction: MobilePredictionState;
  onAction: (action: MobileMessage) => void;
  onResolve: () => void;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, onAction, onResolve }) => {
  const statusLabels = {
    active: 'Activa',
    locked: 'Bloqueada',
    resolved: 'Resuelta',
    cancelled: 'Cancelada',
  };

  const statusColors = {
    active: 'text-green-400 bg-green-500/20',
    locked: 'text-yellow-400 bg-yellow-500/20',
    resolved: 'text-blue-400 bg-blue-500/20',
    cancelled: 'text-red-400 bg-red-500/20',
  };

  const formatPoints = (points: number): string => {
    if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
    if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
    return points.toString();
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[prediction.status]}`}>
            {statusLabels[prediction.status]}
          </span>
          <span className="text-xs text-zinc-500">
            {formatPoints(prediction.totalPoints)} puntos
          </span>
        </div>
        <h2 className="text-white font-medium">{prediction.title}</h2>
      </div>

      {/* Outcomes */}
      <div className="p-4 space-y-3">
        {prediction.outcomes.map((outcome) => (
          <div
            key={outcome.id}
            className={`relative rounded-lg overflow-hidden ${
              prediction.resolvedOutcomeId === outcome.id
                ? 'ring-2 ring-green-500'
                : ''
            }`}
          >
            {/* Background bar */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundColor: outcome.color,
                width: `${outcome.percentage}%`,
              }}
            />
            
            {/* Content */}
            <div className="relative p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {prediction.resolvedOutcomeId === outcome.id && (
                  <span className="text-green-400">✓</span>
                )}
                <span className="text-white font-medium">{outcome.title}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">{outcome.percentage}%</div>
                <div className="text-xs text-zinc-400">
                  {formatPoints(outcome.points)} pts • {outcome.users} usuarios
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {(prediction.status === 'active' || prediction.status === 'locked') && (
        <div className="p-4 border-t border-zinc-800 flex gap-2">
          {prediction.status === 'active' && (
            <button
              onClick={() => onAction({ type: 'PREDICTION_LOCK', data: { predictionId: prediction.id } })}
              className="flex-1 py-3 bg-yellow-500/20 text-yellow-400 rounded-xl font-medium hover:bg-yellow-500/30 transition-colors"
            >
              🔒 Bloquear
            </button>
          )}
          
          {prediction.status === 'locked' && (
            <button
              onClick={onResolve}
              className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
            >
              ✓ Resolver
            </button>
          )}
          
          <button
            onClick={() => onAction({ type: 'PREDICTION_CANCEL', data: { predictionId: prediction.id } })}
            className="py-3 px-4 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
    <div className="text-4xl mb-4">🔮</div>
    <h2 className="text-white font-medium mb-2">Sin predicción activa</h2>
    <p className="text-zinc-500 text-sm">
      Las predicciones se crean desde la app de escritorio
    </p>
  </div>
);

interface ResolveModalProps {
  prediction: MobilePredictionState;
  onResolve: (outcomeId: string) => void;
  onClose: () => void;
}

const ResolveModal: React.FC<ResolveModalProps> = ({ prediction, onResolve, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50">
      <div className="w-full bg-zinc-900 rounded-t-2xl max-h-[80vh] overflow-auto">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Seleccionar ganador</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 space-y-3">
          <p className="text-zinc-400 text-sm mb-4">{prediction.title}</p>
          
          {prediction.outcomes.map((outcome) => (
            <button
              key={outcome.id}
              onClick={() => onResolve(outcome.id)}
              className="w-full p-4 bg-zinc-800 rounded-xl text-left hover:bg-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{outcome.title}</span>
                <span className="text-zinc-400">{outcome.percentage}%</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {outcome.users} usuarios • {outcome.points.toLocaleString()} puntos
              </div>
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-zinc-800 text-zinc-400 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PredictionsScreen;
