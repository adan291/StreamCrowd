import React, { useState, useEffect } from 'react';
import { Timer, Trophy, Check } from 'lucide-react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { gameSync } from '../../services/firebaseSync';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

interface PlayerScore {
  username: string;
  color: string;
  score: number;
  streak: number;
}

interface TriviaState {
  gameState: 'setup' | 'question' | 'results' | 'final';
  currentQuestion: Question | null;
  questionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  showCorrect: boolean;
  answerCounts: number[];
  topPlayers: PlayerScore[];
}

const GAME_CHANNEL = 'trivia_battle_sync';
const STORAGE_KEY_TRIVIA = 'trivia_battle_state';

export const TriviaOverlay: React.FC = () => {
  const { bgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [state, setState] = useState<TriviaState>({
    gameState: 'setup',
    currentQuestion: null,
    questionIndex: 0,
    totalQuestions: 0,
    timeLeft: 0,
    showCorrect: false,
    answerCounts: [0, 0, 0, 0],
    topPlayers: []
  });

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    
    const handleState = (data: any) => {
      if (data.type === 'trivia_state') {
        setState(data);
      }
    };
    
    channel.onmessage = (e) => handleState(e.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'trivia' && data.state) {
        handleState({ ...data.state, type: 'trivia_state' });
      }
    });
    
    // Also poll localStorage for legacy support
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_TRIVIA);
        if (stored) handleState(JSON.parse(stored));
      } catch { /* ignore */ }
    };
    loadFromStorage();
    const pollInterval = setInterval(loadFromStorage, 300);
    
    return () => {
      channel.close();
      unsubscribeFirebase();
      clearInterval(pollInterval);
    };
  }, []);

  const totalAnswers = state.answerCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col items-center justify-center p-8" style={{ backgroundColor: bgColor }}>
      <OverlayChromaKey {...chromaKeyProps} />
      {/* Setup/Waiting */}
      {state.gameState === 'setup' && (
        <div className="text-center">
          <p className="text-white text-2xl font-bold bg-black/60 backdrop-blur rounded-xl px-8 py-4">
            🧠 Trivia Battle
          </p>
          <p className="text-zinc-300 mt-2 bg-black/40 rounded-lg px-4 py-2">
            Preparando preguntas...
          </p>
        </div>
      )}

      {/* Question */}
      {(state.gameState === 'question' || state.gameState === 'results') && state.currentQuestion && (
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="bg-black/60 backdrop-blur rounded-xl px-4 py-2">
              <span className="text-white font-medium">
                Pregunta {state.questionIndex + 1} / {state.totalQuestions}
              </span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              state.timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-purple-500'
            }`}>
              <Timer size={20} className="text-white" />
              <span className="text-white font-bold text-xl">{state.timeLeft}s</span>
            </div>
          </div>

          {/* Question */}
          <div className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur rounded-2xl p-6">
            <p className="text-white text-2xl font-bold text-center">
              {state.currentQuestion.question}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            {state.currentQuestion.options.map((option, i) => {
              const isCorrect = i === state.currentQuestion!.correctIndex;
              const percentage = totalAnswers > 0 ? Math.round((state.answerCounts[i] / totalAnswers) * 100) : 0;
              
              return (
                <div
                  key={i}
                  className={`relative p-4 rounded-xl transition-all ${
                    state.showCorrect
                      ? isCorrect
                        ? 'bg-green-500/80 ring-4 ring-green-400'
                        : 'bg-zinc-700/60 opacity-60'
                      : 'bg-zinc-700/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      state.showCorrect && isCorrect ? 'bg-green-400' : 'bg-zinc-600'
                    } text-white`}>
                      {state.showCorrect && isCorrect ? <Check size={20} /> : i + 1}
                    </span>
                    <span className="text-white text-lg font-medium flex-1">{option}</span>
                    {state.showCorrect && (
                      <span className="text-white font-bold">{state.answerCounts[i]} ({percentage}%)</span>
                    )}
                  </div>
                  {state.showCorrect && (
                    <div 
                      className={`absolute bottom-0 left-0 h-1.5 rounded-b-xl transition-all ${
                        isCorrect ? 'bg-green-400' : 'bg-zinc-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Instructions */}
          <div className="text-center">
            <p className="text-zinc-300 bg-black/40 rounded-lg px-4 py-2 inline-block">
              Responde con 1, 2, 3 o 4 en el chat
            </p>
          </div>
        </div>
      )}

      {/* Final Results */}
      {state.gameState === 'final' && (
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-r from-yellow-500/80 to-orange-500/80 backdrop-blur rounded-2xl p-6">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Trophy size={32} className="text-yellow-300" />
              <span className="text-white text-2xl font-bold">¡Resultados!</span>
            </div>
            
            <div className="space-y-3">
              {state.topPlayers.slice(0, 5).map((player, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    i === 0 ? 'bg-yellow-400/30' : i === 1 ? 'bg-zinc-300/20' : i === 2 ? 'bg-orange-600/20' : 'bg-zinc-700/30'
                  }`}
                >
                  <span className="text-2xl w-10">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <span className="flex-1 font-bold text-lg" style={{ color: player.color }}>
                    {player.username}
                  </span>
                  <span className="text-yellow-300 font-bold text-xl">{player.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Top 3 during game */}
      {(state.gameState === 'question' || state.gameState === 'results') && state.topPlayers.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-xs text-zinc-400">Top 3</span>
          </div>
          <div className="space-y-1">
            {state.topPlayers.slice(0, 3).map((player, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>{i === 0 ? '👑' : ''}</span>
                <span style={{ color: player.color }}>{player.username}</span>
                <span className="text-yellow-400">{player.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TriviaOverlay;
