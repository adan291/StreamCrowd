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
  Star,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { TwitchMessage } from '../types';
import { useI18n } from '../i18n';

interface RandomWinnerProps {
  chatMessages: TwitchMessage[];
  onClose: () => void;
  isOverlayMode?: boolean;
}

type Mode = 'viewers' | 'keyword';

const OVERLAY_BG_COLORS = ['#00FF00', '#FF00FF', '#0000FF', '#000000', '#1a1a2e', 'transparent'];
const OVERLAY_TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];
const RANDOM_WINNER_CHANNEL = 'random_winner_sync';

interface WinnerState {
  winner: string | null;
  isSelecting: boolean;
  displayName: string;
  participantCount: number;
}

export const RandomWinner: React.FC<RandomWinnerProps> = ({ chatMessages, onClose, isOverlayMode = false }) => {
  const [overlayBgColor, setOverlayBgColor] = useState('#00FF00');
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [overlaySize, setOverlaySize] = useState<'normal' | 'large'>('large');
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('viewers');
  const [subsOnly, setSubsOnly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [winner, setWinner] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const startTimeRef = useRef<number>(0);
  const participantsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Ref para estado actual
  const stateRef = useRef({ winner, isSelecting, displayName });
  useEffect(() => {
    stateRef.current = { winner, isSelecting, displayName };
  }, [winner, isSelecting, displayName]);

  // Setup BroadcastChannel for sync
  useEffect(() => {
    channelRef.current = new BroadcastChannel(RANDOM_WINNER_CHANNEL);
    
    if (isOverlayMode) {
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') return;
        const state: WinnerState = event.data;
        setWinner(state.winner);
        setIsSelecting(state.isSelecting);
        setDisplayName(state.displayName || '');
      };
      setTimeout(() => channelRef.current?.postMessage({ type: 'request_sync' }), 100);
    } else {
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') {
          const s = stateRef.current;
          channelRef.current?.postMessage({ winner: s.winner, isSelecting: s.isSelecting, displayName: s.displayName });
        }
      };
    }
    
    return () => { channelRef.current?.close(); };
  }, [isOverlayMode]);

  const syncToOverlay = (state: Partial<WinnerState>) => {
    if (!isOverlayMode && channelRef.current) {
      channelRef.current.postMessage({
        winner,
        isSelecting,
        displayName,
        participantCount: mode === 'viewers' ? getViewers().length : participants.size,
        ...state
      });
    }
  };

  const getViewers = () => {
    const viewers = new Set<string>();
    chatMessages.forEach((msg) => {
      if (subsOnly) {
        if (msg.badges?.includes('subscriber') || msg.badges?.includes('founder')) {
          viewers.add(msg.username);
        }
      } else {
        viewers.add(msg.username);
      }
    });
    return Array.from(viewers);
  };

  useEffect(() => {
    if (mode === 'keyword' && isRunning && keyword.trim() && !isOverlayMode) {
      const keywordLower = keyword.toLowerCase().trim();
      chatMessages.forEach((msg) => {
        if (msg.timestamp && msg.timestamp > startTimeRef.current) {
          if (msg.message.toLowerCase().includes(keywordLower)) {
            participantsRef.current.add(msg.username);
            setParticipants(new Set(participantsRef.current));
          }
        }
      });
    }
  }, [chatMessages, mode, isRunning, keyword, isOverlayMode]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0 || isOverlayMode) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { setIsRunning(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isOverlayMode]);

  const startSelection = () => {
    setWinner(null);
    setIsSelecting(false);
    syncToOverlay({ winner: null, isSelecting: false, displayName: '' });

    if (mode === 'viewers') {
      const viewers = getViewers();
      if (viewers.length === 0) return;
      animateSelection(viewers);
    } else {
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
      const participantList: string[] = Array.from(participantsRef.current);
      if (participantList.length === 0) return;
      animateSelection(participantList);
    }
  };

  const animateSelection = (candidates: string[]) => {
    setIsSelecting(true);
    syncToOverlay({ isSelecting: true, winner: null });
    let iterations = 0;
    const maxIterations = 20;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      setDisplayName(candidates[randomIndex]);
      syncToOverlay({ displayName: candidates[randomIndex], isSelecting: true });
      iterations++;

      if (iterations >= maxIterations) {
        clearInterval(interval);
        const winnerIndex = Math.floor(Math.random() * candidates.length);
        const winnerName = candidates[winnerIndex];
        setWinner(winnerName);
        setDisplayName(winnerName);
        setIsSelecting(false);
        syncToOverlay({ winner: winnerName, displayName: winnerName, isSelecting: false });
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
    syncToOverlay({ winner: null, isSelecting: false, displayName: '' });
  };

  const openOverlayWindow = () => {
    const width = 450;
    const height = 350;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayRandomWinner=true`, 'RandomWinnerOverlay', `width=${width},height=${height},left=${left},top=${top}`);
  };

  const viewerCount = getViewers().length;


  // Tamaños de texto para overlay
  const getOverlayTextSize = () => overlaySize === 'large' ? 'text-6xl' : 'text-4xl';
  const getOverlayTitleSize = () => overlaySize === 'large' ? 'text-3xl' : 'text-xl';
  const getOverlayIconSize = () => overlaySize === 'large' ? 40 : 28;

  // Overlay Mode - Solo visualización
  if (isOverlayMode) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4" style={{ backgroundColor: overlayBgColor }}>
        <button onClick={() => setShowOverlaySettings(!showOverlaySettings)} className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50">
          <Settings size={18} />
        </button>
        {showOverlaySettings && (
          <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-64">
            <p className="text-xs text-zinc-400 mb-2 font-bold">Fondo (Chroma)</p>
            <div className="flex gap-1 mb-3">
              {OVERLAY_BG_COLORS.map((color) => (
                <button 
                  key={color} 
                  onClick={() => setOverlayBgColor(color)} 
                  className={`w-7 h-7 rounded border-2 ${overlayBgColor === color ? 'border-white scale-110' : 'border-transparent'} ${color === 'transparent' ? 'bg-[conic-gradient(#666_25%,#888_25%_50%,#666_50%_75%,#888_75%)] bg-[length:8px_8px]' : ''}`} 
                  style={{ backgroundColor: color === 'transparent' ? undefined : color }} 
                />
              ))}
            </div>
            <p className="text-xs text-zinc-400 mb-2 font-bold">Color de texto</p>
            <div className="flex gap-1 mb-3">
              {OVERLAY_TEXT_COLORS.map((color) => (
                <button 
                  key={color} 
                  onClick={() => setOverlayTextColor(color)} 
                  className={`w-7 h-7 rounded border-2 ${overlayTextColor === color ? 'border-white scale-110' : 'border-zinc-600'}`} 
                  style={{ backgroundColor: color }} 
                />
              ))}
            </div>
            <p className="text-xs text-zinc-400 mb-2 font-bold">Tamaño</p>
            <div className="flex gap-1">
              {(['normal', 'large'] as const).map((size) => (
                <button 
                  key={size} 
                  onClick={() => setOverlaySize(size)} 
                  className={`flex-1 py-1.5 rounded text-xs font-medium ${overlaySize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'}`}
                >
                  {size === 'normal' ? 'Normal' : 'Grande'}
                </button>
              ))}
            </div>
          </div>
        )}

        {(winner || isSelecting) ? (
          <div className="text-center">
            <div className={`inline-block px-12 py-8 rounded-3xl ${winner && !isSelecting ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse' : 'bg-black/50'}`}>
              {winner && !isSelecting && (
                <div className="flex items-center gap-3 mb-3 justify-center">
                  <Crown className="text-white" size={getOverlayIconSize()} />
                  <span className={`text-white/90 ${getOverlayTitleSize()} font-bold`}>¡GANADOR!</span>
                  <Crown className="text-white" size={getOverlayIconSize()} />
                </div>
              )}
              <span 
                className={`font-bold ${getOverlayTextSize()} drop-shadow-lg`}
                style={{ color: winner && !isSelecting ? overlayTextColor : '#a78bfa' }}
              >
                {displayName || '...'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center bg-black/50 rounded-2xl px-10 py-8">
            <Trophy className="text-yellow-400 mx-auto mb-3" size={overlaySize === 'large' ? 64 : 48} />
            <p className={`text-white/70 ${overlaySize === 'large' ? 'text-2xl' : 'text-xl'}`}>Esperando sorteo...</p>
          </div>
        )}
      </div>
    );
  }

  // Normal Mode - UI completa
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-2 flex items-center justify-center gap-2">
          <Trophy className="text-yellow-400" /> Random Winner
        </h2>
        <p className="text-zinc-400 text-center text-sm mb-4">Selecciona un ganador aleatorio del chat</p>

        <button onClick={openOverlayWindow} className="w-full mb-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-500/80 hover:to-orange-500/80 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
          <ExternalLink size={16} /> Abrir Overlay para OBS
        </button>

        <div className="flex gap-2 mb-6">
          <button onClick={() => { setMode('viewers'); reset(); }} className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${mode === 'viewers' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <Users size={18} /> Viewers
          </button>
          <button onClick={() => { setMode('keyword'); reset(); }} className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${mode === 'keyword' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <MessageSquare size={18} /> Palabra Clave
          </button>
        </div>

        {mode === 'viewers' && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-xl">
              <div className="flex items-center gap-2">
                <Star className="text-yellow-400" size={18} />
                <span className="text-white text-sm">Solo Suscriptores</span>
              </div>
              <button onClick={() => setSubsOnly(!subsOnly)} className={`relative w-12 h-6 rounded-full transition-colors ${subsOnly ? 'bg-yellow-500' : 'bg-zinc-600'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${subsOnly ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
              <p className="text-zinc-400 text-sm">Participantes disponibles</p>
              <p className="text-3xl font-bold text-white mt-1">{viewerCount}</p>
              <p className="text-xs text-zinc-500 mt-1">{subsOnly ? 'suscriptores en el chat' : 'usuarios en el chat'}</p>
            </div>
          </div>
        )}

        {mode === 'keyword' && (
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-bold uppercase">Palabra Clave</label>
              <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Ej: participar, sorteo, yo..." disabled={isRunning} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 disabled:opacity-50" />
            </div>
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-1"><Clock size={14} /> Tiempo límite (segundos)</label>
              <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Math.max(10, parseInt(e.target.value) || 60))} min="10" max="300" disabled={isRunning} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 disabled:opacity-50" />
            </div>
            {(isRunning || participants.size > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                  <p className="text-zinc-400 text-xs">Tiempo</p>
                  <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</p>
                </div>
                <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                  <p className="text-zinc-400 text-xs">Participantes</p>
                  <p className="text-2xl font-bold text-green-400">{participants.size}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {(winner || isSelecting) && (
          <div className="mb-6 text-center">
            <div className={`inline-block px-8 py-4 rounded-2xl ${winner && !isSelecting ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse' : 'bg-zinc-800'}`}>
              {winner && !isSelecting && (
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="text-white" size={20} />
                  <span className="text-white/80 text-sm">¡GANADOR!</span>
                  <Crown className="text-white" size={20} />
                </div>
              )}
              <span className={`font-bold text-2xl ${winner && !isSelecting ? 'text-white' : 'text-purple-400'}`}>{displayName || '...'}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {mode === 'viewers' && (
            <>
              <button onClick={startSelection} disabled={viewerCount === 0 || isSelecting} className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all">
                <Sparkles size={20} /> {isSelecting ? 'Seleccionando...' : 'Seleccionar Ganador'}
              </button>
              <button onClick={reset} disabled={isSelecting} className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-xl transition-all">
                <RotateCcw size={20} />
              </button>
            </>
          )}
          {mode === 'keyword' && !isRunning && participants.size === 0 && (
            <button onClick={startSelection} disabled={!keyword.trim()} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all">
              <Play size={20} /> Iniciar Recolección
            </button>
          )}
          {mode === 'keyword' && isRunning && (
            <button onClick={selectWinner} className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all animate-pulse">
              <Trophy size={20} /> Terminar y Elegir ({participants.size})
            </button>
          )}
          {mode === 'keyword' && !isRunning && participants.size > 0 && !winner && (
            <>
              <button onClick={() => animateSelection(Array.from(participants))} disabled={isSelecting} className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 text-white font-bold rounded-xl transition-all">
                <Sparkles size={20} /> {isSelecting ? 'Seleccionando...' : 'Elegir Ganador'}
              </button>
              <button onClick={reset} disabled={isSelecting} className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-xl transition-all">
                <RotateCcw size={20} />
              </button>
            </>
          )}
          {mode === 'keyword' && winner && (
            <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl transition-all">
              <RotateCcw size={20} /> Nuevo Sorteo
            </button>
          )}
        </div>

        <p className="text-center text-zinc-500 text-xs mt-4">
          {mode === 'viewers' ? 'Selecciona un ganador de los usuarios que han escrito en el chat' : 'Los usuarios deben escribir la palabra clave para participar'}
        </p>
      </div>
    </div>
  );
};
