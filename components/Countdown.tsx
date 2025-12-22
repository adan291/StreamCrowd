import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Clock,
  Plus,
  Gift,
  Coins,
  Heart,
  Zap,
  ChevronUp,
  ExternalLink,
  Minimize2,
  Maximize2,
  GripHorizontal,
} from 'lucide-react';
import { TwitchMessage } from '../types';
import { useI18n } from '../i18n';

interface CountdownConfig {
  initialMinutes: number;
  initialSeconds: number;
  subTime: number;
  bitsPer100: number;
  giftSubTime: number;
  raidTime: number;
  enableSubs: boolean;
  enableBits: boolean;
  enableGiftSubs: boolean;
  enableRaids: boolean;
}

interface CountdownProps {
  onClose: () => void;
  chatMessages?: TwitchMessage[];
  isOverlayMode?: boolean;
}

const DEFAULT_CONFIG: CountdownConfig = {
  initialMinutes: 5,
  initialSeconds: 0,
  subTime: 60,
  bitsPer100: 30,
  giftSubTime: 30,
  raidTime: 120,
  enableSubs: true,
  enableBits: true,
  enableGiftSubs: true,
  enableRaids: false,
};

const OVERLAY_BG_COLORS = ['#00FF00', '#FF00FF', '#0000FF', '#000000', '#1a1a2e', 'transparent'];
const OVERLAY_TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];
const COUNTDOWN_CHANNEL = 'countdown_sync';

interface CountdownState {
  timeLeft: number;
  isRunning: boolean;
  totalAdded: number;
  recentEvents: { type: string; amount: number; user: string }[];
}

export const Countdown: React.FC<CountdownProps> = ({
  onClose,
  chatMessages = [],
  isOverlayMode = false,
}) => {
  const { t } = useI18n();
  
  // Widget flotante - Estado minimizado/expandido (debe estar antes de cualquier return condicional)
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('countdown_widget_position');
    return saved ? JSON.parse(saved) : { x: 20, y: 80 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  
  const [overlayBgColor, setOverlayBgColor] = useState('#00FF00');
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [overlaySize, setOverlaySize] = useState<'normal' | 'large' | 'huge'>('large');
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const [config, setConfig] = useState<CountdownConfig>(() => {
    const saved = localStorage.getItem('countdown_config');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });
  const [showConfig, setShowConfig] = useState(false);
  const [timeLeft, setTimeLeft] = useState(config.initialMinutes * 60 + config.initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [totalAdded, setTotalAdded] = useState(0);
  const [recentEvents, setRecentEvents] = useState<{ type: string; amount: number; user: string }[]>([]);
  const lastProcessedIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Ref para estado actual
  const stateRef = useRef({ timeLeft, isRunning, totalAdded, recentEvents });
  useEffect(() => {
    stateRef.current = { timeLeft, isRunning, totalAdded, recentEvents };
  }, [timeLeft, isRunning, totalAdded, recentEvents]);

  // Setup BroadcastChannel for sync
  useEffect(() => {
    channelRef.current = new BroadcastChannel(COUNTDOWN_CHANNEL);
    
    if (isOverlayMode) {
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') return;
        const state: CountdownState = event.data;
        setTimeLeft(state.timeLeft);
        setIsRunning(state.isRunning);
        setTotalAdded(state.totalAdded);
        setRecentEvents(state.recentEvents || []);
      };
      setTimeout(() => channelRef.current?.postMessage({ type: 'request_sync' }), 100);
    } else {
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') {
          const s = stateRef.current;
          channelRef.current?.postMessage({ timeLeft: s.timeLeft, isRunning: s.isRunning, totalAdded: s.totalAdded, recentEvents: s.recentEvents });
        }
      };
    }
    
    return () => { channelRef.current?.close(); };
  }, [isOverlayMode]);

  const syncToOverlay = useCallback(() => {
    if (!isOverlayMode && channelRef.current) {
      channelRef.current.postMessage({ timeLeft, isRunning, totalAdded, recentEvents });
    }
  }, [isOverlayMode, timeLeft, isRunning, totalAdded, recentEvents]);

  // Sync on state changes
  useEffect(() => { syncToOverlay(); }, [timeLeft, isRunning, totalAdded, recentEvents]);

  useEffect(() => {
    localStorage.setItem('countdown_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (isRunning && timeLeft > 0 && !isOverlayMode) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft, isOverlayMode]);

  useEffect(() => {
    if (!isRunning || isOverlayMode) return;
    const newMessages = chatMessages.slice(lastProcessedIndexRef.current);
    if (newMessages.length === 0) return;
    lastProcessedIndexRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase();
      if (config.enableSubs && msgLower.includes('subscribed')) addTime(config.subTime, 'sub', msg.username);
      if (config.enableBits) {
        const cheerMatch = msgLower.match(/cheer(\d+)/i);
        if (cheerMatch) {
          const bits = parseInt(cheerMatch[1]);
          const timeToAdd = Math.floor(bits / 100) * config.bitsPer100;
          if (timeToAdd > 0) addTime(timeToAdd, 'bits', msg.username);
        }
      }
      if (config.enableGiftSubs && msgLower.includes('gifted a subscription')) addTime(config.giftSubTime, 'gift', msg.username);
      if (config.enableRaids && msgLower.includes('is raiding')) addTime(config.raidTime, 'raid', msg.username);
    });
  }, [chatMessages, isRunning, config, isOverlayMode]);

  const addTime = useCallback((seconds: number, type: string, user: string) => {
    setTimeLeft((prev) => prev + seconds);
    setTotalAdded((prev) => prev + seconds);
    setRecentEvents((prev) => [{ type, amount: seconds, user }, ...prev.slice(0, 4)]);
  }, []);

  const manualAddTime = (seconds: number) => addTime(seconds, 'manual', 'Streamer');

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(config.initialMinutes * 60 + config.initialSeconds);
    setTotalAdded(0);
    setRecentEvents([]);
    lastProcessedIndexRef.current = chatMessages.length;
  };

  const toggleRunning = () => {
    if (!isRunning) lastProcessedIndexRef.current = chatMessages.length;
    setIsRunning(!isRunning);
  };

  const updateConfig = (key: keyof CountdownConfig, value: number | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const openOverlayWindow = () => {
    const width = 400;
    const height = 350;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayCountdown=true`, 'CountdownOverlay', `width=${width},height=${height},left=${left},top=${top}`);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sub': return <Heart className="text-pink-500" size={14} />;
      case 'bits': return <Coins className="text-yellow-500" size={14} />;
      case 'gift': return <Gift className="text-purple-500" size={14} />;
      case 'raid': return <Zap className="text-orange-500" size={14} />;
      default: return <Plus className="text-green-500" size={14} />;
    }
  };

  const isLowTime = timeLeft <= 60 && timeLeft > 0;
  const isCritical = timeLeft <= 10 && timeLeft > 0; // Últimos 10 segundos
  const isFinalCountdown = timeLeft <= 5 && timeLeft > 0; // Últimos 5 segundos - animación especial
  const isFinished = timeLeft === 0;

  // Guardar posición del widget en localStorage
  useEffect(() => {
    if (!isOverlayMode) {
      localStorage.setItem('countdown_widget_position', JSON.stringify(position));
    }
  }, [position, isOverlayMode]);

  // Drag handlers para el widget
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  };

  useEffect(() => {
    if (isOverlayMode) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isOverlayMode]);

  // Tamaños de texto para overlay
  const getOverlayTextSize = () => {
    switch (overlaySize) {
      case 'normal': return 'text-7xl';
      case 'large': return 'text-9xl';
      case 'huge': return 'text-[12rem]';
    }
  };


  // Overlay Mode - Solo visualización
  if (isOverlayMode) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4" style={{ backgroundColor: overlayBgColor }}>
        <button onClick={() => setShowOverlaySettings(!showOverlaySettings)} className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50">
          <Settings size={18} />
        </button>
        {showOverlaySettings && (
          <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-64">
            <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.chromaKey}</p>
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
            <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.textColor}</p>
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
            <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.size}</p>
            <div className="flex gap-1">
              {(['normal', 'large', 'huge'] as const).map((size) => (
                <button 
                  key={size} 
                  onClick={() => setOverlaySize(size)} 
                  className={`flex-1 py-1.5 rounded text-xs font-medium ${overlaySize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'}`}
                >
                  {size === 'normal' ? t.overlay.normalSize : size === 'large' ? t.overlay.largeSize : 'XL'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Animación especial últimos 5 segundos - Solo el número gigante */}
        {isFinalCountdown ? (
          <div className="relative flex items-center justify-center">
            {/* Círculos de onda expansiva */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                key={`ring1-${timeLeft}`}
                className="absolute w-64 h-64 rounded-full border-4 border-red-500/60 animate-ping"
                style={{ animationDuration: '1s' }}
              />
              <div 
                key={`ring2-${timeLeft}`}
                className="absolute w-48 h-48 rounded-full border-4 border-orange-500/60 animate-ping"
                style={{ animationDuration: '0.8s', animationDelay: '0.1s' }}
              />
              <div 
                key={`ring3-${timeLeft}`}
                className="absolute w-32 h-32 rounded-full border-4 border-yellow-500/60 animate-ping"
                style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}
              />
            </div>
            {/* Número gigante con animación de escala */}
            <div 
              key={`number-${timeLeft}`}
              className="text-[20rem] font-black leading-none animate-[scaleIn_0.3s_ease-out]"
              style={{ 
                color: timeLeft <= 3 ? '#ef4444' : timeLeft <= 4 ? '#f97316' : '#fbbf24',
                textShadow: `0 0 60px ${timeLeft <= 3 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(251, 191, 36, 0.8)'}, 0 0 120px ${timeLeft <= 3 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(251, 191, 36, 0.5)'}`,
                animation: 'scaleIn 0.3s ease-out, pulse 0.5s ease-in-out infinite'
              }}
            >
              {timeLeft}
            </div>
          </div>
        ) : (
          <>
            {/* Timer normal con animación en últimos 10 segundos */}
            <div className={`text-center transition-all duration-300 ${isCritical ? 'animate-bounce' : ''}`}>
              <div 
                className={`${getOverlayTextSize()} font-mono font-bold drop-shadow-2xl transition-all duration-300 ${
                  isFinished ? 'text-red-500 animate-pulse scale-110' : 
                  isCritical ? 'animate-pulse scale-110' : 
                  isLowTime ? '' : ''
                }`}
                style={{ 
                  color: isFinished ? '#ef4444' : isCritical ? '#f97316' : isLowTime ? '#fb923c' : overlayTextColor,
                  textShadow: isCritical ? '0 0 40px rgba(249, 115, 22, 0.8), 0 0 80px rgba(249, 115, 22, 0.4)' : '0 4px 20px rgba(0,0,0,0.5)'
                }}
              >
                {formatTime(timeLeft)}
              </div>
              {totalAdded > 0 && (
                <p className="text-green-400 text-2xl mt-4 font-bold drop-shadow-lg">+{formatTime(totalAdded)} añadido</p>
              )}
            </div>

            {/* Efecto de urgencia en últimos 10 segundos */}
            {isCritical && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
              </div>
            )}
          </>
        )}

        {recentEvents.length > 0 && (
          <div className="mt-6 space-y-2">
            {recentEvents.slice(0, 3).map((event, i) => (
              <div key={i} className="flex items-center gap-3 bg-black/60 backdrop-blur rounded-xl px-5 py-3 text-white text-lg animate-fade-in">
                {getEventIcon(event.type)}
                <span className="font-medium">{event.user}</span>
                <span className="text-green-400 font-bold ml-auto">+{event.amount}s</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Widget flotante - Modo minimizado
  if (!isOverlayMode && isMinimized) {
    return (
      <div
        ref={widgetRef}
        className="fixed z-50 select-none"
        style={{ left: position.x, top: position.y }}
      >
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-2xl border backdrop-blur-sm cursor-move transition-all ${
            isFinished ? 'bg-red-900/90 border-red-500/50' : 
            isLowTime ? 'bg-orange-900/90 border-orange-500/50' : 
            'bg-zinc-900/95 border-zinc-700/50'
          } ${isRunning ? 'ring-2 ring-green-500/50' : ''}`}
        >
          <GripHorizontal size={14} className="text-zinc-500" />
          <Clock size={16} className={isRunning ? 'text-green-400 animate-pulse' : 'text-cyan-400'} />
          <span className={`font-mono font-bold text-lg ${
            isFinished ? 'text-red-400' : isLowTime ? 'text-orange-400' : 'text-white'
          }`}>
            {formatTime(timeLeft)}
          </span>
          {totalAdded > 0 && <span className="text-green-400 text-xs">+{totalAdded}s</span>}
          <button
            onClick={toggleRunning}
            className={`p-1.5 rounded-lg transition-colors ${isRunning ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={() => setIsMinimized(false)} className="p-1.5 rounded-lg bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50 hover:text-white transition-colors">
            <Maximize2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Widget flotante - Modo expandido (modo normal, no overlay)
  return (
    <div
      ref={widgetRef}
      className="fixed z-50 select-none"
      style={{ left: position.x, top: position.y }}
    >
      <div className={`bg-zinc-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border transition-all w-80 ${
        isFinished ? 'border-red-500/50' : isLowTime ? 'border-orange-500/50' : 'border-zinc-700/50'
      } ${isRunning ? 'ring-2 ring-green-500/30' : ''}`}>
        {/* Header - Draggable */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 cursor-move"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal size={14} className="text-zinc-500" />
            <Clock size={16} className="text-cyan-400" />
            <span className="text-sm font-bold text-white">Countdown</span>
            {isRunning && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={openOverlayWindow} className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="Abrir Overlay OBS">
              <ExternalLink size={14} />
            </button>
            <button onClick={() => setIsMinimized(true)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
              <Minimize2 size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="p-4">
          <div className={`text-center p-4 rounded-xl mb-3 ${isFinished ? 'bg-red-500/20' : isLowTime ? 'bg-orange-500/20' : 'bg-zinc-800/50'}`}>
            <div className={`text-4xl font-mono font-bold ${isFinished ? 'text-red-400 animate-pulse' : isLowTime ? 'text-orange-400 animate-pulse' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </div>
            {totalAdded > 0 && <p className="text-green-400 text-xs mt-1">+{formatTime(totalAdded)} añadido</p>}
          </div>

          {/* Quick Add Buttons */}
          <div className="flex gap-1.5 mb-3 justify-center">
            {[30, 60, 120, 300].map((secs) => (
              <button key={secs} onClick={() => manualAddTime(secs)} className="px-2 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg text-xs font-medium transition-all flex items-center gap-1">
                <Plus size={12} /> {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2 mb-3">
            <button onClick={toggleRunning} className={`flex-1 flex items-center justify-center gap-2 py-2 font-bold rounded-lg transition-all text-sm ${isRunning ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
              {isRunning ? <Pause size={16} /> : <Play size={16} />} {isRunning ? 'Pausar' : 'Iniciar'}
            </button>
            <button onClick={reset} className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-all">
              <RotateCcw size={16} />
            </button>
            <button onClick={() => setShowConfig(!showConfig)} className={`px-3 py-2 rounded-lg transition-all ${showConfig ? 'bg-twitch-brand text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}>
              <Settings size={16} />
            </button>
          </div>

          {/* Recent Events */}
          {recentEvents.length > 0 && (
            <div className="mb-3 space-y-1 max-h-24 overflow-y-auto">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Eventos</p>
              {recentEvents.slice(0, 3).map((event, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-zinc-800/50 rounded-lg px-2 py-1.5">
                  {getEventIcon(event.type)}
                  <span className="text-zinc-300 truncate flex-1">{event.user}</span>
                  <span className="text-green-400">+{event.amount}s</span>
                </div>
              ))}
            </div>
          )}

          {/* Config Panel */}
          {showConfig && (
            <div className="bg-zinc-800/50 rounded-xl p-3 space-y-3 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white">Configuración</p>
                <button onClick={() => setShowConfig(false)} className="text-zinc-400 hover:text-white"><ChevronUp size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Minutos</label>
                  <input type="number" min="0" max="999" value={config.initialMinutes} onChange={(e) => updateConfig('initialMinutes', parseInt(e.target.value) || 0)} className="w-full bg-zinc-700 rounded-lg px-2 py-1.5 text-white text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Segundos</label>
                  <input type="number" min="0" max="59" value={config.initialSeconds} onChange={(e) => updateConfig('initialSeconds', Math.min(59, parseInt(e.target.value) || 0))} className="w-full bg-zinc-700 rounded-lg px-2 py-1.5 text-white text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { key: 'enableSubs', icon: Heart, color: 'pink', label: 'Subs', valueKey: 'subTime' },
                  { key: 'enableBits', icon: Coins, color: 'yellow', label: 'Bits/100', valueKey: 'bitsPer100' },
                  { key: 'enableGiftSubs', icon: Gift, color: 'purple', label: 'Gift Subs', valueKey: 'giftSubTime' },
                  { key: 'enableRaids', icon: Zap, color: 'orange', label: 'Raids', valueKey: 'raidTime' },
                ].map(({ key, icon: Icon, color, label, valueKey }) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-zinc-700/50 rounded-lg">
                    <button onClick={() => updateConfig(key as keyof CountdownConfig, !config[key as keyof CountdownConfig])} className={`w-8 h-4 rounded-full transition-colors ${config[key as keyof CountdownConfig] ? `bg-${color}-500` : 'bg-zinc-600'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${config[key as keyof CountdownConfig] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <Icon className={`text-${color}-500`} size={14} />
                    <span className="text-xs text-white flex-1">{label}</span>
                    <input type="number" min="0" value={config[valueKey as keyof CountdownConfig] as number} onChange={(e) => updateConfig(valueKey as keyof CountdownConfig, parseInt(e.target.value) || 0)} disabled={!config[key as keyof CountdownConfig]} className="w-12 bg-zinc-600 rounded px-1.5 py-0.5 text-white text-xs text-center disabled:opacity-50" />
                    <span className="text-[10px] text-zinc-400">s</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setTimeLeft(config.initialMinutes * 60 + config.initialSeconds); setShowConfig(false); }} className="w-full py-1.5 bg-twitch-brand hover:bg-twitch-brand/80 text-white font-medium rounded-lg text-xs">
                Aplicar tiempo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Countdown;
