import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, RotateCcw, Settings, ExternalLink, Timer, Users, Trash2 } from 'lucide-react';

interface Bet {
visitorId: string;
  username: string;
  number: number;
  color: string;
  timestamp: number;
}

interface CasinoRouletteProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const ROULETTE_CHANNEL = 'casino_roulette_sync';
const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const CasinoRoulette: React.FC<CasinoRouletteProps> = ({ chatMessages, isConnected = true }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(false);
  const [autoSpinInterval, setAutoSpinInterval] = useState(60);
  const [timeToSpin, setTimeToSpin] = useState(60);
  const [showSettings, setShowSettings] = useState(false);
  const [bettingOpen, setBettingOpen] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const rotationRef = useRef(0);

  const getNumberColor = (num: number): string => {
    if (num === 0) return '#00AA00';
    return RED_NUMBERS.includes(num) ? '#DC2626' : '#1F2937';
  };

  // Setup BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(ROULETTE_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = useCallback((data: any) => {
    channelRef.current?.postMessage(data);
  }, []);

  // Process chat messages for bets
  useEffect(() => {
    if (!bettingOpen || !isConnected || isSpinning) return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase().trim();
      const match = msgLower.match(/^!ruleta[- ]?(\d+)$/);
      if (match) {
        const number = parseInt(match[1]);
        if (number >= 0 && number <= 36) {
          const visitorId = msg.userId || msg.username;
          setBets(prev => {
            if (prev.find(b => b.visitorId === visitorId)) return prev;
            return [...prev, {
              visitorId,
              username: msg.username,
              number,
              color: msg.color || '#a970ff',
              timestamp: Date.now(),
            }];
          });
        }
      }
    });
  }, [chatMessages, bettingOpen, isConnected, isSpinning]);

  // Auto-spin timer
  useEffect(() => {
    if (!autoSpinEnabled || isSpinning) return;
    const timer = setInterval(() => {
      setTimeToSpin(prev => {
        if (prev <= 1) {
          spin();
          return autoSpinInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoSpinEnabled, isSpinning, autoSpinInterval]);

  // Draw roulette wheel - only when rotation changes
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const segmentAngle = (2 * Math.PI) / ROULETTE_NUMBERS.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotationRef.current * Math.PI) / 180);

    ROULETTE_NUMBERS.forEach((num, i) => {
      const startAngle = i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = getNumberColor(num);
      ctx.fill();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(num.toString(), radius - 25, 4);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(centerX, 15);
    ctx.lineTo(centerX - 12, 0);
    ctx.lineTo(centerX + 12, 0);
    ctx.closePath();
    ctx.fillStyle = '#FFD700';
    ctx.fill();
  }, []);

  // Initial draw
  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const spin = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);
    setBettingOpen(false);
    setShowResult(false);
    setResult(null);

    const resultIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const resultNumber = ROULETTE_NUMBERS[resultIndex];
    
    const segmentAngle = 360 / ROULETTE_NUMBERS.length;
    const targetAngle = resultIndex * segmentAngle;
    const spins = 5 + Math.random() * 3;
    const startRotation = rotationRef.current;
    const totalRotation = startRotation + (spins * 360) + (360 - targetAngle);
    
    syncToOverlay({ type: 'spin', rotation: totalRotation, result: resultNumber });

    // Animate rotation
    const duration = 5000;
    const startTime = Date.now();
    
    const animateSpin = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function for deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      
      rotationRef.current = startRotation + (totalRotation - startRotation) * eased;
      setRotation(rotationRef.current);
      drawWheel();
      
      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        rotationRef.current = totalRotation;
        setResult(resultNumber);
        setShowResult(true);
        setIsSpinning(false);
        syncToOverlay({ type: 'result', result: resultNumber, bets });
      }
    };
    
    requestAnimationFrame(animateSpin);
  }, [isSpinning, bets, syncToOverlay, drawWheel]);

  const reset = () => {
    setBets([]);
    setResult(null);
    setShowResult(false);
    setBettingOpen(true);
    setTimeToSpin(autoSpinInterval);
    syncToOverlay({ type: 'reset' });
  };

  const openOverlay = () => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayRoulette=true`, 'RouletteOverlay', `width=${width},height=${height},left=${left},top=${top}`);
  };

  const winners = result !== null ? bets.filter(b => b.number === result) : [];
  const betsByNumber = bets.reduce((acc, bet) => {
    acc[bet.number] = (acc[bet.number] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={spin}
          disabled={isSpinning}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg transition-all"
        >
          <Play size={16} />
          {isSpinning ? 'Girando...' : 'Girar Ruleta'}
        </button>
        
        <button
          onClick={reset}
          disabled={isSpinning}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-lg transition-all"
        >
          <RotateCcw size={16} />
          Reset
        </button>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-all"
        >
          <Settings size={18} />
        </button>
        
        <button
          onClick={openOverlay}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-medium rounded-lg transition-all ml-auto"
        >
          <ExternalLink size={16} />
          Overlay OBS
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-400">Auto-spin cada:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="300"
                value={autoSpinInterval}
                onChange={(e) => setAutoSpinInterval(Math.max(10, parseInt(e.target.value) || 60))}
                className="w-16 px-2 py-1 bg-zinc-700 rounded text-white text-center text-sm"
              />
              <span className="text-zinc-400 text-sm">seg</span>
            </div>
          </div>
          <button
            onClick={() => {
              setAutoSpinEnabled(!autoSpinEnabled);
              setTimeToSpin(autoSpinInterval);
            }}
            className={`w-full py-2 rounded-lg font-medium transition-all ${
              autoSpinEnabled ? 'bg-green-500 text-white' : 'bg-zinc-700 text-zinc-300'
            }`}
          >
            {autoSpinEnabled ? `⏱️ Auto-spin activo (${timeToSpin}s)` : 'Activar Auto-spin'}
          </button>
        </div>
      )}

      {/* Info */}
      <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
        <p className="text-zinc-400 text-sm">
          Escribe <span className="text-yellow-400 font-bold">!ruleta-27</span> para apostar al número 27
        </p>
        <p className="text-zinc-500 text-xs mt-1">
          Números válidos: 0-36 • {bettingOpen ? '🟢 Apuestas abiertas' : '🔴 Apuestas cerradas'}
        </p>
      </div>

      {/* Roulette Wheel */}
      <div className="flex justify-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="drop-shadow-2xl"
          />
        </div>
      </div>

      {/* Result */}
      {showResult && result !== null && (
        <div className="text-center animate-bounce">
          <div
            className="inline-block px-8 py-4 rounded-2xl shadow-2xl"
            style={{ backgroundColor: getNumberColor(result) }}
          >
            <span className="text-white font-bold text-4xl">{result}</span>
          </div>
          {winners.length > 0 && (
            <div className="mt-3 bg-green-500/20 rounded-xl p-3">
              <p className="text-green-400 font-bold">🎉 ¡{winners.length} ganador(es)!</p>
              <p className="text-green-300 text-sm">
                {winners.map(w => w.username).join(', ')}
              </p>
            </div>
          )}
          {winners.length === 0 && bets.length > 0 && (
            <div className="mt-3 bg-red-500/20 rounded-xl p-3">
              <p className="text-red-400 font-bold">Sin ganadores esta ronda</p>
            </div>
          )}
        </div>
      )}

      {/* Bets Summary */}
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">{bets.length} apuestas</span>
          </div>
          {bets.length > 0 && !isSpinning && (
            <button
              onClick={() => setBets([])}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <Trash2 size={12} /> Limpiar
            </button>
          )}
        </div>
        
        {bets.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">
            Esperando apuestas del chat...
          </p>
        ) : (
          <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
            {Object.entries(betsByNumber)
              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
              .map(([num, count]) => (
                <div
                  key={num}
                  className="flex flex-col items-center p-1.5 rounded"
                  style={{ backgroundColor: getNumberColor(parseInt(num)) }}
                >
                  <span className="text-white font-bold text-sm">{num}</span>
                  <span className="text-white/70 text-[10px]">{count}x</span>
                </div>
              ))}
          </div>
        )}
        
        {bets.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <p className="text-xs text-zinc-500">Últimas apuestas:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {bets.slice(-10).map((bet, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: bet.color + '40', color: bet.color }}
                >
                  {bet.username}: {bet.number}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CasinoRoulette;
