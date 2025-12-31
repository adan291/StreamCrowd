import React, { useState } from 'react';
import type { MobileAppState, MobileMessage, MobilePollCreateData } from '../../types/mobile';

/**
 * PollsScreen - View and manage polls from mobile
 * @requirements Task 7 - Crear PollsScreen
 */

interface PollsScreenProps {
  state: MobileAppState;
  onAction: (action: MobileMessage) => void;
  onBack: () => void;
}

export const PollsScreen: React.FC<PollsScreenProps> = ({
  state,
  onAction,
  onBack,
}) => {
  const { poll } = state;
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState('');

  const handleCreate = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;

    const data: MobilePollCreateData = {
      question: question.trim(),
      options: options.filter(o => o.trim()),
      duration: duration ? parseInt(duration, 10) : undefined,
    };

    onAction({ type: 'POLL_CREATE', data });
    setShowCreate(false);
    setQuestion('');
    setOptions(['', '']);
    setDuration('');
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

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
        <h1 className="text-lg font-bold text-white">Encuestas</h1>
      </div>

      {/* Active Poll */}
      {poll ? (
        <div className="p-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
                EN CURSO
              </span>
              <span className="text-sm text-zinc-400">{poll.totalVotes} votos</span>
            </div>
            
            <h2 className="text-white font-medium mb-4">{poll.question}</h2>
            
            <div className="space-y-3 mb-4">
              {poll.options.map((option) => (
                <div key={option.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-300">{option.label}</span>
                    <span className="text-zinc-500">{option.votes} ({option.percentage}%)</span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${option.percentage}%`,
                        backgroundColor: option.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onAction({ type: 'POLL_CLOSE', data: { pollId: poll.id } })}
                className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => onAction({ type: 'POLL_RESET', data: { pollId: poll.id } })}
                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      ) : showCreate ? (
        /* Create Poll Form */
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Pregunta</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿Cuál prefieres?"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Opciones</label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="p-3 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-zinc-800"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                onClick={addOption}
                className="mt-2 text-sm text-purple-400 hover:text-purple-300"
              >
                + Añadir opción
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Duración (segundos, opcional)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Sin límite"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors"
            >
              Crear
            </button>
          </div>
        </div>
      ) : (
        /* No Active Poll */
        <div className="p-4">
          <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-white font-medium mb-2">Sin encuesta activa</h2>
            <p className="text-zinc-500 text-sm mb-6">Crea una nueva encuesta para tu stream</p>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              Nueva Encuesta
            </button>
          </div>

          {/* Quick Presets */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Presets Rápidos</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickPreset
                label="Sí / No"
                icon="✅"
                onClick={() => {
                  onAction({
                    type: 'POLL_CREATE',
                    data: { question: '¿Sí o No?', options: ['Sí', 'No'] }
                  });
                }}
              />
              <QuickPreset
                label="A / B / C"
                icon="🔤"
                onClick={() => {
                  onAction({
                    type: 'POLL_CREATE',
                    data: { question: '¿Cuál prefieres?', options: ['A', 'B', 'C'] }
                  });
                }}
              />
              <QuickPreset
                label="Rating 1-5"
                icon="⭐"
                onClick={() => {
                  onAction({
                    type: 'POLL_CREATE',
                    data: { question: '¿Qué puntuación?', options: ['1', '2', '3', '4', '5'] }
                  });
                }}
              />
              <QuickPreset
                label="Personalizado"
                icon="✏️"
                onClick={() => setShowCreate(true)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface QuickPresetProps {
  label: string;
  icon: string;
  onClick: () => void;
}

const QuickPreset: React.FC<QuickPresetProps> = ({ label, icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
  >
    <span className="text-xl">{icon}</span>
    <span className="text-white text-sm font-medium">{label}</span>
  </button>
);

export default PollsScreen;
