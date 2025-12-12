import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  RotateCcw, 
  Users, 
  Crown, 
  Clock, 
  MessageSquare,
  Sparkles,
  Trophy,
  Star
} from 'lucide-react';
import { TwitchMessage } from '../types';
import { useI18n } from '../i18n';

interface RandomWinnerProps {
  chatMessages: TwitchMessage[];
  onClose: () => void;
}

type Mode = 'viewers' | 'keyword';

export const RandomWinner: React.FC<RandomWinnerProps> = ({ chatMessages, onClose }) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('viewers');
  const [subsOnly, setSubsOnly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [timeLimit, setTimeLimit] = useState(60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [winner, setWinner] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const startTimeRef = useRef<number>(0);
  const participantsRef = useRef<Set<string>>(new Set());

  // Get unique viewers from chat
  const getViewers = () => {
    const viewers = new Set<string>();
    chatMessages.forEach(msg => {
      if (subsOnly) {
        // Check if user is subscriber (badges contain 'subscriber')
        if (msg.badges?.includes('subscriber') || msg.badges?.includes('founder')) {
          viewers.add(msg.username);
        }
      } else {
        viewers.add(msg.username);
      }
    });
    return Array.from(viewers);
  };

  // Listen for keyword messages
  useEffect(() => {
    if (mode === 'keyword' && isRunning && keyword.trim()) {
      const keywordLower = keyword.toLowerCase().trim();
      chatMessages.forEach(msg => {
        if (msg.timestamp > startTimeRef.current) {
          if (msg.message.toLowerCase().includes(keywordLower)) {
            participantsRef.current.add(msg.username);
            setParticipants(new Set(participantsRef.current));
          }
        }
      });
    }
  }, [chatMessages, mode, isRunning, keyword]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const startSelection = () => {
    setWinner(null);
    setIsSelecting(false);
    
    if (mode === 'viewers') {
      // Immediate selection from current viewers
      const viewers = getViewers();
      if (viewers.length === 0) {
        return;
      }
      animateSelection(viewers);
    } else {
      // Start keyword collection
      participantsRef.current = new Set();
      setParticipants(new Set());
      startTimeRef.current = Date.now();
      setTimeLeft(timeLimit);
      setIsRunning(true);
    }
  };

  const selectWinner = () => {
    if (mode === 'keyword') {
      setIsRunning(false);
      const participantList = Array.from(participantsRef.current);
      if (participantList.length === 0) {
        return;
      }
      animateSelection(participantList);
    }
  };

  const animateSelection = (candidates: string[]) => {
    setIsSelecting(true);
    let iterations = 0;
    const maxIterations = 20;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      setDisplayName(candidates[randomIndex]);
      iterations++;
      
      if (iterations >= maxIterations) {
        clearInterval(interval);
        const winnerIndex = Math.floor(Math.random() * candidates.length);
        setWinner(candidates[winnerIndex]);
        setDisplayName(candidates[winnerIndex]);
        setIsSelecting(false);
      }
    }, 100);
  };

  const reset = () => {
    setWinner(null);
    setIsRunning(false);
    setTimeLeft(0);
    setParticipants(new Set());
    participantsRef.current = new Set();
    setDisplayName('');
    setIsSelecting(false);
  };

  const viewerCount = getViewers().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-2 flex items-center justify-center gap-2">
          <Trophy className="text-yellow-400" />
          Random Winner
        </h2>
        <p className="text-zinc-400 text-center text-sm mb-6">
          Selecciona un ganador aleatorio del chat
        </p>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode('viewers'); reset(); }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'viewers' 
                ? 'bg-purple-500 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Users size={18} />
            Viewers
          </button>
          <button
            onClick={() => { setMode('keyword'); reset(); }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'keyword' 
                ? 'bg-purple-500 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <MessageSquare size={18} />
            Palabra Clave
          </button>
        </div>

        {/* Mode-specific options */}
        {mode === 'viewers' && (
          <div className="space-y-4 mb-6">
            {/* Subs Only Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-xl">
              <div className="flex items-center gap-2">
                <Star className="text-yellow-400" size={18} />
                <span className="text-white text-sm">Solo Suscriptores</span>
              </div>
              <button
                onClick={() => setSubsOnly(!subsOnly)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  subsOnly ? 'bg-yellow-500' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    subsOnly ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Viewer count */}
            <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
              <p className="text-zinc-400 text-sm">Participantes disponibles</p>
              <p className="text-3xl font-bold text-white mt-1">{viewerCount}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {subsOnly ? 'suscriptores en el chat' : 'usuarios en el chat'}
              </p>
            </div>
          </div>
        )}

        {mode === 'keyword' && (
          <div className="space-y-4 mb-6">
            {/* Keyword Input */}
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-bold uppercase">
                Palabra Clave
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ej: participar, sorteo, yo..."
                disabled={isRunning}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Time Limit */}
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-1">
                <Clock size={14} />
                Tiempo límite (segundos)
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Math.max(10, parseInt(e.target.value) || 60))}
                min="10"
                max="300"
                disabled={isRunning}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Timer & Participants */}
            {(isRunning || participants.size > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                  <p className="text-zinc-400 text-xs">Tiempo</p>
                  <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                    {timeLeft}s
                  </p>
                </div>
                <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                  <p className="text-zinc-400 text-xs">Participantes</p>
                  <p className="text-2xl font-bold text-green-400">{participants.size}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Winner Display */}
        {(winner || isSelecting) && (
          <div className="mb-6 text-center">
            <div className={`inline-block px-8 py-4 rounded-2xl ${
              winner && !isSelecting
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
                : 'bg-zinc-800'
            }`}>
              {winner && !isSelecting && (
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="text-white" size={20} />
                  <span className="text-white/80 text-sm">¡GANADOR!</span>
                  <Crown className="text-white" size={20} />
                </div>
              )}
              <span className={`font-bold text-2xl ${
                winner && !isSelecting ? 'text-white' : 'text-purple-400'
              }`}>
                {displayName || '...'}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {mode === 'viewers' && (
            <>
              <button
                onClick={startSelection}
                disabled={viewerCount === 0 || isSelecting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
              >
                <Sparkles size={20} />
                {isSelecting ? 'Seleccionando...' : 'Seleccionar Ganador'}
              </button>
              <button
                onClick={reset}
                disabled={isSelecting}
                className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-xl transition-all"
              >
                <RotateCcw size={20} />
              </button>
            </>
          )}

          {mode === 'keyword' && !isRunning && participants.size === 0 && (
            <button
              onClick={startSelection}
              disabled={!keyword.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
            >
              <Play size={20} />
              Iniciar Recolección
            </button>
          )}

          {mode === 'keyword' && isRunning && (
            <button
              onClick={selectWinner}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all animate-pulse"
            >
              <Trophy size={20} />
              Terminar y Elegir ({participants.size})
            </button>
          )}

          {mode === 'keyword' && !isRunning && participants.size > 0 && !winner && (
            <>
              <button
                onClick={() => animateSelection(Array.from(participants))}
                disabled={isSelecting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 text-white font-bold rounded-xl transition-all"
              >
                <Sparkles size={20} />
                {isSelecting ? 'Seleccionando...' : 'Elegir Ganador'}
              </button>
              <button
                onClick={reset}
                disabled={isSelecting}
                className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-xl transition-all"
              >
                <RotateCcw size={20} />
              </button>
            </>
          )}

          {mode === 'keyword' && winner && (
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl transition-all"
            >
              <RotateCcw size={20} />
              Nuevo Sorteo
            </button>
          )}
        </div>

        {/* Help text */}
        <p className="text-center text-zinc-500 text-xs mt-4">
          {mode === 'viewers' 
            ? 'Selecciona un ganador de los usuarios que han escrito en el chat'
            : 'Los usuarios deben escribir la palabra clave para participar'
          }
        </p>
      </div>
    </div>
  );
};
